export function ErrorMessage({ message, onRetry, className = '' }) {
  if (!message) return null;

  return (
    <div className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 ${className}`}>
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm underline mt-2 hover:no-underline focus:outline-none"
        >
          Try again
        </button>
      )}
    </div>
  );
}