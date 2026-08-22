// ---------------------------------------------------------------------------
// WEATHER — drifting fronts over the world-map node space.
//
// Weather is a set of moving cells, each a kind (rain, storm, fog, ashfall,
// blood moon) with a position and velocity in the SAME coordinate space the
// World Map draws zones in. Fronts are born at a random charted node, drift,
// swell and fade on a triangle of intensity, then dissipate. A zone's weather
// is the strongest front covering its node; that weather reweights the zone's
// spawn table toward whatever the storm stirs up, scaled by intensity. The
// front births and drift use the field's OWN seeded Rng so a run's weather is
// coherent and replayable; nothing here touches the global spawn rolls.
// ---------------------------------------------------------------------------

import { clamp, type Vec2 } from '../core/math';
import { Rng } from '../core/rng';
import { skyOf, type ZoneDef } from '../data/zones';
import { dayCycle, type DayPhase } from './daynight';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from './overlay';
import { scaledCap } from '../packages/frequency';

/** Weather kinds the engine registers out of the box ('clear' = no front). */
export type KnownWeatherKind = 'clear' | 'rain' | 'storm' | 'fog' | 'ashfall' | 'bloodmoon' | 'sandstorm';

/** Open weather vocabulary (mirrors StampKind): the known kinds keep
 *  autocomplete/typo resistance, and a kind added via registerWeather rides
 *  the same field. Boot validation (validateWeather) replaces the safety net
 *  the closed union provided. */
export type WeatherKind = KnownWeatherKind | (string & {});

export interface WeatherFront {
  kind: WeatherKind;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  /** 0..1 ramp: fades in, plateaus, fades out across its life. */
  intensity: number;
  age: number;
  life: number;
}

/** An environmental hazard a front rains down on whoever stands beneath it.
 *  Pure data (a skill id + cadence) so the engine, not weather, casts it —
 *  any front can be given one without weather knowing what a skill is. */
export interface WeatherStrike {
  skillId: string;
  radius: number;
  /** Telegraph time before the bolt lands (seconds). */
  telegraph: number;
  /** Strikes per second at FULL intensity (scaled down by the front's ramp). */
  ratePerSec: number;
  /** Reaches THROUGH roofs (default false: a roof shelters — World's
   *  Zone.spareRoofed gate, the strike-side twin of windAt's underRoofAt).
   *  The lever for a future kind whose wrath ignores shelter (a haunting
   *  rain, a curse that falls indoors) — data, never a code branch. */
  throughRoofs?: boolean;
  /** THE EFFECT VOICE (render/vis/effectVoice.ts): the registered painter
   *  this strike's landing flash speaks in. Unset derives the classic
   *  lightning bolt — the storm's own voice, which never needs a key;
   *  the lever exists for the skies that are NOT lightning (a blizzard's
   *  comet, a starfall's shard) to stop borrowing it. */
  fx?: string;
}

/** One kind of ground piece a weather front DRESSES its covered zone with —
 *  a registered doodad kind, planted while the front holds and DISSOLVED
 *  (Doodad.evap) when it passes. Rows are pure data; the machinery is the
 *  weather-dress fabric (engine/weatherDress.ts + World.updateWeatherDress). */
export interface WeatherDressRow {
  /** Registered doodad kind (validated at boot — doodadVisuals row required). */
  doodad: string;
  /** Pieces planted at full intensity (scaled down toward count[0] when faint). */
  count: [number, number];
  /** Doodad radius range. */
  radius: [number, number];
  /** Minimum spacing between pieces of THIS row (default WEATHER_DRESS_CFG.minGap). */
  minGap?: number;
  /** Solid rows additionally require a walkable RING around the seat so dress
   *  can never plug a lane (the placer's own belt; the kind's registered rule
   *  still decides actual collision — drawn == tested as everywhere). */
  solid?: boolean;
}

/** A front's whole dress kit + its thresholds. All dials optional — defaults
 *  ride WEATHER_DRESS_CFG so a bare `dress: { rows: [...] }` is a valid kit. */
export interface WeatherDressSpec {
  rows: WeatherDressRow[];
  /** Displayed-intensity gate to PLANT (default WEATHER_DRESS_CFG.plantAbove). */
  plantAbove?: number;
  /** Displayed-intensity gate to DISSOLVE (default WEATHER_DRESS_CFG.fadeBelow). */
  fadeBelow?: number;
  /** Dissolve speed in radius-units/sec (default WEATHER_DRESS_CFG.evapRate). */
  evapRate?: number;
}

