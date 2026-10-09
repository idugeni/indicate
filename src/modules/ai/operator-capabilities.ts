export const OPERATOR_CAPABILITY_CATALOG_VERSION = 1;
export const OPERATOR_EXECUTION_ENABLED = false;
export const OPERATOR_CAPABILITIES = Object.freeze([
  { id: 'dashboard.overview.read', risk: 'read' },
  { id: 'editorial.articles.read', risk: 'read' },
  { id: 'operations.status.read', risk: 'read' },
] as const);
