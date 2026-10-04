# Job Application Tracker

A personal job-search tracker for applications, fit scores, follow-ups, and interview stages.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm run install:ci
npm run dev
```

The local app starts with an empty tracker. Use **Backup** in the app to export your applications, and **Import JSON** to restore them.

## Data

Personal application records are excluded from this repository. The checked-in `lib/backup.json` is an empty starter dataset. Keep exported backups out of public commits; only add personal data after confirming repository visibility.
