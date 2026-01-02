import { PAYE_BANDS, CONSOLIDATED_RELIEF } from "../data/constants.js";

export function calculatePAYE(annualIncome) {
  const income = Number(annualIncome);

  if (!Number.isFinite(income) || income <= 0) {
    return {
      annualIncome: income,
      relief: 0,
      taxableIncome: 0,
      tax: 0,
      breakdown: []
    };
  }

  const relief =
    CONSOLIDATED_RELIEF.fixed +
    CONSOLIDATED_RELIEF.percentage * income;

  const taxableIncome = Math.max(income - relief, 0);

  let remaining = taxableIncome;
  let tax = 0;
  const breakdown = [];

  let prevCap = 0;
  for (const band of PAYE_BANDS) {
    if (remaining <= 0) break;

    // Each band.limit here is treated as "band width" for now (scaffold).
    // We will refine to exact statutory band widths next iteration.
    const amount = band.limit === Infinity ? remaining : Math.min(remaining, band.limit);

    const bandTax = amount * band.rate;
    breakdown.push({
      bandFrom: prevCap,
      bandTo: band.limit === Infinity ? "Infinity" : prevCap + amount,
      amount,
      rate: band.rate,
      tax: bandTax
    });

    tax += bandTax;
    remaining -= amount;
    prevCap += amount;
  }

  return {
    annualIncome: income,
    relief,
    taxableIncome,
    tax,
    breakdown
  };
}
