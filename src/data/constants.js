// src/data/constants.js

export const CONSOLIDATED_RELIEF = {
  percentage: 0.01, // 1% of gross income
  minimum: 200000   // ₦200,000 minimum relief
};

export const PAYE_BANDS = [
  { limit: 300000, rate: 0.07 },
  { limit: 300000, rate: 0.11 },
  { limit: 500000, rate: 0.15 },
  { limit: 500000, rate: 0.19 },
  { limit: 1600000, rate: 0.21 },
  { limit: Infinity, rate: 0.24 }
];
