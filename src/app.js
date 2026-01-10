import { calcPAYE } from "./paye.js";

const fmt = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const el = (id) => document.getElementById(id);

function renderRows(rows) {
  const tbody = el("out");
  tbody.innerHTML = rows
    .map((r) => `<tr><td>${r.k}</td><td style="text-align:right">${r.v}</td></tr>`)
    .join("");
}

function calculate() {
  const freq = el("freq").value;
  const grossInput = Number(el("gross").value || 0);
  const annualGross = freq === "monthly" ? grossInput * 12 : grossInput;

  const pensionPct = Number(el("pensionPct").value || 0) / 100;
  const nhfPct = Number(el("nhfPct").value || 0) / 100;

  const pension = annualGross * pensionPct;
  const nhf = annualGross * nhfPct;

  const otherAllowable = Number(el("otherDed").value || 0);
  const useCRA = el("reliefMode").value === "standard";

  const r = calcPAYE({ annualGross, pension, nhf, otherAllowable, useCRA });

  el("headline").textContent = `Estimated PAYE: ${fmt(r.monthlyTax)} / month  (${fmt(r.annualTax)} / year)`;

  renderRows([
    { k: "Annual Gross", v: fmt(r.annualGross) },
    { k: "CRA", v: fmt(r.CRA) },
    { k: "Pension (annual)", v: fmt(r.pension) },
    { k: "NHF (annual)", v: fmt(r.nhf) },
    { k: "Other allowable deductions", v: fmt(r.otherAllowable) },
    { k: "Taxable Income", v: fmt(r.taxableIncome) },
    { k: "Annual PAYE", v: fmt(r.annualTax) + (r.usedMinimumTax ? " (min tax applied)" : "") },
    { k: "Monthly PAYE", v: fmt(r.monthlyTax) },
  ]);

  el("status").textContent = "OK";
}

el("calcBtn").addEventListener("click", calculate);
el("status").textContent = "Ready. Enter gross pay and click Calculate.";

