// src/app/src/app/app.js
// TaxIQ – Live PAYE UI (v0.1.x) – Phone-friendly, no frameworks required

import { runPAYE } from "../../../modules/paye/paye.js";

const fmtNGN0 = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function clampNumber(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function toNumber(value) {
  const cleaned = String(value ?? "").replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function computePayeView({
  incomeBasis, // "monthly" | "annual"
  grossMonthly,
  grossAnnual,
  pensionPct,
}) {
  // We keep the model deliberately simple and transparent:
  // - Pension deduction applied as a % of gross (user-controlled)
  // - NHF/NHIS toggles will be wired later once we codify rules (basic vs gross etc.)
  const gross =
    incomeBasis === "annual" ? grossAnnual : clampNumber(grossMonthly, 0, 1e12) * 12;

  const pension = clampNumber(pensionPct, 0, 40) / 100;
  const taxableAnnual = clampNumber(gross * (1 - pension), 0, 1e12);

  // runPAYE expects an income figure (per your current engine design).
  // We treat it as ANNUAL for now, then present monthly breakdown.
  const payeAnnualRaw = runPAYE(taxableAnnual);
  const payeAnnual = Number.isFinite(payeAnnualRaw) ? payeAnnualRaw : 0;

  const payeMonthly = payeAnnual / 12;

  const grossMonthlyDerived = gross / 12;
  const netMonthly = grossMonthlyDerived - payeMonthly;
  const effectiveRate = gross > 0 ? (payeAnnual / gross) * 100 : 0;

  return {
    grossMonthly: grossMonthlyDerived,
    grossAnnual: gross,
    taxableAnnual,
    payeAnnual,
    payeMonthly,
    netMonthly,
    effectiveRate,
  };
}

function renderApp() {
  // Base layout (single-file injection into body)
  document.body.innerHTML = `
    <div class="txiq">
      <header class="txiq__header">
        <div class="txiq__brand">
          <div class="txiq__logo">TaxIQ</div>
          <div class="txiq__sub">Nigerian PAYE – Live Calculator (v0.1.x)</div>
        </div>
      </header>

      <main class="txiq__main">
        <section class="card">
          <h2 class="card__title">Inputs</h2>

          <div class="grid">
            <label class="field">
              <span class="field__label">Income basis</span>
              <select id="incomeBasis" class="field__control">
                <option value="monthly" selected>Monthly (auto annualised)</option>
                <option value="annual">Annual (direct)</option>
              </select>
            </label>

            <label class="field">
              <span class="field__label">Monthly gross (₦)</span>
              <input id="grossMonthly" class="field__control" inputmode="numeric" placeholder="e.g., 500000" />
              <span class="field__hint">Used when Income basis = Monthly</span>
            </label>

            <label class="field">
              <span class="field__label">Annual gross (₦)</span>
              <input id="grossAnnual" class="field__control" inputmode="numeric" placeholder="e.g., 6000000" />
              <span class="field__hint">Used when Income basis = Annual</span>
            </label>

            <label class="field">
              <span class="field__label">Pension deduction (%)</span>
              <input id="pensionPct" class="field__control" inputmode="numeric" value="8" />
              <span class="field__hint">Applied as a simple % of gross (v0 rule)</span>
            </label>
          </div>

          <div class="note">
            <strong>Note:</strong> NHF/NHIS and CRA nuances will be wired once we codify the rules.
            For now, this is a clean “gross → pension-adjusted taxable → PAYE” live view.
          </div>
        </section>

        <section class="card">
          <h2 class="card__title">Results</h2>

          <div class="kpis">
            <div class="kpi">
              <div class="kpi__label">PAYE (Monthly)</div>
              <div class="kpi__value" id="payeMonthly">—</div>
            </div>

            <div class="kpi">
              <div class="kpi__label">PAYE (Annual)</div>
              <div class="kpi__value" id="payeAnnual">—</div>
            </div>

            <div class="kpi">
              <div class="kpi__label">Net Pay (Monthly est.)</div>
              <div class="kpi__value" id="netMonthly">—</div>
            </div>

            <div class="kpi">
              <div class="kpi__label">Effective tax rate</div>
              <div class="kpi__value" id="effRate">—</div>
            </div>
          </div>

          <div class="details">
            <div class="row"><span>Gross (Monthly)</span><span id="grossM">—</span></div>
            <div class="row"><span>Gross (Annual)</span><span id="grossA">—</span></div>
            <div class="row"><span>Taxable Income (Annual)</span><span id="taxableA">—</span></div>
          </div>
        </section>
      </main>

      <footer class="txiq__footer">
        <span>TaxIQ • PAYE module wired to engine via <code>runPAYE(income)</code></span>
      </footer>
    </div>
  `;

  // Styling (kept inside JS to avoid extra files)
  const style = document.createElement("style");
  style.textContent = `
    :root { --bg:#0b1220; --card:#111a2e; --text:#e7ecff; --muted:#aab4d6; --line:#243255; --accent:#6aa3ff; }
    * { box-sizing:border-box; }
    body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:linear-gradient(180deg,#070c16,#0b1220); color:var(--text); }
    .txiq { min-height:100vh; display:flex; flex-direction:column; }
    .txiq__header { padding:16px 16px 10px; border-bottom:1px solid var(--line); }
    .txiq__logo { font-weight:800; letter-spacing:.5px; font-size:20px; color:var(--accent); }
    .txiq__sub { margin-top:4px; color:var(--muted); font-size:12px; }
    .txiq__main { padding:14px 16px 20px; display:grid; gap:14px; max-width:980px; width:100%; margin:0 auto; }
    .card { background:rgba(17,26,46,.92); border:1px solid var(--line); border-radius:14px; padding:14px; box-shadow:0 6px 20px rgba(0,0,0,.25); }
    .card__title { margin:0 0 10px; font-size:14px; color:#dfe7ff; }
    .grid { display:grid; gap:10px; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    .field { display:flex; flex-direction:column; gap:6px; }
    .field__label { font-size:12px; color:var(--muted); }
    .field__control { padding:12px 12px; border-radius:12px; border:1px solid var(--line); background:#0b1326; color:var(--text); outline:none; }
    .field__control:focus { border-color: rgba(106,163,255,.75); box-shadow: 0 0 0 3px rgba(106,163,255,.15); }
    .field__hint { font-size:11px; color:#93a0c9; }
    .note { margin-top:10px; padding:10px; border-radius:12px; border:1px dashed rgba(106,163,255,.4); color:#cbd6ff; font-size:12px; background:rgba(106,163,255,.06); }
    .kpis { display:grid; gap:10px; grid-template-columns: repeat(2, 1fr); }
    @media (min-width: 720px) { .kpis { grid-template-columns: repeat(4, 1fr); } }
    .kpi { padding:10px; border-radius:12px; border:1px solid var(--line); background:rgba(10,16,30,.65); }
    .kpi__label { font-size:11px; color:var(--muted); }
    .kpi__value { margin-top:6px; font-size:16px; font-weight:700; color:#ffffff; }
    .details { margin-top:12px; border-top:1px solid var(--line); padding-top:10px; display:grid; gap:8px; }
    .row { display:flex; justify-content:space-between; gap:12px; font-size:12px; color:#d7ddff; }
    .row span:first-child { color:var(--muted); }
    .txiq__footer { padding:12px 16px; border-top:1px solid var(--line); color:var(--muted); font-size:11px; text-align:center; }
    code { color:#cfe0ff; }
  `;
  document.head.appendChild(style);

  const els = {
    incomeBasis: document.getElementById("incomeBasis"),
    grossMonthly: document.getElementById("grossMonthly"),
    grossAnnual: document.getElementById("grossAnnual"),
    pensionPct: document.getElementById("pensionPct"),

    payeMonthly: document.getElementById("payeMonthly"),
    payeAnnual: document.getElementById("payeAnnual"),
    netMonthly: document.getElementById("netMonthly"),
    effRate: document.getElementById("effRate"),

    grossM: document.getElementById("grossM"),
    grossA: document.getElementById("grossA"),
    taxableA: document.getElementById("taxableA"),
  };

  // sensible defaults so it renders immediately
  els.grossMonthly.value = "500000";
  els.grossAnnual.value = "6000000";

  function update() {
    const incomeBasis = els.incomeBasis.value;
    const grossMonthly = toNumber(els.grossMonthly.value);
    const grossAnnual = toNumber(els.grossAnnual.value);
    const pensionPct = toNumber(els.pensionPct.value);

    let view;
    try {
      view = computePayeView({ incomeBasis, grossMonthly, grossAnnual, pensionPct });
    } catch (e) {
      // If anything fails, keep UI stable and show blanks
      view = {
        grossMonthly: 0,
        grossAnnual: 0,
        taxableAnnual: 0,
        payeAnnual: 0,
        payeMonthly: 0,
        netMonthly: 0,
        effectiveRate: 0,
      };
    }

    els.payeMonthly.textContent = fmtNGN0.format(view.payeMonthly);
    els.payeAnnual.textContent = fmtNGN0.format(view.payeAnnual);
    els.netMonthly.textContent = fmtNGN0.format(view.netMonthly);
    els.effRate.textContent = `${view.effectiveRate.toFixed(2)}%`;

    els.grossM.textContent = fmtNGN0.format(view.grossMonthly);
    els.grossA.textContent = fmtNGN0.format(view.grossAnnual);
    els.taxableA.textContent = fmtNGN0.format(view.taxableAnnual);
  }

  ["change", "input"].forEach((evt) => {
    els.incomeBasis.addEventListener(evt, update);
    els.grossMonthly.addEventListener(evt, update);
    els.grossAnnual.addEventListener(evt, update);
    els.pensionPct.addEventListener(evt, update);
  });

  update();
}

// Boot
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderApp);
} else {
  renderApp();
}
