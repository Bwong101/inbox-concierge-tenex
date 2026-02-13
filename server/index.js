import express from 'express';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth.js';
import { emailsRouter } from './routes/emails.js';
import { bucketsRouter } from './routes/buckets.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MemoryStore = createMemoryStore(session);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(session({
  store: new MemoryStore({ checkPeriod: 86400000 }), // prune expired entries every 24h
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
}));

app.use('/auth', authRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/buckets', bucketsRouter);

// In production, serve the built client
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res, next) => {
  // Only serve index.html for non-API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
