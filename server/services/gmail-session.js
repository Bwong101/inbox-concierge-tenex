import { google } from 'googleapis';
import { GmailClient } from '../../src/lib/gmail.js';
import { loadCredentials } from './credentials.js';

/**
 * Create a GmailClient from session-stored OAuth tokens.
 * Reuses the existing GmailClient class from src/lib/gmail.js.
 */
export async function getGmailClientFromSession(session) {
  const creds = await loadCredentials();
  const oauth2 = new google.auth.OAuth2(creds.client_id, creds.client_secret);
  oauth2.setCredentials(session.tokens);

  // Persist refreshed tokens back to session
  oauth2.on('tokens', (newTokens) => {
    session.tokens = { ...session.tokens, ...newTokens };
  });

  return new GmailClient(oauth2);
}
