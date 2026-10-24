/** Original native sky methods at 588ea104, before shared local ownership. */
export const nativeSkyArchive={
  "skyFront": "skyFront(pos: Vec2 = this.player.pos): WeatherFront | null {\n    const mass = this.massRuntime;\n    if (mass?.weather) return mass.weather.sample(mass.walk.at(pos.x,pos.y), this.localZoneAt(pos), pos);\n    if (skyOf(this.zone) === 'sheltered') return null;\n    // EVENT-PINNED WEATHER (engine/eventWeather.ts): a world event holding this\n    // ground may pin its own front — a Demon Invasion's storm, an Incursion's\n    // pall — folded here so EVERY consumer of the sky (wash, particles, veil,\n    // radiance, wind, strikes, dress) reads one truth. Strongest wins: one sky\n    // at a time reads clean, and a raging blizzard can still drown a young\n    // storm's first minutes.\n    const pinned = eventFrontFor(this, this.zone);\n    const sky = this.sim.weather.sample(this.zone);\n    return pinned && pinned.intensity >= (sky?.intensity ?? 0) ? pinned : sky;\n  }",
  "radiance": "radiance(): number {\n    return radianceOf(this.time, this.skyFront()?.kind ?? null, skyOf(this.zone) === 'sheltered');\n  }",
  "radianceCondHeld": "radianceCondHeld(cond: RadianceCond | undefined): boolean {\n    return radianceCondHeld(cond, this.time, this.skyFront()?.kind ?? null, skyOf(this.zone) === 'sheltered');\n  }"
} as const;

export const nativeSkyModuleHashes={
  "src/engine/eventWeather.ts": "0655ef6f4105567b9273e178be06e33457461a27555ecc3cc81e101241865f7b",
  "src/data/scald.ts": "6c1430e18167d74225bea379c6da06267106f836ea55a813c1dc7dfeaf8946b4",
  "src/world/featureActivity.ts": "00cb1f7d82e4bf031f1957ddcc27ad0aafa7110182370aed13911cf100a40c1e",
  "src/packages/overlays/demonInvasion.ts": "f7ec3aa6a4fd162a84017554edbbab65d442da102b4d793eb5101f6620315e04",
  "src/packages/overlays/incursion.ts": "631c1e54acdd572539e72283462761146a4640efb6c0d5a6acf712e88fc0a9ed",
  "src/packages/overlays/quickening.ts": "ef26a44b1ba78060e4ba77e460e936ee4eed90105fea2e98a1a3dcce6eb740dd",
  "src/packages/overlays/mycelia.ts": "ed7f4497593021058fdfcd994960dbe882408cfd53f8230ea9995dc1bd3aaa90",
  "src/packages/overlays/hunt.ts": "6b0727c2051b9fb10fe722a7ae384fba9e88022bb6f9453eccfd11be52238ba7"
};
export const nativeSkyOtherWorldHash="668c4df21d9f4a4dc7b322914ef4804f70fc0712d42f868b1ea85f99fb6f6a0d";
export const nativeSkyOtherWorldCount=2351;
