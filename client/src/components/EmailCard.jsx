export default function EmailCard({ email }) {
  const senderName = email.from.replace(/<.*>/, '').trim() || email.fromEmail;
  const dateStr = email.date ? formatDate(email.date) : '';

  return (
    <div className={`border rounded-lg p-3 transition ${email.isUnread ? 'bg-blue-50/50 border-blue-200' : 'bg-white hover:bg-gray-50'}`}>
      <div className="flex justify-between items-start gap-2">
        <span className={`text-sm truncate max-w-[70%] ${email.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
          {senderName}
        </span>
        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{dateStr}</span>
      </div>
      <p className={`text-sm truncate mt-1 ${email.isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
        {email.subject}
      </p>
      <p className="text-xs text-gray-400 truncate mt-0.5">{email.snippet}</p>
    </div>
  );
}

function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
