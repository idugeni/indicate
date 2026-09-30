/**
 * ESLint rule for the hover-hint policy: a hover hint is a shadcn `Tooltip`,
 * never the browser's native `title` attribute.
 *
 * Native `title` is unreachable by keyboard, invisible to touch, unthemeable,
 * and it silently becomes the accessible name of a button that has no
 * `aria-label`, so a control can ship with no name at all. A `Tooltip` needs
 * an explicit `aria-label`, renders through the shadcn primitive with the app
 * or template chip, and opens on focus as well as hover.
 *
 * Host elements are always checked: on a lowercase JSX tag, `title` can only
 * mean the native tooltip. Capitalized tags are checked only against
 * `domForwarding`, because most components in this repo take a `title` prop
 * that is content, not a tooltip (`SectionCard`, `EmptyState`, `PageHeader`,
 * `OgCard`, `TopRanked`, `Donut`, `ArticleGallery`, ...). Growing that list is
 * the intended way to widen coverage; a per-line `eslint-disable-next-line`
 * covers a one-off that cannot be expressed as a list.
 *
 * Spreads (`<div {...props} />`) are not detectable without type information
 * and stay out of scope.
 */

/** Components in this repo that forward unknown props to a DOM element. */
const DEFAULT_DOM_FORWARDING = ['Button', 'Link', 'TableCell', 'TableHead', 'TableRow'];

const TITLE = 'title';

/**
 * Read the tag name of a JSX opening element.
 *
 * @param {object} node `JSXOpeningElement` node.
 * @returns {string | null} Tag name, or null for namespaced or member tags.
 */
function tagName(node) {
  const name = node.name;
  if (name.type !== 'JSXIdentifier') return null;
  return name.name;
}

/** @type {import('eslint').Rule.RuleModule} */
const noNativeTooltip = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid the native `title` attribute as a hover hint; use the shadcn Tooltip so the hint is themeable and reachable by keyboard.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          domForwarding: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      nativeTitle:
        'Native `title` on <{{tag}}> renders the browser tooltip, which no keyboard or touch user can reach. Wrap the trigger in `Tooltip` (app) or `TemplateTooltip` (public templates), and give icon-only controls an explicit `aria-label`.',
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const domForwarding = new Set(options.domForwarding ?? DEFAULT_DOM_FORWARDING);
    return {
      JSXOpeningElement(node) {
        const tag = tagName(node);
        if (tag === null) return;
        if (/^[a-z]/.test(tag) === false && domForwarding.has(tag) === false) return;
        for (const attribute of node.attributes) {
          if (attribute.type !== 'JSXAttribute') continue;
          if (attribute.name.type !== 'JSXIdentifier' || attribute.name.name !== TITLE) continue;
          context.report({ node: attribute, messageId: 'nativeTitle', data: { tag } });
        }
      },
    };
  },
};

export const rules = {
  'no-native-tooltip': noNativeTooltip,
};

const plugin = { rules, configs: {} };
plugin.configs.recommended = { plugins: { 'tooltip': plugin }, rules: { 'tooltip/no-native-tooltip': 'error' } };

export default plugin;
