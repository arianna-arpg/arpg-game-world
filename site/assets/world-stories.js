import { WORLD_SCENES } from './world-scenes.js?v=hw9';

/* One reusable painting/canvas; selection is owned by the most recent intent. */
export function mountWorldStories(root) {
  if (!root || !WORLD_SCENES.length) return;
  const list = root.querySelector('[data-world-stories]');
  const figure = root.querySelector('figure');
  const art = root.querySelector('[data-world-art]');
  const img = art.querySelector('img');
  const caption = figure.querySelector('figcaption');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const status = document.createElement('span');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  root.append(status);
  const loaded = new Map();
  let intent = 0, hoverTimer = 0, shown = 0, keyboardIntent = false;
  let pointerX = null, pointerY = null;
  const panelId = figure.id || (figure.id = 'frontier-scene');
  figure.setAttribute('role', 'tabpanel');
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', 'Explore the frontier');
  list.setAttribute('aria-orientation', 'vertical');

  function load(scene) {
    if (!loaded.has(scene.src)) {
      const pending = new Promise((resolve, reject) => {
        const next = new Image();
        next.onload = () => next.decode().then(resolve, resolve);
        next.onerror = reject;
        next.src = scene.src;
      }).catch(error => { loaded.delete(scene.src); throw error; });
      loaded.set(scene.src, pending);
    }
    return loaded.get(scene.src);
  }
  function mark(index) {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
    });
  }
  function hover(index, event) {
    if (keyboardIntent || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => select(index), 110);
  }
  async function select(index) {
    clearTimeout(hoverTimer);
    const ticket = ++intent;
    mark(index);
    status.textContent = '';
    if (index === shown) {
      art.classList.remove('is-changing');
      figure.removeAttribute('aria-busy');
      return;
    }
    figure.setAttribute('aria-busy', 'true');
    const scene = WORLD_SCENES[index];
    try {
      await load(scene);
      if (ticket !== intent) return;
      art.classList.add('is-changing');
      if (!reduced.matches) await new Promise(resolve => setTimeout(resolve, 140));
      if (ticket !== intent) return;
      img.style.objectPosition = scene.position || '50% 50%';
      img.alt = scene.alt;
      img.src = scene.src;
      caption.textContent = scene.caption;
      figure.setAttribute('aria-labelledby', buttons[index].id);
      shown = index;
      // Decode before revealing the existing memory-rim canvas's new texture.
      await img.decode().catch(() => {});
      if (ticket !== intent) return;
      requestAnimationFrame(() => {
        if (ticket !== intent) return;
        art.classList.remove('is-changing');
        figure.removeAttribute('aria-busy');
      });
    } catch (_) {
      if (ticket !== intent) return;
      mark(shown);
      art.classList.remove('is-changing');
      figure.removeAttribute('aria-busy');
      status.textContent = 'This view could not load. Try another story.';
    }
  }
  const buttons = WORLD_SCENES.map((scene, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'frontier-tab-' + scene.id;
    button.className = 'world-story';
    button.dataset.worldStory = scene.id;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panelId);
    button.setAttribute('aria-label', scene.title);
    const title = document.createElement('strong');
    title.className = 'world-story-title';
    title.textContent = scene.title;
    const description = document.createElement('span');
    description.className = 'world-story-description';
    description.id = button.id + '-description';
    description.textContent = scene.description;
    button.setAttribute('aria-describedby', description.id);
    button.append(title, description);
    button.addEventListener('pointerenter', event => hover(i, event));
    button.addEventListener('pointermove', event => {
      // Focus may scroll a stationary pointer over another story. Only a real
      // pointer movement should take selection back from keyboard navigation.
      const moved = event.clientX !== pointerX || event.clientY !== pointerY;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!moved) return;
      keyboardIntent = false;
      hover(i, event);
    });
    button.addEventListener('pointerdown', event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      keyboardIntent = false;
    });
    button.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
    button.addEventListener('focus', () => {
      if (button.matches(':focus-visible')) keyboardIntent = true;
      select(i);
    });
    button.addEventListener('click', () => select(i));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (i + 1) % buttons.length;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (i + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      keyboardIntent = true;
      clearTimeout(hoverTimer);
      buttons[next].focus();
    });
    return button;
  });
  list.replaceChildren(...buttons);
  list.classList.add('world-stories-enhanced');
  mark(0);
  const first = WORLD_SCENES[0];
  img.src = first.src;
  img.alt = first.alt;
  img.style.objectPosition = first.position || '50% 50%';
  caption.textContent = first.caption;
  figure.setAttribute('aria-labelledby', buttons[0].id);
  // Leaving the page never leaves an outgoing transition over the next visit.
  window.addEventListener('pagehide', () => {
    ++intent;
    clearTimeout(hoverTimer);
    mark(shown);
    art.classList.remove('is-changing');
    figure.removeAttribute('aria-busy');
  });
}
