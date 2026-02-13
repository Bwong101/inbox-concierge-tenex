import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getGmailClientFromSession } from '../services/gmail-session.js';
import { classifyEmails, getDefaultBuckets } from '../services/classifier.js';
import { parseHeaders, extractEmail } from '../../src/lib/parse.js';
import { isProtected } from '../../src/lib/protected.js';
import { categorizeEmail } from '../../src/lib/categorize.js';
import { loadConfig } from '../../src/config.js';

export const emailsRouter = Router();
emailsRouter.use(requireAuth);

// GET /api/emails — fetch inbox threads, classify with Claude, return grouped
emailsRouter.get('/', async (req, res) => {
  try {
    const gmail = await getGmailClientFromSession(req.session);
    const config = loadConfig();
    const buckets = req.session.customBuckets || getDefaultBuckets();

    // 1. Fetch last 200 messages from inbox
    const messages = await gmail.listMessages({ q: 'in:inbox', max: 200 });
    if (!messages.length) {
      const grouped = {};
      for (const b of buckets) grouped[b.id] = [];
      return res.json({ buckets, emails: grouped });
    }

    // 2. Fetch metadata for each message (batched, 10 concurrent)
    const BATCH = 10;
    const emailData = [];
    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(async (msg) => {
        try {
          const data = await gmail.getMessage(msg.id, ['From', 'Subject', 'Date', 'List-Unsubscribe', 'List-ID']);
          const headers = parseHeaders(data.payload?.headers);
          const fromEmail = extractEmail(headers.from || '');
          const category = categorizeEmail({
            fromEmail,
            subject: headers.subject || '',
            labelIds: data.labelIds || [],
            headers,
            vipEmails: config.vipEmails.map(e => e.toLowerCase()),
            isProtectedFn: (email) => isProtected(email, config.protectedSenders),
            protectedKeywords: config.protectedKeywords,
          });
          return {
            id: msg.id,
            threadId: data.threadId,
            from: headers.from || '',
            fromEmail,
            subject: headers.subject || '(no subject)',
            snippet: data.snippet || '',
            date: headers.date || '',
            labelIds: data.labelIds || [],
            isUnread: (data.labelIds || []).includes('UNREAD'),
            category,
          };
        } catch {
          return null;
        }
      }));
      emailData.push(...results.filter(Boolean));
    }

    // 3. Classify with Claude
    const classifications = await classifyEmails(emailData, buckets);

    // 4. Group emails by bucket
    const grouped = {};
    for (const bucket of buckets) {
      grouped[bucket.id] = [];
    }
    for (const email of emailData) {
      const bucketId = classifications[email.id] || 'auto-archive';
      if (grouped[bucketId]) {
        grouped[bucketId].push(email);
      } else if (grouped['auto-archive']) {
        grouped['auto-archive'].push(email);
      }
    }

    // Cache in session for reclassification
    req.session.emailCache = emailData;

    res.json({ buckets, emails: grouped });
  } catch (err) {
    console.error('Email fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/emails/reclassify — reclassify cached emails with updated buckets
emailsRouter.post('/reclassify', async (req, res) => {
  try {
    const emailData = req.session.emailCache;
    if (!emailData?.length) {
      return res.status(400).json({ error: 'No cached emails. Fetch first.' });
    }
    const buckets = req.session.customBuckets || getDefaultBuckets();
    const classifications = await classifyEmails(emailData, buckets);

    const grouped = {};
    for (const bucket of buckets) {
      grouped[bucket.id] = [];
    }
    for (const email of emailData) {
      const bucketId = classifications[email.id] || 'auto-archive';
      if (grouped[bucketId]) {
        grouped[bucketId].push(email);
      } else if (grouped['auto-archive']) {
        grouped['auto-archive'].push(email);
      }
    }

    res.json({ buckets, emails: grouped });
  } catch (err) {
    console.error('Reclassify error:', err);
    res.status(500).json({ error: err.message });
  }
});