export interface WeatherDef {
  label: string;
  /** Minimap cell + renderer wash tint. ('clear' keeps a token black — it is
   *  the absence of a front and never paints.) */
  color: string;
  /** Spawn-count multiplier at full intensity. */
  countMul: number;
  /** Per-faction weight multiplier at full intensity. */
  factionMul: Record<string, number>;
  /** Which day phases the sky may birth this front under, and how strongly it
   *  favours it there (maybeSpawn scans the registry; clear = simply fewer
   *  fronts). Omitted ⇒ never sky-born — only 'clear', the no-front sentinel,
   *  and eventOnly kinds should omit it (validateWeather warns otherwise). */
  skyWeight?: Partial<Record<DayPhase, number>>;
  /** EVENT-PINNED kind: the sky never births this front — a world EVENT pins
   *  it over the ground it holds (engine/eventWeather.ts sources folded at
   *  World.skyFront). Such kinds legitimately omit skyWeight; everything else
   *  about them (wash, particles, radiance, wind, strikes, dress) rides the
   *  same registry row as any sky-born front. */
  eventOnly?: boolean;
  /** TEMPORARY GROUND DRESS this front lays over the zones it covers — planted
   *  while it holds, dissolved (Doodad.evap) as it passes; nothing persists.
   *  The set-dressing half of the transience doctrine (docs/engine/transience.md):
   *  an event may FLAVOR the land it borrows, never repaint it. */
  dress?: WeatherDressSpec;
  /** Environmental strikes while you stand under this front (optional). */
  strike?: WeatherStrike;
  /** Fraction of the front's LIFE spent ramping in/out (default 0.4) — a
   *  storm that gathers in minutes vs one that breaks all at once is this
   *  one number. Pairs with the renderer's per-kind display crossfade. */
  rampFrac?: number;
  /** DIRECTIONAL WIND strength (0..1) this front drives at full intensity.
   *  The wind's DIRECTION is the front's own drift vector — the storm blows
   *  the way it travels. Consumed by World.windAt: headwinds slow movement,
   *  tailwinds hasten it, anchored solids upwind shelter you (WIND_CFG). */
  wind?: number;
  /** BIRTH GEOGRAPHY: climate-axis bands the BIRTH node's baked geo must
   *  satisfy for the sky to seed this kind THERE (a sandstorm rises from
   *  hot dry country — then drifts wherever its vector argues). Axes read
   *  def.geo.climate on the anchor node; nodes minted before climate
   *  baking pass neutrally (the tolerance doctrine). No draws added, so
   *  kinds without one keep their exact spawn streams. */
  birthGeo?: Record<string, { min?: number; max?: number }>;
  /** LINGER GEOGRAPHY — birthGeo's lifetime sibling: climate-axis bands
   *  that, where the BIRTH node's baked geo holds them, SCALE the front's
   *  rolled lifetime (fog born over the wet country settles in for hours;
   *  a snow front over the hot south burns off fast). Every band that
   *  holds multiplies in, folded ONCE at the birth roll — the front then
   *  carries its born lifetime wherever it drifts. Reads the same climate
   *  birthGeo reads with the same tolerance (unbaked node ⇒ neutral) and
   *  adds NO draws, so a kind without the row keeps its exact spawn
   *  stream; an eventOnly kind never meets it — its event owns its clock
   *  (validateWeather refuses the dead row). */
  lingerGeo?: Record<string, { min?: number; max?: number; mul: number }>;
  /** RADIANCE DIAL: how this front bends the sky's light while it covers a
   *  zone (world/radiance.ts — radiance = clamp01(max(light × mul, floor))).
   *  Omitted = light passes through. `mul` dims: rain greys the noon, a
   *  blood moon crushes the night blacker. `floor` LIFTS: a starfall makes
   *  midnight glitter brighter than dusk — the one night the star-bridges'
   *  neighbours may also stand. Read only by the radiance scalar. */
  radiance?: { mul?: number; floor?: number };
  /** THE WET SKY (the scald kit's wet read, sky half — World.updateWetSky):
   *  bodies standing under OPEN SKY beneath this front read as RAIN-WET
   *  (Actor.rainWet → Actor.isWet), the same wetness the water rows' stand
   *  states give — under scald, wet is the vulnerability (StatusDef.bank
   *  .wetMul). Rain, storm and the basin's mineral rain wear it; fog, snow,
   *  ash and the event palls do not. Pure data: a future shock-on-wet reads
   *  the same flag. */
  wets?: true;
}

