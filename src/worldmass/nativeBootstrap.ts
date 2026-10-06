/** Native registration order shared by play and the isolated compiler worker.
 * No World construction, player state, storage, canvas or runtime RNG. Keep the
 * order: theater must precede warfront/pilgrimage. */
import '../data/clusters'; // side-effect: registers the data-driven cluster stamps
import '../data/formations'; // side-effect: registers the patterned formation stamps
import '../engine/landmarkBuilders'; // side-effect: registers the landmark shape builders
import '../data/landmarks'; // side-effect: registers the geographic landmark recipes
import '../data/lairs'; // side-effect: the true natives claim their ground (the lair fabric)
import '../engine/layoutRecipes'; // side-effect: registers the composed layout recipes
import '../engine/interiorGen'; // side-effect: registers the interior layouts (dungeon/labyrinth/edifice) + room roles
import '../data/massifs'; // side-effect: registers the massif mass kinds (+ the 'massif' recipe via engine/massif)
import '../data/watchposts'; // side-effect: registers the 'watch_post' ring tenant (the posted-watcher court)
import '../data/puzzles'; // native shrine tenant + fitted puzzle side registry, also imported by main's World graph
import '../data/occurrences'; // side-effect: registers the 'occurrence' ring tenant + the occurrence shelf (court tables name it)
import '../data/settled'; // side-effect: the settled-belt kit (+ the 'fields'/'district' recipes via engine/settled)
import '../data/garden'; // side-effect: the Garden country kit (kinds, formations, compositions, the nest role pool)
import '../data/catacombs'; // side-effect: the second under-country kit (the crypts lane, the lych way's span row)
import '../data/merelake'; // side-effect: the moonlit mere kit (the meadow's grotto lane, the mere court)
import '../data/cistern'; // side-effect: the cistern kit (the scald lake's grotto lane, the crone's court)
import '../data/lonecrypt'; // side-effect: the lone crypt kit (the exhumation's door, the resident pool, the unquiet yard)
import '../data/grove'; // side-effect: the Grove country kit (lantern flora, the hollow way down)
import '../data/theater'; // side-effect: THE THEATER FABRIC's default kinds+rows (siege/patrol re-founded — BEFORE warfront so kind priority stays sieges-first, as ever)
import '../data/warfront'; // side-effect: the Warfront country kit (siege furniture, the war column)
import '../data/scald'; // side-effect: the Scald Basin country kit (pool rows, mineral furniture, the meld, the basin's weather)
import '../data/greatgeyser'; // side-effect: THE GREAT GEYSER den lane (the mouth, the lair seat, the Geysermaw's ledger)
import '../data/scaldkit'; // side-effect: THE SCALD KIT K1 (the steam bank, the lacksStatus condition, the kit census)
import '../data/pilgrimage'; // side-effect: THE TERRACE PILGRIMAGE theater kind + rows (after data/theater — kind priority is registration order)
import '../data/compositions'; // side-effect: registers the whole-zone composition bundles
import '../data/fog'; // side-effect: registers the living fog bank kinds
import '../data/creeps'; // side-effect: registers the living creep kinds
import '../data/traversals'; // side-effect: registers the vertical-crossing kinds (sky launch/fall)
import '../data/glyphParts'; // side-effect: registers the shipped hand-drawn part kinds (the glyph roster)
import '../data/commanders'; // side-effect: the tutorial factions (the Fathers) + the prologue's resolve seam
import '../data/locales';
import '../data/authoredMaps'; // side-effect: THE AUTHORED-MAP FABRIC's shipped maps (+ the 'authored' layout via engine/authoredMaps)
import '../data/bountyJourneys';
import '../data/bountyExpeditions'; // side-effect: the bounty board's 'expedition' kind (an authored map minted at the take)
