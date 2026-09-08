function toParticipantId(participant) {
  return String(participant._id || participant.participantId || participant);
}

function toCents(price) {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error('Item price must be a non-negative number');
  }
  return Math.round(numericPrice * 100);
}

function percentToCents(subtotalCents, percent) {
  return Math.round((subtotalCents * Number(percent || 0)) / 100);
}

function participantIdsInBillOrder(participants) {
  return participants.map(toParticipantId);
}

function sortedParticipantIds(participantIds) {
  return [...participantIds].sort((left, right) => left.localeCompare(right));
}

function addSplit(totalCents, participantIds, totals) {
  const baseCents = Math.floor(totalCents / participantIds.length);
  const remainderCents = totalCents % participantIds.length;

  participantIds.forEach((participantId, index) => {
    totals.set(
      participantId,
      (totals.get(participantId) || 0) +
        baseCents +
        (index < remainderCents ? 1 : 0),
    );
  });
}

function calculateBillTotals({
  items,
  participants,
  taxAmount = 0,
  tipAmount = 0,
  taxPercent,
  tipPercent,
}) {
  const participantIds = participantIdsInBillOrder(participants);
  if (participantIds.length === 0) {
    throw new Error('Cannot finalize a bill with no participants');
  }

  const allocationParticipantIds = sortedParticipantIds(participantIds);
  const participantSet = new Set(participantIds);
  const claimedTotals = new Map(participantIds.map((id) => [id, 0]));
  const unclaimedTotals = new Map(participantIds.map((id) => [id, 0]));
  const taxTotals = new Map(participantIds.map((id) => [id, 0]));
  const tipTotals = new Map(participantIds.map((id) => [id, 0]));
  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents, 0);

  for (const item of items) {
    const claimsByParticipant = new Map();
    for (const claim of item.claims || []) {
      const participantId = String(claim.participantId);
      if (participantSet.has(participantId)) {
        claimsByParticipant.set(participantId, claim);
      }
    }
    const claimantIds = sortedParticipantIds([...claimsByParticipant.keys()]);

    if (claimantIds.length > 0) {
      const itemCents = item.priceCents;
      const customClaims = claimantIds.filter(
        (participantId) =>
          claimsByParticipant.get(participantId).customAmountCents !== null &&
          claimsByParticipant.get(participantId).customAmountCents !==
            undefined,
      );
      const defaultClaimants = claimantIds.filter(
        (participantId) => !customClaims.includes(participantId),
      );
      const customTotalCents = customClaims.reduce(
        (sum, participantId) =>
          sum +
          Number(claimsByParticipant.get(participantId).customAmountCents),
        0,
      );

      if (customTotalCents > itemCents) {
        throw new Error('Custom claim amounts exceed item price');
      }
      customClaims.forEach((participantId) => {
        claimedTotals.set(
          participantId,
          claimedTotals.get(participantId) +
            Number(claimsByParticipant.get(participantId).customAmountCents),
        );
      });

      const remainingCents = itemCents - customTotalCents;
      if (defaultClaimants.length > 0) {
        addSplit(remainingCents, defaultClaimants, claimedTotals);
      } else if (remainingCents !== 0) {
        throw new Error(
          `Item "${item.name}": custom claim amounts must cover the full item price, or leave at least one claimant unset to absorb the remainder.`,
        );
      }
    } else {
      addSplit(item.priceCents, allocationParticipantIds, unclaimedTotals);
    }
  }

  addSplit(
    taxPercent === undefined
      ? toCents(taxAmount)
      : percentToCents(subtotalCents, taxPercent),
    allocationParticipantIds,
    taxTotals,
  );
  addSplit(
    tipPercent === undefined
      ? toCents(tipAmount)
      : percentToCents(subtotalCents, tipPercent),
    allocationParticipantIds,
    tipTotals,
  );

  const toOutput = (totals) =>
    participantIds.map((participantId) => ({
      participantId,
      amountCents: totals.get(participantId),
    }));

  const claimedOutput = toOutput(claimedTotals);
  const unclaimedOutput = toOutput(unclaimedTotals);
  const taxOutput = toOutput(taxTotals);
  const tipOutput = toOutput(tipTotals);
  const finalTotals = participantIds.map((participantId, index) => ({
    participantId,
    amountCents:
      claimedOutput[index].amountCents +
      unclaimedOutput[index].amountCents +
      taxOutput[index].amountCents +
      tipOutput[index].amountCents,
  }));
  const breakdown = participantIds.map((participantId, index) => ({
    participantId,
    claimedItemsTotalCents: claimedOutput[index].amountCents,
    unclaimedShareTotalCents: unclaimedOutput[index].amountCents,
    taxShareCents: taxOutput[index].amountCents,
    tipShareCents: tipOutput[index].amountCents,
    finalTotalCents: finalTotals[index].amountCents,
  }));

  return {
    claimedTotals: claimedOutput,
    unclaimedTotals: unclaimedOutput,
    taxTotals: taxOutput,
    tipTotals: tipOutput,
    finalTotals,
    breakdown,
  };
}

module.exports = { calculateBillTotals };
