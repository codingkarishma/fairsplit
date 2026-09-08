import { Copy, ExternalLink } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useBill } from '../hooks/useBill';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../utils/currency';
import { getAvatarColor, getInitials } from '../utils/avatar';
import { personBreakdown } from '../utils/split';

export default function TotalsPage() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const { bill, loading, error, refetch } = useBill(billId);
  const { showToast } = useToast();

  if (loading) return <LoadingSpinner />;
  if (error || !bill)
    return (
      <ErrorMessage message={error || 'Bill not found'} onRetry={refetch} />
    );

  const breakdown = personBreakdown(bill);
  const subtotal =
    bill.items?.reduce((sum, item) => sum + item.priceCents, 0) || 0;
  const tax = Math.round((subtotal * Number(bill.taxPercent || 0)) / 100);
  const tip = Math.round((subtotal * Number(bill.tipPercent || 0)) / 100);
  const title = bill.restaurantName || bill.hostName;
  const copyAmount = async (person) => {
    await navigator.clipboard.writeText(
      `${person.name} owes ${formatCurrency(person.total, bill.currency)} for ${title}`,
    );
    showToast('Amount copied');
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Final breakdown
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-slate-950">
            {title}
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/bills/${bill._id}`)}
        >
          Back to bill
        </Button>
      </div>
      <Card className="mb-8 grid gap-5 bg-slate-950 text-white sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Subtotal
          </p>
          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(subtotal, bill.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Tax + tip
          </p>
          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(tax + tip, bill.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-blue-300">
            Total
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-300">
            {formatCurrency(subtotal + tax + tip, bill.currency)}
          </p>
        </div>
      </Card>
      <div className="space-y-5">
        {breakdown.map((person) => {
          const upiLink =
            bill.currency === 'INR' && bill.hostUpiId
              ? `upi://pay?pa=${encodeURIComponent(bill.hostUpiId)}&pn=${encodeURIComponent(title)}&am=${(person.total / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`FairSplit ${title} - ${person.name}`)}`
              : null;
          return (
            <Card key={person._id}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-full font-bold text-white ${getAvatarColor(person._id)}`}
                  >
                    {getInitials(person.name)}
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-950">
                      {person.name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {person.items.length} items
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-950">
                  {formatCurrency(person.total, bill.currency)}
                </p>
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                {person.items.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="flex justify-between py-2 text-sm text-slate-600"
                  >
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.amount, bill.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
                <span>Tax & tip</span>
                <span>
                  {formatCurrency(person.tax + person.tip, bill.currency)}
                </span>
              </div>
              {upiLink ? (
                <a
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white"
                  href={upiLink}
                >
                  <ExternalLink size={16} /> Pay via UPI
                </a>
              ) : (
                <Button
                  variant="secondary"
                  className="mt-5 w-full"
                  onClick={() => copyAmount(person)}
                >
                  <Copy size={16} /> Copy amount to share
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
