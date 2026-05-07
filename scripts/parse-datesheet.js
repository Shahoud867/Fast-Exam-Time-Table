/**
 * parse-datesheet.js
 * Runs automatically on every Vercel deployment.
 * Reads datesheet.xlsx from the project root → writes public/exams.json
 *
 * Next semester: just replace datesheet.xlsx and push. That's it.
 */

const XLSX = require("xlsx");
const fs   = require("fs");
const path = require("path");

// ─── CONFIG ────────────────────────────────────────────────────────────────
const INPUT  = path.join(__dirname, "../datesheet.xlsx");
const OUTPUT = path.join(__dirname, "../public/exams.json");

// Time slot columns (0-based index in the row array → display label)
// New schedule: 3 time slots per day
const TIME_COLS = {
  1: "9:00 AM - 12:00 PM",
  3: "1:00 PM - 4:00 PM",
  5: "5:00 PM - 8:00 PM",
};

// All sheets use the same structure now
const TIME_COLS_SHORT = TIME_COLS;

// Rows to skip
const SKIP = /jumma|seating plan|days &|issued:|detail|manager|abdul|^\s*[\.\-]\s*$|\d+:\d+\s*to\s*\d+/i;

// ─── PARSER ────────────────────────────────────────────────────────────────
function parseWorkbook(wb) {
  const exams = [];

  wb.SheetNames.forEach((sheetName) => {
    const ws   = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

    // Detect if this sheet uses the short column layout (≤6 time slots)
    const headerRow = rows.find((r) => r && r[1] && String(r[1]).includes("9:00"));
    const isShort   = headerRow && headerRow.filter(Boolean).length <= 7;
    const tCols     = isShort ? TIME_COLS_SHORT : TIME_COLS;

    let currentDate = null;

    rows.forEach((row) => {
      if (!row) return;

      // Column 0 holds the date for each exam day
      const col0 = row[0];
      if (col0) {
        const d = tryParseDate(String(col0));
        if (d) currentDate = d;
      }

      if (!currentDate) return;

      Object.entries(tCols).forEach(([colStr, timeLabel]) => {
        const ci   = parseInt(colStr);
        const cell = row[ci];
        if (!cell || typeof cell !== "string" || !cell.trim()) return;

        const text = cell.trim();
        if (SKIP.test(text)) return;

        const parsed = parseCell(text, currentDate, timeLabel, sheetName);
        if (parsed) exams.push(parsed);
      });
    });
  });

  // Deduplicate on code + date + time + sorted programs
  const seen = new Set();
  return exams
    .filter((e) => {
      const key = `${e.code}|${e.date}|${e.time}|${[...e.programs].sort().join(",")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) =>
      a.date !== b.date ? a.date.localeCompare(b.date) : timeToMins(a.time) - timeToMins(b.time)
    );
}

function tryParseDate(s) {
  s = s.trim().replace(/T\d{2}:\d{2}:\d{2}.*/, "");
  const d = new Date(s);
  if (!isNaN(d) && d.getFullYear() > 2020) return d.toISOString().slice(0, 10);
  return null;
}

function parseCell(text, dateStr, timeLabel, sheetName) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const first = lines[0];

  // Extract course code + name from first line
  const cm = first.match(/^([A-Z]{2,4}\s?\d{3,4}[A-Za-z0-9]*)\s+(.*)/);
  let code, name;
  if (cm) {
    code = cm[1].replace(/\s+/g, "");
    name = cm[2].trim();
  } else {
    const cm2 = first.match(/([A-Z]{2,4}\d{3,4}[A-Za-z0-9]*)/);
    code = cm2 ? cm2[1] : "";
    name = first.replace(/^[A-Z]{2,4}\d{3,4}[A-Za-z0-9]*\s*/, "").trim() || first;
  }

  // Must have a code to be a valid exam entry
  if (!code) return null;

  // Clean leading dashes from name
  name = name.replace(/^[\-\s]+/, "").trim();

  // Skip header rows that slipped through
  if (/\d+:\d+\s*to\s*\d+/i.test(name)) return null;

  // Batch year — take the last 4-digit year found in the cell
  const years = text.match(/\b(202\d)\b/g);
  const batch  = years ? years[years.length - 1] : null;

  // Programs — BS(XX) patterns + known acronyms
  const bsProgs  = [...text.matchAll(/BS\(([A-Z]+)\)/g)].map((m) => m[1]);
  const acronyms = (text.match(/\b(BBA|BCE|BEE|BAF|BFT|PMG|MAI|MDS|MCS|MCY|MSE|MEE|PEE|MSBA|MB)\b/g) || []);
  const programs  = [...new Set([...bsProgs, ...acronyms])];

  return { code, name, date: dateStr, time: timeLabel, batch, programs, sheet: sheetName };
}

function timeToMins(t) {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1]);
  const mn = parseInt(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + mn;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
console.log("📊 Parsing datesheet:", INPUT);

if (!fs.existsSync(INPUT)) {
  console.error("❌ datesheet.xlsx not found in project root!");
  process.exit(1);
}

const wb    = XLSX.readFile(INPUT, { cellDates: true, raw: false });
const exams = parseWorkbook(wb);

// Ensure output directory exists
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(exams));

const batches  = [...new Set(exams.map((e) => e.batch).filter(Boolean))].sort().reverse();
const programs = [...new Set(exams.flatMap((e) => e.programs))].filter(Boolean).sort();

console.log(`✅ Parsed ${exams.length} exams`);
console.log(`   Batches:  ${batches.join(", ")}`);
console.log(`   Programs: ${programs.join(", ")}`);
console.log(`   Output:   ${OUTPUT}`);
