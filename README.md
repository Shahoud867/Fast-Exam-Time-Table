# FAST ISB Exam Portal

A clean, fast exam schedule portal for FAST-NUCES Islamabad.  
Supports FSC (CS/AI/SE/DS/CY), FSM (BBA/AF/FT/BA), and EE sheets.

---

## How to deploy (first time)

1. **Create a GitHub repo** and push this entire folder into it
2. **Go to [vercel.com](https://vercel.com)** → New Project → Import your repo
3. Vercel auto-detects `vercel.json` and runs the build
4. Your site is live ✅

---

## Next semester — one step only

1. Delete `datesheet.xlsx`
2. Drop in the new `datesheet.xlsx` (same filename)
3. `git add . && git commit -m "New semester" && git push`
4. Vercel redeploys automatically → site updates in ~30 seconds ✅

**No code changes. Ever.**

---

## Project structure

```
fast-exam-portal/
├── datesheet.xlsx          ← ONLY FILE YOU EVER REPLACE
├── vercel.json             ← tells Vercel how to build
├── package.json            ← dependencies (just xlsx)
├── scripts/
│   └── parse-datesheet.js  ← runs at build time, never touch
└── public/
    ├── index.html          ← the portal, never touch
    └── exams.json          ← auto-generated on every deploy
```

---

## Local development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## Features

- Batch + program selector (auto-built from your datesheet)
- Live countdown to next exam
- Urgency indicators (red < 3 days, amber < 7 days)
- List view, Calendar view, Load chart
- ⚡ Panic Mode — next 72 hours only
- Search by course name or code
- Export to .ics (Google/Apple/Outlook Calendar) and CSV
- Browser notifications (2 days before each exam)
- Shareable links (`?batch=2024&prog=CS`)
- Remembers your last selection
- Works for FSC, FSM, and EE sheets automatically
