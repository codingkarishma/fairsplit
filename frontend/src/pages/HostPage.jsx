import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Check, Copy, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { Input } from '../components/common/Input';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { validateBillForm } from '../utils/validation';

const currencies = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export default function HostPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [bill, setBill] = useLocalStorage('fairsplit_host_bill', null);
  const { showToast } = useToast();
  const [step, setStep] = useState('form');
  const [title, setTitle] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [taxPercent, setTaxPercent] = useState(0);
  const [tipPercent, setTipPercent] = useState(0);
  const [hostUpiId, setHostUpiId] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (event) => {
    event.preventDefault();
    const errors = validateBillForm({
      title,
      currency,
      taxPercent,
      tipPercent,
    });
    setError(Object.values(errors)[0] || '');
    if (Object.keys(errors).length) return;
    setLoading(true);
    try {
      const created = await api.createBill({
        hostName: title.trim(),
        restaurantName: title.trim(),
        currency,
        taxPercent: Number(taxPercent),
        tipPercent: Number(tipPercent),
        hostUpiId: hostUpiId || undefined,
      });
      setBill(created);
      setStep('upload');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setStep('uploading');
    setError('');
    try {
      const result = await api.uploadReceipt(file);
      setItems(result.items || []);
      setStep('review');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
      setStep('upload');
    }
  }, []);

  const saveItems = async () => {
    setLoading(true);
    try {
      await api.updateBillItems(
        bill._id,
        bill.hostCode,
        items.map((item) => ({
          name: item.name,
          priceCents: Math.round(Number(item.priceCents) || 0),
          quantity: Number(item.quantity) || 1,
        })),
      );
      await api.publishBill(bill._id, bill.hostCode);
      setStep('published');
      showToast('Bill published');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const copyShareCode = async () => {
    await navigator.clipboard.writeText(bill.shareCode);
    showToast('Code copied');
  };

  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
          {step === 'published'
            ? 'Share'
            : `Step ${step === 'form' ? 1 : step === 'upload' || step === 'uploading' ? 2 : 3}`}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-950">
          {step === 'form'
            ? 'Create a new split'
            : step === 'published'
              ? 'Your bill is live'
              : step === 'review'
                ? 'Review items'
                : 'Upload your receipt'}
        </h1>
      </div>
      <ErrorMessage message={error} />

      {step === 'form' && (
        <Card>
          <form onSubmit={handleCreate}>
            <Input
              label="Bill title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Dinner at The Burger Joint"
              required
            />
            <label
              className="mb-4 block text-sm font-semibold text-slate-700"
              htmlFor="currency"
            >
              Currency
              <select
                id="currency"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {currencies.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.symbol} {option.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Host UPI ID"
                name="hostUpiId"
                value={hostUpiId}
                onChange={(event) => setHostUpiId(event.target.value)}
              />
              <Input
                label="Tax %"
                name="taxPercent"
                type="number"
                value={taxPercent}
                onChange={(event) => setTaxPercent(event.target.value)}
              />
              <Input
                label="Tip %"
                name="tipPercent"
                type="number"
                value={tipPercent}
                onChange={(event) => setTipPercent(event.target.value)}
              />
            </div>
            <Button type="submit" loading={loading} className="mt-3 w-full">
              Create bill
            </Button>
          </form>
        </Card>
      )}

      {step === 'upload' && (
        <Card className="text-center">
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-16">
            <Camera className="mx-auto h-12 w-12 text-blue-600" />
            <h2 className="mt-5 font-display text-2xl font-bold text-slate-950">
              Drop your receipt here
            </h2>
            <p className="mt-2 text-slate-500">JPG, PNG, or PDF up to 10MB.</p>
            <Button
              className="mt-6"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose file
            </Button>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => handleFile(event.target.files[0])}
            />
          </div>
          <button
            className="mt-6 text-sm font-semibold text-slate-500 underline"
            onClick={() => setStep('review')}
          >
            Skip upload and add items manually
          </button>
        </Card>
      )}

      {step === 'uploading' && (
        <Card>
          <LoadingSpinner />
          <p className="text-center font-semibold text-slate-700">
            Reading your receipt...
          </p>
        </Card>
      )}

      {step === 'review' && (
        <Card>
          <p className="mb-5 text-slate-500">
            Edit, delete, or add items before publishing.
          </p>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item, index) => (
                <motion.div
                  key={item._id || index}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2 overflow-hidden"
                >
                  <Input
                    className="mb-0 flex-1"
                    name={`item-${index}`}
                    value={item.name}
                    onChange={(event) =>
                      updateItem(index, 'name', event.target.value)
                    }
                    placeholder="Item name"
                  />
                  <Input
                    className="mb-0 w-32"
                    name={`price-${index}`}
                    type="number"
                    value={(Number(item.priceCents) / 100).toFixed(2)}
                    onChange={(event) =>
                      updateItem(
                        index,
                        'priceCents',
                        Math.round(Number(event.target.value || 0) * 100),
                      )
                    }
                  />
                  <button
                    className="h-12 rounded-xl bg-red-50 px-3 text-red-600"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    aria-label={`Delete ${item.name || 'item'}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 font-semibold text-slate-600"
            onClick={() =>
              setItems((current) => [
                ...current,
                { name: '', priceCents: 0, quantity: 1 },
              ])
            }
          >
            <Plus size={17} /> Add item
          </button>
          <Button
            loading={loading}
            disabled={!items.length}
            onClick={saveItems}
            className="mt-6 w-full"
          >
            Save and publish
          </Button>
        </Card>
      )}

      {step === 'published' && bill && (
        <Card className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Check size={30} />
          </div>
          <h2 className="mt-5 font-display text-3xl font-bold text-slate-950">
            Bill is live
          </h2>
          <p className="mt-2 text-slate-500">
            Share this code with your group.
          </p>
          <p className="mt-8 font-mono text-5xl font-bold tracking-[0.2em] text-blue-600">
            {bill.shareCode}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={copyShareCode}>
              <Copy size={16} /> Copy code
            </Button>
            <Button onClick={() => navigate(`/bills/${bill._id}`)}>
              View dashboard
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
