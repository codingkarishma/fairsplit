import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, ExternalLink, LockKeyhole, Send } from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ClaimItems } from '../components/shared/ClaimItems';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useBill } from '../hooks/useBill';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../utils/currency';
import { getAvatarColor, getInitials } from '../utils/avatar';

export default function BillDashboard() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const { bill, loading, error, refetch } = useBill(billId);
  const [hostBill] = useLocalStorage(`fairsplit_host_${billId}`, null);
  const { showToast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (error || !bill) {
    return (
      <ErrorMessage message={error || 'Bill not found'} onRetry={refetch} />
    );
  }

  const hostCode = hostBill?._id === bill._id ? hostBill.hostCode : '';
  const runHostAction = async (action, message) => {
    setActionLoading(true);
    try {
      await action(bill._id, hostCode);
      await refetch();
      showToast(message);
    } catch (actionError) {
      showToast(actionError.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(bill.shareCode);
    showToast('Code copied');
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <Badge status={bill.status} />
            <span className="text-sm text-slate-500">Host dashboard</span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-slate-950">
            {bill.restaurantName || bill.hostName || 'FairSplit bill'}
          </h1>
          <p className="mt-2 text-slate-500">
            Manage claims and settle the final breakdown.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {bill.status === 'draft' && (
            <Button
              loading={actionLoading}
              onClick={() => runHostAction(api.publishBill, 'Bill published')}
            >
              <Send size={16} /> Publish
            </Button>
          )}
          {bill.status === 'open' && (
            <Button
              variant="danger"
              loading={actionLoading}
              onClick={() =>
                window.confirm(
                  'Close this bill? Participants will not be able to claim more items.',
                ) && runHostAction(api.closeBill, 'Bill closed')
              }
            >
              <LockKeyhole size={16} /> Close bill
            </Button>
          )}
          {bill.status === 'closed' && (
            <Button onClick={() => navigate(`/bills/${bill._id}/totals`)}>
              <ExternalLink size={16} /> View final breakdown
            </Button>
          )}
        </div>
      </div>

      <ErrorMessage
        message={
          !hostCode && bill.status !== 'closed'
            ? 'Host code is unavailable for this browser. Open this dashboard from the host device.'
            : ''
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-slate-950">
              Share code
            </h2>
            <Button variant="ghost" size="sm" onClick={copyCode}>
              <Copy size={15} /> Copy
            </Button>
          </div>
          <p className="mt-5 font-mono text-4xl font-bold tracking-[0.2em] text-blue-600">
            {bill.shareCode}
          </p>
          <p className="mt-3 break-all text-sm text-slate-500">
            {window.location.origin}/join/{bill.shareCode}
          </p>
          <h2 className="mt-8 font-display text-xl font-bold text-slate-950">
            Participants
          </h2>
          <div className="mt-4 space-y-3">
            {bill.participants?.length ? (
              bill.participants.map((person) => (
                <div key={person._id} className="flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white ${getAvatarColor(person._id)}`}
                  >
                    {getInitials(person.name)}
                  </span>
                  <span className="font-semibold text-slate-700">
                    {person.name}
                  </span>
                  {person.isHost && <Badge>Host</Badge>}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No one has joined yet.</p>
            )}
          </div>
        </Card>

        {bill.status === 'open' &&
          bill.participants?.some((person) => person.isHost) && (
            <ClaimItems
              bill={bill}
              participant={bill.participants.find((person) => person.isHost)}
              shareCode={bill.shareCode}
              onRefresh={refetch}
            />
          )}

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-slate-950">
              Items
            </h2>
            <span className="text-sm text-slate-500">
              {bill.items?.length || 0} line items
            </span>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {bill.items?.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-semibold text-slate-800">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.claims?.length
                      ? `${item.claims.length} claimant${item.claims.length === 1 ? '' : 's'}`
                      : 'Unclaimed'}
                  </p>
                </div>
                <span className="font-semibold text-slate-700">
                  {formatCurrency(item.priceCents, bill.currency)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
