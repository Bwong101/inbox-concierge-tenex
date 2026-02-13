import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GmailClient } from '../../src/lib/gmail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');

/**
 * Create a GmailClient from session-stored OAuth tokens.
 * Reuses the existing GmailClient class from src/lib/gmail.js.
 */
export async function getGmailClientFromSession(session) {
  const content = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf-8'));
  const creds = content.web || content.installed;
  const oauth2 = new google.auth.OAuth2(creds.client_id, creds.client_secret);
  oauth2.setCredentials(session.tokens);

  // Persist refreshed tokens back to session
  oauth2.on('tokens', (newTokens) => {
    session.tokens = { ...session.tokens, ...newTokens };
  });

  return new GmailClient(oauth2);
}
