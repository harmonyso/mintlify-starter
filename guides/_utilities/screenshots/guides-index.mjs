/**
 * Aggregates all guide screenshot targets.
 * Guide files now live at: guides/{guide}/guide.mjs
 */

import { targets as analyzingAssetAndAutomationMetricsTargets } from "../../analyzing-asset-and-automation-metrics/guide.mjs";
import { targets as analyzingServiceDeskMetricsTargets } from "../../analyzing-service-desk-metrics/guide.mjs";
import { targets as configuringAiAgentsTargets } from "../../configuring-ai-agents/guide.mjs";
import { targets as configuringAssetManagementTargets } from "../../configuring-asset-management/guide.mjs";
import { targets as configuringAutomationAndSlaTargets } from "../../configuring-automation-and-sla/guide.mjs";
import { targets as configuringIntegrationSyncAndCredentialsTargets } from "../../configuring-integration-sync-and-credentials/guide.mjs";
import { targets as connectingAndManagingIntegrationsTargets } from "../../connecting-and-managing-integrations/guide.mjs";
import { targets as creatingAndManagingCustomDashboardsTargets } from "../../creating-and-managing-custom-dashboards/guide.mjs";
import { targets as gettingStartedWithHarmonyDashboardTargets } from "../../getting-started-with-harmony-dashboard/guide.mjs";
import { targets as managingAssetOrganizationAndImportingTargets } from "../../managing-asset-organization-and-importing/guide.mjs";
import { targets as managingAssetViewsAndDetailsTargets } from "../../managing-asset-views-and-details/guide.mjs";
import { targets as managingKnowledgeBaseTargets } from "../../managing-knowledge-base/guide.mjs";

export const ALL_GUIDE_NAMES = [
  "analyzing-asset-and-automation-metrics",
  "analyzing-service-desk-metrics",
  "configuring-ai-agents",
  "configuring-asset-management",
  "configuring-automation-and-sla",
  "configuring-integration-sync-and-credentials",
  "connecting-and-managing-integrations",
  "creating-and-managing-custom-dashboards",
  "getting-started-with-harmony-dashboard",
  "managing-asset-organization-and-importing",
  "managing-asset-views-and-details",
  "managing-knowledge-base",
];

export function getAllTargets(selectedGuides = null) {
  const all = [
    ...analyzingAssetAndAutomationMetricsTargets,
    ...analyzingServiceDeskMetricsTargets,
    ...configuringAiAgentsTargets,
    ...configuringAssetManagementTargets,
    ...configuringAutomationAndSlaTargets,
    ...configuringIntegrationSyncAndCredentialsTargets,
    ...connectingAndManagingIntegrationsTargets,
    ...creatingAndManagingCustomDashboardsTargets,
    ...gettingStartedWithHarmonyDashboardTargets,
    ...managingAssetOrganizationAndImportingTargets,
    ...managingAssetViewsAndDetailsTargets,
    ...managingKnowledgeBaseTargets,
  ];
  if (selectedGuides?.length) {
    return all.filter((t) => selectedGuides.includes(t.dir));
  }
  return all;
}
