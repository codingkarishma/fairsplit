const styles = {
  open: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  closed: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  draft: 'bg-amber-50 text-amber-700 ring-amber-600/10',
};

export function Badge({ status = 'open', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${styles[status] || styles.open}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {children || status}
    </span>
  );
}
