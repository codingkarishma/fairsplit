import { Route, Routes } from 'react-router-dom';
import Navbar from './components/shared/Navbar';
import Footer from './components/shared/Footer';
import HomePage from './pages/HomePage';
import HostPage from './pages/HostPage';
import JoinPage from './pages/JoinPage';
import TotalsPage from './pages/TotalsPage';
import BillDashboard from './pages/BillDashboard';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <div className="min-h-screen bg-warm-white text-charcoal">
      <Navbar />
      <Toaster position="top-right" richColors />
      <main className="min-h-[calc(100vh-9rem)]">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/host" element={<HostPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/:shareCode" element={<JoinPage />} />
          <Route path="/bills/:billId" element={<BillDashboard />} />
          <Route path="/bills/:billId/totals" element={<TotalsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8">
      <h1 className="font-display text-4xl font-bold text-slate-950">
        Page not found
      </h1>
      <p className="mt-3 text-slate-500">That FairSplit link does not exist.</p>
    </div>
  );
}

export default App;