/** THE WET SKY's dials (World.updateWetSky): how often the stamp sweeps and
 *  the front intensity below which a drizzle's edge does not wet. DIAL. */
export const WET_SKY = { sweepSec: 0.2, minIntensity: 0.25 } as const;

/** The registry of record — one row per weather kind. Every consumer is a
 *  WEATHER_DEFS[kind].<field> lookup (no code branches on a specific kind),
 *  so a net-new kind is pure data. */
export const WEATHER_DEFS: Record<WeatherKind, WeatherDef> = {
  clear: { label: 'Clear', color: '#000000', countMul: 1.0, factionMul: {} },
  rain: {
    radiance: { mul: 0.72 },
    label: 'Rain', color: '#4a6a9a', countMul: 1.05, factionMul: { sylvan: 1.3, wild: 1.15 },
    wind: 0.4, skyWeight: { day: 3, dusk: 2, night: 1, dawn: 2 },
    // Wet country's rains settle in — modest: rain is everyone's sky.
    lingerGeo: { moisture: { min: 0.55, mul: 1.15 } },
    wets: true,
  },
  storm: {
    radiance: { mul: 0.5 },
    wets: true,
    label: 'Storm', color: '#6a5ab0', countMul: 1.25, factionMul: { elemental: 1.8 },
    // The sky calls lightning down at random — more often the harder it rages.
    strike: { skillId: 'storm_call', radius: 80, telegraph: 0.7, ratePerSec: 1.3 },
    rampFrac: 0.15, // storms BREAK — a short gather, then full rage
    wind: 0.9,      // — and they SHOVE: the strongest gale in the sky
    skyWeight: { day: 1, dusk: 2, night: 3, dawn: 1 },
  },
  fog: {
    radiance: { mul: 0.62 },
    label: 'Fog', color: '#9aa0a8', countMul: 1.15, factionMul: { undead: 1.3, gnoll: 1.3 },
    rampFrac: 0.5, wind: 0.12, skyWeight: { day: 2, dusk: 3, night: 2, dawn: 3 },
    // Fog FEEDS on wet ground and burns off where it's hot — the marsh
    // keeps its banks for hours, the desert eats them by mid-morning.
    lingerGeo: { moisture: { min: 0.5, mul: 1.35 }, temperature: { min: 0.62, mul: 0.65 } },
  },
  ashfall: {
    radiance: { mul: 0.75 },
    label: 'Ashfall', color: '#b06a3a', countMul: 1.2, factionMul: { elemental: 1.4, goblin: 1.2 },
    wind: 0.3, skyWeight: { day: 1, dusk: 1 },
    // Damp air scrubs the ash down early — the cinder sky wants dry country.
    lingerGeo: { moisture: { min: 0.55, mul: 0.7 } },
  },
  bloodmoon: {
    radiance: { mul: 0.4 },
    label: 'Blood Moon', color: '#b03038', countMul: 1.6, factionMul: { undead: 2.0, wild: 1.3 },
    wind: 0.18, skyWeight: { night: 2 },
  },
  /** SNOWFALL — the accumulating front: while it covers a zone, ground snow
   *  builds (World.snowCover), deepening drifts that slow every walker and
   *  take pock-mark footprints; the cover then MELTS at the biome's own
   *  heat (ZoneTheme.heat — a taiga keeps it forever, a desert sheds it in
   *  moments). Gentle wind; drifts in slowly, day or night. */
  snow: {
    radiance: { mul: 0.85 },
    label: 'Snowfall', color: '#cfe0f0', countMul: 1.0, factionMul: { wild: 1.2, rimebound: 1.25 },
    wind: 0.45, rampFrac: 0.5, skyWeight: { day: 0.8, dusk: 1, night: 1 },
    // A snow front over the hot south is a curiosity, not a season (the
    // GROUND's persistence is the cover fabric's own heat law).
    lingerGeo: { temperature: { min: 0.62, mul: 0.6 } },
  },
  /** BLIZZARD — snowfall's violent sibling, born only over COLD ground
   *  (birthGeo reads the baked climate — the white wind rises off the
   *  tundra/taiga belt, then drifts where it argues). Its teeth: the WIND
   *  fabric at storm grade, comet-strikes that leave REAL slide-ice sheets
   *  (Icy Comet through the shared strike machinery — the sky lays the
   *  court's own ground), and the Rimebound hunting fat beneath it. Under a
   *  Deepwinter run the swell is the front's army answering its weather. */
  blizzard: {
    radiance: { mul: 0.55 },
    label: 'Blizzard', color: '#9fc8e8', countMul: 1.15,
    factionMul: { rimebound: 1.6, wild: 1.1 },
    strike: { skillId: 'icy_comet', radius: 80, telegraph: 0.9, ratePerSec: 0.4, fx: 'comet' },
    rampFrac: 0.25, wind: 0.95,
    skyWeight: { day: 0.5, dusk: 0.8, night: 0.9 },
    birthGeo: { temperature: { max: 0.35 } },
    // The deep-freeze belt keeps the white wind (inside the birth band).
    lingerGeo: { temperature: { max: 0.18, mul: 1.35 } },
  },
  /** SANDSTORM — the desert country's own front, born only over hot dry
   *  ground (birthGeo) and then going where it pleases. Its teeth are the
   *  WIND fabric (storm-grade shove: fight the headwind or put a rock
   *  between yourself and the sky — WIND_CFG shelter) and the gnolls who
   *  hunt inside it; the grit itself is the WEATHER_FX row. */
  sandstorm: {
    radiance: { mul: 0.6 },
    label: 'Sandstorm', color: '#c9a86a', countMul: 1.3,
    factionMul: { gnoll: 1.3 },
    rampFrac: 0.3, wind: 0.95,
    skyWeight: { day: 1.6, dusk: 1.2 },
    birthGeo: { temperature: { min: 0.55 }, moisture: { max: 0.4 } },
    // Fog's inverse: the deep erg keeps its grit aloft — bone-dry heat is
    // the storm's fuel (both bands live inside the birth bands; the rim
    // of the belt rolls today's modest storms).
    lingerGeo: { temperature: { min: 0.72, mul: 1.35 }, moisture: { max: 0.18, mul: 1.2 } },
  },
  /** GALE — the dry country's wind made a front of its own: no rain, no
   *  grit, just the SKY LEANING ON YOU. Born over dry ground away from the
   *  deep-hot sandstorm belt (birthGeo bands), its teeth are entirely the
   *  WIND fabric — headwind slog, gust shove, the lee of every boulder
   *  suddenly worth knowing — and on the mountain faces it feeds the
   *  windchill cadence (windAt strength IS the multiplier). The Mountains'
   *  and the Highlands' shared sky. */
  gale: {
    label: 'Gale', color: '#b8c4c8', countMul: 1,
    factionMul: {},
    rampFrac: 0.35, wind: 0.9,
    radiance: { mul: 0.92 },
    skyWeight: { day: 0.8, dusk: 1, night: 0.6 },
    birthGeo: { moisture: { max: 0.45 }, temperature: { max: 0.6 } },
    // The heights hold their winds — the mountain faces' standing gales.
    lingerGeo: { elevation: { min: 0.6, mul: 1.3 } },
  },
  /** PETALFALL — the Garden's own weather: the great blooms letting go at
   *  once, a pink-gold fall of petals drifting the whole sky. Born only
   *  over the mild damp belt (the garden's climate gate), day-leaning,
   *  barely dimming — the gentlest front in the registry, and the ground
   *  dress it leaves (petal_drift, dissolving as it dries) is the whole
   *  point: the country weathers in FLOWERS. */
  petalfall: {
    label: 'Petalfall', color: '#e8a8c8', countMul: 1,
    factionMul: { bloomkin: 1.25 },
    rampFrac: 0.45, wind: 0.35,
    radiance: { mul: 0.95 },
    skyWeight: { day: 1.2, dusk: 0.8 },
    birthGeo: { moisture: { min: 0.45 }, temperature: { min: 0.35, max: 0.72 } },
    dress: {
      rows: [{ doodad: 'petal_drift', count: [3, 6], radius: [16, 26], minGap: 160 }],
    },
  },
  /** HEMORRHAGE — the flesh country bleeding into its own sky: a slow red
   *  rain born only over deep wild ground (the country's wildness band),
   *  drifting at a wounded crawl. Its teeth are what it FEEDS — the Glut
   *  hunts fatter beneath it — and the red streak wash (WEATHER_FX) is the
   *  tell that you are inside the meat's own climate. */
  hemorrhage: {
    radiance: { mul: 0.65 },
    label: 'Blood Rain', color: '#a83a48', countMul: 1.25,
    factionMul: { flesh: 1.5 },
    rampFrac: 0.4, wind: 0.15,
    skyWeight: { dusk: 1.2, night: 1.4 },
    birthGeo: { wildness: { min: 0.62 } },
    // The meat's deep heart bleeds longest (inside the birth band).
    lingerGeo: { wildness: { min: 0.75, mul: 1.25 } },
  },
  /** STARFALL — the rare night the sky comes down in crystal. Its teeth are
   *  the STRIKE (falling shards through the shared strike machinery), and
   *  what the shards SEED: zones under the shower field the STARFALL COURT
   *  (World.materializeStarfall — crystal-forms grown from the impacts,
   *  sometimes around a standing FALLEN STAR heart). Two other systems'
   *  night — the shower and the court — from one registry row. */
  starfall: {
    radiance: { floor: 0.32 },
    label: 'Starfall', color: '#9ad4e8', countMul: 1.15,
    factionMul: { elemental: 1.4 },
    strike: { skillId: 'starfall_shard', radius: 70, telegraph: 0.9, ratePerSec: 0.5, fx: 'comet' },
    rampFrac: 0.35, wind: 0.15,
    skyWeight: { night: 1.1, dusk: 0.3 },
  },
  /** HELLSEAR — the wound's weather: a front born only over the deep wilds
   *  (the surface rift's home band) that tears the ground under whoever it
   *  crosses. Its teeth are the STRIKE (hate_eruption through the shared
   *  strike machinery — cold-green chaos tears, the torment lingering) and
   *  the Legion stirring beneath it. Starfall's grammar on demon ground. */
  hellsear: {
    radiance: { mul: 0.8 },
    label: 'Hellsear', color: '#7de84a', countMul: 1.2,
    factionMul: { demon: 1.35 },
    // No fx key ON PURPOSE (adjudicated 2026-08-02): the hate_eruption jag
    // stays the derived lightning tear — a sky-TEAR reads okay jagged, unlike
    // the blizzard/starfall comets above. The census is closed, not forgotten.
    strike: { skillId: 'hate_eruption', radius: 72, telegraph: 0.85, ratePerSec: 0.45 },
    rampFrac: 0.3, wind: 0.3,
    skyWeight: { night: 0.8, dusk: 0.45 },
    birthGeo: { wildness: { min: 0.5 } },
    // The deep wound sears longer (inside the birth band).
    lingerGeo: { wildness: { min: 0.7, mul: 1.2 } },
  },
  /** DEMON STORM — a Demon Invasion's OWN sky, pinned (never sky-born) over
   *  every zone its storm radius covers (packages/overlays/demonInvasion.ts
   *  event-front source; per-stage strength on InvasionStage.weather). The
   *  Helltide read: the LAND stays exactly what it was — the bruised light,
   *  the ember wind and the planted legion dress below are the whole
   *  occupation, and every piece of it lifts when the invasion breaks.
   *  Spawn muls stay NEUTRAL: the invasion overlay already tilts its covered
   *  zones (DemonSurge.stormFactionMul) — the weather row is presentation. */
  demonstorm: {
    radiance: { mul: 0.72 },
    label: 'Demon Storm', color: '#c22e30', countMul: 1.0, factionMul: {},
    wind: 0.25, rampFrac: 0.25,
    eventOnly: true,
    // THE TEMPORARY OCCUPATION KIT — existing underworld kinds only (a dress
    // row is data; a new look would be one doodadVisuals entry). Planted on
    // covered ground while the storm holds, evaporated as it lifts.
    dress: {
      rows: [
        { doodad: 'hell_fin', count: [2, 4], radius: [16, 24], minGap: 220, solid: true },
        { doodad: 'demon_banner', count: [2, 3], radius: [10, 12], minGap: 260, solid: true },
        { doodad: 'ember_fissure', count: [4, 7], radius: [14, 22], minGap: 150 },
      ],
    },
  },
  /** THE PALL — an Eldritch Incursion's air over ground its reach holds
   *  (IncursionArchetype.weather; strength = the zone's live influence, so
   *  the veil DEEPENS toward the epicenter and recedes as tentacles are
   *  cleansed back). Its ground flavor stays the incursion's own event kit
   *  (doodad mutation, tentacle fields) — the pall is the light going wrong. */
  eldritch_pall: {
    radiance: { mul: 0.78 },
    label: 'The Pall', color: '#6fc75f', countMul: 1.0, factionMul: {},
    wind: 0.1, rampFrac: 0.5,
    eventOnly: true,
  },
};

