export function Card({ children, className = '', padded = true }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${padded ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}