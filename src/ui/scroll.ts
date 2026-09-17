const SCROLL_DURATION_MS = 650;

/**
 * Scrolls the window to the top with an eased frame animation.
 *
 * @remarks
 * Drives the scroll position from JavaScript instead of relying on native
 * smooth scrolling, so the animation still runs when the operating system
 * disables animations (Windows "Show animations", `prefers-reduced-motion`),
 * which forces both CSS `scroll-behavior: smooth` and
 * `scrollTo({ behavior: 'smooth' })` to jump instantly. User wheel or touch
 * input cancels the animation and restores the previous scroll behavior.
 */
export function scrollToTop(): void {
  const startY = window.scrollY;
  if (startY === 0) return;
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  const startTime = performance.now();
  const controller = new AbortController();
  const stop = () => {
    controller.abort();
    root.style.scrollBehavior = previousBehavior;
  };
  window.addEventListener('wheel', stop, { passive: true, signal: controller.signal });
  window.addEventListener('touchmove', stop, { passive: true, signal: controller.signal });
  window.setTimeout(stop, SCROLL_DURATION_MS + 150);
  const animate = (now: number) => {
    if (controller.signal.aborted) return;
    const progress = Math.min((now - startTime) / SCROLL_DURATION_MS, 1);
    const eased =
      progress < 0.5 ? 4 * Math.pow(progress, 3) : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    window.scrollTo(0, Math.round(startY * (1 - eased)));
    if (progress < 1) window.requestAnimationFrame(animate);
    else stop();
  };
  window.requestAnimationFrame(animate);
}