/** Register a weather kind under an open-string id (see WeatherKind) — one
 *  data row and the sky spawns it, the map tints it, spawn tables bend to it.
 *  (A particle look is one optional WEATHER_FX row; no entry = tint wash only.) */
export function registerWeather(id: string, def: WeatherDef): void {
  if (WEATHER_DEFS[id]) console.warn(`[weather] re-registering kind '${id}' — overriding`);
  WEATHER_DEFS[id] = def;
}

/** THE LINGER FOLD — the birth ground's climate scaling a front's rolled
 *  lifetime (WeatherDef.lingerGeo). Pure and draw-free: every band the baked
 *  climate HOLDS multiplies in; axes the node lacks pass neutrally and an
 *  unbaked node folds 1 (the tolerance doctrine birthGeo established). A def
 *  without the row returns exactly 1, so its stream is byte-identical by
 *  construction (x × 1 = x). Exported for the probe's pins. */
export function lingerMulOf(def: WeatherDef, climate: Record<string, number> | undefined): number {
  if (!def.lingerGeo || !climate) return 1;
  let mul = 1;
  for (const [axis, band] of Object.entries(def.lingerGeo)) {
    const v = climate[axis];
    if (v === undefined) continue;
    if (band.min !== undefined && v < band.min) continue;
    if (band.max !== undefined && v > band.max) continue;
    mul *= band.mul;
  }
  return mul;
}

