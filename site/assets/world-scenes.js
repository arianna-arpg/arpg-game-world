/* The frontier story catalogue. Add one entry to add a selectable scene.
   Keep IDs stable; paths are relative to the homepage. Art is illustrative. */
export const WORLD_SCENES = Object.freeze([
  {
    "id": "discovery",
    "title": "Something beyond every turn",
    "description": "Forests, frozen lakes, ruined labyrinths. Explore connected regions and find places worth returning to.",
    "src": "assets/art/world/discovery.webp",
    "alt": "A lantern-bearing traveler follows ancient steps through a ruined gateway toward a frozen lake",
    "caption": "There is always another road",
    "position": "55% 50%"
  },
  {
    "id": "conflict",
    "title": "A frontier that fights back",
    "description": "Rival factions clash over territory. Roaming threats and world events can turn a familiar road into a very different fight.",
    "src": "assets/art/world/conflict.webp",
    "alt": "Rival caravans cross a stormy fortress road as a huge creature emerges from the mist",
    "caption": "The roads are never yours alone",
    "position": "48% 50%"
  },
  {
    "id": "refuge",
    "title": "Keep a light close",
    "description": "When the Gloaming falls, lamps and campfires become refuges. Decide how much farther you dare to go.",
    "src": "assets/art/world/refuge.webp",
    "alt": "A traveler shelters beside a campfire and lantern while the Gloaming gathers beyond a ruined arch",
    "caption": "A little light against the Gloaming",
    "position": "60% 50%"
  }
].map(Object.freeze));
