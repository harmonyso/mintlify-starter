# Mintlify Docs Scripts

## Dashboard Screenshots

Captures screenshots for:
- `guides/analyzing-asset-and-automation-metrics.mdx`
- `guides/analyzing-service-desk-metrics.mdx`
- `guides/building-and-managing-workflows.mdx`

Skips existing files. Dashboard widgets located by Card title; workflow pages by route.

### Prerequisites

1. **Harmony frontend** at http://localhost:5173 (default—for all 8 widgets). Use `BASE_URL=https://demo.harmony.io` for demo (4 widgets until deployed)
2. **Playwright browsers** installed (one-time): `pnpm exec playwright install chromium`

### Persistent profile (login once)

The script uses a persistent Chrome profile (`.playwright-dashboard-profile/`) so you only log in once:

```bash
pnpm run screenshots:dashboard:login   # First time: opens browser, log in, close when done
pnpm run screenshots:dashboard         # Subsequent runs: reuses saved session
```

### Run

```bash
pnpm run screenshots:dashboard
```

Or full setup + run (installs Chromium if needed):

```bash
pnpm run screenshots:dashboard:run
```

### Output

Screenshots are saved to `guides/analyzing-asset-and-automation-metrics/screenshots/`:

- `asset-compliance-widget.png`
- `asset-distribution-widgets.png` (By Vendor or By Model Family)
- `asset-status-widget.png`
- `asset-age-chart.png`
- `software-status-chart.png`
- `ai-vs-human-resolution.png`
- `agent-runs-status.png`
- `workflow-runs-status.png`

### Widgets on Default Dashboard

**Asset & automation:** All 8 widgets on default dashboard (localhost + updated layout). **Service desk:** 6 of 7 (overview region, opened-vs-resolved, response-vs-resolution, sla-compliance, breakdown-status, breakdown-priority). User Satisfaction is optional—add from Widget Library.
