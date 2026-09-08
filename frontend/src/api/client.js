const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  throw new Error('VITE_API_URL is not set');
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, options);
  let data = {};

  try {
    data = await res.json();
  } catch {
    // Some proxy and gateway errors do not return JSON.
  }

  if (!res.ok) {
    const error = new Error(data.error || data.message || 'Request failed');
    error.status = res.status;
    error.response = { data };
    throw error;
  }

  return data;
}

export const api = {
  // Bills
  createBill: (data) =>
    request('/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getBill: (id) => request(`/bills/${id}`),

  getBillByShareCode: (shareCode) => request(`/bills/join/${shareCode}`),

  updateBillItem: (billId, itemId, hostCode, item) =>
    request(`/bills/${billId}/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Code': hostCode,
      },
      body: JSON.stringify(item),
    }),

  addBillItem: (billId, hostCode, item) =>
    request(`/bills/${billId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Code': hostCode,
      },
      body: JSON.stringify(item),
    }),

  publishBill: (id, hostCode) =>
    request(`/bills/${id}/publish`, {
      method: 'POST',
      headers: { 'X-Host-Code': hostCode },
    }),

  closeBill: (id, hostCode) =>
    request(`/bills/${id}/close`, {
      method: 'POST',
      headers: { 'X-Host-Code': hostCode },
    }),

  // Participants
  addParticipant: (id, shareCode, name) =>
    request(`/bills/${id}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Share-Code': shareCode,
      },
      body: JSON.stringify({ name }),
    }),

  // Items
  claimItem: (
    billId,
    itemId,
    shareCode,
    participantId,
    customAmountCents = null,
  ) =>
    request(`/bills/${billId}/items/${itemId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Share-Code': shareCode,
      },
      body: JSON.stringify({ participantId, customAmountCents }),
    }),

  unclaimItem: (billId, itemId, shareCode, participantId) =>
    request(`/bills/${billId}/items/${itemId}/unclaim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Share-Code': shareCode,
      },
      body: JSON.stringify({ participantId }),
    }),

  // OCR
  uploadReceipt: (file) => {
    const formData = new FormData();
    formData.append('receipt', file);
    return request('/ocr/extract', {
      method: 'POST',
      body: formData,
    });
  },
};
