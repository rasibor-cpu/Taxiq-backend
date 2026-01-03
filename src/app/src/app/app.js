import { calculatePAYE } from "../engine/taxEngine.js";

export function demo() {
  const annualIncome = 3_000_000;
  return calculatePAYE(annualIncome);
}
