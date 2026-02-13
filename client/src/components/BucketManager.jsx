import { useState } from 'react';
import { fetchJSON } from '../api';

export default function BucketManager({ buckets, onBucketsChanged }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);

  const addBucket = async () => {
    if (!name.trim()) return;
    setError(null);
    try {
      const updated = await fetchJSON('/api/buckets', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      setName('');
      setDescription('');
      setOpen(false);
      onBucketsChanged(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeBucket = async (id) => {
    try {
      const updated = await fetchJSON(`/api/buckets/${id}`, { method: 'DELETE' });
      onBucketsChanged(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addBucket();
    if (e.key === 'Escape') { setOpen(false); setName(''); setDescription(''); }
  };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {buckets.map(b => (
          <span key={b.id} className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm shadow-sm">
            <span className="text-gray-700">{b.name}</span>
            <button
              onClick={() => removeBucket(b.id)}
              className="text-gray-300 hover:text-red-500 ml-0.5 transition"
              title={`Remove ${b.name} bucket`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}

        {open ? (
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Bucket name"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Description (helps AI classify)"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
            <button
              onClick={addBucket}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
              Add
            </button>
            <button
              onClick={() => { setOpen(false); setName(''); setDescription(''); }}
              className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700 transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-full transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add bucket
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
