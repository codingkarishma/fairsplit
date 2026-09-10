import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ClaimItems } from '../components/shared/ClaimItems';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { Input } from '../components/common/Input';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../utils/currency';
import { getAvatarColor, getInitials } from '../utils/avatar';

export default function JoinPage() {
  const { shareCode: urlCode } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [shareCode, setShareCode] = useState(urlCode || '');
  const [bill, setBill] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [name, setName] = useState('');
  const [view, setView] = useState(urlCode ? 'loading' : 'enter-code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshItems = useCallback(async () => {
    if (!bill) return;
    try {
      setBill(await api.getBill(bill._id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [bill]);

  const fetchBill = useCallback(async (code) => {
    setLoading(true);
    setError('');
    try {
      const nextBill = await api.getBillByShareCode(code);
      setBill(nextBill);
      setShareCode(nextBill.shareCode);
      const storedParticipant = localStorage.getItem(
        `fairsplit_participant_${nextBill._id}`,
      );
      setParticipant(storedParticipant ? JSON.parse(storedParticipant) : null);
      setView('join-form');
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Invalid share code',
      );
      setView('enter-code');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!urlCode) return undefined;
    const requestId = window.setTimeout(() => fetchBill(urlCode), 0);
    return () => window.clearTimeout(requestId);
  }, [fetchBill, urlCode]);
  useEffect(() => {
    if (view !== 'claim') return undefined;
    const interval = setInterval(refreshItems, 5000);
    return () => clearInterval(interval);
  }, [refreshItems, view]);

  const myTotal = (bill?.items || []).reduce((sum, item) => {
    const claim = item.claims?.find(
      (entry) => String(entry.participantId) === String(participant?._id),
    );
    return claim
      ? sum +
          (claim.customAmountCents ??
            Math.floor(item.priceCents / item.claims.length))
      : sum;
  }, 0);

  const handleJoin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const nextParticipant = await api.addParticipant(
        bill._id,
        shareCode,
        name.trim(),
      );
      const participantWithBill = { ...nextParticipant, billId: bill._id };
      setParticipant(participantWithBill);
      localStorage.setItem(
        `fairsplit_participant_${bill._id}`,
        JSON.stringify(participantWithBill),
      );
      setView('claim');
      showToast('You joined the bill');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
      showToast(requestError.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeView = participant && view === 'join-form' ? 'claim' : view;
  if (activeView === 'loading') return <LoadingSpinner />;
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <ErrorMessage message={error} />
      {activeView === 'enter-code' && (
        <Card className="mx-auto max-w-xl">
          <h1 className="font-display text-4xl font-bold text-slate-950">
            Join a split
          </h1>
          <p className="mt-3 text-slate-500">
            Enter the 6-digit code from your host.
          </p>
          <div className="mt-8 flex gap-3">
            <Input
              className="mb-0 flex-1"
              name="shareCode"
              value={shareCode}
              onChange={(event) =>
                setShareCode(event.target.value.toUpperCase())
              }
              maxLength={6}
              placeholder="ABC123"
            />
            <Button
              disabled={loading || shareCode.length !== 6}
              onClick={() => fetchBill(shareCode)}
            >
              Join
            </Button>
          </div>
        </Card>
      )}
      {activeView === 'join-form' && bill && (
        <Card className="mx-auto max-w-xl">
          <Badge status={bill.status} />
          <h1 className="mt-5 font-display text-3xl font-bold text-slate-950">
            {bill.restaurantName || bill.hostName}
          </h1>
          <p className="mt-2 text-slate-500">
            {bill.items?.length || 0} items to split
          </p>
          <form className="mt-8" onSubmit={handleJoin}>
            <Input
              label="Your name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Mike"
              required
            />
            <Button type="submit" loading={loading} className="w-full">
              Join split
            </Button>
          </form>
        </Card>
      )}
      {activeView === 'claim' && bill && participant && (
        <div>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge status={bill.status} />
              <h1 className="mt-3 font-display text-4xl font-bold text-slate-950">
                {bill.restaurantName || bill.hostName}
              </h1>
              <p className="mt-2 text-slate-500">
                Tap an item to claim or release it.
              </p>
            </div>
            <Card className="!bg-slate-950 !p-4 text-white">
              <p className="text-xs text-slate-400">You owe</p>
              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(myTotal, bill.currency)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                + your share of unclaimed items, tax & tip at close
              </p>
            </Card>
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {bill.participants?.map((person) => (
              <span
                key={person._id}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs text-white ${getAvatarColor(person._id)}`}
                >
                  {getInitials(person.name)}
                </span>
                {person.name}
                {person.isHost && <Badge>Host</Badge>}
              </span>
            ))}
          </div>
          <ClaimItems
            bill={bill}
            participant={participant}
            shareCode={shareCode}
            onRefresh={refreshItems}
          />
          {bill.status === 'closed' && (
            <Button
              className="mt-6"
              onClick={() => navigate(`/bills/${bill._id}/totals`)}
            >
              View final breakdown
            </Button>
          )}
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <Users size={15} /> Updates refresh automatically.
          </p>
        </div>
      )}
    </div>
  );
}
