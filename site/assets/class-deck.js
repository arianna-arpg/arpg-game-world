/* Deal the entire exported roster before recycling it. No favored classes. */
export function createClassDeck(roster, random = Math.random) {
  const seen = new Set();
  const pool = roster.filter(entry => {
    if (!entry || !entry.id || !entry.name || seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  let remaining = [];
  return function deal(count = 3) {
    const picked = [];
    const size = Math.min(Math.max(0, Math.floor(count)), pool.length);
    while (picked.length < size) {
      if (!remaining.length) {
        remaining = pool.slice();
        for (let i = remaining.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
      }
      // A deal can cross a cycle boundary, but must never contain duplicates.
      const index = remaining.findIndex(entry => !picked.includes(entry));
      picked.push(remaining.splice(index, 1)[0]);
    }
    return picked;
  };
}
