import Anthropic from '@anthropic-ai/sdk';

// Lazy-initialize so dotenv.config() in server/index.js runs first
let _anthropic;
function getClient() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

const DEFAULT_BUCKETS = [
  { id: 'important', name: 'Important', description: 'Emails from real people, direct personal messages, urgent items, work-related correspondence' },
  { id: 'can-wait', name: 'Can Wait', description: 'Legitimate but non-urgent: receipts, confirmations, shipment updates, account notifications' },
  { id: 'newsletter', name: 'Newsletter', description: 'Subscriptions, digests, and content the user signed up for' },
  { id: 'auto-archive', name: 'Auto-Archive', description: 'Promotional emails, social notifications, automated alerts, forums — safe to archive' },
  { id: 'spam-like', name: 'Spam-like', description: 'Marketing, cold outreach, or junk that slipped past spam filters' },
];

export function getDefaultBuckets() {
  return DEFAULT_BUCKETS.map(b => ({ ...b }));
}

/**
 * Classify an array of email summaries into buckets using Claude.
 * @param {Array} emails - [{ id, from, subject, snippet, category }]
 * @param {Array} buckets - [{ id, name, description }]
 * @returns {Object} - { [emailId]: bucketId }
 */
export async function classifyEmails(emails, buckets) {
  if (!emails.length) return {};

  const bucketDefs = buckets.map(b => `- "${b.id}": ${b.name} — ${b.description}`).join('\n');
  const bucketIds = buckets.map(b => b.id);

  // Chunk into groups of 100 to stay within token limits
  const CHUNK = 100;
  const results = {};

  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK);
    const emailList = chunk.map((e, idx) =>
      `${idx}. From: ${e.from} | Subject: ${e.subject} | Preview: ${(e.snippet || '').slice(0, 80)} | Hint: ${e.category}`
    ).join('\n');

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are an email classifier. Given emails and bucket definitions, classify each email into exactly one bucket.

Buckets:
${bucketDefs}

Rules:
- Use the "Hint" field as a starting signal but make your own judgment based on sender and subject.
- Emails from real people (not companies/services) almost always go to "important".
- Protected/VIP senders (banking, healthcare, travel) go to "can-wait" unless they look urgent.
- Newsletters, digests, and subscription content go to "newsletter".
- Promotional, social, automated, and forum emails go to "auto-archive".
- Cold outreach, marketing spam, and suspicious emails go to "spam-like".

Respond with ONLY a valid JSON object mapping the email index (number) to a bucket id (string).
Example: {"0":"important","1":"auto-archive","2":"newsletter"}
No other text, explanation, or formatting.`,
      messages: [{ role: 'user', content: `Classify these emails:\n${emailList}` }],
    });

    const text = response.content[0].text;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      const parsed = JSON.parse(jsonMatch[0]);

      for (const [indexStr, bucketId] of Object.entries(parsed)) {
        const idx = parseInt(indexStr);
        if (chunk[idx]) {
          // Validate bucket id exists, fallback to auto-archive
          results[chunk[idx].id] = bucketIds.includes(bucketId) ? bucketId : 'auto-archive';
        }
      }
    } catch (parseErr) {
      console.error('Failed to parse Claude response:', parseErr.message);
      // Fallback: assign all to auto-archive
      for (const email of chunk) {
        results[email.id] = 'auto-archive';
      }
    }
  }

  return results;
}
