import { Router } from 'express';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/userinfo.email',
];

async function getOAuth2Client() {
  const content = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf-8'));
  const creds = content.web || content.installed;
  if (!creds) {
    throw new Error('credentials.json must contain a "web" or "installed" key');
  }
  const redirectUri = creds.redirect_uris?.[0] || `http://localhost:${process.env.PORT || 3001}/auth/google/callback`;
  return new google.auth.OAuth2(creds.client_id, creds.client_secret, redirectUri);
}

export const authRouter = Router();

// Redirect user to Google consent screen
authRouter.get('/google', async (req, res) => {
  try {
    const oauth2 = await getOAuth2Client();
    const url = oauth2.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
    res.redirect(url);
  } catch (err) {
    console.error('OAuth init error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Google redirects here with ?code=...
authRouter.get('/google/callback', async (req, res) => {
  try {
    const oauth2 = await getOAuth2Client();
    const { tokens } = await oauth2.getToken(req.query.code);
    req.session.tokens = tokens;

    // Get user email for display
    oauth2.setCredentials(tokens);
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
    const { data } = await oauth2Api.userinfo.get();
    req.session.userEmail = data.email;

    res.redirect('http://localhost:5173');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Check auth status
authRouter.get('/status', (req, res) => {
  if (req.session.tokens) {
    res.json({ authenticated: true, email: req.session.userEmail });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});