/** BOOT VALIDATION (wired into validateContent beside validateStamps) — the
 *  cross-checks the closed union used to make unnecessary. The caller passes
 *  resolvers so this module stays data-import-free. */
export function validateWeather(
  hasSkill: (id: string) => boolean,
  hasDoodad?: (kind: string) => boolean,
): string[] {
  const bad: string[] = [];
  for (const [kind, def] of Object.entries(WEATHER_DEFS)) {
    if (def.strike && !hasSkill(def.strike.skillId)) {
      bad.push(`weather '${kind}': strike names unknown skill '${def.strike.skillId}'`);
    }
    // Sky-born kinds need a skyWeight; event-pinned kinds must NOT carry one
    // (an eventOnly front drifting in off the weather rng would fire outside
    // its event's lifetime — the transience contract broken by the sky itself).
    if (kind !== 'clear' && !def.eventOnly && !def.skyWeight) {
      bad.push(`weather '${kind}': no skyWeight — the sky can never birth it (only 'clear', the no-front sentinel, and eventOnly kinds omit one)`);
    }
    if (def.eventOnly && def.skyWeight) {
      bad.push(`weather '${kind}': eventOnly AND skyWeight — an event-pinned front must never be sky-born (drop one)`);
    }
    // THE LINGER FOLD's rows (lingerGeo): the fold reads only at sky birth,
    // so an event-pinned kind carrying one is dead data dressed as a lever
    // (its event owns its clock) — refused like its skyWeight sibling above.
    // A band must also be able to HOLD (min ≤ max) and scale by a sane
    // positive factor, or the row is a silent no-op / a zero-life front.
    if (def.eventOnly && def.lingerGeo) {
      bad.push(`weather '${kind}': eventOnly AND lingerGeo — an event-pinned front never rolls a sky lifetime (its event owns its clock; drop the linger row)`);
    }
    for (const [axis, band] of Object.entries(def.lingerGeo ?? {})) {
      if (!Number.isFinite(band.mul) || band.mul <= 0) {
        bad.push(`weather '${kind}': lingerGeo '${axis}' mul ${band.mul} — must be a finite positive scale`);
      }
      if (band.min !== undefined && band.max !== undefined && band.min > band.max) {
        bad.push(`weather '${kind}': lingerGeo '${axis}' band is inverted (min ${band.min} > max ${band.max})`);
      }
      // A linger band on a birth-banded axis must INTERSECT the birth band —
      // ground the birth gate already refuses can never seed this kind, so a
      // disjoint band could never fire (the fold reads the BIRTH node only).
      const bb = def.birthGeo?.[axis];
      if (bb) {
        const lo = Math.max(band.min ?? -Infinity, bb.min ?? -Infinity);
        const hi = Math.min(band.max ?? Infinity, bb.max ?? Infinity);
        if (lo > hi) {
          bad.push(`weather '${kind}': lingerGeo '${axis}' band never overlaps birthGeo's — it can never fire (the fold reads the birth node)`);
        }
      }
    }
    for (const row of def.dress?.rows ?? []) {
      if (hasDoodad && !hasDoodad(row.doodad)) {
        bad.push(`weather '${kind}': dress row names unregistered doodad kind '${row.doodad}'`);
      }
      if (row.count[0] > row.count[1] || row.radius[0] > row.radius[1]) {
        bad.push(`weather '${kind}': dress row '${row.doodad}' has an inverted count/radius range`);
      }
    }
  }
  return bad;
}

