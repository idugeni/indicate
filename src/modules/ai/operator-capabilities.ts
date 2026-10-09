export const OPERATOR_CAPABILITY_CATALOG_VERSION = 1;

/** Read-only tools may run through explicit handlers; writes remain disabled until approvals and verification are complete. */
export const OPERATOR_READ_EXECUTION_ENABLED = true;
export const OPERATOR_WRITE_EXECUTION_ENABLED = false;

export type OperatorRisk = 'read' | 'write' | 'high';
export interface OperatorCapabilityDefinition {
  readonly id: string;
  readonly domain: string;
  readonly risk: OperatorRisk;
  readonly requiresApproval: boolean;
}

/** Domain inventory, not an execution allowlist. Entries are descriptive until a handler is registered. */
export const OPERATOR_CAPABILITIES: readonly OperatorCapabilityDefinition[] = Object.freeze([
  { id: 'command-center.overview.read', domain: 'Command Center', risk: 'read', requiresApproval: false },
  { id: 'network-intelligence.health.read', domain: 'Network Intelligence', risk: 'read', requiresApproval: false },
  { id: 'editorial-workspace.articles.read', domain: 'Editorial Workspace', risk: 'read', requiresApproval: false },
  { id: 'content-library.articles.read', domain: 'Content Library', risk: 'read', requiresApproval: false },
  { id: 'taxonomy-studio.taxonomy.read', domain: 'Taxonomy Studio', risk: 'read', requiresApproval: false },
  { id: 'publisher-network.publishers.read', domain: 'Publisher Network', risk: 'read', requiresApproval: false },
  { id: 'media-library.assets.read', domain: 'Media Library', risk: 'read', requiresApproval: false },
  { id: 'distribution-control.deliveries.read', domain: 'Distribution Control', risk: 'read', requiresApproval: false },
  { id: 'live-results.deliveries.read', domain: 'Live Results', risk: 'read', requiresApproval: false },
  { id: 'ads-control-center.ads.read', domain: 'Ads Control Center', risk: 'read', requiresApproval: false },
  { id: 'network-infrastructure.sites.read', domain: 'Network Infrastructure', risk: 'read', requiresApproval: false },
  { id: 'access-integrations.integrations.read', domain: 'Access & Integrations', risk: 'read', requiresApproval: false },
  { id: 'billing-plan.billing.read', domain: 'Billing & Plan', risk: 'read', requiresApproval: false },
  { id: 'audit-security.audit.read', domain: 'Audit & Security', risk: 'read', requiresApproval: false },
  { id: 'system-operations.status.read', domain: 'System Operations', risk: 'read', requiresApproval: false },
  { id: 'trust-moderation.cases.read', domain: 'Trust & Moderation', risk: 'read', requiresApproval: false },
  { id: 'customer-operations.customers.read', domain: 'Customer Operations', risk: 'read', requiresApproval: false },
  { id: 'public-web-content.content.read', domain: 'Public Web Content', risk: 'read', requiresApproval: false },
  { id: 'ai-control-center.ai-status.read', domain: 'AI Control Center', risk: 'read', requiresApproval: false },
]);

export function findOperatorCapability(id: string): OperatorCapabilityDefinition | null {
  return OPERATOR_CAPABILITIES.find((item) => item.id === id) ?? null;
}

/** IDs with implemented, tested read handlers. All other catalog entries are planning metadata only. */
export const OPERATOR_EXECUTABLE_READ_CAPABILITY_IDS = Object.freeze([
  'command-center.overview.read',
  'network-intelligence.health.read',
  'editorial-workspace.articles.read',
  'content-library.articles.read',
  'taxonomy-studio.taxonomy.read',
  'publisher-network.publishers.read',
  'network-infrastructure.sites.read',
  'audit-security.audit.read',
  'system-operations.status.read',
] as const);
