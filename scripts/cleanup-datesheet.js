/**
 * cleanup-datesheet.js
 * Removes all exam entries with dates before today (May 7, 2026)
 */

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "../datesheet.xlsx");
const TODAY = new Date("2026-05-07");

console.log(`📅 Cleaning datesheet (removing exams before ${TODAY.toDateString()})...`);

// Read workbook
const wb = XLSX.readFile(INPUT);

wb.SheetNames.forEach((sheetName) => {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  let cleanedRows = [];
  let removedCount = 0;

  rows.forEach((row) => {
    if (!row || !row[0]) {
      cleanedRows.push(row);
      return;
    }

    // Try to parse date from column 0
    const dateStr = String(row[0]).trim().replace(/T\d{2}:\d{2}:\d{2}.*/, "");
    const d = new Date(dateStr);

    if (!isNaN(d) && d.getFullYear() > 2020) {
      // This is a date cell
      if (d < TODAY) {
        removedCount++;
        return; // Skip this date and all following rows until next date
      }
    }

    cleanedRows.push(row);
  });

  // Write cleaned data back
  const newWs = XLSX.utils.aoa_to_sheet(cleanedRows);
  wb.Sheets[sheetName] = newWs;
  console.log(`   ${sheetName}: removed ${removedCount} old date entries`);
});

XLSX.writeFile(wb, INPUT);
console.log(`✅ Cleaned! Removed exams before May 7, 2026`);
