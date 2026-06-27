# Lead Insights Dashboard

Vercel-ready Next.js dashboard built from `dashboard/Untitled spreadsheet - event2_leads_enriched.csv`.

## Run locally

```bash
npm install
npm run dev
```

The `predev` and `prebuild` hooks regenerate `src/data/insights.json` when the local CSV exists. The raw CSV contains lead contact details, so it is ignored by Git; the hosted app and API use only the aggregate generated JSON.

## API

The dashboard data is served at:

```text
/api/insights
```

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Keep the default Next.js settings. The included `vercel.json` uses `npm install` and `npm run build`.
4. When the CSV changes, run `npm run analyze` locally and commit the updated `src/data/insights.json`.
