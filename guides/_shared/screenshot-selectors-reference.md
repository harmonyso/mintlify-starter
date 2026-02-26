# Screenshot Selectors Reference

Reference for screenshot capture automation of the Harmony settings pages. All selectors and text are derived from the frontend source code.

---

## 1. User Management Page (`/settings/user-management`)

### Initial load
- **Page title (h4):** `User management`
- **Subtitle:** `Manage users and groups externally through your identity provider. The changes will be automatically reflected in the platform.`
- **Default active tab:** `Groups` (when URL has no `?tab=` or `?tab=groups`)

### Reliable selectors for "page fully loaded"
```css
/* Main content area */
h4:has-text("User management")
/* or more specific */
.font-display.text-xl (contains "User management")

/* Tab bar present */
[data-slot="tabs-list"]

/* Groups tab active (default) */
[data-slot="tabs-list"] [data-state="active"]  /* Radix tabs set data-state="active" on active trigger */
```

---

## 2. Users Tab

### To activate Users tab
- URL: `http://localhost:5173/settings/user-management?tab=users`
- Or click the link/trigger with visible text: `Users`

### DOM structure when Users tab is active
```
[data-slot="tabs"] (Tabs root)
  └── [data-slot="tabs-list"] (tab bar)
        ├── TabsTrigger value="users" → Link with text "Users"
        └── TabsTrigger value="groups" → Link with text "Groups"
  └── [data-slot="tabs-content"] value="users"
        └── div.flex.h-full.flex-col.gap-4
              ├── DataTableToolbar (search, filters, refresh)
              └── div.flex-1.overflow-auto
                    └── DataTable (scope="user-management-users")
                          └── table
                                ├── thead
                                │     └── tr
                                │           ├── th: "User" (DataTableColumnHeader)
                                │           ├── th: "Role"
                                │           └── th: "Groups"
                                └── tbody
                                      └── tr (rows - clickable)
```

### Unique text / element signals "Users tab is active and table is loaded"
| Signal | Selector / Text |
|--------|------------------|
| Tab active | `[role="tab"][data-state="active"]` with accessible name `Users` |
| Table header | `th` containing `User` (first column) |
| Data loaded | `table tbody tr` (non-skeleton rows). When loading: `tbody tr` contain `Skeleton` components |
| Scope attribute | Table may be inside a container; DataTable passes `scope="user-management-users"` to useTableNavigation |

**Recommended wait condition:**
```
h4:has-text("User management") AND
[role="tab"]:has-text("Users") with [data-state="active"] AND
table thead th:has-text("User") AND
table tbody tr (at least one row, no Skeleton)
```

**CSS selectors:**
```css
/* Users tab content visible */
[data-slot="tabs-content"][value="users"]:not([data-state="inactive"])

/* Users table loaded */
table thead th  /* columns: User, Role, Groups */
```

---

## 3. User detail (after clicking first row in Users table)

Clicking a user row navigates to `/settings/user-management/$userId`. Full page replacement (no sidebar pane).

