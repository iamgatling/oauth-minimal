import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import AuthCode from '../models/AuthCode';
import RefreshToken from '../models/RefreshToken';
import Consent from '../models/Consent';
import { AuthRequest } from '../middleware/authMiddleware';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const CLIENT_ID = 'test-client-id'; // hardedcoded for demo purposes
const REDIRECT_URI = 'http://localhost:3001/callback';

const sharedStyles = `
  :root {
    --primary: #4f46e5;
    --primary-hover: #4338ca;
    --bg: #f8fafc;
    --card-bg: #ffffff;
    --text-main: #1e293b;
    --text-muted: #64748b;
    --border: #e2e8f0;
  }

  body {
    font-family: 'Inter', -apple-system, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
    background-color: var(--bg);
    color: var(--text-main);
  }

  .container {
    background: var(--card-bg);
    padding: 2.5rem;
    border-radius: 12px;
    width: 100%;
    max-width: 420px;
    border: 1px solid var(--border);
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
  }

  h2 {
    margin-top: 0;
    text-align: center;
    font-weight: 700;
  }

  p {
    color: var(--text-muted);
    font-size: 14px;
    text-align: center;
  }

  ul {
    padding-left: 18px;
    margin-top: 16px;
  }

  li {
    font-size: 14px;
    margin-bottom: 6px;
  }

  .buttons {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }

  button {
    flex: 1;
    padding: 12px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    font-size: 14px;
  }

  .allow {
    background-color: var(--primary);
    color: white;
  }

  .allow:hover {
    background-color: var(--primary-hover);
  }

  .deny {
    background: white;
    border: 1px solid var(--border);
    color: var(--text-main);
  }

  .deny:hover {
    background: #f1f5f9;
  }
`;

