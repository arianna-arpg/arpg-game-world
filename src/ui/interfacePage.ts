interface InterfacePage {
  id: string;
  className: string;
  label: string;
  body: string;
  footer: string;
}

const views = new WeakMap<HTMLElement, { key: string; animation?: Animation }>();

/** Plain menus reuse their root across navigation. Animate a changed view,
 * never a settings/census redraw. Shells and new pages own their CSS entrance. */
export function presentInterfaceView(root: HTMLElement, key: string): void {
  const previous = views.get(root);
  if (previous?.key === key && !root.classList.contains('hidden')) return;
  previous?.animation?.cancel();
  const state: { key: string; animation?: Animation } = { key };
  views.set(root, state);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const style = getComputedStyle(root);
  if (reduced.matches || style.display === 'none' || root.querySelector(':scope > .side-screen, :scope > .interface-page')) return;
  const time = style.getPropertyValue('--inv-enter-ms').trim();
  const duration = parseFloat(time) * (time.endsWith('ms') ? 1 : 1000);
  if (!Number.isFinite(duration) || duration <= 0) return;
  const animation = root.animate([{ opacity:0 }, { opacity:1 }], { duration, easing:'ease-out' });
  animation.id = 'interface-arrive'; state.animation = animation;
  const stop = (): void => { if (reduced.matches) animation.cancel(); };
  reduced.addEventListener('change', stop);
  void animation.finished.catch(() => {}).finally(() => {
    reduced.removeEventListener('change', stop);
    if (state.animation === animation) state.animation = undefined;
  });
}

/** A stable page with a scrolling body and a reachable navigation footer.
 * Redrawing a picker keeps its outer surface, scroll and entrance animation.
 * Content and actions remain with the caller; strings are trusted renderer HTML. */
export function renderInterfacePage(root: HTMLElement, page: InterfacePage): void {
  let surface = root.querySelector<HTMLElement>(':scope > .interface-page');
  if (surface?.dataset.interfacePage !== page.id) {
    surface = document.createElement('section');
    surface.className = `interface-page ${page.className}`;
    surface.dataset.interfacePage = page.id;
    surface.setAttribute('aria-label', page.label);
    surface.innerHTML = '<div class="interface-page-body"></div><footer class="interface-footer"></footer>';
    root.replaceChildren(surface);
  }
  const body = surface!.querySelector<HTMLElement>(':scope > .interface-page-body')!;
  const scroll = body.scrollTop;
  body.innerHTML = page.body;
  body.scrollTop = scroll;
  surface!.querySelector(':scope > .interface-footer')!.innerHTML = page.footer;
}
