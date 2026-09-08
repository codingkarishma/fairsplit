import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useBill(billId) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBill = useCallback(async () => {
    if (!billId) {
      setLoading(false);
      setBill(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.getBill(billId);
      setBill(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch bill');
      setBill(null);
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    const request = Promise.resolve().then(fetchBill);

    return () => {
      request.catch(() => {});
    };
  }, [fetchBill]);

  return { bill, loading, error, refetch: fetchBill };
}
