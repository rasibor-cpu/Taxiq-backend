// src/engine/taxEngine.js

import { PAYE_BANDS, CONSOLIDATED_RELIEF } from "../data/constants.js";

export function calculatePAYE(annualIncome) {
  // --- Consolidated Relief ---
  const reliefByPercent = Math.round(
    annualIncome * CONSOLIDATED_RELIEF.percentage
  );

  const relief = Math.max(reliefByPercent, CONSOLIDATED_RELIEF.minimum);
  const taxableIncome = Math.max(0, annualIncome - relief);

  let remaining = taxableIncome;
  let totalTax = 0;
  let bandFrom = 0;

  const breakdown = [];

  for (const band of PAYE_BANDS) {
    if (remaining <= 0) break;

    const bandAmount = Math.min(remaining, band.limit);
    const bandTax = Math.round(bandAmount * band.rate);

    breakdown.push({
      bandFrom,
      bandTo: band.limit === Infinity ? null : bandFrom + bandAmount,
      amount: bandAmount,
      rate: band.rate,
      tax: bandTax
    });

    totalTax += bandTax;
    remaining -= bandAmount;
    bandFrom += bandAmount;
  }

  return {
    annualIncome,
    relief,
    taxableIncome,
    tax: totalTax,
    breakdown
  };
}
