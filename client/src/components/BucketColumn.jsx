import EmailCard from './EmailCard';

const BUCKET_COLORS = {
  'important': 'bg-red-50 border-red-200',
  'can-wait': 'bg-amber-50 border-amber-200',
  'newsletter': 'bg-purple-50 border-purple-200',
  'auto-archive': 'bg-gray-50 border-gray-200',
  'spam-like': 'bg-orange-50 border-orange-200',
};

const BUCKET_BADGE_COLORS = {
  'important': 'bg-red-100 text-red-700',
  'can-wait': 'bg-amber-100 text-amber-700',
  'newsletter': 'bg-purple-100 text-purple-700',
  'auto-archive': 'bg-gray-100 text-gray-600',
  'spam-like': 'bg-orange-100 text-orange-700',
};

export default function BucketColumn({ bucket, emails }) {
  const colorClass = BUCKET_COLORS[bucket.id] || 'bg-blue-50 border-blue-200';
  const badgeClass = BUCKET_BADGE_COLORS[bucket.id] || 'bg-blue-100 text-blue-700';

  return (
    <div className={`rounded-lg border p-4 ${colorClass}`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-sm text-gray-800">{bucket.name}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
          {emails.length}
        </span>
      </div>
      <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
        {emails.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No emails</p>
        ) : (
          emails.map(email => (
            <EmailCard key={email.id} email={email} />
          ))
        )}
      </div>
    </div>
  );
}
