/**
 * Fallback narration scripts — one sentence per target, per guide.
 * Bedrock auto-generates better copy from the MDX at runtime; these are used
 * only when Bedrock is unavailable.
 *
 * Rule: segment count MUST equal guide.mjs targets.length for that guide.
 */
export const FALLBACK_NARRATION = {
  "managing-knowledge-base": [
    "The Knowledge Base stores articles that AI agents use. Click Add source to upload PDFs or connect Confluence, Notion, Freshservice, or SharePoint.",
    "For third-party sources, a selection dialog opens with a tree view. Browse spaces and pages, select items, and click Save and sync.",
    "The table shows sync status per article: Completed, Pending, or Failed. Use the status filter. Hover over Failed to see the reason.",
    "Permissions come from the source system. Authorized groups and users appear as badges. Fix permissions in the source.",
    "To delete articles, select them with checkboxes and click Delete. Confirm in the dialog.",
  ],
  "managing-asset-views-and-details": [
    "Switch to Warehouse view to see assets aggregated by model, vendor, and type.",
    "Use quick filters for Unassigned assets, EOL items, MacOS, Windows, or Phones and Tablets.",
    "Click an asset row to open its detail page with Overview, Specifications, and related software.",
    "Change status to Retired to record asset retirement.",
    "Open the Activity log to see asset history.",
  ],
  "managing-people": [
    "The People directory lists all employees in your organization. Use the toolbar to search, filter by status or department, and sort columns.",
    "Click any employee row to open their profile, showing work details, contact info, assigned assets, software, and related tickets.",
  ],
  "analyzing-service-desk-metrics": [
    "The Service Desk dashboard shows ticket volume, response times, and resolution metrics across all your desks.",
    "The Tickets by Status widget breaks down open, in-progress, pending, and resolved tickets at a glance.",
    "Average Response Time and Average Resolution Time measure how quickly your team handles requests.",
    "SLA Compliance shows what percentage of tickets met their response and resolution targets.",
    "The Tickets by Source chart shows where tickets originate — Slack, Teams, email, or the portal.",
    "Tickets Resolved by Employee ranks agents by resolution count, helping identify top performers.",
    "Use the date range selector to compare metrics across different time periods.",
  ],
  "configuring-ai-agents": [
    "Open an agent to configure its schedule — set the frequency, day, time, and timezone for automatic runs.",
    "Configure approval requirements by choosing a strategy, adding approvers by role or employee, and setting timeout and reminder intervals.",
    "The Provisioning tab shows integration-specific setup, such as which Okta instance or application the agent targets.",
    "Toggle the Enabled switch in the agent header to activate or pause the agent without losing its configuration.",
  ],
  "configuring-asset-management": [
    "Asset Management settings let you define asset categories, custom fields, and lifecycle thresholds for your inventory.",
    "Set end-of-life thresholds per asset type to automatically flag devices approaching retirement age.",
    "Configure low stock alerts so you receive notifications when available inventory drops below your defined threshold.",
    "Custom fields add organization-specific data to asset records, such as purchase order or cost center.",
  ],
  "configuring-automation-and-sla": [
    "Desk Automation configures auto-assignment, status transitions, auto-close behavior, and satisfaction surveys.",
    "SLA policies set response and resolution time targets per priority level — Urgent, High, Medium, and Low.",
    "Working hours determine when SLA timers run. Configure custom schedules per desk or team, and add holiday calendars.",
  ],
  "configuring-integration-sync-and-credentials": [
    "Each connected integration shows its sync status and last sync time. Use Sync now to trigger an immediate refresh.",
    "Credential-based integrations store API keys and tokens securely. Update credentials here when they rotate.",
    "Sync settings let you control which data is imported — users, groups, devices, or applications — from each integration.",
  ],
  "connecting-and-managing-integrations": [
    "The Integrations page lists all available connectors grouped by category. Search or filter to find the integration you need.",
    "Click Connect to start the OAuth flow. A popup opens the provider's authorization page — approve the permissions to complete the connection.",
    "Once connected, the integration card shows a green Connected badge. Use the settings panel to configure sync options and credentials.",
  ],
  "creating-and-managing-custom-dashboards": [
    "Create a custom dashboard by clicking New dashboard. Give it a name, then add widgets from the library.",
    "Use Edit mode to rearrange widgets by dragging, resize them to fit your layout, then click Save and Exit to persist your changes.",
  ],
  "getting-started-with-harmony-dashboard": [
    "The Harmony Dashboard gives you a unified view of IT operations — assets, software, service desk, and automation in one place.",
    "The sidebar provides quick access to every section. Use the command palette with Command K to navigate or search from anywhere.",
    "The system dashboard shows key metrics out of the box. Add or rearrange widgets to focus on what matters most to your team.",
  ],
  "managing-asset-organization-and-importing": [
    "Use the Import assets button to upload a CSV file and bulk-create asset records in Harmony.",
    "Map CSV columns to asset fields during import. Required fields are Name and Type; all others are optional.",
    "Asset categories and custom fields let you structure your inventory to match your organization's needs.",
    "After import, assets appear in the list with the status and field values from your file.",
  ],
  "managing-service-desks-and-teams": [
    "The Desks list shows all your service desks. Click Create Desk to set up a new one from scratch or from a template.",
    "Each desk can have multiple teams. Create teams with their own timezone and description for intelligent ticket routing.",
    "The Members tab shows all desk members. Add members here before assigning them to teams.",
    "Team routing determines how tickets are distributed — by timezone match or by AI-based description matching.",
    "Working hours define SLA business hours for each desk and team. Choose 24 by 7 or configure custom schedules.",
    "Desk automation settings control assignment method, status transitions, auto-close, and survey triggers.",
    "Delete a desk by confirming the desk name in the deletion dialog. This permanently removes the desk and all its tickets.",
  ],
  "managing-software-applications": [
    "The Software list shows all applications discovered from your identity provider. Use filters to narrow by status, category, or source.",
    "Open an application to see its detail page with license information, monthly cost, and the list of users with access.",
    "Add licenses to track seat counts, cost, billing cycle, and renewal dates for each application.",
    "For Okta test tenants, use Assign App Permissions to provision access for a specific employee.",
    "Select multiple applications to use bulk actions — change status, set owner, or assign budget and IT approvers.",
    "Click Export to download a CSV of your software inventory using the current filters and sort order.",
  ],
  "managing-ticket-settings": [
    "Custom fields add structured data to tickets. Create fields of type text, number, checkbox, single select, or multi-select.",
    "Tags let agents categorize tickets with colored labels. Create tags per desk for filtering and reporting.",
    "Canned responses are reusable reply templates. Create personal or shared templates with variables that auto-fill from ticket data.",
  ],
  "managing-user-management": [
    "User Management shows all users who have been assigned roles. Click a user to see their groups, platform roles, and desk access.",
    "The Groups tab lists all imported identity provider groups. Click a group to view or edit its role and desk assignments.",
    "Import a group from your identity provider to grant its members access to Harmony with platform or desk-level roles.",
    "Notification destinations route ticket and SLA alerts to Slack, Teams, or email. Configure destinations per desk.",
    "Each notification destination can be configured independently to receive different event types.",
  ],
  "managing-your-profile-and-preferences": [
    "Your profile information — name, email, and avatar — is synced from your identity provider. Open the user menu at the bottom of the sidebar to view it.",
    "Go to Settings then Preferences to choose light or dark theme and set your Enter key behavior for ticket messages.",
    "Desk Visibility lets you show or hide specific desks from the sidebar and drag them to set your preferred order.",
  ],
  "navigating-the-interface": [
    "The Harmony layout uses a collapsible sidebar for navigation. Collapse it to icon-only mode to save space, and hover over desk items to see a preview.",
    "Press Command K to open the command palette. Search for pages, employees, assets, tickets, or software, and press Enter to navigate.",
    "Hover over an employee avatar anywhere in the app to see their hover card with name, title, department, and messaging links.",
    "Breadcrumbs on nested settings pages show your current location. Click any segment to go back up the hierarchy.",
    "The user menu in the sidebar footer lets you switch themes, open the portal, access documentation, or sign out.",
  ],
  "organizing-tickets-and-table-views": [
    "The ticket table supports faceted filters. Open the filter panel to combine status, priority, assignee, source, and tag filters.",
    "Click a column header to sort tickets. Click again to toggle ascending and descending order.",
    "Save your current filters and sort as a named view. Switch between views using the dropdown next to the desk name.",
    "Use Manage Columns to show, hide, and reorder table columns. Your preferences are saved per account.",
    "Select multiple tickets with checkboxes to use bulk actions — update status, change priority, or reassign in one step.",
  ],
  "understanding-integrations": [
    "The Integrations page lists all available connectors grouped by category — collaboration, identity providers, MDM, ticketing, and more.",
    "Integration cards show the connection status. A green Connected badge means the integration is active. Click Connect to start the OAuth authorization flow.",
    "Harmony requests only the permissions needed for each integration. Review and approve the scopes in the provider's authorization screen.",
  ],
  "understanding-service-desk-and-managing-tickets": [
    "The Tickets view shows all tickets across your accessible desks. Use the desk selector to focus on a single desk or view all at once.",
    "Create a ticket by clicking Create Ticket. Fill in the title, description, type, priority, desk, and assignee.",
    "Click a ticket row to open the preview panel with conversation, properties, SLA timers, approvals, and linked resources.",
    "Insert a canned response in the chat to quickly reply with a predefined template. Variables are replaced with current ticket data.",
    "When a ticket has a knowledge base resolution, use Respond with knowledge base solution to insert the AI-suggested answer.",
    "The Approvals section shows each pending approval step. Approve or deny directly from the ticket preview.",
    "To close a ticket, change its status to Resolved or Closed. If mandatory close comment is enabled, you'll be prompted for an internal note.",
    "The SLA section shows response and resolution timers with deadlines and remaining time. Paused timers indicate the ticket is waiting on the reporter.",
  ],
  "understanding-user-roles-and-permissions": [
    "Harmony has two role types — Platform roles apply tenant-wide, while Desk roles apply per service desk. Roles are assigned through identity provider groups.",
    "Open a user in User Management to see their groups and desks with role badges showing Platform Admin, Desk manager, Desk agent, or Desk observer.",
  ],
  "using-the-harmony-portal": [
    "The Harmony Portal is the employee-facing interface for IT support. Type a question in the hero chat input to start a conversation with the AI agent.",
    "Each conversation is a separate thread. Open Threads to browse your conversation history and start new chats.",
    "The Tickets tab shows all tickets you've submitted. Click a ticket to view the conversation, add replies, and track its status.",
    "Open a ticket to see the Chat and Activity tabs. Use Chat to add messages and Activity to see the history of updates.",
    "The Approvals tab lists pending approval requests that need your decision. Click Approve or Deny to act on each request.",
    "For app access approvals, choose Direct assignment or a specific group to determine how access is granted.",
  ],
  "working-with-ai-agents": [
    "The Agents page lists all available automations. Toggle between card and table layout, and use search and filters to find specific agents.",
    "Open an agent to see the Overview tab with its trigger configuration, steps, and current status.",
    "The configuration panel on the right lets you set the schedule, approval requirements, and agent-specific settings. Click Save to apply changes.",
    "Click Run to execute an agent manually. Fill in the required inputs for that agent type and confirm to start the workflow.",
    "Open the Runs history tab to see past executions. Click a run to view step-by-step results, inputs, outputs, and any error messages.",
  ],
  "working-with-dashboard-widgets": [
    "Click Add widgets to open the widget library. Hover over a widget to preview it, then click to add it to your dashboard.",
    "In Edit mode, grab the drag handle on a widget header to reposition it. Drag the bottom-right corner to resize. Click Save and Exit when done.",
    "Use the date range selector to set the time window for all widgets. Choose a preset or enter custom From and To dates.",
  ],
  "analyzing-asset-and-automation-metrics": [
    "Asset Breakdown by Compliance shows how many assets meet your MDM and security policies. Click a segment to filter the Assets page by that compliance status.",
    "Asset Breakdown by Vendor groups assets by manufacturer. The top nine vendors are shown individually; all others are grouped together.",
    "Asset Breakdown by Model Family groups devices by model family, such as MacBook Pro or iPhone. Click any segment to filter assets by that model.",
    "Asset Breakdown by Status shows assets across their full lifecycle: In Stock, Active, In Repair, end of life planned, end of life grace period, end of life reached, and Retired.",
    "Asset Breakdown by Age groups assets by purchase date into buckets. Color coding highlights aging hardware to help with refresh planning.",
    "Software Breakdown by Status shows your application inventory split into Approved, Discovered, and Ignored. Click a segment to filter the Software page.",
    "AI versus Human Resolution compares tickets resolved by Harmony AI, escalated to a human, and deflected before a ticket was created — helping you measure automation effectiveness.",
    "Agent Runs by Status tracks outcomes of built-in Harmony AI agent runs: Completed, Failed, and Cancelled.",
    "Workflow Runs by Status shows outcomes for your custom workflows. Use it alongside agent metrics to get a complete picture of automation health.",
  ],
};