const STEP = 0.5;          // fixed lifecycle step (seconds)
const MAX_FRONTS = 4;
const SPAWN_CHANCE = 0.06; // per step, while under the cap — fronts are rarer now

export class WeatherField implements WorldOverlay {
  readonly id = 'weather' as const;
  readonly persistence = 'durable' as const; // the live fronts resume (snapshot below)
  readonly mapLabel = 'Weather';
  readonly fronts: WeatherFront[] = [];
  private rng: Rng;
  private acc = 0;
  /** Front-spawn-rate multiplier from the Storm Fronts package's pressure
   *  (set by WorldSim). 0 ⇒ no new fronts; 1 ⇒ today's cadence. */
  spawnScale = 1;
  /** Global concurrency crank (frequency.concurrency, set by WorldSim) — lifts the
   *  max-concurrent-fronts cap so a frequency boost shows more storms at once. */
  concurrencyScale = 1;

  constructor(rng: Rng) {
    this.rng = rng;
  }

  update(dt: number, view: OverlayView): void {
    // Drift and intensity advance smoothly every frame.
    for (const f of this.fronts) {
      f.pos.x += f.vel.x * dt;
      f.pos.y += f.vel.y * dt;
      f.age += dt;
      // Smooth ease in/out (smoothstep) over the kind's own ramp fraction,
      // so a fog seeps in over minutes while a storm gathers fast and BREAKS.
      const rampFrac = WEATHER_DEFS[f.kind].rampFrac ?? 0.4;
      const u = clamp(Math.min(f.age, f.life - f.age) / (f.life * rampFrac), 0, 1);
      f.intensity = u * u * (3 - 2 * u);
    }
    // Cull the spent.
    for (let i = this.fronts.length - 1; i >= 0; i--) {
      if (this.fronts[i].age >= this.fronts[i].life) this.fronts.splice(i, 1);
    }
    // Births happen on the fixed step.
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.maybeSpawn(view);
    }
  }

  onNodeCharted(): void {
    // Weather lives in shared node-space and covers any node by distance;
    // a new node needs no seeding.
  }

  /** WORLDSTATE: the live fronts are the field's whole durable state (the rng
   *  keeps rolling from its run-seeded stream — front birth is transient). */
  snapshot(): unknown {
    return { fronts: this.fronts.map(f => ({ ...f, pos: { ...f.pos }, vel: { ...f.vel } })) };
  }

  /** Rebuild the sky tolerantly: a front whose kind was unregistered since the
   *  save (or whose numbers don't parse) is simply gone — never a crash. */
  restore(snap: unknown): void {
    const s = snap as { fronts?: unknown[] } | null;
    if (!s || !Array.isArray(s.fronts)) return;
    this.fronts.length = 0;
    for (const raw of s.fronts) {
      const f = raw as Partial<WeatherFront> | null;
      if (!f || typeof f.kind !== 'string' || !WEATHER_DEFS[f.kind]) continue;
      if (!f.pos || !f.vel || ![f.pos.x, f.pos.y, f.vel.x, f.vel.y, f.radius, f.age, f.life]
        .every(n => typeof n === 'number' && Number.isFinite(n))) continue;
      if (this.fronts.length >= scaledCap(MAX_FRONTS, this.concurrencyScale)) break;
      this.fronts.push({
        kind: f.kind, pos: { x: f.pos.x, y: f.pos.y }, vel: { x: f.vel.x, y: f.vel.y },
        radius: f.radius!, intensity: clamp(f.intensity ?? 0, 0, 1),
        age: Math.max(0, f.age!), life: Math.max(1, f.life!),
      });
    }
  }

  /** The strongest front covering this zone's node, or null (= clear) — at
   *  its EDGE-FADED strength: the same linear rim falloff the selection has
   *  always scored by is now what the sample RETURNS (as a copy — the stored
   *  front keeps its raw time-ramped intensity). Without this, a drifting
   *  front's rim crossing the node stepped every consumer from null to FULL
   *  intensity in one frame: the whole-screen wash + particles slammed in
   *  and out (the "jarring muddied/fog-like overlay" playtest sighting),
   *  spawn bias over-applied at rims, and a rim-grazing front could
   *  flicker. Coverage now waxes from ~0 as a front arrives over the node
   *  and wanes as it leaves, continuous by construction. */
  sample(zone: ZoneDef): WeatherFront | null {
    let best: WeatherFront | null = null;
    let bestS = 0.04; // ignore trivially weak coverage
    for (const f of this.fronts) {
      const d = Math.hypot(f.pos.x - zone.map.x, f.pos.y - zone.map.y);
      if (d > f.radius) continue;
      const s = f.intensity * (1 - d / f.radius);
      if (s > bestS) { bestS = s; best = f; }
    }
    return best
      ? { ...best, pos: { ...best.pos }, vel: { ...best.vel }, intensity: bestS }
      : null;
  }

  affectSpawns(zone: ZoneDef): SpawnBias {
    // A SHELTERED zone (skyOf: caves, cellars, roofed tilesets, off-surface
    // dimensions) spawns as under a clear sky — the storm is not IN here,
    // whatever its front covers on the node map above.
    if (skyOf(zone) === 'sheltered') return NO_BIAS;
    const f = this.sample(zone);
    if (!f) return NO_BIAS;
    const def = WEATHER_DEFS[f.kind];
    const k = f.intensity;
    const factionMul: Record<string, number> = {};
    for (const [fac, m] of Object.entries(def.factionMul)) factionMul[fac] = 1 + (m - 1) * k;
    return { countMul: 1 + (def.countMul - 1) * k, factionMul, injectFactions: [] };
  }

  renderMap(): MapLayer {
    let under = '';
    for (const f of this.fronts) {
      const col = WEATHER_DEFS[f.kind].color;
      const op = (0.08 + 0.20 * f.intensity).toFixed(3);
      under += `<circle cx="${f.pos.x.toFixed(1)}" cy="${f.pos.y.toFixed(1)}" `
        + `r="${f.radius.toFixed(1)}" fill="${col}" fill-opacity="${op}">`
        + `<title>${WEATHER_DEFS[f.kind].label}</title></circle>`;
    }
    return { under, over: '' };
  }

  private maybeSpawn(view: OverlayView): void {
    if (this.fronts.length >= scaledCap(MAX_FRONTS, this.concurrencyScale)) return;
    if (view.nodes.length === 0) return;
    if (this.spawnScale <= 0) return;
    if (!this.rng.chance(SPAWN_CHANCE * this.spawnScale)) return;
    const node = this.rng.pick(view.nodes);
    const anchor = node.map;
    const phase = dayCycle(view.time).phase;
    // Scan the registry for this phase's sky candidates — a registered package
    // kind joins the rotation with no engine edit. Stable-sorted by descending
    // weight, which reproduces the retired KIND_WEIGHTS arrays exactly, so the
    // single weighted() draw below picks the same kind for existing seeds.
    // birthGeo kinds additionally require the anchor node's baked climate to
    // agree (a sandstorm needs desert under it to rise) — a filter, no draws.
    const sky = Object.entries(WEATHER_DEFS)
      .map(([kind, d]) => ({ kind, weight: d.skyWeight?.[phase] ?? 0 }))
      .filter(c => c.weight > 0)
      .filter(c => {
        const bg = WEATHER_DEFS[c.kind].birthGeo;
        if (!bg) return true;
        const cl = node.geo?.climate;
        if (!cl) return true; // unbaked node — the tolerance doctrine
        for (const [axis, band] of Object.entries(bg)) {
          const v = cl[axis];
          if (v === undefined) continue;
          if (band.min !== undefined && v < band.min) return false;
          if (band.max !== undefined && v > band.max) return false;
        }
        return true;
      })
      .sort((a, b) => b.weight - a.weight);
    if (!sky.length) return;
    const kind = this.rng.weighted(sky).kind;
    const dir = this.rng.range(0, Math.PI * 2);
    const speed = this.rng.range(1.5, 4.5); // node-units/sec — a slow, legible crawl
    this.fronts.push({
      kind,
      pos: { x: anchor.x + this.rng.range(-40, 40), y: anchor.y + this.rng.range(-40, 40) },
      vel: { x: Math.cos(dir) * speed, y: Math.sin(dir) * speed },
      radius: this.rng.range(95, 150),
      intensity: 0,
      age: 0,
      // Longer-lived fronts = slower-changing sky; THE LINGER FOLD
      // (lingerGeo) then scales the rolled draw by the birth ground's
      // climate — same node + tolerance as the birthGeo filter above,
      // zero added draws, so a kind without the row keeps today's
      // exact stream (× 1 is byte-identical).
      life: this.rng.range(140, 280) * lingerMulOf(WEATHER_DEFS[kind], node.geo?.climate),
    });
  }
}
