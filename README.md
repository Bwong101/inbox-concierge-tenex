# Inbox Concierge

AI-powered Gmail inbox management toolkit with both a **web interface** and a **CLI**.

The web interface fetches your last 200 inbox emails, classifies them into smart buckets (Important, Can Wait, Newsletter, Auto-Archive, Spam-like) using Claude, and lets you create custom buckets that trigger reclassification.

## Prerequisites

- **Node.js** 18+
- **Google Cloud OAuth credentials** — a project with the Gmail API enabled and an OAuth 2.0 client
- **Anthropic API key** — for Claude-powered email classification

## Google Cloud Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use an existing one)
3. Enable the **Gmail API** under APIs & Services
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. For the web interface, select **Web application** as the application type
6. Add authorized redirect URIs:
   - `http://localhost:3001/auth/google/callback` (local development)
   - `https://<your-domain>/auth/google/callback` (production)
7. Download the credentials JSON file and save it as `credentials.json` in the project root
8. Go to **OAuth consent screen** → add your email under **Test users** (required while the app is in testing mode)

## Installation

```bash
# Clone the repository
git clone https://github.com/Bwong101/inbox-concierge-tenex.git
cd inbox-concierge-tenex

# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

## Environment Variables

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
SESSION_SECRET=any-random-secret-string
```

For production deployments, also set:

```env
APP_URL=https://your-deployed-url.com
GOOGLE_CREDENTIALS={"web":{"client_id":"...","client_secret":"...","redirect_uris":["https://your-deployed-url.com/auth/google/callback"]}}
```

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude classification |
| `SESSION_SECRET` | Yes | Secret for signing session cookies |
| `APP_URL` | Production only | Your deployed app URL (e.g. `https://app.up.railway.app`) |
| `GOOGLE_CREDENTIALS` | Production only | Full JSON contents of `credentials.json` (used when the file isn't available) |
| `VIP_EMAILS` | No | Comma-separated VIP email addresses |
| `PROTECTED_SENDERS` | No | Comma-separated protected senders (email, @domain, or domain) |
| `PROTECTED_KEYWORDS` | No | Comma-separated keywords that mark emails as protected |

## Running Locally

### Web Interface (development)

Starts both the Express backend (port 3001) and Vite dev server (port 5173) with hot reload:

```bash
npm run dev
```

Then open http://localhost:5173 and click "Sign in with Google".

### Web Interface (production build)

```bash
npm run build    # Builds the React client to client/dist/
npm start        # Starts the Express server (serves API + static files)
```

### CLI

The CLI commands still work independently of the web interface:

```bash
# Analyze inbox, categorize emails, apply labels/filters
node src/cli.js analyze-filter

# Incremental processing (only new emails since last run)
node src/cli.js continuous

# Audit Gmail filters for problems
node src/cli.js cleanup
node src/cli.js cleanup --apply   # actually delete problematic filters

# Scan "Likely Spam" label for false positives
node src/cli.js spam-rescue

# Trash all emails from specific senders + create auto-trash filters
node src/cli.js trash-by-sender sender1@junk.com sender2@spam.com
```

Note: The CLI uses a separate auth flow (`credentials.json` with Desktop app type + `token.json`). Delete `token.json` and re-run to switch accounts.

## Running Tests

```bash
npm test
```

Tests use the Node.js built-in test runner and cover:
- `test/categorize.test.js` — email categorization logic and priority ordering
- `test/parse.test.js` — email/domain extraction and header parsing
- `test/protected.test.js` — protected domain matching
- `test/rate-limiter.test.js` — concurrent rate limiter serialization

## Deployment (Railway)

1. Push to GitHub
2. Create a new project on [Railway](https://railway.app) and connect your repo
3. Set environment variables in Railway dashboard:
   - `ANTHROPIC_API_KEY`
   - `SESSION_SECRET`
   - `APP_URL` — your Railway URL (e.g. `https://your-app.up.railway.app`)
   - `GOOGLE_CREDENTIALS` — full JSON from your `credentials.json`
4. Set build command: `npm run build`
5. Set start command: `npm start`
6. Add your Railway URL to Google Cloud Console as an authorized redirect URI
7. Add your Google account as a test user in the OAuth consent screen

## Project Structure

```
├── server/                     # Express backend
│   ├── index.js                # Entry point, middleware, static serving
│   ├── routes/
│   │   ├── auth.js             # Google OAuth redirect flow
│   │   ├── emails.js           # Email fetch + Claude classification
│   │   └── buckets.js          # Custom bucket CRUD
│   ├── services/
│   │   ├── classifier.js       # Claude API integration
│   │   ├── gmail-session.js    # Per-session GmailClient factory
│   │   └── credentials.js      # Load credentials from file or env var
│   └── middleware/
│       └── requireAuth.js      # Session auth guard
├── client/                     # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── App.jsx             # Auth state routing
│   │   ├── api.js              # Fetch wrapper
│   │   └── components/
│   │       ├── LoginPage.jsx       # Google sign-in
│   │       ├── EmailDashboard.jsx  # Main email view
│   │       ├── BucketColumn.jsx    # Bucket with email list
│   │       ├── EmailCard.jsx       # Email preview card
│   │       ├── BucketManager.jsx   # Add/remove buckets
│   │       └── LoadingState.jsx    # Loading spinner
│   └── vite.config.js         # Dev proxy to Express
├── src/                        # Shared libraries + CLI
│   ├── cli.js                  # CLI entry point
│   ├── auth.js                 # CLI OAuth flow (Desktop)
│   ├── config.js               # Environment config loader
│   ├── checkpoint.js           # Checkpoint persistence
│   ├── lib/
│   │   ├── gmail.js            # Rate-limited Gmail API wrapper
│   │   ├── categorize.js       # Pure email categorization function
│   │   ├── parse.js            # Email/domain parsing
│   │   ├── protected.js        # Protected domains list
│   │   ├── labels.js           # Gmail label management
│   │   └── rate-limiter.js     # Promise-chain rate limiter
│   └── commands/               # CLI command implementations
└── test/                       # Unit tests
```

## How Classification Works

1. Emails are fetched from Gmail via the API
2. Each email is first run through a **heuristic categorizer** (`src/lib/categorize.js`) that checks sender domains, subject patterns, and Gmail labels
3. The heuristic result is passed as a hint to **Claude Sonnet**, which makes the final classification into buckets
4. When users add or remove custom buckets, all cached emails are re-sent to Claude with the updated bucket definitions

Default buckets:
- **Important** — emails from real people, direct requests, urgent items
- **Can Wait** — receipts, confirmations, shipment updates, account notifications
- **Newsletter** — subscriptions and digests
- **Auto-Archive** — promotional, social, automated, forum emails
- **Spam-like** — marketing, cold outreach, junk that slipped past filters
