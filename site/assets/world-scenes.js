/* The frontier story catalogue. Add one entry to add a selectable scene.
   Keep IDs stable; paths are relative to the homepage. Art is illustrative. */
export const WORLD_SCENES = Object.freeze([
  {
    "id": "discovery",
    "title": "Old stones and untamed country",
    "description": "Follow cracked causeways past frozen meres, timbered hollows, and buried courts. Every region holds its own hazards and rewards for those who linger.",
    "src": "assets/art/world/discovery.webp",
    "alt": "A traveler follows ancient steps through a ruined gateway toward a frozen lake",
    "caption": "Old paths into uncharted ground",
    "position": "55% 50%"
  },
  {
    "id": "conflict",
    "title": "Warring factions and roaming threats",
    "description": "Rival factions wage war over borderlands while warbands, spreading plagues, and roaming beasts cross your path. A road you cleared yesterday may be under siege tomorrow.",
    "src": "assets/art/world/conflict.webp",
    "alt": "Rival caravans cross a stormy fortress road as a huge creature emerges from the mist",
    "caption": "Shifting fronts across the map",
    "position": "48% 50%"
  },
  {
    "id": "refuge",
    "title": "Rest between the battles",
    "description": "Campfires and wayside shrines offer brief sanctuary in the wilds. Catch your breath, take stock of your spoils, and decide whether to press deeper or head back to town.",
    "src": "assets/art/world/refuge.webp",
    "alt": "A traveler shelters beside a campfire while mist gathers beyond a ruined arch",
    "caption": "A brief respite on a long expedition",
    "position": "60% 50%"
  }
].map(Object.freeze));
