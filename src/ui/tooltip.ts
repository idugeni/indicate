/**
 * Tooltip chip styles shared by the app shell and the public site templates.
 *
 * `[&>div]` repaints the Base UI arrow, which otherwise inherits the popup
 * background from a different cascade layer than the popup's own utility.
 */

/** Dark app chip: content and arrow share the raised surface. */
export const APP_TOOLTIP_CONTENT =
  'border border-hairline bg-bg-raised font-sans text-xs text-paper [&>div]:bg-bg-raised';

/**
 * Public template chip: uses each template's surface tokens, not the inverse
 * brand pair. The brand pair fails on half the templates — on the light ones
 * `--tpl-on-primary` is white on a near-white canvas, and on `black-lime` it is
 * the canvas colour itself, so the chip loses its edge. `card`/`ink`/`ring` is
 * the same surface idiom template chrome already uses for cards and menus.
 *
 * The fallbacks are the app's own dark chrome values, which is what the
 * marketing pages get: they define no `--tpl-*` at all.
 */
export const TEMPLATE_TOOLTIP_CONTENT =
  'border border-[var(--tpl-ring,#2a3348)] bg-[var(--tpl-card,#161d2e)] font-sans text-[var(--tpl-ink,#edeadd)] [&>div]:bg-[var(--tpl-card,#161d2e)]';
