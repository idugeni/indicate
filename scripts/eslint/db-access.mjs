/**
 * ESLint rule for the database-access policy in `AGENTS.md`
 * §"Database access & egress".
 *
 * `select().from(table)` with no column projection and no bound anywhere in
 * the chain is a full read of every matching row. On this schema that has
 * shipped 4,422 sites, 13,179 audit rows, and 22,483 article-site rows per
 * call, so it is an error rather than a warning.
 *
 * A select counts as bounded when the chain reaches `.limit(...)`. `where`,
 * `orderBy`, `for('update')`, and `.get()` bound nothing: they still return
 * the whole matching set, which is why `snapshot()` and `load()` fail here
 * even though both filter by `organizationId`.
 *
 * `scripts/perf/db-rows-budget.mjs` runs this same rule through the ESLint
 * API, so the budget check and the lint gate can never disagree.
 */

const SELECT = 'select';
const FROM = 'from';
const LIMIT = 'limit';

/**
 * Report one unbounded `select().from()` chain.
 *
 * @param {object} context ESLint rule context.
 * @param {object} source ESLint SourceCode.
 * @param {object} node The `.from(...)` call node.
 * @returns {void}
 */
function reportUnbounded(context, source, node) {
  const argument = node.arguments[0];
  context.report({
    node,
    messageId: 'unbounded',
    data: {
      chain: source.getText(node),
      table: argument === undefined ? 'target' : source.getText(argument),
    },
  });
}

/**
 * Walk up the member chain from a `.from()` call and collect property names.
 *
 * @param {object} source ESLint SourceCode.
 * @param {object} fromCall `CallExpression` for `.from(...)`.
 * @returns {string[]} Property names chained above `.from()`, outermost last.
 */
function chainedProperties(source, fromCall) {
  const properties = [];
  let current = fromCall;
  for (;;) {
    const ancestors = source.getAncestors(current);
    const parent = ancestors.at(-1);
    if (parent === undefined) break;
    if (parent.type === 'ChainExpression') {
      current = parent;
      continue;
    }
    const isMember = parent.type === 'MemberExpression' && parent.object === current && parent.computed === false;
    if (!isMember) break;
    if (parent.property.type !== 'Identifier') break;
    properties.push(parent.property.name);
    const call = source.getAncestors(parent).at(-1);
    if (call !== undefined && call.type === 'CallExpression' && call.callee === parent) {
      current = call;
      continue;
    }
    break;
  }
  return properties;
}

/** @type {import('eslint').Rule.RuleModule} */
const noUnboundedSelect = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid an unbounded Drizzle select().from() with no column projection and no bound in the chain (AGENTS.md "Database access & egress").',
    },
    schema: [],
    messages: {
      unbounded:
        'Unbounded read: `{{chain}}` returns every matching `{{table}}` row. Project the minimum columns and bound it with `.limit()` or a tenant/site/org filter. See AGENTS.md §"Database access & egress".',
    },
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression' || callee.computed) return;
        if (callee.property.type !== 'Identifier' || callee.property.name !== SELECT) return;
        if (node.arguments.length > 0) return;
        const from = source.getAncestors(node).at(-1);
        if (from === undefined) return;
        if (from.type !== 'MemberExpression' || from.computed) return;
        if (from.property.type !== 'Identifier' || from.property.name !== FROM) return;
        const fromCall = source.getAncestors(from).at(-1);
        if (fromCall === undefined || fromCall.type !== 'CallExpression' || fromCall.callee !== from) return;
        if (chainedProperties(source, fromCall).includes(LIMIT)) return;
        reportUnbounded(context, source, fromCall);
      },
    };
  },
};

/** @type {import('eslint').Rule.RuleModule} */
const noWholeSetRead = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Report a projected but unbounded Drizzle select(), so CI can budget whole-set reads separately from the hard lint error.',
    },
    schema: [],
    messages: {
      wholeSet:
        'Whole-set read: `{{chain}}` projects columns but returns every matching `{{table}}` row. Bound it with `.limit()` or keyset pagination. See AGENTS.md §"Database access & egress".',
    },
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression' || callee.computed) return;
        if (callee.property.type !== 'Identifier' || callee.property.name !== SELECT) return;
        if (node.arguments.length === 0) return;
        const from = source.getAncestors(node).at(-1);
        if (from === undefined) return;
        if (from.type !== 'MemberExpression' || from.computed) return;
        if (from.property.type !== 'Identifier' || from.property.name !== FROM) return;
        const fromCall = source.getAncestors(from).at(-1);
        if (fromCall === undefined || fromCall.type !== 'CallExpression' || fromCall.callee !== from) return;
        if (chainedProperties(source, fromCall).includes(LIMIT)) return;
        const argument = fromCall.arguments[0];
        context.report({
          node,
          messageId: 'wholeSet',
          data: {
            chain: source.getText(fromCall),
            table: argument === undefined ? 'target' : source.getText(argument),
          },
        });
      },
    };
  },
};

export const rules = {
  'no-unbounded-select': noUnboundedSelect,
  'no-whole-set-read': noWholeSetRead,
};

const plugin = { rules, configs: {} };
plugin.configs.recommended = { plugins: { 'db-access': plugin }, rules: { 'db-access/no-unbounded-select': 'error' } };

export default plugin;
