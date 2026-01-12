import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const SALT_ROUNDS = 10;
const SESSION_SECRET = process.env.SESSION_SECRET || 'super_secret_session_key';

const sharedStyles = `
  :root {
    --primary: #4f46e5;
    --primary-hover: #4338ca;
    --bg: #f8fafc;
    --card-bg: #ffffff;
    --text-main: #1e293b;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --error: #ef4444;
  }
  body { 
    font-family: 'Inter', -apple-system, sans-serif; 
    display: flex; justify-content: center; align-items: center; 
    height: 100vh; margin: 0; background-color: var(--bg); color: var(--text-main);
  }
  .container { 
    background: var(--card-bg); padding: 2.5rem; border-radius: 12px; 
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); 
    width: 100%; max-width: 360px; border: 1px solid var(--border);
  }
  h2 { margin-top: 0; font-weight: 700; letter-spacing: -0.025em; text-align: center; }
  p { color: var(--text-muted); margin-bottom: 1.5rem; }
  input { 
    width: 100%; padding: 12px; margin: 8px 0; border: 1px solid var(--border); 
    border-radius: 6px; box-sizing: border-box; font-size: 14px; transition: all 0.2s;
  }
  input:focus { 
    outline: none; border-color: var(--primary); 
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); 
  }
  button { 
    width: 100%; padding: 12px; background-color: var(--primary); color: white; 
    border: none; border-radius: 6px; cursor: pointer; font-weight: 600; 
    font-size: 14px; margin-top: 1rem; transition: background 0.2s;
  }
  button:hover { background-color: var(--primary-hover); }
  .error { 
    color: var(--error); background: #fef2f2; padding: 10px; border-radius: 6px;
    font-size: 13px; margin-bottom: 15px; border: 1px solid #fee2e2; display: none; 
  }
  .footer-link { text-align: center; font-size: 14px; margin-top: 1.5rem; color: var(--text-muted); }
  .footer-link a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .footer-link a:hover { text-decoration: underline; }
`;

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'All fields are required' });
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'User already exists' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ email, password_hash, name });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const sessionToken = jwt.sign({ userId: user.id, email: user.email }, SESSION_SECRET, { expiresIn: '1h' });
    res.cookie('auth_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000,
    });
    res.json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const showLoginPage = (req: Request, res: Response) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login</title>
      <style>${sharedStyles}</style>
    </head>
    <body>
      <div class="container">
        <h2>Welcome back</h2>
        <div id="error" class="error"></div>
        <form id="loginForm">
          <input type="email" id="email" placeholder="Email address" required>
          <input type="password" id="password" placeholder="Password" required>
          <button type="submit">Sign In</button>
        </form>
        <div class="footer-link">
          Don't have an account? <a href="/register">Create one</a>
        </div>
      </div>
      <script>
        const form = document.getElementById('loginForm');
        const errorDiv = document.getElementById('error');
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get('return_to');

        if (returnTo) {
          document.querySelector('a').href = '/register?return_to=' + encodeURIComponent(returnTo);
        }

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const response = await fetch('/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: form.email.value, password: form.password.value })
            });
            const data = await response.json();
            if (response.ok) {
              window.location.href = returnTo || '/';
            } else {
              errorDiv.textContent = data.error;
              errorDiv.style.display = 'block';
            }
          } catch (err) {
            errorDiv.textContent = 'Connection error';
            errorDiv.style.display = 'block';
          }
        });
      </script>
    </body>
    </html>
  `;
  res.send(html);
};

export const showRegisterPage = (req: Request, res: Response) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Create Account</title>
      <style>${sharedStyles}</style>
    </head>
    <body>
      <div class="container">
        <h2>Create account</h2>
        <div id="error" class="error"></div>
        <form id="registerForm">
          <input type="text" id="name" placeholder="Full Name" required>
          <input type="email" id="email" placeholder="Email address" required>
          <input type="password" id="password" placeholder="Password (min. 8 chars)" required>
          <button type="submit">Get Started</button>
        </form>
        <div class="footer-link">
          Already have an account? <a href="/login">Log in</a>
        </div>
      </div>
      <script>
        const form = document.getElementById('registerForm');
        const errorDiv = document.getElementById('error');
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get('return_to');

        if (returnTo) {
          document.querySelector('a').href = '/login?return_to=' + encodeURIComponent(returnTo);
        }

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const response = await fetch('/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                name: form.name.value, 
                email: form.email.value, 
                password: form.password.value 
              })
            });
            const data = await response.json();
            if (response.ok) {
              window.location.href = '/login' + (returnTo ? '?return_to=' + encodeURIComponent(returnTo) : '');
            } else {
              errorDiv.textContent = data.error;
              errorDiv.style.display = 'block';
            }
          } catch (err) {
            errorDiv.textContent = 'Connection error';
            errorDiv.style.display = 'block';
          }
        });
      </script>
    </body>
    </html>
  `;
  res.send(html);
};