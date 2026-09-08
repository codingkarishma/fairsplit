export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div
      className={`flex items-center justify-center py-12 ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div
        className={`${sizes[size] || sizes.md} animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600`}
      />
    </div>
  );
}
