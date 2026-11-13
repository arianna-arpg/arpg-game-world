// The landing-page rack needs all entries, but not the database's raw game objects.
// Project from the same normalized export so tooltip values and shuffle pools agree.
export function projectCollection({skills, supports, uniques}) {
  const pick = (entry, fields) => Object.fromEntries(fields.filter(key => entry[key] !== undefined).map(key => [key, entry[key]]));
  const common = ['id', 'name', 'icon', 'color', 'description', 'tags', 'requirements'];
  const gem = (entry, fields) => ({...pick(entry, fields), raw: pick(entry.raw || {}, ['color', 'requiresTags'])});
  return {
    skills: skills.map(entry => gem(entry, [...common, 'damageTypes', 'manaCost', 'cooldown', 'useTime', 'castMode', 'delivery'])),
    supports: supports.map(entry => gem(entry, common)),
    uniques: uniques.map(entry => ({...pick(entry, ['id', 'name', 'icon', 'color', 'baseName', 'category', 'flavor']),
      raw: pick(entry.raw || {}, ['color']),
      mods: (entry.mods || []).map(mod => pick(mod, ['text', 'min', 'local']))})),
  };
}
