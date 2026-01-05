/* TaxIQ - PAYE UI v1 (phone-safe)
   File: src/app/src/app/app.js
   This version ALWAYS renders and shows on-page errors if imports fail.
*/

const APP_ID = "app";

function naira(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return "₦" + num.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

function showError(msg) {
  const el = document.getElementById("taxiq_err");
  if (!el) return;
  el.style.display = "block";
  el.textContent = String(msg);
}

function renderShell() {
  const host = document.getElementById(APP_ID);
  if (!host) return;

  host.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="font-size:14px;color:rgba(232,238,252,.85);">
        PAYE quick test (v1) — enter income and compute PAYE using the engine.
      </div>

      <div style="display:grid;grid-template-columns:1fr;gap:10px;">
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:12px;color:rgba(232,238,252,.70);">Income (₦)</span>
          <input id="taxiq_income" inputmode="decimal" placeholder="e.g., 500000"
            style="padding:12px;border-radius:12px;border:1px solid rgba(232,238,252,.14);
                   background:rgba(232,238,252,.06);color:#e8eefc;font-size:16px;outline:none;" />
          <span style="font-size:11px;color:rgba(232,238,252,.55);">
            Note: if your engine expects monthly vs annual, we’ll align labels after we confirm output.
          </span>
        </label>

        <button id="taxiq_btn"
          style="padding:12px 14px;border-radius:12px;border:1px solid rgba(232,238,252,.14);
                 background:rgba(90,167,255,.20);color:#e8eefc;font-size:15px;font-weight:600;">
          Compute PAYE
        </button>
      </div>

      <div id="taxiq_out"
        style="padding:12px;border-radius:12px;border:1px solid rgba(232,238,252,.12);
               background:rgba(232,238,252,.04);min-height:56px;">
        <div style="font-size:12px;color:rgba(232,238,252,.70);">Result will appear here.</div>
      </div>

      <div id="taxiq_err"
        style="display:none;padding:12px;border-radius:12px;border:1px solid rgba(255,90,90,.28);
               background:rgba(255,90,90,.10);color:#ffd6d6;font-size:12px;white-space:pre-wrap;">
      </div>

      <div style="font-size:11px;color:rgba(232,238,252,.55);">
        Debug: app.js loaded and rendered this screen successfully.
      </div>
    </div>
  `;
}

async function loadRunPAYE() {
  // app.js path: /src/app/src/app/app.js
  // Desired module: /src/modules/paye/paye.js
  // Relative from this file folder: ../../../modules/paye/paye.js
  const candidates = [
    "../../../modules/paye/paye.js",
    "../../../modules/paye/src/modules/paye/paye.js", // fallback if nested structure exists
    "../../../engine/payeEngine.js",                  // fallback if you want direct engine
  ];

  let lastErr = null;

  for (const path of candidates) {
    try {
      const mod = await import(path);
      // Preferred: runPAYE(income)
      if (typeof mod.runPAYE === "function") return { fn: mod.runPAYE, source: path };

      // Fallback: calculatePAYE(income)
      if (typeof mod.calculatePAYE === "function") return { fn: mod.calculatePAYE, source: path };

      // If module loads but doesn't export what we need:
      lastErr = new Error(`Loaded ${path} but did not find runPAYE/calculatePAYE exports.`);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Unable to load PAYE module from known paths.");
}

function normalizeIncome(raw) {
  // Remove commas/spaces
  const cleaned = String(raw || "").replace(/,/g, "").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function renderResult(outEl, result, sourcePath) {
  // The engine may return number or object. Handle both.
  const isNumber = typeof result === "number";
  const isObj = result && typeof result === "object";

  if (isNumber) {
    outEl.innerHTML = `
      <div style="font-size:12px;color:rgba(232,238,252,.70);">Source: <code>${sourcePath}</code></div>
      <div style="margin-top:8px;font-size:18px;font-weight:700;">PAYE: ${naira(result)}</div>
    `;
    return;
  }

  if (isObj) {
    // Try common keys; otherwise print JSON
    const paye =
      result.paye ?? result.tax ?? result.monthlyPAYE ?? result.annualPAYE ?? result.totalTax;

    outEl.innerHTML = `
      <div style="font-size:12px;color:rgba(232,238,252,.70);">Source: <code>${sourcePath}</code></div>
      <div style="margin-top:8px;font-size:18px;font-weight:700;">
        PAYE: ${Number.isFinite(Number(paye)) ? naira(paye) : "—"}
      </div>
      <details style="margin-top:10px;">
        <summary style="cursor:pointer;color:rgba(232,238,252,.75);">Details</summary>
        <pre style="white-space:pre-wrap;word-break:break-word;font-size:12px;
                    color:rgba(232,238,252,.75);margin:10px 0 0;">${JSON.stringify(result, null, 2)}</pre>
      </details>
    `;
    return;
  }

  outEl.innerHTML = `
    <div style="font-size:12px;color:rgba(232,238,252,.70);">Source: <code>${sourcePath}</code></div>
    <div style="margin-top:8px;font-size:14px;">Output:</div>
    <pre style="white-space:pre-wrap;word-break:break-word;font-size:12px;
                color:rgba(232,238,252,.75);margin:10px 0 0;">${String(result)}</pre>
  `;
}

async function main() {
  renderShell();

  const btn = document.getElementById("taxiq_btn");
  const incomeEl = document.getElementById("taxiq_income");
  const outEl = document.getElementById("taxiq_out");

  if (!btn || !incomeEl || !outEl) return;

  btn.addEventListener("click", async () => {
    document.getElementById("taxiq_err").style.display = "none";

    const income = normalizeIncome(incomeEl.value);
    if (income === null) {
      showError("Please enter a valid non-negative number for income.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Computing…";

    try {
      const { fn, source } = await loadRunPAYE();
      const result = fn(income);
      // result may be sync or promise
      const resolved = (result && typeof result.then === "function") ? await result : result;

      renderResult(outEl, resolved, source);
    } catch (e) {
      showError(
        "PAYE module load/run failed.\n\n" +
        "Most likely cause: wrong import path from app.js to the PAYE module.\n\n" +
        "Error:\n" + (e && e.stack ? e.stack : String(e))
      );
    } finally {
      btn.disabled = false;
      btn.textContent = "Compute PAYE";
    }
  });
}

main();
