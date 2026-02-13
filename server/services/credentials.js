import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');

/**
 * Load Google OAuth credentials from either:
 * 1. GOOGLE_CREDENTIALS env var (JSON string) — for production/deployment
 * 2. credentials.json file — for local development
 *
 * Returns the parsed { client_id, client_secret, redirect_uris } object.
 */
export async function loadCredentials() {
  let content;
  if (process.env.GOOGLE_CREDENTIALS) {
    content = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } else {
    content = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf-8'));
  }
  const creds = content.web || content.installed;
  if (!creds) {
    throw new Error('Credentials must contain a "web" or "installed" key');
  }
  return creds;
}
