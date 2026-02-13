import { useState, useEffect } from 'react';
import { fetchJSON } from '../api';
import BucketColumn from './BucketColumn';
import BucketManager from './BucketManager';
import LoadingState from './LoadingState';

export default function EmailDashboard({ userEmail, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [reclassifying, setReclassifying] = useState(false);
  const [buckets, setBuckets] = useState([]);
  const [emails, setEmails] = useState({});
  const [error, setError] = useState(null);

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJSON('/api/emails');
      setBuckets(data.buckets);
      setEmails(data.emails);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reclassify = async () => {
    setReclassifying(true);
    setError(null);
    try {
      const data = await fetchJSON('/api/emails/reclassify', { method: 'POST' });
      setBuckets(data.buckets);
      setEmails(data.emails);
    } catch (err) {
      setError(err.message);
    } finally {
      setReclassifying(false);
    }
  };

  const handleBucketsChanged = (newBuckets) => {
    setBuckets(newBuckets);
    reclassify();
  };

  const handleLogout = async () => {
    await fetchJSON('/auth/logout', { method: 'POST' }).catch(() => {});
    onLogout();
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const totalEmails = Object.values(emails).reduce((sum, arr) => sum + arr.length, 0);

  if (loading) {
    return <LoadingState message="Fetching and classifying your emails with AI..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Inbox Concierge</h1>
            {totalEmails > 0 && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {totalEmails} emails
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{userEmail}</span>
            <button
              onClick={fetchEmails}
              className="text-sm text-blue-600 hover:text-blue-800 transition"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-500 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-600">Buckets</h2>
            {reclassifying && (
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <span className="animate-spin inline-block w-3 h-3 border border-blue-600 border-t-transparent rounded-full"></span>
                Reclassifying...
              </span>
            )}
          </div>
          <BucketManager buckets={buckets} onBucketsChanged={handleBucketsChanged} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {buckets.map(bucket => (
            <BucketColumn
              key={bucket.id}
              bucket={bucket}
              emails={emails[bucket.id] || []}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
