import { calculatePAYE } from "../../engine/taxEngine.js";

export function runPAYE({ annualIncome }) {
  return calculatePAYE(annualIncome);
}
