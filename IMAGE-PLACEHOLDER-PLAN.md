# Image Placeholder Plan

This document lists strategic locations for screenshots in each guide and documents the **UI reference format** to help authors locate the relevant frontend components when capturing images.

## Placeholder Format

```md
{/* IMAGE: Caption → /images/guides/<slug>/filename.png | UI: <component-path>#<widget-or-element-id> | Route: /path */}
```

**Components:**
- **Caption** — Description of what the screenshot should show (used as alt text when replaced with markdown image)
- **Path** — Output path for the image file
- **UI** — Frontend component location; use `#` to reference a specific widget ID or element
- **Route** — App route where the UI is visible (where to navigate to capture)

### Common UI References

| UI Type | Format | Example |
|---------|--------|---------|
| **Dashboard widgets** | `frontend-app/.../widgets/widgets.ts#widget-id` | `widgets.ts#asset-breakdown-by-compliance` |
| **Settings page** | `frontend-app/.../components/.../component.tsx` | `integrations-pane.tsx` |
| **Dialog/modal** | `frontend-app/.../component-dialog.tsx` | `new-desk-form-dialog.tsx` |
| **Route page** | `frontend-app/src/routes/...` | Route path indicates the page |

### Key Frontend Paths

| Area | Component / File | Route |
|------|------------------|-------|
| Dashboard widgets | `frontend-app/src/features/dashboard/components/widgets/widgets.ts` | `/dashboard` |
| Integrations list | `frontend-app/src/features/settings/components/integrations/integrations-pane.tsx` | `/settings/integrations` |
| Integration card/modal | `integration-card.tsx`, `integration-config-modal.tsx` | `/settings/integrations` |
| Create desk | `frontend-app/src/features/settings/components/desks/new-desk-form-dialog.tsx`, `desk-template-selector.tsx` | `/settings/desks` |
| Delete desk | `frontend-app/src/features/settings/components/desks/delete-desk-dialog.tsx` | `/settings/desks` |
| Desk overview tabs | `frontend-app/src/features/settings` (desk detail route) | `/settings/desks/$deskId` |
| Tickets table | `frontend-app/src/routes/tickets/desk.$deskId.tsx`, `desk.all.tsx` | `/tickets/desk/$deskId` or `/tickets/desk/all` |
| Create ticket | `frontend-app/src/components/common/forms/create-ticket-dialog.tsx` | `/tickets/desk/$deskId` |

---

## Guide-by-Guide Placeholders

### analyzing-asset-and-automation-metrics
All placeholders include UI refs. Widget IDs: `asset-breakdown-by-compliance`, `asset-breakdown-by-vendor`, `asset-breakdown-by-model-family`, `asset-breakdown-by-status`, `asset-breakdown-by-age`, `software-breakdown`, `ai-resolved-vs-escalated`, `agent-ended-by-status`, `workflow-ended-by-status`.

### analyzing-service-desk-metrics
Widget IDs: `total-tickets`, `open-tickets-now`, `unassigned-tickets-now`, `sla-breached-now`, `sla-compliance`, `ticket-breakdown`.

---

## Image Creation Notes

1. **Navigate** — Use the Route to reach the correct page in the app.
2. **Locate** — Use the UI path and widget/element ID to find the component in the codebase.
3. **Capture** — Screenshot the visible region; crop to the relevant widget/section.
4. **Format** — PNG, ~1200px width; optimize for web.
5. **Accessibility** — Caption serves as alt text when converted to markdown image.
