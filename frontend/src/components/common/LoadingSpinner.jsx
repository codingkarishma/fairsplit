export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className={`${sizes[size] || sizes.md} border-4 border-blue-600 border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}