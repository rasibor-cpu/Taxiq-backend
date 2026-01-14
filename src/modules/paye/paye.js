// src/modules/paye/paye.js

import { calculatePAYE } from "../../engine/taxEngine.js";

/**
 * Frequency multipliers used to annualize earnings/allowances.
 * Keep this centralized so UI + backend stay consistent.
 */
const FREQ_MULTIPLIER = {
  monthly: 12,
  quarter: 4,
  quarterly: 4,
  annual: 1,
  annually: 1,
  yearly: 1,
  oneoff: 1,
  "one-off": 1,
  once: 1,
};

/**
 * Convert an amount with a frequency into an annual amount.
 */
function annualize(amount, frequency = "annual") {
  const freqKey = String(frequency || "annual").toLowerCase().trim();
  const mult = FREQ_MULTIPLIER[freqKey];

  if (!mult) {
    throw new Error(
      `Unsupported frequency "${frequency}". Use monthly, quarterly, annual, or one-off.`
    );
  }

  const n = Number(amount);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid amount "${amount}" supplied for annualization.`);
  }

  return n * mult;
}

/**
 * Compute annual gross earnings from base pay + allowances (frequency-aware).
 * Allowances support taxable toggle (default: taxable).
 * Deductions (optional) are subtracted before PAYE computation.
 */
function computeAnnualIncome({ basePay, baseFrequency, allowances, deductions }) {
  const baseAnnual = annualize(basePay ?? 0, baseFrequency ?? "annual");

  const allowancesAnnual = (allowances ?? []).reduce((sum, a) => {
    if (!a) return sum;
    const taxable = a.taxable === undefined ? true : Boolean(a.taxable);
    if (!taxable) return sum;
    return sum + annualize(a.amount ?? 0, a.frequency ?? "monthly");
  }, 0);

  const deductionsAnnual = (deductions ?? []).reduce((sum, d) => {
    if (!d) return sum;
    // deductions are assumed deductible amounts; treat as annualized
    return sum + annualize(d.amount ?? 0, d.frequency ?? "monthly");
  }, 0);

  const annualIncome = baseAnnual + allowancesAnnual - deductionsAnnual;

  return {
    baseAnnual,
    allowancesAnnual,
    deductionsAnnual,
    annualIncome,
  };
}

/**
 * Backward compatible:
 * - runPAYE(5000000)  -> behaves exactly as before (income treated as annual)
 *
 * New supported payload:
 * runPAYE({
 *   basePay: 400000,                 // number
 *   baseFrequency: "monthly",        // monthly | quarterly | annual | one-off
 *   allowances: [
 *     { name:"Housing", amount:150000, frequency:"monthly", taxable:true },
 *     { name:"Transport", amount:50000, frequency:"monthly" }, // taxable defaults to true
 *     { name:"Reimbursed Expense", amount:200000, frequency:"annual", taxable:false }
 *   ],
 *   deductions: [
 *     { name:"Pension", amount:40000, frequency:"monthly" }
 *   ]
 * })
 */
export function runPAYE(input) {
  // Backward compatibility: if a number is passed, do old behavior
  if (typeof input === "number") {
    return calculatePAYE(input);
  }

  // Also allow numeric strings defensively
  if (typeof input === "string" && input.trim() !== "" && Number.isFinite(Number(input))) {
    return calculatePAYE(Number(input));
  }

  // New behavior: structured payload
  if (!input || typeof input !== "object") {
    throw new Error(
      "runPAYE expects either a number (annual income) or an object payload { basePay, baseFrequency, allowances[], deductions[] }."
    );
  }

  const breakdown = computeAnnualIncome(input);

  // IMPORTANT: we pass annualIncome into the engine so PAYE remains single source of truth
  const payeResult = calculatePAYE(breakdown.annualIncome);

  // Return both: engine result + transparent breakdown for UI
  return {
    ...payeResult,
    breakdown,
  };
}
