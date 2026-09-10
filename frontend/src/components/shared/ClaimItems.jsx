import { useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { api } from '../../api/client';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';

export function ClaimItems({ bill, participant, shareCode, onRefresh }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customItemId, setCustomItemId] = useState(null);
  const [customMode, setCustomMode] = useState('amount');
  const [customValue, setCustomValue] = useState('');

  const resetCustomClaim = () => {
    setCustomItemId(null);
    setCustomMode('amount');
    setCustomValue('');
  };

  const toggleClaim = async (item, customAmountCents = null) => {
    if (!participant || bill.status === 'closed') return;
    const hasClaimed = item.claims?.some(
      (claim) => String(claim.participantId) === String(participant._id),
    );
    setLoading(true);
    try {
      if (hasClaimed) {
        await api.unclaimItem(bill._id, item._id, shareCode, participant._id);
      } else {
        await api.claimItem(
          bill._id,
          item._id,
          shareCode,
          participant._id,
          customAmountCents,
        );
      }
      await onRefresh();
      resetCustomClaim();
    } catch (requestError) {
      showToast(requestError.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitCustomClaim = async (event, item) => {
    event.stopPropagation();
    const value = Number(customValue);
    if (!Number.isFinite(value) || value < 0) {
      showToast('Enter a valid claim amount or percentage', 'error');
      return;
    }

    let customAmountCents;
    if (customMode === 'percent') {
      if (value > 100) {
        showToast('Percentage must be between 0 and 100', 'error');
        return;
      }
      customAmountCents = Math.round((value / 100) * item.priceCents);
    } else {
      customAmountCents = Math.round(value * 100);
    }
    if (customAmountCents > item.priceCents) {
      showToast('Claim amount cannot exceed the item price', 'error');
      return;
    }
    await toggleClaim(item, customAmountCents);
  };

  return (
    <Card padded={false}>
      <div className="divide-y divide-slate-100">
        {bill.items?.map((item) => {
          const myClaim = item.claims?.some(
            (claim) => String(claim.participantId) === String(participant?._id),
          );
          const isFullyClaimed = (item.claims?.length || 0) > 0 && !myClaim;
          return (
            <div
              key={item._id}
              role="button"
              tabIndex={0}
              onClick={() => toggleClaim(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleClaim(item);
                }
              }}
              className={`relative flex cursor-pointer items-center justify-between gap-4 px-5 py-4 outline-none focus:bg-blue-50 ${myClaim ? 'bg-blue-50' : ''} ${loading ? 'pointer-events-none opacity-70' : ''}`}
            >
              <div>
                <p className="font-semibold text-slate-800">{item.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.claims?.length
                    ? `${item.claims.length} claimed`
                    : 'Unclaimed'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-700">
                  {formatCurrency(item.priceCents, bill.currency)}
                </p>
                <span
                  className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${myClaim ? 'bg-blue-600 text-white' : isFullyClaimed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}
                >
                  {myClaim ? (
                    <>
                      <Check size={12} /> Claimed
                    </>
                  ) : isFullyClaimed ? (
                    <>
                      <Lock size={12} /> Taken
                    </>
                  ) : (
                    'Tap to claim'
                  )}
                </span>
                {!myClaim && !isFullyClaimed && (
                  <button
                    type="button"
                    className="mt-2 block text-xs font-semibold text-blue-600 underline"
                    onClick={(event) => {
                      event.stopPropagation();
                      setCustomItemId(item._id);
                      setCustomValue('');
                    }}
                  >
                    Customize
                  </button>
                )}
              </div>
              {customItemId === item._id && !myClaim && (
                <div
                  className="absolute right-5 top-full z-10 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mb-2 flex gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      className={
                        customMode === 'amount'
                          ? 'text-blue-600'
                          : 'text-slate-500'
                      }
                      onClick={() => setCustomMode('amount')}
                    >
                      Exact amount
                    </button>
                    <button
                      type="button"
                      className={
                        customMode === 'percent'
                          ? 'text-blue-600'
                          : 'text-slate-500'
                      }
                      onClick={() => setCustomMode('percent')}
                    >
                      Percentage
                    </button>
                  </div>
                  <Input
                    className="mb-2"
                    name={`custom-${item._id}`}
                    type="number"
                    min="0"
                    max={customMode === 'percent' ? '100' : undefined}
                    step="0.01"
                    value={customValue}
                    onChange={(event) => setCustomValue(event.target.value)}
                    placeholder={customMode === 'percent' ? '50' : '10.00'}
                  />
                  <button
                    type="button"
                    className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                    onClick={(event) => submitCustomClaim(event, item)}
                  >
                    Claim custom share
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
