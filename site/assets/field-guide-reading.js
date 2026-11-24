/* One reader per guide. The browser animates transforms; JS only measures on
   reveal/resize and handles intent. No timers or animation loop while hidden. */
export function createGuideReader(guide) {
  const records = new Map(), targets = new WeakMap();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const control = guide.querySelector('[data-guide-reading]');
  let paused = false, away = false, covered = document.documentElement.classList.contains('hwcine-covered');
  let resizeFrame = 0;
  const dirty = new Set();
  const open = () => guide.open && !guide.querySelector('.disclosure-fold')?.inert;
  const allowed = record => open() && record.visible && !paused && !reduced.matches && !document.hidden && !covered && !away && !record.manual;

  function sync(record) {
    if (!record.animation) return;
    if (allowed(record)) {
      if (record.animation.playState !== 'running') record.animation.play();
    } else if (record.animation.playState !== 'paused') record.animation.pause();
  }
  function measure(record) {
    if (!open() || !record.visible) return;
    const {line, text} = record, distance = Math.max(0, text.offsetHeight - line.clientHeight);
    const key = [line.clientWidth, line.clientHeight, text.offsetHeight, reduced.matches].join('|');
    if (record.key === key) { sync(record); return; }
    record.key = key;
    record.animation?.cancel(); record.animation = null;
    record.distance = distance;
    if (record.manual) return;
    line.scrollTop = 0;
    if (distance < 2 || reduced.matches) return;
    const top = 4500, travel = Math.max(5000, distance / 6 * 1000), bottom = 4000, fade = 450;
    const duration = top + travel + bottom + fade * 2;
    const at = t => t / duration, end = `translateY(-${distance}px)`;
    record.animation = text.animate([
      {transform:'translateY(0)', opacity:1, offset:0},
      {transform:'translateY(0)', opacity:1, offset:at(top)},
      {transform:end, opacity:1, offset:at(top + travel)},
      {transform:end, opacity:1, offset:at(top + travel + bottom)},
      {transform:end, opacity:0, offset:at(duration - fade)},
      {transform:'translateY(0)', opacity:0, offset:at(duration - fade) + .00001},
      {transform:'translateY(0)', opacity:1, offset:1}
    ], {duration, iterations:Infinity, easing:'linear'});
    record.animation.pause();
    record.animation.currentTime = 0;
    sync(record);
  }
  function reset(card) {
    const record = records.get(card);
    if (!record) return;
    record.manual = false;
    record.line.scrollTop = 0;
    if (record.animation) record.animation.currentTime = 0;
    else record.key = '';
    measure(record);
    sync(record);
  }
  function manual(record) {
    if (!record || record.manual) return;
    const offset = Math.max(0, record.line.getBoundingClientRect().top - record.text.getBoundingClientRect().top);
    record.animation?.cancel(); record.animation = null;
    record.manual = true;
    record.line.scrollTop = offset;
  }
  function resume() { records.forEach(record => { measure(record); sync(record); }); }
  const visibility = new IntersectionObserver(entries => entries.forEach(entry => {
    const record = targets.get(entry.target);
    if (!record) return;
    record.visible = entry.isIntersecting && entry.intersectionRatio > .15;
    measure(record); sync(record);
  }), {threshold:[0,.15]});
  const resize = new ResizeObserver(entries => {
    entries.forEach(entry => { const record = targets.get(entry.target); if (record) dirty.add(record); });
    if (resizeFrame || !open()) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      dirty.forEach(record => measure(record)); dirty.clear();
    });
  });
  function remove(record) {
    record.animation?.cancel();
    visibility.unobserve(record.line); resize.unobserve(record.line); resize.unobserve(record.text);
    targets.delete(record.line); targets.delete(record.text); dirty.delete(record);
    records.delete(record.card);
  }
  function refresh(mount) {
    records.forEach(record => { if (!record.card.isConnected) remove(record); });
    mount.querySelectorAll('.hwdk-illustrated').forEach(card => {
      const line = card.querySelector('.hwdk-line'), text = line?.querySelector('.hwdk-scroll-text');
      if (!text || records.has(card)) return;
      const record = {card,line,text,visible:false,manual:false,animation:null,key:''};
      records.set(card,record); targets.set(line,record); targets.set(text,record);
      visibility.observe(line); resize.observe(line); resize.observe(text);
    });
    if (control) { control.hidden = false; control.disabled = reduced.matches; control.textContent = reduced.matches ? 'Text motion off' : paused ? 'Resume text' : 'Pause text'; }
  }
  guide.addEventListener('mouseover', event => {
    const card = event.target.closest('.hwdk-card');
    if (card && !card.contains(event.relatedTarget)) reset(card);
  });
  guide.addEventListener('focusin', event => {
    const card = event.target.closest('.hwdk-card');
    if (card && !card.contains(event.relatedTarget)) reset(card);
  });
  guide.addEventListener('click', event => { const card = event.target.closest('.hwdk-card'); if (card) reset(card); });
  guide.addEventListener('wheel', event => {
    if (event.target.closest('.hwdk-line')) manual(records.get(event.target.closest('.hwdk-card')));
  }, {passive:true});
  guide.addEventListener('touchstart', event => {
    if (event.target.closest('.hwdk-line')) manual(records.get(event.target.closest('.hwdk-card')));
  }, {passive:true});
  guide.addEventListener('keydown', event => {
    const record = records.get(event.target.closest('.hwdk-card'));
    if (!record || event.altKey || event.ctrlKey || event.metaKey || !['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
    if (record.text.offsetHeight <= record.line.clientHeight + 1) return;
    event.preventDefault(); manual(record);
    const step = parseFloat(getComputedStyle(record.line).lineHeight);
    record.line.scrollTop = event.key === 'Home' ? 0 : event.key === 'End' ? record.text.offsetHeight : record.line.scrollTop + (event.key === 'ArrowDown' ? step : -step);
  });
  control?.addEventListener('click', () => {
    paused = !paused;
    control.setAttribute('aria-pressed', String(paused));
    control.textContent = paused ? 'Resume text' : 'Pause text';
    resume();
  });
  guide.addEventListener('toggle', resume);
  guide.addEventListener('hw:disclosure-intent', resume);
  document.addEventListener('visibilitychange', resume);
  document.addEventListener('hw:cinema-coverage', event => { covered = event.detail.covered; resume(); });
  window.addEventListener('pagehide', () => { away = true; resume(); });
  window.addEventListener('pageshow', () => { away = false; resume(); });
  reduced.addEventListener('change', () => {
    records.forEach(record => { record.key = ''; record.animation?.cancel(); record.animation = null; record.line.scrollTop = 0; });
    if (control) { control.disabled = reduced.matches; control.textContent = reduced.matches ? 'Text motion off' : paused ? 'Resume text' : 'Pause text'; }
    resume();
  });
  document.fonts?.ready.then(resume);
  return {refresh};
}
