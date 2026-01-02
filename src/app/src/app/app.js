import { runPAYE } from "../modules/paye/paye.js";

export function demo() {
  const sample = runPAYE({ annualIncome: 3000000 });
  return sample;
}
