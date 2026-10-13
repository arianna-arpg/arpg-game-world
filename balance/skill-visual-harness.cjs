// Main exposes a director hold; the seamless checkpoint predates that QA API.
// Keep the compatibility shim inside disposable test windows, never gameplay.
exports.installVisualHarnessHold = async win => {
  await win.webContents.executeJavaScript(`(() => {
    if (typeof __game.hold === 'function') return;
    const held = new WeakMap();
    __game.hold = on => {
      const w = __game.world();
      if (on && !held.has(w)) { held.set(w, w.update); w.update = () => {}; }
      else if (!on && held.has(w)) { w.update = held.get(w); held.delete(w); }
    };
  })()`);
};
