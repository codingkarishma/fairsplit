export function splitEven(cents, count) {
  if (count <= 0) return [];
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from(
    { length: count },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

function participantId(value) {
  return String(value?._id || value?.participantId || value);
}

function addShares(target, ids, cents) {
  splitEven(cents, ids.length).forEach((share, index) => {
    target.set(ids[index], (target.get(ids[index]) || 0) + share);
  });
}

export function personBreakdown(bill) {
  const participants = bill?.participants || [];
  const ids = participants.map(participantId);
  const sortedIds = [...ids].sort((left, right) => left.localeCompare(right));
  const entries = new Map(
    participants.map((participant) => [
      participantId(participant),
      {
        ...participant,
        items: [],
        subtotal: 0,
        unclaimed: 0,
        tax: 0,
        tip: 0,
        total: 0,
      },
    ]),
  );
  const claimed = new Map(ids.map((id) => [id, 0]));
  const unclaimed = new Map(ids.map((id) => [id, 0]));

  for (const item of bill?.items || []) {
    const claims = (item.claims || []).filter((claim) =>
      entries.has(participantId(claim.participantId)),
    );
    if (!claims.length) {
      const shares = splitEven(item.priceCents, sortedIds.length);
      sortedIds.forEach((id, index) => {
        const person = entries.get(id);
        person.unclaimed += shares[index];
        person.items.push({
          name: `${item.name} (unclaimed split)`,
          amount: shares[index],
        });
      });
      addShares(unclaimed, sortedIds, item.priceCents);
      continue;
    }

    const claimIds = claims.map((claim) => participantId(claim.participantId));
    const custom = claims.filter((claim) => claim.customAmountCents != null);
    const customTotal = custom.reduce(
      (sum, claim) => sum + Number(claim.customAmountCents),
      0,
    );
    const defaultIds = claimIds.filter(
      (id) =>
        !custom.some((claim) => participantId(claim.participantId) === id),
    );
    custom.forEach((claim) => {
      const amount = Number(claim.customAmountCents);
      const person = entries.get(participantId(claim.participantId));
      person.subtotal += amount;
      person.items.push({ name: item.name, amount });
      claimed.set(
        participantId(claim.participantId),
        claimed.get(participantId(claim.participantId)) + amount,
      );
    });
    if (defaultIds.length) {
      splitEven(item.priceCents - customTotal, defaultIds.length).forEach(
        (amount, index) => {
          const person = entries.get(defaultIds[index]);
          person.subtotal += amount;
          person.items.push({ name: item.name, amount });
          claimed.set(
            defaultIds[index],
            claimed.get(defaultIds[index]) + amount,
          );
        },
      );
    }
  }

  const subtotal = (bill?.items || []).reduce(
    (sum, item) => sum + item.priceCents,
    0,
  );
  const taxCents = Math.round((subtotal * Number(bill?.taxPercent || 0)) / 100);
  const tipCents = Math.round((subtotal * Number(bill?.tipPercent || 0)) / 100);
  const taxShares = splitEven(taxCents, ids.length);
  const tipShares = splitEven(tipCents, ids.length);

  return participants.map((participant, index) => {
    const id = ids[index];
    const person = entries.get(id);
    person.tax = taxShares[index] || 0;
    person.tip = tipShares[index] || 0;
    person.total = person.subtotal + person.unclaimed + person.tax + person.tip;
    return person;
  });
}
