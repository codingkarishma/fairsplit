export function ErrorMessage({ message, onRetry, className = '' }) {
  if (!message) return null;

  return (
    <div
      className={`mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${className}`}
      role="alert"
    >
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm font-semibold underline hover:no-underline focus:outline-none"
        >
          Try again
        </button>
      )}
    </div>
  );
}
