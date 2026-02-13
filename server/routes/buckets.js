import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getDefaultBuckets } from '../services/classifier.js';

export const bucketsRouter = Router();
bucketsRouter.use(requireAuth);

// GET /api/buckets
bucketsRouter.get('/', (req, res) => {
  res.json(req.session.customBuckets || getDefaultBuckets());
});

// POST /api/buckets — add a custom bucket
bucketsRouter.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Bucket name is required' });
  }

  if (!req.session.customBuckets) {
    req.session.customBuckets = getDefaultBuckets();
  }

  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Don't allow duplicate ids
  if (req.session.customBuckets.some(b => b.id === id)) {
    return res.status(409).json({ error: 'A bucket with that name already exists' });
  }

  req.session.customBuckets.push({ id, name: name.trim(), description: (description || '').trim() });
  res.json(req.session.customBuckets);
});

// DELETE /api/buckets/:id
bucketsRouter.delete('/:id', (req, res) => {
  if (!req.session.customBuckets) {
    req.session.customBuckets = getDefaultBuckets();
  }
  req.session.customBuckets = req.session.customBuckets.filter(b => b.id !== req.params.id);
  res.json(req.session.customBuckets);
});
