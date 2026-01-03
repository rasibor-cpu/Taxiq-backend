// src/modules/paye/paye.js

import { calculatePAYE } from "../../engine/taxEngine.js";

export function runPAYE(income) {
  return calculatePAYE(income);
}
