/* =========================================================================
   Hazel Grove Beer Menu — shared data loader
   -------------------------------------------------------------------------
   HOW TO CONNECT YOUR GOOGLE SHEET
   1. Make a Google Sheet with these column headers in row 1 (any order):
        Category | Name | Style | ABV | Description | Price | On Tap
      - "On Tap": Y / N (leave blank = Y). Rows marked N are hidden.
      - Categories show in the order they first appear in the sheet.
   2. In the sheet: Share > General access > "Anyone with the link" > Viewer.
   3. Paste the sheet's ID (the long string between /d/ and /edit in the
      sheet's URL) into SHEET_ID below. Set SHEET_TAB to the tab name.
   You can also override without editing this file by adding
   ?sheet=<SHEET_ID>&tab=<TAB NAME> to the page URL.
   ========================================================================= */

const MENU_CONFIG = {
  SHEET_ID: "",          // e.g. "1AbCdEfGh...xyz"
  SHEET_TAB: "Menu",     // the tab (worksheet) name
  REFRESH_MINUTES: 2,    // taproom screen re-checks the sheet this often
};

/* Shown when no sheet is connected (or the sheet can't be reached). */
const SAMPLE_MENU_CSV = `Category,Name,Style,ABV,Description,Price,On Tap
Seasonals & Sours,Latte O'Lantern,Vanilla Latte Pumpkin Porter,7.7%,,,Y
Seasonals & Sours,Monogahela Monster,Imperial Stout w/ Hazelnuts & Cocoa Nibs,10.4%,,,Y
IPAs,Pittsburgh Weather,Hazy IPA,6.2%,,,Y
IPAs,Freeside,WCIPA w/ Elani & El Dorado,6.2%,,,Y
IPAs,Worksession,Hazy IPA,5.2%,,,Y
IPAs,Flip Flop,West Coast IPA,4.8%,,,Y
Belgians & Dark(ish) Beers,Barrel Aged Panda's Choice,Belgian Tripel,9%,,,Y
Belgians & Dark(ish) Beers,Panda's Choice,Belgian Tripel,9%,,,Y
English Styles,Monogahela Mild,English Pale Mild,3.8%,Available in cans,,Y
English Styles,Forbes Road,English Golden,4.4%,Available in cans,,Y
Lagers & Light Ales,Festyn,Czech Lager,5.1%,,,Y
Lagers & Light Ales,Red Herring Rye,Toasted Caraway & Rye Lager,5.2%,,,Y
Lagers & Light Ales,Plaid Bull,American Light Lager,4.3%,,,Y
Lagers & Light Ales,Scintilla,Cream Ale,4.3%,Available in cans,,Y`;

/* ---- CSV parsing (handles quoted fields, commas and newlines in quotes) ---- */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ""));
}

/* Turn CSV text into [{ name, beers: [...] }] grouped by category. */
function csvToMenu(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const col = (...names) => header.findIndex(h => names.includes(h));
  const idx = {
    category: col("category", "section", "group"),
    name: col("name", "beer", "beername"),
    style: col("style", "type"),
    abv: col("abv", "alcohol"),
    desc: col("description", "desc", "notes"),
    price: col("price", "cost"),
    onTap: col("ontap", "active", "show", "available"),
  };
  const get = (r, k) => (idx[k] >= 0 && r[idx[k]] != null ? r[idx[k]].trim() : "");
  const groups = [];
  const byName = {};
  for (const r of rows.slice(1)) {
    const name = get(r, "name");
    if (!name) continue;
    const tap = get(r, "onTap").toLowerCase();
    if (["n", "no", "false", "0", "off"].includes(tap)) continue;
    const cat = get(r, "category") || "On Tap";
    if (!byName[cat]) { byName[cat] = { name: cat, beers: [] }; groups.push(byName[cat]); }
    let abv = get(r, "abv");
    if (abv && !abv.includes("%")) {
      const n = parseFloat(abv);
      // Sheets may export a %-formatted cell as 0.062
      abv = isNaN(n) ? abv : (n < 1 ? +(n * 100).toFixed(1) : n) + "%";
    }
    let price = get(r, "price");
    if (price && /^\d/.test(price)) price = "$" + price;
    byName[cat].beers.push({
      name, style: get(r, "style"), abv, description: get(r, "desc"), price,
    });
  }
  return groups;
}

function sheetSettings() {
  const p = new URLSearchParams(location.search);
  return {
    id: p.get("sheet") || MENU_CONFIG.SHEET_ID,
    tab: p.get("tab") || MENU_CONFIG.SHEET_TAB,
  };
}

/* Returns { groups, source: "sheet" | "sample", error? } */
async function loadMenu() {
  const { id, tab } = sheetSettings();
  if (!id) return { groups: csvToMenu(SAMPLE_MENU_CSV), source: "sample" };
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}&_=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    if (text.trim().startsWith("<")) throw new Error("Sheet isn't shared publicly (Anyone with the link → Viewer)");
    const groups = csvToMenu(text);
    // Keep last good copy so the screen survives a Wi-Fi blip
    try { localStorage.setItem("hgb-menu-cache", text); } catch (e) {}
    return { groups, source: "sheet" };
  } catch (err) {
    let cached = null;
    try { cached = localStorage.getItem("hgb-menu-cache"); } catch (e) {}
    if (cached) return { groups: csvToMenu(cached), source: "cache", error: err.message };
    return { groups: csvToMenu(SAMPLE_MENU_CSV), source: "sample", error: err.message };
  }
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Shrink a container's font-size until it fits inside its box. */
function fitToBox(el, box, { max = 100, min = 30 } = {}) {
  let lo = min, hi = max, best = min;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    el.style.setProperty("--scale", mid / 100);
    const fits = el.scrollHeight <= box.clientHeight + 1 && el.scrollWidth <= box.clientWidth + 1;
    if (fits) { best = mid; lo = mid; } else hi = mid;
  }
  el.style.setProperty("--scale", best / 100);
}