export const authorize = async (req: AuthRequest, res: Response) => {
  const {
    client_id,
    redirect_uri,
    response_type,
    scope,
    state,
    code_challenge,
    code_challenge_method,
  } = req.query;

  if (client_id !== CLIENT_ID) return res.status(400).send('Invalid client_id');
  if (redirect_uri && redirect_uri !== REDIRECT_URI) return res.status(400).send('Invalid redirect_uri');
  if (!state) return res.status(400).send('Missing state parameter');
  if (!code_challenge) return res.status(400).send('Missing code_challenge');
  if (code_challenge_method !== 'S256') return res.status(400).send('Invalid code_challenge_method');

  if (!req.user) {
    return res.redirect(`/login?return_to=${encodeURIComponent(req.originalUrl)}`);
  }

  const existingConsent = await Consent.findOne({
    where: { user_id: req.user.userId, client_id: client_id as string }
  });

  if (existingConsent) {
    return processConsent(
      req,
      res,
      'allow',
      client_id as string,
      redirect_uri as string,
      state as string,
      scope as string,
      code_challenge as string
    );
  }

  const scopes = (scope as string || '').split(' ');

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authorize</title>
      <style>${sharedStyles}</style>
    </head>
    <body>
      <div class="container">
        <h2>Authorize Application</h2>
        <p><strong>${purify.sanitize(client_id as string)}</strong> is requesting access to your account</p>

        <ul>
          ${scopes.map(s => `<li>${purify.sanitize(s)}</li>`).join('')}
        </ul>

        <form method="POST" action="/consent" class="buttons">
          <input type="hidden" name="client_id" value="${purify.sanitize(client_id as string)}">
          <input type="hidden" name="redirect_uri" value="${purify.sanitize(redirect_uri as string)}">
          <input type="hidden" name="state" value="${purify.sanitize(state as string)}">
          <input type="hidden" name="scope" value="${purify.sanitize(scope as string)}">
          <input type="hidden" name="code_challenge" value="${purify.sanitize(code_challenge as string)}">

          <button type="submit" name="decision" value="deny" class="deny">Deny</button>
          <button type="submit" name="decision" value="allow" class="allow">Allow</button>
        </form>
      </div>
    </body>
    </html>
  `);
};

export const handleConsent = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).send('Session expired');
  }

  const { decision, client_id, redirect_uri, state, scope, code_challenge } = req.body;

  return processConsent(req, res, decision, client_id, redirect_uri, state, scope, code_challenge);
};

const processConsent = async (
  req: AuthRequest,
  res: Response,
  decision: string,
  client_id: string,
  redirect_uri: string,
  state: string,
  scope: string,
  code_challenge: string
) => {
  if (decision === 'deny') {
    return res.redirect(`${redirect_uri}?error=access_denied&state=${state}`);
  }

  await Consent.findOrCreate({
    where: { user_id: req.user!.userId, client_id },
    defaults: { user_id: req.user!.userId, client_id, scope }
  });

  const code = crypto.randomBytes(16).toString('hex');
  const expires_at = new Date(Date.now() + 60 * 1000);

  await AuthCode.create({
    code,
    user_id: req.user!.userId,
    client_id,
    redirect_uri,
    scope,
    code_challenge,
    expires_at
  });

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.append('code', code);
  redirectUrl.searchParams.append('state', state);

  res.redirect(redirectUrl.toString());
};

export const token = async (req: Request, res: Response) => {
  const { grant_type, code, redirect_uri, client_id, code_verifier, refresh_token } = req.body;

  if (grant_type === 'authorization_code') {
    if (!code || !redirect_uri || !client_id || !code_verifier) {
      return res.status(400).json({ error: 'invalid_request' });
    }

    const authCode = await AuthCode.findOne({ where: { code } });
    if (!authCode) return res.status(400).json({ error: 'invalid_grant' });
    if (authCode.expires_at < new Date()) return res.status(400).json({ error: 'invalid_grant' });
    if (authCode.client_id !== client_id) return res.status(400).json({ error: 'invalid_grant' });
    if (authCode.redirect_uri !== redirect_uri) return res.status(400).json({ error: 'invalid_grant' });

    const challenge = crypto
      .createHash('sha256')
      .update(code_verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (challenge !== authCode.code_challenge) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    const accessToken = jwt.sign(
      { sub: authCode.user_id, scope: authCode.scope, client_id: authCode.client_id },
      process.env.JWT_SECRET || 'super_secret_jwt_key',
      { expiresIn: '1h' }
    );

    const refreshTokenStr = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenStr).digest('hex');

    await RefreshToken.create({
      token_hash: refreshTokenHash,
      user_id: authCode.user_id,
      client_id: authCode.client_id,
      scope: authCode.scope,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await authCode.destroy();

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshTokenStr,
      scope: authCode.scope
    });
  }

  if (grant_type === 'refresh_token') {
    if (!refresh_token) return res.status(400).json({ error: 'invalid_request' });

    const refreshTokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    const storedToken = await RefreshToken.findOne({ where: { token_hash: refreshTokenHash } });
    if (!storedToken) return res.status(400).json({ error: 'invalid_grant' });
    if (storedToken.revoked_at) return res.status(400).json({ error: 'invalid_grant' });
    if (storedToken.expires_at < new Date()) return res.status(400).json({ error: 'invalid_grant' });

    await storedToken.destroy();

    const accessToken = jwt.sign(
      { sub: storedToken.user_id, scope: storedToken.scope },
      process.env.JWT_SECRET || 'super_secret_jwt_key',
      { expiresIn: '1h' }
    );

    const newRefreshTokenStr = crypto.randomBytes(32).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshTokenStr).digest('hex');

    await RefreshToken.create({
      token_hash: newRefreshTokenHash,
      user_id: storedToken.user_id,
      client_id: storedToken.client_id,
      scope: storedToken.scope,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: newRefreshTokenStr
    });
  }

  res.status(400).json({ error: 'unsupported_grant_type' });
};

export const revoke = async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) return res.status(200).send();

  const refreshTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const storedToken = await RefreshToken.findOne({ where: { token_hash: refreshTokenHash } });

  if (storedToken && !storedToken.revoked_at) {
    storedToken.revoked_at = new Date();
    await storedToken.save();

    await Consent.destroy({
      where: { user_id: storedToken.user_id, client_id: storedToken.client_id }
    });
  }

  res.status(200).send();
};