### Structure on user detail page
- **Breadcrumb:** `User management` > `{displayName}` (user's name or email)
- **Header:** Avatar (52×52) + `{displayName}` (h1-like, `font-quicksand text-xl font-bold`) + `{email}`
- **Section heading (h2):** `Groups & Desks`
- **Content:** Cards for each group and desk (GroupDeskRow components)

### Exact heading texts
| Element | Tag | Text |
|---------|-----|------|
| Breadcrumb link | span | `User management` |
| Breadcrumb current | BreadcrumbPage | `{user display name}` |
| Main heading | span (styled as heading) | `{user display name}` |
| Section | h2 | `Groups & Desks` |

### Selectors
```css
/* Page loaded */
nav[aria-label="breadcrumb"] /* or [role="navigation"] */
h2:has-text("Groups & Desks")

/* Main content area */
div.flex.w-\[880px\].flex-col.gap-6
```

**Note:** User detail is a full-page view. There is no right-side panel; the list view is replaced.

---

## 4. Desks Page (`/settings/desks`)

### DOM structure
```
div.space-y-6
  ├── div
  │     ├── SettingsPageTitle → h4: "Desks"
  │     └── SettingsPageSubtitle (context-dependent)
  └── div.container.max-w-4xl
        ├── div.flex.justify-between
        │     ├── Input[placeholder="Search"]
        │     └── NewDeskFormDialog (if platform admin)
        └── Table
              ├── TableHeader
              │     └── TableRow
              │           ├── TableHead: "Name"
              │           └── TableHead: "Members"
              └── TableBody
                    └── TableRow (cursor-pointer, one per desk)
```

### Selectors
```css
/* Page loaded */
h4:has-text("Desks")
table thead th:has-text("Name")
table thead th:has-text("Members")

/* First desk row (clickable) */
table tbody tr.cursor-pointer
/* or */
table tbody tr:first-of-type
```

---

## 5. Desk Detail Page (`/settings/desks/$deskId`)

### Structure
- **Breadcrumb:** `Desks` > `{desk name}`
- **DeskHeader:** desk name, edit/delete
- **EmailSection:** email-to-ticket
- **h3:** `Configurations`
- **Configuration links (ConfigurationItem):**
  - Members & Teams
  - Tickets
  - Templates
  - SLAs
  - **Notifications**
  - Automation

### Notifications link
- **Text:** `Notifications`
- **Description:** `Select delivery methods and event types you'd like to receive`
- **URL:** `/settings/desks/$deskId/notifications`
- **Selector:** `a[href*="/notifications"]` or link with text `Notifications`

---

## 6. Notifications Page (`/settings/desks/$deskId/notifications`)

### Structure (DeskSettingsLayout)
- **Breadcrumb:** `Desks` > `{desk name}` > `Notifications`
- **Page title (h1):** `Notifications`
- **Description:** `Select delivery methods and event types you'd like to receive`

### Sections (DestinationsPane × 2)
1. **Ticket notifications** (SERVICE_DESK_CONFIG)
   - h2: `Ticket notifications`
   - description: `Select delivery methods and event types you'd like to receive`
2. **AI Agent notifications** (HARMONY_AI_AGENT_CONFIG)
   - h2: `AI Agent notifications`
   - description: `Select delivery methods and event types you'd like to receive about AI agent activities`

### Add destination button
- **Location:** In the header of each SettingsSection (headerAction)
- **Button text:** `Add destination`
- **Type:** Dropdown trigger (not a modal/dialog)
- **Selector:** `button:has-text("Add destination")` or `[data-slot="dropdown-menu-trigger"]`

---

## 7. Add Destination Dropdown (after clicking Add destination)

**Important:** This is a dropdown menu, not a dialog or modal.

### Structure
- **Trigger:** Button with text `Add destination`
- **Content:** `[data-slot="dropdown-menu-content"]` (DropdownMenuContent)
- **Menu items:** DropdownMenuItem
  - `Slack` (if Slack integration configured)
  - `Microsoft Teams` (if Teams integration configured)

### No h2/h3 in dropdown
The dropdown has no heading. It only has menu items with channel names.

### Selectors
```css
/* Dropdown opened */
[data-slot="dropdown-menu-content"]
/* or */
[role="menu"]

/* Menu items */
[role="menuitem"]
/* Text: "Slack" or "Microsoft Teams" */
```

---

## Summary: Unique selectors per page

| Page | Main content selector | Key heading/text |
|------|-----------------------|------------------|
| User management (list) | `[data-slot="tabs"]` | h4: `User management` |
| Users tab active | `[data-slot="tabs-content"]` + table | th: `User`, `Role`, `Groups` |
| User detail | `div.flex.w-\[880px\]` | h2: `Groups & Desks` |
| Desks list | `div.container.max-w-4xl` | h4: `Desks` |
| Desk detail | `div.max-w-4xl` | h3: `Configurations` |
| Notifications | `div.max-w-4xl` | h1: `Notifications`, h2: `Ticket notifications` |
| Add destination menu | `[data-slot="dropdown-menu-content"]` | No heading; items: Slack, Microsoft Teams |

---

## Suggested wait strategies for screenshots

1. **User management:** Wait for `h4` text `User management` + `[data-slot="tabs-list"]`
2. **Users tab:** Wait for `?tab=users` in URL + `table thead th` containing `User`
3. **User detail:** Wait for `h2` text `Groups & Desks`
4. **Desks list:** Wait for `h4` text `Desks` + `table tbody tr`
5. **Desk detail:** Wait for `h3` text `Configurations` + link text `Notifications`
6. **Notifications:** Wait for `h1` or `h2` text `Notifications` + `button` text `Add destination`
7. **Add destination open:** Wait for `[data-slot="dropdown-menu-content"]` or `[role="menu"]` visible

---

## Views Dropdown: All Desks vs Specific Desk

### All Desks (`/tickets/desk/all`)

**Component:** `AllDesksViewsDropdown`  
**Trigger text:** `All Desks > Default view` (or current view name)

**Dropdown structure:**
- `DropdownMenuContent` with `align="start"` `className="max-h-[400px] w-[320px] overflow-y-auto"`
- `DropdownMenuLabel`: "Views from all desks" (text-xs, text-muted-foreground)
- `systemViews` (Default view, Assigned to me) as `ViewItem` components
- If custom views exist: `DropdownMenuSeparator` + desk name labels + `ViewItem`s per desk

**"Save current view":** **NOT PRESENT** – The All Desks dropdown has no save option.

**Dropdown items (roles, text):**
| Element | Role | Text / Content |
|---------|------|----------------|
| Label | (label) | "Views from all desks" |
| ViewItem (Default view) | button in div | "Default view" + Star icon |
| ViewItem (Assigned to me) | button in div | "Assigned to me" + Star icon |
| Separator | (separator) | — |
| Desk labels | (label) | Desk names (e.g., "HR", "IT") |
| Custom ViewItems | button in div | View name + Star + optional actions |

---

### Specific Desk (`/tickets/desk/$deskId`)

**Component:** `TicketViewsDropdown`  
**Trigger text:** `{DeskName} > Default view` or `{DeskName} > {ViewName} (Modified)`

**Dropdown structure:**
- `DropdownMenuContent` with `align="start"` `className="w-[300px]"`
- `DropdownMenuLabel`: "Views"
- List of `ViewItem`s (one per saved view)
- `DropdownMenuSeparator`
- `DropdownMenuItem`: "Save current view" (Plus icon)

**"Save current view":** **PRESENT** – `DropdownMenuItem` with Plus icon and text "Save current view" (only when `deskId` is defined).

**Dropdown items (roles, text):**
| Element | Role | data-slot | Text / Content |
|---------|------|-----------|----------------|
| Label | - | dropdown-menu-label | "Views" |
| ViewItem | - | - | View name + Star + optional MoreHorizontal actions |
| Separator | - | dropdown-menu-separator | — |
| Save item | menuitem | dropdown-menu-item | "Save current view" (Plus icon) |

---

### data-radix-popper-content-wrapper

Radix UI positions dropdown content via a Popper. The content is rendered in a Portal; the Popper adds a wrapper div with `data-radix-popper-content-wrapper`.

**To inspect:** After opening the dropdown, run in the console:
```javascript
document.querySelector('[data-radix-popper-content-wrapper]')?.outerHTML?.substring(0, 3000)
```

**Expected parent structure (approximate):**
- `div[data-radix-popper-content-wrapper]` (Radix Popper wrapper)
  - `div[data-slot="dropdown-menu-content"]` (DropdownMenuContent)
    - `role="menu"` on Content
    - Children: Labels, Items, Separators
