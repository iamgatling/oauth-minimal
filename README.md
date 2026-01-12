# A minimal OAuth2 Authorization Server

A production-ready OAuth 2.0 Authorization Server implementing **Authorization Code + PKCE** flow. Built with Node.js, Express, TypeScript, and SQLite.

## Features

- **OAuth 2.0 Authorization Code + PKCE** — Secure flow for SPAs and mobile apps
- **Refresh Token Rotation** — New refresh token issued on each use
- **Persistent Consent** — Users only see consent screen once per client
- **Token Revocation** — Revokes both tokens and consent
- **JWT Access Tokens** — Stateless, verifiable tokens
- **Security Hardened** — Rate limiting, CORS, Helmet, bcrypt

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/iamgatling/Pre-oauth.git
cd Pre-oauth/server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your own secrets:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=<generate-strong-secret>
JWT_SECRET=<generate-strong-secret>
CLIENT_ORIGIN=http://localhost:3001
```

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run the Server

**Development:**
```bash
npm start
```

**Production:**
```bash
npm run build
npm run serve
```

Server runs on `http://localhost:3000` by default.

---

## API Reference

### Authentication

| Method | Endpoint    | Description                |
|--------|-------------|----------------------------|
| GET    | `/login`    | Login page (HTML)          |
| POST   | `/login`    | Authenticate user          |
| GET    | `/register` | Registration page (HTML)   |
| POST   | `/register` | Create new user account    |

### OAuth 2.0 Endpoints

| Method | Endpoint    | Description                          |
|--------|-------------|--------------------------------------|
| GET    | `/authorize`| Start authorization flow             |
| POST   | `/token`    | Exchange code or refresh tokens      |
| POST   | `/revoke`   | Revoke refresh token (and consent)   |
| GET    | `/userinfo` | Get user profile (Bearer token)      |

---

## Integration Guide

### 1. Authorization Request

Redirect your user to the `/authorize` endpoint:

```
GET /authorize?
  response_type=code&
  client_id=test-client-id&
  redirect_uri=http://localhost:3001/callback&
  scope=openid profile&
  state=<random-state>&
  code_challenge=<pkce-challenge>&
  code_challenge_method=S256
```

| Parameter              | Required | Description                              |
|------------------------|----------|------------------------------------------|
| `response_type`        | Yes      | Must be `code`                           |
| `client_id`            | Yes      | Your registered client ID                |
| `redirect_uri`         | Yes      | Must match registered URI exactly        |
| `scope`                | Yes      | Space-separated scopes (e.g., `openid profile`) |
| `state`                | Yes      | Random string for CSRF protection        |
| `code_challenge`       | Yes      | Base64URL-encoded SHA-256 of verifier    |
| `code_challenge_method`| Yes      | Must be `S256`                           |

### 2. Token Exchange

After user authorization, exchange the code for tokens:

```bash
curl -X POST http://localhost:3000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=<authorization_code>" \
  -d "redirect_uri=http://localhost:3001/callback" \
  -d "client_id=test-client-id" \
  -d "code_verifier=<your_verifier>"
```

**Response:**
```json
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpc..."
}
```

### 3. Refresh Tokens

```bash
curl -X POST http://localhost:3000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=<your_refresh_token>" \
  -d "client_id=test-client-id"
```

### 4. Access Protected Resources

```bash
curl http://localhost:3000/userinfo \
  -H "Authorization: Bearer <access_token>"
```

### 5. Revoke Tokens

Revoking a refresh token also deletes the stored consent, requiring re-authorization on next login:

```bash
curl -X POST http://localhost:3000/revoke \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=<refresh_token>"
```

---

## PKCE Implementation

**Generate code verifier and challenge:**

```javascript
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
```

---

## Security

| Feature              | Implementation         | Purpose                                |
|----------------------|------------------------|----------------------------------------|
| **PKCE**             | S256 (SHA-256)         | Prevents code interception attacks     |
| **Password Hashing** | bcrypt                 | Secure credential storage              |
| **Rate Limiting**    | 5 attempts / 15 min    | Brute force protection                 |
| **Token Expiry**     | 1h access, 7d refresh  | Limits exposure on token theft         |
| **Token Rotation**   | New refresh each use   | Detects token replay                   |
| **Consent Persistence** | Database-stored     | Remembers user consent per client      |
| **CORS**             | Whitelist origin       | Prevents unauthorized cross-origin     |
| **Headers**          | Helmet.js              | XSS, clickjacking, sniffing protection |

---

## Project Structure

```
server/
├── src/
│   ├── controllers/
│   │   ├── authController.ts   # Login, register
│   │   └── oauthController.ts  # Authorize, token, revoke
│   ├── models/
│   │   ├── User.ts             # User accounts
│   │   ├── AuthCode.ts         # Temporary auth codes
│   │   ├── RefreshToken.ts     # Refresh tokens (hashed)
│   │   └── Consent.ts          # Persistent user consents
│   ├── middleware/
│   │   ├── authMiddleware.ts   # JWT verification
│   │   └── rateLimiter.ts      # Rate limiting
│   ├── config/
│   │   └── database.ts         # SQLite/Sequelize setup
│   ├── routes/
│   │   └── authRoutes.ts       # Route definitions
│   ├── app.ts                  # Express app config
│   └── server.ts               # Entry point
├── postman/                    # Postman collection
├── .env.example
└── package.json
```

---

## Environment Variables

| Variable         | Description                          | Default               |
|------------------|--------------------------------------|-----------------------|
| `PORT`           | Server port                          | `3000`                |
| `NODE_ENV`       | `development` or `production`        | `development`         |
| `SESSION_SECRET` | Secret for session signing           | (required)            |
| `JWT_SECRET`     | Secret for JWT signing               | (required)            |
| `CLIENT_ORIGIN`  | Allowed CORS origin for your client  | `http://localhost:3001` |

---

## Deployment

1. Set `NODE_ENV=production`
2. Generate strong secrets for `SESSION_SECRET` and `JWT_SECRET`
3. Update `CLIENT_ORIGIN` to your production client URL
4. Build and serve:
   ```bash
   npm run build
   npm run serve
   ```

---

## Example Client

A demo React SPA client is available separately to demonstrate integration:

🔗 **[Live Demo](https://oauth-demo-client.vercel.app/)** | **[Client Repo](https://github.com/iamgatling/oauth-demo-client)**

---

## License

MIT
