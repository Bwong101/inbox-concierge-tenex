import { Router } from 'express';
import { google } from 'googleapis';
import { loadCredentials } from '../services/credentials.js';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/userinfo.email',
];

async function getOAuth2Client() {
  const creds = await loadCredentials();
  // APP_URL determines the redirect URI:
  //   Production: APP_URL=https://your-app.up.railway.app → uses that
  //   Local dev:  APP_URL not set → falls back to localhost
  const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`;
  const redirectUri = `${baseUrl}/auth/google/callback`;
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

    // Redirect to frontend — use APP_URL env var in production, fallback to localhost
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    res.redirect(appUrl);
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
