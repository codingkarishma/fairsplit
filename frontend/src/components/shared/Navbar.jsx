import { Link } from 'react-router-dom';
import { ReceiptText, Sparkles } from 'lucide-react';

function Navbar() {
  return (
    <header className="border-b border-stone-200/70 bg-cream/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link
          to="/"
          className="group flex items-center gap-2.5"
          aria-label="FairSplit home"
        >
          <span className="grid h-10 w-10 rotate-[-4deg] place-items-center rounded-2xl bg-terracotta-500 text-xl shadow-lg shadow-terracotta-500/20 transition-transform duration-200 group-hover:rotate-3">
            <ReceiptText size={22} strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold tracking-wide text-warm-ink">
            FairSplit
          </span>
        </Link>
        <nav
          className="flex items-center gap-2"
          aria-label="Primary navigation"
        >
          <Link
            to="/join"
            className="hidden px-3 py-2 text-sm font-semibold text-stone-600 transition hover:bg-terracotta-50 hover:text-terracotta-600 sm:block"
          >
            Join a bill
          </Link>
          <Link
            to="/host"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-terracotta-500 to-terracotta-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-terracotta-500/20 transition hover:scale-[0.98] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-terracotta-300"
          >
            <Sparkles size={16} aria-hidden="true" /> Create a bill
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
