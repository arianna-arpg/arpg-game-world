// Shared by the data export, browser and regression checks. These are catalogue
// facts, independent of a particular character's unlocks or live socket setup.
export function skillAcquisition(entry) {
  const raw = entry.raw || entry;
  const learnable = entry.learnable ?? !(raw.noDrop ?? entry.monsterOnly);
  return {learnable, droppable: entry.droppable ?? (learnable && (raw.dropWeight ?? 100) > 0)};
}

export function supportRules(entry) {
  const raw = entry.raw || entry;
  return Object.fromEntries(['requiresTags', 'excludeTags', 'requiresMechanisms'].map(key => [key, entry[key] || raw[key] || []]));
}

// Same tag gate as engine/skills.supportFitsTags: ANY requirement, ANY veto.
// Mechanisms and rolled gem bases are additional live-game requirements.
export function supportMatchesTags(entry, tags) {
  const {requiresTags, excludeTags} = supportRules(entry);
  return !excludeTags.some(tag => tags.includes(tag)) &&
    (!requiresTags.length || requiresTags.some(tag => tags.includes(tag)));
}

export function compareEntries(a, b, sort = 'recommended') {
  if (sort === 'recommended') {
    const tier = entry => entry.type === 'skill' ? (skillAcquisition(entry).learnable ? 0 : 2) : 1;
    const order = tier(a) - tier(b);
    if (order) return order;
  }
  return sort === 'id' ? a.id.localeCompare(b.id) : (a.name || a.id).localeCompare(b.name || b.id) || a.id.localeCompare(b.id);
}

export function matchesQuery(entry, query) {
  const tags = [];
  let learnable = null, droppable = null;
  let text = query.toLowerCase().replace(/\btag:([^\s]+)/g, (_, tag) => { tags.push(tag); return ''; })
    .replace(/\b(learnable|droppable):(true|false|yes|no)\b/g, (_, kind, value) => {
      if (kind === 'learnable') learnable = value === 'true' || value === 'yes';
      else droppable = value === 'true' || value === 'yes';
      return '';
    }).trim();
  // Familiar standalone searches also work; the explicit forms can combine
  // with a name or effect, e.g. "learnable:true fire" or "tag:spell".
  if (text === 'learnable') { learnable = true; text = ''; }
  if (['unlearnable', 'not learnable', 'not directly learnable'].includes(text)) { learnable = false; text = ''; }
  if (text === 'droppable') { droppable = true; text = ''; }
  if (learnable !== null || droppable !== null) {
    if (entry.type !== 'skill') return false;
    const source = skillAcquisition(entry);
    if (learnable !== null && source.learnable !== learnable || droppable !== null && source.droppable !== droppable) return false;
  }
  if (tags.length && !(entry.type === 'support' ? supportMatchesTags(entry, tags) : tags.every(tag => (entry.tags || []).includes(tag)))) return false;
  const required = entry.type === 'support' ? supportRules(entry).requiresTags : [];
  const haystack = [entry.name, entry.id, entry.description, ...(entry.tags || []), ...required, entry.faction, entry.baseName, entry.flavor, ...(entry.mods || []).map(mod => mod.text)].join(' ').toLowerCase();
  return !text || haystack.includes(text);
}
