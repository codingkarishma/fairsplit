export function Card({ children, className = '', padded = true }) {
  return (
    <div
      className={`rounded-2xl border border-white/80 bg-white/85 shadow-[0_18px_50px_-28px_rgba(31,48,87,0.45)] backdrop-blur-sm ${padded ? 'p-5 sm:p-6' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
