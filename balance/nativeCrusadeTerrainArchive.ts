export interface NativeCrusadeTerrainRow {file:string;rawBeforeHash:string;rawAfterHash:string;beforeHash:string;afterHash:string;crlfLines:number[];hunks:{before:string;after:string}[]}
export interface NativeCrusadeTerrainArchive {parent:unknown;incoming:string;rows:NativeCrusadeTerrainRow[];readers:{file:string;before:string;after:string;edits:{before:string;after:string}[];original:string;nonImportHash:string;assertionHash:string;assertions:number}[];archives:{file:string;sha256:string}[];runtime:{file:string;sha256:string}[];accepted:{file:string;sha256:string}[];unchanged:{file:string;sha256:string}[];probes:string[]}
export const nativeCrusadeTerrainArchive:NativeCrusadeTerrainArchive = {
  "parent": "8c525cb2b1fbbd06b521b14fbf3b3c66e773da35459fcca3fc21f93b4cdf6d5a",
  "incoming": "c5ac20fc8470f1325a0fb0c2ae6bfdd2b479346466a9698a523f33962e49bf47+19dde951f14dd6d4d4da9b556e7723c1280d14bf308fa8b20850a530b8a017f8+2fda6871135a31e2031f758e721376ad532e891eab906aa946a72838e9ce8afa+2d2934de3347da2660765606b32718a59eef0b6d6747c01d33ebe73aefaf6043",
  "rows": [
    {
      "file": "CLAUDE.md",
      "rawBeforeHash": "16695e7f1270703be43ad4049bb55b707373a9c9ebcd30b4344986984bacdfcb",
      "rawAfterHash": "3addbb3e67ca0b9690b9a79f2e4010eefa6dfc39e1d69253976978e5599abb47",
      "beforeHash": "16695e7f1270703be43ad4049bb55b707373a9c9ebcd30b4344986984bacdfcb",
      "afterHash": "3addbb3e67ca0b9690b9a79f2e4010eefa6dfc39e1d69253976978e5599abb47",
      "crlfLines": [],
      "hunks": [
        {
          "before": "Retained Hunt departures now release only their own completed migration marker,\nso a wounded quarry can return to visited ground and finish once. Preserve actual\nretirement, event identity, cornered bodies, native failures and original source\nassertions. Verify nativehuntmigration/source, independent departure boundaries,\nretained AI/travel, all four types and boot. Terrain and scheduler work remain\n",
          "after": "Retained Crusade works now renew on a genuine unoccupied arrival when their\nevent, tier or resolved plan changes. Preserve unrelated terrain and bodies,\nopened doors, native callback failures, partial insertion, cold fixture\ncorrespondence and the complete current-zone restored enemy census. Verify nativecrusadeterrain*, original epoch/cold/gate courses,\nall source proofs, generation, all four types and boot. Saved fixture metadata\nis correspondence, not proof of origin. See\ndocs/worldgen/native-crusade-terrain-lifetime.md.\n\nRetained Hunt departures now release only their own completed migration marker,\nso a wounded quarry can return to visited ground and finish once. Preserve actual\nretirement, event identity, cornered bodies, native failures and original source\nassertions. Verify nativehuntmigration/source, independent departure boundaries,\nretained AI/travel, all four types and boot. Terrain and scheduler work remain\n"
        }
      ]
    },
    {
      "file": "balance/nativeHuntMigrationFixture.ts",
      "rawBeforeHash": "03e029846cf9e8416172481115be084e643aef19b252102cc98f287a38fedda9",
      "rawAfterHash": "6a7bd2c0ee29c7c905497dc44ef2d9cc9a1fe368daf6a8fd68da879ba4236738",
      "beforeHash": "04c0adc46487e219bb47f2dfa452d1c2398f8ce1d37271d60914657b0c5906a2",
      "afterHash": "39b3f98ac1f881e7ea208f2f7413633a3c0aa7f664f84d233106525268fae3f1",
      "crlfLines": [
        40
      ],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport {nativeHuntMigrationArchive as archive} from './nativeHuntMigrationArchive';\nconst hash=(text:string)=>createHash('sha256').update(text).digest('hex'),normal=(text:string)=>text.replace(/\\r\\n?/g,'\\n');\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeCrusadeTerrainFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport {nativeHuntMigrationArchive as archive} from './nativeHuntMigrationArchive';\nconst hash=(text:string)=>createHash('sha256').update(text).digest('hex'),normal=(text:string)=>text.replace(/\\r\\n?/g,'\\n');\n"
        }
      ]
    },
    {
      "file": "balance/probe_nativehuntmigrationsource.ts",
      "rawBeforeHash": "f2d25b467f17afc6d1c6c9e6e578fbc5a13bca79cf3fe8e89937a1b2a834177f",
      "rawAfterHash": "ce3e777895f577de81eee0c4c39f0cbbb007e6317df2c0f830d6a702da4ae7ba",
      "beforeHash": "f043008f93308d87d39d91639750af9f1f98a055a2dc4b4c62a4e8f1fd03426a",
      "afterHash": "46e6080a821d229a7da86a70e89ad01d3b3758180b7419b7a1f88a816f126423",
      "crlfLines": [
        53
      ],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';\nimport * as oldFs from 'node:fs';\nimport * as boundaryFs from './nativeHuntMigrationFS';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeCrusadeTerrainFS';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';\nimport * as oldFs from 'node:fs';\nimport * as boundaryFs from './nativeHuntMigrationFS';\n"
        }
      ]
    },
    {
      "file": "balance/proberoster.ts",
      "rawBeforeHash": "ba788f91c73b6d469fce7035a3fc5ecbedf56f672650986f51a825dea4be6489",
      "rawAfterHash": "67a74a97805f8bd51585df4e54ed66b5cd512ca4346d3c7df923f94411a1cb05",
      "beforeHash": "ba788f91c73b6d469fce7035a3fc5ecbedf56f672650986f51a825dea4be6489",
      "afterHash": "67a74a97805f8bd51585df4e54ed66b5cd512ca4346d3c7df923f94411a1cb05",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/**\n * THE ROSTER. Alphabetical, one row per file in balance/. `why` is one line:\n * for green rows, what the rig pins; for excluded rows, why it is off the gate.\n */\nexport const PROBE_ROSTER: readonly ProbeRow[] = [\n  { probe: 'probe_nativehuntmigration.ts', status: 'green', tier: 'fast', why: 'Retained Hunt migration and once-only completion; original source assertions preserved.' },\n  { probe: 'probe_nativehuntmigrationsource.ts', status: 'green', tier: 'fast', why: 'Retained Hunt migration and once-only completion; original source assertions preserved.' },\n  { probe: 'probe_nativerealmgateboundaries.ts', status: 'green', tier: 'fast', why: 'Reviewed repeat-event gate, garrison and commander ownership; original assertions preserved.' },\n  { probe: 'probe_nativerepeatcrusade.ts', status: 'green', tier: 'fast', why: 'Reviewed repeat-event gate, garrison and commander ownership; original assertions preserved.' },\n  { probe: 'probe_nativerepeatdemon.ts', status: 'green', tier: 'fast', why: 'Reviewed repeat-event gate, garrison and commander ownership; original assertions preserved.' },\n",
          "after": "/**\n * THE ROSTER. Alphabetical, one row per file in balance/. `why` is one line:\n * for green rows, what the rig pins; for excluded rows, why it is off the gate.\n */\nexport const PROBE_ROSTER: readonly ProbeRow[] = [\n  { probe: 'probe_criticcrusadeterraincold.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_criticcurrentcontinue175.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_criticcurrentevent175.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_criticcurrentspent175.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_nativecrusadecurrentcallbacks.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_nativecrusadecurrentcontinue.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_nativecrusaderestorationcompletion.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_nativecrusadeterrainboundaries.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_nativecrusadeterraincallbacks.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_nativecrusadeterraincold.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_nativecrusadeterrainprovenance.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_nativecrusadeterrainwitness.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_criticcurrentdoor183.ts', status: 'green', tier: 'slow', why: 'Actual saved Crusade door selection validates the event before the selected callback and preserves completed writes.' },\n  { probe: 'probe_nativecrusadeterrainsource.ts', status: 'green', tier: 'slow', why: 'Retained Crusade works renewal, exact fixture ownership and original source assertions.' },\n  { probe: 'probe_nativehuntmigration.ts', status: 'green', tier: 'fast', why: 'Retained Hunt migration and once-only completion; original source assertions preserved.' },\n  { probe: 'probe_nativehuntmigrationsource.ts', status: 'green', tier: 'fast', why: 'Retained Hunt migration and once-only completion; original source assertions preserved.' },\n  { probe: 'probe_nativerealmgateboundaries.ts', status: 'green', tier: 'fast', why: 'Reviewed repeat-event gate, garrison and commander ownership; original assertions preserved.' },\n  { probe: 'probe_nativerepeatcrusade.ts', status: 'green', tier: 'fast', why: 'Reviewed repeat-event gate, garrison and commander ownership; original assertions preserved.' },\n  { probe: 'probe_nativerepeatdemon.ts', status: 'green', tier: 'fast', why: 'Reviewed repeat-event gate, garrison and commander ownership; original assertions preserved.' },\n"
        },
        {
          "before": "  { probe: 'probe_speechapproach.ts', status: 'green', tier: 'fast', why: 'Native selected-speaker approach hint: idle grace, pure reads, authored opt-out, live reach/story/roof, death, stale focus and retirement on dialogue readiness' },\n  { probe: 'probe_worldmass_floorwork.ts', status: 'green', tier: 'fast', why: 'Budgeted floor preparation, atomic publication, cold fallback, invalidation and shared residency cap' },\n  { probe: 'probe_worldmass_dirtyterrain.ts', status: 'green', tier: 'fast', why: 'Scoped page/sample invalidation, preserved pending work, older and failed restore, painter halo and cache ownership' },\n  { probe: 'probe_rewardlabels.ts', status: 'green', tier: 'fast', why: 'Persistent loot label packing, native identity attribution, visible-space refusal, bounded retention and old/new snapshot shells' },\n  { probe: 'probe_puzzlecalm.ts', status: 'green', tier: 'fast', why: 'Real native riddle contact preserves existing combat heat, immediate support fitting, hostile and forged-node refusal, configurable policy and save purity' },\n  { probe: 'probe_nerverecovery.ts', status: 'green', tier: 'fast', why: 'Native wounded skirmisher returns to casting after finite panic at three frame rates; exact initial rout, courage boundaries and healing rearm.' },\n  { probe: 'probe_frayingnerve.ts', status: 'green', tier: 'fast', why: 'Fraying courage retains native retaliatory openings, exact healthy/routed/leader conduct and generated-country Warrior pursuit' },\n  { probe: 'probe_foragercommitment.ts', status: 'green', tier: 'fast', why: 'Native generated patrol commitment across three approaches, scoped melee tactics, unchanged ranged/ordinary packs, leader-loss opening and wounded Continue.' },\n  { probe: 'probe_worldmass_caravan.ts', status: 'green', tier: 'fast', why: 'Native caravan role admission, actual mending/melee/arrows, one-shot support contrast, wounded Continue and old rosters' },\n  { probe: 'probe_worldmass_foragers.ts', status: 'green', tier: 'fast', why: 'Native authored patrol gates, five camp admissions, leader morale, mixed attacks, wounded Continue, atomic seating and legacy rosters' },\n  { probe: 'probe_worldmass_accord.ts', status: 'green', tier: 'fast', why: 'Native paired court, fixed geometry, partial clocks/bound pairs, pure checkpoints, current and legacy Continue, shared reward and population gates' },\n  { probe: 'probe_procreference.ts', status: 'green', tier: 'fast', why: 'Item proc references follow native payload/gate data, all twelve proc affixes, pure live retunes, duplicate and bounded Unicode handling' },\n  { probe: 'probe_worldmass_puzzlerewards.ts', status: 'green', tier: 'fast', why: 'Native puzzle loot and attunement persist without retired support choices' },\n",
          "after": "  { probe: 'probe_speechapproach.ts', status: 'green', tier: 'fast', why: 'Native selected-speaker approach hint: idle grace, pure reads, authored opt-out, live reach/story/roof, death, stale focus and retirement on dialogue readiness' },\n  { probe: 'probe_worldmass_floorwork.ts', status: 'green', tier: 'fast', why: 'Budgeted floor preparation, atomic publication, cold fallback, invalidation and shared residency cap' },\n  { probe: 'probe_worldmass_dirtyterrain.ts', status: 'green', tier: 'fast', why: 'Scoped page/sample invalidation, preserved pending work, older and failed restore, painter halo and cache ownership' },\n  { probe: 'probe_rewardlabels.ts', status: 'green', tier: 'fast', why: 'Persistent loot label packing, native identity attribution, visible-space refusal, bounded retention and old/new snapshot shells' },\n  { probe: 'probe_puzzlecalm.ts', status: 'green', tier: 'fast', why: 'Real native riddle contact preserves existing combat heat, immediate support fitting, hostile and forged-node refusal, configurable policy and save purity' },\n  { probe: 'probe_nerverecovery.ts', status: 'excluded', excuse: 'red', why: 'Original generated-country old-rule negative control fails on foundation 0c1d154c; phase180 preserved, diagnosis pending.' },\n  { probe: 'probe_frayingnerve.ts', status: 'green', tier: 'fast', why: 'Fraying courage retains native retaliatory openings, exact healthy/routed/leader conduct and generated-country Warrior pursuit' },\n  { probe: 'probe_foragercommitment.ts', status: 'excluded', excuse: 'red', why: 'Original seed 451 melee-commitment comparison fails on foundation 0c1d154c; phase180 preserved, diagnosis pending.' },\n  { probe: 'probe_worldmass_caravan.ts', status: 'green', tier: 'fast', why: 'Native caravan role admission, actual mending/melee/arrows, one-shot support contrast, wounded Continue and old rosters' },\n  { probe: 'probe_worldmass_foragers.ts', status: 'green', tier: 'fast', why: 'Native authored patrol gates, five camp admissions, leader morale, mixed attacks, wounded Continue, atomic seating and legacy rosters' },\n  { probe: 'probe_worldmass_accord.ts', status: 'green', tier: 'fast', why: 'Native paired court, fixed geometry, partial clocks/bound pairs, pure checkpoints, current and legacy Continue, shared reward and population gates' },\n  { probe: 'probe_procreference.ts', status: 'green', tier: 'fast', why: 'Item proc references follow native payload/gate data, all twelve proc affixes, pure live retunes, duplicate and bounded Unicode handling' },\n  { probe: 'probe_worldmass_puzzlerewards.ts', status: 'green', tier: 'fast', why: 'Native puzzle loot and attunement persist without retired support choices' },\n"
        },
        {
          "before": "  { probe: 'probe_worldmass_dormancypinattribution.ts', status: 'green', tier: 'fast', why: 'Immutable data-only pin certificates preserve uncached actor dependency sets across real terrain, late owners, numeric IDs, weak ledgers, mutable collections, cycles and getters.' },\n  { probe: 'probe_worldmass_processionsources.ts', status: 'green', tier: 'fast', why: 'Pinned open native source inventory, exact historical hold lottery, combined single-zone selection and frozen source receipts.' },\n  { probe: 'probe_worldmass_processionroutes.ts', status: 'green', tier: 'fast', why: 'Dry body/corridor/apron capsule routes across native chunks, bounded pure planning, reservation and coherent proof rejection.' },\n  { probe: 'probe_worldmass_processionworker.ts', status: 'green', tier: 'fast', why: 'Real isolated worker and cooperative fallback parity, bounded envelopes, stale replies, disposal and source identity.' },\n  { probe: 'probe_worldmass_processions.ts', status: 'green', tier: 'fast', why: 'Independent native escort driver and RNG traces, actual cart/ambush factory parity, kept native roads and original ground behavior.' },\n  { probe: 'probe_worldmass_processioncontinuity.ts', status: 'green', tier: 'fast', why: 'Independent native carts, reserved ambushes, real dependency pins, wounds, absence and once arrival/loss ownership.' },\n  { probe: 'probe_worldmass_processiongameplay.ts', status: 'green', tier: 'fast', why: 'Natural full-runtime route detours around existing scenery, complete atomic admission, exact saved roads and wounded CharacterSave Continue.' },\n  { probe: 'probe_worldmass_nativeingress.ts', status: 'green', tier: 'fast', why: 'Real native exterior body-clear ingress, bounded route proof, terrain refusals, reserved corridors and exact saved acceptance.' },\n  { probe: 'probe_worldmass_foci.ts', status: 'green', tier: 'fast', why: 'Independent cluster budgets, union pages, overlap, casualty/reload identity and exact observer broad phase.' },\n  { probe: 'probe_worldmass_checkpoint.ts', status: 'green', tier: 'fast', why: 'Land-free checkpoints preserve consequences and cold restore while refusing changed presets.' },\n  { probe: 'probe_sharddiet.ts', status: 'green', tier: 'fast', why: 'THE WIRE DIET (shard sync pass C, docs/engine/shard.md): a hosted world\\'s frames per audience. Two seats standing together share ONE encoded body a snapshot and a far seat its own; a foe near the far seat rides its frames alone; every far seat rides as a far-roster row (place, name, pools) and a shell keeps every name; a party mate\\'s surroundings ride and the party shares a body; the own court rides wherever it stands; a lite body keeps its wire id and a shell glides it under THE FORWARD LAW; every inflated row equals the host\\'s canonical row with the quantized fields inside their grids (0.25 px, 1/512 turn) and a shell draws both alike; a doodad added, removed or swapped in place rides the next snapshot\\'s dd rows, a delta lands on every arrival in the shard\\'s order (even one the shell does not adopt), a felled one its fell row, the zone never re-ships for churn and the shell holds the host\\'s ground (the ledger\\'s row is serializeZone\\'s twin) while a zone change ships the zone; a client that stops acking gets at most maxUnacked + 1 frames, and its changed build and dress carry into the frame that resumes it, its buyer\\'s own shelf row too (F2, W9\\'s finding); the hit flash glides on a hosted shell' },\n",
          "after": "  { probe: 'probe_worldmass_dormancypinattribution.ts', status: 'green', tier: 'fast', why: 'Immutable data-only pin certificates preserve uncached actor dependency sets across real terrain, late owners, numeric IDs, weak ledgers, mutable collections, cycles and getters.' },\n  { probe: 'probe_worldmass_processionsources.ts', status: 'green', tier: 'fast', why: 'Pinned open native source inventory, exact historical hold lottery, combined single-zone selection and frozen source receipts.' },\n  { probe: 'probe_worldmass_processionroutes.ts', status: 'green', tier: 'fast', why: 'Dry body/corridor/apron capsule routes across native chunks, bounded pure planning, reservation and coherent proof rejection.' },\n  { probe: 'probe_worldmass_processionworker.ts', status: 'green', tier: 'fast', why: 'Real isolated worker and cooperative fallback parity, bounded envelopes, stale replies, disposal and source identity.' },\n  { probe: 'probe_worldmass_processions.ts', status: 'green', tier: 'fast', why: 'Independent native escort driver and RNG traces, actual cart/ambush factory parity, kept native roads and original ground behavior.' },\n  { probe: 'probe_worldmass_processioncontinuity.ts', status: 'excluded', excuse: 'red', why: 'Original natural seed 713 cart admission fails after 5000 steps on foundation 0c1d154c; earlier 12 cases pass, phase180 preserved.' },\n  { probe: 'probe_worldmass_processiongameplay.ts', status: 'green', tier: 'fast', why: 'Natural full-runtime route detours around existing scenery, complete atomic admission, exact saved roads and wounded CharacterSave Continue.' },\n  { probe: 'probe_worldmass_nativeingress.ts', status: 'green', tier: 'fast', why: 'Real native exterior body-clear ingress, bounded route proof, terrain refusals, reserved corridors and exact saved acceptance.' },\n  { probe: 'probe_worldmass_foci.ts', status: 'green', tier: 'fast', why: 'Independent cluster budgets, union pages, overlap, casualty/reload identity and exact observer broad phase.' },\n  { probe: 'probe_worldmass_checkpoint.ts', status: 'green', tier: 'fast', why: 'Land-free checkpoints preserve consequences and cold restore while refusing changed presets.' },\n  { probe: 'probe_sharddiet.ts', status: 'green', tier: 'fast', why: 'THE WIRE DIET (shard sync pass C, docs/engine/shard.md): a hosted world\\'s frames per audience. Two seats standing together share ONE encoded body a snapshot and a far seat its own; a foe near the far seat rides its frames alone; every far seat rides as a far-roster row (place, name, pools) and a shell keeps every name; a party mate\\'s surroundings ride and the party shares a body; the own court rides wherever it stands; a lite body keeps its wire id and a shell glides it under THE FORWARD LAW; every inflated row equals the host\\'s canonical row with the quantized fields inside their grids (0.25 px, 1/512 turn) and a shell draws both alike; a doodad added, removed or swapped in place rides the next snapshot\\'s dd rows, a delta lands on every arrival in the shard\\'s order (even one the shell does not adopt), a felled one its fell row, the zone never re-ships for churn and the shell holds the host\\'s ground (the ledger\\'s row is serializeZone\\'s twin) while a zone change ships the zone; a client that stops acking gets at most maxUnacked + 1 frames, and its changed build and dress carry into the frame that resumes it, its buyer\\'s own shelf row too (F2, W9\\'s finding); the hit flash glides on a hosted shell' },\n"
        }
      ]
    },
    {
      "file": "docs/engine/foundation-shard-alignment.md",
      "rawBeforeHash": "4a8352950ad734e0df16bc049b6e9be13392266b36ba6dde6dd36c5b7ca47a8f",
      "rawAfterHash": "042e9d77d700436bab0e27ccd5dac085b10e674402f6d790683240b1eeed911d",
      "beforeHash": "03a8f65b775d334dd8541c73f8573ff280d5e266be62c2d6cf5afa7a3c230168",
      "afterHash": "f04324b3aec590d28b4a931c76574e27e5fa32d950b5bec15bb6d95017728b1a",
      "crlfLines": [
        58
      ],
      "hunks": [
        {
          "before": "\n## Performance branch handoff\n\nThe separate reconciliation lane has now merged `codex/shard-performance` (`f967869c`) into `shard-world` as `d025d99fa167692405403e4106c04d4379542b1c`. This supersedes the earlier unmerged status. Its recorded handoff is `docs/design/shard-world.md` §7g and `docs/engine/shard-runtime-foundation.md` on that branch.\n\nThat lane restored the arrival/history/Titan projected goldens, adopted compact ZoneW/zonePaint with protocol 6, reconciled browser opening and optional Node terrain preparation, and capped derived per-focus caches at twice their single-focus capacity. It separately supplies F1/F3; the two implementations require deliberate reconciliation when the foundation lands, rather than assuming byte identity. Its host governor remains separate work. The alignment review recommends keeping the foundation's single-read/private budget storage and one-pass statistics, as well as the narrow World input signatures needed by retained-area callers. Shards additionally salts hosted posting IDs with the character key while the foundation currently salts the draw. Preserve existing held/standing postings during that identity reconciliation; this is a merge contract choice, not a demonstrated broken current slate.\n\nThe lane records 23/23 shard probes, 139 green worldmass probes, types, build, generation, simulation smoke, boot and renderer courses. Five restored checks remain explicitly red: foragercommitment, nerverecovery, worldmass_processioncontinuity, nativeinstalledsources and nativescenesky. These are unresolved original assertions, not part of the green count. The first boot-menu failure and unchanged successful reruns are documented.\n\nIts post-merge measurements use two serial six-bot, 60-second measured windows, with reconnect, both optional experiments disabled and the population budget unset:\n\n",
          "after": "\n## Performance branch handoff\n\nThe separate reconciliation lane has now merged `codex/shard-performance` (`f967869c`) into `shard-world` as `d025d99fa167692405403e4106c04d4379542b1c`. This supersedes the earlier unmerged status. Its recorded handoff is `docs/design/shard-world.md` §7g and `docs/engine/shard-runtime-foundation.md` on that branch.\n\nThat lane restored the arrival/history/Titan projected goldens, adopted compact ZoneW/zonePaint with protocol 6, reconciled browser opening and optional Node terrain preparation, and capped derived per-focus caches at twice their single-focus capacity. It separately supplies F1/F3; the two implementations require deliberate reconciliation when the foundation lands, rather than assuming byte identity. The later pinned shard update below records its governor integration. The alignment review recommends keeping the foundation's single-read/private budget storage and one-pass statistics, as well as the narrow World input signatures needed by retained-area callers. Shards additionally salts hosted posting IDs with the character key while the foundation currently salts the draw. Preserve existing held/standing postings during that identity reconciliation; this is a merge contract choice, not a demonstrated broken current slate.\n\nThe lane records 23/23 shard probes, 139 green worldmass probes, types, build, generation, simulation smoke, boot and renderer courses. Five restored checks remain explicitly red: foragercommitment, nerverecovery, worldmass_processioncontinuity, nativeinstalledsources and nativescenesky. These are unresolved original assertions, not part of the green count. The first boot-menu failure and unchanged successful reruns are documented.\n\nIts post-merge measurements use two serial six-bot, 60-second measured windows, with reconnect, both optional experiments disabled and the population budget unset:\n\n"
        },
        {
          "before": "| Clustered | 34.22 ms | 10.77% | 18.11 MB |\n| Spread 3500 | 250.70 ms | 88.39% | 54.21 MB |\n\nBoth runs breach the unchanged tick-p95 and dropped-tick gates, with zero faults or harness errors and same-seat reconnect passing. These are the other lane's recorded integration results, not a new foundation rerun or a controlled comparison attributing an improvement/regression. The older concurrent-control results remain in that lane's history; none establish deployed capacity or 60 Hz.\n\n## Foundation merge coordination\n\nThis foundation session has not performed a merge or resolved conflicts. A fresh dry run of foundation `a00566963438a19e7d437e0f75f02623be8e3faf` into shard-world `d025d99fa167692405403e4106c04d4379542b1c` found **32** conflicting files. The original 24-file estimate and the later 27-file inventory were from older tips. The shard lane has independently completed its performance-branch merge, as recorded above. Later commits require another dry run.\n\nBefore resolving that merge, notify the shard lane and agree ownership; shard-owned files remain for that lane to resolve. This written handoff does not claim that an external Claude session has received a message.\n\n## Remaining scope\n\nThe foundation now includes F1/F3, repeat Crusade/Demon entrance renewal, and event-owned Crusade garrisons/commander attribution. Existing realm occupants, wounds and ordinary death effects remain intact. Crusade terrain/structure renewal is a separate known parity gap. Dedicated retained-area scheduling remains excluded pending the correction described below.\n\nThe retained scheduler candidate was measured against foundation `2f9d4cbb` with equal actual populations, two real TCP clients (eight in the last case), 40 warm-up and 80 measured frames per host, and alternating host order. This is a same-process diagnostic, not a concurrent deployment soak:\n\n| Course | p95 baseline → scheduler candidate | Actors in each host |\n| --- | --- | --- |\n",
          "after": "| Clustered | 34.22 ms | 10.77% | 18.11 MB |\n| Spread 3500 | 250.70 ms | 88.39% | 54.21 MB |\n\nBoth runs breach the unchanged tick-p95 and dropped-tick gates, with zero faults or harness errors and same-seat reconnect passing. These are the other lane's recorded integration results, not a new foundation rerun or a controlled comparison attributing an improvement/regression. The older concurrent-control results remain in that lane's history; none establish deployed capacity or 60 Hz.\n\n## Latest shard asks and foundation replay\n\nRead-only inspection of shard-world at `beb1d978855035cb86e3b1bf4b0120a55449303c` records that W1 now feeds the host governor from the actual tick and uses its population-budget API. F9 asks for a cache byte/count budget and a 600-second soak; F13 asks for per-actor terrain/solid memoization. W2/W3 worker hosting still needs an agreed foundation runtime boundary. Those performance requests remain separate from content acceptance.\n\nThe foundation replay pins `0c1d154c3b0e2b40748497a897979e9f18a79224` (the accepted Hunt composition), with every source file checked before and after all six courses. It observes:\n\n| Original check | Foundation result |\n| --- | --- |\n| foragercommitment | Fails the seed 451 melee-cast increase assertion; seed 42 passes. |\n| nerverecovery | Fails the old-rule generated-country negative control; the earlier three-rate panic/recovery and courage cases pass. |\n| worldmass_processioncontinuity | First 12 courses pass; natural seed 713 reaches 5000 steps without an admitted cart. |\n| nativeinstalledsources / nativescenesky | Both pass unchanged. The shard lane's failures require review of its integration delta. |\n| smoke baseline comparison | Three metrics exceed the original bands: warrior wave time 20.97 to 15.26; duelist output and dummy DPS 235.61 to 274.07. |\n\nThe three behavioral probe rows are explicitly red debt; their original assertions remain unchanged. These failures do not yet distinguish a gameplay regression from a stale comparative oracle. Simulation smoke execution passing is separate from its baseline comparison. No golden, baseline or tolerance was updated. This relay reports observed foundation results and recorded shard requests; it does not claim direct delivery to Claude or a current shard rerun.\n\n## Foundation merge coordination\n\nThis foundation session has not performed a merge or resolved conflicts. A fresh dry run of foundation `a00566963438a19e7d437e0f75f02623be8e3faf` into shard-world `d025d99fa167692405403e4106c04d4379542b1c` found **32** conflicting files. The original 24-file estimate and the later 27-file inventory were from older tips. The shard lane has independently completed its performance-branch merge, as recorded above. Later commits require another dry run.\n\nBefore resolving that merge, notify the shard lane and agree ownership; shard-owned files remain for that lane to resolve. This written handoff does not claim that an external Claude session has received a message.\n\n## Remaining scope\n\nThe foundation now includes F1/F3, repeat Crusade/Demon entrance renewal, and event-owned Crusade garrisons/commander attribution. Existing realm occupants, wounds and ordinary death effects remain intact. Hunt quarries now retain their wounds and flee phase when returning to visited ground. This successor supplies bounded Crusade works renewal, with independent lifecycle review and exact source composition required before promotion. A separate confirmed Conclave gap retains five cultists and advances incubation twice on repeated departure; its repair is not included here. Dedicated retained-area scheduling remains excluded pending the correction described below.\n\nThe retained scheduler candidate was measured against foundation `2f9d4cbb` with equal actual populations, two real TCP clients (eight in the last case), 40 warm-up and 80 measured frames per host, and alternating host order. This is a same-process diagnostic, not a concurrent deployment soak:\n\n| Course | p95 baseline → scheduler candidate | Actors in each host |\n| --- | --- | --- |\n"
        }
      ]
    },
    {
      "file": "src/engine/levelgen.ts",
      "rawBeforeHash": "3f11ca1516621e5c48c40880b7532e7aa1e45602b82c04ef2b42f9ece8933921",
      "rawAfterHash": "b7c5a0ae8b307fe313db9d1e2f25a232be0579f07936d7c3a53a6b12f00f840b",
      "beforeHash": "3f11ca1516621e5c48c40880b7532e7aa1e45602b82c04ef2b42f9ece8933921",
      "afterHash": "b7c5a0ae8b307fe313db9d1e2f25a232be0579f07936d7c3a53a6b12f00f840b",
      "crlfLines": [],
      "hunks": [
        {
          "before": "// registers its trap pass through registerTrapPass at eval — the dial/geometry\n// types flow back erased.\nimport type { TrapGenSpec, TrapGeo } from './interiorGen';\nimport type { DamageType, Modifier } from './stats';\nimport type { WalkField } from '../world/walk';\nimport { GridWalkField } from '../world/gridWalk';\nimport { boundsOf, gridSpanOf, insideBounds, type BoundsPiece, type ZoneShape } from '../world/shape';\nimport { regionKind } from '../world/regions';\nimport { isFieldPixel } from '../world/fieldRegion';\n// Safe despite genkit importing our types: those are `import type` edges,\n// erased at runtime — no actual module cycle exists.\n",
          "after": "// registers its trap pass through registerTrapPass at eval — the dial/geometry\n// types flow back erased.\nimport type { TrapGenSpec, TrapGeo } from './interiorGen';\nimport type { DamageType, Modifier } from './stats';\nimport type { WalkField } from '../world/walk';\nimport { inheritNativeGridPaintReceipt,withoutNativeGridPaintReceipt,GridWalkField } from '../world/gridWalk';\nimport { boundsOf, gridSpanOf, insideBounds, type BoundsPiece, type ZoneShape } from '../world/shape';\nimport { regionKind } from '../world/regions';\nimport { isFieldPixel } from '../world/fieldRegion';\n// Safe despite genkit importing our types: those are `import type` edges,\n// erased at runtime — no actual module cycle exists.\n"
        },
        {
          "before": "export type Reservation =\n  | { pos: Vec2; radius: number }\n  | { rect: { x: number; y: number; w: number; h: number }; margin?: number };\n\nexport interface GenCtx {\n  structurePlans?: import('./structurePlans').StructurePlanOverrides;\n  rng: Rng;\n  /** The zone box. `shape`/`boundless` ride along (generateLayout normalizes\n   *  them off the def) so placement passes can ask the RIM LAW — the ellipse\n   *  rim is a move-time confine; a DWELL seat beyond it is unreachable\n",
          "after": "export type Reservation =\n  | { pos: Vec2; radius: number }\n  | { rect: { x: number; y: number; w: number; h: number }; margin?: number };\n\nexport interface GenCtx {\n  retainedFixtureFit?:boolean;\n  structurePlans?: import('./structurePlans').StructurePlanOverrides;\n  rng: Rng;\n  /** The zone box. `shape`/`boundless` ride along (generateLayout normalizes\n   *  them off the def) so placement passes can ask the RIM LAW — the ellipse\n   *  rim is a move-time confine; a DWELL seat beyond it is unreachable\n"
        },
        {
          "before": "        run = k;\n        start = cx;\n      }\n    }\n  }\n  return ng;\n}\n\n/** THE ANNEX STAMP (the growing zone — Secrets Movement II; data/annexes.ts).\n *  Runs LAST of all (the stampHollows law: after every rescue/navigability\n",
          "after": "        run = k;\n        start = cx;\n      }\n    }\n  }\n  inheritNativeGridPaintReceipt(g,ng);\n  return ng;\n}\n\n/** THE ANNEX STAMP (the growing zone — Secrets Movement II; data/annexes.ts).\n *  Runs LAST of all (the stampHollows law: after every rescue/navigability\n"
        },
        {
          "before": "  // matching the tier held at entry) — same pipeline as authored fixtures\n  // (plan walls carve the grid, doors/slots/breakables live, footprints\n  // reserve), never mutating the def. Omitted everywhere else = byte-identical.\n  extraFixtures?: { structure: string; x: number; y: number }[],\n  // LITE (GenCtx.lite): the understory's aerial pass — geometry only.\n  opts?: { lite?: boolean },\n): GeneratedLayout {\n  validateStructurePlans(def.structurePlans);\n  const ctx: GenCtx = {\n    structurePlans: def.structurePlans,\n    rng,\n",
          "after": "  // matching the tier held at entry) — same pipeline as authored fixtures\n  // (plan walls carve the grid, doors/slots/breakables live, footprints\n  // reserve), never mutating the def. Omitted everywhere else = byte-identical.\n  extraFixtures?: { structure: string; x: number; y: number }[],\n  // LITE (GenCtx.lite): the understory's aerial pass — geometry only.\n  opts?: { lite?: boolean; extraFixturePass?: (ctx:GenCtx, run:()=>void)=>void },\n): GeneratedLayout {\n  validateStructurePlans(def.structurePlans);\n  const ctx: GenCtx = {\n    structurePlans: def.structurePlans,\n    rng,\n"
        },
        {
          "before": "  }\n  // PLAN fixtures raise AFTER the layout: a grid generator REPLACES ctx.walk,\n  // which would wipe a plan fixture's painted walls into ghost geometry (roofs\n  // over open rock, unenforced ramparts) if it painted first. Placing here, the\n  // fixture carves into whatever grid the layout built (or ensures one).\n  for (const [fixtureIndex, f] of allFixtures.entries()) {\n    const s = STRUCTURES[f.structure];\n    if (s && (s.plan || s.generator)) {\n      const placed=placeStructurePlan(ctx,s,vec(f.x,f.y));\n      if(placed){const expected=plannedRect(vec(f.x,f.y),placed.rect.w,placed.rect.h);fixturePlacements.push({fixtureIndex,structureId:placed.id,requested:vec(f.x,f.y),center:vec(placed.rect.x+placed.rect.w/2,placed.rect.y+placed.rect.h/2),rect:{...placed.rect},reseated:expected.x!==placed.rect.x||expected.y!==placed.rect.y});}\n    }\n  }\n  // LANDMARK ROLLS first (they're TERRAIN — the ground-before-solids\n  // convention: a structure sites around a lake, never under it), then\n  // STRUCTURE ROLLS — both the zone's data-declared chances (merged from\n  // tileset + biome at mint, or authored on the def). Rolled HERE, after the\n  // layout dispatch, so they are layout-agnostic (a field zone and a plains\n",
          "after": "  }\n  // PLAN fixtures raise AFTER the layout: a grid generator REPLACES ctx.walk,\n  // which would wipe a plan fixture's painted walls into ghost geometry (roofs\n  // over open rock, unenforced ramparts) if it painted first. Placing here, the\n  // fixture carves into whatever grid the layout built (or ensures one).\n  const placeFixtures=(start:number,end:number):void=>{for(let fixtureIndex=start;fixtureIndex<end;fixtureIndex++){\n    const f=allFixtures[fixtureIndex],s=STRUCTURES[f.structure];\n    if(s&&(s.plan||s.generator)){\n      const placed=placeStructurePlan(ctx,s,vec(f.x,f.y));\n      if(placed){const expected=plannedRect(vec(f.x,f.y),placed.rect.w,placed.rect.h);fixturePlacements.push({fixtureIndex,structureId:placed.id,requested:vec(f.x,f.y),center:vec(placed.rect.x+placed.rect.w/2,placed.rect.y+placed.rect.h/2),rect:{...placed.rect},reseated:expected.x!==placed.rect.x||expected.y!==placed.rect.y});}\n    }\n  }};\n  if(opts?.extraFixturePass){const split=def.fixtures?.length??0;placeFixtures(0,split);opts.extraFixturePass(ctx,()=>placeFixtures(split,allFixtures.length));}\n  else placeFixtures(0,allFixtures.length);\n  // LANDMARK ROLLS first (they're TERRAIN — the ground-before-solids\n  // convention: a structure sites around a lake, never under it), then\n  // STRUCTURE ROLLS — both the zone's data-declared chances (merged from\n  // tileset + biome at mint, or authored on the def). Rolled HERE, after the\n  // layout dispatch, so they are layout-agnostic (a field zone and a plains\n"
        },
        {
          "before": "      for (let x = c.x + cs / 2; x < c.x + c.w; x += cs) {\n        priorCells.push({ x, y, kind: grid.regionAt(x, y) });\n      }\n    }\n  }\n  for (const c of doorRects) grid.fillRegion(c.x, c.y, c.x + c.w - 0.01, c.y + c.h - 0.01, 'ground');\n\n  const required: Vec2[] = [\n    ...ctx.exits,\n    ...ctx.pois,\n    ...ctx.camps,\n",
          "after": "      for (let x = c.x + cs / 2; x < c.x + c.w; x += cs) {\n        priorCells.push({ x, y, kind: grid.regionAt(x, y) });\n      }\n    }\n  }\n  withoutNativeGridPaintReceipt(()=>{for (const c of doorRects) grid.fillRegion(c.x, c.y, c.x + c.w - 0.01, c.y + c.h - 0.01, 'ground');});\n\n  const required: Vec2[] = [\n    ...ctx.exits,\n    ...ctx.pois,\n    ...ctx.camps,\n"
        },
        {
          "before": "    }\n  }\n\n  // Restore the door cells to their pre-check kinds (a plan structure's seal\n  // comes back rampart; an interior door's floor stays floor).\n  for (const pc of priorCells) grid.fillRegion(pc.x - 1, pc.y - 1, pc.x + 1, pc.y + 1, pc.kind);\n}\n\n/** A flat int deque (head/tail window over a growable Int32Array) with the\n *  exact shift/unshift/push semantics of the JS-array deque it replaced —\n *  without Array.prototype.shift's O(n) slide. The navigability belt runs\n",
          "after": "    }\n  }\n\n  // Restore the door cells to their pre-check kinds (a plan structure's seal\n  // comes back rampart; an interior door's floor stays floor).\n  withoutNativeGridPaintReceipt(()=>{for (const pc of priorCells) grid.fillRegion(pc.x - 1, pc.y - 1, pc.x + 1, pc.y + 1, pc.kind);});\n}\n\n/** A flat int deque (head/tail window over a growable Int32Array) with the\n *  exact shift/unshift/push semantics of the JS-array deque it replaced —\n *  without Array.prototype.shift's O(n) slide. The navigability belt runs\n"
        },
        {
          "before": "        if(Math.hypot(dx,dy)<bodyR&&!grid.isWalkable(cx,cy))return false;\n      }\n    }\n    return true;\n  });\n  if(inBounds(original,center)&&(explicit||grounded(center)))return at;\n  const minRelX=Math.min(0,...edge.map(a=>w/2+a.dx)),maxRelX=Math.max(w,...edge.map(a=>w/2+a.dx));\n  const minRelY=Math.min(0,...edge.map(a=>h/2+a.dy)),maxRelY=Math.max(h,...edge.map(a=>h/2+a.dy));\n  // No native arena rim: search the real finite backing, not an artificial base box.\n  const span=ctx.arena.boundless?backing:ctx.arena,margin=ctx.arena.boundless?0:BORDER;\n  const loX=Math.ceil((margin-minRelX)/WALK_CELL)*WALK_CELL,hiX=Math.floor((span.w-margin-maxRelX)/WALK_CELL)*WALK_CELL;\n",
          "after": "        if(Math.hypot(dx,dy)<bodyR&&!grid.isWalkable(cx,cy))return false;\n      }\n    }\n    return true;\n  });\n  if(inBounds(original,center)&&(explicit||grounded(center))&&(!ctx.retainedFixtureFit||!rectReserved(ctx,original)&&grounded(center)))return at;\n  const minRelX=Math.min(0,...edge.map(a=>w/2+a.dx)),maxRelX=Math.max(w,...edge.map(a=>w/2+a.dx));\n  const minRelY=Math.min(0,...edge.map(a=>h/2+a.dy)),maxRelY=Math.max(h,...edge.map(a=>h/2+a.dy));\n  // No native arena rim: search the real finite backing, not an artificial base box.\n  const span=ctx.arena.boundless?backing:ctx.arena,margin=ctx.arena.boundless?0:BORDER;\n  const loX=Math.ceil((margin-minRelX)/WALK_CELL)*WALK_CELL,hiX=Math.floor((span.w-margin-maxRelX)/WALK_CELL)*WALK_CELL;\n"
        },
        {
          "before": "    if (!allWalkable(ctx, [p])) continue;\n    ctx.doodads.push({ pos: p, radius: r, kind: 'rock', rot: ctx.rng.range(0, Math.PI * 2) });\n  }\n  ctx.pois.push(center);\n}\n",
          "after": "    if (!allWalkable(ctx, [p])) continue;\n    ctx.doodads.push({ pos: p, radius: r, kind: 'rock', rot: ctx.rng.range(0, Math.PI * 2) });\n  }\n  ctx.pois.push(center);\n}\n\n/** Native final guarantees for an already staged retained fixture delta. */\nexport function finishNativeRetainedFixtures(ctx:GenCtx):void {ensureReachability(ctx);ensureDoodadNavigability(ctx);}\n"
        }
      ]
    },
    {
      "file": "src/engine/nativeAreaBirth.ts",
      "rawBeforeHash": "0cc1a5051231216ecb26afeabe4d806a6dc2c7cc54031a9c147e00e8458360cf",
      "rawAfterHash": "a41339e494cd72e9548436863b89eb97b8060865923767ad13356b1ab563d617",
      "beforeHash": "0cc1a5051231216ecb26afeabe4d806a6dc2c7cc54031a9c147e00e8458360cf",
      "afterHash": "a41339e494cd72e9548436863b89eb97b8060865923767ad13356b1ab563d617",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import type {NativeTownBodyRecorder} from './nativeTownBody';\n/** Complete original native birth ordering, after layout/environment adoption\n * and player arrival. A caller must bind every invoked state/controller service;\n * this operation neither swaps a standing World nor publishes an area. */\nimport type { World } from './world';\n",
          "after": "import {nativeCrusadeMemoryDoor} from './nativeCrusadeFixtureMemory';\nimport type {NativeTownBodyRecorder} from './nativeTownBody';\n/** Complete original native birth ordering, after layout/environment adoption\n * and player arrival. A caller must bind every invoked state/controller service;\n * this operation neither swaps a standing World nor publishes an area. */\nimport type { World } from './world';\n"
        },
        {
          "before": "  memory:NativeAreaBirthMemory|null|undefined,rng:Rng,firstVisit:boolean,from:string|undefined,isCave:boolean,p:Actor):void {\n    // Remembered DOOR STATES re-apply first (an opened gate stays open across the\n    // memory's life): the layout regenerated pristine doors above; the shared\n    // setDoorState path flips + repaints them silently.\n    for (const [doorId, st] of Object.entries(memory?.doorState ?? {})) {\n      host.setDoorState(doorId, st, { silent: true });\n    }\n    // LESSON DOORS mint open for GRADUATED accounts (DoodadDoor.lesson names\n    // an account-ledger key; the first dwell-open stamped it). Applied before\n    // the breakable door-actor spawn below so a graduated 'both'-mode door\n    // never posts a guard on an already-open frame. Zone memory above stays\n",
          "after": "  memory:NativeAreaBirthMemory|null|undefined,rng:Rng,firstVisit:boolean,from:string|undefined,isCave:boolean,p:Actor):void {\n    // Remembered DOOR STATES re-apply first (an opened gate stays open across the\n    // memory's life): the layout regenerated pristine doors above; the shared\n    // setDoorState path flips + repaints them silently.\n    for (const [doorId, st] of Object.entries(memory?.doorState ?? {})) {\n      host.setDoorState(nativeCrusadeMemoryDoor(host,doorId), st, { silent: true });\n    }\n    // LESSON DOORS mint open for GRADUATED accounts (DoodadDoor.lesson names\n    // an account-ledger key; the first dwell-open stamped it). Applied before\n    // the breakable door-actor spawn below so a graduated 'both'-mode door\n    // never posts a guard on an already-open frame. Zone memory above stays\n"
        }
      ]
    },
    {
      "file": "src/engine/nativeCharacterRestoration.ts",
      "rawBeforeHash": "b5abccb92ee2378bbbc1fd3118be65447678c949f5d4fe8373861719f4791450",
      "rawAfterHash": "cb6e42f64d0c8a61a66e078fbfd9b3841943a49ef6ac1826bd8f83a4c54f787b",
      "beforeHash": "b5abccb92ee2378bbbc1fd3118be65447678c949f5d4fe8373861719f4791450",
      "afterHash": "cb6e42f64d0c8a61a66e078fbfd9b3841943a49ef6ac1826bd8f83a4c54f787b",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Exact native restore/add-seat bodies. Real ownership and staged publication are composed separately. */\nimport type {World,Seat,PlayerMeta,VendorEntry,VendorHoldRow,VendorHold} from './world';\nimport {restoreMovementTether} from './movementTether';\nimport {rand,vec} from '../core/math';\nimport {Actor} from './actor';\nimport {type PlayerInputSource} from '../net/intent';\n",
          "after": "/** Exact native restore/add-seat bodies. Real ownership and staged publication are composed separately. */\nimport {parseNativeCrusadeFixtureMemory} from './nativeCrusadeFixtureMemory';\nimport type {World,Seat,PlayerMeta,VendorEntry,VendorHoldRow,VendorHold} from './world';\nimport {restoreMovementTether} from './movementTether';\nimport {rand,vec} from '../core/math';\nimport {Actor} from './actor';\nimport {type PlayerInputSource} from '../net/intent';\n"
        },
        {
          "before": "          ...(memo.rarity && RARITY_DEFS[memo.rarity as MonsterRarity] ? { rarity: memo.rarity as MonsterRarity } : {}),\n          ...(memo.tag ? { tag: memo.tag } : {}),\n          ...(memo.name ? { name: memo.name } : {}),\n          ...(memo.tier ? { tier: memo.tier } : {}),\n          ...(memo.aiAwakened ? { aiAwakened: 1 as const } : {}),\n          movementTether: restoreMovementTether(memo.movementTether),\n          ...(readEncounterGroup(memo.encounterGroup) ? { encounterGroup: readEncounterGroup(memo.encounterGroup) } : {}),\n        });\n      }\n      const doorState: Record<string, 'open' | 'broken'> = {};\n",
          "after": "          ...(memo.rarity && RARITY_DEFS[memo.rarity as MonsterRarity] ? { rarity: memo.rarity as MonsterRarity } : {}),\n          ...(memo.tag ? { tag: memo.tag } : {}),\n          ...(memo.name ? { name: memo.name } : {}),\n          ...(memo.tier ? { tier: memo.tier } : {}),\n          ...(memo.aiAwakened ? { aiAwakened: 1 as const } : {}),\n          ...(parseNativeCrusadeFixtureMemory(memo.crusadeFixture)?{crusadeFixture:parseNativeCrusadeFixtureMemory(memo.crusadeFixture)}:{}),\n          movementTether: restoreMovementTether(memo.movementTether),\n          ...(readEncounterGroup(memo.encounterGroup) ? { encounterGroup: readEncounterGroup(memo.encounterGroup) } : {}),\n        });\n      }\n      const doorState: Record<string, 'open' | 'broken'> = {};\n"
        }
      ]
    },
    {
      "file": "src/engine/nativeLayoutGeneration.ts",
      "rawBeforeHash": "a64572af516c7bd831d342a3c1e234cc17255269883f29b93729234544e64b07",
      "rawAfterHash": "f072e1e477bc7872e29cfd1e7031b599e8a6d15dcf080ca0bbdb010bdf8f521b",
      "beforeHash": "a64572af516c7bd831d342a3c1e234cc17255269883f29b93729234544e64b07",
      "afterHash": "f072e1e477bc7872e29cfd1e7031b599e8a6d15dcf080ca0bbdb010bdf8f521b",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import type { World } from './world';\nimport type { ZoneDef } from '../data/zones';\nimport type { Vec2 } from '../core/math';\nimport { vec, clamp, dist } from '../core/math';\nimport { Rng, rollSeed } from '../core/rng';\nimport { generateLayout } from './levelgen';\nimport { ZONE_MEMORY_CFG } from './zonecontents';\nimport { STRUCTURES } from '../data/structures';\nexport interface NativeLayoutGenerationHost {\n  zoneMemory: World['zoneMemory'];\n  time: World['time'];\n  inCave: World['inCave'];\n  sim: World['sim'];\n  arena: World['arena'];\n",
          "after": "import type { World } from './world';\nimport type { ZoneDef } from '../data/zones';\nimport type { Vec2 } from '../core/math';\nimport { vec, clamp, dist } from '../core/math';\nimport { Rng, rollSeed } from '../core/rng';\nimport { generateLayout, type GenCtx } from './levelgen';\nimport type {CrusadeInfo} from '../packages/overlays/crusade';\nimport { ZONE_MEMORY_CFG } from './zonecontents';\nimport { STRUCTURES } from '../data/structures';\nexport interface NativeLayoutGenerationHost {\n  observeCrusadeLayout?: (info:CrusadeInfo|null|undefined)=>void;\n  extraFixturePass?: (ctx:GenCtx,run:()=>void)=>void;\n  zoneMemory: World['zoneMemory'];\n  time: World['time'];\n  inCave: World['inCave'];\n  sim: World['sim'];\n  arena: World['arena'];\n"
        },
        {
          "before": "    return !!m && host.time - m.savedAt < ZONE_MEMORY_CFG.ttl;\n  }\nexport function nativeCrusadeFixtureSpecs(host:NativeLayoutGenerationHost,def: ZoneDef, entry: Vec2): { fixtures: { structure: string; x: number; y: number }[]; center: Vec2 } | null {\n    if (host.inCave || def.caveDepth != null || def.special || def.objective.kind === 'safe') return null;\n    const info = host.sim.crusadeField?.crusadeOn(def.id);\n    if (!info?.structure || !STRUCTURES[info.structure]) return null;\n    const rng = new Rng((((def.seed ?? 0) ^ 0xc205) + info.tier * 0x9e37) >>> 0);\n    const { w, h } = host.arena;\n    const margin = 200;\n    const exitPts = host.exits.map(e => e.pos);\n",
          "after": "    return !!m && host.time - m.savedAt < ZONE_MEMORY_CFG.ttl;\n  }\nexport function nativeCrusadeFixtureSpecs(host:NativeLayoutGenerationHost,def: ZoneDef, entry: Vec2): { fixtures: { structure: string; x: number; y: number }[]; center: Vec2 } | null {\n    if (host.inCave || def.caveDepth != null || def.special || def.objective.kind === 'safe') return null;\n    const info = host.sim.crusadeField?.crusadeOn(def.id);\n    host.observeCrusadeLayout?.(info);\n    if (!info?.structure || !STRUCTURES[info.structure]) return null;\n    const rng = new Rng((((def.seed ?? 0) ^ 0xc205) + info.tier * 0x9e37) >>> 0);\n    const { w, h } = host.arena;\n    const margin = 200;\n    const exitPts = host.exits.map(e => e.pos);\n"
        },
        {
          "before": "    // gates are true doors, tower slots man, breakables live, footprints\n    // reserve + hold aprons) at seats deterministic per seed + tier — never\n    // stamped over portals, never ghost-geometry.\n    const crusadeWorks = host.crusadeFixtureSpecs(def, entry);\n    host.crusadeWorksAt = crusadeWorks ? vec(crusadeWorks.center.x, crusadeWorks.center.y) : null;\n    const layout = generateLayout(def, host.arena, rng, entry, host.exits.map(e => e.pos), crusadeWorks?.fixtures);\n    const main=layout.fixturePlacements?.find(f=>f.fixtureIndex===(def.fixtures?.length??0));\n    if(crusadeWorks&&main?.reseated)host.crusadeWorksAt=vec(main.center.x,main.center.y);\n    return {memory,layoutSeed,rng,layout};\n}\n",
          "after": "    // gates are true doors, tower slots man, breakables live, footprints\n    // reserve + hold aprons) at seats deterministic per seed + tier — never\n    // stamped over portals, never ghost-geometry.\n    const crusadeWorks = host.crusadeFixtureSpecs(def, entry);\n    host.crusadeWorksAt = crusadeWorks ? vec(crusadeWorks.center.x, crusadeWorks.center.y) : null;\n    const layout = generateLayout(def, host.arena, rng, entry, host.exits.map(e => e.pos), crusadeWorks?.fixtures, host.extraFixturePass?{extraFixturePass:host.extraFixturePass}:undefined);\n    const main=layout.fixturePlacements?.find(f=>f.fixtureIndex===(def.fixtures?.length??0));\n    if(crusadeWorks&&main?.reseated)host.crusadeWorksAt=vec(main.center.x,main.center.y);\n    return {memory,layoutSeed,rng,layout};\n}\n"
        }
      ]
    },
    {
      "file": "src/engine/nativeSceneMemory.ts",
      "rawBeforeHash": "058867bfcb82d23e9166f392d33a061d985d07cb14c7b9a02b96863d6a239bb1",
      "rawAfterHash": "51114ff33c334bc44f79bd096753181feac7ca5f4f30b903dbd487d31bf283d4",
      "beforeHash": "058867bfcb82d23e9166f392d33a061d985d07cb14c7b9a02b96863d6a239bb1",
      "afterHash": "51114ff33c334bc44f79bd096753181feac7ca5f4f30b903dbd487d31bf283d4",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Exact native memory capture. This is cold-resume policy, not a combat checkpoint. */\nimport type {World} from './world';\nimport type {MagicPackState} from './magicPacks';\nimport {savedMovementTether} from './movementTether';\nimport {ZONE_MEMORY_CFG,captureZoneContents,type NativeZoneContentsHost} from './zonecontents';\nexport type NativeZoneMemory=World['zoneMemory'] extends Map<string,infer M>?M:never;\n",
          "after": "/** Exact native memory capture. This is cold-resume policy, not a combat checkpoint. */\nimport {readNativeCrusadeFixtureMemory} from './nativeCrusadeFixtureMemory';\nimport type {World} from './world';\nimport type {MagicPackState} from './magicPacks';\nimport {savedMovementTether} from './movementTether';\nimport {ZONE_MEMORY_CFG,captureZoneContents,type NativeZoneContentsHost} from './zonecontents';\nexport type NativeZoneMemory=World['zoneMemory'] extends Map<string,infer M>?M:never;\n"
        },
        {
          "before": "    const enemies: ZoneEnemyMemo[] = [];\n    for (const a of host.actors) {\n      if (a.dead || a.team !== 'enemy' || !a.fromZoneGen || !a.defId || a.doorId) continue;\n      enemies.push({\n        defId: a.defId, level: a.level, x: a.pos.x, y: a.pos.y,\n        life: a.life, faction: a.faction, rarity: a.rarity, tag: a.tag,\n        ...(a.magicPack ? { magicPack: JSON.parse(JSON.stringify(a.magicPack)) as MagicPackState } : {}),\n        movementTether: savedMovementTether(a),\n        ...(a.encounterGroup ? { encounterGroup: { ...a.encounterGroup } } : {}),\n        name: a.name, ...(a.tier ? { tier: a.tier } : {}),\n",
          "after": "    const enemies: ZoneEnemyMemo[] = [];\n    for (const a of host.actors) {\n      if (a.dead || a.team !== 'enemy' || !a.fromZoneGen || !a.defId || a.doorId) continue;\n      enemies.push({\n        defId: a.defId, level: a.level, x: a.pos.x, y: a.pos.y,\n        ...(readNativeCrusadeFixtureMemory(a)?{crusadeFixture:{...readNativeCrusadeFixtureMemory(a)!}}:{}),\n        life: a.life, faction: a.faction, rarity: a.rarity, tag: a.tag,\n        ...(a.magicPack ? { magicPack: JSON.parse(JSON.stringify(a.magicPack)) as MagicPackState } : {}),\n        movementTether: savedMovementTether(a),\n        ...(a.encounterGroup ? { encounterGroup: { ...a.encounterGroup } } : {}),\n        name: a.name, ...(a.tier ? { tier: a.tier } : {}),\n"
        }
      ]
    },
    {
      "file": "src/engine/nativeScenePopulation.ts",
      "rawBeforeHash": "518d9601db3fc0ad63ad2e53e6b7b91d651eb68d16d96a0fbaf0533be27546e1",
      "rawAfterHash": "f0e8e1856cdbba4ade931dbe2f25d538fec002d13afbf890ac5f143a49e6d4c1",
      "beforeHash": "518d9601db3fc0ad63ad2e53e6b7b91d651eb68d16d96a0fbaf0533be27546e1",
      "afterHash": "f0e8e1856cdbba4ade931dbe2f25d538fec002d13afbf890ac5f143a49e6d4c1",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Exact native scene census, birth and objective services.\n * Complete originals are pinned in probe_nativescenepopulation.ts. Current installed native sources are intentional. No source issuer is claimed. */\nimport type { World } from './world';\nimport type { Actor } from './actor';\nimport type { NativeAreaBirthMemory as ZoneMemory } from './nativeAreaBirth';\nimport type { ZoneDef, ObjectiveSpec, PackTableEntry } from '../data/zones';\nimport type { WaveFrenzySpec } from '../data/waves';\n",
          "after": "/** Exact native scene census, birth and objective services.\n * Complete originals are pinned in probe_nativescenepopulation.ts. Current installed native sources are intentional. No source issuer is claimed. */\nimport {restoreNativeCrusadeFixtureMemory,completeNativeCrusadeFixtureMemory} from './nativeCrusadeFixtureMemory';\nimport type { World } from './world';\nimport type { Actor } from './actor';\nimport type { NativeAreaBirthMemory as ZoneMemory } from './nativeAreaBirth';\nimport type { ZoneDef, ObjectiveSpec, PackTableEntry } from '../data/zones';\nimport type { WaveFrenzySpec } from '../data/waves';\n"
        },
        {
          "before": "  farthestStand:World['farthestStand'];\n  time:World['time'];\n  seats:World['seats'];\n  partyScaleCount:World['partyScaleCount'];\n}\nexport function restoreSceneEnemies(host:Pick<NativeSceneServiceHost,'actors'|'createMonster'|'nextSquadId'|'promoteRarity'|'clampPos'|'refreshMagicPacks' >, memory: ZoneMemory):void {\n    host.actors = host.actors.filter(a => !(a.fromZoneGen && a.team === 'enemy'));\n    const magicPackIds = new Map<number, number>();\n    const encounterGroupIds = new Map<number, number>();\n    for (const e of memory.enemies) {\n      if (!MONSTERS[e.defId]) continue;\n      const m = host.createMonster(e.defId, Math.max(1, e.level), 'enemy');\n",
          "after": "  farthestStand:World['farthestStand'];\n  time:World['time'];\n  seats:World['seats'];\n  partyScaleCount:World['partyScaleCount'];\n}\nconst nativeRestorationReceipts=new WeakMap<object,Readonly<{host:object;actors:Actor[];memory:ZoneMemory}>>();\n/** Non-granting receipt of this exact completed native census replacement. */\nexport function consumeNativeSceneRestoration(token:object):Readonly<{host:object;actors:Actor[];memory:ZoneMemory}> {const r=nativeRestorationReceipts.get(token);if(!r)throw Error('Native restoration needs its actual one-use completion receipt');nativeRestorationReceipts.delete(token);return r;}\nexport function restoreSceneEnemies(host:Pick<NativeSceneServiceHost,'actors'|'createMonster'|'nextSquadId'|'promoteRarity'|'clampPos'|'refreshMagicPacks' >, memory: ZoneMemory):void {\n    const restoredActors = host.actors = host.actors.filter(a => !(a.fromZoneGen && a.team === 'enemy'));\n    const magicPackIds = new Map<number, number>();\n    const encounterGroupIds = new Map<number, number>();\n    for (const e of memory.enemies) {\n      if (!MONSTERS[e.defId]) continue;\n      const m = host.createMonster(e.defId, Math.max(1, e.level), 'enemy');\n"
        },
        {
          "before": "      m.pos = host.clampPos(vec(e.x, e.y), m.radius, undefined, { mover: m });\n      m.fillResources();\n      m.life = Math.max(1, Math.min(m.maxLife(), e.life));\n      m.movementTether = restoreMovementTether(e.movementTether);\n      host.actors.push(m);\n    }\n    host.refreshMagicPacks();\n  }\n\nexport function sceneCountedEnemies(host:Pick<NativeSceneServiceHost,'actors'|'objectiveCountable' >):Actor[] {\n    return host.actors.filter(a => !a.dead && host.objectiveCountable(a));\n  }\n",
          "after": "      m.pos = host.clampPos(vec(e.x, e.y), m.radius, undefined, { mover: m });\n      m.fillResources();\n      m.life = Math.max(1, Math.min(m.maxLife(), e.life));\n      m.movementTether = restoreMovementTether(e.movementTether);\n      host.actors.push(m);\n      restoreNativeCrusadeFixtureMemory(host,m,e.crusadeFixture);\n    }\n    host.refreshMagicPacks();\n    const receipt=Object.freeze({});nativeRestorationReceipts.set(receipt,Object.freeze({host,actors:restoredActors,memory}));completeNativeCrusadeFixtureMemory(receipt);\n  }\n\nexport function sceneCountedEnemies(host:Pick<NativeSceneServiceHost,'actors'|'objectiveCountable' >):Actor[] {\n    return host.actors.filter(a => !a.dead && host.objectiveCountable(a));\n  }\n"
        }
      ]
    },
    {
      "file": "src/engine/world.ts",
      "rawBeforeHash": "82f6f329f6fe9da9aeed6e6410eaf4148d5e8310ba7928ca6db0ffadf6a211fc",
      "rawAfterHash": "70f2a6e7d6d0a23ce8f5095ba332a60b325a33478e67b342118a35b3904b73d3",
      "beforeHash": "82f6f329f6fe9da9aeed6e6410eaf4148d5e8310ba7928ca6db0ffadf6a211fc",
      "afterHash": "70f2a6e7d6d0a23ce8f5095ba332a60b325a33478e67b342118a35b3904b73d3",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {sceneSettleNearScale} from './nativeSceneNearScale';\nimport {sceneDealTravellerFlasks,sceneAdoptQuestLedger} from './nativeSceneServerVessel';\nimport './nativeSceneBootstrap';\nimport {sceneScanNemesisSurvivors} from './nativeSceneCampaignTransitions';\nimport {sceneAddTether,sceneAttachObjectTethers,TETHER_TICK,type NativeSceneTetherHost} from './nativeSceneTethers';\nimport {sceneRollSummonType,sceneForwardSummonSockets} from './nativeSceneSummonPreparation';\n",
          "after": "import {sceneSettleNearScale} from './nativeSceneNearScale';\nimport {parseNativeCrusadeFixtureMemory} from './nativeCrusadeFixtureMemory';\nimport {sceneDealTravellerFlasks,sceneAdoptQuestLedger} from './nativeSceneServerVessel';\nimport './nativeSceneBootstrap';\nimport {sceneScanNemesisSurvivors} from './nativeSceneCampaignTransitions';\nimport {sceneAddTether,sceneAttachObjectTethers,TETHER_TICK,type NativeSceneTetherHost} from './nativeSceneTethers';\nimport {sceneRollSummonType,sceneForwardSummonSockets} from './nativeSceneSummonPreparation';\n"
        },
        {
          "before": "\n/** One zone-spawned enemy as remembered by Zone Memory (re-materialized via\n *  createMonster + these fields on re-entry — enough to restore who/where/how-hurt\n *  without serializing full combat state). */\ninterface ZoneEnemyMemo {\n  encounterGroup?: EncounterGroupState;\n  magicPack?: MagicPackState;\n  movementTether?: MovementTetherState;\n  defId: string;\n  level: number;\n",
          "after": "\n/** One zone-spawned enemy as remembered by Zone Memory (re-materialized via\n *  createMonster + these fields on re-entry — enough to restore who/where/how-hurt\n *  without serializing full combat state). */\ninterface ZoneEnemyMemo {\n  crusadeFixture?:import('./nativeCrusadeFixtureMemory').NativeCrusadeFixtureMemo;\n  encounterGroup?: EncounterGroupState;\n  magicPack?: MagicPackState;\n  movementTether?: MovementTetherState;\n  defId: string;\n  level: number;\n"
        },
        {
          "before": "          ...(memo.rarity && RARITY_DEFS[memo.rarity as MonsterRarity] ? { rarity: memo.rarity as MonsterRarity } : {}),\n          ...(memo.tag ? { tag: memo.tag } : {}),\n          ...(memo.name ? { name: memo.name } : {}),\n          ...(memo.tier ? { tier: memo.tier } : {}),\n          ...(memo.aiAwakened ? { aiAwakened: 1 as const } : {}),\n          movementTether: restoreMovementTether(memo.movementTether),\n          ...(readEncounterGroup(memo.encounterGroup) ? { encounterGroup: readEncounterGroup(memo.encounterGroup) } : {}),\n        });\n      }\n      const doorState: Record<string, 'open' | 'broken'> = {};\n",
          "after": "          ...(memo.rarity && RARITY_DEFS[memo.rarity as MonsterRarity] ? { rarity: memo.rarity as MonsterRarity } : {}),\n          ...(memo.tag ? { tag: memo.tag } : {}),\n          ...(memo.name ? { name: memo.name } : {}),\n          ...(memo.tier ? { tier: memo.tier } : {}),\n          ...(memo.aiAwakened ? { aiAwakened: 1 as const } : {}),\n          ...(parseNativeCrusadeFixtureMemory(memo.crusadeFixture)?{crusadeFixture:parseNativeCrusadeFixtureMemory(memo.crusadeFixture)}:{}),\n          movementTether: restoreMovementTether(memo.movementTether),\n          ...(readEncounterGroup(memo.encounterGroup) ? { encounterGroup: readEncounterGroup(memo.encounterGroup) } : {}),\n        });\n      }\n      const doorState: Record<string, 'open' | 'broken'> = {};\n"
        }
      ]
    },
    {
      "file": "src/meta/worldstate.ts",
      "rawBeforeHash": "18a2e529a85a8b7e66e622534800b13d7bebcab2b24d6f95379c140539c5f5d6",
      "rawAfterHash": "3b0c4155b9a412bdc8f2b8547608391a1d253b6c3494b7c7ac5049f084931924",
      "beforeHash": "18a2e529a85a8b7e66e622534800b13d7bebcab2b24d6f95379c140539c5f5d6",
      "afterHash": "3b0c4155b9a412bdc8f2b8547608391a1d253b6c3494b7c7ac5049f084931924",
      "crlfLines": [],
      "hunks": [
        {
          "before": "\n// --- the schema --------------------------------------------------------------\n\n/** One remembered enemy (mirrors the engine's ZoneEnemyMemo — plain JSON). */\nexport interface SavedEnemyMemo {\n  magicPack?: import('../engine/magicPacks').MagicPackState;\n  movementTether?: import('../engine/movementTether').MovementTetherState;\n  encounterGroup?: import('../engine/encounterGroups').EncounterGroupState;\n  defId: string;\n  level: number;\n",
          "after": "\n// --- the schema --------------------------------------------------------------\n\n/** One remembered enemy (mirrors the engine's ZoneEnemyMemo — plain JSON). */\nexport interface SavedEnemyMemo {\n  crusadeFixture?:import('../engine/nativeCrusadeFixtureMemory').NativeCrusadeFixtureMemo;\n  magicPack?: import('../engine/magicPacks').MagicPackState;\n  movementTether?: import('../engine/movementTether').MovementTetherState;\n  encounterGroup?: import('../engine/encounterGroups').EncounterGroupState;\n  defId: string;\n  level: number;\n"
        }
      ]
    },
    {
      "file": "src/packages/overlays/crusade.ts",
      "rawBeforeHash": "c31be187dfd8bf1055b338375ba05d321ac75898045669898252a4282cecd7b0",
      "rawAfterHash": "3cafce610442fd8a0262609add8514cb113612bba7de010415e0cb6c86c9e00a",
      "beforeHash": "c31be187dfd8bf1055b338375ba05d321ac75898045669898252a4282cecd7b0",
      "afterHash": "3cafce610442fd8a0262609add8514cb113612bba7de010415e0cb6c86c9e00a",
      "crlfLines": [],
      "hunks": [
        {
          "before": "    }\n  }\n}\n\n/** Authentic retained lifetime calls are captured before this defining module is exposed. */\nexport const nativeCrusadeLifetimeCalls=Object.freeze({\n  epoch:CrusadeField.prototype.nativeCrusadeEpoch,\n  resolve:CrusadeField.prototype.withCrusadeZoneKill,\n});\n\n// --- bulletins (registered on import — zero panels.ts edits) ------------------\n",
          "after": "    }\n  }\n}\n\n/** Authentic retained lifetime calls are captured before this defining module is exposed. */\nexport const nativeCrusadeLifetimeCalls=Object.freeze({query:CrusadeField.prototype.crusadeOn,\n  epoch:CrusadeField.prototype.nativeCrusadeEpoch,\n  resolve:CrusadeField.prototype.withCrusadeZoneKill,\n});\n\n// --- bulletins (registered on import — zero panels.ts edits) ------------------\n"
        }
      ]
    },
    {
      "file": "src/world/gridWalk.ts",
      "rawBeforeHash": "ee65e0a356a40b3871dba02635029d43cb5471824889b7d8615b80fd0bb702de",
      "rawAfterHash": "32a12d0e74078641b827cff8c93fbd60c1a89609d507c0919423639b2e3e5c16",
      "beforeHash": "ee65e0a356a40b3871dba02635029d43cb5471824889b7d8615b80fd0bb702de",
      "afterHash": "32a12d0e74078641b827cff8c93fbd60c1a89609d507c0919423639b2e3e5c16",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** The transferable form of a GridWalkField (co-op: ship region kinds, derive the\n *  walkable mask client-side). `kinds` is the byte→region-id table so a client maps\n *  the packed bytes identically regardless of its own registration order. */\nexport interface PackedWalk { cols: number; rows: number; cell: number; kinds: string[]; kbits: string; }\n\nexport class GridWalkField implements WalkField {\n  readonly cellOcclusion = true; // shared finite-grid / worldmass ray contract\n  readonly cols: number;\n  readonly rows: number;\n  readonly cell: number;\n",
          "after": "/** The transferable form of a GridWalkField (co-op: ship region kinds, derive the\n *  walkable mask client-side). `kinds` is the byte→region-id table so a client maps\n *  the packed bytes identically regardless of its own registration order. */\nexport interface PackedWalk { cols: number; rows: number; cell: number; kinds: string[]; kbits: string; }\n\nlet nativePaints:Map<GridWalkField,Set<number>>|undefined;\nexport function beginNativeGridPaintReceipt(){const prior=nativePaints,rows=new Map<GridWalkField,Set<number>>();nativePaints=rows;let done=false;return Object.freeze({finish(){if(!done){if(nativePaints!==rows)throw Error('Native grid receipt nesting changed');nativePaints=prior;done=true;}return rows;}});}\nexport function inheritNativeGridPaintReceipt(from:GridWalkField,to:GridWalkField):void {if(!nativePaints)return;const next=new Set<number>();for(const i of nativePaints.get(from)??[]){const y=Math.floor(i/from.cols),x=i%from.cols;if(x<to.cols&&y<to.rows)next.add(y*to.cols+x);}nativePaints.set(to,next);}\nfunction recordNativePaint(g:GridWalkField,a:number,b:number,c:number,d:number,circle?:{x:number;y:number;r2:number}){if(!nativePaints)return;let rows=nativePaints.get(g);if(!rows){rows=new Set();nativePaints.set(g,rows);}for(let y=c;y<=d;y++)for(let x=a;x<=b;x++){if(circle&&Math.pow((x+.5)*g.cell-circle.x,2)+Math.pow((y+.5)*g.cell-circle.y,2)>circle.r2)continue;rows.add(y*g.cols+x);}}\n/** Temporary open-door topology restores the same cells; it creates no terrain owner. */\nexport function withoutNativeGridPaintReceipt<T>(run:()=>T):T {const prior=nativePaints;nativePaints=undefined;try{return run();}finally{nativePaints=prior;}}\nexport class GridWalkField implements WalkField {\n  readonly cellOcclusion = true; // shared finite-grid / worldmass ray contract\n  readonly cols: number;\n  readonly rows: number;\n  readonly cell: number;\n"
        },
        {
          "before": "  fillRegion(x0: number, y0: number, x1: number, y1: number, id: string, quiet = false): void {\n    const byte = this.kindByte(id);\n    const walkable = regionKind(id)?.walkable ? 1 : 0;\n    const a = this.cx(Math.min(x0, x1)), b = this.cx(Math.max(x0, x1));\n    const c = this.cy(Math.min(y0, y1)), d = this.cy(Math.max(y0, y1));\n    for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) {\n      const i = cy * this.cols + cx;\n      this.kind[i] = byte; this.mask[i] = walkable;\n    }\n    if (quiet) { this.version++; return; }\n",
          "after": "  fillRegion(x0: number, y0: number, x1: number, y1: number, id: string, quiet = false): void {\n    const byte = this.kindByte(id);\n    const walkable = regionKind(id)?.walkable ? 1 : 0;\n    const a = this.cx(Math.min(x0, x1)), b = this.cx(Math.max(x0, x1));\n    const c = this.cy(Math.min(y0, y1)), d = this.cy(Math.max(y0, y1));\n    if(nativePaints)recordNativePaint(this,a,b,c,d);\n    for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) {\n      const i = cy * this.cols + cx;\n      this.kind[i] = byte; this.mask[i] = walkable;\n    }\n    if (quiet) { this.version++; return; }\n"
        },
        {
          "before": "  fillDisc(cx: number, cy: number, r: number, id: string): void {\n    const byte = this.kindByte(id);\n    const walkable = regionKind(id)?.walkable ? 1 : 0;\n    const a = this.cx(cx - r), b = this.cx(cx + r), c = this.cy(cy - r), d = this.cy(cy + r);\n    const r2 = r * r;\n    for (let gy = c; gy <= d; gy++) for (let gx = a; gx <= b; gx++) {\n      const px = (gx + 0.5) * this.cell - cx, py = (gy + 0.5) * this.cell - cy;\n      if (px * px + py * py > r2) continue;\n      const i = gy * this.cols + gx;\n      this.kind[i] = byte; this.mask[i] = walkable;\n",
          "after": "  fillDisc(cx: number, cy: number, r: number, id: string): void {\n    const byte = this.kindByte(id);\n    const walkable = regionKind(id)?.walkable ? 1 : 0;\n    const a = this.cx(cx - r), b = this.cx(cx + r), c = this.cy(cy - r), d = this.cy(cy + r);\n    const r2 = r * r;\n    if(nativePaints)recordNativePaint(this,a,b,c,d,{x:cx,y:cy,r2});\n    for (let gy = c; gy <= d; gy++) for (let gx = a; gx <= b; gx++) {\n      const px = (gx + 0.5) * this.cell - cx, py = (gy + 0.5) * this.cell - cy;\n      if (px * px + py * py > r2) continue;\n      const i = gy * this.cols + gx;\n      this.kind[i] = byte; this.mask[i] = walkable;\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaActorAuthority.ts",
      "rawBeforeHash": "abbc812d4b15782728b0f19664d60b5e4ad74b6442284e9ea2c45a43b48744c9",
      "rawAfterHash": "6dd79cd7873dd0f9eb3500ee97476709bd0be87669c3d85d6694eddbe5d1c7c3",
      "beforeHash": "9301f8975ec8d27e29da4e2341992835765b0eb77ba4928d7376e4d77921d1d1",
      "afterHash": "d1648944eccb3b7ff3d083051229935e1b5b91d819f8242e5e141f0b194fbcef",
      "crlfLines": [
        174,
        179,
        185,
        186,
        187
      ],
      "hunks": [
        {
          "before": "}\n\n\n/** Non-granting original absence check, captured in the defining module. */\nexport const nativeUnclaimedActor=NativeAreaActorAuthority.prototype.assertUnclaimed;\nexport const nativeReadyAuthority=Object.freeze({select:NativeAreaActorAuthority.prototype.selectActors,selections:NativeAreaActorAuthority.prototype.assertFinalSelections,localSelections:NativeAreaActorAuthority.prototype.assertFinalLocalSelections,ordinaryEntry:NativeAreaActorAuthority.prototype.selectOrdinaryEntryRows,binding:NativeAreaActorAuthority.prototype.bindingFor,admitted:NativeAreaActorAuthority.prototype.assertAdmitted,physical:NativeAreaActorAuthority.prototype.assertFinalPhysical});\n",
          "after": "}\n\n\n/** Non-granting original absence check, captured in the defining module. */\nexport const nativeUnclaimedActor=NativeAreaActorAuthority.prototype.assertUnclaimed;\nexport const nativeReadyAuthority=Object.freeze({seats:NativeAreaActorAuthority.prototype.physicalSeats,select:NativeAreaActorAuthority.prototype.selectActors,selections:NativeAreaActorAuthority.prototype.assertFinalSelections,localSelections:NativeAreaActorAuthority.prototype.assertFinalLocalSelections,ordinaryEntry:NativeAreaActorAuthority.prototype.selectOrdinaryEntryRows,binding:NativeAreaActorAuthority.prototype.bindingFor,admitted:NativeAreaActorAuthority.prototype.assertAdmitted,physical:NativeAreaActorAuthority.prototype.assertFinalPhysical});\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneAssembly.ts",
      "rawBeforeHash": "bcb1f528c4fe0d151ca80c90da2485ca700f87e8281d27a64cafa35e9e57f3a9",
      "rawAfterHash": "b160784f01b9436e290fc371603cc1018da983964d4ccc40aab53a2e128883fb",
      "beforeHash": "bcb1f528c4fe0d151ca80c90da2485ca700f87e8281d27a64cafa35e9e57f3a9",
      "afterHash": "b160784f01b9436e290fc371603cc1018da983964d4ccc40aab53a2e128883fb",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {NativeSidezoneFurnish} from './nativeSidezoneFurnish';\nimport {assertNativeEmptyCharacterCensus,type NativeCharacterCreationReceipt} from './nativeAreaCharacterCreation';\nimport {NativeTownBodyLedger} from './nativeTownBodyLedger';\nimport {START_ZONE} from '../data/zones';\nimport {hullOf} from '../world/shape';\nimport {NativeAreaScenePresence} from './nativeAreaScenePresence';\nimport type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';\n",
          "after": "import {NativeSidezoneFurnish} from './nativeSidezoneFurnish';\nimport {assertNativeEmptyCharacterCensus,type NativeCharacterCreationReceipt} from './nativeAreaCharacterCreation';\nimport {nativeCrusadeCaptureCalls} from './nativeCrusadeLayoutCapture';\nimport {nativeCrusadeTerrainCalls,NativeCrusadeTerrain} from './nativeCrusadeTerrain';\nimport {NativeTownBodyLedger} from './nativeTownBodyLedger';\nimport {START_ZONE} from '../data/zones';\nimport {hullOf} from '../world/shape';\nimport {NativeAreaScenePresence} from './nativeAreaScenePresence';\nimport type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';\n"
        },
        {
          "before": "/** Retain one assembly through its area's lifetime. Chunk residency never\n * calls preparation or birth again. Runtime publication remains separate. */\nexport class NativeAreaSceneAssembly {\n readonly input:NativeSceneBirthCompositionInput;\n readonly townBodies:NativeTownBodyLedger;\n townLayoutSignature='';\n readonly host:ReturnType<typeof composeNativeSceneBirth>;\n readonly graph:NativeAreaSceneGraph;\n readonly boundaries:NativeAreaSceneBoundaries;\n readonly generation:NativeAreaSceneGeneration;\n",
          "after": "/** Retain one assembly through its area's lifetime. Chunk residency never\n * calls preparation or birth again. Runtime publication remains separate. */\nexport class NativeAreaSceneAssembly {\n readonly input:NativeSceneBirthCompositionInput;\n readonly townBodies:NativeTownBodyLedger;\n readonly crusadeTerrain:NativeCrusadeTerrain;\n townLayoutSignature='';\n readonly host:ReturnType<typeof composeNativeSceneBirth>;\n readonly graph:NativeAreaSceneGraph;\n readonly boundaries:NativeAreaSceneBoundaries;\n readonly generation:NativeAreaSceneGeneration;\n"
        },
        {
          "before": "  if(raw.characterConstruction)assertNativeEmptyCharacterCensus(raw.characterConstruction,campaign,raw.player,raw.initialActors);\n  else if(!raw.initialActors.includes(raw.player)||new Set(raw.initialActors).size!==raw.initialActors.length)throw Error('Native assembly needs one complete initial census');\n  if(raw.carry.inCave!==!campaign.zoneMap[definition.id])throw Error('Native assembly cave identity differs');\n  const scene={zone:definition,player:raw.player,actors:raw.characterConstruction?raw.initialActors as Actor[]:[...raw.initialActors]};\n  const townBodies=this.townBodies=new NativeTownBodyLedger(scene);\n  const scenePresence=this.scenePresence=new NativeAreaScenePresence(scene,campaign,campaign.seats.filter(s=>scene.actors.includes(s.actor)));\n  const timeflow=this.timeflow=new NativeAreaTimeflow(services.timeflow);\n  const environmentState=freshSceneEnvironmentState(),objectives=freshSceneObjectiveState(definition.id,campaign.completedObjectives);\n  const sky=this.sky=new NativeAreaSceneSky({scene,environment:environmentState,campaign});\n  let population:NativeAreaScenePopulation,objectiveController:NativeAreaSceneObjectiveCompletion;\n",
          "after": "  if(raw.characterConstruction)assertNativeEmptyCharacterCensus(raw.characterConstruction,campaign,raw.player,raw.initialActors);\n  else if(!raw.initialActors.includes(raw.player)||new Set(raw.initialActors).size!==raw.initialActors.length)throw Error('Native assembly needs one complete initial census');\n  if(raw.carry.inCave!==!campaign.zoneMap[definition.id])throw Error('Native assembly cave identity differs');\n  const scene={zone:definition,player:raw.player,actors:raw.characterConstruction?raw.initialActors as Actor[]:[...raw.initialActors]};\n  const townBodies=this.townBodies=new NativeTownBodyLedger(scene);\n  const crusadeTerrain=this.crusadeTerrain=new NativeCrusadeTerrain(scene);\n  const townBody:typeof townBodies.record=(kind,row,body)=>{townBodies.record(kind,row,body);crusadeTerrain.record(kind,row,body);};\n  const scenePresence=this.scenePresence=new NativeAreaScenePresence(scene,campaign,campaign.seats.filter(s=>scene.actors.includes(s.actor)));\n  const timeflow=this.timeflow=new NativeAreaTimeflow(services.timeflow);\n  const environmentState=freshSceneEnvironmentState(),objectives=freshSceneObjectiveState(definition.id,campaign.completedObjectives);\n  const sky=this.sky=new NativeAreaSceneSky({scene,environment:environmentState,campaign});\n  let population:NativeAreaScenePopulation,objectiveController:NativeAreaSceneObjectiveCompletion;\n"
        },
        {
          "before": "    // Whole native areas have no mass settlement sanctuary. Native isSafeAt is\n    // a separate convenience rule; a safe objective never suppresses hostility.\n    sanctuaryBlocksCombat:()=>false,\n    resolveHit:(...args)=>services.population.resolveHit(...args)},\n   state:populationState});\n  // Keep the native numeric squad namespace shared by every retained area.\n  Object.defineProperty(populationState,'squadSequence',{enumerable:true,get:()=>campaign.squadSeq,set:(v:number)=>{campaign.squadSeq=v;}});\n  let puzzleController:NativeAreaScenePuzzles;\n  const environmentServices=bindNativeSceneObjectives({completePuzzle:(run:Parameters<World['completePuzzle']>[0])=>puzzleController.completePuzzle(run),timeflow,get time(){return campaign.time;}},objectives);\n  const environment=new NativeAreaSceneEnvironment({scene,geometry,population,\n   services:environmentServices,sources:sources.environment,state:environmentState});\n  const ecology=new NativeAreaSceneEcology({scene,geometry,population,environment:environmentState,\n   services:bindNativeSceneSky(extendView(servicesView(services.ecology,['throngClaimed']),{get time(){return campaign.time;},get seats(){return scenePresence.seats;}}),sky),sources:sources.ecology,state:freshSceneEcologyState()});\n  const settlement=new NativeAreaSceneSettlement({scene,geometry,campaign,state:{townTierIdx:raw.carry.townTierIdx,mercOutpost:null}});\n  const physical=new NativeAreaScenePhysical({scene,geometry,population,settlement,campaign,state:freshScenePhysicalState(),townBody:townBodies.record});\n  const loot=this.lootController=new NativeAreaSceneLoot({scene,scenePresence,geometry,physical,settlement,campaign,state:freshSceneLootState()});\n  this.puzzleController=puzzleController=new NativeAreaScenePuzzles({scene,geometry,environment,campaign,\n   effects:extendView(servicesView(services.puzzleEffects,['executeSkill']),servicesView(loot,['dropGemAt','mintLootResult']))});\n  const traceState={traceRuns:[] as World['traceRuns'],timeflow,get time(){return campaign.time;}};\n  const occurrences=new NativeAreaSceneOccurrences({scene,geometry,population,services:traceState,state:freshSceneOccurrenceState()});\n",
          "after": "    // Whole native areas have no mass settlement sanctuary. Native isSafeAt is\n    // a separate convenience rule; a safe objective never suppresses hostility.\n    sanctuaryBlocksCombat:()=>false,\n    resolveHit:(...args)=>services.population.resolveHit(...args)},\n   state:populationState});\n  Reflect.apply(nativeCrusadeTerrainCalls.bindMemory,crusadeTerrain,[population]);\n  // Keep the native numeric squad namespace shared by every retained area.\n  Object.defineProperty(populationState,'squadSequence',{enumerable:true,get:()=>campaign.squadSeq,set:(v:number)=>{campaign.squadSeq=v;}});\n  let puzzleController:NativeAreaScenePuzzles;\n  const environmentServices=bindNativeSceneObjectives({completePuzzle:(run:Parameters<World['completePuzzle']>[0])=>puzzleController.completePuzzle(run),timeflow,get time(){return campaign.time;}},objectives);\n  const environment=new NativeAreaSceneEnvironment({scene,geometry,population,\n   services:environmentServices,sources:sources.environment,state:environmentState});\n  const ecology=new NativeAreaSceneEcology({scene,geometry,population,environment:environmentState,\n   services:bindNativeSceneSky(extendView(servicesView(services.ecology,['throngClaimed']),{get time(){return campaign.time;},get seats(){return scenePresence.seats;}}),sky),sources:sources.ecology,state:freshSceneEcologyState()});\n  const settlement=new NativeAreaSceneSettlement({scene,geometry,campaign,state:{townTierIdx:raw.carry.townTierIdx,mercOutpost:null}});\n  const physical=new NativeAreaScenePhysical({scene,geometry,population,settlement,campaign,state:freshScenePhysicalState(),townBody});\n  const loot=this.lootController=new NativeAreaSceneLoot({scene,scenePresence,geometry,physical,settlement,campaign,state:freshSceneLootState()});\n  this.puzzleController=puzzleController=new NativeAreaScenePuzzles({scene,geometry,environment,campaign,\n   effects:extendView(servicesView(services.puzzleEffects,['executeSkill']),servicesView(loot,['dropGemAt','mintLootResult']))});\n  const traceState={traceRuns:[] as World['traceRuns'],timeflow,get time(){return campaign.time;}};\n  const occurrences=new NativeAreaSceneOccurrences({scene,geometry,population,services:traceState,state:freshSceneOccurrenceState()});\n"
        },
        {
          "before": "  const adoption=new NativeAreaSceneAdoption({scene,geometry,campaign,state:runtimeState});\n  this.generation=new NativeAreaSceneGeneration({scene,geometry,campaign,state:transition});\n  const runtimeBirth=new NativeAreaSceneRuntimeBirth({scene,geometry,population,generation:this.generation,theater,campaign,state:runtimeState,sources:sources.runtime});\n  const titans=new NativeAreaSceneTitans({scene,geometry,population,campaign});\n  const registry=new NativeAreaSceneRuntimeRegistry({scene,geometry,birth:runtimeBirth,titans,descentState:transition,state:freshSceneRuntimeRegistryState()});\n  this.input=Object.freeze({townBody:townBodies.record,scene,geometry,population,environment,ecology,settlement,occurrences,bounty,physical,residents,objectives,\n   sources:sources.inhabitants,campaign,state:{...freshSceneBirthState(),vendorStock:campaign.vendorStock,theaterVisitSeq:campaign.theaterVisitSeq},harbor,openings,theater,encounters,sites,history,descent,coast,arrival,adoption,registry,sky});\n  this.host=composeNativeSceneBirth(this.input);\n  // Brandt's once-armed shelf is run state, including between counter areas.\n  Object.defineProperty(this.input.state,'vendorStock',{enumerable:true,get:()=>campaign.vendorStock,set:(v:World['vendorStock'])=>{campaign.vendorStock=v;}});\n  this.graph=new NativeAreaSceneGraph({coast,campaign});this.boundaries=new NativeAreaSceneBoundaries(this.graph);\n  for(const key of ['input','host','graph','boundaries','generation','transition','timeflow','sky','puzzleController','lootController','objectiveController','scenePresence','objectiveServices'])Object.defineProperty(this,key,{writable:false,configurable:false});\n }\n /** Admission is a separate runtime operation, after birth and explicit observer removal. */\n activatePresence(authority:NativeAreaActorAuthority<object>):void{\n  if(this.#phase!=='born')throw Error('Native presence activation requires completed birth');\n  this.scenePresence.activate(authority);\n",
          "after": "  const adoption=new NativeAreaSceneAdoption({scene,geometry,campaign,state:runtimeState});\n  this.generation=new NativeAreaSceneGeneration({scene,geometry,campaign,state:transition});\n  const runtimeBirth=new NativeAreaSceneRuntimeBirth({scene,geometry,population,generation:this.generation,theater,campaign,state:runtimeState,sources:sources.runtime});\n  const titans=new NativeAreaSceneTitans({scene,geometry,population,campaign});\n  const registry=new NativeAreaSceneRuntimeRegistry({scene,geometry,birth:runtimeBirth,titans,descentState:transition,state:freshSceneRuntimeRegistryState()});\n  this.input=Object.freeze({townBody,scene,geometry,population,environment,ecology,settlement,occurrences,bounty,physical,residents,objectives,\n   sources:sources.inhabitants,campaign,state:{...freshSceneBirthState(),vendorStock:campaign.vendorStock,theaterVisitSeq:campaign.theaterVisitSeq},harbor,openings,theater,encounters,sites,history,descent,coast,arrival,adoption,registry,sky});\n  this.host=composeNativeSceneBirth(this.input);\n  Reflect.apply(nativeCrusadeTerrainCalls.bindDoorMemory,crusadeTerrain,[this.host]);\n  // Brandt's once-armed shelf is run state, including between counter areas.\n  Object.defineProperty(this.input.state,'vendorStock',{enumerable:true,get:()=>campaign.vendorStock,set:(v:World['vendorStock'])=>{campaign.vendorStock=v;}});\n  this.graph=new NativeAreaSceneGraph({coast,campaign});this.boundaries=new NativeAreaSceneBoundaries(this.graph);\n  for(const key of ['crusadeTerrain','input','host','graph','boundaries','generation','transition','timeflow','sky','puzzleController','lootController','objectiveController','scenePresence','objectiveServices'])Object.defineProperty(this,key,{writable:false,configurable:false});\n }\n /** Admission is a separate runtime operation, after birth and explicit observer removal. */\n activatePresence(authority:NativeAreaActorAuthority<object>):void{\n  if(this.#phase!=='born')throw Error('Native presence activation requires completed birth');\n  this.scenePresence.activate(authority);\n"
        },
        {
          "before": "  try{return this.graph.withGenerationPolicies(()=>{\n   this.boundaries.prepare(this.input.scene.zone,firstVisit,this.transition.inCave);\n   const layout=this.generation.generate({...entry});\n   this.input.geometry.adopt(layout.layout,entry);\n   this.#sidezoneFurnish.adopt(layout.layout);\n   if(this.input.scene.zone.id===START_ZONE){this.townBodies.adopt(layout.layout);this.townLayoutSignature=this.townSignature();}\n   const fingerprint=serializeNativeAreaData(session.read(source).members);\n   Object.freeze(layout);\n   this.#prepared={source,session,layout,fingerprint,firstVisit,rngState:layout.rng.snapshot(),memoryState:serializeNativeAreaData(layout.memory)};this.#phase='prepared';\n   return this.#preparedPlacement=Object.freeze({entry:Object.freeze({...entry}),layoutSeed:layout.layoutSeed,...(layout.layout.spawnAt?{spawnAt:Object.freeze({...layout.layout.spawnAt})}:{})});\n",
          "after": "  try{return this.graph.withGenerationPolicies(()=>{\n   this.boundaries.prepare(this.input.scene.zone,firstVisit,this.transition.inCave);\n   const layout=this.generation.generate({...entry});\n   this.input.geometry.adopt(layout.layout,entry);\n   this.#sidezoneFurnish.adopt(layout.layout);\n   Reflect.apply(nativeCrusadeTerrainCalls.adopt,this.crusadeTerrain,[Reflect.apply(nativeCrusadeCaptureCalls.read,this.generation.crusadeLayout,[]),layout.layout]);\n   if(this.input.scene.zone.id===START_ZONE){this.townBodies.adopt(layout.layout);this.townLayoutSignature=this.townSignature();}\n   const fingerprint=serializeNativeAreaData(session.read(source).members);\n   Object.freeze(layout);\n   this.#prepared={source,session,layout,fingerprint,firstVisit,rngState:layout.rng.snapshot(),memoryState:serializeNativeAreaData(layout.memory)};this.#phase='prepared';\n   return this.#preparedPlacement=Object.freeze({entry:Object.freeze({...entry}),layoutSeed:layout.layoutSeed,...(layout.layout.spawnAt?{spawnAt:Object.freeze({...layout.layout.spawnAt})}:{})});\n"
        },
        {
          "before": "  this.#phase='birthing';\n  try{this.graph.withGenerationPolicies(()=>{\n   const {scene}=this.input,{layout}=prepared;\n   runComposedNativeBirth(this.host,scene.zone,layout.layout,scene.zone.id,layout.memory,layout.rng,\n    prepared.firstVisit,this.transition.entryFrom??undefined,this.transition.inCave,scene.player);\n  });this.#phase='born';}catch(error){this.#phase='failed';throw error;}\n }\n}\n\n/** Defining-module capture; never read a cyclic class before initialization. */\nexport const nativeReadyAssemblyPhase=Object.getOwnPropertyDescriptor(NativeAreaSceneAssembly.prototype,'phase')!.get!;\n",
          "after": "  this.#phase='birthing';\n  try{this.graph.withGenerationPolicies(()=>{\n   const {scene}=this.input,{layout}=prepared;\n   runComposedNativeBirth(this.host,scene.zone,layout.layout,scene.zone.id,layout.memory,layout.rng,\n    prepared.firstVisit,this.transition.entryFrom??undefined,this.transition.inCave,scene.player);\n  });Reflect.apply(nativeCrusadeTerrainCalls.finishBirth,this.crusadeTerrain,[]);this.#phase='born';}catch(error){this.#phase='failed';throw error;}\n }\n}\n\n/** Defining-module capture; never read a cyclic class before initialization. */\nexport const nativeReadyAssemblyPhase=Object.getOwnPropertyDescriptor(NativeAreaSceneAssembly.prototype,'phase')!.get!;\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombat.ts",
      "rawBeforeHash": "693a729514bfe163a8a0e9aaa03413cffab65e23c5ea2d51f06f0192e3cdd521",
      "rawAfterHash": "5032195bc96af7062c6ed1d727ab7767871d180eb8d5028fbbbc19e9c73b8808",
      "beforeHash": "693a729514bfe163a8a0e9aaa03413cffab65e23c5ea2d51f06f0192e3cdd521",
      "afterHash": "5032195bc96af7062c6ed1d727ab7767871d180eb8d5028fbbbc19e9c73b8808",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {NativeAreaSceneCombatCampaign} from './nativeAreaSceneCombatCampaign';\nimport {NativeAreaSceneCombatArena} from './nativeAreaSceneCombatArena';\nimport {NativeAreaSceneCombatControl} from './nativeAreaSceneCombatControl';\nimport {NativeAreaSceneCampaignTransitions} from './nativeAreaSceneCampaignTransitions';\nimport {NativeAreaSceneCampaignFrame,type NativeAreaCampaignFrameHost} from './nativeAreaSceneCampaignFrame';\nimport {isNativeAreaSceneTransitionCoordinator,NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';\nimport {NativeAreaSceneCombatRuntimeState} from './nativeAreaSceneCombatRuntimeState';\nimport {createNativeAreaCombatOperation,type NativeAreaCombatOperation,type NativeCombatActivation} from './nativeAreaCombatOperation';\nimport type {NativeSceneCombatHost} from '../engine/nativeSceneCombatHost';\nimport type {NativeAssaultHost} from '../engine/nativeAssaultHost';\nimport type {NativeSceneCombatContextHost} from '../engine/nativeSceneCombatContext';\n",
          "after": "import {NativeAreaSceneCombatCampaign} from './nativeAreaSceneCombatCampaign';\nimport {NativeAreaSceneCombatArena} from './nativeAreaSceneCombatArena';\nimport {NativeAreaSceneCombatControl} from './nativeAreaSceneCombatControl';\nimport {NativeAreaSceneCampaignTransitions} from './nativeAreaSceneCampaignTransitions';\nimport {NativeAreaSceneCampaignFrame,type NativeAreaCampaignFrameHost} from './nativeAreaSceneCampaignFrame';\nimport {nativeCrusadeTerrainCalls} from './nativeCrusadeTerrain';\nimport {nativeCrusadeTerrainArrival,isNativeAreaSceneTransitionCoordinator,NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';\nimport {NativeAreaSceneCombatRuntimeState} from './nativeAreaSceneCombatRuntimeState';\nimport {createNativeAreaCombatOperation,type NativeAreaCombatOperation,type NativeCombatActivation} from './nativeAreaCombatOperation';\nimport type {NativeSceneCombatHost} from '../engine/nativeSceneCombatHost';\nimport type {NativeAssaultHost} from '../engine/nativeAssaultHost';\nimport type {NativeSceneCombatContextHost} from '../engine/nativeSceneCombatContext';\n"
        },
        {
          "before": "   this.castingPreparation.input.state.comboCursors.delete(actor);r.dotAccum.delete(actor.id);\n   \n  }\n });}\n /** Arrival-owned station growth; no arbitrary callback or factory capability is exposed. */\n refreshTownStations(representative:Actor):boolean {Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.assertTownArrival,this.input.coordinator,[this]);const thisHost=this.#host;return this.#operation.enter({permission:'physical',physical:[],sources:[]},()=>refreshNativeTownStations(this.input.assembly,this.input.characterWriter,this.input.authority,{\n  get createMonster(){return thisHost.createMonster;},admit:body=>this.#operation.admitCombatBirth(body),retire:body=>this.#operation.retireCombatBody(body),layoutChanged:value=>{this.runtimeState.frame.townLayoutChangedOnLoad=value;}\n },representative));}\n /** Separate native revisit operations; each requires its exact selected character. */\n arrivePlayerCorpses():void {const select=NativeAreaSceneTransitionCoordinator.prototype.delayedArrivalBody,body=Reflect.apply(select,this.input.coordinator,[this,'corpse']);this.#operation.enter({permission:'physical',physical:[body]},()=>{const owner=this.input.assembly.input.history,fn=owner.spawnPlayerCorpses,def=this.scene.zone;if(Reflect.apply(select,this.input.coordinator,[this,'corpse'])!==body)throw Error('Native corpse arrival changed');Reflect.apply(fn,owner,[def]);});}\n",
          "after": "   this.castingPreparation.input.state.comboCursors.delete(actor);r.dotAccum.delete(actor.id);\n   \n  }\n });}\n /** Arrival-owned station growth; no arbitrary callback or factory capability is exposed. */\n refreshCrusadeTerrain():boolean {const entry=Reflect.apply(nativeCrusadeTerrainArrival,this.input.coordinator,[this]),host=this.#host;return this.#operation.enter({permission:'physical',physical:[],sources:[]},()=>Reflect.apply(nativeCrusadeTerrainCalls.refresh,this.input.assembly.crusadeTerrain,[this,this.input.assembly,this.input.authority,{get createMonster(){return host.createMonster;},admit:body=>this.#operation.admitCombatBirth(body),retire:body=>this.#operation.retireCombatBody(body),release:body=>this.releaseGarrison(body),validate:()=>{if(Reflect.apply(nativeCrusadeTerrainArrival,this.input.coordinator,[this])!==entry)throw Error('Crusade arrival changed');}},entry]));}\n refreshTownStations(representative:Actor):boolean {Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.assertTownArrival,this.input.coordinator,[this]);const thisHost=this.#host;return this.#operation.enter({permission:'physical',physical:[],sources:[]},()=>refreshNativeTownStations(this.input.assembly,this.input.characterWriter,this.input.authority,{\n  get createMonster(){return thisHost.createMonster;},admit:body=>this.#operation.admitCombatBirth(body),retire:body=>this.#operation.retireCombatBody(body),layoutChanged:value=>{this.runtimeState.frame.townLayoutChangedOnLoad=value;}\n },representative));}\n /** Separate native revisit operations; each requires its exact selected character. */\n arrivePlayerCorpses():void {const select=NativeAreaSceneTransitionCoordinator.prototype.delayedArrivalBody,body=Reflect.apply(select,this.input.coordinator,[this,'corpse']);this.#operation.enter({permission:'physical',physical:[body]},()=>{const owner=this.input.assembly.input.history,fn=owner.spawnPlayerCorpses,def=this.scene.zone;if(Reflect.apply(select,this.input.coordinator,[this,'corpse'])!==body)throw Error('Native corpse arrival changed');Reflect.apply(fn,owner,[def]);});}\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneGeneration.ts",
      "rawBeforeHash": "0e6a9bb545ca0cd51624766712a669872d1b1150fe0a9f94376e54ea691bae50",
      "rawAfterHash": "903cadbe6393ec5e7cbce8fa10ba3870477db73ee8108e392d481d0deed84e5d",
      "beforeHash": "0e6a9bb545ca0cd51624766712a669872d1b1150fe0a9f94376e54ea691bae50",
      "afterHash": "903cadbe6393ec5e7cbce8fa10ba3870477db73ee8108e392d481d0deed84e5d",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Native seed and held-settlement layout owner; does not admit a complete area. */\nimport type { NativeSceneActorContext, NativeAreaSceneGeometry } from './nativeAreaSceneGeometry';\nimport type { Vec2 } from '../core/math';\nimport * as native from '../engine/nativeLayoutGeneration';\nexport type NativeLayoutGenerationState=Pick<native.NativeLayoutGenerationHost,'inCave'|'charBorn'|'charRegrowAcc'|'crusadeWorksAt'>;\nexport type NativeLayoutGenerationCampaign=Pick<native.NativeLayoutGenerationHost,'zoneMemory'|'time'|'sim'>;\nexport interface NativeLayoutGenerationInput {\n scene:NativeSceneActorContext;\n geometry:Pick<NativeAreaSceneGeometry,'state'|'arena'|'exits'|'currentZoneSeed'|'farPointDraws'>;\n state:NativeLayoutGenerationState;\n campaign:NativeLayoutGenerationCampaign;\n}\nexport class NativeAreaSceneGeneration {\n readonly input:NativeLayoutGenerationInput;\n readonly host:native.NativeLayoutGenerationHost;\n constructor(raw:NativeLayoutGenerationInput){\n  const bindings=Object.create(null);\n  for(const key of ['scene','geometry','state','campaign']){\n",
          "after": "/** Native seed and held-settlement layout owner; does not admit a complete area. */\nimport type { NativeSceneActorContext, NativeAreaSceneGeometry } from './nativeAreaSceneGeometry';\nimport type { Vec2 } from '../core/math';\nimport * as native from '../engine/nativeLayoutGeneration';\nimport {nativeCrusadeCaptureCalls,NativeCrusadeLayoutCapture} from './nativeCrusadeLayoutCapture';\nexport type NativeLayoutGenerationState=Pick<native.NativeLayoutGenerationHost,'inCave'|'charBorn'|'charRegrowAcc'|'crusadeWorksAt'>;\nexport type NativeLayoutGenerationCampaign=Pick<native.NativeLayoutGenerationHost,'zoneMemory'|'time'|'sim'>;\nexport interface NativeLayoutGenerationInput {\n scene:NativeSceneActorContext;\n geometry:Pick<NativeAreaSceneGeometry,'state'|'arena'|'exits'|'currentZoneSeed'|'farPointDraws'>;\n state:NativeLayoutGenerationState;\n campaign:NativeLayoutGenerationCampaign;\n}\nexport class NativeAreaSceneGeneration {\n readonly crusadeLayout=new NativeCrusadeLayoutCapture();\n readonly input:NativeLayoutGenerationInput;\n readonly host:native.NativeLayoutGenerationHost;\n constructor(raw:NativeLayoutGenerationInput){\n  const bindings=Object.create(null);\n  for(const key of ['scene','geometry','state','campaign']){\n"
        },
        {
          "before": "  fields(()=>input.campaign,['zoneMemory','time','sim']);fields(()=>input.state,['inCave']);\n  fields(()=>input.state,['charBorn','charRegrowAcc','crusadeWorksAt'],true);\n  for(const key of ['zoneMemoryFresh','crusadeFixtureSpecs'])Object.defineProperty(host,key,{enumerable:true,get(){\n   const owner=self as unknown as Record<string,Function>,fn=owner[key];return(...args:unknown[])=>fn.apply(owner,args);\n  }});\n  this.host=Object.freeze(host);\n  Object.defineProperty(this,'host',{enumerable:false,writable:false,configurable:false});\n  Object.defineProperty(this,'input',{enumerable:false,writable:false,configurable:false});\n }\n zoneMemoryFresh(...args:Parameters<typeof native.nativeZoneMemoryFresh> extends [unknown,...infer A]?A:never){return native.nativeZoneMemoryFresh(this.host,...args);}\n crusadeFixtureSpecs(...args:Parameters<typeof native.nativeCrusadeFixtureSpecs> extends [unknown,...infer A]?A:never){return native.nativeCrusadeFixtureSpecs(this.host,...args);}\n generate(entry:Vec2){const def=this.input.scene.zone;return native.generateNativeAreaLayout(this.host,def,entry,def.id);}\n}\n",
          "after": "  fields(()=>input.campaign,['zoneMemory','time','sim']);fields(()=>input.state,['inCave']);\n  fields(()=>input.state,['charBorn','charRegrowAcc','crusadeWorksAt'],true);\n  for(const key of ['zoneMemoryFresh','crusadeFixtureSpecs'])Object.defineProperty(host,key,{enumerable:true,get(){\n   const owner=self as unknown as Record<string,Function>,fn=owner[key];return(...args:unknown[])=>fn.apply(owner,args);\n  }});\n  Object.defineProperties(host,{observeCrusadeLayout:{value:(info:Parameters<NativeCrusadeLayoutCapture['select']>[1])=>Reflect.apply(nativeCrusadeCaptureCalls.select,this.crusadeLayout,[input.campaign.sim.crusadeField,info,input.scene.zone])},extraFixturePass:{value:this.crusadeLayout.pass}});\n  this.host=Object.freeze(host);\n  Object.defineProperty(this,'host',{enumerable:false,writable:false,configurable:false});\n  Object.defineProperty(this,'input',{enumerable:false,writable:false,configurable:false});\n  Object.defineProperty(this,'crusadeLayout',{writable:false,configurable:false});\n }\n zoneMemoryFresh(...args:Parameters<typeof native.nativeZoneMemoryFresh> extends [unknown,...infer A]?A:never){return native.nativeZoneMemoryFresh(this.host,...args);}\n crusadeFixtureSpecs(...args:Parameters<typeof native.nativeCrusadeFixtureSpecs> extends [unknown,...infer A]?A:never){return native.nativeCrusadeFixtureSpecs(this.host,...args);}\n generate(entry:Vec2){const def=this.input.scene.zone;Reflect.apply(nativeCrusadeCaptureCalls.reset,this.crusadeLayout,[]);let result;try{result=native.generateNativeAreaLayout(this.host,def,entry,def.id);}catch(error){Reflect.apply(nativeCrusadeCaptureCalls.reset,this.crusadeLayout,[]);throw error;}Reflect.apply(nativeCrusadeCaptureCalls.complete,this.crusadeLayout,[this.input.campaign.sim.crusadeField,result.layout]);return result;}\n}\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaScenePopulation.ts",
      "rawBeforeHash": "eb59eeb2000f37971138c59025a6830e0d8d89673bb6fc790cce9d68807e655e",
      "rawAfterHash": "bd65052e099d2a35980526ce5de140a968a57b7551524b157e7014ed6334eb44",
      "beforeHash": "eb59eeb2000f37971138c59025a6830e0d8d89673bb6fc790cce9d68807e655e",
      "afterHash": "bd65052e099d2a35980526ce5de140a968a57b7551524b157e7014ed6334eb44",
      "crlfLines": [],
      "hunks": [
        {
          "before": "}\n\n/** Immutable original operation, captured after this class initializes even on a cold cycle. */\nexport const nativePopulationCreateMonster=NativeAreaScenePopulation.prototype.createMonster;\nexport const nativePopulationCreateMonsterForAdmission=NativeAreaScenePopulation.prototype.createMonsterForAdmission;\n",
          "after": "}\n\n/** Immutable original operation, captured after this class initializes even on a cold cycle. */\nexport const nativePopulationCreateMonster=NativeAreaScenePopulation.prototype.createMonster;\nexport const nativePopulationCreateMonsterForAdmission=NativeAreaScenePopulation.prototype.createMonsterForAdmission;\n\n/** Non-granting original factory provenance for fixture insertion receipts. */\nexport const nativePopulationFactoryOwner=NativeAreaScenePopulation.prototype.factoryOwnerOf;\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "rawBeforeHash": "6e673954267442dab73029d6ced6b3273bcdb3be63b113044db6b95168a4b92d",
      "rawAfterHash": "bc4d8b045ac87b57064aeb0b76dff8c42dc4337f24bd2329ec0484f1e01c1d47",
      "beforeHash": "6e673954267442dab73029d6ced6b3273bcdb3be63b113044db6b95168a4b92d",
      "afterHash": "bc4d8b045ac87b57064aeb0b76dff8c42dc4337f24bd2329ec0484f1e01c1d47",
      "crlfLines": [],
      "hunks": [
        {
          "before": "  if(local!==r.local||own(this.input.characterWriter,'localSeat')!==r.local||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||!frame.seats.includes(r.seat)||own(row.binding.scene,'player')!==r.body||kind==='corpse'&&r.seat!==r.local)throw Error('Native delayed arrival character changed');\n  Reflect.apply(authorityFinalPhysical,this.input.authority,[row.binding,[r.body]]);return r.body;\n }\n #furnishArrival:NativeAreaSceneCombat|null=null;\n #townArrival:NativeAreaSceneCombat|null=null;\n assertFurnishArrival(combat:NativeAreaSceneCombat):void {if(!this.#moving||!this.#frame?.active||this.#furnishArrival!==combat)throw Error('Native furnishing needs its selected arrival');}\n assertTownArrival(combat:NativeAreaSceneCombat):void {if(!this.#moving||!this.#frame?.active||this.#townArrival!==combat)throw Error('Native town refresh needs its selected genuine arrival');}\n /** Campaign death policy sees every genuine admitted hand. The returned roster\n  * is a finite identity snapshot; native alive/merc/account rules still decide. */\n /** The shared dive identifies its actual source even when the final down was elsewhere.\n",
          "after": "  if(local!==r.local||own(this.input.characterWriter,'localSeat')!==r.local||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||!frame.seats.includes(r.seat)||own(row.binding.scene,'player')!==r.body||kind==='corpse'&&r.seat!==r.local)throw Error('Native delayed arrival character changed');\n  Reflect.apply(authorityFinalPhysical,this.input.authority,[row.binding,[r.body]]);return r.body;\n }\n #furnishArrival:NativeAreaSceneCombat|null=null;\n #townArrival:NativeAreaSceneCombat|null=null;\n #crusadeTerrainArrival:{combat:NativeAreaSceneCombat;entry:Readonly<Vec2>;check:()=>void}|null=null;\n crusadeTerrainEntry(combat:NativeAreaSceneCombat):Readonly<Vec2> {const row=this.#crusadeTerrainArrival;if(!this.#moving||!this.#frame?.active||row?.combat!==combat)throw Error('Crusade works need the actual retained arrival');row.check();return row.entry;}\n assertFurnishArrival(combat:NativeAreaSceneCombat):void {if(!this.#moving||!this.#frame?.active||this.#furnishArrival!==combat)throw Error('Native furnishing needs its selected arrival');}\n assertTownArrival(combat:NativeAreaSceneCombat):void {if(!this.#moving||!this.#frame?.active||this.#townArrival!==combat)throw Error('Native town refresh needs its selected genuine arrival');}\n /** Campaign death policy sees every genuine admitted hand. The returned roster\n  * is a finite identity snapshot; native alive/merc/account rules still decide. */\n /** The shared dive identifies its actual source even when the final down was elsewhere.\n"
        },
        {
          "before": "   this.#ready(source);if(!firstBirth)this.#ready(destination);this.#assertProjection();finalSeats(capture);this.input.authority.assertFinalSelections(selected);this.input.authority.assertFinalPhysical(destination.binding);\n   if(own(scene,'actors')!==sourceCensus||own(destScene,'actors')!==destCensus)throw Error('Native transition census replaced before commit');\n   mutableCensus(sourceCensus);mutableCensus(destCensus);\n   const geometry=destination.ongoing.assembly.input.geometry,prepared=destination.ongoing.assembly.preparedPlacement;if(!prepared)throw Error('Native destination lost its actual prepared placement');\n   const back=from?geometry.exits.find(e=>e.to===from):undefined,center=vec(geometry.arena.w/2,geometry.arena.h/2);let entry:Vec2=vec(prepared.entry.x,prepared.entry.y);if(back){const angle=angleTo(back.pos,center);entry=vec(back.pos.x+Math.cos(angle)*120,back.pos.y+Math.sin(angle)*120);}const landing=!back&&prepared.spawnAt?prepared.spawnAt:entry;\n   // Exact native motion/tier reset statements, before destination birth. Quiet\n   // carom teardown uses the real source operation while the body is still\n   // physically source-owned; that native branch touches only the actor.\n   incoming.pos=geometry.clampPos(vec(landing.x,landing.y),incoming.radius);incoming.push=null;incoming.dash=null;\n   incoming.tier=0;incoming.onTierLink=false;incoming.aiTierGoal=undefined;source.combat.endCarom(incoming,{quiet:true});incoming.frameLockRect=null;\n",
          "after": "   this.#ready(source);if(!firstBirth)this.#ready(destination);this.#assertProjection();finalSeats(capture);this.input.authority.assertFinalSelections(selected);this.input.authority.assertFinalPhysical(destination.binding);\n   if(own(scene,'actors')!==sourceCensus||own(destScene,'actors')!==destCensus)throw Error('Native transition census replaced before commit');\n   mutableCensus(sourceCensus);mutableCensus(destCensus);\n   const geometry=destination.ongoing.assembly.input.geometry,prepared=destination.ongoing.assembly.preparedPlacement;if(!prepared)throw Error('Native destination lost its actual prepared placement');\n   const back=from?geometry.exits.find(e=>e.to===from):undefined,center=vec(geometry.arena.w/2,geometry.arena.h/2);let entry:Vec2=vec(prepared.entry.x,prepared.entry.y);if(back){const angle=angleTo(back.pos,center);entry=vec(back.pos.x+Math.cos(angle)*120,back.pos.y+Math.sin(angle)*120);}const landing=!back&&prepared.spawnAt?prepared.spawnAt:entry;\n   if(!firstBirth){this.#crusadeTerrainArrival={combat:destination.combat,entry:Object.freeze({...entry}),check:()=>{finalSeats(capture);Reflect.apply(nativeReadyAuthority.selections,this.input.authority,[selected]);Reflect.apply(nativeReadyAuthority.physical,this.input.authority,[destination!.binding]);if(own(scene,'actors')!==sourceCensus||own(destScene,'actors')!==destCensus)throw Error('Crusade arrival replaced its actual census');}};try{destination.combat.refreshCrusadeTerrain();}finally{this.#crusadeTerrainArrival=null;}}\n   // Exact native motion/tier reset statements, before destination birth. Quiet\n   // carom teardown uses the real source operation while the body is still\n   // physically source-owned; that native branch touches only the actor.\n   incoming.pos=geometry.clampPos(vec(landing.x,landing.y),incoming.radius);incoming.push=null;incoming.dash=null;\n   incoming.tier=0;incoming.onTierLink=false;incoming.aiTierGoal=undefined;source.combat.endCarom(incoming,{quiet:true});incoming.frameLockRect=null;\n"
        },
        {
          "before": "export function tryNativeOrdinaryCampaignArea(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat):NativeAreaSceneOngoing|undefined{return Reflect.apply(ordinaryRouteMethods.area,coordinator,[combat]);}\n\nexport function tryNativeOrdinaryResidentAreas(coordinator:NativeAreaSceneTransitionCoordinator):readonly NativeAreaSceneOngoing[]|undefined{return Reflect.apply(ordinaryRouteMethods.cohort,coordinator,[]);}\n\nexport function tryRunNativeOrdinaryCampaign<T>(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,action:()=>T):{value:T}|undefined{return Reflect.apply(ordinaryRouteMethods.invoke,coordinator,[combat,action]) as {value:T}|undefined;}\n",
          "after": "export function tryNativeOrdinaryCampaignArea(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat):NativeAreaSceneOngoing|undefined{return Reflect.apply(ordinaryRouteMethods.area,coordinator,[combat]);}\n\nexport function tryNativeOrdinaryResidentAreas(coordinator:NativeAreaSceneTransitionCoordinator):readonly NativeAreaSceneOngoing[]|undefined{return Reflect.apply(ordinaryRouteMethods.cohort,coordinator,[]);}\n\nexport function tryRunNativeOrdinaryCampaign<T>(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,action:()=>T):{value:T}|undefined{return Reflect.apply(ordinaryRouteMethods.invoke,coordinator,[combat,action]) as {value:T}|undefined;}\n\nexport const nativeCrusadeTerrainArrival=NativeAreaSceneTransitionCoordinator.prototype.crusadeTerrainEntry;\n"
        }
      ]
    }
  ],
  "readers": [
    {
      "file": "balance/nativeHuntMigrationFixture.ts",
      "before": "03e029846cf9e8416172481115be084e643aef19b252102cc98f287a38fedda9",
      "after": "6a7bd2c0ee29c7c905497dc44ef2d9cc9a1fe368daf6a8fd68da879ba4236738",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import * as fs from './nativeCrusadeTerrainFS';"
        }
      ],
      "original": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport {nativeHuntMigrationArchive as archive} from './nativeHuntMigrationArchive';\nconst hash=(text:string)=>createHash('sha256').update(text).digest('hex'),normal=(text:string)=>text.replace(/\\r\\n?/g,'\\n');\nconst rows=new Map(archive.rows.map(row=>[row.file,row]));\n// Only descriptors opened through this finite historical source view are\n// projected. Untracked descriptors remain native. Close view-owned descriptors\n// through this view: external close/reopen of the same file identity cannot be\n// distinguished by native fd APIs. Reuse for a different file is detected.\n// Reads consume the native descriptor position; partial/repeated source reads\n// fail the whole-source guard. No seek, reread or replacement descriptor occurs.\nconst descriptors=new Map<number,{key:string;dev:bigint;ino:bigint}>();\nexport const openNativeHuntMigration=((...args:Parameters<typeof fs.openSync>):number=>{\n const fd=fs.openSync(...args);descriptors.delete(fd);const key=sourceKey(args[0]);if(key&&rows.has(key)){const {dev,ino}=fs.fstatSync(fd,{bigint:true});descriptors.set(fd,{key,dev,ino});}return fd;\n}) as typeof fs.openSync;\nexport const closeNativeHuntMigration=((fd:number):void=>{\n try{fs.closeSync(fd);}finally{descriptors.delete(fd);}\n}) as typeof fs.closeSync;\n/** Exact accepted164 source view before all its unchanged historical checks. */\nexport function beforeNativeHuntMigration(file:string,input:string):string {\n const row=rows.get(file);if(!row)return input;\n let source=normal(input);if(hash(source)!==row.beforeHash){\n  assert.equal(hash(source),row.afterHash,'Unknown exact native Hunt migration source: '+file);\n  for(const hunk of row.hunks){assert.equal(source.split(hunk.after).length,2,'Unique native Hunt migration hunk');source=source.replace(hunk.after,hunk.before);}\n  assert.equal(hash(source),row.beforeHash,'Complete accepted164 predecessor: '+file);\n }\n let line=0;return source.replace(/\\n/g,()=>row.crlfLines.includes(line++)?'\\r\\n':'\\n');\n}\nfunction sourceKey(file:fs.PathOrFileDescriptor):string|undefined {\n if(typeof file==='number'){const row=descriptors.get(file);if(!row)return undefined;const {dev,ino}=fs.fstatSync(file,{bigint:true});if(dev!==row.dev||ino!==row.ino){descriptors.delete(file);return undefined;}return row.key;}\n const value=typeof file==='string'?file:Buffer.isBuffer(file)?file.toString():fileURLToPath(file);\n return path.relative(fileURLToPath(new URL('../',import.meta.url)),path.resolve(value)).replaceAll('\\\\','/');\n}\nexport const readNativeHuntMigration=((file:fs.PathOrFileDescriptor,options?:BufferEncoding|{encoding?:BufferEncoding|null;flag?:string}|null):string|Buffer=>{\n const raw=fs.readFileSync(file,options),key=sourceKey(file);if(key===undefined||!rows.has(key))return raw;\n const encoding=typeof options==='string'?options:options?.encoding;assert(encoding==null||encoding==='utf8'||encoding==='utf-8','Hunt migration source requires UTF-8 or raw bytes');\n const before=beforeNativeHuntMigration(key,Buffer.isBuffer(raw)?raw.toString('utf8'):raw);return Buffer.isBuffer(raw)?Buffer.from(before,'utf8'):before;\n}) as typeof fs.readFileSync;\r\n",
      "nonImportHash": "29e99d845339abcfa978df011337ff9f01f23b965a491935836985c79b900d52",
      "assertionHash": "2cd197875e454e2ac8494eb0194360c0dc360123dc627cfa0d61188de8b98b57",
      "assertions": 4
    },
    {
      "file": "balance/probe_nativehuntmigrationsource.ts",
      "before": "f2d25b467f17afc6d1c6c9e6e578fbc5a13bca79cf3fe8e89937a1b2a834177f",
      "after": "ce3e777895f577de81eee0c4c39f0cbbb007e6317df2c0f830d6a702da4ae7ba",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import * as fs from './nativeCrusadeTerrainFS';"
        }
      ],
      "original": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';\nimport * as oldFs from 'node:fs';\nimport * as boundaryFs from './nativeHuntMigrationFS';\nimport {nativeHuntMigrationArchive as archive} from './nativeHuntMigrationArchive';\nimport {beforeNativeHuntMigration as before,readNativeHuntMigration as rawRead} from './nativeHuntMigrationFixture';\nconst hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex'),normal=(text:string)=>text.replace(/\\r\\n?/g,'\\n'),read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');\nlet mutations=0,hunkMutations=0,duplicates=0,wrongFiles=0,eol=0,rawReads=0,assertions=0,exports=0;\nfor(const row of archive.rows){const source=read(row.file),parent=before(row.file,source);assert.equal(hash(source),row.rawAfterHash);assert.equal(hash(parent),row.rawBeforeHash);assert.equal(before(row.file,parent),parent);\n for(const variant of[normal(source),normal(source).replace(/\\n/g,'\\r\\n'),normal(parent),normal(parent).replace(/\\n/g,'\\r\\n')]){assert.equal(before(row.file,variant),parent);eol++;}\n for(const version of[source,parent])for(const at of[0,Math.floor(version.length/2),version.length]){assert.throws(()=>before(row.file,version.slice(0,at)+' unauthorized '+version.slice(at)),/Unknown exact/);mutations++;}\n for(const hunk of row.hunks)for(const at of[0,Math.floor(hunk.after.length/2),hunk.after.length]){const modified=hunk.after.slice(0,at)+' unauthorized '+hunk.after.slice(at);assert.throws(()=>before(row.file,normal(source).replace(hunk.after,modified)),/Unknown exact/);hunkMutations++;}\n assert.throws(()=>before(row.file,source+source),/Unknown exact/);duplicates++;assert.equal(before('outside/'+row.file,source),source);\n const other=archive.rows.find(r=>r.file!==row.file&&r.afterHash!==row.afterHash&&r.beforeHash!==row.afterHash);assert(other);assert.throws(()=>before(other.file,source),/Unknown exact/);wrongFiles++;\n const url=new URL('../'+row.file,import.meta.url),file=fileURLToPath(url);for(const form of[url,file,Buffer.from(file)]){assert.equal(rawRead(form,'utf8'),parent);assert.equal(rawRead(form,'utf-8'),parent);assert.equal(rawRead(form,{encoding:'utf8'}),parent);assert.deepEqual(rawRead(form),Buffer.from(parent));rawReads+=4;}\n const fd=fs.openSync(file,'r');try{assert.equal(rawRead(fd,'utf8'),source);rawReads++;}finally{fs.closeSync(fd);}\n}\nfor(const row of archive.readers){const source=read(row.file);assert.equal(hash(source),row.after);let prior=source;for(const edit of[...row.edits].reverse()){assert.equal(prior.split(edit.after).length,2);prior=prior.replace(edit.after,edit.before);}assert.equal(prior,row.original,'Complete original source reader');assert.equal(hash(prior),row.before);\n const tree=ts.createSourceFile(row.file,source,99,true),nonImports=tree.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(tree)),calls:string[]=[];assert.equal(hash(JSON.stringify(nonImports)),row.nonImportHash);const visit=(node:ts.Node):void=>{if(ts.isCallExpression(node)&&/^(assert(?:\\.|$)|must$|check$)/.test(node.expression.getText(tree)))calls.push(node.getText(tree));ts.forEachChild(node,visit);};visit(tree);assert.equal(hash(JSON.stringify(calls)),row.assertionHash);assert.equal(calls.length,row.assertions);assertions+=calls.length;\n}\nassert(read('balance/probe_nativerepeateventsource.ts').includes(\"import * as oldFs from 'node:fs';\"),'Historical source proof keeps its native identity oracle');\nfor(const row of archive.archives)assert.equal(hash(read(row.file)),row.sha256,'Unchanged prior archive '+row.file);\nfor(const row of archive.runtime)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Actual final runtime '+row.file);\nfor(const row of archive.accepted)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Exact accepted incoming target '+row.file);\nfor(const row of archive.unchanged)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Unchanged accepted164 file '+row.file);\nconst roster=read('balance/proberoster.ts');for(const probe of archive.probes)assert.equal(roster.split(\"probe: '\"+probe+\"'\").length,2,'Single genuine probe enrollment');\nfor(const key of Object.keys(oldFs)){if(key==='default'||key==='readFileSync'||key==='openSync'||key==='closeSync')continue;assert.equal(Reflect.get(boundaryFs,key),Reflect.get(oldFs,key),'Unrelated native filesystem export '+key);exports++;}\n// The inherited source proof opens through this view; its fd and path reads\n// must observe the same exact parent, without changing its original assertion.\nfor(const row of archive.rows){const url=new URL('../'+row.file,import.meta.url),file=fileURLToPath(url),parent=before(row.file,read(row.file));\n for(const form of [url,file,Buffer.from(file)])for(const encoding of ['utf8','utf-8',{encoding:'utf8'},null] as const){\n  const fd=boundaryFs.openSync(form,'r');try{const got=rawRead(fd,encoding);assert.deepEqual(got,encoding?parent:Buffer.from(parent));assert.throws(()=>rawRead(fd,'utf8'),/Unknown exact/,'consumed source fd refuses a repeated partial source');}finally{boundaryFs.closeSync(fd);}\n }\n const partial=boundaryFs.openSync(file,'r');try{const one=Buffer.alloc(1);assert.equal(fs.readSync(partial,one,0,1,null),1);assert.throws(()=>rawRead(partial,'utf8'),/Unknown exact/,'partially consumed source is refused');assert.equal(fs.readSync(partial,one,0,1,null),0,'failed validation does not reset native fd position');}finally{boundaryFs.closeSync(partial);}\n}\nconst binary=new URL('./reports/native-hunt-migration.bin',import.meta.url),bytes=Buffer.from([0,255,128,254,13,10]);fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(binary,bytes);assert.deepEqual(rawRead(binary),bytes);assert.equal(rawRead(binary,'latin1'),bytes.toString('latin1'));assert.equal(before('outside','unchanged'),'unchanged');\nconst nativeBinary=boundaryFs.openSync(binary,'r');try{assert.deepEqual(rawRead(nativeBinary),bytes);}finally{boundaryFs.closeSync(nativeBinary);}\nconst trackedPath=new URL('../'+archive.rows[0].file,import.meta.url),closed=boundaryFs.openSync(trackedPath,'r');boundaryFs.closeSync(closed);\nassert.throws(()=>rawRead(closed),/EBADF/,'closed descriptor retains native failure');\nconst reused=fs.openSync(binary,'r');try{assert.deepEqual(rawRead(reused),bytes,'untracked descriptor after close is native');}finally{fs.closeSync(reused);}\nconst externallyClosed=boundaryFs.openSync(trackedPath,'r');fs.closeSync(externallyClosed);\nassert.throws(()=>boundaryFs.closeSync(externallyClosed),/EBADF/,'failed close retains native error');\nconst reusedAfterFailure=fs.openSync(binary,'r');try{assert.deepEqual(rawRead(reusedAfterFailure),bytes,'failed close clears only source-view tracking');}finally{fs.closeSync(reusedAfterFailure);}\n// Even when a caller bypasses the view's close, another file never inherits\n// its source projection when the OS recycles the numeric descriptor.\nlet externalReuse=0;for(const open of [boundaryFs.openSync,fs.openSync]){\n const tracked=boundaryFs.openSync(trackedPath,'r');fs.closeSync(tracked);\n const actual=open(binary,'r');try{if(actual===tracked)externalReuse++;assert.deepEqual(rawRead(actual),bytes,'external close and non-source reopen cannot inherit a source view');}finally{boundaryFs.closeSync(actual);}\n}\nassert.equal(externalReuse,2,'both genuine descriptor-reuse paths exercised');\nconst result={rows:archive.rows.length,mutations,hunkMutations,duplicates,wrongFiles,eol,rawReads,readers:archive.readers.length,originalAssertions:assertions,oldArchives:archive.archives.length,actualRuntime:archive.runtime.length,exactIncomingTargets:archive.accepted.length,unchanged164Files:archive.unchanged.length,enrolled:archive.probes.length,unrelatedFsExports:exports,unrelatedBinaryPreserved:true};fs.writeFileSync(new URL('./reports/native-hunt-migration-source.json',import.meta.url),JSON.stringify(result,null,2)+'\\n');console.log('PASS native Hunt migration source',JSON.stringify(result));\r\n",
      "nonImportHash": "9c18d1ab492a43d794ff1342eebc0d84ece132b2b77c22a84657b3c4c32648ec",
      "assertionHash": "53a60e8ea60ebebe14fe8fc01d12cb2120603cf59567b5a7e540211b395c4aa6",
      "assertions": 44
    }
  ],
  "archives": [
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "sha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "sha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "sha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "sha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAreaMenuArchive.ts",
      "sha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870"
    },
    {
      "file": "balance/nativeAreaPublicationArchive.ts",
      "sha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48"
    },
    {
      "file": "balance/nativeAreaUIActionArchive.ts",
      "sha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8"
    },
    {
      "file": "balance/nativeAreaViewQueryArchive.ts",
      "sha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31"
    },
    {
      "file": "balance/nativeArrivalCompositionArchive.ts",
      "sha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40"
    },
    {
      "file": "balance/nativeBirthLifetimeArchive.ts",
      "sha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceArchive.ts",
      "sha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c"
    },
    {
      "file": "balance/nativeBountyArrivalArchive.ts",
      "sha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionArchive.ts",
      "sha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionArchive.ts",
      "sha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6"
    },
    {
      "file": "balance/nativeCampaignCompositionArchive.ts",
      "sha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    },
    {
      "file": "balance/nativeCaravanCompositionArchive.ts",
      "sha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4"
    },
    {
      "file": "balance/nativeCaravanExtractedReadArchive.ts",
      "sha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0"
    },
    {
      "file": "balance/nativeCaravanNewsArchive.ts",
      "sha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalArchive.ts",
      "sha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32"
    },
    {
      "file": "balance/nativeCarriedControlArchive.ts",
      "sha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66"
    },
    {
      "file": "balance/nativeClientConclusionCompositionArchive.ts",
      "sha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41"
    },
    {
      "file": "balance/nativeClientContinueArchive.ts",
      "sha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0"
    },
    {
      "file": "balance/nativeClientContinuityCompositionArchive.ts",
      "sha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945"
    },
    {
      "file": "balance/nativeClientMenuCompositionArchive.ts",
      "sha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496"
    },
    {
      "file": "balance/nativeClientPublicationCompositionArchive.ts",
      "sha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f"
    },
    {
      "file": "balance/nativeClientRuntimeArchive.ts",
      "sha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionArchive.ts",
      "sha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1"
    },
    {
      "file": "balance/nativeClientStartArchive.ts",
      "sha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionArchive.ts",
      "sha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1"
    },
    {
      "file": "balance/nativeCombatLeafVisualArchive.ts",
      "sha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505"
    },
    {
      "file": "balance/nativeCombatPresentationArchive.ts",
      "sha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c"
    },
    {
      "file": "balance/nativeCompleteBirthArchive.ts",
      "sha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206"
    },
    {
      "file": "balance/nativeContinuityCompositionArchive.ts",
      "sha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeArchive.ts",
      "sha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceArchive.ts",
      "sha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d"
    },
    {
      "file": "balance/nativeDimensionCatalogArchive.ts",
      "sha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107"
    },
    {
      "file": "balance/nativeDirectorBirthSourceArchive.ts",
      "sha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceArchive.ts",
      "sha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceArchive.ts",
      "sha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6"
    },
    {
      "file": "balance/nativeExactAnchorArchive.ts",
      "sha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d"
    },
    {
      "file": "balance/nativeFrameContactSourceArchive.ts",
      "sha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsArchive.ts",
      "sha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db"
    },
    {
      "file": "balance/nativeGraphArchive.ts",
      "sha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e"
    },
    {
      "file": "balance/nativeGroundCurrentSourceArchive.ts",
      "sha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5"
    },
    {
      "file": "balance/nativeGroundFollowUpsOwnerArchive.ts",
      "sha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b"
    },
    {
      "file": "balance/nativeHarborArrivalArchive.ts",
      "sha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842"
    },
    {
      "file": "balance/nativeHarborServicesArchive.ts",
      "sha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8"
    },
    {
      "file": "balance/nativeHistoricalCleaveArchive.ts",
      "sha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd"
    },
    {
      "file": "balance/nativeHistoricalConcealmentArchive.ts",
      "sha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c"
    },
    {
      "file": "balance/nativeHistoryArrivalArchive.ts",
      "sha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450"
    },
    {
      "file": "balance/nativeHostClosureArchive.ts",
      "sha256": "9c79682e31cc6f743c25799e376668742526a9714fa0d1484962001ab6f4114e"
    },
    {
      "file": "balance/nativeHostPerformanceArchive.ts",
      "sha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "sha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
    },
    {
      "file": "balance/nativeHuntMigrationArchive.ts",
      "sha256": "be9e859a9ef5713ee23cb06d7dc715debdd48eccec9e3484811ef9ff8413d1d5"
    },
    {
      "file": "balance/nativeInstalledSourcesArchive.ts",
      "sha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16"
    },
    {
      "file": "balance/nativeJourneyCompositionArchive.ts",
      "sha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07"
    },
    {
      "file": "balance/nativeLiveSiteArchive.ts",
      "sha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8"
    },
    {
      "file": "balance/nativeLocalInputArchive.ts",
      "sha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a"
    },
    {
      "file": "balance/nativeLocalInputFinalArchive.ts",
      "sha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f"
    },
    {
      "file": "balance/nativeMainCastSourceArchive.ts",
      "sha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe"
    },
    {
      "file": "balance/nativeMainContentArchive.ts",
      "sha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604"
    },
    {
      "file": "balance/nativeMainHostCompositionArchive.ts",
      "sha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84"
    },
    {
      "file": "balance/nativeMainProofSourceArchive.ts",
      "sha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441"
    },
    {
      "file": "balance/nativeMainVisualSourceArchive.ts",
      "sha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d"
    },
    {
      "file": "balance/nativeNearScaleSelectionArchive.ts",
      "sha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5"
    },
    {
      "file": "balance/nativeNemesisDepartureArchive.ts",
      "sha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionArchive.ts",
      "sha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "sha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    },
    {
      "file": "balance/nativeOdysseyHistoricalRescueArchive.ts",
      "sha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4"
    },
    {
      "file": "balance/nativeOdysseyPressureArchive.ts",
      "sha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1"
    },
    {
      "file": "balance/nativePartyArchive.ts",
      "sha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582"
    },
    {
      "file": "balance/nativePartyDeathArchive.ts",
      "sha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d"
    },
    {
      "file": "balance/nativeRealmContextArchive.ts",
      "sha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6"
    },
    {
      "file": "balance/nativeRepeatEventArchive.ts",
      "sha256": "1c87579238125a790b59f430894d4786e9675927e3b099637713536ebef159e8"
    },
    {
      "file": "balance/nativeRescueAnchorArchive.ts",
      "sha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05"
    },
    {
      "file": "balance/nativeRunConclusionArchive.ts",
      "sha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeArchive.ts",
      "sha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0"
    },
    {
      "file": "balance/nativeSaveWriteOrderArchive.ts",
      "sha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14"
    },
    {
      "file": "balance/nativeSceneAIArchive.ts",
      "sha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a"
    },
    {
      "file": "balance/nativeSceneCampaignFrameArchive.ts",
      "sha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad"
    },
    {
      "file": "balance/nativeSceneCampaignFrameAttendanceArchive.ts",
      "sha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureArchive.ts",
      "sha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb"
    },
    {
      "file": "balance/nativeSceneCampaignTransitionsArchive.ts",
      "sha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da"
    },
    {
      "file": "balance/nativeSceneCastingPreparationArchive.ts",
      "sha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationArchive.ts",
      "sha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a"
    },
    {
      "file": "balance/nativeSceneCombatCampaignArenaArchive.ts",
      "sha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160"
    },
    {
      "file": "balance/nativeSceneCombatHooksArchive.ts",
      "sha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e"
    },
    {
      "file": "balance/nativeSceneCombatKernelArchive.ts",
      "sha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af"
    },
    {
      "file": "balance/nativeSceneCombatMotionArchive.ts",
      "sha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a"
    },
    {
      "file": "balance/nativeSceneCombatMotionHooksArchive.ts",
      "sha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50"
    },
    {
      "file": "balance/nativeSceneCombatRecordSelectionArchive.ts",
      "sha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86"
    },
    {
      "file": "balance/nativeSceneCombatStateArchive.ts",
      "sha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationArchive.ts",
      "sha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22"
    },
    {
      "file": "balance/nativeSceneDefensePreparationArchive.ts",
      "sha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationArchive.ts",
      "sha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02"
    },
    {
      "file": "balance/nativeSceneDisplacementArchive.ts",
      "sha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationArchive.ts",
      "sha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2"
    },
    {
      "file": "balance/nativeSceneFrameArchive.ts",
      "sha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba"
    },
    {
      "file": "balance/nativeSceneFrameAttendanceArchive.ts",
      "sha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71"
    },
    {
      "file": "balance/nativeSceneFrameCallbacksArchive.ts",
      "sha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0"
    },
    {
      "file": "balance/nativeSceneFrameClosureArchive.ts",
      "sha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58"
    },
    {
      "file": "balance/nativeSceneFrameHooksArchive.ts",
      "sha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5"
    },
    {
      "file": "balance/nativeSceneFrameInterfacesArchive.ts",
      "sha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsArchive.ts",
      "sha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationArchive.ts",
      "sha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8"
    },
    {
      "file": "balance/nativeSceneInputArchive.ts",
      "sha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1"
    },
    {
      "file": "balance/nativeSceneKillAftermathArchive.ts",
      "sha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationArchive.ts",
      "sha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7"
    },
    {
      "file": "balance/nativeSceneLootArchive.ts",
      "sha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20"
    },
    {
      "file": "balance/nativeSceneMemoryArchive.ts",
      "sha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionArchive.ts",
      "sha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingArchive.ts",
      "sha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d"
    },
    {
      "file": "balance/nativeSceneProgressionArchive.ts",
      "sha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f"
    },
    {
      "file": "balance/nativeSceneProjectileArchive.ts",
      "sha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33"
    },
    {
      "file": "balance/nativeScenePuzzleArchive.ts",
      "sha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443"
    },
    {
      "file": "balance/nativeSceneQuestArchive.ts",
      "sha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c"
    },
    {
      "file": "balance/nativeSceneQuestAuxArchive.ts",
      "sha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a"
    },
    {
      "file": "balance/nativeSceneQuestInteractionArchive.ts",
      "sha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062"
    },
    {
      "file": "balance/nativeSceneRestorationArchive.ts",
      "sha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationArchive.ts",
      "sha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b"
    },
    {
      "file": "balance/nativeSceneSummonPreparationArchive.ts",
      "sha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationArchive.ts",
      "sha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca"
    },
    {
      "file": "balance/nativeSceneTetherArchive.ts",
      "sha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101"
    },
    {
      "file": "balance/nativeShardEntryLifetimeArchive.ts",
      "sha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa"
    },
    {
      "file": "balance/nativeShardFoundationArchive.ts",
      "sha256": "831898e76223802e8461fc15c2ab7b1bb057a55a825ac75bd2b243bec80ce17f"
    },
    {
      "file": "balance/nativeShardKeeperArchive.ts",
      "sha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518"
    },
    {
      "file": "balance/nativeShardKeeperCompositionArchive.ts",
      "sha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8"
    },
    {
      "file": "balance/nativeShardMusterArchive.ts",
      "sha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837"
    },
    {
      "file": "balance/nativeShardPublicationArchive.ts",
      "sha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4"
    },
    {
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "sha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "sha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardsCompositionArchive.ts",
      "sha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b"
    },
    {
      "file": "balance/nativeShardsLegacySourceArchive.ts",
      "sha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd"
    },
    {
      "file": "balance/nativeSidezoneFurnishArchive.ts",
      "sha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75"
    },
    {
      "file": "balance/nativeSkyArchive.ts",
      "sha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b"
    },
    {
      "file": "balance/nativeSummonAsyncBoundaryArchive.ts",
      "sha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderArchive.ts",
      "sha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceArchive.ts",
      "sha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0"
    },
    {
      "file": "balance/nativeTitanAttendanceArchive.ts",
      "sha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8"
    },
    {
      "file": "balance/nativeTitanReceiptArchive.ts",
      "sha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc"
    },
    {
      "file": "balance/nativeTownClientCompositionArchive.ts",
      "sha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b"
    },
    {
      "file": "balance/nativeTownConclusionCompositionArchive.ts",
      "sha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff"
    },
    {
      "file": "balance/nativeTownFreshFoldArchive.ts",
      "sha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionArchive.ts",
      "sha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8"
    },
    {
      "file": "balance/nativeTownStationArchive.ts",
      "sha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4"
    },
    {
      "file": "balance/nativeVoyageTransitionArchive.ts",
      "sha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac"
    },
    {
      "file": "balance/nativeWarlordArrivalArchive.ts",
      "sha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8"
    }
  ],
  "runtime": [
    {
      "file": "launcher/branches.cjs",
      "sha256": "718dae6828bd1d4b83f005ebdba09d72ee44a144cc9a573079ff52c043abafac"
    },
    {
      "file": "launcher/main.cjs",
      "sha256": "0eb48011fa3ce406f3a846ba91d5b4e540b6aea164a62f78da6601e2fe02562b"
    },
    {
      "file": "launcher/perf-preload.cjs",
      "sha256": "d1c4a4b60fef5fe2765d275fce1012fc416c2eb3fbc139669ceaf7bcdcd74c3a"
    },
    {
      "file": "launcher/perfdeadman.cjs",
      "sha256": "9570dbe71924058b10ad06e264675d22347d961ba9a390a2ec6f9d233161ec89"
    },
    {
      "file": "launcher/preload.cjs",
      "sha256": "d4e1bd342350ffabb225d024fdf646e83c400d4bd546999852c44c487c6fabdc"
    },
    {
      "file": "launcher/saveWriteOrder.cjs",
      "sha256": "9b2b1b28cb3d69b3c8fd4f8ab4610e9d3b6e3f3a1fe6ba5b9fac696bf3fae2bf"
    },
    {
      "file": "launcher/server.cjs",
      "sha256": "272a2fd428424eb652fc7a50e4b3ff95416ae150fccf18264a4ecd0f0e3e51d7"
    },
    {
      "file": "launcher/updates.cjs",
      "sha256": "aa54b5866793757b30427d3e58545969c7bbcd52c2cdb0af90371663c31b2694"
    },
    {
      "file": "server/corpses.ts",
      "sha256": "916f3d66adc0a9b3090bc368b12fba2267f4c521aaa88b53f8f9f9c20cd58ace"
    },
    {
      "file": "server/massCompiler.ts",
      "sha256": "01b3ceeb8890ee7ef71ad230573d12b96c0c26177edbb3435f1384dc0d96472e"
    },
    {
      "file": "server/massWorkerBootstrap.mjs",
      "sha256": "8daf95b5fa06c72c3ffb407a9aa3097514f027bd0872e432df8183c75994a42c"
    },
    {
      "file": "server/massWorkers.ts",
      "sha256": "44c71ab1f050c90303eca473b57e08ce549a65e2d1abc3474594ef74030942fb"
    },
    {
      "file": "server/muster.ts",
      "sha256": "95c4a357235b2af0364841c3df80a317cb0dfba9d06f3f81676fa034a5edfa27"
    },
    {
      "file": "server/musterAreas.ts",
      "sha256": "9771b9675a29ca1a01d3cdeef66a637f64ed11d7057697a77d243a9261e6b40f"
    },
    {
      "file": "server/nativeShardFrames.ts",
      "sha256": "1da068fd5ac46a45046ee3c10e563ec1e6cb7fd96ee5d38764b9249a856e46ca"
    },
    {
      "file": "server/nativeShardHost.ts",
      "sha256": "a9e3743f217950c44f38c4d1c9085b59242f9c0f725b13d9a630e97f9779a596"
    },
    {
      "file": "server/nativeShardMuster.ts",
      "sha256": "63b8a27919888e02a43a124a1a9eca8dd9d84704221276d5c75bfcef9ed4db38"
    },
    {
      "file": "server/nativeShardRuntime.ts",
      "sha256": "4a4bbf7bbca1b3a8fe4722c177acdd75daed9b0d3a4fd058ecb476224f3144ce"
    },
    {
      "file": "server/nativeShardSave.ts",
      "sha256": "2fbdf0df04ecad4e81b7a4261603ab22839a28c182d0781bee4c5f2b4ea2cef5"
    },
    {
      "file": "server/nativeShardSeats.ts",
      "sha256": "df3ecb5cc5957388135319204212577e88172830637c0ee512b0ad79e57c2f4f"
    },
    {
      "file": "server/nativeVesselAreas.ts",
      "sha256": "3e117d20a3a1fc2ef01f6a8443b8bf49fce26b7af69b1aa742fc26f7b4fa9b5b"
    },
    {
      "file": "server/party.ts",
      "sha256": "e76cc3a1bbbe4995c2d203283b84bf91c8984c4d9b0d43023031d28640f71757"
    },
    {
      "file": "server/shard.ts",
      "sha256": "583e2b94445bb8356207ef813a34fb9278286f9b044e80d335c539cc81043e86"
    },
    {
      "file": "server/shardHost.ts",
      "sha256": "c68ff10fb98613b10375303a5ced657f0fc276999860a0033a88ca3cafc8e0f2"
    },
    {
      "file": "server/shardTransport.ts",
      "sha256": "5bde6ae3f270072b148e7514abdbb39c930f110ddb45b57e1af3b755e9c842ce"
    },
    {
      "file": "server/simUnits.ts",
      "sha256": "d7ee9a7fbd4b9b1d59c166b29500312eddf1102c5ba99be52e25db59dd535b27"
    },
    {
      "file": "server/vessel.ts",
      "sha256": "85ef2228a6cb8a81898c7ef9b8820557e725dd9ba381779513829fc24f3e09bf"
    },
    {
      "file": "server/wildsSave.ts",
      "sha256": "a68db81ea39c2e6b1e5a4ea292fb4702a7972fe1ddeb1fb8b219eb58c7664f18"
    },
    {
      "file": "server/wireDiet.ts",
      "sha256": "007c3e22832d896e775942be2a963d110ced68e2a5d34425c33054ba520666b5"
    },
    {
      "file": "src/agent/agent.ts",
      "sha256": "584b0cf888db6ad7310c2b1a8585ae538ce17a6a7c1799f812a81cfe2d49ec08"
    },
    {
      "file": "src/agent/kit.ts",
      "sha256": "feabac10f73fdc2b8c27218e04d9c2164d8340bd6e9758b2d81dba252b1b486e"
    },
    {
      "file": "src/agent/perception.ts",
      "sha256": "f40f1ae37d1862c44a60502b45929ba9a6aa668b9d077424cb2079886f616027"
    },
    {
      "file": "src/buildProfile.ts",
      "sha256": "b26670ae991e4435413474cd22e3153458b171ec6ec684889894d1aad45fb608"
    },
    {
      "file": "src/config.ts",
      "sha256": "4d00a37f54d5e4938943b9434a165c3ab8fa383bb97c55b6e6c3360de82a6932"
    },
    {
      "file": "src/core/cursor.ts",
      "sha256": "bf23abeb79a10077c57051caa7d4ad365719de09cf540cf62ff336d053de1ec1"
    },
    {
      "file": "src/core/cursorGlimmer.ts",
      "sha256": "a2cfa8357052a71ee136a8ce23f6c1e9b239f08efac15fbda27c13b62eb26ed2"
    },
    {
      "file": "src/core/cursorMotion.ts",
      "sha256": "6465aebb76342b321dd58fc3e6acae13323f6b15fc6ef9d4eb858148d57af3a8"
    },
    {
      "file": "src/core/cursorWisp.ts",
      "sha256": "dab12c6bd3eb04b51cb2a2c75ee8cb86a987150c0dc51c193bac9ec263dc8ba1"
    },
    {
      "file": "src/core/gamepad.ts",
      "sha256": "a8f83cf2e47540dd2fe0d884b309e1019d993d75512e5d14fcb98d2b49455b57"
    },
    {
      "file": "src/core/input.ts",
      "sha256": "ae01b99da03b64bcd0b70e053e7e5429b8a139bfaf6d8878fe39ccf98b392e36"
    },
    {
      "file": "src/core/math.ts",
      "sha256": "61879e2db45a922543fe26fe1e5cfb34cf7d472612e13f62085ed9f6e644c57b"
    },
    {
      "file": "src/core/rng.ts",
      "sha256": "56c80fddef28721e7196928fd1f097b1b8d0cf5b080f21ef309ea2eff692c0fd"
    },
    {
      "file": "src/core/scriptedInput.ts",
      "sha256": "fcf46c7e26143a9e30263752b6c672d6fc25f34de768ad9c7b5a61ca577af155"
    },
    {
      "file": "src/data/abyssGlyphs.ts",
      "sha256": "b306f4248eafc5b8143a2a345486f7ea189b212a17d841c731a574d066df68be"
    },
    {
      "file": "src/data/abyssLooks.ts",
      "sha256": "01545fd7a007ee44b607831238e41683536660a5c87b0ce6a64ad9de6f3f57d9"
    },
    {
      "file": "src/data/abyssMonsters.ts",
      "sha256": "ed25a82cbe3f61d4ea0defa69f3e4d3e6cb01590cc90cf15fa646f63039ea2d2"
    },
    {
      "file": "src/data/adventureGrammar.ts",
      "sha256": "2ed3f4d20ed9075ac500e53cf0317bdd9dc2d74f26f726afe264e21b3afbf7c3"
    },
    {
      "file": "src/data/adventureLocales.ts",
      "sha256": "14d43ee0e3093c2fcb1d7eb0fe1aa6347a4a7474defaa2c85319445b2ee9080a"
    },
    {
      "file": "src/data/afflictionCues.ts",
      "sha256": "5778b814ab4dd33a7ae462a5215d7ade532f42f839989d1c0f94786f1c2e8b13"
    },
    {
      "file": "src/data/agent.ts",
      "sha256": "55fc395d3926b423661675700a4c520b38216b0744249d1c2016525a0233ac29"
    },
    {
      "file": "src/data/anatomyCues.ts",
      "sha256": "87ba88d87a6eca8d797383afb6789c64f625221cfb67f988bf895349ffff0c5f"
    },
    {
      "file": "src/data/annexes.ts",
      "sha256": "228a5cdf6ee7d3bf02fc034b4885509f063b25aca5d3e8506987b2204f8330dc"
    },
    {
      "file": "src/data/arachnidCosmetics.ts",
      "sha256": "7928ef7d05e138dce6e2e14bf63b60b136b8eeb29c9f6376f84e8d5f0213c831"
    },
    {
      "file": "src/data/arachnidGlyphs.ts",
      "sha256": "6e9b10b1826545c031af7904c0d87bde56b3ee1c0c33cf0a3b144136f38d5061"
    },
    {
      "file": "src/data/arachnidLooks.ts",
      "sha256": "c033670d8c2cc8918742d3eb3eddbce785a3d6f510dff303841d7e9a8b689c03"
    },
    {
      "file": "src/data/arenaBossHabitats.ts",
      "sha256": "c74042a1ab6b435a858eab47bfb42b17f5df5e7c8fcae3eba672fe0ba35ea4a7"
    },
    {
      "file": "src/data/arenaBossTilesets.ts",
      "sha256": "6897ff6d7a1f552c3ca7fc8887775cfc88a79847d89d9029d0970858596ee928"
    },
    {
      "file": "src/data/arenaBosses.ts",
      "sha256": "837c61f6b3a0e4c6cf40d89c393b5b4d54d7c3192bef6ef1eca88d02945e819a"
    },
    {
      "file": "src/data/arenas.ts",
      "sha256": "94aff60ce668c3049e12a6b8e4159baa5b44f38516851d534633f906e0341699"
    },
    {
      "file": "src/data/armedCues.ts",
      "sha256": "2caf263de33ddd37827991183aaba12bff778e1a66771a18f9d4770cadf7425a"
    },
    {
      "file": "src/data/assaultTree.ts",
      "sha256": "508cbb076f35fd7f22885da614be38e9b83be79a51c2f655706c3ff64dff901e"
    },
    {
      "file": "src/data/atlasFeatures.ts",
      "sha256": "3923804494a3f2902e7690a14dbbf854745c7c3eb289b3c04866730e381b269f"
    },
    {
      "file": "src/data/attunements.ts",
      "sha256": "db24b5fc08faf1d0ad7571254c00b929b11e5fd8f488d342fb39f20f8f6c9f7a"
    },
    {
      "file": "src/data/auroras.ts",
      "sha256": "fc7cf91614a6d0405d680d454b43d8fc3aba303039d467933c261cd17aa0a956"
    },
    {
      "file": "src/data/authoredMaps.ts",
      "sha256": "48246e75e75c874851cde37859e98ebeb8203b1f4c3b0bf9bddde393486cec3f"
    },
    {
      "file": "src/data/avianCosmetics.ts",
      "sha256": "de623db9ad96fc8dd9f9a91b4e07b753cbbd9cbc281d9798a06091bdcc80346c"
    },
    {
      "file": "src/data/avianGlyphs.ts",
      "sha256": "9840aa6495b8634db0ce6971a8ea641b4ab495fb6725ccdcdbc24574dec392cb"
    },
    {
      "file": "src/data/avianLooks.ts",
      "sha256": "450d6f973d231ae45d03ea44dda3bb149bb32b774018f5c8a01e1277a7233cf4"
    },
    {
      "file": "src/data/bastionStarterTrees.ts",
      "sha256": "cb82cb868f7f93fa9879c0716210d0d44b593ea1c35d3ea96b19a4ac10b22134"
    },
    {
      "file": "src/data/beacons.ts",
      "sha256": "606ad442e1707e8bb202d946c71d074fa8308992d5da6d14d82634b8e15859b4"
    },
    {
      "file": "src/data/beastFamilies.ts",
      "sha256": "5b201b71a3a32284b5179a1199f2fd6578d488c25de001716df2fe1635af8b0b"
    },
    {
      "file": "src/data/bestiary.ts",
      "sha256": "fb206d4b7eb399da46b10e51c6e37f76ceab9887fa59258716d9d953f2c00054"
    },
    {
      "file": "src/data/bodyAction.ts",
      "sha256": "2ad8d129b8236eca3a8f383983a738dfa0a1c489b4dcc43bc9e0216a786e6fc7"
    },
    {
      "file": "src/data/bodyWalk.ts",
      "sha256": "1934d62d23d37e6f7a6189148dabb795e1ce0fcea7c728224a00a9ceace5486e"
    },
    {
      "file": "src/data/bondStarterTrees.ts",
      "sha256": "328f429cab41267e37a3aec6bc9a88c4bc11006dbef47fee8f863719ef7265a4"
    },
    {
      "file": "src/data/boroughs.ts",
      "sha256": "eb61e83ec38a85ba2664338faac8075c7dadb4f3e0c78f93f714af5afb7f86df"
    },
    {
      "file": "src/data/boundaryGates.ts",
      "sha256": "1fbb8c440b6b0b03e481f62a5cbe91e793a818c1aaa8f2ae5e80428a8c811967"
    },
    {
      "file": "src/data/bounties.ts",
      "sha256": "a237e19e27c1995fec22f2f94aec533849ae4b56b724060c1c091808b7efcfb4"
    },
    {
      "file": "src/data/bountyExpeditions.ts",
      "sha256": "1241a2114628c221f414e5a8f604a533678f553e5ada6e57d573ab837acd45b7"
    },
    {
      "file": "src/data/bountyJourneys.ts",
      "sha256": "428668fb433d9e5750a4fecb0bf409201e66566e5250e639c07b38e2d0207fd9"
    },
    {
      "file": "src/data/bountyRewards.ts",
      "sha256": "350ac4a82ac57e26908897b757767288ada44ed87f563b3dad40ae32def70261"
    },
    {
      "file": "src/data/bountyboard.ts",
      "sha256": "9f2240b56e75c9bd22f9d9318e1889504a8f6504069b9499910345e202c7d2fa"
    },
    {
      "file": "src/data/brandt.ts",
      "sha256": "7a80d8b94fddf7385570128a6cec05af52affff601e4fc183730757fee2f5585"
    },
    {
      "file": "src/data/canineCosmetics.ts",
      "sha256": "59a4ba16246b85db0a36662d37d36035e71046461cf8301d74d3e96f8e931839"
    },
    {
      "file": "src/data/canineGlyphs.ts",
      "sha256": "7601d04cb2585d4f04ff6e400389a469314748a130a8428883166f8f5be6dae1"
    },
    {
      "file": "src/data/canineLooks.ts",
      "sha256": "6d083a4c7fa06c90311485ad42aa091ee7589abb7b2f219e08b52e4766eea76e"
    },
    {
      "file": "src/data/caravan.ts",
      "sha256": "7d8a8292b941688a08f22deb117c139ae24d736122c024ec48284d9b200d3e51"
    },
    {
      "file": "src/data/casterGlyphs.ts",
      "sha256": "f1f9b10e0eeacb0256e3d230e9f09cd964dde127fa2d67bc371a2847368da154"
    },
    {
      "file": "src/data/casterLooks.ts",
      "sha256": "a3a706296da24dc342f80190c58fb1a95879e797ebca1666dccefb70335dfd10"
    },
    {
      "file": "src/data/casterMonsters.ts",
      "sha256": "9b2432a077d166a880a53157cfa0b5f9741db4ff740bfb2e6afd7f52aa335101"
    },
    {
      "file": "src/data/castingCues.ts",
      "sha256": "a93fc775260440fdc1c9de5fd019f659bba0dc53d9bc581fa9fef2cdfd640093"
    },
    {
      "file": "src/data/catacombs.ts",
      "sha256": "c23d13270e2074de4c0a26d0d62966342ddd89c564ba55b58e71885ed36a3d22"
    },
    {
      "file": "src/data/cistern.ts",
      "sha256": "c0b610cf074a8c310da295072cd779fa517025e6500eeea1f83892053a449030"
    },
    {
      "file": "src/data/classTiers.ts",
      "sha256": "c7966e855ef0724d63593cc409cc27aff765ec9ae4060b343a4d9bdd89463c26"
    },
    {
      "file": "src/data/classdeeds.ts",
      "sha256": "dbb962e9b45825a52e3f100f1a76b2bced01068b7cef4e0ef72ace4d9cc1ee9d"
    },
    {
      "file": "src/data/classes.ts",
      "sha256": "509cdc843de3694e0a62e65a2f7fec3f1385a17343c427dd668ff31d3e36a981"
    },
    {
      "file": "src/data/cleaveTree.ts",
      "sha256": "ac34a3ee3f83012c93ba2a40bc5f91f8a11aaca64386712950a03fd5250c4afd"
    },
    {
      "file": "src/data/clusters.ts",
      "sha256": "d549a673a9c5012443dec2e314dfba12d26e5de4cabb71994dc507880adfa587"
    },
    {
      "file": "src/data/combatCues.ts",
      "sha256": "fa5de2b8b6b49b09935cf6370d7625e7370073b6db42fc5820d85a745f32f242"
    },
    {
      "file": "src/data/combatReadability.ts",
      "sha256": "2c53be8449eb6a099cb8a8c2f6521a0cbdaa54c4948bdbe47d30dd859311b7a7"
    },
    {
      "file": "src/data/comboConditions.ts",
      "sha256": "a45b67cbfc5f74255ccd22ac8755193c1ccc3f916f2410ac5abeadfebfda38c1"
    },
    {
      "file": "src/data/comboCues.ts",
      "sha256": "9c1935762a258dd99c0c58978563ade2d3a58ee5f37f4b78ded692403adc3632"
    },
    {
      "file": "src/data/combos.ts",
      "sha256": "5a46b99558bd2b7f073380e014fa935e1d8b5b1e696eb2fb0d4c88a324e9393c"
    },
    {
      "file": "src/data/commanders.ts",
      "sha256": "5539988577465593ae3fe5ac7022b67003baba43733cb441ead1cfe6898cd1f9"
    },
    {
      "file": "src/data/companionCues.ts",
      "sha256": "df3cc6cd16b23b12a28a50618f4b7f757086efc4e773ab0dcb6c26bfa9a18ef9"
    },
    {
      "file": "src/data/companionSkills.ts",
      "sha256": "bfa28efe4e605b7171955a95387e99b1221204369806307ca1f465d59ea9d1a5"
    },
    {
      "file": "src/data/companionStances.ts",
      "sha256": "612c95af3a7e8696f5d186757a76cb050ee25cfc04314876fb9bfe5bde975cf2"
    },
    {
      "file": "src/data/complexLocales.ts",
      "sha256": "2244a243a0faa43f2251d133f990f441792b4a481c01e1317020929cb12261fc"
    },
    {
      "file": "src/data/compositions.ts",
      "sha256": "9f1d0c6942654b0a925dbceac0b40401b02f51e1965cefe20dc2d545eba3bb90"
    },
    {
      "file": "src/data/conjury.ts",
      "sha256": "838a8eb29fa364903e9fe9d40f1ac656801c250fe6291c6ca778717602446f9b"
    },
    {
      "file": "src/data/containerloot.ts",
      "sha256": "5311ccc67f4ecfcc84dc7b4622fe58d33ca320e0cb3d71c7194ba448ee4c1df4"
    },
    {
      "file": "src/data/containers.ts",
      "sha256": "d2edff3776ea3bcdf6ba8412f69364e988fd212549f0f4cf7e35a3afc57f21d7"
    },
    {
      "file": "src/data/controlStarterTrees.ts",
      "sha256": "1894619aa0bbac27b5475653fdf4da908ea92bc496fc8b9c3218991f6b76effc"
    },
    {
      "file": "src/data/coop.ts",
      "sha256": "56ba73cc40be92a714a3f9575bd6734a90df8fce6f956dafbe2e25cf0f7e294f"
    },
    {
      "file": "src/data/cosmeticExpansionGlyphs.ts",
      "sha256": "543b15d61ba08e1eba1bdf76b9da5d01af02c857a7b88dca0b54a5c37bbb1c62"
    },
    {
      "file": "src/data/cosmeticExpansionModels.ts",
      "sha256": "94b260db90267aee26e00a3022096192b2ae59d0941ef7d4c74a79e47458db45"
    },
    {
      "file": "src/data/cosmeticGlyphs.ts",
      "sha256": "68dd4a230174eb0da9945b6a5077700653f93ea12a71b3b732d6f8ed9ea09912"
    },
    {
      "file": "src/data/cosmeticModels.ts",
      "sha256": "6328efcc14b9a24c0c1bb17edb82f70ad38d4952076fc8b0a5f3d1d62de13b4f"
    },
    {
      "file": "src/data/cosmeticStyles.ts",
      "sha256": "41a0b2764b61519c9bb05b6912c11f3b0ba156853e2ee5109bab04864111a268"
    },
    {
      "file": "src/data/cosmetics.ts",
      "sha256": "d31281a4284427999b6a1098355dc030077db443b21cf7aef42a42e4ac0800a6"
    },
    {
      "file": "src/data/couch.ts",
      "sha256": "090b4eac5a57f43cb6295d235c0f6c9a5bd39f4438800031c9cbae3c7a203faa"
    },
    {
      "file": "src/data/courtGlyphs.ts",
      "sha256": "d30a1c887f0e25c6cb371a298dc677075dc812f08a5e15575ac6e772c8ebac15"
    },
    {
      "file": "src/data/courtLooks.ts",
      "sha256": "ea7a934c5a03e443cbacc266a9ac30ed140f86d4be2818435788fc40e3fc1412"
    },
    {
      "file": "src/data/courtMonsters.ts",
      "sha256": "2f6928e48fed357f361f22e3a694e6914154538b619e20220fc3c97c6ec9d517"
    },
    {
      "file": "src/data/creepers.ts",
      "sha256": "35bf36244136906ea7098d2b30920051e9884f65fcb33a45b755fd330927d8d8"
    },
    {
      "file": "src/data/creeps.ts",
      "sha256": "f716fdd5eb77dfb25be17e9b35513653e20a48a4f294f62cf280d97f1d6dbf66"
    },
    {
      "file": "src/data/deathPresentation.ts",
      "sha256": "d929aa41f610906a59dfbeaf0317351119e827f31a84303e8e404fa7e9793eea"
    },
    {
      "file": "src/data/defenseCues.ts",
      "sha256": "121489c008b42215d84976bace2ef63e914f723dcaf9ee0c0bdaa0fe0a722cc8"
    },
    {
      "file": "src/data/demonGlyphs.ts",
      "sha256": "c53b7e9c1cdd8595dc3ca0a3921a47f8baa051b0500f091577e90c3fd49c350c"
    },
    {
      "file": "src/data/demonLooks.ts",
      "sha256": "2638267a12c73a9ffef7bbca986b0ed8e550155779cdbcd4637c0d3388e5e011"
    },
    {
      "file": "src/data/devotedStarterTrees.ts",
      "sha256": "b3af8a631dc2b63e23eab55a0704765dc5e4669ecbc0386f77cb7a27fa654b9f"
    },
    {
      "file": "src/data/dialogue.ts",
      "sha256": "ba28d4eedcda2292d6ec1e0fdec9ae06c499df7d5c35f6926c761b1f4d6decb5"
    },
    {
      "file": "src/data/digsites.ts",
      "sha256": "2c0528b9fba02d673bae1a45dfbb0353bb7110d2d6e731990f0e2adce651df27"
    },
    {
      "file": "src/data/disciplineStarterTrees.ts",
      "sha256": "744f3118b83530bfdd7b7c1dbb09d8b522d47d9880fa923f0c9af6a7c2ca6108"
    },
    {
      "file": "src/data/doodadVisuals.ts",
      "sha256": "87fa0fc153dd9714b4c9813d57c093829d004cafd39f5ae43c01520b18a0f593"
    },
    {
      "file": "src/data/duelistStarterTrees.ts",
      "sha256": "552ef47f63998911436a586d5f2eec4bd77504aa292011d2310ab3899571eb8b"
    },
    {
      "file": "src/data/encounterAdventurers.ts",
      "sha256": "e6441111337ec028fc403ff24c6d2f12d1b353e2fa6242cd906174f50dcf5e08"
    },
    {
      "file": "src/data/encounterGroups.ts",
      "sha256": "69782c25c8752dd9d248ee633823b4b9ed3d5dd27df2be3e513a4a063745b70e"
    },
    {
      "file": "src/data/encounterTactics.ts",
      "sha256": "775bb2cc5a5ef6dc8274c2311f08a5392a866de2275c9c3eb18ecd9d8c8e0f9a"
    },
    {
      "file": "src/data/essences.ts",
      "sha256": "5c33087be8a8580132b44b78eb949acc605aef06da63c43397db7c84a94161fb"
    },
    {
      "file": "src/data/exhaustionCues.ts",
      "sha256": "ba84a91a73bf1202587347b96a55f8efa0a729cea55cf1009e1ad8669aef6958"
    },
    {
      "file": "src/data/explorationLocales.ts",
      "sha256": "d709f426f2b8d49e80fe8ccdec2ff785220d5319d36fbefb8944297b6b242e91"
    },
    {
      "file": "src/data/extraction.ts",
      "sha256": "ce72cb94b56570c6d06fc066c1b7084a7325497ea51c8feef71d85f9aad6df98"
    },
    {
      "file": "src/data/featureActivities.ts",
      "sha256": "6b840a3c1fe95357a8c75e6ee0a8ce396b8a06e022c1e02cbb583daa89e026e8"
    },
    {
      "file": "src/data/feedingCues.ts",
      "sha256": "90d4e1ea348d94c2f723583cb4c913ae09cc27a99bb447058f54ff30570b9f56"
    },
    {
      "file": "src/data/flaskSkills.ts",
      "sha256": "ab925e6fed6fa7922383a859477684a8c5bfa1c8f48d342f0b47cf295b3dff23"
    },
    {
      "file": "src/data/flaskTrees.ts",
      "sha256": "558e8f87db67044464a0959c1936aeb8a527d884195662629ade76810e3b50de"
    },
    {
      "file": "src/data/fog.ts",
      "sha256": "ee660c721842ca49b700f97edcb9ffda6431e31dfd7d096b261c95de09864b4c"
    },
    {
      "file": "src/data/formations.ts",
      "sha256": "92ed7260471b88003899be8b7429c25a33937d800478825caebae9ef0d743276"
    },
    {
      "file": "src/data/frontierStarterTrees.ts",
      "sha256": "2b3a78eb5ba506003f9bc800dd8659b7f07a343766bbd3ff7ea09da5a1da5b1d"
    },
    {
      "file": "src/data/garden.ts",
      "sha256": "3ae120513afc500b173d3474cd8b2a904349fcd7595538c5a7486bf36b13764e"
    },
    {
      "file": "src/data/gateVisuals.ts",
      "sha256": "4d6a97fb617b72dd0170e02e28886222363930f6c0b1da0f0c145b714217053b"
    },
    {
      "file": "src/data/glyphParts.ts",
      "sha256": "3ab902ff5fbd364076b8ae0d2928f3783e71d698ceb05d4b4ac45a8c81fe0018"
    },
    {
      "file": "src/data/gnatveilTree.ts",
      "sha256": "b46e71344007a1f72b6a3c2b8a0884634d3554e177c676a2fb78b9fbccd1fdc0"
    },
    {
      "file": "src/data/goadSkills.ts",
      "sha256": "eaa46ecea490753350e207b4977d549f583165d7e48522a120fbebd810e0decb"
    },
    {
      "file": "src/data/goadTree.ts",
      "sha256": "b76612abd7a28942454cbbca04b7368be13175fe2e9ba7c00f2dd261871960b4"
    },
    {
      "file": "src/data/golemGlyphs.ts",
      "sha256": "ed15c0de21b12f0c837527379662623cab05c97849db0a7372a2760bf0e74af6"
    },
    {
      "file": "src/data/golemLooks.ts",
      "sha256": "6c58f2fac508deaf14dca14a83f458baf57ff504835d304a60502b2a181d849d"
    },
    {
      "file": "src/data/graftReadSites.ts",
      "sha256": "fbcb1d52e18bdf115743dc25de2eee78cca3bd01f1132e8577fe29061e30b530"
    },
    {
      "file": "src/data/greatgeyser.ts",
      "sha256": "edc3c167144ca515e7c3c206715a79abb385433cbfe49a83456180e68c5155ec"
    },
    {
      "file": "src/data/grove.ts",
      "sha256": "2982cd312be7a0bcbf2d3ba011a51fedc151f005e0d51614d6813134e340d24a"
    },
    {
      "file": "src/data/guardians.ts",
      "sha256": "92f5a44dec3d17347b518078a9ae71211b6b00c8e956ead868f88a2aee94763c"
    },
    {
      "file": "src/data/harborholds.ts",
      "sha256": "16e600f420c83a6219afff89861c75b05d9663f4d049ca6d2a32d92bbc7388c6"
    },
    {
      "file": "src/data/harvest.ts",
      "sha256": "8186584361c93e23e40871f382b3062cee2ae114a546dfa5bb4f70396af45161"
    },
    {
      "file": "src/data/hivecall.ts",
      "sha256": "a8d2e049c4ada008474d673baf9f9b39f4f83ad247191b6169f9690571be2e88"
    },
    {
      "file": "src/data/hollows.ts",
      "sha256": "6e10578fb3fb15339ef48cfcc5f239fd97f8a90cea817f65feddea3ffd570f5a"
    },
    {
      "file": "src/data/identityCues.ts",
      "sha256": "c4902c577774766b552fa8a011c1df85db0957b26351056d7216535370af0d96"
    },
    {
      "file": "src/data/impactStarterTrees.ts",
      "sha256": "1dffc9912869eff83a4b59e865db6191417aed4a097c7580d444499058080b0f"
    },
    {
      "file": "src/data/impaleCues.ts",
      "sha256": "4df2f6a9ef8ca10646a1efd74f6d6d66af9c000c062aace2486545aae0c856f5"
    },
    {
      "file": "src/data/infrequents.ts",
      "sha256": "74c1c6077760424a02ee03111fadfda0f021bd71c364cb2c4df2ace9fad8ea71"
    },
    {
      "file": "src/data/innfolk.ts",
      "sha256": "cc102d74336b926884be1c9105462dd7d8e8a101c77114fc6dfe075c74b14cdc"
    },
    {
      "file": "src/data/invocations.ts",
      "sha256": "3790f118e1dc5373dc5ab8b09572004b6e09f30ed8baed92f9954dc568be7e9a"
    },
    {
      "file": "src/data/itemaffixes.ts",
      "sha256": "e74990e2ed2e267a32ee20762a97ceebc2da24792a22e8020f208c4d8d00a751"
    },
    {
      "file": "src/data/itembases.ts",
      "sha256": "aa6b03c40f1b2b8be35cf99187ac16f1db06e07fa4368003f879642d549f7274"
    },
    {
      "file": "src/data/kinshipGlyphs.ts",
      "sha256": "87d713c60e6c965999ae35cfe46f586403051ef9915aa0185575b68614d5b386"
    },
    {
      "file": "src/data/kinshipLooks.ts",
      "sha256": "6085aee2c6a195f3b9a896c835c2b4da43014405cfed1ece807a2ecf5105ddc0"
    },
    {
      "file": "src/data/kinshipMonsters.ts",
      "sha256": "c4e73664c7b1728f0d56c9db13a12273545a41a0eb12b75718f471f39ffcbf39"
    },
    {
      "file": "src/data/lairs.ts",
      "sha256": "65a656186a1ae03c780c94f147c758ffdcccad06d497bcba37d2cb1b76d4bb00"
    },
    {
      "file": "src/data/landformFeatures.ts",
      "sha256": "8c2c4d0a22efae6a45451a3ea93b4bdfdbd0a99b2dd5dff6043bb8b659d62e49"
    },
    {
      "file": "src/data/landformLocales.ts",
      "sha256": "1c8a88b16f154c939173192ad781ec098d7516dd9d6904cd63ec87ef588343b5"
    },
    {
      "file": "src/data/landmarkComplexes.ts",
      "sha256": "87d66799ec6e501c078b9c1595cbf1d2c299f797e0de6cdc8e9e61fcb2468055"
    },
    {
      "file": "src/data/landmarks.ts",
      "sha256": "616bf9762251956d08696912d524c5ac160bfbb1dec2ef887e5f2913cf37b317"
    },
    {
      "file": "src/data/leyline.ts",
      "sha256": "da650131731357279209eb608797e2b1ec4b94b86dd1418249029c1742459085"
    },
    {
      "file": "src/data/lightningVisuals.ts",
      "sha256": "31b96944c8e17a42af19acdf73036a683e3185fba3e126f3e8a0334385c57c88"
    },
    {
      "file": "src/data/lightwells.ts",
      "sha256": "310ecb481cd02f302fdacd8ff2a4da9f075ce9712d841773d68fcdfe50b454d1"
    },
    {
      "file": "src/data/livingSkills.ts",
      "sha256": "a9fea7fce949bdcec0385f8106105efa32963a6f8b613ea6c89ebb8c70184915"
    },
    {
      "file": "src/data/localeFragments.ts",
      "sha256": "85fb226342afef73432a9a4c5ea97a28ce512472c1b13ab886ccf0c234567c0a"
    },
    {
      "file": "src/data/localeMaterials.ts",
      "sha256": "56d1af1a4b72946187a63058f1f66ca3c8161f99d948b00bb1bee62b95ab40bf"
    },
    {
      "file": "src/data/locales.ts",
      "sha256": "b3f464f2386288d4964d2967d89bbb528db0146132f6582a9e0a2d9338302d53"
    },
    {
      "file": "src/data/lonecrypt.ts",
      "sha256": "7e1e3f613b51843e372140e84a0b911482926b188fbd28133698490b8b22b85a"
    },
    {
      "file": "src/data/looks.ts",
      "sha256": "ea3f7a56ccce9466e9932bfb5a10878c86b94a9678da36ea08924df6d4accbc5"
    },
    {
      "file": "src/data/loottables.ts",
      "sha256": "7acb51901ac3685867776d608de080f8ab208a7ec5c1159e3593bfc5dce7b7a3"
    },
    {
      "file": "src/data/magicPackSkills.ts",
      "sha256": "a1bbf9827510a728b1191310fcaf59817c9e6ac6127062fa9075f38538d1b861"
    },
    {
      "file": "src/data/magicPacks.ts",
      "sha256": "74f6585d626870870995f9e4a33abcbf025610534d722c58cb9521b703b57c09"
    },
    {
      "file": "src/data/massifs.ts",
      "sha256": "71a63ab3c3d2fe6ded51d905149ea1f84ac1dcb0d67364f3447f07a2017d5944"
    },
    {
      "file": "src/data/melds.ts",
      "sha256": "a935f751af0d353560ee8ad72178ace630775cd43e5875a577f4806b983989bb"
    },
    {
      "file": "src/data/memoryUnlocks.ts",
      "sha256": "159750cba86358bdf2e923d102d23b7fb6d5a2884c3eba6f9f064cbca24e3e16"
    },
    {
      "file": "src/data/menu.ts",
      "sha256": "0011e92eaefbb8ab4cc39b9b2ec7ac7b97587bf613669f7ee400d6863afed793"
    },
    {
      "file": "src/data/mercenaries.ts",
      "sha256": "b6b0f5e18a812fc6efc79fb8975b1747f01eedd4280d63758c7fcb2785a22c78"
    },
    {
      "file": "src/data/merelake.ts",
      "sha256": "48674609ed729cbe47cb3ce047b592c78afae9967e4bda9db6055187f0936a64"
    },
    {
      "file": "src/data/minionFamilies.ts",
      "sha256": "f6fd59246f7bd79dc7702151e5da76be143037320d595fd96e2c7511f5d51680"
    },
    {
      "file": "src/data/monsterNames.ts",
      "sha256": "0bbc778f56188353e2f40edb6d14c2b52441178965b834e8885e3d4ef4217033"
    },
    {
      "file": "src/data/monsters.ts",
      "sha256": "6ac7340f8ec4a13d3eee646e72eb184d2a100bd183022c5e856b79276089fa69"
    },
    {
      "file": "src/data/mu.ts",
      "sha256": "275b7a6e7fed86f0293793dd30935b8f12a540d16d577aab402891448f8f35b6"
    },
    {
      "file": "src/data/necromancerCourts.ts",
      "sha256": "25d23af96a570f1e43ab5d77a5a7cc8a540df8e7ea4e852fdbe3490a3f7d11f8"
    },
    {
      "file": "src/data/necromancerMinions.ts",
      "sha256": "9d59e1374ebde58ee7635fc4f267f4392f06b475e19d336ecd2e8d61e82e7b9d"
    },
    {
      "file": "src/data/necromancerRites.ts",
      "sha256": "50ae800cd9ecc6f040cc01faaed75436cd00197b00f1249d23800469c1e165b5"
    },
    {
      "file": "src/data/necromancerSacraments.ts",
      "sha256": "7ed4bf1fe5d73f03fb5a31d86c457e29d19fb501ee693d72ba1173c913e514f0"
    },
    {
      "file": "src/data/necromancerSkills.ts",
      "sha256": "afe1b42eaeae09348b867196dfb32798987c3536762ddafe0b897bea8315b380"
    },
    {
      "file": "src/data/necromancerTrees.ts",
      "sha256": "696c895b2a6c60bee82ad75e3da23853016e6937b980d5ba93ca98aebfa96d85"
    },
    {
      "file": "src/data/nemesis.ts",
      "sha256": "9f627fb726693d59cdfe94c901c912d6c0f2c070792c29246258bdebaf15bcb7"
    },
    {
      "file": "src/data/npcDialogues.ts",
      "sha256": "14540a65f43848612cb94f63b361d29f24d6f19e10444bdb87a7cadf7d00744a"
    },
    {
      "file": "src/data/objectiveRewards.ts",
      "sha256": "91085ffd5ffaf300c5d4c0a91d8bb1d868d8bbcee60863dc4412aebc775edbae"
    },
    {
      "file": "src/data/objectives.ts",
      "sha256": "fc3580e1e515acdcca758cd088d22e7cd9290329f0516520e975184feee10f2f"
    },
    {
      "file": "src/data/occurrences.ts",
      "sha256": "ad4eb205a83a79f7207b06b834030ace7ec5f46472932394a7698d5282498f39"
    },
    {
      "file": "src/data/odyssey.ts",
      "sha256": "e8920b0bcb62309bcebfb6c6adb54e078f2b98537d201672815236f28ab90715"
    },
    {
      "file": "src/data/odysseyPressure.ts",
      "sha256": "5ef45fdfa6a9be7dcbcc967a2f4c1de184c71548ea1c6cb2ffcb9d1a1d43d25a"
    },
    {
      "file": "src/data/odysseyRisings.ts",
      "sha256": "22c313943512bc7d6aaca1e361a9bf05f9161a926c59d52b3907d5fd373810dc"
    },
    {
      "file": "src/data/oracle.ts",
      "sha256": "1594458b498831d1db65105b222972622ed0a1decf48860af5b7d6c47de745fd"
    },
    {
      "file": "src/data/orbs.ts",
      "sha256": "7ac89fbf5fdc3c3d567649f7c52b45ebd6388698e732e0c08515c5bfa4d789e0"
    },
    {
      "file": "src/data/pactSkills.ts",
      "sha256": "e2809a22c1ceac514d232b6fc56c856269d4b043add007fb759ea7dfbb076c98"
    },
    {
      "file": "src/data/pactSteelStarterTrees.ts",
      "sha256": "60e0784f98a1972d0f317d95229a473ee0a387e07504db3e6e9107610f484fa8"
    },
    {
      "file": "src/data/partyCues.ts",
      "sha256": "f1c1c1a3f1baca9c2e2b9ef4622d34ffe109f37f65dad4f2da6058bc0bd4d9d7"
    },
    {
      "file": "src/data/passiveAttributes.ts",
      "sha256": "3edb22392d71472f5261ac34849e2ef455b7c7d408d8e40311a014f86ad2e0cc"
    },
    {
      "file": "src/data/passiveChoices.ts",
      "sha256": "cdad7ec25fb0df1048fe6a495ca0add843c81773e7845c22b6fb093e0a2e88d9"
    },
    {
      "file": "src/data/passiveCrossroads.ts",
      "sha256": "c01cdac0572e8a5595c62fb5370217515919be9f9d4daf143b27c3965b79d2de"
    },
    {
      "file": "src/data/passiveNotables.ts",
      "sha256": "4e5cef6aa4fa1c7989ae5119a825dcc35f874b13d84e5bb256a1b09fbcc4bf8a"
    },
    {
      "file": "src/data/passiveRealms.ts",
      "sha256": "1457bfed8f29938da38fd2bce1a1af1fd08afa9f0aa0ea98e45b9d88b16e4f8b"
    },
    {
      "file": "src/data/passiveRoutes.ts",
      "sha256": "b6ef154d0a59ed1124cd021c22eb3d2d213a0fee533d8312732226368eaf55cd"
    },
    {
      "file": "src/data/passiveSpecializations.ts",
      "sha256": "4e107485705bcd129f7a89b2f660e150bc42686178360f31b6cfdd8e48409bcc"
    },
    {
      "file": "src/data/passiveTopology.ts",
      "sha256": "75ef815c0549c809553f01dfbb139e513f5b316374d46afd57444ad302b4d35c"
    },
    {
      "file": "src/data/passiveWeave.ts",
      "sha256": "350d73c7e3409576988d06681f67d36262be7c3358303a5d52d0190184bd136a"
    },
    {
      "file": "src/data/passives.ts",
      "sha256": "3357d66d6fcd5b09901a492a8b32d856b818049b321f749d19b1db163e529dc7"
    },
    {
      "file": "src/data/payloadCues.ts",
      "sha256": "012ea06c6447d410775ddfd57338285f791c0142252ccad668798ebc41744080"
    },
    {
      "file": "src/data/pilgrimage.ts",
      "sha256": "650b6aa2d03ddc489e501a767ef798eee95802129a7155e611d0876363134620"
    },
    {
      "file": "src/data/playerBody.ts",
      "sha256": "0b415c724d418af426e19cdbe732189faccb9d0b2f95499f86ec07e1602b3738"
    },
    {
      "file": "src/data/pocketForms.ts",
      "sha256": "6f68bafed2388a379e3cf99469c957b19ab06d9c239e68b21fc794607ac1b503"
    },
    {
      "file": "src/data/ports.ts",
      "sha256": "d1b0b3bc901ac6a9638e876bb414f5dacfcd133f6112b6577143939f93ea2025"
    },
    {
      "file": "src/data/powerProgression.ts",
      "sha256": "b5354642364d4953cec5dffd05deb89841cd873a557d9ad6db1cf302fbe656d7"
    },
    {
      "file": "src/data/precisionStarterTrees.ts",
      "sha256": "a5ff5c42dbd02b85340edb6a7344c9f30d1554fbe65a9f5ca20bd116dd1fb6c2"
    },
    {
      "file": "src/data/procCues.ts",
      "sha256": "04cc1fde95eb2582639a4b58219df01b4abe2378f0699d57dee48a58a2204047"
    },
    {
      "file": "src/data/processions.ts",
      "sha256": "c9f8fddf296cd6a3dfb61e8a99b6bc4f20e57ff24f356b22b63217c71c81e13e"
    },
    {
      "file": "src/data/procs.ts",
      "sha256": "d5627f3f27f0c747f3202ed4ac80908fc9c1596433322171ff5ebba62500b77a"
    },
    {
      "file": "src/data/puzzles.ts",
      "sha256": "7fd4a45e866ae983de0a7c28bf6cf1badc7d2ea5602a004ab033c0de357383ef"
    },
    {
      "file": "src/data/pyres.ts",
      "sha256": "ea2d391a71d2910cff4357541ed51a160c0f2ab335c14e8a575ababf48b3d294"
    },
    {
      "file": "src/data/reactiveSkills.ts",
      "sha256": "6fabe2c96347b12429389f8420c5729c014d0cee432aa105485eca726fa2480b"
    },
    {
      "file": "src/data/reliquary.ts",
      "sha256": "6c31ecc9a7f151313e32856961996343843311de36da05f487db5f7ad4994b09"
    },
    {
      "file": "src/data/remnants.ts",
      "sha256": "f82e566c60861931ba6c42a19f611aeb4be1c233107df8b66fabed9e7aeef2e5"
    },
    {
      "file": "src/data/reserveCues.ts",
      "sha256": "2b791e829650213fd4cd9d9dd5dd959675a31ea7e79542a117c47825606e5fe4"
    },
    {
      "file": "src/data/resonatorStarterTrees.ts",
      "sha256": "50d9d154f4971cff2216e551745ec4b6cbee05f864ddc17471e3357a6a797eea"
    },
    {
      "file": "src/data/resourceVisuals.ts",
      "sha256": "0aab27107f4db146beef28a2660c4d8b4a11eb22605cb534805525f3a0eb7fc1"
    },
    {
      "file": "src/data/rifts.ts",
      "sha256": "945ba6e7180494a42f2307ae5928babed6885ad0a7f9bb8ee9df6e2a503367bd"
    },
    {
      "file": "src/data/rootwildGlyphs.ts",
      "sha256": "96a0fe372e89581eb1504eb89a8d1fa807c9aa9fc6fb6cfa75247716e0ca3c6f"
    },
    {
      "file": "src/data/rootwildHabitats.ts",
      "sha256": "f9e7f765e7ca0af779b0d73654716050a3cb8926b971e5edc0f3949db2cdab8e"
    },
    {
      "file": "src/data/rootwildLooks.ts",
      "sha256": "7295ada495c0a4a33937266ade33830551aae7ced8e8421c3cc6e62bf006396d"
    },
    {
      "file": "src/data/rootwildMonsters.ts",
      "sha256": "8ebf0ae86095e785d50a73bc253d309b8a3288b58ebf8f26b9e11e64e6abcb03"
    },
    {
      "file": "src/data/rootwildSkills.ts",
      "sha256": "fe93d73c7ae6e8128c508f71d1be98bad74e3b8062dfcdf7a5c35f4d01fcafc7"
    },
    {
      "file": "src/data/rubblekin.ts",
      "sha256": "3497a4cd8df40c0019a0ac3fe43d428d591eef11e4edde23172a7a2dc14e032f"
    },
    {
      "file": "src/data/rubblekinTree.ts",
      "sha256": "770e98a365d315fab3a1810eb2723ba2d793fd2e0c2c303352eec3ca71c07994"
    },
    {
      "file": "src/data/runescript.ts",
      "sha256": "296f0b64c48ec8700d6f04b3dcdebfe970fabcfc127a779dc9bd175310936e13"
    },
    {
      "file": "src/data/runeweaverStarterTrees.ts",
      "sha256": "b22d808925911045d991aaff4bf47736ec605359aaf5b8a79a4fc7f04464d219"
    },
    {
      "file": "src/data/satellites.ts",
      "sha256": "49ec25453f60d529b54c7142e08c7637b3f72ac27235e3ba4aec622688c6b29b"
    },
    {
      "file": "src/data/scald.ts",
      "sha256": "11683a2b62860c1d12945b444d920eaf6fc2a070e5c3e351f018c1f227eae137"
    },
    {
      "file": "src/data/scaldkit.ts",
      "sha256": "60c199aab8de9716b8e71eb1d2138c4f79ce6e5b459b463447ecbef54818af10"
    },
    {
      "file": "src/data/scenes.ts",
      "sha256": "c69d2219f0ecf8f18d7e09f123801ae826af536b083394ba232e37df4ef041d9"
    },
    {
      "file": "src/data/seas.ts",
      "sha256": "eeb4f9116b2c2cd783b29b5e5686d78bd45cd820b1ef522748d12465ea09176d"
    },
    {
      "file": "src/data/settled.ts",
      "sha256": "77e624c06e8eed6b23810c3608a664086683b71439fe85c360d75c9fc62900be"
    },
    {
      "file": "src/data/settlementDefenses.ts",
      "sha256": "a88452f280aa19c8c8b727885ba4979ac5481c7e065a9067a231c3d158b8be27"
    },
    {
      "file": "src/data/sheet.ts",
      "sha256": "3e74e84270e8107eb49a592ef1414ceeeb4a915cd08c8e3e38ed6a6a788f956e"
    },
    {
      "file": "src/data/shieldUpTree.ts",
      "sha256": "2c1c72dd88825ab645fceda397c6735a5965ebc8da78b8e133ee4724c746c152"
    },
    {
      "file": "src/data/ships.ts",
      "sha256": "8faf347b340f8dc07703e89b936f158aeb8743163b61ed54e87b369f60b1cafc"
    },
    {
      "file": "src/data/shrines.ts",
      "sha256": "c77f4fe639089bcd370072e6526d50861638b724a2df1e8aac9b684b23d766ad"
    },
    {
      "file": "src/data/sidezones.ts",
      "sha256": "cf17e17f3903951e5719e8032cf84f7d434967a896a44d594b5a0cf3f5da088e"
    },
    {
      "file": "src/data/skeletalMageCosmetics.ts",
      "sha256": "b0708e7eb8feed66da1fb8b0a51a445852011b5b02b876d6b9e6f77bf017f5fa"
    },
    {
      "file": "src/data/skeletalMageGlyphs.ts",
      "sha256": "16e0a16c1bcda334e1beccac68f6cf5a51bc4ebefef4421ce3867e85d89333d9"
    },
    {
      "file": "src/data/skeletalMageLooks.ts",
      "sha256": "9d085d33bf993080936c9ef2e5b705e2183428fb4f0de1100fb3c99c89173dca"
    },
    {
      "file": "src/data/skillCastVisuals.ts",
      "sha256": "782e347ef0e8a57768e6671a2643e447b0bf417d7d195946f530226ba734f800"
    },
    {
      "file": "src/data/skillEmpowerment.ts",
      "sha256": "67d854d4e770e059ee3ffb16edc5944e7b7572a6904ca529d9aa304eaf1f924b"
    },
    {
      "file": "src/data/skillFlightVisuals.ts",
      "sha256": "6d09f24f5b9616d429876cbf1ad46c736dc4c7c0f634b22ae0c7d835504cbce0"
    },
    {
      "file": "src/data/skillMovementVisuals.ts",
      "sha256": "8a072f3487c3fd9444070fc8b13c22df46e8f8338fcc6e7ad133817d6bbeb21b"
    },
    {
      "file": "src/data/skillPresenceVisuals.ts",
      "sha256": "38562706d3bf253524b6a456bf88dde3d6c1e76c984f65705b96655f83c0fc69"
    },
    {
      "file": "src/data/skillSelfVisuals.ts",
      "sha256": "80f4d4ec07ee4c082adf7989c3e757314e11f17e3995f689f554a37ea902c713"
    },
    {
      "file": "src/data/skillShowcase.ts",
      "sha256": "0315975110bc4f52227d1f1e715a97f67b97bde161f7fc942aa743f7caadfed0"
    },
    {
      "file": "src/data/skillStrikeVisuals.ts",
      "sha256": "f195849ef50a19416f45dd04b4c7cca7806c2b3c734f691aeeeb26e455a72098"
    },
    {
      "file": "src/data/skillTargetVisuals.ts",
      "sha256": "0dd74174a28f08f1f571478c50c7f9800402cda1e6930ba876f22ac8986ee838"
    },
    {
      "file": "src/data/skillTreeBuilder.ts",
      "sha256": "b34b71f5db312f69ef83b7609c531869c4526628f2e0f56e1ed46f3e082655f5"
    },
    {
      "file": "src/data/skillVisuals.ts",
      "sha256": "af98fc509c140eeea9b4edae1a1976c7b7b5a0a715b534197c213f5cc1c97a0e"
    },
    {
      "file": "src/data/skills.ts",
      "sha256": "1e03c12f1b0bc7b61a5c0e6154eab010fc3debba86bd7261d311cb458bcf0b71"
    },
    {
      "file": "src/data/speechAttention.ts",
      "sha256": "2fa4fffa51767e0ab344e469a2b99b0912366f62f217fead0c7085e850895260"
    },
    {
      "file": "src/data/speechGrammar.ts",
      "sha256": "01be80f784c94cef325d4172cdcbb9f6b7cf1541fbd1e5fad2838fc3cf6aeaf1"
    },
    {
      "file": "src/data/stalkerCosmetics.ts",
      "sha256": "514d48b91aebdc61dfd03d55e27ce0a1cc4c06a5dcd7c03cd4813230f559e482"
    },
    {
      "file": "src/data/stalkerGlyphs.ts",
      "sha256": "5c840af9da1ab2580097fdf0e596e219521f0efa62f034409bf9bdd93beb3f85"
    },
    {
      "file": "src/data/stalkerLooks.ts",
      "sha256": "05131e8f3fac999d3442878b16e97284b1c7d0cf426a1bca695c0ddeacc66f5e"
    },
    {
      "file": "src/data/starterSkillTrees.ts",
      "sha256": "f5b68f597d0b57316f83fc86338657eec3d7a2bfe1b2cdf1f53a3bf08cfcc22d"
    },
    {
      "file": "src/data/stashes.ts",
      "sha256": "b03d5c7587c6a2b5c7535dbe307804ba4ca90394914f9125f35fb803f762191a"
    },
    {
      "file": "src/data/structures.ts",
      "sha256": "5c90c60d46fda9b01b72fa79d44865faa9845f8c5e8e752fa6ad7d824685f2a1"
    },
    {
      "file": "src/data/suites.ts",
      "sha256": "6ba47de40935388e78cd101de59f8c31121129c326fa8cfe8b0e93108e0db4fa"
    },
    {
      "file": "src/data/summonCosmetics.ts",
      "sha256": "6c0cf48c034beb1a622629a25a26c31fa08c433ed67038e25e0a8079a49eb8c2"
    },
    {
      "file": "src/data/summonGlyphs.ts",
      "sha256": "eb21a9a1717b9f6368f67a93a9a7021eedd7b498bb30ae1f7b8c525c231f318b"
    },
    {
      "file": "src/data/summonLooks.ts",
      "sha256": "d29c6eca8a1cefce52e254fd2143b03c4f8fe58124ddc7db5e939588ef192832"
    },
    {
      "file": "src/data/supports.ts",
      "sha256": "744c7415f9ed6854b1e34fc413241d7b3faa164806fc1beadc1240f4f6417120"
    },
    {
      "file": "src/data/sympathies.ts",
      "sha256": "4612b159bcdeb223a5bc9579edfb280a0b1d49ab237bcf06f5ffe04fcff771ba"
    },
    {
      "file": "src/data/tacticalEncounters.ts",
      "sha256": "9e8cd4e72ba8cd188ba0dcba0e03b260332f9fb097672c977aba8f81f65a745f"
    },
    {
      "file": "src/data/tameBeastTree.ts",
      "sha256": "bec7fd149b7f1fd7491363570c5a1cf42ef7bd3249a2970eaec63430708c75de"
    },
    {
      "file": "src/data/tetheredHabitats.ts",
      "sha256": "32238c5734bc373fd50e8fe8f147f0c530a430fc6d51c5b07458b4eee14e8327"
    },
    {
      "file": "src/data/tetheredMonsters.ts",
      "sha256": "b131640a97bb943fae6f0ac9da0e13c203897e0057ac71a508107fb78b04dee8"
    },
    {
      "file": "src/data/theater.ts",
      "sha256": "a8a70acec3d874b047428561d83bad028cf5e6d378feb32f8118634707a6de5a"
    },
    {
      "file": "src/data/tilesets.ts",
      "sha256": "af2b4457ca7222c57c55db2c61aac47cd2b4b3b13cac0ac834bf5b8e46825408"
    },
    {
      "file": "src/data/titans.ts",
      "sha256": "a51e34b4b5f7584c4e6bfbb1dbe21343b55f38d2ff7aaf0b116c3a5e2fd2666f"
    },
    {
      "file": "src/data/townBuild.ts",
      "sha256": "8551e6f88fea0b9fed0c0a9b48f9d40506b1cf4cd3c057eccd472f2f17b9fe88"
    },
    {
      "file": "src/data/townportals.ts",
      "sha256": "9b45924fff90028f9f620063872b7fb4c09b68c41674425473615648747ce016"
    },
    {
      "file": "src/data/traceShapes.ts",
      "sha256": "77a5b85804a7390ee5148a44d53e94d5463eeae49380db805462bac5fa5558fa"
    },
    {
      "file": "src/data/tracks.ts",
      "sha256": "4862b42e47060fddb6d29056b7dedb1191eb89b828344d6eeeb4ddd9ced5d6a2"
    },
    {
      "file": "src/data/trainingYard.ts",
      "sha256": "24b2878498162c4b55285345ba6c5930b6454f55542ce78c992534c3b6eddd4c"
    },
    {
      "file": "src/data/transit.ts",
      "sha256": "88d2337fd812771eb6f618b1816d4e0c8ea16a49df8e71b495479c1bbcb0af01"
    },
    {
      "file": "src/data/trapworks.ts",
      "sha256": "e22aea35c5394ee904b0b911c7e98c87deb1fab8bd36e81ab705f9db38c74b21"
    },
    {
      "file": "src/data/traversals.ts",
      "sha256": "616145efc5caa933e78ef4965613be97df69e8eceacded01e56de9b4462477e8"
    },
    {
      "file": "src/data/tutorialObjectives.ts",
      "sha256": "95729e25c994f35b0029d069ac43062c333a0d5374ecd922f797342768653a73"
    },
    {
      "file": "src/data/ultimates.ts",
      "sha256": "3fc2582478e01e1bd0caa6e098be7600974578ec664c97a2a39533239b0294a6"
    },
    {
      "file": "src/data/undeadCourtCosmetics.ts",
      "sha256": "eabf85698c0e30c33e7be4458a6db97451d0605e22bd3ca89d854fa855fd0284"
    },
    {
      "file": "src/data/undeadCourtGlyphs.ts",
      "sha256": "2484ec31100f92ffdb77cb82e70fd37c671b9cc8a81350272467c7947fac73f2"
    },
    {
      "file": "src/data/undeadCourtLooks.ts",
      "sha256": "faf0ea407ee0448f55490e670485954224d69e23919f1c7485aa4105d2444d42"
    },
    {
      "file": "src/data/underspans.ts",
      "sha256": "f5a8d25ea4fb645dc8dc792c0a79836d1e6e95821e8948fe126e084faa68e186"
    },
    {
      "file": "src/data/uniques.ts",
      "sha256": "0946c2dc0a1de932bf374b4f34d6a32b375b58a8497cebb662e5b13a2db65617"
    },
    {
      "file": "src/data/uniques/accords.ts",
      "sha256": "5a9b682e0282027e2c5d2655c8afc1c5b060bc99bb2d89fa2472f3ac7c6ceab7"
    },
    {
      "file": "src/data/uniques/emergent.ts",
      "sha256": "267a398e66f6b3e5ebc1f68016e3b8b1f621ee5bceb4dac924fd8e902c303b05"
    },
    {
      "file": "src/data/uniques/living.ts",
      "sha256": "73230cc33146ab709c65f6727332f42a150e447a6fbbeee5d04b8d9fdda6f1c0"
    },
    {
      "file": "src/data/uniques/reactive.ts",
      "sha256": "02c84b6d830c63fb3dbc3cdb3b14514610f432f112a0f8760f5c59343516c312"
    },
    {
      "file": "src/data/uniques/relicPaths.ts",
      "sha256": "7c1547867a31de0715377705f7894d9f7eabb267e4ec7f0263b79a575a887a87"
    },
    {
      "file": "src/data/uniques/relics.ts",
      "sha256": "bcde9478035ee58f5cf9f32b230ac482367d1444c706705be24525c2483ee668"
    },
    {
      "file": "src/data/validate.ts",
      "sha256": "9ddce46eaf28d02c9c604c092cf4663d89c112e29c5f3ba2d03fdcd4c20ac5ea"
    },
    {
      "file": "src/data/validatePassiveLayout.ts",
      "sha256": "52a3842a31d65ed19d9d93a4e7275e2a8305f9a2b0cc03fc0c4256b422fad5fd"
    },
    {
      "file": "src/data/vendors.ts",
      "sha256": "670b7fefdedc61e3482a93a7d1a3383cf0d85671f4727569a078e5e541101d78"
    },
    {
      "file": "src/data/vestiges.ts",
      "sha256": "150bdee8d9dc1210012b6a3bc215299dfcf8b92592dbfae6c0198ed95f525c34"
    },
    {
      "file": "src/data/vocations.ts",
      "sha256": "1ffbd7d530cbbb2b29fa771c398f1f1384d433a023f1be5bf8e7bb8a32baf53f"
    },
    {
      "file": "src/data/voyageIslands.ts",
      "sha256": "7efed0b357f35d043d165871f93fb3538f2d63d6b2f995a0f4dd07c02ca8de6f"
    },
    {
      "file": "src/data/warfront.ts",
      "sha256": "96ad46ada5695e3024cd4d80573e9bed4c5598812e1839ca33a3d27a04c07ba5"
    },
    {
      "file": "src/data/warningCues.ts",
      "sha256": "85fd5208616db8c8f7bed394dc241559e53ee55c70c23160e1eb898f6cbb7124"
    },
    {
      "file": "src/data/watchposts.ts",
      "sha256": "e61118445f37c9dd85d65d98548e1037428004d9f574d5c79fe127fd685f2a63"
    },
    {
      "file": "src/data/waterSurface.ts",
      "sha256": "844042160628dd62a4082b3973d18d141600eab23cfc2881c8b432d4d25ccd24"
    },
    {
      "file": "src/data/waves.ts",
      "sha256": "864e73efbf0e20e2b71fe1acaaa355674a747ed2454c4a7063b3e6bf281d8211"
    },
    {
      "file": "src/data/workshopSkills.ts",
      "sha256": "7d484a924de107d96fe6264d2ec10839c08f0138d3608cd9cfddfcb3e6191d4d"
    },
    {
      "file": "src/data/worldBossEncounters.ts",
      "sha256": "099ffb0468f8024f0fbd8d4a8cb282dda057cdb21a9c2c53c09c9dbee3c08fe1"
    },
    {
      "file": "src/data/zoneKinds.ts",
      "sha256": "626223aad5c95e48632d4a27fcb3a8a922c4bef773afe4dfcb003678cacd853a"
    },
    {
      "file": "src/data/zones.ts",
      "sha256": "deee0fca184696a8267cc404a4838a1cff6c44e3c5fe6cbc39a5b871a27ac053"
    },
    {
      "file": "src/dev/entityForge.ts",
      "sha256": "cb4c430f3d739269ace2ef5e161a5e99773a60da177e4bb8ad33cf0f3e31be57"
    },
    {
      "file": "src/dev/forgeSchema.ts",
      "sha256": "9f259e6de248b7e62ae8049258120d6fde15dc96218e933a43929ae2d372844f"
    },
    {
      "file": "src/dev/glyphForge.ts",
      "sha256": "70d8c7ee38248544a0a0f4e4d77edf2fdfb28c15fbff4f9d6589c09b55f8e039"
    },
    {
      "file": "src/dev/mapForge.ts",
      "sha256": "7e3d7f3af96a17ea04bc6744d212f954e8a822e8309e347120d71c411d85fea5"
    },
    {
      "file": "src/dev/monsterSpawn.ts",
      "sha256": "96c50abe79baaa6a234610cf4e177ac9f5fde8c7bdc0f0f2cdc9838517dd29b2"
    },
    {
      "file": "src/dev/panel.ts",
      "sha256": "60a2b4bc9587377e0d1fbbb467aab9ef5c72d7442530c13070b6341a6356fa79"
    },
    {
      "file": "src/dev/passiveEditor.ts",
      "sha256": "38dbe3ee91ae7900c85106ad1a15cf80995a1f500725bdeacfd5dd8322e7f1f9"
    },
    {
      "file": "src/dev/perf.ts",
      "sha256": "d681c5d714f2c719cb615390c301415fe5199217e76edf43e15ef68eab8c7081"
    },
    {
      "file": "src/dev/progression.ts",
      "sha256": "0f62add62ef23b39ef689721e69dafffee3e1dc62ec6c9ecbf026a711f3c18ed"
    },
    {
      "file": "src/dev/tabs/account.ts",
      "sha256": "67d3582cc313fa7c2241d8820e6010ea700226ec46d02070475b203429a19a07"
    },
    {
      "file": "src/dev/tabs/atlas.ts",
      "sha256": "fd0b2db2599ef79d10092e58dbe4135d2cd09f8d9f6f7af0588b09ef8bad5fa3"
    },
    {
      "file": "src/dev/tabs/combo.ts",
      "sha256": "98618c7c702c89c5f0da20102b58d74116a6c913dc2737c135373c009e2729f4"
    },
    {
      "file": "src/dev/tabs/dissolve.ts",
      "sha256": "3dd191c2d5b2d448d3c90a02a37df40d1e4ebb189225a2d4f713766e809cf196"
    },
    {
      "file": "src/dev/tabs/emerge.ts",
      "sha256": "fbb2a541ef0bbee549c619c24b4261dfe2c38995a897f2648675eed146196618"
    },
    {
      "file": "src/dev/tabs/entity.ts",
      "sha256": "b2fb9bc4905a4d331a8cf8f9c7e0ca3da2e65d1a84603283c6bbb1fbb81cfc54"
    },
    {
      "file": "src/dev/tabs/events.ts",
      "sha256": "61cabd24b72e984edff6b34c86cf668560e4cf3b8ef4b3e5599cded3cb58a4fd"
    },
    {
      "file": "src/dev/tabs/gems.ts",
      "sha256": "835447c892b0c092de7ca79b568088173473bd413c936baf94f375ee86e9091e"
    },
    {
      "file": "src/dev/tabs/geysers.ts",
      "sha256": "fef08e89bf9696117b9862c326537b77fdf48ac263f4679ae7a8008766b3105b"
    },
    {
      "file": "src/dev/tabs/grab.ts",
      "sha256": "e7a4fb2c6f69875232d560aa671a2a30ae7f3e9641da0f3a25b4a7c25ac0a215"
    },
    {
      "file": "src/dev/tabs/holds.ts",
      "sha256": "fe4d1241f133deb4e527b2c25c484dbb35d60678301f4531b7711745e57a6395"
    },
    {
      "file": "src/dev/tabs/items.ts",
      "sha256": "a1b130ca389022a496d32c15bb46e9cb1b3049b17812bec8e0de6324c6d2d4ef"
    },
    {
      "file": "src/dev/tabs/lite.ts",
      "sha256": "54e65ebb9809df5c383cdba02d6dc0069b2b38b92a06aa71c3609891ab4980f6"
    },
    {
      "file": "src/dev/tabs/location.ts",
      "sha256": "9fd507b633aa659d91fe015e13cfb2ee9f2eb8894bc89eec7122fa8d4ea2c25a"
    },
    {
      "file": "src/dev/tabs/maps.ts",
      "sha256": "10b3709998bbe5561392f706cabd7a76ef5674f50d9ed432c2abd97aa1b85f35"
    },
    {
      "file": "src/dev/tabs/perf.ts",
      "sha256": "399b48aa00bd65b0023b773b384b7cb3262d514846cef855dc771257c66fbc85"
    },
    {
      "file": "src/dev/tabs/possess.ts",
      "sha256": "cba91c95a320d8898009ea964296b05d3746b23aed1734b84ee2ad5335a2581f"
    },
    {
      "file": "src/dev/tabs/progression.ts",
      "sha256": "06d4a4d5398a7cc51f35581f657d91b7b40820af85096487306583ca43c00926"
    },
    {
      "file": "src/dev/tabs/throng.ts",
      "sha256": "15124eed115f181a8d153aa589321ad50a5172c14947e1aaa25bc56e5b4737b6"
    },
    {
      "file": "src/dev/tabs/ultlab.ts",
      "sha256": "72d8e439e9e55ef27475f663a55bf05e3cc980c759c11d24907ecc160617c707"
    },
    {
      "file": "src/dev/tabs/watch.ts",
      "sha256": "1dced0fbc48a7725f92e2081a2237f79586f02abf198469ab68aed5114b1f7e5"
    },
    {
      "file": "src/dev/ui.ts",
      "sha256": "1e6e3cba8c973fc017be8188bd4f47abdbfa9b2b6b992866a915320cf2e03ad7"
    },
    {
      "file": "src/director/camera.ts",
      "sha256": "a9d32fdb84e3aedc18c9e69bb907addef3e1d963fab226bb77f28e9a4e4b9bb2"
    },
    {
      "file": "src/director/director.ts",
      "sha256": "dce9bea0f1a66e5b9f5a9084c6e791ae6e7c171b43efa2b8e7223f46f6ca23e1"
    },
    {
      "file": "src/director/shot.ts",
      "sha256": "2a481ae0853d44b35381ffc296446bf15869ce85ab041492c875d44dac0384fa"
    },
    {
      "file": "src/engine/absorb.ts",
      "sha256": "2db40e8772362b6a77d530947708e9cd4e9fa9498353c380df5ddc34b25f5a22"
    },
    {
      "file": "src/engine/accountReliquary.ts",
      "sha256": "3bab9f3ec5bffc93948939a87b9cfdc54137efb1638e855667c89ed65e254c89"
    },
    {
      "file": "src/engine/actor.ts",
      "sha256": "0d5769530cb899fe0328158d70312b80e916753f014e9fec02e1874bdf570dcf"
    },
    {
      "file": "src/engine/actorGrid.ts",
      "sha256": "34c6e471ff92bc51129cff01113dce81f658e225bec61241747487fdac12101b"
    },
    {
      "file": "src/engine/adventureDistricts.ts",
      "sha256": "58b3198f5163cfe7f889da45416d05ef25a501fd982f7a249f9873a47a025e7d"
    },
    {
      "file": "src/engine/afflictionPressure.ts",
      "sha256": "2da1217ba50d40ee0aceabd37c1a7cfe53c545dda0c4091ab05c8f88bd3ae681"
    },
    {
      "file": "src/engine/ai.ts",
      "sha256": "7057739bc34d5c3d682996b09524619d88c8d0e43f8ee0bf148fe06c4bea712b"
    },
    {
      "file": "src/engine/aiActions.ts",
      "sha256": "e2a2c7a0cef913170125d240d835ee66f507e5650055eb77095adf0e0087c4f1"
    },
    {
      "file": "src/engine/aimassist.ts",
      "sha256": "302794134e8d923e9800b9247f7e95d3fcd2a0d62bd82675948d5b3488bac16e"
    },
    {
      "file": "src/engine/altarBodies.ts",
      "sha256": "16f72b76bd467420d3b05176a7a7477e80974c521b03c75a75f53c83469f9823"
    },
    {
      "file": "src/engine/altarCues.ts",
      "sha256": "97f3447f4441e11d46c883a253c3a5779a086d45d630121b3b88bc73112dcc11"
    },
    {
      "file": "src/engine/anatomyCues.ts",
      "sha256": "1cb5b1247e357d40048a0da23e9ceafc6b0d9d7690c2b99502afb5a398eaf063"
    },
    {
      "file": "src/engine/arenaCourt.ts",
      "sha256": "db7d634c6e508b1d29ceda3d1a6e154df4bda710fa653fdbb46ce168e7d48f76"
    },
    {
      "file": "src/engine/armedCues.ts",
      "sha256": "7e9ea50be6535ce4ae157abcae8e46a21dc6dddbbafdee0c72144c11ccb74e7a"
    },
    {
      "file": "src/engine/assault.ts",
      "sha256": "64084452b1487593568e4d8a065ed126489b5468d453239f12972c1834818b97"
    },
    {
      "file": "src/engine/attackPatterns.ts",
      "sha256": "ca667992eb14675eae70d171551c3489f65f6a1b649735d5da94d91a380fbacf"
    },
    {
      "file": "src/engine/attackSequenceSpec.ts",
      "sha256": "6ffb006e0c79ec1943faafcbb6de5bdca7eae8bac286f3ea4fb2b8858ca3b267"
    },
    {
      "file": "src/engine/attackSequences.ts",
      "sha256": "0383eb4ff4c4da3590b6f38a5e1fb4adada85517aeced21a72d13abca6c9e0ef"
    },
    {
      "file": "src/engine/auroraSpec.ts",
      "sha256": "901e4a89d2ad7ed1da5cf6650caa979cd2d9dbb21f4e21871887d610f2cc3d3e"
    },
    {
      "file": "src/engine/auroras.ts",
      "sha256": "29cc7c2babfd4f4e0074e6c0194081e1746deddcad004661461ba55db6767d93"
    },
    {
      "file": "src/engine/authoredMaps.ts",
      "sha256": "5e7d137f093a78a81979d429b2ed5a2a8497e9df79fa7abe31cc9cadf0add36e"
    },
    {
      "file": "src/engine/bagsort.ts",
      "sha256": "213b16b97d0e5df84def3135d5993dd17b14c6706d77579f059f2f9cfe7d1b00"
    },
    {
      "file": "src/engine/beaconObjectives.ts",
      "sha256": "0fcf034b92b2b6f59de926056b0955a039f584460a56fb7ed2a1c7dcd585e6f1"
    },
    {
      "file": "src/engine/beaconSpec.ts",
      "sha256": "cff7533b5ed33a762ac56b7f2d5e7bd230dbce77a094fa8f0e36085a5c8cac25"
    },
    {
      "file": "src/engine/bequests.ts",
      "sha256": "0ba675d2f7237f6b2e93959b37c20640694fb491120a9d452a68332388c6f999"
    },
    {
      "file": "src/engine/blend.ts",
      "sha256": "3e361e6216fb487a6ea44a82b46247c55b65470370b79c5a577da855d525e3f3"
    },
    {
      "file": "src/engine/bodyAction.ts",
      "sha256": "a6dae1ac4f645beceb6e312b50cb2ad33c0307c51163d3c8ab27b1c1f6687d02"
    },
    {
      "file": "src/engine/bodyVoices.ts",
      "sha256": "299ac65c1f2d10e75a52e433d8df5cb5f42f2de3df0bd892f31984686d52e5a7"
    },
    {
      "file": "src/engine/bodyWalk.ts",
      "sha256": "69ff3efec650c972fe8369b70a4cf486ad522da5d71b1d0783b862995608ab6a"
    },
    {
      "file": "src/engine/bombard.ts",
      "sha256": "f3c6fea2446d27a990ab899be5cf9463cac14e9fffb00c8fbb4eb8d76ba59638"
    },
    {
      "file": "src/engine/brain.ts",
      "sha256": "88319b18f0c0f3d670ca2d9fa1c5010c9f474fe45e82619249e796e6a665d144"
    },
    {
      "file": "src/engine/carriedEffects.ts",
      "sha256": "d5645377597723631bfbb9fc5ec75ae9162d49214386ab5da9f830726fd8a7dc"
    },
    {
      "file": "src/engine/castAim.ts",
      "sha256": "29c592471c1538117a8e199d8683163c6d8c888ad7987ce081373b769722cb3a"
    },
    {
      "file": "src/engine/castingCues.ts",
      "sha256": "632d556e856f6d7c2e1af6e1a9fc21725aa6a2f4c50b6ff7cfc55807c8d5c071"
    },
    {
      "file": "src/engine/castseal.ts",
      "sha256": "9c6188e8eddb986477890285ca5cfe77bcc056340b864739afcc5fd6eccb4e3f"
    },
    {
      "file": "src/engine/challengeSpec.ts",
      "sha256": "5000e4e71c544c53ae8040fe5b45bf87c998b8478b5aaa0be9fb44f9e3de18b9"
    },
    {
      "file": "src/engine/challenges.ts",
      "sha256": "d77fc896488be3b0a218763982a0fad3e9e98c55f757b6424645fc909bb3c1c4"
    },
    {
      "file": "src/engine/charges.ts",
      "sha256": "20f0796de9f6adffef6bf344f9a0742cb456cac204b0f9cc9f11cdde48bdd708"
    },
    {
      "file": "src/engine/chestInteraction.ts",
      "sha256": "3885ccdb875e78e9291c809fce4fd6fd35d1abf99ebe1981965f2b1df2196bdc"
    },
    {
      "file": "src/engine/cling.ts",
      "sha256": "cb003b825a81394bbf65d730399e637b63bd220ad26b24a68c26fa59bd0d96e8"
    },
    {
      "file": "src/engine/clutch.ts",
      "sha256": "0934fce85fcf1c556dfb09487d0aa0b0eb6453e2787d762675497e58274fd9fd"
    },
    {
      "file": "src/engine/collapse.ts",
      "sha256": "48c75659871790e5442155dfcd5ec6b5ff6cb675e2376926db4371cfd23c6272"
    },
    {
      "file": "src/engine/combatCues.ts",
      "sha256": "da47803480c0afc0ef20685ffbff014e3ff5323a93df6ca5e8b067b8656b7bd2"
    },
    {
      "file": "src/engine/combatReadability.ts",
      "sha256": "9a96f9b11de741ac8f838753293d328277f55646ff53fd7e6d1777778c7f4622"
    },
    {
      "file": "src/engine/comboConditions.ts",
      "sha256": "18a17b2508d15acf97a924f5510fa17f233e4d8b64a486b9f3f4a5fd23ff220b"
    },
    {
      "file": "src/engine/comboCues.ts",
      "sha256": "bb03dec54740e339baf647903853a5770c3b44d37926d362630bcebf3890c766"
    },
    {
      "file": "src/engine/companionBonds.ts",
      "sha256": "6936226f2c05bd836e1f10b2137289a04e04f6456dc689da2caaaa9b7c736328"
    },
    {
      "file": "src/engine/companionCues.ts",
      "sha256": "3d686e8f0befbd5485ad487c364b338d0d755ba539fde6f645d1d1dc4cf12340"
    },
    {
      "file": "src/engine/companionGrants.ts",
      "sha256": "d435bbf41f96a9271fa3d3b5c18e2ab3d3efcf510ed9890bc09fee3498939e55"
    },
    {
      "file": "src/engine/companionSpec.ts",
      "sha256": "a930ecbaa7ea90259f619ee8790b2f7f18c356c2d5bbea3a3dcd1323ecf9553b"
    },
    {
      "file": "src/engine/companionStances.ts",
      "sha256": "3d1344382aaf9fd8337e90dd1e5ec3f198ebf3e8b0d34aab3c87ac2c4c0d52d6"
    },
    {
      "file": "src/engine/containers.ts",
      "sha256": "b8268a13cebb37ea4b226f7e67bc6c1fc5ea997fd8be6602722b2bc211f8b10c"
    },
    {
      "file": "src/engine/cosmetics.ts",
      "sha256": "1694f6d439af6b33a821b9c549af8b1e53e1319c6472e9af451264205ab4397e"
    },
    {
      "file": "src/engine/costward.ts",
      "sha256": "79e6c1c3c79dac64e7c799971b85f3c09f64e082e3f307ed0414724cbd366d4a"
    },
    {
      "file": "src/engine/crafting.ts",
      "sha256": "8261d5706525ed35b1ec7a6168ba797ae3db969757b578ad31d68fbeac69ae92"
    },
    {
      "file": "src/engine/creep.ts",
      "sha256": "5a22fa4473634318bcd70cf2cab2459f4164c2ac579e32197a8781b8af0ed7ea"
    },
    {
      "file": "src/engine/creeperSpec.ts",
      "sha256": "d61700118b0ff5c8424186ec1f8edd0881e5390c0b500533be0a41b3c5abcf98"
    },
    {
      "file": "src/engine/creepers.ts",
      "sha256": "5ffbf6ec44f4d9536bba2c6960e9f0e355a8dcec815ce0d42e8364cf6ea50633"
    },
    {
      "file": "src/engine/curves.ts",
      "sha256": "2301cc4f51747d4a26037860480604f7f323c2af34d941849ec6e664ddf05dec"
    },
    {
      "file": "src/engine/damage.ts",
      "sha256": "dbfe8a43e1c92842e46ad0ebfb819cd412fa7ef69bf4c114d481fedba4551b4f"
    },
    {
      "file": "src/engine/deathPresentation.ts",
      "sha256": "3c1721da16167988cdf708127ef8826afd97f2686846acfc6aa378c07d5f1bdd"
    },
    {
      "file": "src/engine/deeds.ts",
      "sha256": "98678e0c71cdaf7b5756253bc17ba43621e5b96c3228c66e4c4f2e5b594939ba"
    },
    {
      "file": "src/engine/defense.ts",
      "sha256": "5e15d4d1a6b13ab1b3a7b78cecf3b6b223cef8344f356700fba37fc85cabcdab"
    },
    {
      "file": "src/engine/defenseCues.ts",
      "sha256": "2e9a0452acd96e788bcdf57dcb7dc677380adc7b548283796e59226ba528eb46"
    },
    {
      "file": "src/engine/dialogue.ts",
      "sha256": "80bb310669b004cb8e2bf8e678928b0dedd8ca8c8c632fdaa3e5f37b889fea42"
    },
    {
      "file": "src/engine/dialogueActions.ts",
      "sha256": "b054ea4bc57d22ba7b040867c5890ddef78ad842d08fb78a82157b75c82b93b1"
    },
    {
      "file": "src/engine/dissolve.ts",
      "sha256": "2d35af54916010a006a8cb303abc9ab6d35ae40f6416f74310bbec4613c9323a"
    },
    {
      "file": "src/engine/doodadFamilies.ts",
      "sha256": "07b25462821ff60f70074505096da32a19ecfd173228735179f1484544a0d794"
    },
    {
      "file": "src/engine/doorPress.ts",
      "sha256": "132bfe8565410a562350c52e0b476c0732199e90674f83e4e3039a360e549b77"
    },
    {
      "file": "src/engine/dwellFocus.ts",
      "sha256": "58d84a0700b0f2786afe8cd3ec615e42266fa2a2874fc1ca93fc12c0b76af24a"
    },
    {
      "file": "src/engine/emerge.ts",
      "sha256": "360cd791e1ef6827208b1a3f689b24224d8988b8ff952066bb3dd018384f365f"
    },
    {
      "file": "src/engine/encounter.ts",
      "sha256": "32c5e117c8f6e03c36b277cc9c5109eed392f991936de7908a4b2e1c5b69bb0f"
    },
    {
      "file": "src/engine/encounterCombat.ts",
      "sha256": "d3c47bd18fd4d9e11416bf37589c182e5683466868206cf9260d09bb0b39da51"
    },
    {
      "file": "src/engine/encounterGroups.ts",
      "sha256": "0ccbfc9899e640f2b791a8c08b228fc64efe29cf9dcbdf12d83290539fd16a0d"
    },
    {
      "file": "src/engine/escarpmentGen.ts",
      "sha256": "13ed4ded60a25335d7f252497900b7b3e51bd9f8aec7f7cb624ad9b1ddcf52c0"
    },
    {
      "file": "src/engine/eventWeather.ts",
      "sha256": "88f9e03285ed1091818a202f57ec83103d5dcf2dbceb53d4a5740a177eda1082"
    },
    {
      "file": "src/engine/eventbus.ts",
      "sha256": "63635652a98318b610830dd8e0ce60c7c454a5cb8098120d4685e12c0eb399a5"
    },
    {
      "file": "src/engine/exitSiting.ts",
      "sha256": "63a4d6ae47f6db11ab8922d4037ceee0bbee4e8d27119a7285a3fe7d4dad3268"
    },
    {
      "file": "src/engine/explorationDistricts.ts",
      "sha256": "a8361a27a64b133d4a3f7cac6205d1fbc85d422e091fdc59ffb7e4d32ca072da"
    },
    {
      "file": "src/engine/feedingCues.ts",
      "sha256": "8f3718c592eefe47eff3f671d0ed26b34af0cb53631a890cca43d67f888db812"
    },
    {
      "file": "src/engine/fieldgrants.ts",
      "sha256": "7e3380e4d14fab2ce57aead1971d42d00a1b1fcac79ff11faf0668562f4de2a7"
    },
    {
      "file": "src/engine/flaskState.ts",
      "sha256": "e7ec7eccc01213fb868abb9fb828b31eaeb65ed000510f7e410f6e671b5c8e77"
    },
    {
      "file": "src/engine/flight.ts",
      "sha256": "2684cddf354c878d6b3aa24bd4984b69797444efb5a6f95565ea601fcca78a90"
    },
    {
      "file": "src/engine/flux.ts",
      "sha256": "39b61f295abc85c528588f0d17971eb7e291fdadc28c7c14bf69666fc05b8f0f"
    },
    {
      "file": "src/engine/fog.ts",
      "sha256": "ed82d5978d280c65e1930a67c3c28708415056ef2f991afb7e6c8fa0234aa49f"
    },
    {
      "file": "src/engine/fontPlacement.ts",
      "sha256": "65c2b09088de82601a7cd5354b7a0f2fab27de0cf335e0f4782d997f1ee9ae2a"
    },
    {
      "file": "src/engine/foresight.ts",
      "sha256": "f709bb9452eedbf6870897547101f3961e5c45697eb03c4e624c3346be64c011"
    },
    {
      "file": "src/engine/fourthwall.ts",
      "sha256": "a38171c8a907c630e2de41ee68223aa6c4071463d3395b6b67090a5a9b736e55"
    },
    {
      "file": "src/engine/gauge.ts",
      "sha256": "358e581df8c2a592d085c2eb5414b44c19fca25927c1bf0c01e4a94eb697d48d"
    },
    {
      "file": "src/engine/gauges.ts",
      "sha256": "0965650f89d499bb56fd58f298d27c527d9d17c6755b3ad111be901cd3963339"
    },
    {
      "file": "src/engine/gemitems.ts",
      "sha256": "99c963f3dbae3277022549e090cdacfab7c8802bc2ba8942e410107a9736d5d7"
    },
    {
      "file": "src/engine/genPins.ts",
      "sha256": "45b59d6cd9bdb02efacb332fa6c5cccef211f0feada544139be22c1bf9dbb987"
    },
    {
      "file": "src/engine/genkit.ts",
      "sha256": "20e656f881d4c7623018f90067f8299c5bbeefbaaf5651da5d8efdcd7ec99005"
    },
    {
      "file": "src/engine/geysers.ts",
      "sha256": "74651875639b000794d6235430e290b8008e22667d64d8f66a2480f222498f3c"
    },
    {
      "file": "src/engine/grab.ts",
      "sha256": "e45661cfcfa5044d6acbcd05bac2c3bca7b7febd7d63ef9a4b960106017c84a1"
    },
    {
      "file": "src/engine/gridSpine.ts",
      "sha256": "450db867056c8b201fcc7fe93c2a405b7e57877f8a4e719917b1d8ed5d78928c"
    },
    {
      "file": "src/engine/guardArts.ts",
      "sha256": "423d73d064a9a7da045d7a4ed9e7de5f53ff9e3d78bcaca5352cce599118a75e"
    },
    {
      "file": "src/engine/guardArtsSpec.ts",
      "sha256": "91b2d9d9009ec8f6d5426a630b88e43d654cfe5aade93c3c89036f738644052d"
    },
    {
      "file": "src/engine/guardSurge.ts",
      "sha256": "38430d746916ea072baa92b33b92f73e28eb7b405ae22013ddd9058faf030d4c"
    },
    {
      "file": "src/engine/guardianSpec.ts",
      "sha256": "0822fed626965810e7f74bc0c3a5421c9d3eee345e5e424a437b2ae6decc94db"
    },
    {
      "file": "src/engine/guardians.ts",
      "sha256": "3143fd75c85d6f8a3de56a0de715cd5773f72d06f2d8b1b5344355dcfb822032"
    },
    {
      "file": "src/engine/handling.ts",
      "sha256": "c92b22a808ec08d2b3ea281226beeb79520656a63a7d123dd129934eaca2b4b1"
    },
    {
      "file": "src/engine/harvest.ts",
      "sha256": "963259e607b7f53c6d93960aca075fb34a2db2d7f4a374eb9955ce8e264144ea"
    },
    {
      "file": "src/engine/hash.ts",
      "sha256": "70d7fde28e2803a587f5b798008906fb2fb46aeafa1eaf94de96c94f8f310cd1"
    },
    {
      "file": "src/engine/hivecall.ts",
      "sha256": "1716e5cca6f0780014e064158be8b6bce65f6b43d972b057a61cb259f61b9c74"
    },
    {
      "file": "src/engine/holdObjectives.ts",
      "sha256": "b24d105adead3eba857874d8ad5497366987a42a398ea43b4c9a881f1c257985"
    },
    {
      "file": "src/engine/interiorGen.ts",
      "sha256": "348c1239eb024bd550e54b63918b73e18bde7c008b040b8bd64c6f5003147d60"
    },
    {
      "file": "src/engine/inventory.ts",
      "sha256": "f813317cd2ebee2ef87a53c457e62123799b470ffd0487840273b73c1f25ad57"
    },
    {
      "file": "src/engine/invocation.ts",
      "sha256": "93f99cda428085972cb2fbe8dc15dc573f75d0f2f9cf5cf47cb7d431e2997778"
    },
    {
      "file": "src/engine/itemLimits.ts",
      "sha256": "fe51f75084d25328bcec37d9abb1f08219fc58956ef5e825fdfe891634fbef0a"
    },
    {
      "file": "src/engine/itemchoices.ts",
      "sha256": "58fb0ea9995f4840e805b2d6cc16f2ae2e6f5e2ed39d22844d935a76abdad638"
    },
    {
      "file": "src/engine/itemgen.ts",
      "sha256": "c0de581b67894898817f1cfc1d2175f00a626ce035649c697f9233f777c6c82f"
    },
    {
      "file": "src/engine/items.ts",
      "sha256": "795ebbf951a6ff23ef41e4f4fc4532a3b4f6faea15eaa896d6dff5ef80bb27ec"
    },
    {
      "file": "src/engine/killHandlers.ts",
      "sha256": "77100bfc68057eafb2c6c71a3aac493350769bb012f538c362b8ab474196257b"
    },
    {
      "file": "src/engine/lairs.ts",
      "sha256": "faee1e07666003e85a9f5f67dedef6252c6a0833eaf2d31e2ee01ae362c671f0"
    },
    {
      "file": "src/engine/lake.ts",
      "sha256": "1a9e57d295a5cb85caa2059b4aa02f7e2175c61e9d4f0bc23438aca44f236fbf"
    },
    {
      "file": "src/engine/landmarkBuilders.ts",
      "sha256": "96e8d15341a6275b7b2e19d917e0b535eed5caffc5fb6d10c24ff89797729e19"
    },
    {
      "file": "src/engine/landmarkComplexGen.ts",
      "sha256": "8e6a743d3c34a802e1aa66dd0e594e84a3c2522ac96d1f13e7ddcb17e37d6290"
    },
    {
      "file": "src/engine/layoutRecipes.ts",
      "sha256": "c342bb32afea0ada3c4c1f7724bb63cae140bd467a9e98f7a05ceb1fc54f44d3"
    },
    {
      "file": "src/engine/levelgen.ts",
      "sha256": "b7c5a0ae8b307fe313db9d1e2f25a232be0579f07936d7c3a53a6b12f00f840b"
    },
    {
      "file": "src/engine/lightningVisual.ts",
      "sha256": "03884c0de4e3973153f5f61c93cd1ebb6a8d1e77684028108a363f70ef504cf3"
    },
    {
      "file": "src/engine/lightwells.ts",
      "sha256": "c6140d21c2bc5273b11df1c131695154e13f981affd466e320e698ff96d63aaf"
    },
    {
      "file": "src/engine/lite.ts",
      "sha256": "c96df2ade63439ff478188afa961a9635cf493cd74ce52de0fd724f7700c0c72"
    },
    {
      "file": "src/engine/localeGen.ts",
      "sha256": "6326f2a6e7413c1b51de6888a74dae05f1b574418c6a8030d2d416184ae375fd"
    },
    {
      "file": "src/engine/loot.ts",
      "sha256": "cf2e8ae94536bab373167a630e5382bf7cf5da788a4002dab10edbed5ac5483c"
    },
    {
      "file": "src/engine/los.ts",
      "sha256": "8c6f5d1727bf97537a33ad929609c350fd4cc83fdefc135dd18c6fe423daf9d3"
    },
    {
      "file": "src/engine/magicPackEvents.ts",
      "sha256": "19a387fa86a43ec263db8daf9c9046e6e39d3d776c2a516c3bced9800756bd0c"
    },
    {
      "file": "src/engine/magicPackMechanics.ts",
      "sha256": "35025355dcd2038d03ee082c05d99e69e60ee0ca59bdf2a7728bef61bc5502b9"
    },
    {
      "file": "src/engine/magicPacks.ts",
      "sha256": "3b77365201b18fae3711a4dd49dc8ff75dc2b8e9454f60da17226c6c06091b8b"
    },
    {
      "file": "src/engine/mass.ts",
      "sha256": "a12a0c9e45964b7a1a42d192bd8ee20da49c8070d365bcb5256be9f7b0b75f93"
    },
    {
      "file": "src/engine/massif.ts",
      "sha256": "0a9fe6c7edf14ece7e3f492c1c808960be53e085e29f32e4ed8ff3d3b9582fc2"
    },
    {
      "file": "src/engine/meleeReach.ts",
      "sha256": "e98f30dcb19261dc290e0001cc295f6ce7b09b5df3ac89ed160138d64a011ff0"
    },
    {
      "file": "src/engine/memories.ts",
      "sha256": "7f0f1370aebfc058e0d18ee5de32a6117ba0a369a12e247c85db9a325f9fbcc1"
    },
    {
      "file": "src/engine/menu.ts",
      "sha256": "1ebc5ef54880ae5194e501e654aee33e597c708df2b880346159e15d5f0f810a"
    },
    {
      "file": "src/engine/mercbrain.ts",
      "sha256": "74854c54dc703afe966e4e84a71e7c5dec80b2913daa500317791cea5b04ed43"
    },
    {
      "file": "src/engine/mimic.ts",
      "sha256": "48acf647b2dc7fd0feb731f2059d04345251c3d85cfb474fb98f3b6c1ede0afb"
    },
    {
      "file": "src/engine/minionCombat.ts",
      "sha256": "18fbcd3e02f749079b710237b14709478216317b0d195118bf001a91aa0a5ccc"
    },
    {
      "file": "src/engine/minionInheritance.ts",
      "sha256": "36adef52c50aa49ead2ada3a8ebd028c4fd89456ad83f5e60df273a8dcf40e5a"
    },
    {
      "file": "src/engine/minionTargets.ts",
      "sha256": "8bf96a34d686d19bb3b25aaddc64666781f4301c6a84832dd601ccf0b22f6534"
    },
    {
      "file": "src/engine/mounts.ts",
      "sha256": "f4e45aa00d0a9aec6e06b988f04e5a9e80e801a3f8c8701e218980ca400bebc8"
    },
    {
      "file": "src/engine/movementTether.ts",
      "sha256": "1c545607b6e18598bb2a50c323fdb7397f56e3f982407c809f1512b3511847f9"
    },
    {
      "file": "src/engine/muDeal.ts",
      "sha256": "dce3e93eebab680245748c650c57031a6fac34ba43423f24fe12692691d4ef57"
    },
    {
      "file": "src/engine/muRing.ts",
      "sha256": "ff93d8cc0168fb6f1e91a51180e43bdfe8170a4525af4d20b38725de0627a95a"
    },
    {
      "file": "src/engine/nativeAIActionHost.ts",
      "sha256": "07ee5a679cff49f8020a2e2e81469215e19e34328d48c3007799ac7340265958"
    },
    {
      "file": "src/engine/nativeActorConstruction.ts",
      "sha256": "9c019da7d2930336a0609643a240c31619dc5088e24a815936b2b08125d73a11"
    },
    {
      "file": "src/engine/nativeAmbient.ts",
      "sha256": "ca700485f6ed65c83795788777d3195115ff28a8125c2b00e5e6284c9986c6d0"
    },
    {
      "file": "src/engine/nativeAreaArena.ts",
      "sha256": "3a491fc22f297e05730bc95f97a507ea76b2c6279bc26aa357020faa57e71620"
    },
    {
      "file": "src/engine/nativeAreaBirth.ts",
      "sha256": "a41339e494cd72e9548436863b89eb97b8060865923767ad13356b1ab563d617"
    },
    {
      "file": "src/engine/nativeAreaBoundaries.ts",
      "sha256": "5117b9ec6cde9ac205c1e27324b0ceb383f654053a183ef220f3d0d50fffd7ac"
    },
    {
      "file": "src/engine/nativeAreaLayout.ts",
      "sha256": "b32dae389d6e34beaa2a6a69aad7e69e4f0b22c2c82512a4902a8530411ae68d"
    },
    {
      "file": "src/engine/nativeAssaultHost.ts",
      "sha256": "d5ba88b144301893f3f1cd712c06e133e021d6f9333f14660e6547f8cf7eed31"
    },
    {
      "file": "src/engine/nativeCharacterCreation.ts",
      "sha256": "d1172bda77f7489e54311ecb1dfd1fd1cf6b04acdfef0ffca36b635639e14172"
    },
    {
      "file": "src/engine/nativeCharacterRestoration.ts",
      "sha256": "cb6e42f64d0c8a61a66e078fbfd9b3841943a49ef6ac1826bd8f83a4c54f787b"
    },
    {
      "file": "src/engine/nativeCombatRecordObservation.ts",
      "sha256": "cb65ef1fbb88507e9103408f2a358a7a8d78ee0d03e88b9eb7346140b570789e"
    },
    {
      "file": "src/engine/nativeCrusadeFixtureMemory.ts",
      "sha256": "32db0a63be5bdb080e5312953ef533e62eb34171277b31d6287d1ff1d813bfd9"
    },
    {
      "file": "src/engine/nativeCrusadeIdentity.ts",
      "sha256": "05a222aa4368db6af368a394a281a46cdbb6e7b0a9e9e70ebd3b3af3543f706e"
    },
    {
      "file": "src/engine/nativeEncounterGroup.ts",
      "sha256": "c77bc5396ce24d1176b0a3d3c4ade1a796ac3f9a01cbd7d30ca04c1cf446656c"
    },
    {
      "file": "src/engine/nativeExitPreparation.ts",
      "sha256": "79e104e22cd81d4c9dc27276512120264a51bf5fd21f8b0349ce384d7b18fdeb"
    },
    {
      "file": "src/engine/nativeHostility.ts",
      "sha256": "6703568c543a792a5ef421e40d6b7491f83970735d74bac1ad01affd4898ebc0"
    },
    {
      "file": "src/engine/nativeInhabitants.ts",
      "sha256": "de8998a3ef8bd44939a927108e85d13b45100411b2d58d17d46a87e9d283eacd"
    },
    {
      "file": "src/engine/nativeLayoutGeneration.ts",
      "sha256": "f072e1e477bc7872e29cfd1e7031b599e8a6d15dcf080ca0bbdb010bdf8f521b"
    },
    {
      "file": "src/engine/nativeMonsterFactory.ts",
      "sha256": "c297dd2e1d8a0f099a8e6ecfec29b47b4a24c4251c29a33c76b336c71fc90bc1"
    },
    {
      "file": "src/engine/nativeMonsterPromotion.ts",
      "sha256": "5c4032242ecf93b6ef9ba4151931fff4a32e8058d44cade1028f908696848a4a"
    },
    {
      "file": "src/engine/nativeNavigation.ts",
      "sha256": "6e46954545e5b20a6f7e8c18ac433673b4c65008059968e9f9bb7d56d23f1532"
    },
    {
      "file": "src/engine/nativeNpcDialogueHost.ts",
      "sha256": "daefc25b507687e965a3f08f4466301d02157e892c492a39e467a0c455e1be49"
    },
    {
      "file": "src/engine/nativePlacement.ts",
      "sha256": "1c579621c5aec9705706e0ac42a62822f5a2e454179534157becc813c50cc276"
    },
    {
      "file": "src/engine/nativePopulationResolution.ts",
      "sha256": "f7d575983ab449a2a27fbff9468eb9ddb0980cd3241d03bd0f9a19c5ad456af0"
    },
    {
      "file": "src/engine/nativePopulationRules.ts",
      "sha256": "4530a37dbbebf1f4c34f5dfad68937b29ff5a09081aa6b5501f83bb21e3c35db"
    },
    {
      "file": "src/engine/nativeProgressionMeta.ts",
      "sha256": "fa638ecee47baef81a9e9875ccda54f35a14f8386e374113728895e02a9d50de"
    },
    {
      "file": "src/engine/nativeQuestOdyssey.ts",
      "sha256": "16bd44d4c17aa52f54bd3616d33470ef6ed45cf651c1c4c3333dc8af86dcf278"
    },
    {
      "file": "src/engine/nativeSceneAIHost.ts",
      "sha256": "d23351a861719cb514654f1b237f6cd0760cb02031d53a586e02e893a9d1cbbc"
    },
    {
      "file": "src/engine/nativeSceneAIPreparation.ts",
      "sha256": "3c89456c5866bf859f77f4ce1dce630d6519ab93e743e90633f9b805fc735f3f"
    },
    {
      "file": "src/engine/nativeSceneActorTick.ts",
      "sha256": "e8b9fdd71e0d040edf465ab9340c69274ac1f4d3c4203c161cd62afdab2d216a"
    },
    {
      "file": "src/engine/nativeSceneArrival.ts",
      "sha256": "d430595fb45b858cdce4c05062157a90ae8256bec4d67eafadac17a1812a7ebc"
    },
    {
      "file": "src/engine/nativeSceneBootstrap.ts",
      "sha256": "9183198902a6f8e8b1ce15e6e228ac28fe6e6d8e567e39d3cf3de86fb1581c3a"
    },
    {
      "file": "src/engine/nativeSceneBounty.ts",
      "sha256": "ee99c8c06e69d5eb80c9002a77fa7c10ddffd6aeb90544ade5a1d33dd472391b"
    },
    {
      "file": "src/engine/nativeSceneCampaignDeath.ts",
      "sha256": "7b01d07f3f00273dee823b349672b4ebf8c778d4176edc38ccaf2aafb427c259"
    },
    {
      "file": "src/engine/nativeSceneCampaignEvents.ts",
      "sha256": "039f9745e92f8161cec2fc4139c8b21cebd9e2cc73d5964dc64bfd28610bd070"
    },
    {
      "file": "src/engine/nativeSceneCampaignFrame.ts",
      "sha256": "8f47d200ca679112277888aff60c5865d09ed6d079ca70df5db08b3eab8444ee"
    },
    {
      "file": "src/engine/nativeSceneCampaignFrameClosureHost.ts",
      "sha256": "59ed9b02abf256f6c8739a2aed7c202d0953367a3013fadae4bdad3ef7ed39a5"
    },
    {
      "file": "src/engine/nativeSceneCampaignFrameSteps.ts",
      "sha256": "bed70707ccde4ec3a60ada153c4f9302a96ac650d38e2d46606e84a3b941e653"
    },
    {
      "file": "src/engine/nativeSceneCampaignLifecycle.ts",
      "sha256": "46d62e1f75b6d932bd09b698fdcd051a4887666d317845d4480c6ec9a4dfb0cb"
    },
    {
      "file": "src/engine/nativeSceneCampaignQueries.ts",
      "sha256": "251615bdc583601da69a55d4218f6d09c2c5c38e946ecde4bc5b4e2de12a1095"
    },
    {
      "file": "src/engine/nativeSceneCampaignTransitions.ts",
      "sha256": "db9cd0c5fc9ed16140e1ef41b3e5e4d32b5d71b6d427428c7c9841db071dac10"
    },
    {
      "file": "src/engine/nativeSceneCastingPreparation.ts",
      "sha256": "5e6bbca1410a421214cda443e6417b07f42f72d17307a8a45690197e2d2137d3"
    },
    {
      "file": "src/engine/nativeSceneCoast.ts",
      "sha256": "a6ec0c73bdfebeff070f7e3352ab885201ba7b99522701d54c614d9b8441d6d1"
    },
    {
      "file": "src/engine/nativeSceneCombatArena.ts",
      "sha256": "a612067449422a303910d6be6ff05447b2f356643638bc7c761bd6f6ecd5c688"
    },
    {
      "file": "src/engine/nativeSceneCombatCampaign.ts",
      "sha256": "a9d136abb61193d843b6e9541edba5b0b645378414332c1629bea7be59763ff9"
    },
    {
      "file": "src/engine/nativeSceneCombatCasting.ts",
      "sha256": "fd3f3ca62e65533e131216609798c15500fec49090fb4fec793611936e095830"
    },
    {
      "file": "src/engine/nativeSceneCombatContext.ts",
      "sha256": "5eff53eb6ec1ffc31b5bb244649853ffc6fcc25d50429dab6672fa9257c6c441"
    },
    {
      "file": "src/engine/nativeSceneCombatControl.ts",
      "sha256": "3efc2fcaa848070f5f2e7f545e9381dc9c691c954c0a44b1326e7301f424286a"
    },
    {
      "file": "src/engine/nativeSceneCombatEvents.ts",
      "sha256": "b58f70ec6731fffd5a3aecb653acd0974140cb3db087a2b713c012e4225e0224"
    },
    {
      "file": "src/engine/nativeSceneCombatHost.ts",
      "sha256": "3591322328583fa1c8d7060420145df361bb6f29448c7959b2a7657eeca4f2e9"
    },
    {
      "file": "src/engine/nativeSceneCombatMotion.ts",
      "sha256": "8f4c7a9920e72f65f028c9723e85c1c077e7742548f14cfd4e5367c80798f1ec"
    },
    {
      "file": "src/engine/nativeSceneCombatResolution.ts",
      "sha256": "2d50726ff39a3379f19b7e16f333c60bbda54e14c46cb9baee15a18ef269f06f"
    },
    {
      "file": "src/engine/nativeSceneCombatSpawning.ts",
      "sha256": "6dd2a7120bf21c66070a15ec7baf83c72050e627edaa210105bca8f0efc3b7ff"
    },
    {
      "file": "src/engine/nativeSceneCombatState.ts",
      "sha256": "2e5b873d67cf5b8813e616c4af0e325dfbd863bee6b6e327c753dbe79395dc58"
    },
    {
      "file": "src/engine/nativeSceneConfig.ts",
      "sha256": "77eb7f2f6e0089bf6fafba84c819d9ea9c4645305758cd62efd889c1f70ab314"
    },
    {
      "file": "src/engine/nativeSceneDefensePreparation.ts",
      "sha256": "b0f494f8e25d9163c3a3c26c4ec5e574b7eba61a4f70176e2b31e10b4c3f7539"
    },
    {
      "file": "src/engine/nativeSceneDepartureMemory.ts",
      "sha256": "cc14341f178bfcf79d06dd5d6d5e02d660ccab85f12aa04792e65824b5f9957e"
    },
    {
      "file": "src/engine/nativeSceneDescent.ts",
      "sha256": "e545f66aec2c0f8969bc22cd8b56791d5a0e0908b2ff0190ace5f0fcdd0da580"
    },
    {
      "file": "src/engine/nativeSceneDirectorHost.ts",
      "sha256": "444bf0805c68d6632a9a3ab798616b10708591303440249a644d85bce469d286"
    },
    {
      "file": "src/engine/nativeSceneDirectory.ts",
      "sha256": "ea91c28295f697ad01449a3bce69c4d63f055743382d4033ade643d206c1db4a"
    },
    {
      "file": "src/engine/nativeSceneDisplacement.ts",
      "sha256": "e8ce1f088b4d1c3c858cf952a386dca65a22732cd15c6bf09c66cd83c5b1f067"
    },
    {
      "file": "src/engine/nativeSceneDwell.ts",
      "sha256": "33e8fd68ebe847ca643f1fa83f1b97902ffbefde3645004c3967062c8d7812b0"
    },
    {
      "file": "src/engine/nativeSceneEcology.ts",
      "sha256": "438797d4e5947799628330fe844b6c20c85df8669952afd4fdb37436132e19bf"
    },
    {
      "file": "src/engine/nativeSceneEffectsTick.ts",
      "sha256": "ae3198896899a8d03740e9c7be809f12ef228a024bc6d66d9f083d02c84f67f6"
    },
    {
      "file": "src/engine/nativeSceneEncounterBirth.ts",
      "sha256": "67eaa96719e3a79b7036db5eca9475a9c790b949bd61210fbc0211ad77861e37"
    },
    {
      "file": "src/engine/nativeSceneEnvironment.ts",
      "sha256": "4c0ae7643bcba643af9f21245267f32ab9ee3aba7d695157a75eef9f2fc8a760"
    },
    {
      "file": "src/engine/nativeSceneFrame.ts",
      "sha256": "885b8e4199a46b1208889101b3b7d23bd73346a16d040cdcef03bb42a458cfb6"
    },
    {
      "file": "src/engine/nativeSceneFrameAreaEvents.ts",
      "sha256": "8e61391a6c801ce37ede690ad9d375ab772dc4c71eb548116f0108c6f24ea3eb"
    },
    {
      "file": "src/engine/nativeSceneFrameCallbacks.ts",
      "sha256": "66971baea8616471b98ababa55164b18ff095e049a5535e61d95a00796e1e7de"
    },
    {
      "file": "src/engine/nativeSceneFrameHost.ts",
      "sha256": "e80e57b96054085788066114deb4f51a1b6aa743df6318a98538d99ebecbfb02"
    },
    {
      "file": "src/engine/nativeSceneFrameServices.ts",
      "sha256": "286666fad21e8aea69538b8a7b0a2c0d2e8384250b969aa6c10357f18038082c"
    },
    {
      "file": "src/engine/nativeSceneFrameTravel.ts",
      "sha256": "429a88f73f871f5f54cc294a82a9264a3d2a27158006e8a1fd7b3b4c17d0960d"
    },
    {
      "file": "src/engine/nativeSceneGeometry.ts",
      "sha256": "e376effec05cc53f7a1b2aa2fa20f24239a7e37b47d47504516d0d73d27ea5cd"
    },
    {
      "file": "src/engine/nativeSceneGraph.ts",
      "sha256": "2e151a3f2ff95b755d7c4fac15999948f6ba626433115bac2e5a382f834e4847"
    },
    {
      "file": "src/engine/nativeSceneGroundFollowUps.ts",
      "sha256": "c568fd4f3ce7674868200d4b63a4c7ea330664cc6c92d0348b9aa4b0e73578f7"
    },
    {
      "file": "src/engine/nativeSceneHarbor.ts",
      "sha256": "9ec52f62351f1dc3cc3ac77c43c02acd89959a9552db1f4a07ffa91bcca8b459"
    },
    {
      "file": "src/engine/nativeSceneHistory.ts",
      "sha256": "b195be850796deca451d5acdfb34d1e87ea6a95afe3290382e69eb9f07b7f66a"
    },
    {
      "file": "src/engine/nativeSceneInput.ts",
      "sha256": "fee472e85f4018061fc16ed2804d99bedc87bea341931f363424ec7df7dda1fe"
    },
    {
      "file": "src/engine/nativeSceneKillAftermath.ts",
      "sha256": "60605459504f4e84a6282147b6d4ed239736c734f1241fee17d119e7889800e3"
    },
    {
      "file": "src/engine/nativeSceneLocalControllers.ts",
      "sha256": "ad850b74d7bb75ad8e0f1c2ce3fe5078d8c65e90350054b9f5d6b5d76386ff16"
    },
    {
      "file": "src/engine/nativeSceneLoot.ts",
      "sha256": "c830da86f515840c4758ad0c85156b675f94381170c65495f80c2f9d8712ff0a"
    },
    {
      "file": "src/engine/nativeSceneMemory.ts",
      "sha256": "51114ff33c334bc44f79bd096753181feac7ca5f4f30b903dbd487d31bf283d4"
    },
    {
      "file": "src/engine/nativeSceneMenuHost.ts",
      "sha256": "3539b75d8524c9889ad999bbe08c5edb3eb3519a22d79ab099f612aed37d8f6b"
    },
    {
      "file": "src/engine/nativeSceneMenuQueries.ts",
      "sha256": "7b448ab271e3ed0e6c0a50da05bddc3c1d8c9b71119c43d7d237ab2e8409d3d9"
    },
    {
      "file": "src/engine/nativeSceneNearScale.ts",
      "sha256": "1833c31e4cf553492aa26fec849e166c7b19955d9d9dd6cd182f4dec16a09095"
    },
    {
      "file": "src/engine/nativeSceneObjectiveCompletion.ts",
      "sha256": "be81f8adf6f13e4a4c9307573f02c554517e1538cf120c9b03866be80c8c76db"
    },
    {
      "file": "src/engine/nativeSceneObjectiveWatching.ts",
      "sha256": "fd3dd3eb012531bff794f1a93837db7e4cc7e9efe1821d57101f8bd17ded78c0"
    },
    {
      "file": "src/engine/nativeSceneOccurrences.ts",
      "sha256": "321f332fcfd526b648e2f705fb00b5f7cb17d2e59856eaf27468133b8682db55"
    },
    {
      "file": "src/engine/nativeSceneOpenings.ts",
      "sha256": "2fde761bd077def80fb87109d5e535c6cdbac648c0a832260eac10cfa94815ae"
    },
    {
      "file": "src/engine/nativeScenePopulation.ts",
      "sha256": "f0e8e1856cdbba4ade931dbe2f25d538fec002d13afbf890ac5f143a49e6d4c1"
    },
    {
      "file": "src/engine/nativeSceneProgression.ts",
      "sha256": "c98aaa9bb1f0f3523f2f867abd70312afbbc7a7456eab62c8a365f8a9592fb95"
    },
    {
      "file": "src/engine/nativeSceneProjectiles.ts",
      "sha256": "010d4baa38c46803df7ae0d169da2d5bf4c652e4d759547788482b536db64a31"
    },
    {
      "file": "src/engine/nativeScenePuzzles.ts",
      "sha256": "1231d2939bf1955d19149ab69b09a748de5e8a99ab20dd8833b43c18822f09e6"
    },
    {
      "file": "src/engine/nativeSceneQuestInteraction.ts",
      "sha256": "c911353d1bf949f6367d98cf12724c2d466fd7d7e95c669b0ca362ed9d3a120e"
    },
    {
      "file": "src/engine/nativeSceneQuests.ts",
      "sha256": "3bd54761c3b14b3f20d5b1ab44e514e0951ab6bd7a401a480f20bb66d80ba7c1"
    },
    {
      "file": "src/engine/nativeSceneRealmArrival.ts",
      "sha256": "c6decab1c1a92ae3057d7f264a7e142b07a31c1f9be7ad42e78d77d6dd3df65b"
    },
    {
      "file": "src/engine/nativeSceneRegistration.ts",
      "sha256": "695383b5d9b20c2f5fd28c360c8c42becbe39afc1e016584b941d07be5e76990"
    },
    {
      "file": "src/engine/nativeSceneRestoration.ts",
      "sha256": "9ae4008adde9c08d86688665aae21e9690e67c2db728eaf5010a6f623141b609"
    },
    {
      "file": "src/engine/nativeSceneRetainedRealmGates.ts",
      "sha256": "53e76107c230827095ca85b24e229747e2d5aed874ea09efb3b37bfaa46f83d2"
    },
    {
      "file": "src/engine/nativeSceneRoadContext.ts",
      "sha256": "9e9a6d9f30bc5de9ed53bd8159e56fa0a78906a6cd080774c12295cc1f52db79"
    },
    {
      "file": "src/engine/nativeSceneRoadScan.ts",
      "sha256": "31871ba94bac5f00cb897d4ba3e39272b0b20aa649c6e740224e52784782b8cd"
    },
    {
      "file": "src/engine/nativeSceneRunConclusion.ts",
      "sha256": "da6de61752f2c5116567b750ac15badbee810b8f616a258c36ad607949becaaf"
    },
    {
      "file": "src/engine/nativeSceneRuntimeBirth.ts",
      "sha256": "677a995baadd1292760ef4be3b777bdde64c1dd51735fc3c81227da8044802ac"
    },
    {
      "file": "src/engine/nativeSceneRuntimeRegistry.ts",
      "sha256": "e88312be2b33e820a1d69c21a6d91bed98454d3f881479170dcfb25a8491980a"
    },
    {
      "file": "src/engine/nativeSceneSeatHiring.ts",
      "sha256": "4a302f3ec489785ff3187da4765e58a9a3ded52ad2b569f1b5285c722ba729ba"
    },
    {
      "file": "src/engine/nativeSceneServerVessel.ts",
      "sha256": "e4543c78da50b7dbca142aacec659ebaa2bfa6f5bbdcc03b1d9b12e502c025d0"
    },
    {
      "file": "src/engine/nativeSceneSites.ts",
      "sha256": "77a2a4ae7f36684a636a093698b6fb2676bcb51cac89f9916836834705a7944b"
    },
    {
      "file": "src/engine/nativeSceneSkillArrival.ts",
      "sha256": "13ac96aa67a97e3f79dcdeee47e9b24e0a666ca679f3da237ecf634f565cd0a9"
    },
    {
      "file": "src/engine/nativeSceneSky.ts",
      "sha256": "57e294f28269a18171c81ef3d757323d8c066760a01a2ed46411a10edb170be0"
    },
    {
      "file": "src/engine/nativeSceneSources.ts",
      "sha256": "31b9d3402962ae67397ac4b78179c0ab15850ecf3a77e89fe12eb6aa12ae9d2b"
    },
    {
      "file": "src/engine/nativeSceneSummonPreparation.ts",
      "sha256": "13305c7aacc0abf4fbc96ddc7b4efb79afd941d7af7213d2428abc8dc5b3ce10"
    },
    {
      "file": "src/engine/nativeSceneTerrain.ts",
      "sha256": "fb74d7de7e568a6a58348e747f69a3e75b25b3c1433948d6cabcfd1d6bcbb208"
    },
    {
      "file": "src/engine/nativeSceneTethers.ts",
      "sha256": "d24b0207aec57ccce4726350b5f176ba1ee4172d410a53e4ce0285b6f8feb947"
    },
    {
      "file": "src/engine/nativeSceneTheater.ts",
      "sha256": "0b05a888d9e67ebc79289898eee8d747052e66133890c7051f0eb72db5294c54"
    },
    {
      "file": "src/engine/nativeSceneUIActionHost.ts",
      "sha256": "e59f86c5c49d27d4b94dbdcf549c408c31bc0059df8dd5c2f0ab275cc166337a"
    },
    {
      "file": "src/engine/nativeSceneUIActions.ts",
      "sha256": "deab3b24789ab72a56cd5ab6e3950af872e65e6e15e87e189652afd437c8e765"
    },
    {
      "file": "src/engine/nativeSceneViewHost.ts",
      "sha256": "2c147c364f5bf4695a596f3cb5837bce8b626a875fb877ff0b1edec3ac2233a9"
    },
    {
      "file": "src/engine/nativeSceneViewQueries.ts",
      "sha256": "ba249ba5bd51f35047c6cbcfaa8338a9e9d0574a00fc9708d8f688238669082b"
    },
    {
      "file": "src/engine/nativeSceneVoyageArrival.ts",
      "sha256": "afcde989dbe4b3f203af4037025bfd2dff25b31bb9dd34a32c438d3725c01954"
    },
    {
      "file": "src/engine/nativeSceneWarlordBirth.ts",
      "sha256": "c3454a8dd7b2873d0831e2aeeb2049f35b368848576d299a74e9e6a70f26c462"
    },
    {
      "file": "src/engine/nativeSceneWireQueries.ts",
      "sha256": "7cc79f6935c2b8742ef2a51a9db234096a19aee67902b19de55eb9decae8364b"
    },
    {
      "file": "src/engine/nativeSettlementServices.ts",
      "sha256": "1b4ee2d4dc30f0218c464f6b3651bcf7ca1ea5d649b8d12bdfc653cae509aafe"
    },
    {
      "file": "src/engine/nativeSight.ts",
      "sha256": "7a1b7d5d233a5486bc332b63bb1174d8482e992d65eaaf613bf8824af596d729"
    },
    {
      "file": "src/engine/nativeSkillRuleHost.ts",
      "sha256": "c17d88997346663fe3f3fa18f96330118f13ea7810826b33cc7e1ddd99616945"
    },
    {
      "file": "src/engine/nativeStatusProvenance.ts",
      "sha256": "8177f34378484d5851d575e0b9ca5a42976618a424a651fb2707cd9cdab0f12d"
    },
    {
      "file": "src/engine/nativeStatusRelay.ts",
      "sha256": "fc3fc8241ab04334285751f1ad59941424bab41ea8b970216047683ccea7342c"
    },
    {
      "file": "src/engine/nativeTheaterHost.ts",
      "sha256": "5d8ea39a507864421d1b8c370ffaa318e14061e480ca3c87a446103d61300bc3"
    },
    {
      "file": "src/engine/nativeTownBody.ts",
      "sha256": "c9b0635571eedbaef7802bde90929f8323f303a4b64e340d33125057b38611bb"
    },
    {
      "file": "src/engine/nativeTownStations.ts",
      "sha256": "eb6dfbb581b3d120ee23200bf9b4d577ad7681f75d7a1c149e5193d68a4e7dbd"
    },
    {
      "file": "src/engine/nativeWarlordIdentity.ts",
      "sha256": "d07ae988f7f395c3bdec323f8eda93f4d39b41503bf717acc86c0df1f54aa35c"
    },
    {
      "file": "src/engine/nativeZoneMint.ts",
      "sha256": "c49fffc1f8df028a6783d301eb8803064fee55bff2fb26305ad1fcac7b931144"
    },
    {
      "file": "src/engine/npcDialogues.ts",
      "sha256": "5d42bfc49901e598c1d15d9bc8c9b64322f19f513bef5c2fae7019af0437c4ed"
    },
    {
      "file": "src/engine/occurrences.ts",
      "sha256": "d31d8f814fedfecfe82da607084e34d69123d3a8b5f965af68ae929c7e455084"
    },
    {
      "file": "src/engine/odyssey.ts",
      "sha256": "e9276da457da973988110add0bc9b6ef48cad5744dca59c26e9a36d113ac1b8f"
    },
    {
      "file": "src/engine/odysseyRisings.ts",
      "sha256": "ee208499b172abf009ebc34b10cb009183ac21600cbf40fe76023f5ee963e36b"
    },
    {
      "file": "src/engine/orbGeneration.ts",
      "sha256": "bc2a5008a7d11bd9278bb19f337ede98d238ce065fade3e44862d4345136f025"
    },
    {
      "file": "src/engine/pack.ts",
      "sha256": "c394f16106d714d5937afcc9809ef25634c2450fabd9ef1586d6df2b248d691a"
    },
    {
      "file": "src/engine/parry.ts",
      "sha256": "68b63d1e7299a3c3e3f5601fc3e2244be27d298276daf243366f72608bd0bab0"
    },
    {
      "file": "src/engine/party.ts",
      "sha256": "426b4d6a74460cca1ad314fa8600b5767702275a3b3b9a46a6507f8ec947573d"
    },
    {
      "file": "src/engine/passiveRefund.ts",
      "sha256": "d04037d2cb9e294400600c4b761f27a923c359c37a9d6f51ce96369cac2435e8"
    },
    {
      "file": "src/engine/payloadCues.ts",
      "sha256": "b2cf817cf5d0f3d2d4e1c5925faf19629533ac8946e8205c5dfe01eaae8ef6ce"
    },
    {
      "file": "src/engine/perception.ts",
      "sha256": "677babf9224a46accd2be6c9a6e404a3eda7df1dbe6a92145b441c2b8c8d1692"
    },
    {
      "file": "src/engine/pilgrimage.ts",
      "sha256": "b43527ae9fcb9adf4e72a73f7382aebd114c87302b75b10b7988d0c6ad2f8cb1"
    },
    {
      "file": "src/engine/pings.ts",
      "sha256": "62a060064c65f47abfd6e77c968604a03ccc1d810cfac528d23f3feda9d1d21e"
    },
    {
      "file": "src/engine/pitfall.ts",
      "sha256": "74aa7490a3347c123267bdc0db08baaae313537879069e3fe81067f9a9549b07"
    },
    {
      "file": "src/engine/playerCastVisual.ts",
      "sha256": "e5bd8f331b1d7aa7674986633f9333fc1560ebb221c51ece6930503c214d5d37"
    },
    {
      "file": "src/engine/plies.ts",
      "sha256": "b66893ee3eb96bd3368a4707258937b88201596ae8d6b4a95298beff95ba6ceb"
    },
    {
      "file": "src/engine/possess.ts",
      "sha256": "0309c2214312f20f385878c04764d365a36e665786c50c174457deb22ed1fd34"
    },
    {
      "file": "src/engine/presence.ts",
      "sha256": "2812a44bfedb22180cb556fe4dcbc1ee9309fa5b29744fa9df80387b8629d399"
    },
    {
      "file": "src/engine/procCues.ts",
      "sha256": "aded5a12f9c025788a249e504c289b468c1e7c7ec7329f285fdbc454da453e74"
    },
    {
      "file": "src/engine/procReference.ts",
      "sha256": "dfc6e49e2f8f62d00c6f155796fb04da4d0a6ec06cb9158e6bed92c84af59958"
    },
    {
      "file": "src/engine/processionObjectives.ts",
      "sha256": "40d6f5211cd99c5a60605b0efbd20aebb72c696609fe4fc582664149575dbbfb"
    },
    {
      "file": "src/engine/projForms.ts",
      "sha256": "d8cd59552e6fc0883f7055f1dbf9575912bf331dcf87e10525197b1ce36842d1"
    },
    {
      "file": "src/engine/puzzles.ts",
      "sha256": "fef055c7ba5b0a98b6da32d190554833edb343f0e73ae60239038e786e407b81"
    },
    {
      "file": "src/engine/questImbue.ts",
      "sha256": "2a9636c4137a94cf71ecc5b8f4694a391f3b7b8688b1d0b40403cefa3e61ef77"
    },
    {
      "file": "src/engine/questLedger.ts",
      "sha256": "73810003a9d492958cbc73085ed78fe4738085b4394dc26a4e184cf5468b8ce4"
    },
    {
      "file": "src/engine/questRescues.ts",
      "sha256": "9997eb09e1f6cccc85512d385def7a170788a139060b5e4f9e9ac93bd45acba7"
    },
    {
      "file": "src/engine/questRewardChoices.ts",
      "sha256": "83e336a15b0a97ac2d847e9561c0a388901442efe130d935b75e3eca181cae9c"
    },
    {
      "file": "src/engine/rampage.ts",
      "sha256": "8d5b5947097da5aec83d588720fda994d49f1bc8fcaac7177d62d9e2a62af73a"
    },
    {
      "file": "src/engine/rarity.ts",
      "sha256": "6f2531176c44e251d6c8e1acdf2cc5f42b8b126822b191056bdadba5187c9c3c"
    },
    {
      "file": "src/engine/recency.ts",
      "sha256": "1e9dd98cd8d355d76fcc24437c47f1b3b343ccefde5f508fc248aa2e22170893"
    },
    {
      "file": "src/engine/reception.ts",
      "sha256": "eff3a5d710f8aef6674eca4a27b1bf6081a9503b8095e82084b1e4a796782ca5"
    },
    {
      "file": "src/engine/refugeDeparture.ts",
      "sha256": "1c22db6a713abf249bd0e5e49db2000a8873c92f01387572141f708ea0b7155f"
    },
    {
      "file": "src/engine/relicPower.ts",
      "sha256": "ab9219babc9b29f8f3c1d9d53ab612454e1dd250ebcd56a221dcacbc008d3b35"
    },
    {
      "file": "src/engine/replenishment.ts",
      "sha256": "00049f4f83a9a75bf8e49cf4a696ed52a033181c15cf8004c2923566d1ef2ede"
    },
    {
      "file": "src/engine/reserveCues.ts",
      "sha256": "91de5d290083c63ab16bd203d6e1a40355aed09d9b394b860465de740715cb0e"
    },
    {
      "file": "src/engine/reserves.ts",
      "sha256": "98d3451986f84f849c9d215c4e99f0817b6a1fc671ee7bc75e48fcb61748316c"
    },
    {
      "file": "src/engine/rockForms.ts",
      "sha256": "5a2980a3ab7902ee20c5cfb56978d398f70fb4f0eb5d49e8caa264e86099209a"
    },
    {
      "file": "src/engine/rooted.ts",
      "sha256": "52d4ba2099131dd8dddaeca88c69441e9ddb5c85a945025ea14a12708225c379"
    },
    {
      "file": "src/engine/satelliteFlights.ts",
      "sha256": "2e4b8d8e96739bc04f18c447462179f985865d1e3391752b12638ac1918dc989"
    },
    {
      "file": "src/engine/satelliteSpec.ts",
      "sha256": "97348651424b2ba48f5fdef82fd933dbb2b80de4d9568407df0e6fe024b8af65"
    },
    {
      "file": "src/engine/satellites.ts",
      "sha256": "6e503ac3f6bd3a4a753d10306498a24ca6fb807898febbe320fbf6f506838d4c"
    },
    {
      "file": "src/engine/sceneRoad.ts",
      "sha256": "045a0fc4b1ca30800327a81943e3e394a331f170915aa7a63b1f72e24e714755"
    },
    {
      "file": "src/engine/scenes.ts",
      "sha256": "473db48b05c2a26e2fe1ee3a1e2f4cd6299de57407a1d8374601a8c37c1897a9"
    },
    {
      "file": "src/engine/seatlaw.ts",
      "sha256": "e07526d88ebdf5f151f10f1baf5cb18b0d10ab55c28ab15ba410233b49bd5895"
    },
    {
      "file": "src/engine/segments.ts",
      "sha256": "38e3cde47b808ea8ec07741a6b53d375734866dd5c8c747b172b9536a93fa8b0"
    },
    {
      "file": "src/engine/sequence.ts",
      "sha256": "033ba59cff18822678e6e4dabeb612474d08939a974513fd06d933e6f5714027"
    },
    {
      "file": "src/engine/settled.ts",
      "sha256": "fed190251efaa471ccbd8b102acce1d7a4649046f8357fc5db0c79f26da41aa8"
    },
    {
      "file": "src/engine/shapes.ts",
      "sha256": "a7cdd37cd221970959d5c42d5464df67faebc78e2f0f6591e6b33f04d60e87db"
    },
    {
      "file": "src/engine/shardMuster.ts",
      "sha256": "98c06e445d50f523b5f5b670f67b764062870afe5aba87a4a3480c34c3d99255"
    },
    {
      "file": "src/engine/shardRoads.ts",
      "sha256": "3beab6820e34f01d65adcdbe681032d1234f5f47f691dffbdd5b093c7366b1fc"
    },
    {
      "file": "src/engine/shardUnits.ts",
      "sha256": "ec14c0c7f0e32ac892bb9a1f37e0e0644e7012f4b34b151e78393a90abf700ff"
    },
    {
      "file": "src/engine/sightCover.ts",
      "sha256": "dc3ffd1f7cb5fba9f3b54bf019882185fbafecbff6a03dab12b45ddc2c681ccd"
    },
    {
      "file": "src/engine/skillEmpowerment.ts",
      "sha256": "c659d7289a834482b38358fc4e55b7158ec786fe4847544c27e2e08f58e13f23"
    },
    {
      "file": "src/engine/skillFieldVisual.ts",
      "sha256": "b2848d46a8daae13ebcf983e052d80ea2cbfb4c6984042ef17f6aac4c485ba37"
    },
    {
      "file": "src/engine/skillInputOrder.ts",
      "sha256": "c7dd5f5aa663d8c0e41aeefedda1a1d5d0ee6e8dc7ab99e132af1b0ca7e650b9"
    },
    {
      "file": "src/engine/skillMerge.ts",
      "sha256": "4e7670b341b650bb1ad32cc5d672dc56a3b7cd1238f644704c9e48af018da883"
    },
    {
      "file": "src/engine/skillMovementVisual.ts",
      "sha256": "219bdc080de5683db2a63470a60bfbb75307ca99e86bb19fda13fda24a568b9e"
    },
    {
      "file": "src/engine/skillPreview.ts",
      "sha256": "fd9049f70b7c9d44fbfc5998076df28157e606eed9ef918ae8b40dee55378455"
    },
    {
      "file": "src/engine/skillScopes.ts",
      "sha256": "fcc7ee24eef09d43f92a28767367b80f7409a93613694df508ac55bdda6df23e"
    },
    {
      "file": "src/engine/skillSelfVisual.ts",
      "sha256": "f7e22dd35a5dc7961bb896449b1f2172ce838417edb9533f0f7c35dc872640dd"
    },
    {
      "file": "src/engine/skillTetherVisual.ts",
      "sha256": "0e3e649fbda620b32f71003c79a84702220c92323e3a955b90e8a808fd284e31"
    },
    {
      "file": "src/engine/skills.ts",
      "sha256": "7e6263653e504197b439f8d4681396f28fcfaaff00b1dc74e21b50791253dc12"
    },
    {
      "file": "src/engine/skilltree.ts",
      "sha256": "f69483ee3694b0f3b3590fb0d76ed3344ce48e292864819bb60cf459c71f131b"
    },
    {
      "file": "src/engine/snowCover.ts",
      "sha256": "26d317666f98eac66e96491671b1755b313365c87efb70b1862ae08e22a08267"
    },
    {
      "file": "src/engine/spans.ts",
      "sha256": "d7ea489888aa1d89ec36494fc534cbc9e154ffb7db65611b741a4e902bc7c00d"
    },
    {
      "file": "src/engine/spatial.ts",
      "sha256": "849ac10dead8790fa2241bba39655e59e7a031b0e1b20492b13c41cfb12bf724"
    },
    {
      "file": "src/engine/speech.ts",
      "sha256": "2571875bcdadd8cce609d99b2c7b74a44e2a57c9b1a1214a3ba24d2d1747584f"
    },
    {
      "file": "src/engine/speechGrammar.ts",
      "sha256": "16bd538b3f06888cecdd0961420460eac90b2c7a3e9511c0f5ff96b8a48ddc95"
    },
    {
      "file": "src/engine/squish.ts",
      "sha256": "86a70ae81cd1f1cc4e3c3ae9510864ee665114d2d91af9960bf90612dd240813"
    },
    {
      "file": "src/engine/stash.ts",
      "sha256": "1f421a4b8a71fc378325175b154164ba42f4be7f3bec5877e0fcf3d8859d3e2d"
    },
    {
      "file": "src/engine/stats.ts",
      "sha256": "1967810c34bb5a8bc7a03023fb0d24c1321d749a5050fc4040e83846fa9df52c"
    },
    {
      "file": "src/engine/status.ts",
      "sha256": "f4b6a7e42f7cf5bcc2023c502cd6757cab4ffe085a6e2392978090006c6eba38"
    },
    {
      "file": "src/engine/statusVoice.ts",
      "sha256": "b4049873a4c90d96c4a6d079852a84c220ff9d1949f1bf54b2acfa322a665bd9"
    },
    {
      "file": "src/engine/structureGen.ts",
      "sha256": "62f037c144012d1000763508ab47e1d1dfcc49e9b7318be6b69b12d9eb373165"
    },
    {
      "file": "src/engine/structurePlans.ts",
      "sha256": "b3705ebdc9d316d1f2a83fe7f099e8b5a5d20ae65a69cb7d62effe31188f740a"
    },
    {
      "file": "src/engine/summonContracts.ts",
      "sha256": "7fb42ae8c4e2bff47a927bb2c4678024aabe86843758551277b3e9fc33d321e5"
    },
    {
      "file": "src/engine/supportbase.ts",
      "sha256": "e012cd0a303702a6b952a04146ad942d432e075432769ec5d732657019ae6f5a"
    },
    {
      "file": "src/engine/swapReadiness.ts",
      "sha256": "f97a9309f508d094fe12cad8915343edffe99139b3bb5f13cd0e27b964e0c9f8"
    },
    {
      "file": "src/engine/sympathy.ts",
      "sha256": "f66dad992eba1bb738d650d37f6b36df4a4b1714af026709e2fd34026b092f1f"
    },
    {
      "file": "src/engine/tap.ts",
      "sha256": "71cd4dc70d9d262f68d8ed83d7c69b96e8a1e228153a8bb9015460f626d9c1a1"
    },
    {
      "file": "src/engine/tells.ts",
      "sha256": "f49a7f611cbb07048902321b6158129831352879240a7a1568319ef6ed424f08"
    },
    {
      "file": "src/engine/theater.ts",
      "sha256": "99f394b9c4ac8df1d86fe11880f6f0bf4bd58c0132748395f6b50fb8f738a062"
    },
    {
      "file": "src/engine/throng.ts",
      "sha256": "9e19bfdded011de4940578d6f28b266c00a1b423618eae18f777c18ee9ed3479"
    },
    {
      "file": "src/engine/throngEvolution.ts",
      "sha256": "791212f22d673bd37575c1feafc24743f1e90fb3ab474e02a4b172ee0f619078"
    },
    {
      "file": "src/engine/tiers.ts",
      "sha256": "8492e09732df982b1c5bb920651438592dddbbd085717232fecd86a856c18eb5"
    },
    {
      "file": "src/engine/timeflow.ts",
      "sha256": "a8f16f0aa68bc609ffff4e32baf7c07c68edecc4f71edcb99836b52ea6a9a33e"
    },
    {
      "file": "src/engine/titans.ts",
      "sha256": "7106c69ba1d83abebc0c8e2e94764eb942ff44b337b692df21665bdce1cec9f4"
    },
    {
      "file": "src/engine/townportal.ts",
      "sha256": "5d2b0b4933619bfd5b292dc3eb5ea971da92a417fa1a263e5c5515dbf789bab1"
    },
    {
      "file": "src/engine/trace.ts",
      "sha256": "6d847384c821a24c421023a46f12174ecf2b3f67ea5c9a0e20bd6914b5124af1"
    },
    {
      "file": "src/engine/tracks.ts",
      "sha256": "01ea6bc99b6c46ff7cb69d46f94d2fa66ab7e4127aa800d5790ee033384b4b3d"
    },
    {
      "file": "src/engine/trainingYard.ts",
      "sha256": "eabb586b6d4892a9f574a3a6037cef37dfc1652850c35db2c9629a2e002c84a5"
    },
    {
      "file": "src/engine/trapworks.ts",
      "sha256": "24c793773ad82a28f486670b8bd7f1fb37988abea87ceb6bf78bd3f2a70ea1c7"
    },
    {
      "file": "src/engine/traversal.ts",
      "sha256": "fd330661c552fcb2a4a8c6b6655023631738dc93569633d2ffa1d2926368c155"
    },
    {
      "file": "src/engine/tuning.ts",
      "sha256": "e5b965c2a63a1cdc4bf8ac31c74918944e73a2974838b3ba824067fe2361b8ea"
    },
    {
      "file": "src/engine/ultimates.ts",
      "sha256": "e6f32615c0f92fc884c2261f30d1898086e53c3a9393ccb08d7904837e9fdb18"
    },
    {
      "file": "src/engine/veil.ts",
      "sha256": "efdd01eb86e2d528cc60cee28bb72ce871dedfecc80906ead1c0efa439def6c4"
    },
    {
      "file": "src/engine/ventDweller.ts",
      "sha256": "ec9c60d04caebf795b21fd7d594078c8546589321f6af49a78c8feb0500ca4c8"
    },
    {
      "file": "src/engine/ventcauldron.ts",
      "sha256": "4994c3dd6b5186b917f1f9e4b27ab26ea37c9570211e84f234347b93ad23a910"
    },
    {
      "file": "src/engine/victim.ts",
      "sha256": "1d0ddc6578d1e965ef148551df2c52e275cec0eee76283ad739f3e03f09d87ee"
    },
    {
      "file": "src/engine/warningCues.ts",
      "sha256": "c6adbf4e4e2484bf68fc1f1519065dc130d8ebebc8177a7f6b8ca77baaf41a3a"
    },
    {
      "file": "src/engine/watch.ts",
      "sha256": "fc3c859c34b075ae055dfd1b62e580ebc8bc38ea0ee3d1b54a3c8fd46c58e1c1"
    },
    {
      "file": "src/engine/weakpoints.ts",
      "sha256": "47fc89dcc30596d7bab77217006ba25365cb946e62f1ded562ee7a3ddd2c377e"
    },
    {
      "file": "src/engine/weatherDress.ts",
      "sha256": "709ddd7115332454e674748cc0269e4f44fab0f64584ae49b745a290f89fd7a0"
    },
    {
      "file": "src/engine/world.ts",
      "sha256": "70f2a6e7d6d0a23ce8f5095ba332a60b325a33478e67b342118a35b3904b73d3"
    },
    {
      "file": "src/engine/worldgen.ts",
      "sha256": "3945ca6d4b63f01f69f20c386b0b32b60a82f3e2228b12fb5686f3415126a224"
    },
    {
      "file": "src/engine/zonecontents.ts",
      "sha256": "15b897806b1c907b9778bfeb9c0b1ee5f86454a64415f18a72bd431ab790b9dd"
    },
    {
      "file": "src/loading/frame.ts",
      "sha256": "59f9ddbad054f61cf176bbcf8c53ecb582c011a428dcb149c5723424f23fd216"
    },
    {
      "file": "src/loading/frameAsset.d.ts",
      "sha256": "ca060732999f45caec50d0d7d4f7f64fd07a6537fa050b5a52ec6e31eac07e1a"
    },
    {
      "file": "src/loading/loadingSurface.ts",
      "sha256": "1f05341be99381ac791da73d58cf4932dfb0a13ff3898c0e3e11c5d9d3913908"
    },
    {
      "file": "src/loading/protocol.ts",
      "sha256": "0c9d2d830be5ce04234235b6489640c96db75c280260ab32bbbd45d0b31d7306"
    },
    {
      "file": "src/loading/spiritRun.ts",
      "sha256": "3cd95250e9a7276409c9d269329cf7e6f820ec72bed40dae4d11671709fa6286"
    },
    {
      "file": "src/loading/spiritView.ts",
      "sha256": "d013e4281ea5e077b10f19df1b4f84762cd1ebecd894accb480230d2b55a8d51"
    },
    {
      "file": "src/main.ts",
      "sha256": "437b0e94d66690b0948a3ffe9794909904a4bb4f3b55407f60ea9d6961816e5c"
    },
    {
      "file": "src/meta/account.ts",
      "sha256": "49879fb74d781d73a786f6bfa3907ff7427532f7135b2dece0b78ddc4fc16e19"
    },
    {
      "file": "src/meta/atlas.ts",
      "sha256": "a1a29cd4e76a75d6dd8350334140ddb550593ff16ec1d2d36ac3ee415e04db22"
    },
    {
      "file": "src/meta/browserNativePages.ts",
      "sha256": "d5a07e6296e82ab446afde44936ed2f4ab813e8c2a6a2407dd6cff6bde14f9f5"
    },
    {
      "file": "src/meta/browserRunStore.ts",
      "sha256": "879489f8ed426ec5674b66b491ef94e1fa225cdbdd2546dbc7d9fcfbf26b5329"
    },
    {
      "file": "src/meta/character.ts",
      "sha256": "ba4db0fea49b942ba6b767edfda57d0f418974f0ea1c88bcec3016ed166765bb"
    },
    {
      "file": "src/meta/characterPages.ts",
      "sha256": "b400ed2f97678ec00b405bb948576f8017f161ae82cda6304e4e1baad8ea0a18"
    },
    {
      "file": "src/meta/characterResume.ts",
      "sha256": "2a823bceff27d4754ac50692f3dd10c06868380a2dea3413f4415178dd8d3304"
    },
    {
      "file": "src/meta/classkit.ts",
      "sha256": "cfbefb3b6961d2c90e9245534acbb6c07b4e6ce10825a863a98b9fd4d462d498"
    },
    {
      "file": "src/meta/cosmetics.ts",
      "sha256": "3254605cbba2a0f57c1bbdd5814bd0f468f937f79d323931bf1a882e0a875ed1"
    },
    {
      "file": "src/meta/death.ts",
      "sha256": "15b6045f17e00a051f0a505ab30806948dee767538cbffa5b5f42b35b6890195"
    },
    {
      "file": "src/meta/gates.ts",
      "sha256": "6b8a8b6c992e0a68d65d87d31cc02dbc388589984c1dd1d4ceaefd57e9de753c"
    },
    {
      "file": "src/meta/memoryUnlocks.ts",
      "sha256": "3f1f37415b070e65deb228c147f388cedbca78d3ac97760f232805ee62a115e1"
    },
    {
      "file": "src/meta/mercs.ts",
      "sha256": "9e7c36027fd2fc31d43403408ed029c2dbd4c7b6becce8667135e25f0376c94c"
    },
    {
      "file": "src/meta/modes.ts",
      "sha256": "58d9cd69f5049d3030a36e654eec43fbb472f33ba6c1f3da015979621959101e"
    },
    {
      "file": "src/meta/nemesis.ts",
      "sha256": "e286a236383a32eba5853de70bb1bae9e0b9767a18571e1a0162061f1c5014d4"
    },
    {
      "file": "src/meta/persistence.ts",
      "sha256": "3a90cbd6875da213a0f50d51f4d8bc4a9662aab1003612a405b553247988acaf"
    },
    {
      "file": "src/meta/portage.ts",
      "sha256": "2dec6b606c542730d9ecf29ba88e2356eeaaf1651ec7a51756bf4a37e717fe11"
    },
    {
      "file": "src/meta/reliquary.ts",
      "sha256": "96764894022198a4529e2d33b2e360803ebbde8d98683485f485cdd13cebaf9b"
    },
    {
      "file": "src/meta/resumeWorld.ts",
      "sha256": "89fb5111e2e209c08efdf05ca5dbeb414993c762a37dee531703ed7d1d06ac59"
    },
    {
      "file": "src/meta/saveCompatibility.ts",
      "sha256": "39209ee54234eb351ecfa4bd18949e0e8798fbb9868df3aa99607609c83836d7"
    },
    {
      "file": "src/meta/settings.ts",
      "sha256": "54caa84780c37e395505b64d443b5ccd09a02fa12e4e975bb27d2fa7621a6200"
    },
    {
      "file": "src/meta/shardVessel.ts",
      "sha256": "467697d844dc551cf93ed9bc853a9a62280d64aa9fbfc67103ea1856fcae1b8d"
    },
    {
      "file": "src/meta/skillSlotMemory.ts",
      "sha256": "d5efc5637555b615d61450b568fa6183b1653c08501b09d4577664a37ac29db5"
    },
    {
      "file": "src/meta/unlocks.ts",
      "sha256": "2aee46475e693debc1664ac203d12bdc6d9cc5bdd1de27b29eae5179fab85fee"
    },
    {
      "file": "src/meta/workshop.ts",
      "sha256": "1aa1e12dc5b5593938d30d94f3fd692cfd4df5b1b18324521ae2844713f12116"
    },
    {
      "file": "src/meta/worldstate.ts",
      "sha256": "3b0c4155b9a412bdc8f2b8547608391a1d253b6c3494b7c7ac5049f084931924"
    },
    {
      "file": "src/net/couch.ts",
      "sha256": "54ccec333b3b8cb317a6c214b2b0403be5411fc2ca49be086e9a8f9912723dcd"
    },
    {
      "file": "src/net/crossing.ts",
      "sha256": "190162ffc2e45f56d6f7bb15b1b4f26bd1e45fc7b8100c5704e56a998e79d600"
    },
    {
      "file": "src/net/foresightWire.ts",
      "sha256": "86347c54c0afe12d623acc8a67976a140b45fe78dc37849d23b81006333fce84"
    },
    {
      "file": "src/net/intent.ts",
      "sha256": "d01e672985faff26b2e7952bab6452ebc3af9b9b5685dc7137c51ca6460911e4"
    },
    {
      "file": "src/net/journalWire.ts",
      "sha256": "014784aad2d71cecac840b506aee9a5f41eeee33b26d1796d7dc69e10e8a9327"
    },
    {
      "file": "src/net/local.ts",
      "sha256": "4f21b4b051a4a33e9e103fb2d4fb607d7d49953ff6039b57fde37a981bf0ef24"
    },
    {
      "file": "src/net/nativeHostedPublication.ts",
      "sha256": "aee60f2b96a6dc7e359be9c4412815a17ecae3267157fc0f2b7d4e0b6a0820ff"
    },
    {
      "file": "src/net/nativeSnapshotHost.ts",
      "sha256": "428fbe6391d3cd758147c3cc8ab1958ba9f92ecb8414003ea54435a38592e34b"
    },
    {
      "file": "src/net/partyReads.ts",
      "sha256": "9b9da9aafad36d6456039e9937f58bc70ad81907f5db4d6636b151a4c52f421a"
    },
    {
      "file": "src/net/partyWire.ts",
      "sha256": "f50fe74e82245a9577572ca47b19831d3f2bf370e749fd9b4ec9cb866fbbe6c9"
    },
    {
      "file": "src/net/predict.ts",
      "sha256": "f4a965472668b8e4137061b99ac46dfda95ff00d298c84e5b6bbe01a4e405e47"
    },
    {
      "file": "src/net/remote.ts",
      "sha256": "c55a26b07f0eb5b92a1cb786ec94966372975e6d56f5d560ca92cf29a5c008bd"
    },
    {
      "file": "src/net/scripted.ts",
      "sha256": "8f8d4d596c3ff66118173f8e5d7d1ebca7d8a7bf49e8302b9d348b2981efbce2"
    },
    {
      "file": "src/net/seatView.ts",
      "sha256": "d343bfe773dd9375988af100c16025a793a3fd9aec2f0a6c7c4c5937dce22ca4"
    },
    {
      "file": "src/net/shardBuild.ts",
      "sha256": "d3dd24bed68ad3349a8499c5907e86ec81abcb25e976f9aa96885b63dbc261b8"
    },
    {
      "file": "src/net/shardDoor.ts",
      "sha256": "b22d622c6c79d5c70a357590c86436a6bebde78438d0a2425620dc5541c17d31"
    },
    {
      "file": "src/net/shell.ts",
      "sha256": "bb14b8b3e49fb0f831dcb9c5b40cef3cef435efcf40de5358dcf19d005cf1d53"
    },
    {
      "file": "src/net/snapshot.ts",
      "sha256": "1818765334fe6a259615a30483519197460984ea086f17b243d9002b735846c2"
    },
    {
      "file": "src/net/spoils.ts",
      "sha256": "a326f6e65728fb72f9a290d04cbc6d18683182dc1bdbf2887fee76ba39bb6729"
    },
    {
      "file": "src/net/transport.ts",
      "sha256": "465a382a9835ee599f34aa5b8d902cac78979845e40a048408512f203be2f891"
    },
    {
      "file": "src/net/vesselWire.ts",
      "sha256": "77e7befa2ba2efaf003bbac010ec1b59e6b1993cd7de16e2529003db7cd38fbb"
    },
    {
      "file": "src/net/webrtc.ts",
      "sha256": "f1122479d352e1bca1a751222792633f88639afa30f512f3f27844a15026c750"
    },
    {
      "file": "src/net/wildsClient.ts",
      "sha256": "5c1c98565ce9b45aca2ab4f31d48727262bf37e0fdbc4e1a507e27310ae52d59"
    },
    {
      "file": "src/net/wireDiet.ts",
      "sha256": "9551f7205810c0ea69df070f915abf492c147d1f2506ee224563e53bd0eaa75e"
    },
    {
      "file": "src/net/ws.ts",
      "sha256": "7d1461c909fc69fefadc2e2088d9beb6ed6b0ce72db19fe0273d6f755f7d13f1"
    },
    {
      "file": "src/net/wsframe.ts",
      "sha256": "2bd891f2b435f4ce2ded77c21509c9e3a806073eaea6ed25e600d0c2285160c8"
    },
    {
      "file": "src/packages/contagionStrains.ts",
      "sha256": "e6fcd1572c1b33575804ccbb0ab20752a7ab550a8af9a8195ac8e41ba09e4971"
    },
    {
      "file": "src/packages/courts.ts",
      "sha256": "21ee029c7c1ef9aca3b5aeafa3db37cbbc47abf4329ea2ca14a35c2450808665"
    },
    {
      "file": "src/packages/defs/amalgamation.ts",
      "sha256": "606e59ee0e402371becdf7557ec41822385340d9596a7422530c4a64112d841d"
    },
    {
      "file": "src/packages/defs/ascent.ts",
      "sha256": "df49a0758bc81e8abca031353ab96e0ec2665c72bed9b803ffcbe061f34931a3"
    },
    {
      "file": "src/packages/defs/borough.ts",
      "sha256": "bb775f270ebec5b7de438efdd73b73c71e87a4f6eee37ceeb10481a1cd048fbd"
    },
    {
      "file": "src/packages/defs/breach.ts",
      "sha256": "f8f8fdfafd1765e822984de8da66007a12c5ca88d402b6bbab4ba57bb4d7f6d2"
    },
    {
      "file": "src/packages/defs/brigands.ts",
      "sha256": "7594d0e78e497ef4c14d8511941e7332d95e34288bc70d460bcdf3aed4827b75"
    },
    {
      "file": "src/packages/defs/conclave.ts",
      "sha256": "5b802f38cb059636119d66eef4546f2e866e8c205af4be7ff5db5904bca1dcaf"
    },
    {
      "file": "src/packages/defs/contagion.ts",
      "sha256": "7550db4ebaa5661a83c0a5dad2f4571b72dd392ab22bf333616d77db9b71c1ec"
    },
    {
      "file": "src/packages/defs/crusade.ts",
      "sha256": "034aa1250d639c9ea895dcd095148e3180256904614da4a1490f962f13abdf76"
    },
    {
      "file": "src/packages/defs/deadwake.ts",
      "sha256": "0f2bd8967e9d6bfbb1be25aa1608d0071472aad184d7208c1672367a50f9cd0b"
    },
    {
      "file": "src/packages/defs/deepwinter.ts",
      "sha256": "c41bf1feb22ea22b36773e029794d695d047ec1715c512bf9764afc99c1889ac"
    },
    {
      "file": "src/packages/defs/demonInvasion.ts",
      "sha256": "557f460c35193361f3fb12265731d9e461b71bc297787f8069aca8cb1f1407a8"
    },
    {
      "file": "src/packages/defs/descent.ts",
      "sha256": "684c601add1cfc60284bc720797e101f2ceb50938a6ebd6a363c5ab3e0ae63d7"
    },
    {
      "file": "src/packages/defs/drove.ts",
      "sha256": "1f76441b59aff567861481cdf14caccd77e2b1a8db88b80a5ae4771295f6411d"
    },
    {
      "file": "src/packages/defs/extraction.ts",
      "sha256": "3dfe8fe51560233e13e4cd1e486b1121dbdd455ea3723f702b4a06b7949deed2"
    },
    {
      "file": "src/packages/defs/factionPolitics.ts",
      "sha256": "76165a897251b14f16ea1cc6fab3b11c9ea4447763315e394abdf547dfb8bf0f"
    },
    {
      "file": "src/packages/defs/fractures.ts",
      "sha256": "592274867d637b3609029b383e1a5a178779b8cb56232d5fd5fa3ec178d13c9e"
    },
    {
      "file": "src/packages/defs/gloaming.ts",
      "sha256": "ef4e8bd988997b1fad4852662a9beb8cbedb7df4099e3825dfa0ca1a95b676a9"
    },
    {
      "file": "src/packages/defs/haunting.ts",
      "sha256": "537ec6fcc698428548baa1bcdf5bf5b7473fb1bbe0e3d362620b619b374ec135"
    },
    {
      "file": "src/packages/defs/holdfast.ts",
      "sha256": "4df83100777eea7687cf1a65e2494679b6d5517ffaed38656b172d30db5c4ffc"
    },
    {
      "file": "src/packages/defs/hunt.ts",
      "sha256": "dee9059b6e60daa14d8c97c95759fab3d0a2c5d74e81a615f0e6fd5a1f3efdd0"
    },
    {
      "file": "src/packages/defs/longNight.ts",
      "sha256": "a2732cfc87272f445a501308dcd8a1d68d1117b2e1d4467da312d8e1a94ea4c4"
    },
    {
      "file": "src/packages/defs/longcandle.ts",
      "sha256": "f10100c68deba3472234b5760c102344d64cf6db104dcd6ceea3c0d7ecae6af8"
    },
    {
      "file": "src/packages/defs/migration.ts",
      "sha256": "3efc6057c2403aafb3db84498a4811c97fcc2db9427fb28a189f748e57edc659"
    },
    {
      "file": "src/packages/defs/mirrorkin.ts",
      "sha256": "a86952f51677357332dc401cc478df4f100751a87546e3489c7dd63389a91f36"
    },
    {
      "file": "src/packages/defs/mycelia.ts",
      "sha256": "da688ea5aca21e835ee73e758898652068ef6f11fb5aad6ff6ae42d1b9d714fc"
    },
    {
      "file": "src/packages/defs/pit.ts",
      "sha256": "66ffa7cfd3b9284cc18de27521413de532eafef7f4ba9aca4c9ae57e61250ad3"
    },
    {
      "file": "src/packages/defs/quickening.ts",
      "sha256": "f3dd2e68b341fa52854a468193d710b018b5f62879bb70f4ea165d984cb6006a"
    },
    {
      "file": "src/packages/defs/stormFronts.ts",
      "sha256": "0d9711d5e9ac5b717675e2463b9a2d92d940aa8cbc947f75758c6688b24e999b"
    },
    {
      "file": "src/packages/defs/straying.ts",
      "sha256": "399f741ee32f71df6830644fd36d0ae1c2e8eededf3f23a3fd6195e1e0e9a18f"
    },
    {
      "file": "src/packages/defs/swarming.ts",
      "sha256": "24d9c16302685bed1a097a065b7cfcbabed2361665e589121434b7df93693577"
    },
    {
      "file": "src/packages/defs/titans.ts",
      "sha256": "11d9c3dbfb15639fccd728e80ae9b1c939d006ee44858c63d5c1a8b702639a07"
    },
    {
      "file": "src/packages/defs/underworldWar.ts",
      "sha256": "eeb34f0294511cba26d7462b6afd9c8f112134c2f822af64e43746faaad1243c"
    },
    {
      "file": "src/packages/defs/unsealing.ts",
      "sha256": "7e022f661d431bcfc92e3916943affd3e9267bbebab4d733fb0295c01aa3c49b"
    },
    {
      "file": "src/packages/defs/vendetta.ts",
      "sha256": "fcd71577b41fd8689e987e37088695680bde45258a187653b8c63c3b47da4521"
    },
    {
      "file": "src/packages/defs/verminfall.ts",
      "sha256": "196e06973fb7534f8d4c9bd9c2fb2d8ee02534d2c261bcceee204e00c3dd2ae8"
    },
    {
      "file": "src/packages/defs/warbands.ts",
      "sha256": "88d9fe9fc3a2fd0cd5a98898d59c5cec56fafb872ac5c72e24bf8cf6fd9de3d3"
    },
    {
      "file": "src/packages/defs/wisplight.ts",
      "sha256": "faf4b7989823f3e1a22165d0f706c089f9514ed17f531a1c7b74f134810bb26a"
    },
    {
      "file": "src/packages/defs/worldboss.ts",
      "sha256": "b5930d1fb99cb2fb3c65bdf705803545a7e438b3465affcc0e502eb048ab48a1"
    },
    {
      "file": "src/packages/defs/wraithsail.ts",
      "sha256": "9e4873a3ca2e4b3cf2025594cb5013e375b276deca689b6f2fb35d0c958c99f0"
    },
    {
      "file": "src/packages/encounters.ts",
      "sha256": "0e6673fc2ec9072e3c1dc482cf8e8b03fa43a86b58bdd2ef2779fccb79a9178d"
    },
    {
      "file": "src/packages/factionGen.ts",
      "sha256": "7714b547d97f8c2077ac3f38d1f3f839eb9bdb9b204dcb7d605b68ae49ce0f34"
    },
    {
      "file": "src/packages/frequency.ts",
      "sha256": "7194f006c5c025af15dd53fa64c16cce9700d3fcf60ce008bb5b12a7b4358df6"
    },
    {
      "file": "src/packages/groundClaims.ts",
      "sha256": "3ac8bd41dc50314f170bc63f03bc1af088a17f044435363aea7aace9d8c8bd4c"
    },
    {
      "file": "src/packages/holdfast.ts",
      "sha256": "3e2ae6bae88eb5a5af919082313e742200c3cabaac9bf4999d804437fb69b60c"
    },
    {
      "file": "src/packages/ledger.ts",
      "sha256": "1f00ae629319f78f26d234a8c1aff7d538f631d82219b3753f49803e5962fcbd"
    },
    {
      "file": "src/packages/lords.ts",
      "sha256": "4c3150b67b4f88d476ddef76d242e2804c0e597545f8dff58c4d69671546b259"
    },
    {
      "file": "src/packages/manifest.ts",
      "sha256": "5d439d3065786f4ee2af3f14dde41caafacecaca41299d4d080ea4fb508525f8"
    },
    {
      "file": "src/packages/overlays/amalgamation.ts",
      "sha256": "7bdb7ffb9ef53daefddc43781a43f42eee64b99eeb90631f081e48523b4da1e8"
    },
    {
      "file": "src/packages/overlays/ascent.ts",
      "sha256": "1c7c56b6ed9590f5555d1ae73df5a4b933bf93fbb771d3c7e016d230b8e1ba26"
    },
    {
      "file": "src/packages/overlays/borough.ts",
      "sha256": "4ebb3ab02c83c5153af7cb8c53d7697677c3bfd9fab55bb739b250e267bb0762"
    },
    {
      "file": "src/packages/overlays/breach.ts",
      "sha256": "647beaa371c5916125d8bb04b3091bcaca3f371101cb8f02384eb928dae43f7a"
    },
    {
      "file": "src/packages/overlays/brigands.ts",
      "sha256": "8540c9e36fb95a94fd1c2922ac8568fe12dea0f5eedc9ce614d8c11af187f3b4"
    },
    {
      "file": "src/packages/overlays/conclave.ts",
      "sha256": "3dfd3d404d13f75dff966a919a37d5455d2d86176c9b4dbea25e1240fe3257b8"
    },
    {
      "file": "src/packages/overlays/contagion.ts",
      "sha256": "6d329528e92c99fc3b0f51706091c64c0820b6940c885c8459ca6914d5b843c9"
    },
    {
      "file": "src/packages/overlays/crusade.ts",
      "sha256": "3cafce610442fd8a0262609add8514cb113612bba7de010415e0cb6c86c9e00a"
    },
    {
      "file": "src/packages/overlays/deadwake.ts",
      "sha256": "01f5171d5b67fe653e242cc1ad4eb6a310d317ad77a3fd6e4488d8680399edae"
    },
    {
      "file": "src/packages/overlays/deepwinter.ts",
      "sha256": "647e0489d8f7b8778a9dd5b586d12710f0ecbc715f0a4d6acb56089ba94144cb"
    },
    {
      "file": "src/packages/overlays/demonInvasion.ts",
      "sha256": "2068cae8a952f35dff73a3ea1e3e5463eb92bedf344c2ca8b04ea550e4fdd50d"
    },
    {
      "file": "src/packages/overlays/descent.ts",
      "sha256": "7ef0d52eff382c125741c3ee2d3e131c043f4a8814e532c92e3802c438100bcb"
    },
    {
      "file": "src/packages/overlays/drove.ts",
      "sha256": "0b12ed3468f5c748935c06d9b06178b9b0a28a6fc639a07e2f71b865c9f4d1d9"
    },
    {
      "file": "src/packages/overlays/extraction.ts",
      "sha256": "70194179f47fe5bf6bd445022bbcb2de8dd7cb24e624de76bec7a2de2b3e5d91"
    },
    {
      "file": "src/packages/overlays/fractures.ts",
      "sha256": "99857ae35016ef24a360a04749f4145b7e731e1a24b65b2da0eaa45b78e6d355"
    },
    {
      "file": "src/packages/overlays/gloaming.ts",
      "sha256": "81668cb34c2855745066222b1cca2b5f14bab78182bf5bb99d7ca528ecd09aa5"
    },
    {
      "file": "src/packages/overlays/haunting.ts",
      "sha256": "1f18fed376fa69d96b8a9ab30173b23934e2ae91fa74528c2addbbc440f03b66"
    },
    {
      "file": "src/packages/overlays/hellWar.ts",
      "sha256": "5dc6c3656cbca10babc20fcadd3735409c0b4d59ee1ce74d7b884dc9a90bffaa"
    },
    {
      "file": "src/packages/overlays/holdfast.ts",
      "sha256": "72ebbd8a78f7383b346e9a654ee706fc68a23647e0c09f14f072812ae4300d86"
    },
    {
      "file": "src/packages/overlays/hunt.ts",
      "sha256": "f274660db586f70192545b9fbc061a417a0eb2a20f6e53cbb8a454ff7df42a50"
    },
    {
      "file": "src/packages/overlays/incursion.ts",
      "sha256": "eeee1aa6f9372e225f78acfc0fa98db3895dd406899e3530f421bc50d1dfc7c5"
    },
    {
      "file": "src/packages/overlays/longNight.ts",
      "sha256": "dfcffcfede912a965e3f634fbe39c1b9884e934c0ef9f1659715edf462f9c638"
    },
    {
      "file": "src/packages/overlays/longcandle.ts",
      "sha256": "b9f7f8ffaf661c8ad3d323912277882856ee155d3b12a64d1fd8ce3f8800c968"
    },
    {
      "file": "src/packages/overlays/migration.ts",
      "sha256": "b08e781c12cf29155a45e5eec17e8d80a11ab71e68968e818f857cd041aea4d0"
    },
    {
      "file": "src/packages/overlays/mycelia.ts",
      "sha256": "c755d892ea4707cad710d237c1ee4f161f48b2fd8e2ac0dd6f5a7d6ed3e57098"
    },
    {
      "file": "src/packages/overlays/quickening.ts",
      "sha256": "8ac4d3bf12d8af98d60ef4ffa589895097a6951ee95998b187b51f7bc6fba239"
    },
    {
      "file": "src/packages/overlays/straying.ts",
      "sha256": "50dd452835acae01ba93b8e9b189ff51e408ec0562308bd24eda1c0f416f38c6"
    },
    {
      "file": "src/packages/overlays/swarming.ts",
      "sha256": "530c753dfbb1addf81abe5701e2e7efa2afbe7ba0bd604ea3772c86d31a877a5"
    },
    {
      "file": "src/packages/overlays/titans.ts",
      "sha256": "8604be03901faee5797e0331ef509ab96dbf4e1c43703425c49fafb82299705d"
    },
    {
      "file": "src/packages/overlays/unsealing.ts",
      "sha256": "57f08ad0b9d217c353932011e44de59bbc22efcfe16b4540d7e921394f45f10d"
    },
    {
      "file": "src/packages/overlays/vendetta.ts",
      "sha256": "ae3073043515cecad59cf7a393bd9470e0bbf2f0a9db3907d42fdf7b08006f65"
    },
    {
      "file": "src/packages/overlays/verminfall.ts",
      "sha256": "a4695f1f452cc231fcf9d61b34c62d96c94b6e12554801bc51db9893d2c7a5d8"
    },
    {
      "file": "src/packages/overlays/wisplight.ts",
      "sha256": "fc9df4740cde2e0ff822fc65fa187ce2984ab16ae321575abb7401d9f1c18224"
    },
    {
      "file": "src/packages/overlays/worldboss.ts",
      "sha256": "038bdcdc7b5932dce1fae5f5426b4d3d2f191e9915035e218d284ce9675f3250"
    },
    {
      "file": "src/packages/overlays/wraithsail.ts",
      "sha256": "ab9a48f787a32b556cbb5fa021e93797e77e5d4a07936230977e50f1dd312c8f"
    },
    {
      "file": "src/packages/registry.ts",
      "sha256": "c57e80a3eb417dce0c438a1a636f6bd45f4ab046d88ce95f16150a6f32a4a1e5"
    },
    {
      "file": "src/packages/types.ts",
      "sha256": "8694317ac979dac04b9fb80c1edd031473b31e51f54e02127f047414b42070d8"
    },
    {
      "file": "src/packages/unsealing.ts",
      "sha256": "79814ae20c9194b73935da7a7e73c3829f833b4761893ce22084e0d427125e07"
    },
    {
      "file": "src/packages/validation.ts",
      "sha256": "43ae51d55b6792c4b3556601db2ab91c229431a9c2e78224699635ef3f20c09e"
    },
    {
      "file": "src/packages/weighting.ts",
      "sha256": "2d38b8335f98de9ec69de7eeeba67e3749d3ede2f192e4c2904ece6adaa35f60"
    },
    {
      "file": "src/quests/brandt.ts",
      "sha256": "f0b642575fa7065e16c3cd9386fd1b6d6bb62ac7966edb89a7197a9223258c77"
    },
    {
      "file": "src/quests/defs.ts",
      "sha256": "82c1d49b00339e5f6d5f885f043105937e36108dcde6e17a9e7556996dafa468"
    },
    {
      "file": "src/quests/frontier.ts",
      "sha256": "74ca2f14670a8bca2fc795dc856239640df8a98f48c3a3a6373639e9c9d1647a"
    },
    {
      "file": "src/quests/odyssey.ts",
      "sha256": "f058428686e132f241c50c6b30b9639068981d96fcc07efb5dcbea85a03a91df"
    },
    {
      "file": "src/quests/reliquary.ts",
      "sha256": "41f3e586e6f28268142b01bbc0b4ae254bb13ed08a2ed003c08e69813ac639a4"
    },
    {
      "file": "src/quests/revenge.ts",
      "sha256": "109a87b5ed00de8e0b72cdf214a87292ed8b926dd0165577c6980d192b9b7ee0"
    },
    {
      "file": "src/quests/types.ts",
      "sha256": "f6db5d180d511d8b86546933ef7af92a092d7db3654897101c2c789e56204858"
    },
    {
      "file": "src/quests/vocations.ts",
      "sha256": "ece05a5be066f75b56997cc20a47fae116f3e73db85b07b64e209e2dc9df3bdb"
    },
    {
      "file": "src/render/actorPortrait.ts",
      "sha256": "5b1869e050961f6e435eabf82a0181e737a58a0b8ec17d9fee9b567b5632923c"
    },
    {
      "file": "src/render/camera.ts",
      "sha256": "18ce5ad0f5fc4456fc82477dac7972d960b271fe16f3df8092a043fca13e73b6"
    },
    {
      "file": "src/render/groundItems.ts",
      "sha256": "335c4501e10be1b1eb2cf5886f4ffe2fd58038a5541be6178aab9715894e9c2d"
    },
    {
      "file": "src/render/itemIcons.ts",
      "sha256": "fcf1eb6afd423063668e94dba2690358b2446014561ebd1c083946a91c170a3d"
    },
    {
      "file": "src/render/portraitLib.ts",
      "sha256": "529350501621252992458646462fe1411e6dff7dfab1652b136210aff92815c7"
    },
    {
      "file": "src/render/renderScale.ts",
      "sha256": "1c52e30e88a1efe278af1dfce708072fc5d7d9df0815f82613c097e3bf62c6c8"
    },
    {
      "file": "src/render/renderer.ts",
      "sha256": "4d66a199592f38ecd5275d4426c0ce43f20dad57af633a8aba7ab52e51e8c0f6"
    },
    {
      "file": "src/render/screenFx.ts",
      "sha256": "032990db22c4889762411ad8383144a625eff17900d89d00320e90ce86345cac"
    },
    {
      "file": "src/render/skillIconArt.ts",
      "sha256": "1cef51f8a41a482ae9db2fe3146bc20759c14fa9d603965ae21cb767781d2760"
    },
    {
      "file": "src/render/skillIconCatalog.ts",
      "sha256": "bbffcc402e9534950326166dac8dd630ab514aa15e7096e39aa5bbe60a9ec5a3"
    },
    {
      "file": "src/render/skillIcons.ts",
      "sha256": "dfc6a5983b1cfca78fe55d86925fc98ddef453a21390ff6a27c2b904b48bb53e"
    },
    {
      "file": "src/render/statusPresentation.ts",
      "sha256": "ce82aac62ddf3000768aac0386b78dd4111a8f3964336215402bf89b6bbac642"
    },
    {
      "file": "src/render/vis/actionParts.ts",
      "sha256": "7e8b84f98602859143cc5035f02f1382fb214c952cea0e212ed1da5bb959f99f"
    },
    {
      "file": "src/render/vis/afflictionEdge.ts",
      "sha256": "ae568fc010d865f2a8be735a9086069f5db11b7cf1d28ad0780b88839fc728ba"
    },
    {
      "file": "src/render/vis/aimtick.ts",
      "sha256": "4a3be5357778d69af6cc74dd27de2a3f7c1ef13e803e49bd0dd6c723483935aa"
    },
    {
      "file": "src/render/vis/altarCueLayer.ts",
      "sha256": "ab50ef7eff587e08f9505338d30f389b8459ff13df8729c57e86387dbe9b56f1"
    },
    {
      "file": "src/render/vis/ambientFx.ts",
      "sha256": "0ec5274743a761cf98e4216f18793e097ea0a5e2b0c0a49d1164b28a2c1ee402"
    },
    {
      "file": "src/render/vis/anatomyCueLayer.ts",
      "sha256": "58920ac3c493820291feed7e85f492ce6e5b1aa0cb544df8839ffce688644888"
    },
    {
      "file": "src/render/vis/aoeTrace.ts",
      "sha256": "551e7851bace7fe98fad400f5beb2108ef75ce84b522f2e90d7ac6fbbac73e88"
    },
    {
      "file": "src/render/vis/armedCueLayer.ts",
      "sha256": "22bc6297cff8b9008c18f7407f46463b5771020665d044eb1796c6690e17b91f"
    },
    {
      "file": "src/render/vis/attackSequenceVoice.ts",
      "sha256": "df0be51744f1644093162d6e52c81b2c7e90f299b50fd172f05e743ad30c03a0"
    },
    {
      "file": "src/render/vis/auroraLayer.ts",
      "sha256": "d35ef7b6a1daad6872051c4c59cec3a263804a38e61c52485677d46339736408"
    },
    {
      "file": "src/render/vis/bakeScale.ts",
      "sha256": "85d849f6ab7077c3475487ab4402bd473298c20d8588deeb293cf9332794dcc5"
    },
    {
      "file": "src/render/vis/body.ts",
      "sha256": "2fa40c19bb8a6a09be918c16ab4b00f87a73aade7598144791a042784e9e6aba"
    },
    {
      "file": "src/render/vis/bodyActionLayer.ts",
      "sha256": "a298785aba1f4cdbbab894159499513fe02415b5f327ec238264400c122ed000"
    },
    {
      "file": "src/render/vis/bodyContrast.ts",
      "sha256": "44ceb6b166c72f30bb8bd5bbe37edd08f24f2c982fef0b7f69e0b4b334729f66"
    },
    {
      "file": "src/render/vis/boilLayer.ts",
      "sha256": "55227830424b10a04155233bab1bc7c9002b46d4566067c684d4a641e621a879"
    },
    {
      "file": "src/render/vis/broadleafCrown.ts",
      "sha256": "090b73367cc5d74e7dcc37063ec188430e92bda2e48219fa44b2daad67d95388"
    },
    {
      "file": "src/render/vis/buffReadout.ts",
      "sha256": "ddfaee9207fc44e4599b8a02dec9fee463e87a3e96c1dbde8a26d8d3034ad004"
    },
    {
      "file": "src/render/vis/caches.ts",
      "sha256": "a030396aae902fe4f6ad960a7a848e990405e58d99f47dc8821115d894f365cf"
    },
    {
      "file": "src/render/vis/canopy.ts",
      "sha256": "82babe324ca6d0ba08b54627f6d94faba6b934ff8e274705f84589673069cabc"
    },
    {
      "file": "src/render/vis/canopyEyes.ts",
      "sha256": "618c51fba2cc1866e6bd3633abd64652f261eeff5e6982245ebe54a2e39b0bfe"
    },
    {
      "file": "src/render/vis/canvasCaps.ts",
      "sha256": "6000c0e09fd91cb723d4a8c53ce99eec4c7b8ef4325f2302517abdf095657e9e"
    },
    {
      "file": "src/render/vis/castReadout.ts",
      "sha256": "d77ee28bff2f4907870abe07152c83580829d1dd586561aa03d7871e327aaa50"
    },
    {
      "file": "src/render/vis/castingCueLayer.ts",
      "sha256": "537a52e1dbc96f8fb0a5b42998aad754eab514217f6124757dac0ab14ddc621c"
    },
    {
      "file": "src/render/vis/chestReadout.ts",
      "sha256": "a20fd129adc81131df8c539b598a3a5c53e8058f625840169bf3f9147a8ecc2f"
    },
    {
      "file": "src/render/vis/color.ts",
      "sha256": "43fea1cd6cc4c8e0cdcad22944f43aa559de314602909a865ea108801e892f95"
    },
    {
      "file": "src/render/vis/colorDrift.ts",
      "sha256": "07588e3cd0c19e9ec366db895b21bb91604bcc5b13fcebd83400e36b9adcdc38"
    },
    {
      "file": "src/render/vis/combatCueLayer.ts",
      "sha256": "22e1301e5b02bcdebfcf725504e7249661100a77a5931eaa31d1157da2fa326f"
    },
    {
      "file": "src/render/vis/combatFocus.ts",
      "sha256": "cae855cdc0fbbab07317ea27b2ca78120c06646dcb03825b119c9b8f8c145ba2"
    },
    {
      "file": "src/render/vis/combatMeters.ts",
      "sha256": "2e49d601aef717e4df2e1c6334ee8c2243c9974568206e10152e77a299c0cf95"
    },
    {
      "file": "src/render/vis/combatReadabilityLayer.ts",
      "sha256": "eddf011f24ac12154469f88520583ffa0d4d5204eff125d8b4401f4dbe9f8e74"
    },
    {
      "file": "src/render/vis/combatTargets.ts",
      "sha256": "544989522228e2fec83f0d03b779511e3d6579f6d51abf13b369334fbbdebc71"
    },
    {
      "file": "src/render/vis/comboConditionLayer.ts",
      "sha256": "cfd467c71f50387517d67b6414fcc183b7a9ee94264c0fa6b75286dde1bae7a6"
    },
    {
      "file": "src/render/vis/comboCueLayer.ts",
      "sha256": "0cf86aaff7fa548b0465f215e4766524878e51524fc30baaa4e144f9d81db31a"
    },
    {
      "file": "src/render/vis/companionCueLayer.ts",
      "sha256": "a0d432d58705cfbb357f3f2794743f235d9a20d1c88d415ca67690fa63a53791"
    },
    {
      "file": "src/render/vis/containers.ts",
      "sha256": "0abe321f44d57064a55e715ce3f300e16a348e5aa938898a1ffb0e4bb1681f2d"
    },
    {
      "file": "src/render/vis/cosmeticEffects.ts",
      "sha256": "433ad185ab7b2fe31aea28c2888776b05972b27166220520fcf68310e23ea139"
    },
    {
      "file": "src/render/vis/cosmetics.ts",
      "sha256": "1b3de3677244c18fd75044e49a62d374241cee203ccb0ab2262325fb736bf4c1"
    },
    {
      "file": "src/render/vis/creatureTerrain.ts",
      "sha256": "6526d0fe4b44cd025268b0f885280f85f4031263cc18ebbfb7c5677281db1c84"
    },
    {
      "file": "src/render/vis/creepLayer.ts",
      "sha256": "485db08d6e5ef9281c29a587266137be3a50de967fdc64aba057883e247a941d"
    },
    {
      "file": "src/render/vis/creeperLayer.ts",
      "sha256": "57563e901d67023509c4a8b69e1ebad26db1e2d2428ffecc860ab593956e7b8f"
    },
    {
      "file": "src/render/vis/cryVoices.ts",
      "sha256": "612dad71afc9ef8a4818418c8f3ba9c518c08a6bae9d2b8e56e3947336d9aab1"
    },
    {
      "file": "src/render/vis/defenseCueLayer.ts",
      "sha256": "4e1640a1952e362167751f9fe0e055a6a14b1f6e2ce28de474ee46ed365fd381"
    },
    {
      "file": "src/render/vis/destinationLabels.ts",
      "sha256": "2188a09291b88726402e14a3f04c4577b25a4f15378eeacac6cafefd559093af"
    },
    {
      "file": "src/render/vis/dissolveLayer.ts",
      "sha256": "ccf39359d9e609244b4b8ddfe4e37646d3407a64067b5fa54ea3f7e36c34c098"
    },
    {
      "file": "src/render/vis/dressFade.ts",
      "sha256": "fe8075b05fdab214cb3741c2f944a0909f6e32722260dd1e8334e6c1442cf4cc"
    },
    {
      "file": "src/render/vis/effectVoice.ts",
      "sha256": "21812cbd7b959ec4ba86438426eb75991b5ac76fa83f54fbacaf38a9b23b5f9c"
    },
    {
      "file": "src/render/vis/emergeLayer.ts",
      "sha256": "05e450e84fa11d3da089fa1de1f89fc3e340d7be300b8718ffafd301e74b7178"
    },
    {
      "file": "src/render/vis/eyecatch.ts",
      "sha256": "c0cfc8ef0ac38ad6b0b56fb6f3b71da75e4f5f4aa01e99caf2ae56a53ecba216"
    },
    {
      "file": "src/render/vis/feedingCueLayer.ts",
      "sha256": "a3f0322be72e4f5c449ec9a2a654f017502a25592d7a1a224fabdde4013a6ad7"
    },
    {
      "file": "src/render/vis/floors.ts",
      "sha256": "b3d9615145e84ee1ca40d0044b2f9f4fa23840fe4d4a4decb058826b5539bd37"
    },
    {
      "file": "src/render/vis/fluxLayer.ts",
      "sha256": "d6ab0088d11a1512b9b768e782bf189edbc8226e1da6cfee7439a4a56bd9ad71"
    },
    {
      "file": "src/render/vis/fogLayer.ts",
      "sha256": "7d60f347e61df437363926d911885a273bb18e2bae6551ce6f4d7fad9271a5b1"
    },
    {
      "file": "src/render/vis/foresightLayer.ts",
      "sha256": "f2429b647afb6df2ddc3f930985c627cc656b9d52007aaa42783d760f56dce59"
    },
    {
      "file": "src/render/vis/formationIdentity.ts",
      "sha256": "c6ec484d102f59eb3c12db75db711fa2a64639dc4d09cd46ebd978f98e980459"
    },
    {
      "file": "src/render/vis/garrisonName.ts",
      "sha256": "85e7a08ed40c6ce1f9b0936cfc41b2d0e62effba49c56841dc7958a40be085d6"
    },
    {
      "file": "src/render/vis/geyserLayer.ts",
      "sha256": "38375e252d764ba639c7377f6340893f67b772e38da65de7e68b0a3f2d8a0d8c"
    },
    {
      "file": "src/render/vis/glyphDoodad.ts",
      "sha256": "dfb05c608072038c221e9e930cae58cc9a1772990b4e6981c22be4b27f573be6"
    },
    {
      "file": "src/render/vis/ground.ts",
      "sha256": "14c4a72e080710fdc9af67427d035a752e14fa310e7ea23d30b6b0d8526a9861"
    },
    {
      "file": "src/render/vis/groundRising.ts",
      "sha256": "6e0e5b9dc32d84e9879d479930eb1deb7e211127c9572d4482bc1b31344f91ff"
    },
    {
      "file": "src/render/vis/guardArtsLayer.ts",
      "sha256": "93153e2281d42d6389cdcad99f1f5941b4dee7a5a01ef2da65e8e5777146c897"
    },
    {
      "file": "src/render/vis/guardianLayer.ts",
      "sha256": "fc3a8631a96c6b4ce2c98d474caf881f96836b2cfad23d7e39930c9ed5a9b250"
    },
    {
      "file": "src/render/vis/hitFlash.ts",
      "sha256": "ed78fc84b3d0d3e8efc6e68ae636fe20e54a2daa6670102e73015b46a212dd39"
    },
    {
      "file": "src/render/vis/hudText.ts",
      "sha256": "8c204f91964217266feb2d356b8f8fcf0a949c2165d82d926aa2b4cd80292f7f"
    },
    {
      "file": "src/render/vis/lakeLayer.ts",
      "sha256": "55e5bd352243cd056b7671c63c3aaf77b9cd47baeea1e6472f1fa8c142a39f5f"
    },
    {
      "file": "src/render/vis/lightningVoice.ts",
      "sha256": "16c129698f83ba9c027a4be2e98cac0550a952c68ae94203da47e4f65e997e42"
    },
    {
      "file": "src/render/vis/lights.ts",
      "sha256": "9e1d40f9837844766bc6a8299e136df4b5534eb4c9f9bc485d1c5dc22aa61d4c"
    },
    {
      "file": "src/render/vis/magicPackLayer.ts",
      "sha256": "78ae1d421f0200989a47898ec790fd1c1f88859bf908cc73e4ae930d04cc9ca8"
    },
    {
      "file": "src/render/vis/materials.ts",
      "sha256": "dfa1f5b4982520737b327b3e5cc90ee0bd6c32f27780fdc15d5f54d168b308b9"
    },
    {
      "file": "src/render/vis/meleeReachLayer.ts",
      "sha256": "e01145abb1ed0d6297e54fccdc63c22a643a170c263ab47b657592184aa57a9b"
    },
    {
      "file": "src/render/vis/metalSpikes.ts",
      "sha256": "7e28be107d3323ac3278f89465ac1f20dfcf4dfe6300afdcca0b1e24ee19a179"
    },
    {
      "file": "src/render/vis/movementTetherLayer.ts",
      "sha256": "5d82074b4170e9c2a38f495e8e7c19e73a74953e7fc919ef402d6b29a39a802b"
    },
    {
      "file": "src/render/vis/needleCrown.ts",
      "sha256": "51eff4994c1cf11aae9ee3f93f58a2ffc965d4abf517111f8187c1092fbe79f9"
    },
    {
      "file": "src/render/vis/noticeLayout.ts",
      "sha256": "49ba1454df456bbebbca7fe2b542ae703b426d7ce03d8dc92c3398f75478af69"
    },
    {
      "file": "src/render/vis/objectiveReadout.ts",
      "sha256": "737c34f36ebb7cde14c8375d49d482f8ebfc2255ac1e49408637190b6fa74116"
    },
    {
      "file": "src/render/vis/orbMote.ts",
      "sha256": "2d20530eb3b12f58257a8b0ce56f4e96d8cac113c9e05283dade8da88662018b"
    },
    {
      "file": "src/render/vis/overlays.ts",
      "sha256": "39b5e411da94b75237c99061a2ed681848853eb4b3b047b01b1c91b3388cc34a"
    },
    {
      "file": "src/render/vis/painters.ts",
      "sha256": "3790964f8a2af548bfdcb9c4466b2bde490931edea2d0a57008db060abc23ea8"
    },
    {
      "file": "src/render/vis/paintersAether.ts",
      "sha256": "574ddcee2264539d1a4bcd9f43b13e789df17da69d2b84224c37f1e1f54005c0"
    },
    {
      "file": "src/render/vis/paintersGarden.ts",
      "sha256": "e168bbf1b5651340c5142fd71dcb8a2d7bb2dcbc9c2e373ee616e88ac8dca760"
    },
    {
      "file": "src/render/vis/paintersGloam.ts",
      "sha256": "a4f7857690db65e4ba25e3b33ed8dd3ae61d185194e1b41b046d5f05b7443b92"
    },
    {
      "file": "src/render/vis/paintersGrove.ts",
      "sha256": "a453a2b9cca451e8d0fd90423b6903bb7f57ab632a994c4c5cbd98c1a2143e30"
    },
    {
      "file": "src/render/vis/paintersHallow.ts",
      "sha256": "cc9d0a193c015ba85f6f934c336de583678321b99058b9635d053d1c97b3ad95"
    },
    {
      "file": "src/render/vis/paintersHome.ts",
      "sha256": "09f997c4b6f3896501f8bfc15b5bfd10d9df59e44eeab4a63386d945553123b1"
    },
    {
      "file": "src/render/vis/paintersInn.ts",
      "sha256": "f982e48552cdc7f69026817654a42a9591b3c6fcd58085cd04f75d3cf84fb030"
    },
    {
      "file": "src/render/vis/paintersSea.ts",
      "sha256": "211af8355862dd8b3f026c46ab77d32a8c48a89bbe4a80ef79eabe557e812201"
    },
    {
      "file": "src/render/vis/paintersWarfront.ts",
      "sha256": "c22ffd25bee5c2937a7dd4ef1b4cb651a06afb11201ad292fc3178cdfc40a267"
    },
    {
      "file": "src/render/vis/parts.ts",
      "sha256": "ca262d22a6b9a3a8f4a4b843fb4178ba5fb2276f2560cbef0b7b8873d235a51b"
    },
    {
      "file": "src/render/vis/payloadCueLayer.ts",
      "sha256": "d24a1806a80056d37a4585da12787d2bbc707029accb9e97f1571abf7ce0edb8"
    },
    {
      "file": "src/render/vis/playerDeath.ts",
      "sha256": "5bc8f7fd7fe789309f495c101201cdec46462dc35aefe52daf082c3bba53580a"
    },
    {
      "file": "src/render/vis/portrait.ts",
      "sha256": "9d0070bb56090e45a8849cf6ac132e6c85c34027cc652561f21a06f745593670"
    },
    {
      "file": "src/render/vis/procCueLayer.ts",
      "sha256": "e0ad46573ec1d8a6345bea65c570ecafb6648b638d36e6bca698135639a991cc"
    },
    {
      "file": "src/render/vis/projectileBounds.ts",
      "sha256": "b97dd4782fe2f1d8f4a4e8f6ebb565363a40f759294a2814022434df3ebe50d0"
    },
    {
      "file": "src/render/vis/questCompass.ts",
      "sha256": "d0383c4b9af2baaf7d110f5e9833f14ac19c57582fa64cc7b93d977d4c0bce74"
    },
    {
      "file": "src/render/vis/raisedGuard.ts",
      "sha256": "4dc80013fe11d75929f38ee913bb95e4db241405c6fcf3cf9c872b9b3ec3b13f"
    },
    {
      "file": "src/render/vis/readableLight.ts",
      "sha256": "448f042dedc5b6790c728be2b5d1bd261bc9ec1491330add6abd075c8fe4396e"
    },
    {
      "file": "src/render/vis/refugeDeparture.ts",
      "sha256": "4fc61f1f611070a2c189c57382bf7dc8e44b0522804c2c527b5e9714810cd174"
    },
    {
      "file": "src/render/vis/regionMaterials.ts",
      "sha256": "e493bec65747d14d14129da01f0a0dd5a675bd4b2cc00e590852d4e22c599107"
    },
    {
      "file": "src/render/vis/reserveCueLayer.ts",
      "sha256": "b0e8259615c4bff42e4db07737bf70f68b4c664f63d85bc7942b4e3ac374ba9e"
    },
    {
      "file": "src/render/vis/resourceFlowLayer.ts",
      "sha256": "d482a220aa4faf9dbe96cba2a219eacadcd96779d076e01d1d5185f1c8ac3464"
    },
    {
      "file": "src/render/vis/rewardLabels.ts",
      "sha256": "565583b65bff377eb6840740d8f95d0d9b05862840b68c0f878ab8e2762450cf"
    },
    {
      "file": "src/render/vis/rockFaceEntrance.ts",
      "sha256": "554e603ace0a2852972e253bdbe842e8314892ea083a33e7431820725972a99b"
    },
    {
      "file": "src/render/vis/roomVeil.ts",
      "sha256": "5af20c1138fed5c13607ac66b250e589520f91eaaa1ccb441add812e6183d4b0"
    },
    {
      "file": "src/render/vis/runeRing.ts",
      "sha256": "08131a7f0ec6cb1e14c43b02857bc6feb2e501eff88f24867354bb277abf0583"
    },
    {
      "file": "src/render/vis/satelliteLayer.ts",
      "sha256": "9ec2796cc278140fde4e64f9edbaf54e9eb2d738dc8058b6c8877ff00d114146"
    },
    {
      "file": "src/render/vis/sight.ts",
      "sha256": "ba540b50d3bfa97fb61d0a9410aa046e596e5ed9918106ef3f088100eb79fe03"
    },
    {
      "file": "src/render/vis/sightVeil.ts",
      "sha256": "2e1a1e50c61b2d814b8156b78bb6bb7f0202657a2b93a735ee8a3ef063a9d4d8"
    },
    {
      "file": "src/render/vis/skillBurstVoice.ts",
      "sha256": "78ad12e2da2ccaae9abaeb43c777ac8482bfc761328f976f53fe22cc192db7ea"
    },
    {
      "file": "src/render/vis/skillCastPreparation.ts",
      "sha256": "96e632dd1f99294e441e81ec2b0dc52a12c3b7565bbce0c2c92e219cb3f56d45"
    },
    {
      "file": "src/render/vis/skillFlightVoice.ts",
      "sha256": "d567339f273afc02982f361a92f2e7bb6a828ce203ebd43260c362b09438ebd0"
    },
    {
      "file": "src/render/vis/skillMovementVoice.ts",
      "sha256": "4a474b86b94886160d2d0777597779a1e2ff588b21088f41c70ebbb2a44c6cf2"
    },
    {
      "file": "src/render/vis/skillPresenceVoice.ts",
      "sha256": "d576ba1e5d4390132a41de554a4e16d139a3a4fbc9e4519a3be9706762194347"
    },
    {
      "file": "src/render/vis/skillSelfVoice.ts",
      "sha256": "e3a0eae8e24c66d314aae4c81dbb525f0fa154ae7d550e99512988988f39f08f"
    },
    {
      "file": "src/render/vis/skillStrikeVoice.ts",
      "sha256": "93ab341a5199146587d441aa4607aca6f70885af181399c52cbcf79e6e570522"
    },
    {
      "file": "src/render/vis/skillTargetVoice.ts",
      "sha256": "a89d248f23e4ef9a73ca3d1be41864e517d9239e313d4d27bd2988d7bbe69fd3"
    },
    {
      "file": "src/render/vis/speech.ts",
      "sha256": "ca44714cd85f629692e444fbdabd85de9fa02559c867542dba63f6bac9872c18"
    },
    {
      "file": "src/render/vis/sprites.ts",
      "sha256": "0b5b902c534955aae04ef44c31c75b0fc98556232b6748713a6794b246e0f875"
    },
    {
      "file": "src/render/vis/statue.ts",
      "sha256": "fb90cd74ee916d89772961bf657ca923ac6555a545aaefdc1ea9abc2f1b6db3b"
    },
    {
      "file": "src/render/vis/statusIcons.ts",
      "sha256": "6818d8b14a1460bd1e9ad462466df525e6018b9754555705a31bb66612e9487b"
    },
    {
      "file": "src/render/vis/statusReadout.ts",
      "sha256": "b0cbf095217fc5b383b7e4052257b41209d241abe34c960b140c244d3da2cc78"
    },
    {
      "file": "src/render/vis/statusVoiceLayer.ts",
      "sha256": "e2013a1f132e0282a013b7476f36f130124c99b30ff9afccd37ca5cacf14beff"
    },
    {
      "file": "src/render/vis/trackLayer.ts",
      "sha256": "4274a4ee74db2d6a3c641d19ed9b495d65cbc678482c00a52171cda5ffa8e259"
    },
    {
      "file": "src/render/vis/trapLayer.ts",
      "sha256": "61fee7eacc74116da4da09488f46e79c53d7a57ec98560265de8825c1aee3a0b"
    },
    {
      "file": "src/render/vis/understory.ts",
      "sha256": "d1114f829e4b27d5efab8a7aa549e7e3de55f4824683ca424196343813f49d35"
    },
    {
      "file": "src/render/vis/ventRideLayer.ts",
      "sha256": "e4ebd5d2ab57a907cb455be44056b8e005357cf82a13acfd75f45e0a68eb82ea"
    },
    {
      "file": "src/render/vis/visConfig.ts",
      "sha256": "1404f504586709b74bc2dbc9945677fbc999e758f5593f8b18ff2161a40d5582"
    },
    {
      "file": "src/render/vis/voidFrame.ts",
      "sha256": "2016cb93f837c3cb65bdf4db2b38977a45edf476faab547a8abf58826f3ef9fa"
    },
    {
      "file": "src/render/vis/walkParts.ts",
      "sha256": "cd2a2a87fa4b4203e1d5b80a53f5fd3bc0b7876267d0e873c84d4234778d0d39"
    },
    {
      "file": "src/render/vis/wallEyes.ts",
      "sha256": "ccd4554504b4c868633a25f4ad54f2d0205ae18b49492124234c81dc441db80d"
    },
    {
      "file": "src/render/vis/warningCueLayer.ts",
      "sha256": "345d317c73c8f31658f37e47dd8222a64f64894422d4c7ae04c6510af5baee99"
    },
    {
      "file": "src/render/vis/watchLayer.ts",
      "sha256": "8d9c7cb1ffcb50b483ec47564120c0d5694fb0aa6735e304586f6bebd3d0b4a6"
    },
    {
      "file": "src/render/vis/waterSurface.ts",
      "sha256": "82ec546bb27b4e4d3b076e02fe29800e0c278fc7757870c75c18b8025312d264"
    },
    {
      "file": "src/render/vis/weatherFx.ts",
      "sha256": "11a47afd26527d3f490970c9b07b011c1e6cd32a7275219b4016416b2db885cf"
    },
    {
      "file": "src/render/vis/worldVoices.ts",
      "sha256": "d6bbf4e0650b5e56bbb7f14c6f3f759575851674957c24ad0ace365501fb6651"
    },
    {
      "file": "src/showcase/engine.ts",
      "sha256": "b13953ade2fb5d8f8880418c647c71ee6a653b734e6424f736e0447afa6347ba"
    },
    {
      "file": "src/showcase/host.ts",
      "sha256": "2473f45d510f777cd1d178cc9c1aad1f378f4842ddca3ee530fb594c7bf2d389"
    },
    {
      "file": "src/showcase/shield.ts",
      "sha256": "168cd7fccf508560efffc346f723c75d843a053e51eb4be9b7cac3cb40acf7c3"
    },
    {
      "file": "src/showcase/stage.ts",
      "sha256": "afe5752fbd0ba64fee983f0a6b747a0db35bca7a00c1b52ccb345fa52daea87e"
    },
    {
      "file": "src/showcase/stagePlan.ts",
      "sha256": "876877ddb8a5ba4a4b2e1de096abab145ec1e0031a035230ce67db5c7d51e80e"
    },
    {
      "file": "src/sim/arena.ts",
      "sha256": "31b6fe72f6a7c3b1ab8d272ca751c74dcb35fd7b0d0ac7448fd42895e96ff11e"
    },
    {
      "file": "src/sim/builds.ts",
      "sha256": "31a7732ae591240f12e82e81be12c2516dc9cb0110e9b9f74e357e7ffbb64cca"
    },
    {
      "file": "src/sim/compat.ts",
      "sha256": "9af7ac13bc39b95e727f0824c2e004a371eaf333aa5f96c8b18fa8c164f6f0e0"
    },
    {
      "file": "src/sim/data/builds.ts",
      "sha256": "c6d146f91cd343502d236eab8099f8d00bc339c1d0962e21a1ad7dab98dc859c"
    },
    {
      "file": "src/sim/data/panels.ts",
      "sha256": "00de38c4668ac50b2934f4438a37551184d62fe94f018d653316819d1aa52eb5"
    },
    {
      "file": "src/sim/data/scenarios.ts",
      "sha256": "ec6a89d34ae369c1a9312c59765009cfaf8ce01b1d093644ab60a099b58476f8"
    },
    {
      "file": "src/sim/data/targets.ts",
      "sha256": "53d59bd0ac53abab40b2517b73e1045dd3041a975b4927db37dba660736d0b34"
    },
    {
      "file": "src/sim/economy.ts",
      "sha256": "d91ceaf8c8934d07fc79c0689cb71f66acebd8d5ec8f01dd979166d57465a5b3"
    },
    {
      "file": "src/sim/ledger.ts",
      "sha256": "152d9fa13a4311cfc524b21030415a2fe3704266d010bdf2b46da079dc5e3287"
    },
    {
      "file": "src/sim/metrics.ts",
      "sha256": "b1727f4f79ebd0b33b895d84c4c620fbd8dd3e7cedafc68c9f158b0ac4e9e540"
    },
    {
      "file": "src/sim/pilots.ts",
      "sha256": "fd90f58d8bb7e96e4839b1abe8d8e8e5443627dbfc2c2554f7c45a384d3ca091"
    },
    {
      "file": "src/sim/rng.ts",
      "sha256": "4b9d3a72eee7f115ddc9cd9e414c6241429956f681db1e88a8a2506156c1df43"
    },
    {
      "file": "src/sim/runner.ts",
      "sha256": "1e99c5145188635fba7f01de127399038d8f816d1cf6ca23505431707955accf"
    },
    {
      "file": "src/sim/shims.ts",
      "sha256": "3d6915881f4dec28401ee64576064045917444f3e48cf7594ad34f1ea88b137b"
    },
    {
      "file": "src/sim/textures.ts",
      "sha256": "1582707458672563034747f482b3946e1842898bafa1c47170051195b3d6fbcf"
    },
    {
      "file": "src/sim/types.ts",
      "sha256": "a4133c4c9905689189434c42baa8c836e81e71fab3aad45aa2d05ec46d3beeb0"
    },
    {
      "file": "src/ui/atlasBudget.ts",
      "sha256": "c09aacfa02eee06729f854348d0f94db4fd6d0fd76eb2c0b3af7902dc8fe097c"
    },
    {
      "file": "src/ui/atlasInputCache.ts",
      "sha256": "b4b2200479c142631ca724ffaad802ff9932892f61f5f97c5d1b41b6b6dd292b"
    },
    {
      "file": "src/ui/atlasPaint.ts",
      "sha256": "d0f7994e95a5961a8e9fc6a1e49eca3708e69ab5dfc7c7653546cd6860bc2340"
    },
    {
      "file": "src/ui/buildPanels.ts",
      "sha256": "36ee5d3164e7bcaa747170011c6ea19265c39db2f4ce783bbfafe1e1ca7b285f"
    },
    {
      "file": "src/ui/containerPane.ts",
      "sha256": "957abdcc7d93ca0b9d43741251b6b6ac2b8a893d882d843a7e89dbb7be4c858e"
    },
    {
      "file": "src/ui/couchJoin.ts",
      "sha256": "1a4cc5705f4d96de73abc235693eae90749829cc2c47a5e29feb0c318cf8191e"
    },
    {
      "file": "src/ui/dialogue.ts",
      "sha256": "a08f5b3cfc05dc9146be31d64fa83903890c6d6d1df15325d1a9e8256d6c92ee"
    },
    {
      "file": "src/ui/dialogueLayout.ts",
      "sha256": "234a476f999faf1dbc6aef17dd487d73b1720ef1c555bd63e05a74939e1fbd4f"
    },
    {
      "file": "src/ui/dnd.ts",
      "sha256": "e9c696f21cdc97a0ceb3a1d7c1f2cf6026dd3f7a0248f94e2052e668d6ee1214"
    },
    {
      "file": "src/ui/dom.ts",
      "sha256": "74fcc77660894de51a40d7dc14782718b81988fe6ae7a4a3402adb6f8f4c62f7"
    },
    {
      "file": "src/ui/errorOverlay.ts",
      "sha256": "2f634080718f7cb1fbe2942967d267c949dd9dae0d16cdaa4748576b50ddfbf0"
    },
    {
      "file": "src/ui/escapeConfig.ts",
      "sha256": "5e37c48f2bf6f82f20ae1a6615f83001a4c6e6215a05bcef8ceaae9869054780"
    },
    {
      "file": "src/ui/folio.ts",
      "sha256": "c3d22676ac785d6ce2800f203d1d100fa28dea2089dc0fd28ecb942b9a0d9807"
    },
    {
      "file": "src/ui/icons.ts",
      "sha256": "24a17ef2d5799d0b9f3049d3f18f23dd424ad1f74e81741cdce2395800797c76"
    },
    {
      "file": "src/ui/inventoryPages.ts",
      "sha256": "24acb9826205443e0aafd188fd0f965111017b3fc948a3ecc6fe4a0e1ba141f5"
    },
    {
      "file": "src/ui/itemhold.ts",
      "sha256": "85b90c046bd519f9afbf8de75fd9875e47c0eb3aa61c85ba7fe1bd3065384d04"
    },
    {
      "file": "src/ui/loadingScreen.ts",
      "sha256": "65233f8e5abcd8ab70c17fc9c544be19efdb3eab8c43321f477a6bc35328c744"
    },
    {
      "file": "src/ui/lobby.ts",
      "sha256": "147f7ba8a7ff2cc29ab148a5afc5c76581550221e7f241e7895e378b6bd778a3"
    },
    {
      "file": "src/ui/mapBearings.ts",
      "sha256": "91ac5669845f3cbf4ae2b1bff0047cdfffe6f5074bf93a141c8d162475c25cc6"
    },
    {
      "file": "src/ui/mapConfig.ts",
      "sha256": "a12de41a9f11ffcb16bf3404183d10526a46f65cad5a572591943375f5ff1a73"
    },
    {
      "file": "src/ui/mapLens.ts",
      "sha256": "8e0ecab5a25106d3d124b90c07a3fd97e6be46c3cdc4ddc95c76e11e18f17cf2"
    },
    {
      "file": "src/ui/mapViewport.ts",
      "sha256": "e1543aca99cea1d95d1a751de428efc6532de4cdf686b2e703d7c28212776c59"
    },
    {
      "file": "src/ui/menuConfig.ts",
      "sha256": "0994c456dcb4e60efb9b418a762a3fada2045788d1fc2ebf5f20dae84fe8cb43"
    },
    {
      "file": "src/ui/menubar.ts",
      "sha256": "16245ad2d556bd44feccc9ffc27bc886e60d9be75035ca45c4f9b9838f140181"
    },
    {
      "file": "src/ui/minigames.ts",
      "sha256": "cde5c9eb352b59fa096860d02d068def983192e59afb02c11797a1443a58bf50"
    },
    {
      "file": "src/ui/npcConversation.ts",
      "sha256": "2b38c0b669fbaa618d3f9d3df3570444c6831fa52cc2d1db728259473c29aac6"
    },
    {
      "file": "src/ui/padpointer.ts",
      "sha256": "926c50a5018d48c3a322c2ecd8523b9bc09e69536f51b99b17a100025ef4e4ca"
    },
    {
      "file": "src/ui/panelmove.ts",
      "sha256": "705186ca382c53f96ad7b13f8ab64acb3be02f4cd340be743a615f28d4e42767"
    },
    {
      "file": "src/ui/panels.ts",
      "sha256": "d12284a4310c380ee54d2d20719391d9500c9a648deaefa2c92d633795160809"
    },
    {
      "file": "src/ui/panzoom.ts",
      "sha256": "983ca756c2b1e7ecfabe5ff3fef0f64c68fcb6c872e4013c0e79228ad7a54e46"
    },
    {
      "file": "src/ui/party.ts",
      "sha256": "5ed36219815245b5869e86c2f7219240cc82ab8c907842ae2d384e5d471747cb"
    },
    {
      "file": "src/ui/passiveFrontier.ts",
      "sha256": "43fe6b5b1cf4c1196c0ad9787aa0461a3ee3762c212ec4a4030b564c94690ba2"
    },
    {
      "file": "src/ui/portalConfig.ts",
      "sha256": "0a0ff13f5eeb156ded615f79c0c7698ec2af0e993451ee1912f843dee20d8f24"
    },
    {
      "file": "src/ui/portalbutton.ts",
      "sha256": "8835a1743d7d7848ddbda2807cff650fbc1b849b9ade4a33263064c8b55a1205"
    },
    {
      "file": "src/ui/questOffers.ts",
      "sha256": "21c76989aefec7dfd6eb0d767e0b86e77d5ab2c83943d0a1c55bf37898117bbc"
    },
    {
      "file": "src/ui/questRewards.ts",
      "sha256": "1609bf85ea96aa341e3798827280d68ff101c136de804f5eaaf40948669d532d"
    },
    {
      "file": "src/ui/reliquary.ts",
      "sha256": "fd790130fccc7c3cde5e7334a54ab946ea5d67f2837903e7ead5fddd0010300c"
    },
    {
      "file": "src/ui/roadGuide.ts",
      "sha256": "819566120d1ed6c1099cce0ecdf357df1fc068a0bcdefe6b3fb1ebdc8721ccf7"
    },
    {
      "file": "src/ui/serviceWorkspace.ts",
      "sha256": "9b02634dfd749c11b2ba0bce6c8f033cb1232eb824bad688576eb90a77cefd9a"
    },
    {
      "file": "src/ui/skillPreparation.ts",
      "sha256": "097f4fa96c9417aad6c92c849964b488295c7b2a477448adfe497b71564b525f"
    },
    {
      "file": "src/ui/stash.ts",
      "sha256": "360fa7d81ff64683b5c09a6f61b5d5e35f59662b7618d91a9b97ae7149e80d67"
    },
    {
      "file": "src/ui/storedSupports.ts",
      "sha256": "f99844ce9a45a318e06dc7e68aa1b9c3afe681bd183347d0d44d44d200a5ec74"
    },
    {
      "file": "src/ui/supportCompatibility.ts",
      "sha256": "6a5aa50d6bc46dfc6d7a0ec10ed7c153ef9e95e9179c81144c181a73b67841a2"
    },
    {
      "file": "src/ui/swapReadiness.ts",
      "sha256": "ec2bd2fb500c596f08ea4d494e122f505d2da280d175fa07de1336b5e5cbf6c6"
    },
    {
      "file": "src/ui/tooltip.ts",
      "sha256": "685d4863741b8f4b5bf80e7d99f64a7903f0ba0aee58852d28e595f3a75e8e29"
    },
    {
      "file": "src/ui/uiScale.ts",
      "sha256": "26e55702d84fc16aaff39dd52fa76e33ad176bcdf9f8d657856879440fd5019c"
    },
    {
      "file": "src/ui/wardrobe.ts",
      "sha256": "3a55335ae08341135c4b6e1dcd47fa311d4dd415f3d86d62e165ada55d834161"
    },
    {
      "file": "src/ui/zorder.ts",
      "sha256": "956d31992a75630310256b4d6930bae9c42f5fa38b6564382fcc4a5185574aad"
    },
    {
      "file": "src/world/atlas.ts",
      "sha256": "2a8bf87b5e01ce1f4a01e3029858dbea93544e63884d2d09f48d81b4f0a619f7"
    },
    {
      "file": "src/world/attention.ts",
      "sha256": "cbf43a3e2554b877473a567067ab8268ac5929a4c445d81347cc0a5621fc1285"
    },
    {
      "file": "src/world/biomeField.ts",
      "sha256": "3e3e0c37598407c5df3956dec0d20b4f85fb8454cc828b7884d911cc69858940"
    },
    {
      "file": "src/world/biomes.ts",
      "sha256": "d515fa5ea4413bdd4e0b9e75a93744ac54ecab93c669dafce06e7514735a0c34"
    },
    {
      "file": "src/world/bountyRoutes.ts",
      "sha256": "54085fc29900b034b01a5159881d0f46fc178cbbd374bb966f1fc6bd618ec985"
    },
    {
      "file": "src/world/bulletins.ts",
      "sha256": "5f480223d79512a6e32a8d0f4755ca148b4be3c5064928bace16f34326a82c50"
    },
    {
      "file": "src/world/captureGeography.ts",
      "sha256": "654798ac0b198aa5c548ceb4c26cc11c25d4ffd6c3c248fe60ff761b3b01664d"
    },
    {
      "file": "src/world/civics.ts",
      "sha256": "9bcfc5b7001109ea4c6d0799debd2d2969165a392d0dd3e3f0302b6f6e4575ad"
    },
    {
      "file": "src/world/climate.ts",
      "sha256": "bd67a06a6809959d9b2ea1387979c411f612b8d836dd404fdfe3b993e0ac7149"
    },
    {
      "file": "src/world/climateCore.ts",
      "sha256": "2c6b97ca00254e7a7f8dd646312406228fb90a57afa3ef8ecc3a1ab9c78fdfed"
    },
    {
      "file": "src/world/continentCore.ts",
      "sha256": "03f44f82f7caf0f5616ff4ea2f7270acf2d9bccb43290196b308a1337fd08303"
    },
    {
      "file": "src/world/continents.ts",
      "sha256": "458a98bd091645e3b4e57755b3ae2adb1c5d4fc1f9a2444d7d4f7fc03f46b10a"
    },
    {
      "file": "src/world/coords.ts",
      "sha256": "fded7edd91dbbbdcebfd8d00c437ef294f01e876b5127ff9324601c958c599bd"
    },
    {
      "file": "src/world/courseStages.ts",
      "sha256": "deb65a351862b788524a815fc07fc5ff03aab92c19d6112b7291a6130b5dacea"
    },
    {
      "file": "src/world/courses.ts",
      "sha256": "e20bd418d3df5e11a605e8caf479a446fb0b48b496783ad32e4baac4352df098"
    },
    {
      "file": "src/world/daynight.ts",
      "sha256": "ea91652bef417547abb7ee530b5d6dd9ea0edd777781442b6ab1876187eb2459"
    },
    {
      "file": "src/world/dimensionGeometry.ts",
      "sha256": "3e296e6a25b61013a9853a83e8725c2767f04c2756125c754f197aa1e932583c"
    },
    {
      "file": "src/world/dimensions.ts",
      "sha256": "812f2dcc8ed8fa46c0ba59b769fbcbcf1d68b6e79e7fd2cc62e5823c18c5b5e0"
    },
    {
      "file": "src/world/drives.ts",
      "sha256": "929e6c32edd115cd9a3495e4904815ddaffcdb2b629a0acc1b8f0dc57c9a4d36"
    },
    {
      "file": "src/world/edgeBlocks.ts",
      "sha256": "ac282f92c8732935e375ae15bf8e6e872408456947220658e32be3d151714c0c"
    },
    {
      "file": "src/world/escarpments.ts",
      "sha256": "06f2bc0adf8184c97cf4fdee48c77268b68c8a0e3791735f8578cc1490f56a3e"
    },
    {
      "file": "src/world/faction.ts",
      "sha256": "32427cf0dd6c32d55a956a458cf12bf8fe5286609106f3a9f8b7137047cdd439"
    },
    {
      "file": "src/world/featureActivity.ts",
      "sha256": "c2d50fb13e08873c557d642b3b642025cfe0bc8e0406ac5be16e088265937560"
    },
    {
      "file": "src/world/fieldChoice.ts",
      "sha256": "18ea0f96c03ec2f7997ee77f3684b8abffa34656316ab762d74c5890a8fd206d"
    },
    {
      "file": "src/world/fieldRegion.ts",
      "sha256": "aa9a2af78188d3805ad9256f8a6e7489568830de1ffc7aec1373bcc6a19e4c95"
    },
    {
      "file": "src/world/forechart.ts",
      "sha256": "f17371f8f2992949cd978291ff14f3156f0cc246865a0018753dc5e5007cc632"
    },
    {
      "file": "src/world/geographySource.ts",
      "sha256": "86a256bbdf10aca951fc6a776908648d3bba5c44c75c09b3382df3270d7b620c"
    },
    {
      "file": "src/world/gridWalk.ts",
      "sha256": "32a12d0e74078641b827cff8c93fbd60c1a89609d507c0919423639b2e3e5c16"
    },
    {
      "file": "src/world/harborholds.ts",
      "sha256": "49f2bc973096a4ba8c1d194d45c2ad624e4a5d7ba45329c35fc8e3f8c2e20397"
    },
    {
      "file": "src/world/invasion.ts",
      "sha256": "46aa38276a06fe9a19243e8ef40c2b211d0903419c5bb8f934500c53c7ebcfc8"
    },
    {
      "file": "src/world/landmarkComplexes.ts",
      "sha256": "0b7adc3551c0910aabf73d0e7d57d49cf95918b83b63ee92e52d25844603dd1c"
    },
    {
      "file": "src/world/levelField.ts",
      "sha256": "da8ee47119eae6f2f3daa60de97626a1e966a7261cbd6e771b8849e91b76a823"
    },
    {
      "file": "src/world/localeFragments.ts",
      "sha256": "e4203e3492717e4c4b893a644c2812d2e2c75236d8d78eb2d8830586f71cdf0b"
    },
    {
      "file": "src/world/locales.ts",
      "sha256": "d60674bab125eb9dae681d72bdfd216e36563a2d76940c0e82b9925cfc7e74f2"
    },
    {
      "file": "src/world/mapMarkers.ts",
      "sha256": "670facef90abe26eacdfa0f8c69cc009478927d4107e0b05534381dca7ed5e3e"
    },
    {
      "file": "src/world/odyssey.ts",
      "sha256": "e1f61f3f45154772c9e79066588136cc7efb3731e2da74cb40798b014a032580"
    },
    {
      "file": "src/world/odysseyPressure.ts",
      "sha256": "26232832b5c4417a33bd4779dd75b53025330ba1873f3c01cc17056204902542"
    },
    {
      "file": "src/world/odysseyRisings.ts",
      "sha256": "0c711eb5ad6ffc5baf5292ce64d20ff2d9620041a070127876506957c5fad6fb"
    },
    {
      "file": "src/world/omens.ts",
      "sha256": "38c10b62f2b9b34ca5650d0c4c64a20bf625c202e769892e2c6d35f17015bf63"
    },
    {
      "file": "src/world/openingProgression.ts",
      "sha256": "5df9cf425fef32f6e378816436b4f0cb647cbe448971facbb44af5477f782c4a"
    },
    {
      "file": "src/world/overlay.ts",
      "sha256": "b6bc1c41e185c6fc80213cb8b7f6b59c413273e7f3496dd07ca1325239187432"
    },
    {
      "file": "src/world/palette.ts",
      "sha256": "f77ce9e4e7c8cc64ea92fc43ad364b8c5f0e63f15b66401f904e6955cd653258"
    },
    {
      "file": "src/world/radiance.ts",
      "sha256": "2b53dc16a2fd285f708e8b47daebfae37e426b8daab26f1eb8b4d3f3b2dc1a32"
    },
    {
      "file": "src/world/regionGeometry.ts",
      "sha256": "ebd9a868b4f05fb3241b2c02f726ecf90165221acfe6ce8244e2f3db4e27d071"
    },
    {
      "file": "src/world/regions.ts",
      "sha256": "3ad59b11d397e5c5583d9e4c8a917d58f937439cbabaad67606334b0eb796aff"
    },
    {
      "file": "src/world/relief.ts",
      "sha256": "87961ed33ee2cacfb2c4e9a7f3a352aff9528ddb54392b5a6114f9b8d1cd1901"
    },
    {
      "file": "src/world/reputation.ts",
      "sha256": "7eb9e8ea905ed0d42fa0c14bfed7a487704522d8ed6b749f0182fa4eadd92176"
    },
    {
      "file": "src/world/seas.ts",
      "sha256": "82fa3856e88b3141dacfe05a907fd52774fbf2a47fe38fc4c215fd3e144b9e99"
    },
    {
      "file": "src/world/seats.ts",
      "sha256": "43b40c3368ca14113f2e9719df75ba41622985d3d7ef7f79185eecb78447af1c"
    },
    {
      "file": "src/world/shape.ts",
      "sha256": "daf83d9d1244efe6b216e06b59ae113db4ae00e637a336229f4d97023634be81"
    },
    {
      "file": "src/world/sim.ts",
      "sha256": "830425a48c9dee315f63d8438faaa6157688cb78c2ccd3804dc16e9de6ab95f5"
    },
    {
      "file": "src/world/soulriver.ts",
      "sha256": "00b8f3958ffe742ce1ba4c0b87e6a5898db1e286150ae297b591c75618b3aa36"
    },
    {
      "file": "src/world/strata.ts",
      "sha256": "5de0808db7630d9b6bc0ca5fbc5abc7e3c030190d8bf62ffc78c21fe601c7530"
    },
    {
      "file": "src/world/tilesetChoice.ts",
      "sha256": "ff40aa849ce0aa9e34ca2a1ab3a019a5da0b6a6fcfda8625c01313a44382bd49"
    },
    {
      "file": "src/world/traits.ts",
      "sha256": "e83276d34a073a605f1b4a3a2c268fc733b81ac16085d73c13832a37e125cf9e"
    },
    {
      "file": "src/world/travelRoutes.ts",
      "sha256": "0976d78145b4d0878918e3c7edc5771b2b77e3250295eabee82acc093c4df121"
    },
    {
      "file": "src/world/voyage.ts",
      "sha256": "2f43a737f174ce2b6593e0951c6a27d4e96486c22565e2e8c1f29a555a162c8a"
    },
    {
      "file": "src/world/walk.ts",
      "sha256": "45d50e47d698caaf6464b9eda2777840ece25e68883442ca6c4f048a89ca8eac"
    },
    {
      "file": "src/world/warfield.ts",
      "sha256": "61711517dac59cf762d41fa8706cf62e8936243d608e81aa93340359f3e1ccbe"
    },
    {
      "file": "src/world/warlord.ts",
      "sha256": "a0b14c99eec78a64c1ea725854f97c7d596bcfa6666f72523e135950cd8c8834"
    },
    {
      "file": "src/world/weather.ts",
      "sha256": "453cae4bf0c20f296b1d216284bcce9e6b6cd1480f9f4d4ba245eb87579e7634"
    },
    {
      "file": "src/world/zoneInfo.ts",
      "sha256": "8dccc68e276371a3aaa09d90e5a75dde4681be93cd682775ae55d7731a3a233b"
    },
    {
      "file": "src/world/zonePolicy.ts",
      "sha256": "e677ff1c52c8e7d26ba43f5f708d4f29e4d610c364591dd30dbbded5f4b989de"
    },
    {
      "file": "src/world/zoneVariety.ts",
      "sha256": "ffea30076fc64039cbff9ff5da54caa48449eb503e487938bc14d097596bf809"
    },
    {
      "file": "src/world/zoneWash.ts",
      "sha256": "b7c351b6ae7a1ce26f0a0bc5527003bbcfe6cb2d943522cee31ad75043a14fef"
    },
    {
      "file": "src/worldmass/activitySites.ts",
      "sha256": "06b19553171365e9b9ac5a3562ff088699d6657b4dfab45e30e6146b5e35172a"
    },
    {
      "file": "src/worldmass/address.ts",
      "sha256": "bf1632c89d12907f1bc614cf73b4c85ac3a16640bb90aacfc070450186214b56"
    },
    {
      "file": "src/worldmass/ambientPacks.ts",
      "sha256": "f4793b446f4d15c3efa78e786a619c24affa07703463f8ee79caa218496d23df"
    },
    {
      "file": "src/worldmass/biomes.ts",
      "sha256": "9059af98fd2ee33c3f61476f599e34de08650a5ff3d456152ede5ebec4b20ace"
    },
    {
      "file": "src/worldmass/birth.ts",
      "sha256": "5873b1b61552b3354b04264485d31a98656c3b797552eb45331f9921113b0d77"
    },
    {
      "file": "src/worldmass/bounties.ts",
      "sha256": "c12ecef4f2841146151d27f3f75ab2eaae683103c42f380c6471961d1a621e9d"
    },
    {
      "file": "src/worldmass/cartography.ts",
      "sha256": "1a37ddcb64db0f232fc7762fecba6da3eb8f01380b3b0e5e309f27e640a5b587"
    },
    {
      "file": "src/worldmass/caveStratum.ts",
      "sha256": "acc4d19c062a2a1d027ddbd0186ca2444b01e15316b88f879777a805599be2bd"
    },
    {
      "file": "src/worldmass/checkpoint.ts",
      "sha256": "a4b9960bfdecd583f9cc288e522bb25dfb91c7acb2504367a0ecd72043476939"
    },
    {
      "file": "src/worldmass/clearance.ts",
      "sha256": "4c44e3181ed7edba0163135bcf95432621bea1bfc9639eafc372d9d9e9f92ad4"
    },
    {
      "file": "src/worldmass/compilePort.ts",
      "sha256": "78e0a67129004bdb61736d180c4da85967db838b2ac849b92d22df587b6171f4"
    },
    {
      "file": "src/worldmass/contracts.ts",
      "sha256": "5b5782a124d45a2a40e6ed4c6eb5175ee367237340b41a46ef55353cf0e548c7"
    },
    {
      "file": "src/worldmass/countryOutposts.ts",
      "sha256": "249f743a8fdc91f7029de01ba336f547e0daa5479148d391fdacfcde869c33f1"
    },
    {
      "file": "src/worldmass/courtPuzzles.ts",
      "sha256": "427d0d9c3af6fb2211d6ca4f1814f428e86675daff04c3d863cee4062ffaab97"
    },
    {
      "file": "src/worldmass/dormancy.ts",
      "sha256": "41435e7f1892b5bbb6ca53b851e9c221039deba255fbd741c08ce2cb0e36dcaf"
    },
    {
      "file": "src/worldmass/ecology.ts",
      "sha256": "7fbd147049983079ec3e7fa8eba05c9a3fbef391a06c244a39f5c978698c67c0"
    },
    {
      "file": "src/worldmass/encounters.ts",
      "sha256": "772f9e3bfeb059142756cd3a5dda79daf4af9aaf1d5966a41b0935c4a19ff227"
    },
    {
      "file": "src/worldmass/fieldSites.ts",
      "sha256": "90d2e3bb58fb66f5e93b740e55a60ff4a609f5ad3df5714b64666924d9e83c3f"
    },
    {
      "file": "src/worldmass/fields.ts",
      "sha256": "9bcf0f9b651700d06588df3c3c7857f6b2b33863ec8e47f0eb67d4ebc23d07b3"
    },
    {
      "file": "src/worldmass/foci.ts",
      "sha256": "1af3e7119aaa27d261d58668f501e9be885d9155f512e1ab7b07461a8aabe8e8"
    },
    {
      "file": "src/worldmass/generator.ts",
      "sha256": "5221fa836d274d45842acf05764ff15b63cf13a80b49ae06b58c7e5d0a54e134"
    },
    {
      "file": "src/worldmass/geographicAccess.ts",
      "sha256": "5ec8cb9b1d27cd7a948b957907566dda85db1e1f0a07c8f486f011490db938d9"
    },
    {
      "file": "src/worldmass/geographicAccessCore.ts",
      "sha256": "8aa30125b22f112db4ceafb614e1790802d9bd910b5dffd31f6d9f3107fa0ec5"
    },
    {
      "file": "src/worldmass/geographicGameplay.ts",
      "sha256": "a96987cbd6f7ce738fd88261f8ad95bc377eef07bc23601260006e82e88b81da"
    },
    {
      "file": "src/worldmass/geographicObjectiveChoice.ts",
      "sha256": "0d7fb6a7af770872ab1cc9b0d4a083b10d4a3fd53733487de64bf0d26b9c0e3f"
    },
    {
      "file": "src/worldmass/geographicPlan.ts",
      "sha256": "747117363710c8bce888b68b61960febd78b751d5a560089b9ece95ccc9d64de"
    },
    {
      "file": "src/worldmass/geographicPlan.worker.ts",
      "sha256": "bc5aef182cb7e9bcb6e0cddad69ab9415d4861b23234174fb3970c0fbebbd2d6"
    },
    {
      "file": "src/worldmass/geographicWarm.ts",
      "sha256": "b69a5597d00af0c0f231a8266157bd8081a20e564731588f257471076aa13bb2"
    },
    {
      "file": "src/worldmass/ground.ts",
      "sha256": "7965a61e922a991b3a37f27d870b395c9026fec3a5d4588259b7b409484f6331"
    },
    {
      "file": "src/worldmass/hierarchy.ts",
      "sha256": "5fca8bfdfb59a74b948e4ce10669a399572fce63aab2a65cf36a8c373a625f99"
    },
    {
      "file": "src/worldmass/journey.ts",
      "sha256": "a9c1a1120214a84eb43d0752f4e3062b3e38cbf39776bc1c3ac0cdb01e6a38ca"
    },
    {
      "file": "src/worldmass/landformDressing.ts",
      "sha256": "3d6f093d6c78ef6810e842db9184e475febcca3f7328abdfd2dfe900dd62f492"
    },
    {
      "file": "src/worldmass/landformHabitats.ts",
      "sha256": "2e3753a60c7af6c78a428229860bcf05ddab26b5cc51af56267a33d2552cb282"
    },
    {
      "file": "src/worldmass/landformSources.ts",
      "sha256": "4e0f1e12c72cb9af274ecfee1f4cfd99a318e1e51d0520b24b07e20ca5b42f61"
    },
    {
      "file": "src/worldmass/landforms.ts",
      "sha256": "758d7cb37c43ca851470b0cc386b318a88f459c1470fa48a192a6cb62a0e0b85"
    },
    {
      "file": "src/worldmass/landmarks.ts",
      "sha256": "81a8c50a83e7b5dee764ba38a9e28c5c4e1ef352036dd8e82cdb855e6857d095"
    },
    {
      "file": "src/worldmass/mapLabels.ts",
      "sha256": "014924287fde0692dee2c173e7a867b38f0b015c74858952da560b785c1a6f30"
    },
    {
      "file": "src/worldmass/nativeArea.ts",
      "sha256": "030f50d35a01ba25a4ae4fb021180fad2f90ec2e43b8c11e024d989d0cf6a439"
    },
    {
      "file": "src/worldmass/nativeAreaActorAuthority.ts",
      "sha256": "6dd79cd7873dd0f9eb3500ee97476709bd0be87669c3d85d6694eddbe5d1c7c3"
    },
    {
      "file": "src/worldmass/nativeAreaAmbient.ts",
      "sha256": "8958fa9d804e9274a78da348fb1b739c3cd2ea8b94b99f9d4ddef3573759f1a6"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignFrameState.ts",
      "sha256": "7ebf9efdf43106afd63e5de905a7fb9baaa7c66d2edd68767c463099fe002c8a"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignInputState.ts",
      "sha256": "3e6a87d4fe45093cc3a4fa611e448e8a75258eb423e48630dc0c443bafb68f2e"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignOdyssey.ts",
      "sha256": "e6e79295b241b9081521a763bfd4b4f791feee1977c203fb877d06cce4ab7a5a"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignSession.ts",
      "sha256": "74af99df650e0f525ca73b222de2760d3ff76189add0464b26a7992bf80a3066"
    },
    {
      "file": "src/worldmass/nativeAreaCharacterCreation.ts",
      "sha256": "948788568ce35079894428f167efd9a3007bd8a93cec34367c70d3d5c2d57863"
    },
    {
      "file": "src/worldmass/nativeAreaCharacterResume.ts",
      "sha256": "f8d3c427ab217aa22f5506b7f927d9389facfc5ebc945eed01250be25673b633"
    },
    {
      "file": "src/worldmass/nativeAreaCombatOperation.ts",
      "sha256": "f9f98240c57ece5bed51b12e0cb6452186b222f7dcd2848f6f96b349770d25ec"
    },
    {
      "file": "src/worldmass/nativeAreaCompiler.ts",
      "sha256": "2ed4723b99ccf43fb22a5e65e3c875bc691882e8792be7a1756888f74fd99489"
    },
    {
      "file": "src/worldmass/nativeAreaDirectoryView.ts",
      "sha256": "f721bd52508aaecf47fbbe6b8fdc4ed9d7b5960cef26a5f5c83951e8b1267fb1"
    },
    {
      "file": "src/worldmass/nativeAreaFinalEntryPlan.ts",
      "sha256": "1380f05becde4b97121a374685183ac6679a9eff836276a7616bc56c64551a0e"
    },
    {
      "file": "src/worldmass/nativeAreaGeneration.ts",
      "sha256": "a4ea667f7034bf922b2419ad9e2eb7dd18ccd34f8b1b1ce9cece93ac772d6493"
    },
    {
      "file": "src/worldmass/nativeAreaGeometry.ts",
      "sha256": "7eff9475be05da3f37db09ba1240467b776c8f0e3314ae0e148befbd6997465d"
    },
    {
      "file": "src/worldmass/nativeAreaGeometryCapture.ts",
      "sha256": "764993077dc1323a6136d349909424ff48b2166eec42fbf4843fe20bc146473f"
    },
    {
      "file": "src/worldmass/nativeAreaHostedPresentation.ts",
      "sha256": "f998370e452d841ce24bcbb4994e0ab27452990b53e014f2a2c3ca21d59598a1"
    },
    {
      "file": "src/worldmass/nativeAreaHostedRoadSupport.ts",
      "sha256": "84d1e4c31a945246ef2aba40bde53ba0bd81f25e7da11e3f4073c48b87e97821"
    },
    {
      "file": "src/worldmass/nativeAreaHostedSnapshots.ts",
      "sha256": "c2ffa21d309b5a23c682437296cc28e91f7a66c109b73b56c93f12be5062a482"
    },
    {
      "file": "src/worldmass/nativeAreaInstalledSources.ts",
      "sha256": "ffb4473a907ed16699cc56157cbbd0790e9df189304985152bb3964394031c43"
    },
    {
      "file": "src/worldmass/nativeAreaLocal.ts",
      "sha256": "a792ecd8f35892643e1dfb9a7b3c73f07d30f6f8a8f65876935788b6f6d29ce6"
    },
    {
      "file": "src/worldmass/nativeAreaMaddenLedger.ts",
      "sha256": "d4c4af52349657f28dc993eee8fa93525931a6fa05c18404e2adc3fd9e131f61"
    },
    {
      "file": "src/worldmass/nativeAreaMemoryRegistry.ts",
      "sha256": "5f25299eb4fecf7ba3725e9ab34096fb080ea50300688ed497dc91f03729fb79"
    },
    {
      "file": "src/worldmass/nativeAreaMenuPublication.ts",
      "sha256": "7d8dfcd961e3500d18d77f3a17945e0cc99ca54fd117703ceaec7ba85b2112c3"
    },
    {
      "file": "src/worldmass/nativeAreaMenuQueries.ts",
      "sha256": "0798f04eb1336818ba65019904ab312796c563f52eb3c03bf530e24b8a10ef60"
    },
    {
      "file": "src/worldmass/nativeAreaParty.ts",
      "sha256": "73dfc90f36f5017a0456228b1486b8057c98fd325d05a7ab31efc8e34c520b5c"
    },
    {
      "file": "src/worldmass/nativeAreaPopulation.ts",
      "sha256": "9c48f01ef3b331b37c20bf4c6053baab7a49cf7041b35a9c0a123dd94e3be7ac"
    },
    {
      "file": "src/worldmass/nativeAreaRandom.ts",
      "sha256": "6959b4820a9064a000428bc05351e20ba1a9ba24884dcfba5a4579a5b9b6a15d"
    },
    {
      "file": "src/worldmass/nativeAreaRetainedLifetime.ts",
      "sha256": "c14a7f9f6e5a47a353fd5769adff117ce924803d28974faccc148e9ab6fc9b10"
    },
    {
      "file": "src/worldmass/nativeAreaRetainedMassState.ts",
      "sha256": "1534e40cedcfb85e34db4e43aa4586ad0c17d6074fdabb515975184d76d46296"
    },
    {
      "file": "src/worldmass/nativeAreaRoadContext.ts",
      "sha256": "bb5cc7c0b1bc8d5c35350cac3d70d7258e5a0e78e77cf9fe0a72fff2e62c85b6"
    },
    {
      "file": "src/worldmass/nativeAreaRoadDestination.ts",
      "sha256": "b1ee42339d9e427dfecbf9bb247e84095291a0b84344ffa9a27be68465342f43"
    },
    {
      "file": "src/worldmass/nativeAreaRoadOwnerBridge.ts",
      "sha256": "2971b5c8095e3d2f32d40ac42f295758894d464472fe5b0e3a7b1caa2626636e"
    },
    {
      "file": "src/worldmass/nativeAreaRoutes.ts",
      "sha256": "816cd5ae3ec7a0e2613249edf7c4d8224a5c928d2a4654722fa8b3f57c2cfd33"
    },
    {
      "file": "src/worldmass/nativeAreaSceneAI.ts",
      "sha256": "d998ea11fc797c2a11aa6702ea103e98ae9180c8e652546a5b5a3cd24a2f95b4"
    },
    {
      "file": "src/worldmass/nativeAreaSceneAdoption.ts",
      "sha256": "1671411a56c952670f976cb44f9447ea973708838f2099f18edd22e839fbccba"
    },
    {
      "file": "src/worldmass/nativeAreaSceneArrival.ts",
      "sha256": "814d25d7204ba0264368c4dd6a48138a39ed5193c30f2c6ffc924df3a0f56dee"
    },
    {
      "file": "src/worldmass/nativeAreaSceneAssembly.ts",
      "sha256": "b160784f01b9436e290fc371603cc1018da983964d4ccc40aab53a2e128883fb"
    },
    {
      "file": "src/worldmass/nativeAreaSceneBirthAdmission.ts",
      "sha256": "2382b7e43b7627e4e66f22fca7248e270fbd7f8379cfea8eb3b4436b7643b64b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneBoundaries.ts",
      "sha256": "d16db8ba409c99a8a38ef7ca4e917602d8b430fef57dd0a94ed3651de3927f52"
    },
    {
      "file": "src/worldmass/nativeAreaSceneBounty.ts",
      "sha256": "4676a1252420bfdc26d63f31c3439bcc46337ccc9189e500fcb37311b7bbeabc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "sha256": "3802525cc36b613f476b479007fd7af409d5b2848d1da9dc59e83ebdb89f68dd"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignTransitions.ts",
      "sha256": "876de07b4d4144218b487eb6f81ee0b59219ef6f3675a7f2498a7d7c563d08c1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCastingPreparation.ts",
      "sha256": "41641fc498db2f8a91dc3651df761d1a0a795b9cc441efbc790703b210a3f429"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCoast.ts",
      "sha256": "fbb907bf56bd0167d987f6e00f7abbd390f7b42684ad436bbad0bf435702a1d2"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombat.ts",
      "sha256": "5032195bc96af7062c6ed1d727ab7767871d180eb8d5028fbbbc19e9c73b8808"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatArena.ts",
      "sha256": "0b0ed820ac0c4c4d27b112120a0152a2438ad50768899decff7a4bfa67f5db92"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatCampaign.ts",
      "sha256": "bbb10b0c8add1846302a86fcffe18ce6788b13ae9116407b3a6414e771f34cc8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatControl.ts",
      "sha256": "b8e146d1bd13b872192e1372f906e9d4ac49930562de062e9d6f420c067f2ee0"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatFrameState.ts",
      "sha256": "d1dda3a88d82723f79eda2eb0de25c2cff62b8286e41996d1551d70fe826c240"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatRuntimeState.ts",
      "sha256": "ace08272541de1f6033dd8acc4517931b5eddbabf36335228c06447f63acd2b8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatState.ts",
      "sha256": "f2322f51665a2d1758846d6dfc6755b5a6ad357d3ae6261da2d1d7d9a9e174c9"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCrusadeLifetime.ts",
      "sha256": "96b00fb6ea70dfaad447de80fd49d38492875184e939da07f7bf2f5d049e9ebf"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDefensePreparation.ts",
      "sha256": "9f7752d2ca28ca35eecbd87fd9f08f1d6975b09d732b353111541ab65b670ba7"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDepartureMemory.ts",
      "sha256": "a3468d1117fbee02e093732d6473e83b2e582ac41dbe5ca18b44c9ff6073671c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDescent.ts",
      "sha256": "4cd5a51ec5e78a868836092a78fd385a3355cf2136881e551a39fad0fec1bbea"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDirectory.ts",
      "sha256": "0df38cf6a2d412a8e6831497bd6e27dc9059ba1392e906faf56e1379523ec471"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDisplacement.ts",
      "sha256": "9be546cb6ceea3aeeb9b76c10d93395a543fead09d7837cfbb4267e267c4461e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEcology.ts",
      "sha256": "72f88c3f477777b2ce3b4b8fb14d2789aa20faf0ea80cb10b765611da3301ae1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEncounterArrival.ts",
      "sha256": "02723a38e782da0898642f2ed6dfa68752e9cd73506d6a6ae628aa946d15a134"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEncounterBirth.ts",
      "sha256": "cee1995a9eef8290cb12c393b47f3c20c216873676f0c064820abfdd44225520"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEnvironment.ts",
      "sha256": "1a4cd214a4eaae73dcdc66dee9af901c65374305491f3350bc6d299e909782d1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGeneration.ts",
      "sha256": "903cadbe6393ec5e7cbce8fa10ba3870477db73ee8108e392d481d0deed84e5d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGeometry.ts",
      "sha256": "33a6cc466df76e4ce143efd7c64e130547654e06bf1322fd8fad106d574a8759"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGraph.ts",
      "sha256": "44c29e35f3c45a6d6dcdfdda431f2dab4482d40a65ad2c15cd819c941e43b5b3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGroundFollowUps.ts",
      "sha256": "d717f24cc92a58befca3faaee25654a3ad60d7027411ddda02ddc3ec7864fe79"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHarbor.ts",
      "sha256": "413d4477d1261074a00fe1485257e9bfcd093f0da2a7801d4c6af2b50b4b66ff"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHarborServices.ts",
      "sha256": "61b77d432a9ad7d6a5d171c04df0ed71984e08e16c0912b3856f7327bd89606c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHistory.ts",
      "sha256": "a50a940bf79c1312c64300e49ace6e510f088561476a6bac8cc2e122d6f3810c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHistoryArrival.ts",
      "sha256": "83e1c6dc6d8c186454fc225e8386f96e9d4497294c9d8026a28d8cdb98875979"
    },
    {
      "file": "src/worldmass/nativeAreaSceneInput.ts",
      "sha256": "f57d4830f90b714ad655bb4f9ca86c97f9c1724ff4be60b912b8285f1f1f416e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneKillAftermath.ts",
      "sha256": "3bbf0db85f5a37ce0498c20fdbf30a2770ccdc649e967c8ad139f80ec05db81e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneLoot.ts",
      "sha256": "20a1f13b9f69fc1d00637a0f624d39fdfa3c6338a959674baeadcd99a9846e5b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneMemory.ts",
      "sha256": "fc9f0cfb30d3e0797ddd2d7cb214f8e867d1d576b7cef10a1c47e846b16b4e9d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneObjectiveCompletion.ts",
      "sha256": "72f4bc77bf0781c6268772b02489b96d56c054534435c083405c72de1f3f917d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneObjectiveWatching.ts",
      "sha256": "8ce5e2a0b35130ecae73a7888e373c072e6b688b7e7cebc1cda1c2b1f0dce627"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOccurrences.ts",
      "sha256": "3a11b2e4deae636e9c58eae45d1acb8c0803d1496376ff76cae011a9c7030ecb"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOdyssey.ts",
      "sha256": "93fa861ffe0f76a63d5c6bec42bb7d6103638872a1c11e81e9f9872be3dca232"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOngoing.ts",
      "sha256": "c6dac7aa728afa7b99de222d045ed3b0ca9672e7478eda8223a40cc4fc7a9da0"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOpenings.ts",
      "sha256": "c58e9d65502b566e1b670eede8548ac36ec42a14027ce8d35702ac9d51ea9ae8"
    },
    {
      "file": "src/worldmass/nativeAreaScenePhysical.ts",
      "sha256": "6cc3620c78cd3a4352191a69b76de44e849a2b2e7add380acd21d981976cb9cf"
    },
    {
      "file": "src/worldmass/nativeAreaScenePopulation.ts",
      "sha256": "bd65052e099d2a35980526ce5de140a968a57b7551524b157e7014ed6334eb44"
    },
    {
      "file": "src/worldmass/nativeAreaScenePreparation.ts",
      "sha256": "7b154527e1334a0fa86ece835d12aba9441f1460163fc32f19c7f348cfca0269"
    },
    {
      "file": "src/worldmass/nativeAreaScenePresence.ts",
      "sha256": "add0057a6caf4a0df2971dcf719a1c48616549ac5faddecc5b5e334818cd23b4"
    },
    {
      "file": "src/worldmass/nativeAreaSceneProgression.ts",
      "sha256": "4d3ed7c3485e1be22f94ca33ef358e4a983b1c6d834763a91f0034fffb492398"
    },
    {
      "file": "src/worldmass/nativeAreaSceneProjectiles.ts",
      "sha256": "3e7d3c68aa759ab684cc7a54daf04ceaed3224836d6ae79f693acfc3696e8326"
    },
    {
      "file": "src/worldmass/nativeAreaScenePublication.ts",
      "sha256": "4e3a89a32e43cd739048fa038cfe3a956c7699093d9436175da70d35f3cee005"
    },
    {
      "file": "src/worldmass/nativeAreaScenePuzzles.ts",
      "sha256": "b14da7232808be17a11e992dafcc25edfacb81e753792b861916f9c73852fc7d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneQuestInteraction.ts",
      "sha256": "2eb07f46cd126ede8b450fd09d2e470cae8250ff9e098ae35d5f808e9144e26a"
    },
    {
      "file": "src/worldmass/nativeAreaSceneQuests.ts",
      "sha256": "256d866e6dc676a40ad7b441c8b9f37b7aa87961496b8be04c2b42be08fcc386"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRestoration.ts",
      "sha256": "6dad4f083121db8403ab07e552287d561a0c75eaeb1e7ca6f0f62017e8704ede"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRewardStorage.ts",
      "sha256": "428430cf9f3071ff0901183f9813ac77b30ca268b66f7522a5515174388dcb61"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRuntimeBirth.ts",
      "sha256": "8f3f68eea3367b8ea09fac835f05b0a83e00b55e0fb46bcefde9059beb7230b5"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRuntimeRegistry.ts",
      "sha256": "825243773999808629b196079c8b05423363eda44e1d25235177e5f991a45b54"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSettlement.ts",
      "sha256": "96ce150c0bf0f32076d2483d7b770a65827321e52dc2f1d3266769f2f8a7bce8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSiteBirths.ts",
      "sha256": "c3a28edea2cdea051a58c5fee3f776c984f4175a85933b7a58c235310c429f4a"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSites.ts",
      "sha256": "c1db856c7e8d0aeb23ba5de60934691244284fe72aa9d646b56fee88678bd1ad"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSky.ts",
      "sha256": "b000054c92fb87a1e5ce24ed10f8f426c85e2d9569d54568a15f6ab442fdbfaf"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSummonPreparation.ts",
      "sha256": "ecbf3c4443c5be25f988cd442cc19835bf69df865fbb4d1e7ab6edfee8217b7b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSurfaceArrival.ts",
      "sha256": "433fe020fee3f5e21781e0cd35108180f97b3fdcc4e2d5cca589d100bfebb7fc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTethers.ts",
      "sha256": "9ebb17d28f352d0365e597b50e655bd956d58283cc3cd617d81728c3b6fdcb22"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTheater.ts",
      "sha256": "4abb057d32789b6bad0c32747327a5fb46ed810fcf8f3adbfee0f9852edd8de3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTitans.ts",
      "sha256": "661cc7809e6b76d61f29e97aae62e0d9dfa55577f2f8cdcfdfe599de97da7387"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "sha256": "bc4d8b045ac87b57064aeb0b76dff8c42dc4337f24bd2329ec0484f1e01c1d47"
    },
    {
      "file": "src/worldmass/nativeAreaSceneWarlordArrival.ts",
      "sha256": "71f785557b1e80f281727f3fc3df8ac33308639a8555395f75ddfde03321b245"
    },
    {
      "file": "src/worldmass/nativeAreaSeams.ts",
      "sha256": "64a94560def33c8c753e7d34656a66cc3dbf8a234cbaadbced8ec3d4d8840224"
    },
    {
      "file": "src/worldmass/nativeAreaServerSeats.ts",
      "sha256": "5bc7af33daf436e106190c4759d320a81e38a856c5cd894b47b814d9977d70eb"
    },
    {
      "file": "src/worldmass/nativeAreaSourceSession.ts",
      "sha256": "e14a95699ce2b8a3d351f8f8854a72016a91066664b3cfd492afc87811dd4731"
    },
    {
      "file": "src/worldmass/nativeAreaStorageClaims.ts",
      "sha256": "c740ef289985192bc9a1bbc8159881418c3ab79faacb2b58b3965af4d3e3b113"
    },
    {
      "file": "src/worldmass/nativeAreaTimeflow.ts",
      "sha256": "69cbb3db86d025883387077d41256224c3c12fe5116105a5093979979d94974b"
    },
    {
      "file": "src/worldmass/nativeAreaTownStationRefresh.ts",
      "sha256": "9ce1f0b745e1b3087d047ac012aee20167c4a9fe506458a1fc3bc5ac0cd9bed4"
    },
    {
      "file": "src/worldmass/nativeAreaTownStations.ts",
      "sha256": "45dbd46cd4cdc7ce950d0627cba2001effe0d3b807c214bf05043c1599b67a76"
    },
    {
      "file": "src/worldmass/nativeAreaUIActions.ts",
      "sha256": "5b4477c566463ec9f1fedca01d60e71030d47bcad3a829744c7eec07e18073fb"
    },
    {
      "file": "src/worldmass/nativeAreaViewQueries.ts",
      "sha256": "f42ab210a60d01b4ebb2ccb70ef0550a5800089c896fb943280c62218c6c11bb"
    },
    {
      "file": "src/worldmass/nativeBootstrap.ts",
      "sha256": "0176c6264791d183336842df29c0d4df22965d6688c78c2b6445836df73b5619"
    },
    {
      "file": "src/worldmass/nativeBrittleSources.ts",
      "sha256": "54654c3adcb3b08677c3434d2c33d1ea3cf47b6c84903410aaaeb230f4eb9517"
    },
    {
      "file": "src/worldmass/nativeBrittles.ts",
      "sha256": "6fe4a2c7e22a44f5d7ca61b760b6d3ff5246c4bf5944bfa72ac80f7a83540dc2"
    },
    {
      "file": "src/worldmass/nativeClientContinue.ts",
      "sha256": "6f8cb1024fa243d53e96e2d607277a08b8b01a9d44aaf3e9b9328fdc7caddf60"
    },
    {
      "file": "src/worldmass/nativeClientRuntime.ts",
      "sha256": "ec9b1181b6d6b5fbd2ada9d59fd62373e3555e043185cc92712e57096386b4fc"
    },
    {
      "file": "src/worldmass/nativeClientStart.ts",
      "sha256": "897f671f598fbd8955fef5416c9507048d1fc01ef29fcc3cb8b1f53e5899c7d1"
    },
    {
      "file": "src/worldmass/nativeCompile.worker.ts",
      "sha256": "01403485027d62f09ece1fcad77b282bc5cafff427553ef89def1575fa64f337"
    },
    {
      "file": "src/worldmass/nativeCountry.ts",
      "sha256": "aa2fe9139750092a3e236d68a2c1473f4096f5ecfd061007b505534c42f46c94"
    },
    {
      "file": "src/worldmass/nativeCrusadeLayoutCapture.ts",
      "sha256": "a744bb9c91b8c15babd8a90399208a91c479a75606eb1b8b35b046e1327fb056"
    },
    {
      "file": "src/worldmass/nativeCrusadeTerrain.ts",
      "sha256": "ffcaa41c2f2b2708e60877492d8b638bfb4cb4fd13bc3e2fb64c779843ec580a"
    },
    {
      "file": "src/worldmass/nativeEffectSources.ts",
      "sha256": "a412ab330e09d87a9b8b48a5f5226e54ab80ce33cda7b5a919149acf3782dfc0"
    },
    {
      "file": "src/worldmass/nativeEffects.ts",
      "sha256": "aa5af06d05ac593aa6e14e386df27a88351308f11cb5b8b640292d76f4c61e11"
    },
    {
      "file": "src/worldmass/nativeFeatures.ts",
      "sha256": "8649b18d6e0ce3411480823ee9578904829f376575275a297bc2311c3628f29d"
    },
    {
      "file": "src/worldmass/nativeGeneration.ts",
      "sha256": "4246a81a582ed07f20ccb0af51c8644e3904a828eb06781770d1eee9fc937a66"
    },
    {
      "file": "src/worldmass/nativeGeography.ts",
      "sha256": "95f80056a0d998250867072edfd4f02b4cfcdaf1bede59a8ee7da72fd65581f9"
    },
    {
      "file": "src/worldmass/nativeGeographyCatalog.ts",
      "sha256": "5474f5216c43f8eabfac2ea6f08641534dddf3f2eb66ff71be8ae7abc3c766f5"
    },
    {
      "file": "src/worldmass/nativeHost.ts",
      "sha256": "0f046a8aa8c8849dd04ed285ff53a77ef4260ec3c33146565e3cd4b06a4bb496"
    },
    {
      "file": "src/worldmass/nativeHostedSerialization.ts",
      "sha256": "61aefc92bad3b5e36f1c1b47bf57f2b71c754af212104a7f812a69e9a7982e5c"
    },
    {
      "file": "src/worldmass/nativeOdysseyGroundRefresh.ts",
      "sha256": "c22a63aa08f71c65f94be3f59f680ad18b3006bb9baabc17d58a3651df7c3901"
    },
    {
      "file": "src/worldmass/nativeOdysseyGroundRegistration.ts",
      "sha256": "d0422bc069ec5942d4694c2fcfe11a81b1221c4ceb6a817477547b91df9425c8"
    },
    {
      "file": "src/worldmass/nativePaging.ts",
      "sha256": "f542fd9c0a168c38ddcdee1941f0bfb9d379fef2c1e3eb9ceb99bb80373b4110"
    },
    {
      "file": "src/worldmass/nativePreparation.ts",
      "sha256": "458760942f1aa1dfe5c83459e5bc383f82ba7abca213fc4e23a44def74470c8d"
    },
    {
      "file": "src/worldmass/nativeQuietAnatomy.ts",
      "sha256": "67351b14a30e0bed6bb2d659deb78644948e5a82b4633c5a95cda20ba97d0afb"
    },
    {
      "file": "src/worldmass/nativeRegional.ts",
      "sha256": "215ba0e41c431d6aa437a96dcee8c2d70d59bd19e14451b07fdda1a25ba8af4f"
    },
    {
      "file": "src/worldmass/nativeRegionalGeometry.ts",
      "sha256": "68538f84272e2d0804a6f06af5d395996a6529fcf35b0a551d9bbf28f6cd7276"
    },
    {
      "file": "src/worldmass/nativeRegionalSeating.ts",
      "sha256": "50a0e99d2d892be3a86fd8fb9ad1ad977f8d5439f6bff5757f8c4e04aee976b0"
    },
    {
      "file": "src/worldmass/nativeRegionalSources.ts",
      "sha256": "830a1ecbdbb55a8691f30de1059aba7208a89498745b0be9b365e4a636ddbfa3"
    },
    {
      "file": "src/worldmass/nativeResidency.ts",
      "sha256": "1fa3c7cffb1bdd809132dd9c2f8613f847c665ae77402c843d0a8369fcf1ec43"
    },
    {
      "file": "src/worldmass/nativeResidentSession.ts",
      "sha256": "c26bef7c238afafce0fdda078faf3471d5346e20fc97541803cb41291d728170"
    },
    {
      "file": "src/worldmass/nativeRetainedSave.ts",
      "sha256": "2afef135cd3b5a3ab52eae8353dec2b0d45aea8cb3b2984f53e3bc74daf823c9"
    },
    {
      "file": "src/worldmass/nativeSceneBirthComposition.ts",
      "sha256": "6453ceaf063810e33e2616d3e8bf3b5fc63f2aa87e113c831eaed7cdeb99b024"
    },
    {
      "file": "src/worldmass/nativeSceneObjectives.ts",
      "sha256": "572adc6f7e924bd11dd8d1bf5a0cfe2423b29f0ed44564b575fffcd26da4988f"
    },
    {
      "file": "src/worldmass/nativeSceneState.ts",
      "sha256": "1d976ea8b5599d2b2d385db722329a62e7a8b3d2d48749b92b18a4667ce44611"
    },
    {
      "file": "src/worldmass/nativeSidezoneFurnish.ts",
      "sha256": "22491c051e87c4153e26fa13f4cdbdb96609889254597245100be979a0bd201d"
    },
    {
      "file": "src/worldmass/nativeSubstrate.ts",
      "sha256": "f7c0815c2279e715bd6035e3c477175b1d05f23b977a4fb9a12b8ab1219d152e"
    },
    {
      "file": "src/worldmass/nativeTownBodyLedger.ts",
      "sha256": "6d2d4f17ecfe807a7835cee94cdb0e05e20f5e253bcc6971147d7126d1d32d90"
    },
    {
      "file": "src/worldmass/nativeWarm.ts",
      "sha256": "577ad70bacdfe1e8f96b8fc1576246c481658a4a434731efd00c4542ae3c6af5"
    },
    {
      "file": "src/worldmass/noise.ts",
      "sha256": "2b0f2e6e7f81d43ea68957624ad7e4bcefa808194b9805d7fdb6ff10b485b903"
    },
    {
      "file": "src/worldmass/objectiveBodies.ts",
      "sha256": "960969361d0786ed1a0eff08f796277c35db31704274ccb91b989b62eca8d629"
    },
    {
      "file": "src/worldmass/objectives.ts",
      "sha256": "723b7d6937cc3fe1d74a53e9463bbd719c2397d36d60192cb0ff113c8ecab52e"
    },
    {
      "file": "src/worldmass/occurrences.ts",
      "sha256": "45b78853b8d14e86fa91352db71b746f7fdcc1601c72b0363e9a45b7fc4b6ec5"
    },
    {
      "file": "src/worldmass/origin.ts",
      "sha256": "bf6d85698c184eb5a77c27d855d232934b562930df10bb3d807df824e3cd219d"
    },
    {
      "file": "src/worldmass/paint.ts",
      "sha256": "27f48d99deecaccff1f934614e60efe2f85f671bb829c902bfb6761cf37ff591"
    },
    {
      "file": "src/worldmass/patchReservations.ts",
      "sha256": "28f075d64f20e07f1e8e48b5d94c674cf84653327edb94e0f65fcfb0b9bafbdf"
    },
    {
      "file": "src/worldmass/physicalIntel.ts",
      "sha256": "d4887ced42f4c252086b3f9e41ab8f12de5608078283c25b718cdcdcf4c135c5"
    },
    {
      "file": "src/worldmass/population.ts",
      "sha256": "985780d4c5f3cba42c8b901a04c9395150456d792fd2f7114e418f2470814139"
    },
    {
      "file": "src/worldmass/preset.ts",
      "sha256": "253aba1e57f627781c24ff1795c4d2a4b5ef32c2952ff27b673fb6bdd7930134"
    },
    {
      "file": "src/worldmass/processionGameplay.ts",
      "sha256": "0b87415aef988131cd0e866ea520c6c6120de288953e95019c898f5e7e84a5eb"
    },
    {
      "file": "src/worldmass/processionPlan.ts",
      "sha256": "da9c71520f326c0b72281b620bd3392d274c81caf563aa875ad4ec7aa4ec1bc8"
    },
    {
      "file": "src/worldmass/processionPlan.worker.ts",
      "sha256": "6174c9d9e1d74e5fa0337df750a09af4e940ab464ff0e264cfc75e9c40ccbf02"
    },
    {
      "file": "src/worldmass/processionSources.ts",
      "sha256": "16c7403567f45dff2d9dd7ccf92790f1e4b330d7ade88cbcb9047774435d6ce0"
    },
    {
      "file": "src/worldmass/processionTypes.ts",
      "sha256": "ddca721e57ba9b05b145890d5e2aa0c5a728b7a3da7ee201a85e097f487a1a87"
    },
    {
      "file": "src/worldmass/processionWarm.ts",
      "sha256": "f440df0f7673bfc70bc3f697611c25dd58128caa616dce86d5d524752ad7dd24"
    },
    {
      "file": "src/worldmass/processions.ts",
      "sha256": "39189fc56278b78e495a00d7f3580caff8a998a1feaff1d20d77964d71303f68"
    },
    {
      "file": "src/worldmass/progression.ts",
      "sha256": "729404dd54c7282ac65e293f054d8b19c8e3ae9b8244971906f50b82a73a672f"
    },
    {
      "file": "src/worldmass/puzzles.ts",
      "sha256": "e11bd12a9bb4ec5a6af5effeefb744cf37f6a652cf5cb8475191f073ef8eddcc"
    },
    {
      "file": "src/worldmass/quests.ts",
      "sha256": "6965103781c7cf2c5ccf1e102d16f37738ccf028a7d410200f45975a8d16dc8d"
    },
    {
      "file": "src/worldmass/random.ts",
      "sha256": "4a2a5d79ab39ed752804d7142a368f0e66f8526014128a2802d0dd2e6daf650d"
    },
    {
      "file": "src/worldmass/rebase.ts",
      "sha256": "f7daa31d4b7d93a2e2263ce904dcc9eaf150dd95dff88203b720020c1478fbd4"
    },
    {
      "file": "src/worldmass/regionalCourtShapes.ts",
      "sha256": "4a3e69089291b3ff47eaf900d25c7b3e76a79b6d42f63e935eddab5a01432eef"
    },
    {
      "file": "src/worldmass/regionalDiscoveries.ts",
      "sha256": "129605b7f6e20df3735412485cc27a8c39e2f46f22df83b7f51085a8a1c98b8f"
    },
    {
      "file": "src/worldmass/regionalDiscoverySources.ts",
      "sha256": "b23676ef391b09bcc692f99fadc62075573b3f4779492970119eab89cff96a0f"
    },
    {
      "file": "src/worldmass/regionalLandformComposition.ts",
      "sha256": "66f671565085c71dbf3869c9e1f0eb8474bf5ba61dd3757164bba149bed3eafb"
    },
    {
      "file": "src/worldmass/regionalLandformSources.ts",
      "sha256": "571beacd868c2e9e1cf31a9ebd5a634364eaf8e32e65f86da066b73e95eb9b9a"
    },
    {
      "file": "src/worldmass/regionalLandforms.ts",
      "sha256": "275f10fae28f621eb9fb6be399ccbbefc57ff127d00facee1a19a4b00c8df929"
    },
    {
      "file": "src/worldmass/regionalMotifSupport.ts",
      "sha256": "b73550976d6689f871b5eb0c8ba8e5ebf5eccbcc0c587ed468b141d0fa72e2b2"
    },
    {
      "file": "src/worldmass/regionalPathWeave.ts",
      "sha256": "f841283e2342d803205261e3a6e7c06911147cdec86d917f399093118648bf36"
    },
    {
      "file": "src/worldmass/regionalSites.ts",
      "sha256": "b3ad3c7e2e7d8b6a3a5729b537f2110f75065f48ec29172ed44111a6f8787338"
    },
    {
      "file": "src/worldmass/regionalTerrainFootprint.ts",
      "sha256": "47816fdd40ebc7fedcda6736b271a1ee5a4a3baf3857cda087e71315cd17fcc3"
    },
    {
      "file": "src/worldmass/regionalTerrainGrammar.ts",
      "sha256": "1004d4b3fcb8021eb24d21006e71d120198215e333355a50b7d728bc7172eb3b"
    },
    {
      "file": "src/worldmass/regionalTransitions.ts",
      "sha256": "6b332adb5c2abfa77a62fa0d5289a6980f25376ad7fce723bc65ac7c8de46333"
    },
    {
      "file": "src/worldmass/regionalWeave.ts",
      "sha256": "decb7fd67489992b96f60480f3439f16e3884e36dafd902c434a62ed4e731aa1"
    },
    {
      "file": "src/worldmass/regions.ts",
      "sha256": "d9d0d17ba192e765064011969174d447b878f29fbf02a8f918bcf2f6d1b96e46"
    },
    {
      "file": "src/worldmass/rewards.ts",
      "sha256": "44c48237f0f0f734572a6ac3ff52328e5e44182ccd41867f80c02a084376dfdf"
    },
    {
      "file": "src/worldmass/roadGuide.ts",
      "sha256": "79dfbc5541d66ec866b9295739dd7a7318e336a3819504f2bc43c69f2c38d295"
    },
    {
      "file": "src/worldmass/roadside.ts",
      "sha256": "dee68addde048fd5d118a6c7159baa64e34a8b7cb3df679be0661ef566a3342c"
    },
    {
      "file": "src/worldmass/runtime.ts",
      "sha256": "b164ee64918b7108785c50805e4e38b1b4333a3fe0dacf7b36f52085bb0e0d6e"
    },
    {
      "file": "src/worldmass/sanctuary.ts",
      "sha256": "007df8e3cda66564f90a18acb3d63f2e3ac9adc264e1b41512ef1aa4f43dd4ea"
    },
    {
      "file": "src/worldmass/settlement.ts",
      "sha256": "fdd088db438d750eb0848e8b2bd9cc5999f53292565318c7accb59b7dfff2a31"
    },
    {
      "file": "src/worldmass/settlementDefenses.ts",
      "sha256": "2a67647a77d7a9f2fcdc078165d8d832a9bf5c5e3e14ea6c7c666f21cdfd76b0"
    },
    {
      "file": "src/worldmass/settlementExits.ts",
      "sha256": "56247b5d6aed929ed29ac4e1e2f2538b0809e933ac36e3ebf7c4fe29e4dee022"
    },
    {
      "file": "src/worldmass/shrines.ts",
      "sha256": "ba596b7253eb43ac7513f320ce81a99c665c2df8e56b689daa996418846bcf5c"
    },
    {
      "file": "src/worldmass/sideareas.ts",
      "sha256": "fd2cfedcbaf7a27e7567e49b051b1082195187df63a0a9817bb0ce0ba1c98385"
    },
    {
      "file": "src/worldmass/sites.ts",
      "sha256": "630d47c5a64764960393929df8d6605dcb859bcc059798761672af2b2f756d93"
    },
    {
      "file": "src/worldmass/snow.ts",
      "sha256": "6b650db6d122d755ff0aa3a75c7b6b5bfb0ee99a9b6f5f1887d979fdf8d3fa55"
    },
    {
      "file": "src/worldmass/state.ts",
      "sha256": "0d647a2b9b7e1499f8ea5b689bae5ebf95b00d582f0977040b19258bad9bb71c"
    },
    {
      "file": "src/worldmass/storm.ts",
      "sha256": "e52baf5cedab0af276a56f575809daaefda428200439a047ea6530f1cd3201b4"
    },
    {
      "file": "src/worldmass/stream.ts",
      "sha256": "3558668eeaea5d68e86dfab75f09310f4e97944cb4d6e9ff023754fbd52d2f8e"
    },
    {
      "file": "src/worldmass/surfaceDetail.ts",
      "sha256": "f5538c71867c0ed443fc371c352b3b992b70fff05dfd132bcea8fca382a14012"
    },
    {
      "file": "src/worldmass/survey.ts",
      "sha256": "62eced879745c4b55d33ff7d88a4dfe92e7cf7bbff2ee849b124dda51d8a7cae"
    },
    {
      "file": "src/worldmass/terrainPatches.ts",
      "sha256": "edddba13ad15c8cf74b8d8588cbfd0e3d5abf87376d26f977f5c7e9c83e8bceb"
    },
    {
      "file": "src/worldmass/territory.ts",
      "sha256": "46f0ab1925bc31e379c2f64b5b364c5594f7d2a57be99ed96dfbd5d83203e272"
    },
    {
      "file": "src/worldmass/trailWear.ts",
      "sha256": "0866ba6b98e1b94995e9e9f61f601ac9f90135dbda33e442584aa9bde3e94a80"
    },
    {
      "file": "src/worldmass/walk.ts",
      "sha256": "2b36301cf112ba33bdd62abe54553cd77e1aa52fdf0886f8b9e8499bf2f46979"
    },
    {
      "file": "src/worldmass/weather.ts",
      "sha256": "b21cd5089fe25eafb460173e62deee989527dea46c5e717a27075708180ed095"
    },
    {
      "file": "src/worldmass/wildernessPaths.ts",
      "sha256": "502a6da69276edb649aca7be78a346608236ddc40d20095f33c6f4b957339ee5"
    },
    {
      "file": "src/worldmass/worldContexts.ts",
      "sha256": "9b1c08ae45135e4a168d937ce1d2a4973b9719ee6f33981fc5f3f6d43292f13b"
    }
  ],
  "accepted": [
    {
      "file": "balance/probe_criticcrusadeterraincold.ts",
      "sha256": "cba541c5a06e8cb271a3c2151f26dbe6a2f24b08b8b4d2c835a48109881e1773"
    },
    {
      "file": "balance/probe_criticcurrentcontinue175.ts",
      "sha256": "247c7d3171553c31ff7b8c5f6384989ba85563171a460a043e38822de2283d69"
    },
    {
      "file": "balance/probe_criticcurrentdoor183.ts",
      "sha256": "69e9fb3773a173d7a77c9c1b233e26dcee2c33c7f08ff6baf7e21875e1e0ffe8"
    },
    {
      "file": "balance/probe_criticcurrentevent175.ts",
      "sha256": "808a23fcb4d6ce1e49feeec34ea127fc7d983141ab6423ee6a58b8a2ab9ddbff"
    },
    {
      "file": "balance/probe_criticcurrentspent175.ts",
      "sha256": "fbc2756cc012fa061963344ece44194927614de69a9d87b8dbb8573d1be0a83d"
    },
    {
      "file": "balance/probe_nativecrusadecurrentcallbacks.ts",
      "sha256": "e91d86c3c96dd0c12579aaf12d6397aab9382cc121383e63605ce47b1fc4b264"
    },
    {
      "file": "balance/probe_nativecrusadecurrentcontinue.ts",
      "sha256": "01ec5e6f6e1925ba37f15f50cad39c2dcfe4346201daf1b1acf4b4e46016418b"
    },
    {
      "file": "balance/probe_nativecrusaderestorationcompletion.ts",
      "sha256": "7df2ba44409cc015050b5dfb5fb3678fdbc4462f6af342a0046dae3f0acd1e9b"
    },
    {
      "file": "balance/probe_nativecrusadeterrainboundaries.ts",
      "sha256": "44d3cfbc0c4913ce074993fd675ec241808106bca03a2db16f672f91d77a1753"
    },
    {
      "file": "balance/probe_nativecrusadeterraincallbacks.ts",
      "sha256": "d03fceb8f5f31c139cd535a97296ef7f8b6f3d25ae167022215f581d85ece3a2"
    },
    {
      "file": "balance/probe_nativecrusadeterraincold.ts",
      "sha256": "0e0ff7a12937cad2c57c3fff3a6c686d2c701738a282bbf41f84a30e5c228b9d"
    },
    {
      "file": "balance/probe_nativecrusadeterrainprovenance.ts",
      "sha256": "1407d2fc7e40fcd276230bcc689c22075ee3572ae95e540282f6facc94595f27"
    },
    {
      "file": "balance/probe_nativecrusadeterrainwitness.ts",
      "sha256": "6085bc9e19f326a2e76c15e731807f5511cc220d50a63ce61102d6cdffbc4bc2"
    },
    {
      "file": "docs/worldgen/native-crusade-terrain-lifetime.md",
      "sha256": "5ae1c33d6942d529d0cff6020aaef894dd7afb4107d405c7e88aba35a2e31d7a"
    },
    {
      "file": "src/engine/levelgen.ts",
      "sha256": "b7c5a0ae8b307fe313db9d1e2f25a232be0579f07936d7c3a53a6b12f00f840b"
    },
    {
      "file": "src/engine/nativeAreaBirth.ts",
      "sha256": "a41339e494cd72e9548436863b89eb97b8060865923767ad13356b1ab563d617"
    },
    {
      "file": "src/engine/nativeCharacterRestoration.ts",
      "sha256": "cb6e42f64d0c8a61a66e078fbfd9b3841943a49ef6ac1826bd8f83a4c54f787b"
    },
    {
      "file": "src/engine/nativeCrusadeFixtureMemory.ts",
      "sha256": "32db0a63be5bdb080e5312953ef533e62eb34171277b31d6287d1ff1d813bfd9"
    },
    {
      "file": "src/engine/nativeLayoutGeneration.ts",
      "sha256": "f072e1e477bc7872e29cfd1e7031b599e8a6d15dcf080ca0bbdb010bdf8f521b"
    },
    {
      "file": "src/engine/nativeSceneMemory.ts",
      "sha256": "51114ff33c334bc44f79bd096753181feac7ca5f4f30b903dbd487d31bf283d4"
    },
    {
      "file": "src/engine/nativeScenePopulation.ts",
      "sha256": "f0e8e1856cdbba4ade931dbe2f25d538fec002d13afbf890ac5f143a49e6d4c1"
    },
    {
      "file": "src/engine/world.ts",
      "sha256": "70f2a6e7d6d0a23ce8f5095ba332a60b325a33478e67b342118a35b3904b73d3"
    },
    {
      "file": "src/meta/worldstate.ts",
      "sha256": "3b0c4155b9a412bdc8f2b8547608391a1d253b6c3494b7c7ac5049f084931924"
    },
    {
      "file": "src/packages/overlays/crusade.ts",
      "sha256": "3cafce610442fd8a0262609add8514cb113612bba7de010415e0cb6c86c9e00a"
    },
    {
      "file": "src/world/gridWalk.ts",
      "sha256": "32a12d0e74078641b827cff8c93fbd60c1a89609d507c0919423639b2e3e5c16"
    },
    {
      "file": "src/worldmass/nativeAreaActorAuthority.ts",
      "sha256": "6dd79cd7873dd0f9eb3500ee97476709bd0be87669c3d85d6694eddbe5d1c7c3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneAssembly.ts",
      "sha256": "b160784f01b9436e290fc371603cc1018da983964d4ccc40aab53a2e128883fb"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombat.ts",
      "sha256": "5032195bc96af7062c6ed1d727ab7767871d180eb8d5028fbbbc19e9c73b8808"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGeneration.ts",
      "sha256": "903cadbe6393ec5e7cbce8fa10ba3870477db73ee8108e392d481d0deed84e5d"
    },
    {
      "file": "src/worldmass/nativeAreaScenePopulation.ts",
      "sha256": "bd65052e099d2a35980526ce5de140a968a57b7551524b157e7014ed6334eb44"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "sha256": "bc4d8b045ac87b57064aeb0b76dff8c42dc4337f24bd2329ec0484f1e01c1d47"
    },
    {
      "file": "src/worldmass/nativeCrusadeLayoutCapture.ts",
      "sha256": "a744bb9c91b8c15babd8a90399208a91c479a75606eb1b8b35b046e1327fb056"
    },
    {
      "file": "src/worldmass/nativeCrusadeTerrain.ts",
      "sha256": "ffcaa41c2f2b2708e60877492d8b638bfb4cb4fd13bc3e2fb64c779843ec580a"
    }
  ],
  "unchanged": [
    {
      "file": ".claude/agents/cross-model-reviewer.md",
      "sha256": "10e553002f19b8dc2c732f31d2d3935f4b60eb30a11a237f998f7856eead3cf6"
    },
    {
      "file": ".claude/agents/matrix-custodian.md",
      "sha256": "0210905d8b836d07c1e8e6670d7a8c48885eb23abd9a395c3ffabda7d67a4f44"
    },
    {
      "file": ".claude/launch.json",
      "sha256": "34f512af92b03f866148af0dfb7a586c8bd1c9aeb9413596d40da9674f2d06a2"
    },
    {
      "file": ".devcontainer/devcontainer.json",
      "sha256": "44e830839de11ebf50f74f7809015f39e1efe910628b9f8314d5c466c47c0612"
    },
    {
      "file": ".devcontainer/start-shard.sh",
      "sha256": "d967c264a44ad5798aa33f305f19b4d28e0aafedf3376ebc26a0acb8f874d35d"
    },
    {
      "file": ".gitattributes",
      "sha256": "0f2882893de554a2ad04866519119792e71803301ec5e80ad486e2b0a14fd5ff"
    },
    {
      "file": ".github/workflows/ci.yml",
      "sha256": "457e98a59a97e0cbd087861df9f333349f331f1c3ea21c8ec5a4f394d58322d7"
    },
    {
      "file": ".github/workflows/launcher-branches.yml",
      "sha256": "edff6dd39311a92c797683bc8295a43e1bb1bf520bb7d2c8927cd5554786b42c"
    },
    {
      "file": ".github/workflows/nightly.yml",
      "sha256": "50b21b9a58cf553f39e61b409a4c8eb0fec74e2d9ce761c2a5364bfedc2f6e51"
    },
    {
      "file": ".github/workflows/pages.yml",
      "sha256": "ea253397ba0d39e57c6d470245c8b70aae2ca245326d9920805c7bce6bf7027a"
    },
    {
      "file": ".github/workflows/release.yml",
      "sha256": "edf4810b4b03598883ca92cd2d4af21cfa88303817539e247a0ebae3d0296288"
    },
    {
      "file": ".gitignore",
      "sha256": "4685ce4bc6c5d4ee21febc2ee7b16af03fa8c2ae9e7b7abee0db823ec2da8feb"
    },
    {
      "file": "AGENTS.md",
      "sha256": "f58179bb41cb617dd7b39c966b57f3a30c0ee9b98505c8741bdef4096d3068c8"
    },
    {
      "file": "Host Shard.bat",
      "sha256": "679374933a3a89f1c342dc6f91bec9ca9711ad530c53007e430486d271a4a5fb"
    },
    {
      "file": "LICENSE.md",
      "sha256": "5b944b285c70cb59ab4803c682bb7d8b36652131bbb504f0f2bea5089e941c71"
    },
    {
      "file": "Launch Game.bat",
      "sha256": "4cec39fc904bb4bb6397741f997a54cb5c576cda50c500bf5cd42b7f6905555d"
    },
    {
      "file": "Play Game.bat",
      "sha256": "3ad3ac1b1d3a610c91cabb137602767a8ede7f4c871169b24f730176bf430329"
    },
    {
      "file": "README.md",
      "sha256": "a0a89414b1b31838f8d895e01fd54c38680b7307118624bead6b66e3704b3b23"
    },
    {
      "file": "STEAM.md",
      "sha256": "2f7546599a5881348c1f41db1e5dc7bbd287d223fa18a5ea250113e8a0d439ee"
    },
    {
      "file": "balance/affliction-cues-ui.cjs",
      "sha256": "d026c7a2f7f23c2f3bd03cdea7756f7db26e76d980a168e30c6b0f20e7bbbf00"
    },
    {
      "file": "balance/all-player-visuals-ui.cjs",
      "sha256": "59bffa0350734449b06fd6745445e1012bb0314e06a71dbde1bf13972789a0ac"
    },
    {
      "file": "balance/altar-cues-ui.cjs",
      "sha256": "7cd0fda8fdc5b3255d472b99bb316dfffdb483c90e0dd9ff0c3e50acd24b1aa5"
    },
    {
      "file": "balance/anatomy-cues-ui.cjs",
      "sha256": "de1da79469826a79c67c30fa62da48b3976187cb0d3c2b368c27b91d7a4003d8"
    },
    {
      "file": "balance/arachnids-ui.cjs",
      "sha256": "0d78f2ec6b300d6d6706db77ac0858da8689a7395754d5aa15a00771fa5f509a"
    },
    {
      "file": "balance/arena-bosses-ui.cjs",
      "sha256": "92e1d7094b75f67271324d7fee3ea70c39737d1782800fb388d9123bde4c8614"
    },
    {
      "file": "balance/assault-ui.cjs",
      "sha256": "9bea8b1fe02692770e35b3181256af81825960cf6fe877e3b7f4640f033c543c"
    },
    {
      "file": "balance/audit_bountyroutes.ts",
      "sha256": "12e66ca13d6a0d08aa5bec016a89803fce91d2abd4f193b24b97db46a262198c"
    },
    {
      "file": "balance/audit_flasktrees.ts",
      "sha256": "97f5ce479b30a79536a10d089bb8bb9924ee64b4f3df0513130bdacd5387b130"
    },
    {
      "file": "balance/audit_passiveroutes.ts",
      "sha256": "918c4cef18f3dddcc47d3ea6608e5000c8f92cd4eeddb1ff4a8f6484d52c5f25"
    },
    {
      "file": "balance/audit_tacticprogression.ts",
      "sha256": "752a20939331827deb330053acdc62d07c4ca80152398a962abd44c5805df287"
    },
    {
      "file": "balance/audit_worldprogression.ts",
      "sha256": "b5b63eb10178adb9e9c5121573ff251b247ff342ad1f897799a235a9d0201569"
    },
    {
      "file": "balance/auroras-ui.cjs",
      "sha256": "bf6a4ac60cb0c7f001795362d14275501c3651d5c560c7ce2a197784c9634377"
    },
    {
      "file": "balance/avians-ui.cjs",
      "sha256": "9c5feff671db0511be85428b566767a3f82102b9c2181636a58e1f0c2c63112a"
    },
    {
      "file": "balance/baselines/host_expression.json",
      "sha256": "3346b993b88890ef6d5efbedf510f661c160715b4e24d11bcd6dfb97aef950b0"
    },
    {
      "file": "balance/baselines/smoke.json",
      "sha256": "5beccd38a69dab4856d8944a71773957c83c81852cc6bbaa5fdcf84b74f2360c"
    },
    {
      "file": "balance/baselines/support_matrix.json",
      "sha256": "5307b74135680168cc793fdee4c558370027e24956ebdde100ecd7d7dbbb5444"
    },
    {
      "file": "balance/body-action-ui.cjs",
      "sha256": "9e95feacb263133a5f917ba8ff27943db8ac6c26159b4fcdff86598b0f83926a"
    },
    {
      "file": "balance/body-contrast-ui.cjs",
      "sha256": "29917dbb8a36b6973642cde0522f196b29096fe98c22bf6592082fb7e3baa1e2"
    },
    {
      "file": "balance/bounty-focus-ui.cjs",
      "sha256": "f93b6d5749c17a66edcfaf0d7e08c89b5e10920dbf267826cc477ff3dadd6dfa"
    },
    {
      "file": "balance/bounty-routes-ui.cjs",
      "sha256": "535240aa9b2c6104d52e75b8446bc3daee206905d7ae900f328411a7d6a7f8b1"
    },
    {
      "file": "balance/brandt-progression-ui.cjs",
      "sha256": "d531de7a9532d1aa47c0f44afee63b949e68dd7468910701c8614df7a29eaf56"
    },
    {
      "file": "balance/brandt-quest-ui.cjs",
      "sha256": "999ac094715bc2f6ac9a1ad22ff346be9d7b0f49579fa47df520cba80a4f594c"
    },
    {
      "file": "balance/broad-doorways-ui.cjs",
      "sha256": "9bb6246f83ec325e220e75f182b38796d845ae17d3d3ef6c2d0ff1c44a409d57"
    },
    {
      "file": "balance/broadleaf-crown-ui.cjs",
      "sha256": "3e8432cc8fe31db79ed742ed6c47888bc16eefb2e82506d8234dfd80fce64b7a"
    },
    {
      "file": "balance/broadleaf-crown-world-ui.cjs",
      "sha256": "5c83887cfb332fa9db6f550a802c7d654277e113675075554be66e78a7d62dcf"
    },
    {
      "file": "balance/browser-character-pages.cjs",
      "sha256": "e239cdb5e941f33a49c2d3909d344e34a04f93a8ac8749de168c23b2e95a691a"
    },
    {
      "file": "balance/browser-character-store.cjs",
      "sha256": "cfe783db2f649f08c7c822316adb53df0d17028341654044f4a1ba9fd0193786"
    },
    {
      "file": "balance/browser-native-pages.cjs",
      "sha256": "8ad02ea1ff80dc924b2b8044fd6bd951c673c37bec7b9307ba96b81149f30754"
    },
    {
      "file": "balance/browser-preview-ui.cjs",
      "sha256": "8a20e5f9f09b0fec7073be47612c1ba523483ba6032c785ff2682bb2d328f7c3"
    },
    {
      "file": "balance/browser-run-store.cjs",
      "sha256": "e0fe8dce83e0c75f05aab86aed74e86348bd72379912e47c119be5c6a7d5d8ab"
    },
    {
      "file": "balance/buff-readout-ui.cjs",
      "sha256": "10fafa0b5c2080bdef6831e456aeb994c7ac68ec0680167aacf5c36035f45dc1"
    },
    {
      "file": "balance/build-panels-ui.cjs",
      "sha256": "7c203bd55ffa6a1f6eee2c9beb69b9d7b7c31b5dfd0460c532ee7026fc2ec153"
    },
    {
      "file": "balance/cache-opening-ui.cjs",
      "sha256": "17cd84659b3479e5a4596e19c86f92af346a50fab03bf257622a90f0e0283f48"
    },
    {
      "file": "balance/camera-view-ui.cjs",
      "sha256": "b8bd10dfe0798472790a1026952e8dfd5d856c1044a3e34afb90b8f5ee0f8349"
    },
    {
      "file": "balance/campaign-boundary-ui.cjs",
      "sha256": "5d1fe764b920e4da6080c0ad74f83456233440f913abebabbf4baa758a46c4d9"
    },
    {
      "file": "balance/canines-ui.cjs",
      "sha256": "a690fb8373ebe46d7cbb06ccc50a27682f77cb4d3214690025b1628f213ef1cb"
    },
    {
      "file": "balance/canopy-visual.cjs",
      "sha256": "a1118411c301a5077ea8a5e5c3be0707a70f862b4e1cd68d5b7fe4695b6ce1bb"
    },
    {
      "file": "balance/caravan-watch-ui.cjs",
      "sha256": "b1c5fada9962fe4936264c41a0b51e248c08c0fdc6a37217fe2d8d1c38874327"
    },
    {
      "file": "balance/cast-aim-ui.cjs",
      "sha256": "3d52b85d8674bb3aec6484718f3821d627c22a2fec2b37240f04fb9324251764"
    },
    {
      "file": "balance/cast-movement-ui.cjs",
      "sha256": "9c8d63d8ed119ffb56488505231124e992a0252a66d06a1e3427c66adf152cf5"
    },
    {
      "file": "balance/cast-readout-ui.cjs",
      "sha256": "997132ec272a85e1aa70e06997948ad097cb209e329978abca642d1b0a9058ac"
    },
    {
      "file": "balance/caster-vessel-study.cjs",
      "sha256": "d8887a9abab15d7eec94ec6804a6fbcdfb68629b3950200a4f40215afd6d78a9"
    },
    {
      "file": "balance/caster-vessel-ui.cjs",
      "sha256": "0c2624296fdf1203637ff86773cf5935767cb43feaa1f31a6f8f36ebb4ca68b0"
    },
    {
      "file": "balance/casting-cues-ui.cjs",
      "sha256": "918382618316fb4312c09e100479dbec394f7735849fa2532a14b2b676989574"
    },
    {
      "file": "balance/character-pages-browser-fixture.ts",
      "sha256": "66bbf5d1d2cd6dfc8d948caf987ac0a247e5d00786c66c534d32fb0dff7f407d"
    },
    {
      "file": "balance/chest-readout-ui.cjs",
      "sha256": "dadd8a566667e06a1ef86e414173c534ce36d37986dfd195d1b4145c1ec43ead"
    },
    {
      "file": "balance/classic-feedback-ui.cjs",
      "sha256": "e075314fc870db4727996eef05e9b664224677ce69ffd49adaf6f427583c80cf"
    },
    {
      "file": "balance/cleave-ui.cjs",
      "sha256": "375a2f95767fade9df57b64163f611ded0a433cd56f268f16dc5f95a2d5ac789"
    },
    {
      "file": "balance/cli.ts",
      "sha256": "263334474258ae94533d4f288c2ad70cf92834c9eda3b52076866924ca1b0141"
    },
    {
      "file": "balance/climate-world-ui.cjs",
      "sha256": "8ac0ab5d5654a100618f4137d5e502fd3243e96441ab26bac4a48c2a16cf4cbe"
    },
    {
      "file": "balance/combat-cues-ui.cjs",
      "sha256": "a1625328b3d4162e4ac4b1bf355462d77615a5fcb3d76e78700108150dd25390"
    },
    {
      "file": "balance/combat-focus-ui.cjs",
      "sha256": "4fe2f26615002041bbfd27cbae3e9bb803138963b555bfb02fed4639a203b5e5"
    },
    {
      "file": "balance/combat-identity-ui.cjs",
      "sha256": "10c7601e702196cb418193e28481aeb43145e3cd2e18400924042c5805871960"
    },
    {
      "file": "balance/combat-readability-ui.cjs",
      "sha256": "991f9d4922a8ee31c6d4987365903538c1245a1f21d6399e4d2ae77712fb2950"
    },
    {
      "file": "balance/combo-conditions-ui.cjs",
      "sha256": "ffef42a514e21526845fb0dff62d1cc05a7f784cca5b31c729efa895968a8811"
    },
    {
      "file": "balance/combo-cues-ui.cjs",
      "sha256": "3d816c830fb5e1747a5c69234015a0152ac2e30c5c719f98facadc5d49cb789e"
    },
    {
      "file": "balance/companion-cues-ui.cjs",
      "sha256": "562ad02d7af14a03f1e11bc78dea42df3005b4cee19a3a9b94715c31b0616746"
    },
    {
      "file": "balance/companion-recovery-ui.cjs",
      "sha256": "0bea171e52b34d759472c5f6f4b16359b45b8f88d47171c8ec1e3ed5b66ac06e"
    },
    {
      "file": "balance/continental-start-ui.cjs",
      "sha256": "4c281ebef18c91dc5d91afdae2ad09c1e23cca3cc37f683b50458832790dd1a1"
    },
    {
      "file": "balance/conversation-integration-ui.cjs",
      "sha256": "da8b483ea33e1c0f131c71a24fe21f56e6616e405422380ea5091ae534e9ba2e"
    },
    {
      "file": "balance/cosmetics-ui.cjs",
      "sha256": "4f940ec14f93ac3f64b2eb533249d281a7f7c0e3e037b881d108c48e27824686"
    },
    {
      "file": "balance/creepers-ui.cjs",
      "sha256": "684adef19dd6baeeb1b2925cfc21edbd4fc04540b040e4b3f4d29db5e76626b7"
    },
    {
      "file": "balance/dagger-parts-ui.cjs",
      "sha256": "75d7af42989ab4a838c3c493e6ac0c815e8b2930855f6fb51576f7556728fde4"
    },
    {
      "file": "balance/deadface_check.ts",
      "sha256": "26d3a300cbeb09b001a3982c78b638c2289443068fffbb62f29b6bbd6e600d52"
    },
    {
      "file": "balance/debuff-icons-ui.cjs",
      "sha256": "233f2765599395eb9d979adc975b7eac1b2d8f0e97cc978ce4be83a076877b59"
    },
    {
      "file": "balance/defense-cues-ui.cjs",
      "sha256": "6731a1bfd44f748cb60a2d2c8a8012f4ea902cae9cde587a32ce23b0204c7336"
    },
    {
      "file": "balance/dev-progression-ui.cjs",
      "sha256": "28eadd84aa77b7441882d9c23c1cc78b334366c395bc3007059af5c67a6d926c"
    },
    {
      "file": "balance/dev-skill-attributes-ui.cjs",
      "sha256": "300f7a2599d9524b3e8bdf694778e9d33e2420843f5990fbd2048388e4e134ea"
    },
    {
      "file": "balance/dialogue-services-ui.cjs",
      "sha256": "49581e60f5abda6e0150ef49a9620ac532a5d7a57370250d4e067dd1a9f34991"
    },
    {
      "file": "balance/dialogue-ui.cjs",
      "sha256": "ddd19b43d439718023341043ebac18dcf0ef56523c01de522dcc554900a372d6"
    },
    {
      "file": "balance/director-ui.cjs",
      "sha256": "6374ddee2ce7f530c9c98785e51442bba200565f502639b5bd1ce89a7270271a"
    },
    {
      "file": "balance/dirty-terrain-ui.cjs",
      "sha256": "12f160770b20f076af70ac13e344f686ca6449ab545aae7139160f541ec9a35c"
    },
    {
      "file": "balance/doom-cues-ui.cjs",
      "sha256": "89e1675806c4e0a91f06b5b25ab27eaf5803798f070b8c7881b0a6051c3d5382"
    },
    {
      "file": "balance/encounter-combat-ui.cjs",
      "sha256": "513a5b3bfe94673d374535035d90b56ce415ac163021f836254707be8522a6d3"
    },
    {
      "file": "balance/encounter-groups-ui.cjs",
      "sha256": "2472830a4f3588991dd561d2129c761320cca09b0c2bb9b4f441be04b749534e"
    },
    {
      "file": "balance/eventqa.ts",
      "sha256": "1084ef9e10df2ecdf58d764fcaa585a97ebdeca5819d471925f8183584f3a80d"
    },
    {
      "file": "balance/exhaustion-cues-ui.cjs",
      "sha256": "7f05e4256aae575763e90b59e45e7e2e5cc93d517d1394c8f6b2f493ac0fa383"
    },
    {
      "file": "balance/exploration-density.ts",
      "sha256": "68d280cc8b3b7e24c78a35a8820eae63db727c0327b185935437f282db2fd430"
    },
    {
      "file": "balance/exploration-foundations-ui.cjs",
      "sha256": "225f69eb72eb2b9bdbd92400fd48d76d9dc6efcf8216748692951b81189b1e63"
    },
    {
      "file": "balance/exploration-population-ui.cjs",
      "sha256": "2eb507139271a1029a3e075f2f538c11978c2cc43d94a8d104c35d55af00fce2"
    },
    {
      "file": "balance/explorationreport.ts",
      "sha256": "90d8789a19858c79fee7b1e8e5ee3fc8b72fc5f31cf708db7fee34af50014e1e"
    },
    {
      "file": "balance/feeding-cues-ui.cjs",
      "sha256": "82c9fb949748121618dc9ddb933fecad92d0b92343f70f14294502d254b458fd"
    },
    {
      "file": "balance/field-residency-ui.cjs",
      "sha256": "5003b36afb44fa584a445eeb7cf741ed759d348e625eee3de299068759096219"
    },
    {
      "file": "balance/firing-lane-ui.cjs",
      "sha256": "05f4f4c8db3b65158051eb6badbd9c9eb2e3f2a5dade5be8400170bafc48f341"
    },
    {
      "file": "balance/flask-slots-ui.cjs",
      "sha256": "3fc4161c77673ba95419e24216f5edbacd151febaa05164d60bfeddca38057ec"
    },
    {
      "file": "balance/flask-ui.cjs",
      "sha256": "3f7445a82d121ea83eebd81fac5ebf16e016167114c760a859d49aeb935f3501"
    },
    {
      "file": "balance/floor-work-ui.cjs",
      "sha256": "98aae4df3a7c51b4b7417da4acd56c0d571994938071ca6e3dbe355f1f603f2f"
    },
    {
      "file": "balance/foliage-visual.cjs",
      "sha256": "2603f589fe9c6c412b69ff326f86863dad7d3cd895cb02bdd5875073882e564f"
    },
    {
      "file": "balance/foliage-visual.ts",
      "sha256": "a7e3937169e54cd5ec80456cfbbf4feffde0ababab625c11bbe6f9f116d1a133"
    },
    {
      "file": "balance/font-passives-ui.cjs",
      "sha256": "5096792297e3688c8f46cac3b7333db71d86bd5004ef58724fcd8dd3d187a202"
    },
    {
      "file": "balance/forager-commitment-ui.cjs",
      "sha256": "9a31b2765e199dc92b281e230a4d77e5bfb4d8f5390264ac6874913965e1136e"
    },
    {
      "file": "balance/forest-profile.cjs",
      "sha256": "c2bc335e9994dba0fb2a5bb4c7b7484e7e38024d605bdbc3cf96f004b4bdbf60"
    },
    {
      "file": "balance/formation-identity-ui.cjs",
      "sha256": "de29c464bd6ba6ddbd0f030da5352bbec3d5bceb77ef3e2e6084617f1460cc0f"
    },
    {
      "file": "balance/fraying-nerve-ui.cjs",
      "sha256": "5940149b98ab6b0c35165454164fee677337187588972cebb3705e9f55130cec"
    },
    {
      "file": "balance/gameplay-followup-ui.cjs",
      "sha256": "c31ff4ab1721a54cf5b37d51953f5159e324ba928e87528712a128c7444812f1"
    },
    {
      "file": "balance/garrison-names-ui.cjs",
      "sha256": "f8385a771a25f9dd194041d36c5a99f55f391bbff364e3d99f66837e3c033085"
    },
    {
      "file": "balance/genqa.ts",
      "sha256": "260d310c4e465234d8f2b7a9f742ecf1f4b72020657b9227d8c15f766cde2b2b"
    },
    {
      "file": "balance/geographic-frame-attribution-ui.cjs",
      "sha256": "6de04257a2bf4f6015f0cae5f6dae195af5b02c18d4cfc52c1631f68ed5069e2"
    },
    {
      "file": "balance/geographic-plan-ui.cjs",
      "sha256": "32a7b20c8cf0e9bc8fb6ff95fc5d9db73fe884c6825f3705f6aeb531a3740602"
    },
    {
      "file": "balance/gnatveil-ui.cjs",
      "sha256": "5ea65eb32b9ac244e9d6a88e4dd1c47ee792569f20393a9616848921ebdc3d1a"
    },
    {
      "file": "balance/golems-ui.cjs",
      "sha256": "0afa40e159bc3fec9c7371d084ba5efca58cccdc4ed8b7eb99cb8e80aae68d4e"
    },
    {
      "file": "balance/graph-work-ui.cjs",
      "sha256": "841317ed4c84910166110b6d447fb5b354ed826f3b904b2091b31b0f8a716630"
    },
    {
      "file": "balance/ground-palette-ui.cjs",
      "sha256": "0688e3b5603eb0d3fe4abe0251d0a1fbb23e8f0af0631b9eb9915011eee47303"
    },
    {
      "file": "balance/guard-coverage-ui.cjs",
      "sha256": "08a17429c8aee7b5697083d1b5eca990be6000529b0e8b32293719d7a94c2f71"
    },
    {
      "file": "balance/guard-recency-ui.cjs",
      "sha256": "284045d78bec78e0b2c5ff17f34f0519711af0c76ddf33ad6419aa5a15d5fc2e"
    },
    {
      "file": "balance/guardians-ui.cjs",
      "sha256": "11700fa676852002268f45af518eb67963fabfd863dd520d059341816629d7c6"
    },
    {
      "file": "balance/held-priority-ui.cjs",
      "sha256": "3ee667f4df150611223f87e633fc7b4f6775e27db343339ca59db70d114dab91"
    },
    {
      "file": "balance/hivecall-ui.cjs",
      "sha256": "26339ae06c5a399f4f928592a073c5972617fd21e49ac8cb1f743bd94fb8d21d"
    },
    {
      "file": "balance/impale-cues-ui.cjs",
      "sha256": "d0c621c1e7edccb77cd1b24c527ff3b353ff4a5671aa2a01965dafcad85e9bf4"
    },
    {
      "file": "balance/inventory-pages-ui.cjs",
      "sha256": "3011e3314d05c4f9235439e51a5d90087cf483b165fbd51264855be7a019dd2f"
    },
    {
      "file": "balance/inventory-tabs-ui.cjs",
      "sha256": "68c17910eb90276fcbeb2fa5265b550f75e664c6abce22293b821880028edee3"
    },
    {
      "file": "balance/inventory-ui.cjs",
      "sha256": "eaf580942913e23cc9a9cd04991d271c520c7669cf77b71d63c61a497d9e3ea8"
    },
    {
      "file": "balance/landforms-ui.cjs",
      "sha256": "a45375d98859d081e2ded0bb7bf25c80ce4f35cdc6ac32529f1c5980bc808c52"
    },
    {
      "file": "balance/landslide-ui.cjs",
      "sha256": "08be1d8804e1ca987926129836904d9422cdc30398109b60e3e797ab6333b550"
    },
    {
      "file": "balance/layoutmetrics.ts",
      "sha256": "213256d7d29311f9d3f1edce42742b774b22d990584d965439bfcbc446290e76"
    },
    {
      "file": "balance/light-sight-ui.cjs",
      "sha256": "8e9b86d73767b5d6aded6209273bc974572d0b65a6bdd2e546b8e1cf6b23ea2f"
    },
    {
      "file": "balance/loading-isolation-ui.cjs",
      "sha256": "74f3f01a9cd74250a05d7d69dac4f8d53259929dcbe0ebb9b7a297bb787070fa"
    },
    {
      "file": "balance/loading-screen-ui.cjs",
      "sha256": "f90898c7e3b1798a7caba1dba4bc1f6de65ddcd7e02589f7d1d8bc9a340e2884"
    },
    {
      "file": "balance/magic-packs-ui.cjs",
      "sha256": "d4350876c0d6f223c9981616d209962842410aca817a53a740a6f43726427a85"
    },
    {
      "file": "balance/melee-read-ui.cjs",
      "sha256": "9fcdcf34c57a8b4bf6c17c82ab95649e9638e904d855bfb8cd76d59b75090c52"
    },
    {
      "file": "balance/memory-purpose-ui.cjs",
      "sha256": "6a715858a0dbec38031ad57b74998b4bfa4878c5ac49a6471496f2cbbc5e660d"
    },
    {
      "file": "balance/memory-unlocks-ui.cjs",
      "sha256": "8cfc75d6d7a5cbbef135da7fcdf0d32909fd813215250e751c048e8b7a510813"
    },
    {
      "file": "balance/menu-controls-ui.cjs",
      "sha256": "70d301bea1e084263dcda5540052ce807c3bb2c15813e82a557aed467cbf5b1e"
    },
    {
      "file": "balance/menu-tray-ui.cjs",
      "sha256": "47de2fc17cf3686371a76757cef2a5a8c24168b5c78f93d4a315abea3bda6b9e"
    },
    {
      "file": "balance/meter-concealment-ui.cjs",
      "sha256": "e4c38a97008cb7e4e0ad7b5c344fdb4abf9c177d8b5f4275643e0b5741b389b5"
    },
    {
      "file": "balance/minimal-ui-preferences-ui.cjs",
      "sha256": "eba9ed0f2a68ce9c18f77da61a4a0c8711baf6f79808316b7f9ddb82a08a02e8"
    },
    {
      "file": "balance/movement-priority-ui.cjs",
      "sha256": "2b14e2f1eab90db29efaba00cf4a605eba3c91eba96ddb5da25328a12948862e"
    },
    {
      "file": "balance/movement-study.html",
      "sha256": "20008c767654b4856e549caab67c04c91fc76669b839d7974d15913be83fedbe"
    },
    {
      "file": "balance/movement-tethers-ui.cjs",
      "sha256": "e4c86254419229b5796e745f7e61fe16f3a0f148a94baef54d8326a77d11d544"
    },
    {
      "file": "balance/movement-visuals-ui.cjs",
      "sha256": "3abc0a863f918c748e6a57174064d161d896c0715f78169b934661e118b9a4a6"
    },
    {
      "file": "balance/muReliquaryChecks.ts",
      "sha256": "a406d240a20db03dd912c2793502802ce89efe3aa94063f2a9adb907d826bd39"
    },
    {
      "file": "balance/muReliquarySourceFixture.ts",
      "sha256": "2bb001ad2f1a4c2888904001cd38b0b36e14244f2940bb4d4b8e1db8a91a108b"
    },
    {
      "file": "balance/native-beacons-ui.cjs",
      "sha256": "4a51364ea5cdf737fc18e59dadbd488ba003747f734c3ba1361cca0b20092112"
    },
    {
      "file": "balance/native-begin-hydration-ui.cjs",
      "sha256": "02cc22e612861f460d0bb35d8d5e9f6ea00792f2e68189e80fdef5bb0470526d"
    },
    {
      "file": "balance/native-browser-entry-ui.cjs",
      "sha256": "e6afc731664f18c57f5148098cafe648f613a7c616d83a75e19a805fa51d463e"
    },
    {
      "file": "balance/native-couch-join-ui.cjs",
      "sha256": "3412527ba988ae3a3d29397d689cd86fba0f8be93ac1894a469c8406bae171a5"
    },
    {
      "file": "balance/native-courts-ui.cjs",
      "sha256": "85c57a7d5494ade772c31050a5fb5bb9904e0902116c33500a68e7ea18da8ee3"
    },
    {
      "file": "balance/native-generation-ui.cjs",
      "sha256": "e801c1f3fc24e128dbb890237f227900fa0a114bfb1d77af7fd449b8149e49a6"
    },
    {
      "file": "balance/native-haven-ui.cjs",
      "sha256": "b9fbddb4269c5ed5afd655385ad6e657266995b80fec999570fb0e46178033a7"
    },
    {
      "file": "balance/native-hosted-browser-ui.cjs",
      "sha256": "40ee35ffa4e8884a7976279f6223a7c04355a74b431083ad17c32d4a4eec20b6"
    },
    {
      "file": "balance/native-main-cast-ui.cjs",
      "sha256": "33feb0967369ebbff25db9c95fbfab9a1df01c3aec22bae096de2ccf3fb2d6e0"
    },
    {
      "file": "balance/native-occurrences-ui.cjs",
      "sha256": "4dd3d50f7cf3c036f8b6c1e5630de99ace5df51fee712926f4147d8018b05b5f"
    },
    {
      "file": "balance/native-pages-browser-fixture.ts",
      "sha256": "fcd7b8a07d26c8d5c63499c044112f6caa66d23c712a5605e92787a0bc8d5ab3"
    },
    {
      "file": "balance/native-processions-ui.cjs",
      "sha256": "214a33e924c60b636f4bf5b24cd00d1c8579a513034c8778299e62f102d22f30"
    },
    {
      "file": "balance/native-regional-ui.cjs",
      "sha256": "0baad8dd87b98be2918df588a1ac92778992bad865ee57f58f1352e71f29fdd7"
    },
    {
      "file": "balance/native-resume-ui.cjs",
      "sha256": "9c44a34a11775c69bde4c6a8275d65a6acb80d43ac35232a676a7cbc816054f4"
    },
    {
      "file": "balance/native-resume-validator-ui.cjs",
      "sha256": "0b96220b1227eb6abc4618c7389bd66379de3ffa084d5e60bd420a622a27980a"
    },
    {
      "file": "balance/native-seating-ui.cjs",
      "sha256": "cdb129ca33e82c55884b47e7a262c508211cb3ca88bed0b09327cddfbf9e3a72"
    },
    {
      "file": "balance/native-shard-cli.cjs",
      "sha256": "c602d10efeefcfee3407be02f46760be917836c2c8bd1985344947b0f1893851"
    },
    {
      "file": "balance/native-shard-entry-lifetime-ui.cjs",
      "sha256": "dc905f2d8b7942136a8b67d134334abf89f4cc3a1807825792c0009d8b3c923d"
    },
    {
      "file": "balance/native-terrain-patches-ui.cjs",
      "sha256": "9748d168932b3c4f982b24f7dca1eaf5c58a36db76bd12ad12a3331f0b4eeb01"
    },
    {
      "file": "balance/native-urns-ui.cjs",
      "sha256": "943558b44b64a2efd55e1e03983ec9d1d6d011831a0a9fca3aaf33efadf20565"
    },
    {
      "file": "balance/native-windchill-ui.cjs",
      "sha256": "d1013546c276f64a61c21eb2bfecbf50e72ae3c30e9071f6f5ef3c6e296eef54"
    },
    {
      "file": "balance/native-woodland-ui.cjs",
      "sha256": "57388eafd272985c1ab10111ad6a3b35682d1fa58b647d3d31c8cedc0de930d8"
    },
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "sha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAICompositionFixture.ts",
      "sha256": "ff101f70e68d0ad911d0c21adbee136243b1a8f31a39155fb2ed735dec0d399f"
    },
    {
      "file": "balance/nativeAIExtractionFixture.ts",
      "sha256": "03a12b29610ffab38886ecdc8b3a22b32c66fe1548d06dbdb503534063aa853a"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "sha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeAITargetContinuityFixture.ts",
      "sha256": "0a281f6d2aca9d7bda384dc2ddecf0531887a29b02cc1672c0bd5b2cdb416e46"
    },
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "sha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeActiveDescentFixtureSource.ts",
      "sha256": "f1e3bf02e6a1e63443e35842b99b9be5a89a54c03520aea740570c31afab19cd"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "sha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAdmissionCompositionFixture.ts",
      "sha256": "2a080e042457ac828b7169ef4b3c4bd69bb20e72e6fa80b0c271ffb7304787ca"
    },
    {
      "file": "balance/nativeAreaMenuArchive.ts",
      "sha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870"
    },
    {
      "file": "balance/nativeAreaMenuFixture.ts",
      "sha256": "455a0155a9ea702b51589eb552c3f4cf1c5dafebb90286b89e8855e8b900ebaf"
    },
    {
      "file": "balance/nativeAreaPublicationArchive.ts",
      "sha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48"
    },
    {
      "file": "balance/nativeAreaUIActionArchive.ts",
      "sha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8"
    },
    {
      "file": "balance/nativeAreaUIActionFixture.ts",
      "sha256": "999c948fe5ccd6093a3ad07497eab91564c84304f9960a08f2dd5955766c6935"
    },
    {
      "file": "balance/nativeAreaViewQueryArchive.ts",
      "sha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31"
    },
    {
      "file": "balance/nativeAreaViewQueryFixture.ts",
      "sha256": "c563c3e417ba09e66356c0031f4143d29382cb794df963db471f8a68b458f109"
    },
    {
      "file": "balance/nativeArrivalCompositionArchive.ts",
      "sha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40"
    },
    {
      "file": "balance/nativeArrivalCompositionFixture.ts",
      "sha256": "4e3175f23d2171deb8ec072c9fc0fb58de0707769379ef41a3817dae39b7e914"
    },
    {
      "file": "balance/nativeBirthLifetimeArchive.ts",
      "sha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22"
    },
    {
      "file": "balance/nativeBirthLifetimeFixture.ts",
      "sha256": "8eded6a6fd04e8a2cc9c16824d31d97ad42f6ba93b883f11b114745afb450ad4"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceArchive.ts",
      "sha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceFixture.ts",
      "sha256": "273cf1074928b2ff4520948a6711019bb7d89057e0a6b17df164ad2629c58c63"
    },
    {
      "file": "balance/nativeBountyArrivalArchive.ts",
      "sha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b"
    },
    {
      "file": "balance/nativeBountyArrivalFixture.ts",
      "sha256": "ecac93fa50fecb96be3951b6f5c48e6efeae920d87588a5f5dedf5c5332a3429"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionArchive.ts",
      "sha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionFixture.ts",
      "sha256": "1df8a818224af45af45af6b05eb3a08f35d411ced25f0cd22bcd3bf1127e1760"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionArchive.ts",
      "sha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionFixture.ts",
      "sha256": "5ccebaf96b6eb55a1c28e9f2aa3706ae4135e8056da9d91d52a59607c35cd191"
    },
    {
      "file": "balance/nativeCampaignCompositionArchive.ts",
      "sha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    },
    {
      "file": "balance/nativeCampaignCompositionFixture.ts",
      "sha256": "8e49862b5b5fbade7a315a6b542c2dfb6624185aa9f888f71bae78da83c5ba13"
    },
    {
      "file": "balance/nativeCampaignReaderAssertions.ts",
      "sha256": "013b23377aad9271ba107c6ebbf3a321f7271d425724553e79b5dbf1e2c7f727"
    },
    {
      "file": "balance/nativeCaravanArrivalReceiptFixture.ts",
      "sha256": "bb52d58c557f77d5cf73b61871207c46d54e6c4d99a40885cceeec50e49bd959"
    },
    {
      "file": "balance/nativeCaravanCompositionArchive.ts",
      "sha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4"
    },
    {
      "file": "balance/nativeCaravanCompositionFixture.ts",
      "sha256": "0f5e72db7cbe929124be5928e3801ecfe92fee7f1d3680fad9a1ad6852655eda"
    },
    {
      "file": "balance/nativeCaravanExtractedReadArchive.ts",
      "sha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0"
    },
    {
      "file": "balance/nativeCaravanExtractedReadFixture.ts",
      "sha256": "5efce6ed786f79583168e7d55d011c971588f34a31f290c0e691292081cfe71b"
    },
    {
      "file": "balance/nativeCaravanLegacySourceFixture.ts",
      "sha256": "4d7d2d6c147b2dcd904910696e690f0a2248859db55081b21d800c8180540eff"
    },
    {
      "file": "balance/nativeCaravanNewsArchive.ts",
      "sha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f"
    },
    {
      "file": "balance/nativeCaravanNewsFixture.ts",
      "sha256": "c3d559256b31fa71495fd0d41e710e34fa129557c39dc9e73e483675c7c79f39"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalArchive.ts",
      "sha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalFixture.ts",
      "sha256": "3980c441c4e72245eca45d9df8d9e2a836a7207bcda0e9c1d4771c746942b919"
    },
    {
      "file": "balance/nativeCarriedControlArchive.ts",
      "sha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66"
    },
    {
      "file": "balance/nativeCarriedControlFixture.ts",
      "sha256": "ef0b77f9f2146c03cbac30850cfc907fda2f5b753f1192548e0a1806fbbd0c39"
    },
    {
      "file": "balance/nativeClientConclusionCompositionArchive.ts",
      "sha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41"
    },
    {
      "file": "balance/nativeClientConclusionCompositionFixture.ts",
      "sha256": "06b0f78ba1930101c8ae616e7307355d7cdc65b6e699837d5dc3ab74d19dc3af"
    },
    {
      "file": "balance/nativeClientContinueArchive.ts",
      "sha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0"
    },
    {
      "file": "balance/nativeClientContinueFixture.ts",
      "sha256": "20d253e8d2c2065e7bd327cf04e98669ef020ce372b6fa35d9e4dd84ec774988"
    },
    {
      "file": "balance/nativeClientContinueFixtureSource.ts",
      "sha256": "8372b221c2161a480b5b7b0e26662d9f3dad9cc6d22fbc77479f84cc5822a3c4"
    },
    {
      "file": "balance/nativeClientContinuityCompositionArchive.ts",
      "sha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945"
    },
    {
      "file": "balance/nativeClientContinuityCompositionFixture.ts",
      "sha256": "6b40bb9c2c5459d64581a25241c1b8b82ad999675254ba8afaae7fe407353754"
    },
    {
      "file": "balance/nativeClientMenuCompositionArchive.ts",
      "sha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496"
    },
    {
      "file": "balance/nativeClientMenuCompositionFixture.ts",
      "sha256": "1eace6139ae7a693cbbe2be33ad34cfbcf6516fea2f59f4c7894a2b01ae5a4d8"
    },
    {
      "file": "balance/nativeClientPublicationCompositionArchive.ts",
      "sha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f"
    },
    {
      "file": "balance/nativeClientPublicationCompositionFixture.ts",
      "sha256": "1323865546d48d10581b25293c303963b9e27dd4a32d2cfe408535a13d037b69"
    },
    {
      "file": "balance/nativeClientRuntimeArchive.ts",
      "sha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a"
    },
    {
      "file": "balance/nativeClientRuntimeFixture.ts",
      "sha256": "706a0a53f7ad60756c416b6b84f8c164b1fde6ed0deef3ad903a0ef5af497990"
    },
    {
      "file": "balance/nativeClientRuntimeFixtureSource.ts",
      "sha256": "de90d839ce2ff2a38984b407f80edbc701434155099841089b2c51aa2e2c7bac"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionArchive.ts",
      "sha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionFixture.ts",
      "sha256": "4ebc18e4f746411184fb7194ff8f4f169661bef32f224a77e846d0b9cfec8632"
    },
    {
      "file": "balance/nativeClientStartArchive.ts",
      "sha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "file": "balance/nativeClientStartFixture.ts",
      "sha256": "db494d0b5bf0433fda21e8486bcd920be4b904c049276ff4c6fe2d0c1a3c1715"
    },
    {
      "file": "balance/nativeClientStartFixtureSource.ts",
      "sha256": "218daf4c3b16689d19c714d2c88e6c66848a4c14fbd3d898baf0d49a6a1ff689"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionArchive.ts",
      "sha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionFixture.ts",
      "sha256": "90da75966389f79bc3967947f710d95ed041700659c94db78568bfd37c63a4ba"
    },
    {
      "file": "balance/nativeCombatKernelHooksFixture.ts",
      "sha256": "f5eb4a7df03d9f57305cfc2fe4fd5196d47244e7b75f7a11b650b659724dad3d"
    },
    {
      "file": "balance/nativeCombatLeafVisualArchive.ts",
      "sha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505"
    },
    {
      "file": "balance/nativeCombatLeafVisualFixture.ts",
      "sha256": "92e34dd56b0a1b58964d71eaef890908559962d8b24776e3ff55b856e19fdf5d"
    },
    {
      "file": "balance/nativeCombatMotionHooksFixture.ts",
      "sha256": "1f3c26f7113d1f561e6721df9ae11ab702b2810bf5c453d25849768dc43c096f"
    },
    {
      "file": "balance/nativeCombatPresentationArchive.ts",
      "sha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c"
    },
    {
      "file": "balance/nativeCombatPresentationFixture.ts",
      "sha256": "daf8c1c47af325858b7f02055c561b0f88661b4f295c0783ff4b5ace4b0aaa60"
    },
    {
      "file": "balance/nativeCombatRecordSelectionFixture.ts",
      "sha256": "1ccaaf05ccf4baad7c75246c65a2d82092cb11c447a98cda93d899da12b0c468"
    },
    {
      "file": "balance/nativeCombatRetainedFixture.ts",
      "sha256": "e2f85e1c409c48178bdb2e7dce908c45db243eb8f849419c1ea068e25da3c722"
    },
    {
      "file": "balance/nativeCompleteBirthArchive.ts",
      "sha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206"
    },
    {
      "file": "balance/nativeContinuityCompositionArchive.ts",
      "sha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405"
    },
    {
      "file": "balance/nativeContinuityCompositionFixture.ts",
      "sha256": "dff23be4a45d99edc1a6e6aecb2d6e0f40e076843c4fafe8301196570cae800f"
    },
    {
      "file": "balance/nativeCouchJoinBrowserFixture.ts",
      "sha256": "cec56eedb821cdff53e441f9f3f96bab584baa380372f35d63fa6ac0806f56e8"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeArchive.ts",
      "sha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeFixture.ts",
      "sha256": "82eabba7a5802405c96b219acbf118ee1c7f66a6a7ddfc8626676182d876bf26"
    },
    {
      "file": "balance/nativeDelayedArrivalFixture.ts",
      "sha256": "8cc1aad8f75be9455dfdef374aecf987e665603f09ac2253f0224c71ddacb72f"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceArchive.ts",
      "sha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceFixture.ts",
      "sha256": "4df5d62ed7746a996fbc8df2df6a308443dfaed92cea1b2662fcc7248dc764ae"
    },
    {
      "file": "balance/nativeDimensionCatalogArchive.ts",
      "sha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107"
    },
    {
      "file": "balance/nativeDimensionCatalogFixture.ts",
      "sha256": "ad6e14269b4731133e1fb3618ec1e47943d144363092d66052e4c976825ee17f"
    },
    {
      "file": "balance/nativeDirectorBirthSourceArchive.ts",
      "sha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112"
    },
    {
      "file": "balance/nativeDirectorRetirementFixture.ts",
      "sha256": "66d1c82480ea15af19e6946567032ea3b3b5ab6979422c874b5a262654f63601"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceArchive.ts",
      "sha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceFixture.ts",
      "sha256": "800371bc5f1c3f21723eafc8d7a70e2d8b121e38f4e35ae09d9289eddc71eff2"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceRead.ts",
      "sha256": "33a455d9e9be081cda677b201f7099793d1bdc436e2faf797d0938ab6fdded6a"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceArchive.ts",
      "sha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceFixture.ts",
      "sha256": "11e4d8b92d30c42515b62109c704d565e6856a26115a98223a74883ee6504bbb"
    },
    {
      "file": "balance/nativeExactAnchorArchive.ts",
      "sha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d"
    },
    {
      "file": "balance/nativeFrameAttendanceFixture.ts",
      "sha256": "1fd13bc485cebf8ee4a57982b7e5b6b5bd319cce983f4031f33c1494694207b0"
    },
    {
      "file": "balance/nativeFrameContactSourceArchive.ts",
      "sha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb"
    },
    {
      "file": "balance/nativeFrameContactSourceFixture.ts",
      "sha256": "c71dceeaa841ed6116b5ff0342bbe7fa1942c379fbb770f24121462c6d2cb511"
    },
    {
      "file": "balance/nativeFrameHooksFixture.ts",
      "sha256": "5de5c0547fc7978d1a8c6bd4a0e0fefb602e86598cbafcc9413d7d8adf27b9a4"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsArchive.ts",
      "sha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsFixture.ts",
      "sha256": "53f11c05c40e2751603999f839ca21549280abfa58bc96f666e27b2482d1c49c"
    },
    {
      "file": "balance/nativeFrameRegionContractTypes.ts",
      "sha256": "f2888dd5eec9f71811416b3ca8dee92ebb14f3a912dd9e0aabc816a9af708907"
    },
    {
      "file": "balance/nativeFreshAssemblyFixture.ts",
      "sha256": "eed33a6f51655b39fd9685164a9850c60c56307cdd20bca192686e91fd7000ed"
    },
    {
      "file": "balance/nativeGraphArchive.ts",
      "sha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e"
    },
    {
      "file": "balance/nativeGroundCurrentSourceArchive.ts",
      "sha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5"
    },
    {
      "file": "balance/nativeGroundCurrentSourceFixture.ts",
      "sha256": "40104878129cb3292c6fc8e0a825810e708f03226fc298f9df8a9fb23f5689aa"
    },
    {
      "file": "balance/nativeGroundFollowUpsOwnerArchive.ts",
      "sha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b"
    },
    {
      "file": "balance/nativeHarborArrivalArchive.ts",
      "sha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842"
    },
    {
      "file": "balance/nativeHarborArrivalFixture.ts",
      "sha256": "21aa5f36627400813088488e5e162894b71458a2943c36eecc83e928bef96a43"
    },
    {
      "file": "balance/nativeHarborServicesArchive.ts",
      "sha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8"
    },
    {
      "file": "balance/nativeHarborServicesFixture.ts",
      "sha256": "e72ad2b5b297d155ad26ee5e76f66cbb07f2c9253bfab95ed25dbd0047a1119a"
    },
    {
      "file": "balance/nativeHistoricalActorReceipt.ts",
      "sha256": "468d87ab7b9ff3a3fcfdf017f9ce2a948af1503b5a6eac10dfd6b46be0587d44"
    },
    {
      "file": "balance/nativeHistoricalArrivalGrounds.ts",
      "sha256": "b3bdc16f373b8a14c5335b454c9b36542d38ba9c573625e58766e49d34665810"
    },
    {
      "file": "balance/nativeHistoricalArrivalPolicy.ts",
      "sha256": "914a7625c96f98e9ba4ff61266ccca4b6344d4e1c131cd22c90c051db530972d"
    },
    {
      "file": "balance/nativeHistoricalCleaveArchive.ts",
      "sha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd"
    },
    {
      "file": "balance/nativeHistoricalCleaveReceipt.ts",
      "sha256": "2b03bfb67bc8d4082720cc0e6cd4a2ad59dfc710417a7f10151622a1c71bb9fa"
    },
    {
      "file": "balance/nativeHistoricalConcealmentArchive.ts",
      "sha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c"
    },
    {
      "file": "balance/nativeHistoricalWorldDelegates.ts",
      "sha256": "c95a24071246e5afe1b11c1f63e5c08ce64e3a002c6943295eccca5d03f4e6f5"
    },
    {
      "file": "balance/nativeHistoricalWorldGuard.ts",
      "sha256": "b1d8cdf338f36d14a846b8abb26b68585cc81be2061cb88c9d346f3efc98fc83"
    },
    {
      "file": "balance/nativeHistoryArrivalArchive.ts",
      "sha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450"
    },
    {
      "file": "balance/nativeHistoryArrivalFixture.ts",
      "sha256": "966865e993529a2a90785c5492b6f7dd69adc701da23de60fa5872bcfead3d95"
    },
    {
      "file": "balance/nativeHostClosureArchive.ts",
      "sha256": "9c79682e31cc6f743c25799e376668742526a9714fa0d1484962001ab6f4114e"
    },
    {
      "file": "balance/nativeHostClosureFS.ts",
      "sha256": "030c3a51f2ccd67926de062fcd93ea7271eb104030764ec6be5f9f38914423e9"
    },
    {
      "file": "balance/nativeHostClosureFixture.ts",
      "sha256": "eefb1bb79afddf124462c09f4326029bede8da3616496cc0e8f994bbe9547c63"
    },
    {
      "file": "balance/nativeHostPerformanceArchive.ts",
      "sha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607"
    },
    {
      "file": "balance/nativeHostPerformanceFS.ts",
      "sha256": "aea16eb1122421776afd95e17c9f71772c6e0737408ccb44a5c48b9fb53d1adb"
    },
    {
      "file": "balance/nativeHostPerformanceFixture.ts",
      "sha256": "b5055a4b20b07c32b62d5f8c1b04b97078416a337426fe30488b77d30e8e9f00"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "sha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
    },
    {
      "file": "balance/nativeHostedPublicationFixture.ts",
      "sha256": "99369892a0ebba42056a69e837e4855ed45a451815c22e07b2cd3142b89c030f"
    },
    {
      "file": "balance/nativeHuntMigrationArchive.ts",
      "sha256": "be9e859a9ef5713ee23cb06d7dc715debdd48eccec9e3484811ef9ff8413d1d5"
    },
    {
      "file": "balance/nativeHuntMigrationFS.ts",
      "sha256": "8bf539dc7e33c5524d07c46a4570fe1cf30fd554303d27d3a76cad8ad6d368d0"
    },
    {
      "file": "balance/nativeInhabitantControls.ts",
      "sha256": "fb25f581f408cf623b9f327093a5073472940eba9b74f3338ab6fb4e7bfc779e"
    },
    {
      "file": "balance/nativeInstalledSourceFixture.ts",
      "sha256": "c14d72a9551d0934ba88cfca8ef8e7973f9e7634760373af92667b1aa78e6283"
    },
    {
      "file": "balance/nativeInstalledSourcesArchive.ts",
      "sha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16"
    },
    {
      "file": "balance/nativeJourneyCompositionArchive.ts",
      "sha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07"
    },
    {
      "file": "balance/nativeJourneyCompositionFixture.ts",
      "sha256": "2bbdd855b9b3e8c711579a53cf6e250c17c3ec78497616279d4c1adefc9f5266"
    },
    {
      "file": "balance/nativeLateEncounterFixture.ts",
      "sha256": "fdf5e1c32a779f22635fe8995a2dc449ee8569d824d0101cd0287688c881de68"
    },
    {
      "file": "balance/nativeLiveSiteArchive.ts",
      "sha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8"
    },
    {
      "file": "balance/nativeLiveSiteFixture.ts",
      "sha256": "f15b3107f6cc8724dec7cfcb9eea2a36ea38c9dd6865612abb9cfe71a31cb064"
    },
    {
      "file": "balance/nativeLocalInputArchive.ts",
      "sha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a"
    },
    {
      "file": "balance/nativeLocalInputFinalArchive.ts",
      "sha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f"
    },
    {
      "file": "balance/nativeLocalInputFinalFixture.ts",
      "sha256": "7417eb3e2274f9bf41328cc32ebdbe43277dacf5b1c95b29fcaff17eeef2d87e"
    },
    {
      "file": "balance/nativeLocalInputFixture.ts",
      "sha256": "ffe62e38b44fc4ca56d91c502c9a6d4dd0137e5eb7714aee55dba854537cc22b"
    },
    {
      "file": "balance/nativeMainCastActorReceipt.ts",
      "sha256": "2047ec482037f8eca0878dc77bf5104dd870f776502eaeac409cd60a97d23738"
    },
    {
      "file": "balance/nativeMainCastSourceArchive.ts",
      "sha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe"
    },
    {
      "file": "balance/nativeMainCastSourceFixture.ts",
      "sha256": "ffad0c874f720eac5d0721a41cd556c60814e49723ee1cfe2fc26df5d47b8f2d"
    },
    {
      "file": "balance/nativeMainContentArchive.ts",
      "sha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604"
    },
    {
      "file": "balance/nativeMainContentFixture.ts",
      "sha256": "cbf2dc68e5e0645b8a6596743b1ddbc88e52355169334128d5f4537c17af9614"
    },
    {
      "file": "balance/nativeMainHostCompositionArchive.ts",
      "sha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84"
    },
    {
      "file": "balance/nativeMainHostCompositionFS.ts",
      "sha256": "d049d8476857ad466670acce38ba162ee61cf80bee11cb46b68838c062d770f2"
    },
    {
      "file": "balance/nativeMainHostCompositionFixture.ts",
      "sha256": "42a68c4ebaf15c69fd337b67f1f5c384f7fa6278981e829ebabe84f1e73c91bb"
    },
    {
      "file": "balance/nativeMainProofHistoricalFixture.ts",
      "sha256": "c5012d2c40e48e4dbd78cde58f1870f84d45b2f903ac2eee057de6cd0b6cc7ee"
    },
    {
      "file": "balance/nativeMainProofSourceArchive.ts",
      "sha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441"
    },
    {
      "file": "balance/nativeMainProofSourceFixture.ts",
      "sha256": "158258ba1ca4f213e906979fc4757957fc0918af2cad42ef1c6fab796fb8877a"
    },
    {
      "file": "balance/nativeMainVisualSourceArchive.ts",
      "sha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d"
    },
    {
      "file": "balance/nativeMainVisualSourceFixture.ts",
      "sha256": "36b885c89f60e7507cfe16c5c542874057eef17a0f2dede19bcb18585c2756bd"
    },
    {
      "file": "balance/nativeNearScaleSelectionArchive.ts",
      "sha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5"
    },
    {
      "file": "balance/nativeNearScaleSelectionFixture.ts",
      "sha256": "1d7f3aafc74a5689ea8537f4a43424dfd7184d2126fe7ac034525d4977689014"
    },
    {
      "file": "balance/nativeNemesisDepartureArchive.ts",
      "sha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c"
    },
    {
      "file": "balance/nativeNemesisDepartureFixture.ts",
      "sha256": "68135190db0e032313bc9678fe4c1f9ab9744157ab4f78123d45a42801a8a405"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionArchive.ts",
      "sha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionFixture.ts",
      "sha256": "49af8629bae83ce0d12fe25733de58fdce05481e1c1238d555006829adfb7592"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "sha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    },
    {
      "file": "balance/nativeOdysseyGroundFixtureSource.ts",
      "sha256": "08706779ae7a2c691df607a138d58cea16f6a993e7c2412da95f58155bbbb91f"
    },
    {
      "file": "balance/nativeOdysseyHistoricalRescueArchive.ts",
      "sha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4"
    },
    {
      "file": "balance/nativeOdysseyPressureArchive.ts",
      "sha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1"
    },
    {
      "file": "balance/nativeOdysseyPressureFixtureSource.ts",
      "sha256": "7169d74f404b32c3b19d78442f287233481219b0850b920fc3371eb1ae5976df"
    },
    {
      "file": "balance/nativePartyArchive.ts",
      "sha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582"
    },
    {
      "file": "balance/nativePartyDeathArchive.ts",
      "sha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d"
    },
    {
      "file": "balance/nativePartyDeathFixture.ts",
      "sha256": "3970fa58f5676f3d1494b1aeffb463c7dabcffef9185162a55f45ba35fe09370"
    },
    {
      "file": "balance/nativePartyDeathFixtureSource.ts",
      "sha256": "62222b4a43c387223065b936fc96b5c7f104153c13f1b306473d646105a04031"
    },
    {
      "file": "balance/nativePartyFixture.ts",
      "sha256": "0bfb7057f14bb7d1168039ef1360d82c08762340f22f26825d4cbbecfb734253"
    },
    {
      "file": "balance/nativePartySourceFixture.ts",
      "sha256": "ad54967fe242d285e52372d7d458e9b966a74256fa996394f9e25583c8ced554"
    },
    {
      "file": "balance/nativeRealmContextArchive.ts",
      "sha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6"
    },
    {
      "file": "balance/nativeRealmContextFixture.ts",
      "sha256": "9a712ccb030345b8e477b3b1c819dda56ceec6a387f59a542032d6bfa697ffcd"
    },
    {
      "file": "balance/nativeRealmEntryFixture.ts",
      "sha256": "28c549e413749abb4c3831baa43c69983d2a6a4690fbe55fcbd90a67fcb684c5"
    },
    {
      "file": "balance/nativeRepeatEventArchive.ts",
      "sha256": "1c87579238125a790b59f430894d4786e9675927e3b099637713536ebef159e8"
    },
    {
      "file": "balance/nativeRepeatEventFS.ts",
      "sha256": "6bcae3316aa2ffcce70c79efacc90e451bd674a160227fc07e9dc3a791d0109e"
    },
    {
      "file": "balance/nativeRepeatEventFixture.ts",
      "sha256": "c3a329d97cc8241e05a3180eeb712ac1e80977054de7b10faccae4fb2ed7ba75"
    },
    {
      "file": "balance/nativeRescueAnchorArchive.ts",
      "sha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05"
    },
    {
      "file": "balance/nativeRescueAnchorFixture.ts",
      "sha256": "a77badbb928f8764a7f6f76d9a2e1b26deae78ff7d8873d7c4b533896230f068"
    },
    {
      "file": "balance/nativeRunConclusionArchive.ts",
      "sha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d"
    },
    {
      "file": "balance/nativeRunConclusionFixture.ts",
      "sha256": "e185488ad95469481162a8b68eec1ee7c8c47acc973abd072251ebb30651b41f"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeArchive.ts",
      "sha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeFixture.ts",
      "sha256": "2df0ec04f7f1de8f8f32fe241366bab37c2475c1985dc6ed2300214c86668e4f"
    },
    {
      "file": "balance/nativeRuntimeFixture.ts",
      "sha256": "8f1284eda1dac162579d6129ae875276bd74d072297065e34d9ed399f16c105d"
    },
    {
      "file": "balance/nativeSaveWriteOrderArchive.ts",
      "sha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14"
    },
    {
      "file": "balance/nativeSaveWriteOrderFixture.ts",
      "sha256": "d4b6cd6cab3673668335d7548ec4c4879f79dcc3f4d3696ead4215a7e1e965de"
    },
    {
      "file": "balance/nativeSceneAIArchive.ts",
      "sha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a"
    },
    {
      "file": "balance/nativeSceneBirthFixture.ts",
      "sha256": "b4fe4933a6c1560ae4197d85806af9913059a38e7c5586fc246debef99a9ceb4"
    },
    {
      "file": "balance/nativeSceneCampaignFrameArchive.ts",
      "sha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad"
    },
    {
      "file": "balance/nativeSceneCampaignFrameAttendanceArchive.ts",
      "sha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureArchive.ts",
      "sha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureReference.ts",
      "sha256": "e1e8c327463573b534707eaf39fe82fd522a8ee9e9cc4075d2193759ecb8bf60"
    },
    {
      "file": "balance/nativeSceneCampaignTransitionsArchive.ts",
      "sha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da"
    },
    {
      "file": "balance/nativeSceneCastingPreparationArchive.ts",
      "sha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationArchive.ts",
      "sha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationFixture.ts",
      "sha256": "f6e3a77adda20db47f347986273da7d01454060fe43dcadcfb2992c26ed5dd9b"
    },
    {
      "file": "balance/nativeSceneCombatCampaignArenaArchive.ts",
      "sha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160"
    },
    {
      "file": "balance/nativeSceneCombatHooksArchive.ts",
      "sha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e"
    },
    {
      "file": "balance/nativeSceneCombatKernelArchive.ts",
      "sha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af"
    },
    {
      "file": "balance/nativeSceneCombatMotionArchive.ts",
      "sha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a"
    },
    {
      "file": "balance/nativeSceneCombatMotionHooksArchive.ts",
      "sha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50"
    },
    {
      "file": "balance/nativeSceneCombatRecordSelectionArchive.ts",
      "sha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86"
    },
    {
      "file": "balance/nativeSceneCombatStateArchive.ts",
      "sha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationArchive.ts",
      "sha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationFixture.ts",
      "sha256": "bd8d58c949a4ab43ff6edc78eb5ab0784fab07fee467ccfc6b81c689bf2dd75c"
    },
    {
      "file": "balance/nativeSceneDefensePreparationArchive.ts",
      "sha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationArchive.ts",
      "sha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationFixture.ts",
      "sha256": "604bdf5fb0f534fbceadc4ee1234e59d83c82b5434468b40f47cf7a7d1ce370e"
    },
    {
      "file": "balance/nativeSceneDisplacementArchive.ts",
      "sha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationArchive.ts",
      "sha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationFixture.ts",
      "sha256": "694ef5393a05e842fb32e7ba10082c285670027cb05bb965ffb2321ed969879a"
    },
    {
      "file": "balance/nativeSceneFrameArchive.ts",
      "sha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba"
    },
    {
      "file": "balance/nativeSceneFrameAttendanceArchive.ts",
      "sha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71"
    },
    {
      "file": "balance/nativeSceneFrameCallbacksArchive.ts",
      "sha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0"
    },
    {
      "file": "balance/nativeSceneFrameClosureArchive.ts",
      "sha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58"
    },
    {
      "file": "balance/nativeSceneFrameHooksArchive.ts",
      "sha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5"
    },
    {
      "file": "balance/nativeSceneFrameInterfacesArchive.ts",
      "sha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsArchive.ts",
      "sha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationArchive.ts",
      "sha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationFixture.ts",
      "sha256": "1cfa5b810ad1ef0fc9daafe13cfd76f3b46a4cc5c4fa127a20c3d3e2a8a88b9d"
    },
    {
      "file": "balance/nativeSceneInputArchive.ts",
      "sha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1"
    },
    {
      "file": "balance/nativeSceneInputFixture.ts",
      "sha256": "c5e4143bee56232c64efe900b3e831bcc7f529d757803fb54867499b4e4bf499"
    },
    {
      "file": "balance/nativeSceneKillAftermathArchive.ts",
      "sha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationArchive.ts",
      "sha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationFixture.ts",
      "sha256": "377aedb7fa946b495ef99b4600c53d9e16e797e36428b49d7aaf06e7aadcc042"
    },
    {
      "file": "balance/nativeSceneLootArchive.ts",
      "sha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20"
    },
    {
      "file": "balance/nativeSceneLootFixture.ts",
      "sha256": "36d7d93b58605c76a50feb30cdab4851e39e0853cb7e74cf434dd78fa863b873"
    },
    {
      "file": "balance/nativeSceneMemoryArchive.ts",
      "sha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e"
    },
    {
      "file": "balance/nativeSceneMemoryFixture.ts",
      "sha256": "5b07106d14e937ff84fc1b1c8cce1b715721eb13f0fe2e2b4e946b323666b6fd"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionArchive.ts",
      "sha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionFixture.ts",
      "sha256": "d41ed9ebf12284704ed619ed6308b28e772d947db4b79d3b00e6016bc50e0d59"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingArchive.ts",
      "sha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingFixture.ts",
      "sha256": "6a378cbea1175e26c56a9af2f630b556301889c8b9b7f04d0e472e554feebd97"
    },
    {
      "file": "balance/nativeSceneProgressionArchive.ts",
      "sha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f"
    },
    {
      "file": "balance/nativeSceneProgressionFixture.ts",
      "sha256": "0fa6e78f3d0476bdc8af63c1801b093f7c45f8ba5096a3429feca3827c66f94d"
    },
    {
      "file": "balance/nativeSceneProjectileArchive.ts",
      "sha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33"
    },
    {
      "file": "balance/nativeSceneProjectileFixture.ts",
      "sha256": "d75c49a754f714eb4a52eacf890726cf3d279b1bd3fcf7d058a605568c040e50"
    },
    {
      "file": "balance/nativeScenePuzzleArchive.ts",
      "sha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443"
    },
    {
      "file": "balance/nativeScenePuzzleFixture.ts",
      "sha256": "4d4786debe93e4727c83428196bfc87f34220afbb305404bbcf90a19736acf13"
    },
    {
      "file": "balance/nativeSceneQuestArchive.ts",
      "sha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c"
    },
    {
      "file": "balance/nativeSceneQuestAuxArchive.ts",
      "sha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a"
    },
    {
      "file": "balance/nativeSceneQuestFixture.ts",
      "sha256": "5b13f253727b1e4f90cafec22bfe4cd4467a7662bd572a699a322842bd78134b"
    },
    {
      "file": "balance/nativeSceneQuestInteractionArchive.ts",
      "sha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062"
    },
    {
      "file": "balance/nativeSceneQuestInteractionFixture.ts",
      "sha256": "74d1d113ee629e8603e1f44810f176fc9c714c5ff1260c2761cce836cde75cf0"
    },
    {
      "file": "balance/nativeSceneRestorationArchive.ts",
      "sha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationArchive.ts",
      "sha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationFixture.ts",
      "sha256": "78f359ad0999957ce41ac13ac5eb40527b970c07573374512a9966c0059a17f8"
    },
    {
      "file": "balance/nativeSceneSummonPreparationArchive.ts",
      "sha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationArchive.ts",
      "sha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationFixture.ts",
      "sha256": "b47018d77d3562b4bda9bcf27ec3665adb45b14d3098e8aa3073f72d045b5acb"
    },
    {
      "file": "balance/nativeSceneTetherArchive.ts",
      "sha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101"
    },
    {
      "file": "balance/nativeSceneTetherFixture.ts",
      "sha256": "4da719a345d6997d7b8cf4c21dabea9c4bf87b840777afde63731b9dab740618"
    },
    {
      "file": "balance/nativeSeatingSurvey.ts",
      "sha256": "004f87d80c72f3a474ff6b18a70711c90a7da3e9cb74f0afc363eebc63d94221"
    },
    {
      "file": "balance/nativeShardEntryLifetimeArchive.ts",
      "sha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa"
    },
    {
      "file": "balance/nativeShardEntryLifetimeFixture.ts",
      "sha256": "f976b5c1b3abb072e3eb13f2f751edb0ea3cbc565452eb1b2dfe8abf4b534468"
    },
    {
      "file": "balance/nativeShardFoundationArchive.ts",
      "sha256": "831898e76223802e8461fc15c2ab7b1bb057a55a825ac75bd2b243bec80ce17f"
    },
    {
      "file": "balance/nativeShardFoundationFS.ts",
      "sha256": "f9bfedb28f1049aaf6491b8ce42a3a5f1ecad007708edadabb8eb5055b21cbd8"
    },
    {
      "file": "balance/nativeShardFoundationFixture.ts",
      "sha256": "64158c0d8aeb27e199cf50af9fbf775114540795c6421a6225a25be3b8039d04"
    },
    {
      "file": "balance/nativeShardKeeperArchive.ts",
      "sha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518"
    },
    {
      "file": "balance/nativeShardKeeperCompositionArchive.ts",
      "sha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8"
    },
    {
      "file": "balance/nativeShardKeeperCompositionFixture.ts",
      "sha256": "add38443b5c46806d7e3c5c8622f42279d97b9652697e3f894d21d492a3107ea"
    },
    {
      "file": "balance/nativeShardKeeperFixture.ts",
      "sha256": "5279b94a3770db5cd575424079b23a9a0ab8853e466a439e81686d3ea6322524"
    },
    {
      "file": "balance/nativeShardMusterArchive.ts",
      "sha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837"
    },
    {
      "file": "balance/nativeShardMusterFixture.ts",
      "sha256": "0bf263c66024fe09489d5d3cb8b1131463c40b024096fd75b06c64662a569d90"
    },
    {
      "file": "balance/nativeShardPublicationArchive.ts",
      "sha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4"
    },
    {
      "file": "balance/nativeShardPublicationSource.ts",
      "sha256": "f94f4f2016534182741851c1be921003b4bd9ac458a2216ceb8ce30fffaab17e"
    },
    {
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "sha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatCompositionFixture.ts",
      "sha256": "e3a11ad94b0eae88bd68a827da5b619ae4d78e0309087ae71e3f081f41b3bb0b"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "sha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardSeatsFixture.ts",
      "sha256": "936b7ff94fca3a6b93e09b13ca105a76296212d70c10bf7307736a52e2698946"
    },
    {
      "file": "balance/nativeShardsCompositionArchive.ts",
      "sha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b"
    },
    {
      "file": "balance/nativeShardsCompositionFixture.ts",
      "sha256": "daf20ecf9882bf56cd764b365044cffb247ae9dfae977cef19b1c1738909161e"
    },
    {
      "file": "balance/nativeShardsLegacySourceArchive.ts",
      "sha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd"
    },
    {
      "file": "balance/nativeShardsLegacySourceFixture.ts",
      "sha256": "f4b214204f5e6a5074c1ed78a228bea408a31c1704bb4b779935ef64ccd72829"
    },
    {
      "file": "balance/nativeSidezoneFurnishArchive.ts",
      "sha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75"
    },
    {
      "file": "balance/nativeSidezoneFurnishFixture.ts",
      "sha256": "4226887cd49f16f6fa6bd0be7c3b7434be42da6ef6e141a299745c601997cf6f"
    },
    {
      "file": "balance/nativeSkyArchive.ts",
      "sha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b"
    },
    {
      "file": "balance/nativeSummonAsyncBoundaryArchive.ts",
      "sha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b"
    },
    {
      "file": "balance/nativeSurfaceArrivalFixture.ts",
      "sha256": "388bf9fac0859711ef2dad5f5f88607dbcb37fc86839425ac6dba44dc6412cc4"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderArchive.ts",
      "sha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderFixture.ts",
      "sha256": "4c7de28f8b148b7b6a71c1abae3381202ea974b4f8cee6a0c811f351dbc171fd"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceArchive.ts",
      "sha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceFixture.ts",
      "sha256": "e0926bd3a8c9f3fc1da4ad41509236c7d441fd10dda2c48e934442837c683ae0"
    },
    {
      "file": "balance/nativeTitanAttendanceArchive.ts",
      "sha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8"
    },
    {
      "file": "balance/nativeTitanAttendanceFixture.ts",
      "sha256": "f9d411071ec8074c5dae04b270a65de36bc6662a993beb26f5c6d5ae5da6deee"
    },
    {
      "file": "balance/nativeTitanReceiptArchive.ts",
      "sha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc"
    },
    {
      "file": "balance/nativeTitanReceiptFixture.ts",
      "sha256": "e8f0355c26390078b85fcad2a47ea716347a2d465963d995d425a9a8e17961b2"
    },
    {
      "file": "balance/nativeTownClientCompositionArchive.ts",
      "sha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b"
    },
    {
      "file": "balance/nativeTownClientCompositionFixture.ts",
      "sha256": "cbc550bd7dd74f2e4f81be36b6b23cbc1965925fc6240510d407e18e85808666"
    },
    {
      "file": "balance/nativeTownConclusionCompositionArchive.ts",
      "sha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff"
    },
    {
      "file": "balance/nativeTownConclusionCompositionFixture.ts",
      "sha256": "bb90a8255913a8f9498e9a9b0f00eb093e919633d6b30b8935ad04b48ca948c6"
    },
    {
      "file": "balance/nativeTownFreshFoldArchive.ts",
      "sha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f"
    },
    {
      "file": "balance/nativeTownFreshFoldFixture.ts",
      "sha256": "f354cdc949901d8c023fc64c5e62de58bde00c43bbc575ab68133dfeb26a5901"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionArchive.ts",
      "sha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionFixture.ts",
      "sha256": "1db1233a00fcd41db31561a318eb6d5deee163175fb19d3ba503603e8237b400"
    },
    {
      "file": "balance/nativeTownStationArchive.ts",
      "sha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4"
    },
    {
      "file": "balance/nativeTownStationFixture.ts",
      "sha256": "0cefa3d12d6cd25a015df327d5fa67eb0ab2c4defdb0c0711935ba100bb34b64"
    },
    {
      "file": "balance/nativeVoyageFixture.ts",
      "sha256": "db7de3c7a18aa3eaec02e032f262ac3a585ee986c4554cd53a3b45f6854ff49d"
    },
    {
      "file": "balance/nativeVoyageTransitionArchive.ts",
      "sha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac"
    },
    {
      "file": "balance/nativeVoyageTransitionFixture.ts",
      "sha256": "c0784a7b8b5165a573110a0a1d1907b1f67a2fd46278d21c78af853533e4b425"
    },
    {
      "file": "balance/nativeWarlordArrivalArchive.ts",
      "sha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8"
    },
    {
      "file": "balance/nativeWarlordArrivalFixture.ts",
      "sha256": "393077de90a905f0b616aa599f6b4c67eb1b061556cfb5ca8638e1d19b07e09b"
    },
    {
      "file": "balance/needle-crown-ui.cjs",
      "sha256": "9c39df90fc34bbd616ffc3be7346964ca58f374c1cbdf8bf6e8929d834650276"
    },
    {
      "file": "balance/needle-crown-world-ui.cjs",
      "sha256": "8c1d7ed8b93ed8d418514d83180eb702e4165b8d01bfc8e3f21ddfc297de7fc6"
    },
    {
      "file": "balance/nerve-recovery-ui.cjs",
      "sha256": "b2854caf7a1f7767faaf285e6c2fcd9fb163e5bd4fae4732032492ba1b4c3b15"
    },
    {
      "file": "balance/neutral-ground-ui.cjs",
      "sha256": "8eed0375df031019e45194d8f69a581b1f8da9f08fd2d3334d21d7c4406e39cd"
    },
    {
      "file": "balance/notice-layout-ui.cjs",
      "sha256": "fae724b318f32db7d059ceb632bde5c488b486bf18d1abfa6d00a44c7c34b274"
    },
    {
      "file": "balance/objective-readout-ui.cjs",
      "sha256": "99529ddc33a089fee15e22ddbd7cdf6a792e029e13a377bc9756567bdecb4997"
    },
    {
      "file": "balance/odyssey-nights-ui.cjs",
      "sha256": "7aaad31fef82656ef1d2ae89de7a6723cc5349073abd790fda2116b1f1dc04f9"
    },
    {
      "file": "balance/oracle-rescue-ui.cjs",
      "sha256": "0d37a55375eefccb7f78725dac6c527597c8bb9c242eeb723fd25a2f3a1c133b"
    },
    {
      "file": "balance/paired-stones-ui.cjs",
      "sha256": "d63f7912827147c700b414dbff2036315157d06449ddaf73041cca04c6d7d420"
    },
    {
      "file": "balance/passive-attributes-ui.cjs",
      "sha256": "7c6600b32009af0da95f977b93dc46d335221fe8164e0d76d767d9717b384f3e"
    },
    {
      "file": "balance/passive-crossroads-ui.cjs",
      "sha256": "1dcc45cf1bb637c2d44324c8a6919ee5094e1d513be0eb487b20735a40cc5077"
    },
    {
      "file": "balance/passive-frontier-ui.cjs",
      "sha256": "e270d6a5f74c2283dc9c58b1ba11c8db96b4c89ca12c176a89172a326328770f"
    },
    {
      "file": "balance/passive-routes-ui.cjs",
      "sha256": "cbe2afc27477c9171e977d1ddcfebbdac3fab08eeefb153548e18eb3deba2602"
    },
    {
      "file": "balance/payload-cues-ui.cjs",
      "sha256": "46437263b6fec5925111dbf7bb6680f71128090ff37e70ea17a46f4b7fafab48"
    },
    {
      "file": "balance/perf.config.json",
      "sha256": "5f121c37635dfdaa0c34915aca44d5073397957dbfb4ab677f4002d0c009b541"
    },
    {
      "file": "balance/players/README.md",
      "sha256": "459a9c050586259f981e47b56c64645fe65fb8c330175dda4ad87d5133f1d041"
    },
    {
      "file": "balance/players/wayfarer_warrior_l4.json",
      "sha256": "e4cd2e3a10bd4cb0e4dd17d84389430f4587a088226aff0a16ab389016a3139d"
    },
    {
      "file": "balance/playtest-client.cjs",
      "sha256": "1020fbcb2b7645c7a4818f48b7c75154fce0347e4b8617585fddec2af3170352"
    },
    {
      "file": "balance/playtest-viewport-ui.cjs",
      "sha256": "d5862c532d92e9d0c953c37c42d448e6007407009a99b912b080a34151d48954"
    },
    {
      "file": "balance/playtest-viewport.cjs",
      "sha256": "1dcdced83373bda73809f96e847a7d7d54b8b441eb30b6606db7eb9ee8456e44"
    },
    {
      "file": "balance/portal-button-ui.cjs",
      "sha256": "5074602c4b00d1c54971807b5d7ed650b56ffbdb9b5bf6b324c564861d389798"
    },
    {
      "file": "balance/preparation-guide-ui.cjs",
      "sha256": "be0133760bb823846ad3a65d08cd77c66aa1223ce01045ae7a62b8898bae99e9"
    },
    {
      "file": "balance/presence-study.html",
      "sha256": "08afa0100eb54094c7d0d42b51d58222108e6fdb0b928d73bc9f58230a2c0aee"
    },
    {
      "file": "balance/presence-visuals-ui.cjs",
      "sha256": "1eb9289baea89d9f172c6ccb906a726db651bbef124a0ceaa1ad99c6c5fe85b3"
    },
    {
      "file": "balance/presentation-preferences-ui.cjs",
      "sha256": "1c401ec6e85f21efd5a9b5a9275bfecdb07cd7c40bdb0a6bacd0e17db95be776"
    },
    {
      "file": "balance/probe_abilityecon.ts",
      "sha256": "36210f928493d8f59fc8f4665ffdb0e9f8ad41f2a425f6915301ff3ee819684d"
    },
    {
      "file": "balance/probe_accountreliquary.ts",
      "sha256": "768caca4cae7e99f11bb7ef5b1ee683e86330064148a6c403313cbe25ec41d82"
    },
    {
      "file": "balance/probe_aether_countries.ts",
      "sha256": "226eb8762aac783c6468926627bbc91f09281d8de7ac635c287da8b5bdef7bfd"
    },
    {
      "file": "balance/probe_afflictioncues.ts",
      "sha256": "6e264f6ed8b75dbbc0fc6beea1184b5443aa2563cca05581b821bbc91103381c"
    },
    {
      "file": "balance/probe_agent.ts",
      "sha256": "5b62399d5fb32eff78cd7894737d5a9c16df373fdb6157182c43b06bd774c6e8"
    },
    {
      "file": "balance/probe_aiverbs.ts",
      "sha256": "7b535f1a350366bcab5b6ca79ed076565191c708460d8632bcfac0a9d8f50f60"
    },
    {
      "file": "balance/probe_altar_bodies.ts",
      "sha256": "9a8791a2bdec3198974c451250948f14a1ccf33d632d48589e87228d30231fd7"
    },
    {
      "file": "balance/probe_anatomy.ts",
      "sha256": "bc023586eb7f8b28c420bcfaaede91217c39d75cf288fb1ac4b3b3e26657f012"
    },
    {
      "file": "balance/probe_anatomycues.ts",
      "sha256": "2f1f17c76a829ac4b232c97833760ea591ea21d7ab48b5e71d1313a53cbe8b30"
    },
    {
      "file": "balance/probe_annex.ts",
      "sha256": "122bdf27432b986568580d889163f0b9dd4bda8fdff46f704aa61f22aa71aedb"
    },
    {
      "file": "balance/probe_annexgrammar.ts",
      "sha256": "9580fd25ee7d086821d5f279943411649589f73e18e3c5a912d39e89209116f4"
    },
    {
      "file": "balance/probe_applyarm.ts",
      "sha256": "284ab239e120be4e409415959bf1fe0953f283142da63515a500f90f29a4018a"
    },
    {
      "file": "balance/probe_arenabosses.ts",
      "sha256": "e0a8a69a495797ad951adaee72683909874af813546e498462bb8f1710b2e644"
    },
    {
      "file": "balance/probe_assault.ts",
      "sha256": "e82c7d191e939d3a634254e1a9f8a2b0ac26c84dc6498fbdb4fe2a9b30a3e839"
    },
    {
      "file": "balance/probe_atlas.ts",
      "sha256": "077cf89b2c7315410b07a403477d7f7782d33dc3856f5506219d58e18d30770f"
    },
    {
      "file": "balance/probe_atlasbudget.ts",
      "sha256": "7addd71a70608fd54baa9eda0040f99c8e003405ec140f27f7f42a646aed862b"
    },
    {
      "file": "balance/probe_atlasinheritance.ts",
      "sha256": "f03e0bb475e690537c6b02768b5f9ce428155d4de4bc82b80e57fd1c821d1c71"
    },
    {
      "file": "balance/probe_attunement.ts",
      "sha256": "d3341df9def29469208f6ebda545120146d6784da8271d46454500f75800280f"
    },
    {
      "file": "balance/probe_auroras.ts",
      "sha256": "a1a9e2b8af67e333280e2bc07e2817d6c73b5f2559e931984588932b0789bc77"
    },
    {
      "file": "balance/probe_authoredmaps.ts",
      "sha256": "a9d7dc254e19dcb01ea0f048b0a482cbef67c5af3c9f4a5463f4fc994e35d7a8"
    },
    {
      "file": "balance/probe_bagsort.ts",
      "sha256": "17682bcd35ae3b45c13eb8ee5140f16a73e6467ffe32be4933a1193a1c98a83f"
    },
    {
      "file": "balance/probe_bashclock.ts",
      "sha256": "339c7936fde7856beff2b88ff3005eccd4702b4f26d583f540b23c859d90c249"
    },
    {
      "file": "balance/probe_bashcontact.ts",
      "sha256": "b871075c417715d1b8199ef3ffb2743c8e699ef6e9a801e349a8b53ca5d8c2bc"
    },
    {
      "file": "balance/probe_bastionstartertrees.ts",
      "sha256": "a15215bacb6aaafc036cd5610850d0d42740cd34ee86e1dde6accc8d01efff33"
    },
    {
      "file": "balance/probe_biome_share.ts",
      "sha256": "d367ed3863c14d209e99871ea4d6462e5ad16156e87cac81444221765836b643"
    },
    {
      "file": "balance/probe_bodyvoices.ts",
      "sha256": "ef164e9e8d943f478ffeb766e06780c0fcbc4efafa58d16ffc0b015e273574ea"
    },
    {
      "file": "balance/probe_bodywalk.ts",
      "sha256": "a31bb9c80f7cc42875d0936cbecf2848057458d0b6b97511f70c6f00de6a6184"
    },
    {
      "file": "balance/probe_bondstartertrees.ts",
      "sha256": "552101da54db0af59553aed2fd008e93c78b0a04b233a03b995412ff380bb6b0"
    },
    {
      "file": "balance/probe_bore.ts",
      "sha256": "f727ae9653881203aed0064062c0a4119b28035e3485043f15558eb910a4c045"
    },
    {
      "file": "balance/probe_bountyboard.ts",
      "sha256": "e921be208186116e019a335201bdf557ffbdf5a335ac3f562e86943b3ecc5fc0"
    },
    {
      "file": "balance/probe_bountyquality.ts",
      "sha256": "5f5694ae0cd268384fbcf9d54c00da3cbe05c507e52abf1aa338bfc40ae38e45"
    },
    {
      "file": "balance/probe_bountyroutes.ts",
      "sha256": "7d037e05a13e0fbc15ab023e8ae065d8a8cf17058fb207b26e14e68ed00fa1bf"
    },
    {
      "file": "balance/probe_braintuning.ts",
      "sha256": "1d1f21ae2a111e4f937aae4b537630f4703968c550a47e3212efece0f19e7127"
    },
    {
      "file": "balance/probe_brandtprogression.ts",
      "sha256": "df0ee26c04fdaef2a92df099574f67c1a98d56e6b2791b3bae0f24fda72fd267"
    },
    {
      "file": "balance/probe_brandtquest.ts",
      "sha256": "a46cb06e96e1c36f3beb0c8498096c9cc9ab038f3637f1643c29e91aca1a3759"
    },
    {
      "file": "balance/probe_brushcover.ts",
      "sha256": "d8423e6f7570572105ec0e8651ec144d83fcf5bd9c4195afc64eed2e47236135"
    },
    {
      "file": "balance/probe_buffreadout.ts",
      "sha256": "76a06a85141cab65849b04d878ddcb70846ba57e03b2503bfbc357e7d5c25e3b"
    },
    {
      "file": "balance/probe_butteland.ts",
      "sha256": "7d623acc10c51d87051870bab5ff65580c3d78d4497b0707601c012b890550cc"
    },
    {
      "file": "balance/probe_camerazoom.ts",
      "sha256": "1898af670a9cb48c9d1c9ae3ae2f1a57d5c5eb49903fc54f01e9988b2c91a098"
    },
    {
      "file": "balance/probe_canopypresence.ts",
      "sha256": "1f01133f4c4f7b5013f4a8a614abb22ddfd47106ce548f607745c697cc668b91"
    },
    {
      "file": "balance/probe_castaim.ts",
      "sha256": "2f02fb41435b9d11c49a49a5de664367dbeecddc57d367f56e1741f694a3e6f0"
    },
    {
      "file": "balance/probe_castingcues.ts",
      "sha256": "7c3503fde97790a705de489d3bc55a3d3ff08a418cce85b050908867cf4f6728"
    },
    {
      "file": "balance/probe_castmovement.ts",
      "sha256": "ec84da88f28ff0da6481e0ddd64d161c867f621493961b8aa50e51705571206d"
    },
    {
      "file": "balance/probe_castreq.ts",
      "sha256": "dae57b1f318d8d8608e46bd728bd2a12e16effb83ba66ac8c8edd186d1042fe0"
    },
    {
      "file": "balance/probe_cathedral.ts",
      "sha256": "de739a83d370495fb59d727d9028a239ee9209a06764cfa242b52e782b392d3a"
    },
    {
      "file": "balance/probe_char.ts",
      "sha256": "abc46eb4a01ad72b4e0e4049ee0fcf2f380ca163d5fdf8fe67cacbda56e4157d"
    },
    {
      "file": "balance/probe_characterresume.ts",
      "sha256": "e087e7a1091babe980e5f6dff076b273dc716a0f9dbc0fcf822d788dd2107e2e"
    },
    {
      "file": "balance/probe_chargegate.ts",
      "sha256": "bb7a7bdbdc6055da77eba3b8b950f0a1cfd585fdb36cae0e08043da85c02783a"
    },
    {
      "file": "balance/probe_chestreadout.ts",
      "sha256": "242b7229b4317a89c3c3f7e7230dd4fa37e5c355e4a2e109b0bd08f9f28e434c"
    },
    {
      "file": "balance/probe_choices.ts",
      "sha256": "e2ec7d9cb4506765afb2ba0ee4761805ee567de73e90d929936d3831b88c71b5"
    },
    {
      "file": "balance/probe_cistern.ts",
      "sha256": "bfd45749fda6090db409e4424ec280fee1d0f2808ad1ceb28e7bb9531128eca7"
    },
    {
      "file": "balance/probe_civics.ts",
      "sha256": "0ad1d8d34f4ebc38ce98dbea1f9cd9b33818f4e7fba080ea583a7e2827b08128"
    },
    {
      "file": "balance/probe_classdeeds.ts",
      "sha256": "e1b59426c07e061c16b2ea020699ee65c4d198193d4d39a7ad839b93ba75d8cd"
    },
    {
      "file": "balance/probe_classmastery.ts",
      "sha256": "70eda3818a9e494544662c2d192f72bb371d900040ecfbe86226f4bcae397f0b"
    },
    {
      "file": "balance/probe_classopeners.ts",
      "sha256": "ad1ebf0e214025e2edd0779b10c0bc030024fe42abc73e73e09c16ae269f4edb"
    },
    {
      "file": "balance/probe_cleanwake.ts",
      "sha256": "412517c6ed31c87b5c4e5962822fa70ff2b3103639d05a08e91b2b03d1c1c809"
    },
    {
      "file": "balance/probe_cleave.ts",
      "sha256": "f4ff3454bad4ba10b7d98c059a54b2e4d955b81f1310d0ea7fe19c97f817c83b"
    },
    {
      "file": "balance/probe_cleavecomponents.ts",
      "sha256": "47027d52d733d0b9f56d4c7467167abc69bcee3ea9445948ceb1a4bf3a0843cb"
    },
    {
      "file": "balance/probe_climatecore.ts",
      "sha256": "52355b24c1da5b9ac53ec88ca9d6905fc3235c40d2dfb9919713d0fe938a2321"
    },
    {
      "file": "balance/probe_clingbalance.ts",
      "sha256": "d146df947ce98bb58774578d88b58678ec7b1aa3a9bf0a2cd9ec3fd5c4b627f4"
    },
    {
      "file": "balance/probe_clutch.ts",
      "sha256": "c1e94041a846c5bd60773145782edc2f4631bcd7f9e0871eef22a22dbc671f0e"
    },
    {
      "file": "balance/probe_coherence.ts",
      "sha256": "092f9eb79b777ff0bf94f9c033f81304666daa8176d8319f9a79f623592b9194"
    },
    {
      "file": "balance/probe_cohort.ts",
      "sha256": "83993a842889aa74182bdc76a5dfdf248b3b97f36c81b381d989092ac9a13678"
    },
    {
      "file": "balance/probe_combatcues.ts",
      "sha256": "f02f24bf6d58599d4cfe4b40c0de2a98de14bef90f07a4d73e889572478c82e2"
    },
    {
      "file": "balance/probe_combatfocus.ts",
      "sha256": "96727197ce1ab36f44e881f19063fc598a9007b5d707301e67c0125863db61d0"
    },
    {
      "file": "balance/probe_combatreadability.ts",
      "sha256": "ab05c31003c6513e1f4b0ac795a53ea3fe31ac2cc6749f22f4d63c82ca0037d7"
    },
    {
      "file": "balance/probe_combo.ts",
      "sha256": "8d80463f9aa02c190ea0fad02279e54f208dd472d215ff734970d3e9ae7e280b"
    },
    {
      "file": "balance/probe_comboconditions.ts",
      "sha256": "4c2d0ba4fe061f01834b3db9c444a946975739465ef9ab9b76f1e426e2cfaf58"
    },
    {
      "file": "balance/probe_combocues.ts",
      "sha256": "5143db83ff2cf5743140de36f02f587f2a26b67c8f19f6dc710bdc06b87ccd31"
    },
    {
      "file": "balance/probe_companioncues.ts",
      "sha256": "d8b0651179647f2c0ed6624dd02865eb93df46f2f9ff9c0d3235352af546997a"
    },
    {
      "file": "balance/probe_companioninheritance.ts",
      "sha256": "b61dfe8c32d45085da9c494355d3f7d99c1d9a5f0314a8a0f6427036c07d3afe"
    },
    {
      "file": "balance/probe_companionrecovery.ts",
      "sha256": "7d4e3ccc25a5c4c24ce835cbc3a826bf4a54caf296744306e95d6e61f06421eb"
    },
    {
      "file": "balance/probe_companionstance.ts",
      "sha256": "ae7c9154beb0c1c90d3b80506e0c487d395f10e02e68866dcecfddc6777be84f"
    },
    {
      "file": "balance/probe_complexes.ts",
      "sha256": "d80efc049f5988f0c981dcc700147a76fcec1218437f1cb70b78010cc17016ad"
    },
    {
      "file": "balance/probe_contagion2.ts",
      "sha256": "66fb4df052c09747742dc1f0e2f2c1bb2c12ab2d36777873ee1af4d16eb002e2"
    },
    {
      "file": "balance/probe_containerloot.ts",
      "sha256": "e35f2b2796b77123e7482c6305c2017589fdb783a72105baa562b745591ac62f"
    },
    {
      "file": "balance/probe_continentcore.ts",
      "sha256": "51fc044fe3381e3850e2c2074ecda26bf0a1bf149f14bcd9bb45214bd49ee4a7"
    },
    {
      "file": "balance/probe_controlstartertrees.ts",
      "sha256": "f1c13173e3144b8e30c3ff45491c88a20bc261bcbd1dae707816d785971eff98"
    },
    {
      "file": "balance/probe_conversation.ts",
      "sha256": "89ede44615a00519c4778aaae176a32c0ca357e2b21f4df2afe547f91ea60e30"
    },
    {
      "file": "balance/probe_conversions.ts",
      "sha256": "57862c49b77a8156a7b3c86c0ae5941bd4afbe62b9e682658b0133f0bf968e4c"
    },
    {
      "file": "balance/probe_coopseed.ts",
      "sha256": "c9a18599486ca0ceae792f7a295683cf064158c7f145689fbc988c8f34453cd6"
    },
    {
      "file": "balance/probe_corpse.ts",
      "sha256": "99dc6719dd444790a1d0805460c9462f89d5502603b73ecd7cf4ce1617b8cb5b"
    },
    {
      "file": "balance/probe_cosmetics.ts",
      "sha256": "ea9c339e70851b225baca5684b407e5fe5b0e6e0d180553419c4e5dcdfae34c0"
    },
    {
      "file": "balance/probe_costlevers.ts",
      "sha256": "e05967a6eaf4411d33fba2e70d19c7fe2caafc5a674978941d1f4e55487ce045"
    },
    {
      "file": "balance/probe_couch.ts",
      "sha256": "7f0eabb8701d9542fff5cec1bc3bf931456def1b32e77ddd03a0d35b4c30d6da"
    },
    {
      "file": "balance/probe_coursestages.ts",
      "sha256": "6d30070dcb91631389ae0ea7d733a1b2fce141275feb60985ada797f4518340a"
    },
    {
      "file": "balance/probe_creepers.ts",
      "sha256": "1ea6a37b0d7e0922673fac09d111d1dcf3458dbee4247d51cbcf139327a547be"
    },
    {
      "file": "balance/probe_criticcrusadecoldcapture.ts",
      "sha256": "7ce05a724fe6b21308a18a7e308f28caaa4bde0243d907c8500dec4da1831d41"
    },
    {
      "file": "balance/probe_crossjab.ts",
      "sha256": "7948c08cf1c1020a83caa79ebb6a7d2ffd76bd1e8932371843ff01d9224f5d96"
    },
    {
      "file": "balance/probe_crusade.ts",
      "sha256": "90f2e970ea52c5692212d68250702931c50aeec521631059f2e4222b8e77a2ea"
    },
    {
      "file": "balance/probe_cryvoices.ts",
      "sha256": "c318edb95faf4131d271d5f3a01289d6fdd18b3e52803ba13519ae8af0edaefa"
    },
    {
      "file": "balance/probe_deadface.ts",
      "sha256": "c1583833009a70afce92974c50eb159d9618296f5e9158c9480f36666e1aa8d9"
    },
    {
      "file": "balance/probe_deepwinter.ts",
      "sha256": "a9656a2955138a2aaa03c153eb207f37afaf638b289384b9dbbfc8d2584a3dcf"
    },
    {
      "file": "balance/probe_defensecues.ts",
      "sha256": "5065602ed2d0f657461f6f769a8a8ec34832f92c83f9718f7d2dafbc5b727ca4"
    },
    {
      "file": "balance/probe_defenses.ts",
      "sha256": "c0629065fe54671cc4d2eb5a746c068e4747f29ea2f3fdd52179237e41d41405"
    },
    {
      "file": "balance/probe_den.ts",
      "sha256": "11794e9f1a5cfd9ddcb94a89eedf85dd8c8607a40859d7aa88b25b61e9528b03"
    },
    {
      "file": "balance/probe_descent.ts",
      "sha256": "44a171a2abee9755f532f3ed69c6f0435efb453829db68b4ae9c6c3d826e97f9"
    },
    {
      "file": "balance/probe_destinationlabels.ts",
      "sha256": "367c96fc95389942fea9ccab8ee49ca68cad82c1774ac19204d20cc6dd99bd1a"
    },
    {
      "file": "balance/probe_deviceworkshop.ts",
      "sha256": "818b5688a3c4464b244999573614ee96bde276225b983f9993ed406025a33036"
    },
    {
      "file": "balance/probe_devmonsters.ts",
      "sha256": "75c1dc75d7f60a88bacde3ea1281ac9c68a4f6a62feb023c677adcf53bcd62fe"
    },
    {
      "file": "balance/probe_devotedstartertrees.ts",
      "sha256": "e1fe44f8eebcac9c0b0d7f65c2e0543b81d59ace3f646124d2baa5125eff3f9a"
    },
    {
      "file": "balance/probe_devprogression.ts",
      "sha256": "55b6fb7c880a8b31787fc06dfe50493ed0fa80548b041790cc39015bb34b27aa"
    },
    {
      "file": "balance/probe_dimensiongeometry.ts",
      "sha256": "59d87f3bcea36480aa2c9e35f180fc7c7893f3b0ee570177d95def8f9d132e30"
    },
    {
      "file": "balance/probe_dimensions.ts",
      "sha256": "dc2a8a9eb27640b00aec27b23dbed611809482e799e3df352309f0c132e8e59b"
    },
    {
      "file": "balance/probe_disciplinestartertrees.ts",
      "sha256": "b718521329c406472d6fcaa17e8af2fb980e2ff1c6483bd352253472851ff1bf"
    },
    {
      "file": "balance/probe_dissolve.ts",
      "sha256": "2018f4464301666aebf74cc57a5d54728d22b994cfc406040af44cbbc88f6c0f"
    },
    {
      "file": "balance/probe_doodadeffects.ts",
      "sha256": "e409c28855a24759b8297e9634fb1ba8ec6be54706f744160ef0b976156013ed"
    },
    {
      "file": "balance/probe_doodadfams.ts",
      "sha256": "3c141ff7daa21465b55aa1b93bd76b435f9656acdd114ccb2632264759d81ac9"
    },
    {
      "file": "balance/probe_doomcues.ts",
      "sha256": "0f348d27032b2bac31cdde3c73748d27e35cfbfe55da3a19b2b03fca91792e5f"
    },
    {
      "file": "balance/probe_doorpress.ts",
      "sha256": "45a9ae785de7633f86cbae70270571267e9c7b35aae36f604a46075dd25bb4bb"
    },
    {
      "file": "balance/probe_douse.ts",
      "sha256": "c2e24b76200263468676eaf080137b3efd64adb2cc73acf2be7e8a64c1a817bd"
    },
    {
      "file": "balance/probe_dressbudget.ts",
      "sha256": "63e3b7f794a41102f961562921710c84dc1cbd4127976494572eb03eb99bd676"
    },
    {
      "file": "balance/probe_dressfade.ts",
      "sha256": "779db654239928e024387f70304d01581b7e2a9bf504f18866f1c7118a8ea6af"
    },
    {
      "file": "balance/probe_drove.ts",
      "sha256": "ab3a1dd58c4951c670373025f16aa8d180294a8f84d6820f361603507c91fe39"
    },
    {
      "file": "balance/probe_dueliststartertrees.ts",
      "sha256": "f36e60e0510c4c0845f803ac0d5edd78f5dfa7b6a295abf94928e65bc711deda"
    },
    {
      "file": "balance/probe_echomark.ts",
      "sha256": "bb3dceb1410ecad311693a1f927ca32c3f568e2308f5d6392f09e8bfbf9f8642"
    },
    {
      "file": "balance/probe_effectvoice.ts",
      "sha256": "adf09cf7caf11fed30bf68dd205f40a1d114dc9c7185fc898a58e85c6c27d3e9"
    },
    {
      "file": "balance/probe_emerge.ts",
      "sha256": "9772b4f6d3f448b57f109e3f0f34745c2785ca791b00f19b30fb8825ccbda06b"
    },
    {
      "file": "balance/probe_emergentuniques.ts",
      "sha256": "0e22e9aef03db361b6dcb4c49d3487222b97316617cc8321a5236210857c921f"
    },
    {
      "file": "balance/probe_encountercombat.ts",
      "sha256": "dfade16db7e444706a3515fca9798b501469005bff67c74197b6b2445d3acd33"
    },
    {
      "file": "balance/probe_encountergroups.ts",
      "sha256": "b9faf9942228463de14255b8b922391722cc13192166c6d3a7a92aef2b713d9f"
    },
    {
      "file": "balance/probe_eventclock.ts",
      "sha256": "a8e78c33acd19360ae4d5f996a0199508845ae403a8007386a77bfe35c6a3f03"
    },
    {
      "file": "balance/probe_exhaustioncues.ts",
      "sha256": "9970916b6875a3c4854c7ec88486256c052789aaf526c92074ed5dbd26e63baa"
    },
    {
      "file": "balance/probe_extraction.ts",
      "sha256": "dd7a2a92c4846e13a9fcd90ac047e86fbf199ed2aa3007c888ca2a74b3f67a63"
    },
    {
      "file": "balance/probe_feedingcues.ts",
      "sha256": "868eba19070db2334ffded920dc2df77afcc2bb9775e2b4dcec39bc679a35bb1"
    },
    {
      "file": "balance/probe_fieldchoice.ts",
      "sha256": "4ff2d070cb3af62cca8347fb8cd0d1863a11f0d723f64069fff1a40ce71e8979"
    },
    {
      "file": "balance/probe_fielddiscipline.ts",
      "sha256": "d489d87fbc177f15f3152b73bfccf3d28a59dc302b86de8968ea3760c0f4b27b"
    },
    {
      "file": "balance/probe_firinglane.ts",
      "sha256": "5e0fee3a890e602d5a635e1427ffb18e5af257fc248663a2ae40eff9c0477982"
    },
    {
      "file": "balance/probe_flasktrees.ts",
      "sha256": "ba0b44989ad1ca2653b02ecfffc05288068e7378fb19fbf1278ee7a2a58aac23"
    },
    {
      "file": "balance/probe_fleshkit.ts",
      "sha256": "5921ff2db1757a272aa945721deb21a87cf8424a8b949130e630e57e0f26959a"
    },
    {
      "file": "balance/probe_folio.ts",
      "sha256": "bf533ab31d61b4d17187e806036325c4094721e712da0144e1e50d5e7cbebe23"
    },
    {
      "file": "balance/probe_foragercommitment.ts",
      "sha256": "447bff31cc36f475fa345a96aadab30081589097e253ae3c3edbf4292b8bb952"
    },
    {
      "file": "balance/probe_forechart.ts",
      "sha256": "a079176fa8994426dc0df4480831e27640f03f33f0fa5279355003006dac201d"
    },
    {
      "file": "balance/probe_fourthwall.ts",
      "sha256": "877be7fa69697abcc965b459a7f0568c44537dce9b298beeff13d1bdecd2ed29"
    },
    {
      "file": "balance/probe_frayingnerve.ts",
      "sha256": "0e749358165b328c8ad8093cf8403a574af255a06f2e40b40871808a8d17c9a9"
    },
    {
      "file": "balance/probe_front.ts",
      "sha256": "e2c40243e4f4cb662689545ca1c47b8738c6dd750b6d90faf9b1a0e0ad98d1b3"
    },
    {
      "file": "balance/probe_frontierstartertrees.ts",
      "sha256": "7f17209cf6f5d3a23400ed7fe7caad7649d9ad792bcc06adc96ceabbecfbe069"
    },
    {
      "file": "balance/probe_garden.ts",
      "sha256": "d89ebedbd5ef9b0b7df0f02a7bb6229b2804f4c32497d55765fbcd5e3cae0451"
    },
    {
      "file": "balance/probe_gauge.ts",
      "sha256": "94c230b379324d0166cfd99af3621fc18d8cc4fa2490a9af4ded07391c39e879"
    },
    {
      "file": "balance/probe_geography.ts",
      "sha256": "f054565bb028266f474faab45cfb18688386a3c80f64992c256713d562c047a2"
    },
    {
      "file": "balance/probe_geographysource.ts",
      "sha256": "fc3b70bc1b4c4bcc9bff5a2f412bda6425026d8fa7afb0aca83d51275fff0b75"
    },
    {
      "file": "balance/probe_geysers.ts",
      "sha256": "c5f0e1403e730f19a90f53c7961956f5edd92e221dc4dd9595cf8f442aaef557"
    },
    {
      "file": "balance/probe_gloaming.ts",
      "sha256": "b84b590d2c1367ae7086e1521367ca5286cc0fa82dcf76cc6cf4e16663ea7d63"
    },
    {
      "file": "balance/probe_gnatveil.ts",
      "sha256": "b88e79c0a03c6f6ef1f13aa015bfbf20ffd1808df180b98112fb1c7ddfb52f7e"
    },
    {
      "file": "balance/probe_goad.ts",
      "sha256": "ef58e16559bbc3077132e08c0841edd9177ead2116c27739459d0139efe722db"
    },
    {
      "file": "balance/probe_grab.ts",
      "sha256": "75697a634652987f6c4318ae3a8026c1fd8ab6b16bab1ebbbcebe33cbed206f4"
    },
    {
      "file": "balance/probe_groundjoins.ts",
      "sha256": "7c60557c92806e10229eccf6f0c89dc54e91b38edb1f3bc524d577c2feb75b37"
    },
    {
      "file": "balance/probe_groundlookup.ts",
      "sha256": "3d425563664437863b039c5aabca7259d1836bb2ce803276ffba272b064d68ce"
    },
    {
      "file": "balance/probe_groundsnap.ts",
      "sha256": "450501fe043c3e9d1f18921470547f2d6ab65e9c7776c7a358e3647f1e89e420"
    },
    {
      "file": "balance/probe_grove.ts",
      "sha256": "340ea66e2d75b15ae72a86be69dd8df477bc6cedc98ea3573395c70cf8711626"
    },
    {
      "file": "balance/probe_guardbash.ts",
      "sha256": "28f8a3b51fe58b4220772238e2aefc7e236d577c1e42784b2360280e013e69c3"
    },
    {
      "file": "balance/probe_guardians.ts",
      "sha256": "5f55a0d722dd7d9f66e0392d88025377463b556f0e04aadc83afebae7f871dd4"
    },
    {
      "file": "balance/probe_guardrecency.ts",
      "sha256": "53dace8574c414821a65b3389921a803126ba8a089d103d3523cf30579d93c82"
    },
    {
      "file": "balance/probe_handling.ts",
      "sha256": "64a104a28981a573ce4d73b9745fa4790b8dd20173fd441e43950e29dbf7f9c2"
    },
    {
      "file": "balance/probe_harassment.ts",
      "sha256": "bbe0606e8e527a12cfd9be3dc0c6abf1fed93f08f68020d7566b7bc6a925765d"
    },
    {
      "file": "balance/probe_harborholds.ts",
      "sha256": "0631772f5eb4d650ad55e770442bf5ae67a54f905d1e5b84182fd059669c1e73"
    },
    {
      "file": "balance/probe_harborwarden.ts",
      "sha256": "059a830b85b1776ea747338bca18c9e92381ab509d242bc654122d1de851016a"
    },
    {
      "file": "balance/probe_harvest.ts",
      "sha256": "b554f18914f5aabf4b332ff8bcb3234c0c627137ab7971d6b73e33f12e115824"
    },
    {
      "file": "balance/probe_hellwar.ts",
      "sha256": "9b206cea0f57d16701a83629ef5cb559e3037997972fa1b0736c41304b217226"
    },
    {
      "file": "balance/probe_highcourt.ts",
      "sha256": "874d9742465bb484f12275faf0621ad6af46e77e35609d1f63e69280b449f950"
    },
    {
      "file": "balance/probe_hivecall.ts",
      "sha256": "835cc6952dfb5d9198e814cabf5e9cfd4a8dd6ddbeaf193ec408ea9820a3e19e"
    },
    {
      "file": "balance/probe_holdfast_guardian.ts",
      "sha256": "424ac07315d36b753482ae1c01b6a9cc5cd264602a672d6c0a8f5008be847260"
    },
    {
      "file": "balance/probe_holdfast_pocket.ts",
      "sha256": "674b2c9f5dc2ef0ac2e3a5584831ad43d8de0e828f695f45122c9294f4bc445f"
    },
    {
      "file": "balance/probe_hollows.ts",
      "sha256": "2fc2767180a428f359433d53a944bd142356bf4f47ffd2a6d0dd09087366be62"
    },
    {
      "file": "balance/probe_hunt.ts",
      "sha256": "44e08c2f7268cc7b5592f2455a66792033d849840b1096a90aa69f25367b25e4"
    },
    {
      "file": "balance/probe_impactstartertrees.ts",
      "sha256": "f13c6951078ce4bd092cc07e331a24014e9f1d470c7885df2d2aca017b11e1a5"
    },
    {
      "file": "balance/probe_infostream.ts",
      "sha256": "4db701f9901ff0fcbd2e2f1d3d2531ebaf31b24e1d7448875ac95b943c867f8c"
    },
    {
      "file": "balance/probe_infrequents.ts",
      "sha256": "7f2e558cada034e758897bc5da6018bc68ba24cfbad53a8cf15a07d5a7975c46"
    },
    {
      "file": "balance/probe_ironbell.ts",
      "sha256": "c42412746b27de4b41023dde16ae6e67756d5fa19ff3edc461d6deb9f4f0d90f"
    },
    {
      "file": "balance/probe_itemreadability.ts",
      "sha256": "5719668105b59aab5becf3e61d49c02d0fe9dd1b9c45f14951669ab43d03bf19"
    },
    {
      "file": "balance/probe_lairs.ts",
      "sha256": "d9aa33ddab75e03f1c15d9b8db755664e33f84f8bf2679fa0db448944aa3af2d"
    },
    {
      "file": "balance/probe_lake.ts",
      "sha256": "5bfc7d25d936a4335135deafc6cd66f0bdb83267b046ed137a9f6643de51fd54"
    },
    {
      "file": "balance/probe_landforms.ts",
      "sha256": "fef8961394e7c0078bae8147bcdbad25b4b4131649cad2a9469879bc8a81da03"
    },
    {
      "file": "balance/probe_landslide.ts",
      "sha256": "55bff233e3308ad7d062e17a82a39ad64cf13dd5400022087dd194c153cbc0fe"
    },
    {
      "file": "balance/probe_layoutmetrics.ts",
      "sha256": "f1399f5b51a2f7d088d91ac71ee999cc4d9ee1b5dcefd21afc1c5a6507475b03"
    },
    {
      "file": "balance/probe_legends.ts",
      "sha256": "47702d3bd34c0601164ea80fb3e5194d4776a23133edf88dddff236a83cbb0ab"
    },
    {
      "file": "balance/probe_lightsight.ts",
      "sha256": "d9042c3deb2b7c19da138279a9709eefe9b071598c17ea2cd35955f941c98d8a"
    },
    {
      "file": "balance/probe_lite.ts",
      "sha256": "742fc55f4ce03470727cd0d6500a3ee84b3100015df249cde45cf91c19a5f5bb"
    },
    {
      "file": "balance/probe_liturgy.ts",
      "sha256": "2ce60435d7f2e644aaea89a2970dfc561c1fa46dad5cbc05dd7491c7384c1d79"
    },
    {
      "file": "balance/probe_livinguniques.ts",
      "sha256": "45e467539d6ca535bd9bbabe109dbf88e05561042a92b90ecea1421e196e0c57"
    },
    {
      "file": "balance/probe_locales.ts",
      "sha256": "32da45ed452452bba407018f7b4f3435e9eedbc94758ef192a85157bf0cf5178"
    },
    {
      "file": "balance/probe_lonecrypt.ts",
      "sha256": "43b6f716fc0f3183289fa8255a7ca7d3316e1a1053a5a2e137b4f83432368c17"
    },
    {
      "file": "balance/probe_loskey.ts",
      "sha256": "74ee3264e0f8002858d7fa69a0074a9cda1bcd1684b7d8038871e0be69db225b"
    },
    {
      "file": "balance/probe_madden.ts",
      "sha256": "3f434257ba06ae0350afd00233a2297f81b7bfb3fcb8fc800d8f861346235952"
    },
    {
      "file": "balance/probe_magicpackevents.ts",
      "sha256": "61f8801759a7bc97989e80012e68f26576f63ae2ca13e4e2f792c4797900fc50"
    },
    {
      "file": "balance/probe_magicpackmechanics.ts",
      "sha256": "db1940a96089e8ce95c16ff0e4723e02d681e45a3bd44a7cd98b106bdda83abc"
    },
    {
      "file": "balance/probe_magicpacks.ts",
      "sha256": "9a3edfaa2be73f7d9e4cc852afa24e72fcd7b266040c70a5b9d80a0ee9be0b8c"
    },
    {
      "file": "balance/probe_mass.ts",
      "sha256": "673a642e613a74ba19671d53f71fd16e7c6264b1645af6617aa16a5a856fb2cf"
    },
    {
      "file": "balance/probe_massif.ts",
      "sha256": "ff02f0852cd66d1b7979c78f822ed599c9cd75c90ccc857b255d266ac3f3651d"
    },
    {
      "file": "balance/probe_meadowmere.ts",
      "sha256": "dbbaba309f6832bf35f7bb7037f3407a3ecd35423a756484240da805ce7d2807"
    },
    {
      "file": "balance/probe_meleeread.ts",
      "sha256": "78093568b6de8e6b43537ccc4e1823060deb54195594e205bebf1ebf4751153d"
    },
    {
      "file": "balance/probe_memories.ts",
      "sha256": "1fa3ea87daede491eafaee2d01576adc0edad75585b77c2ade42ae4d0413a6a9"
    },
    {
      "file": "balance/probe_memorylesson.ts",
      "sha256": "afd3b6fc12563ae77e47cd51aa8f6e1f2e38989b2838697b368321c3d6ff4719"
    },
    {
      "file": "balance/probe_memoryunlocks.ts",
      "sha256": "ae6496cb3a49be6ab7ac9dfe9d26fe6d029e31e3b954b276b2c5f568968df8cb"
    },
    {
      "file": "balance/probe_menubar.ts",
      "sha256": "7b11692ffab6708f8fb24e507845830baeb6553ba4a83e984348fa77ce0a1ac6"
    },
    {
      "file": "balance/probe_mercs.ts",
      "sha256": "8c24dcda8ed9488a3bca0b2e9b0bebba107c143c7b21a42444a40c4901a1a0b0"
    },
    {
      "file": "balance/probe_metaslotinput.ts",
      "sha256": "ccf1767ed5ceb428857599b2308f8478ac303a61522039c3ef4660d3ffb198d1"
    },
    {
      "file": "balance/probe_mimic.ts",
      "sha256": "ef03da63abc0593b59ac29201171e5db385aff6a6470fe46b81d227063b60e5a"
    },
    {
      "file": "balance/probe_miniontargets.ts",
      "sha256": "1c8186ad56a1bbbc03586d3e328f0f99ca5ccdd720f045a5a4d76f945e23c752"
    },
    {
      "file": "balance/probe_mireille_lesson.ts",
      "sha256": "e83ec59e1448f61c307f6b7767b5f2955bcb256894b01da23085ee801ca298c4"
    },
    {
      "file": "balance/probe_mount.ts",
      "sha256": "60f2b117249e6de3c24d04fb87ba82d314181a23870123e565c95af39b254668"
    },
    {
      "file": "balance/probe_mountain.ts",
      "sha256": "013bdc819da9c1fcc7c7f55e91462502c5496f580bfafa89dd3c3aa9b23b3e41"
    },
    {
      "file": "balance/probe_movementtether.ts",
      "sha256": "ca793b25906d6e81562acc06f30dce0f969a966c42487f53b648a3c23b84aab5"
    },
    {
      "file": "balance/probe_movementvisuals.ts",
      "sha256": "ca6f1a5433bca179a10bfd829e1bf25a5d40ff36c923e076ad9151a3dbdf9d5e"
    },
    {
      "file": "balance/probe_mu.ts",
      "sha256": "4e4e6fbfbd9613c58d3c217ded919430281a054f7dc79d6fda90ef73d71358a5"
    },
    {
      "file": "balance/probe_mudwell.ts",
      "sha256": "b35c215fe183ad1a1f642c1e0e21e990692baf36ec693125e622173cacb3da49"
    },
    {
      "file": "balance/probe_muoffer.ts",
      "sha256": "251331128d575dab57da3b97e54d54e2c2d2bfa29ad03e4ca2526d78fb822290"
    },
    {
      "file": "balance/probe_murmuration.ts",
      "sha256": "eb0137eeaab8ecbb4b95577d652aa3c6611ca5f3cf0db02371e793092f08628d"
    },
    {
      "file": "balance/probe_myceliafront.ts",
      "sha256": "193b07aefbfb542eea78efd91f3f3c44a764dcc53d730f1e79afa5ba26869a9c"
    },
    {
      "file": "balance/probe_nan_hunt.ts",
      "sha256": "2fd36fa9ce405b0dfedbc7f83948153dc4b6d9d5198de94db61d9c36fb666a12"
    },
    {
      "file": "balance/probe_nativeactivedescent.ts",
      "sha256": "0eaf8e4340a51b23355af94bf59a5e944fbf5767150016305983bb538b410929"
    },
    {
      "file": "balance/probe_nativeactivedescentsource.ts",
      "sha256": "70ccb82d59611d297c3e2cb74d8af91ef1b2948462543bd4be19d9650782c989"
    },
    {
      "file": "balance/probe_nativeaisource.ts",
      "sha256": "238c0857045d5f9755b5fa7a802672b46593d38fe4093ecb17f5548987ecb360"
    },
    {
      "file": "balance/probe_nativeaitargetcontinuity.ts",
      "sha256": "04171cba6f8ef9b0ec6c1b4ddaaa1a68771724234cede7ff7b46da87ea27e4ca"
    },
    {
      "file": "balance/probe_nativeaitargetcontinuitysource.ts",
      "sha256": "e9fc7d0aad9011e38f4df253d0ac2f0a1e36a142d2f4fba884d360936015ed61"
    },
    {
      "file": "balance/probe_nativeambient.ts",
      "sha256": "3fa0f08141ed6882954585956d0e27a3288112292aaf16d2e45d35253faac73c"
    },
    {
      "file": "balance/probe_nativeareaai.ts",
      "sha256": "82a2385eb08d44d764ebe679bd587d91997139df82d857035ad3b082a9ac9595"
    },
    {
      "file": "balance/probe_nativeareaai_actions.ts",
      "sha256": "89d6725002d3fe3ba103e66f3cf4593335553b8d1dfe7bc07e0c42195d619df3"
    },
    {
      "file": "balance/probe_nativeareaai_gates.ts",
      "sha256": "972b22788ec7a6e7d6b4586287267fd316427f12bba2ab8c9b9d2b227b036820"
    },
    {
      "file": "balance/probe_nativeareaauthority.ts",
      "sha256": "8bb8625325b62367b17e7382529df8cbf4589982227069638746e509fa139d25"
    },
    {
      "file": "balance/probe_nativeareabirth.ts",
      "sha256": "fc28a6ae975af10c5019ca1c647408dd35448a67c72b6c0da5e2532511f30792"
    },
    {
      "file": "balance/probe_nativeareaboundaries.ts",
      "sha256": "9edf357e3394a3be1f32b48be8ec1e25dfff2ca076dcb4fdbe28643b6d4e55ec"
    },
    {
      "file": "balance/probe_nativeareainput.ts",
      "sha256": "c294f9a5a087c046b737058512e35c44488cb67050687aaf678c80e483101918"
    },
    {
      "file": "balance/probe_nativeareaisolation.ts",
      "sha256": "dbbe4248815939a9efbf8cf0d32e50192b95ae4fa994bc9d2f4b045299479230"
    },
    {
      "file": "balance/probe_nativeareamemory.ts",
      "sha256": "feeddf4c8cf1a873cde7d1c738cdbbce1adfa7f561de9656947938e6c9b0c060"
    },
    {
      "file": "balance/probe_nativeareamenucards.ts",
      "sha256": "4d95491b4c9557d96471c378bf33610812ea0a895d21ba682e2f05e5ed81dd5e"
    },
    {
      "file": "balance/probe_nativeareamenudwell.ts",
      "sha256": "0c743bb34ee3e7b966db4f52b16e5397f1c6060a264d487ebd8045154dc0e7f5"
    },
    {
      "file": "balance/probe_nativeareamenuqueries.ts",
      "sha256": "70645145feb77d820b05182ce38fe5668d464f6621f809cd2ebc08f52521a6ac"
    },
    {
      "file": "balance/probe_nativeareamenusource.ts",
      "sha256": "bf91cb5f4920038554eb01499386f5b84a8c807a2880606106999c8fb0fa524f"
    },
    {
      "file": "balance/probe_nativeareaongoing.ts",
      "sha256": "b122471bf96357b49f262465d6b25247e2d924965502ba5a13f2e41372280228"
    },
    {
      "file": "balance/probe_nativeareapresence.ts",
      "sha256": "948a45182c1897302aa85fdbbd64e92a3a1a69c7cc61b0889f680883b9cc5992"
    },
    {
      "file": "balance/probe_nativeareapublication.ts",
      "sha256": "f2edbeddfed836b426aa1bc6fd4967458e221ead54060140a49a881acf914362"
    },
    {
      "file": "balance/probe_nativeareapublicationsource.ts",
      "sha256": "0866443e0e8b65ac5b5c2633c79b77a90e2346640c644817ed55a3bd16fa3289"
    },
    {
      "file": "balance/probe_nativeareasourcesession.ts",
      "sha256": "a0e2de5bb87c1e911bb9f96a3cf382f60b0d682239f0e7ca96877aa3c9620399"
    },
    {
      "file": "balance/probe_nativeareauiactions.ts",
      "sha256": "62f4444a34af28e22b59087b494e3deca2413de1b8f981a238ecdd70eb8a1a61"
    },
    {
      "file": "balance/probe_nativeareauiactionssource.ts",
      "sha256": "3d0d7f4422023781469115313282c0428307afb82c992f09823fecc70a7bf6ef"
    },
    {
      "file": "balance/probe_nativeareauisailing.ts",
      "sha256": "de40771718a22f878eaf3617de09a022d248626545b02ec33d4a366afa9a394c"
    },
    {
      "file": "balance/probe_nativeareaviewqueries.ts",
      "sha256": "bc82acf9497369a69badc8cf6bfa425ee3bb1a612cc14958a5a81084ad4ed153"
    },
    {
      "file": "balance/probe_nativeareaviewqueriessource.ts",
      "sha256": "dbaabb88c6400e519b1305983c07bb66b3fe4e88ea6e5fdad10b1fdde00726e1"
    },
    {
      "file": "balance/probe_nativearrivalactorreceipt.ts",
      "sha256": "45352224cf7d88d39770ab339dd7c33abbc0aef2a4f2c408e65bd286f4dc29e2"
    },
    {
      "file": "balance/probe_nativearrivalcompositionsource.ts",
      "sha256": "81766caa0a7c8372e46b709e022c49c2c00011c2bc122d7519055064f40bd2a9"
    },
    {
      "file": "balance/probe_nativebirthadmission.ts",
      "sha256": "5b1b6108ac36f5560a68b3460d5a9553c59ce8c735eac0dc636a2a9adcf5a894"
    },
    {
      "file": "balance/probe_nativebirthlifetime.ts",
      "sha256": "94f9c0f3e93de43484ce157c99819ec807d88b74b6784d3bcadabe5e3e42b5b4"
    },
    {
      "file": "balance/probe_nativebirthlifetimesource.ts",
      "sha256": "db579f3f4114045b0ad1be9bc9be868633c270ec088ec7a9930129b6079d5eae"
    },
    {
      "file": "balance/probe_nativebountyarrivalcold.ts",
      "sha256": "35c3e253e68115b74b39a1c723a8e1b4cf1ced8c0526ffa2a765044209de5c4d"
    },
    {
      "file": "balance/probe_nativebountyarrivalgameplay.ts",
      "sha256": "28212f12d12dc85457f3001c5139a7853e83867327c89bf17ca167d67e2726d8"
    },
    {
      "file": "balance/probe_nativebountyarrivaloracle.ts",
      "sha256": "76cee856bf626db736211a4737afaa1c9e49f7da2529f402d603e89d197bde79"
    },
    {
      "file": "balance/probe_nativebountyarrivalsource.ts",
      "sha256": "f6860db5d4a34a49ab37a56b76eabf7378d43e7172d954ddccb1e8d5dc3b7a8c"
    },
    {
      "file": "balance/probe_nativebrowserentrycompositionsource.ts",
      "sha256": "2e746497ec23a80526b144aa345d91fc9a7fa5c154c7123e4651669612bdbfcb"
    },
    {
      "file": "balance/probe_nativebrowserhostedcompositionsource.ts",
      "sha256": "6a8ddec8585fdbe9376380bb62c9d7888b6fa74d03731b67ef3aac7de3b19bfc"
    },
    {
      "file": "balance/probe_nativebrowserstarthook.ts",
      "sha256": "5806aa038d35f047ec9f4b615c2d2521aca5f52e14329adcf89b9dbb23fc1d6d"
    },
    {
      "file": "balance/probe_nativecampaigncompositionsource.ts",
      "sha256": "128190f221ffcb389614992d305f9f197c24b34b87d8a2202ff26b77809933bb"
    },
    {
      "file": "balance/probe_nativecampaignframeclosuresource.ts",
      "sha256": "82fa7c7df9e39a3c93d2abe0731e05885e516847841fbb07a39fb372cee07137"
    },
    {
      "file": "balance/probe_nativecampaignframesource.ts",
      "sha256": "8f1a84043172c3cc69fe747b5be611356844a85b7c7f1337d43e266a4856d24f"
    },
    {
      "file": "balance/probe_nativecampaigntransitionssource.ts",
      "sha256": "2aa9c8c3b5e88e797e7bef14ace2395a34b7bdf554a3f9eec41f5aa28f2456f1"
    },
    {
      "file": "balance/probe_nativecaravancompositionsource.ts",
      "sha256": "c5e8096f94d8aaca8af939271ad2d9e250a2120d04e28621a8a9349995b88d16"
    },
    {
      "file": "balance/probe_nativecaravannews.ts",
      "sha256": "b6cf85f08e905434207be9bda6c75ef5f2b63dad3c6faf6cbb61a6cd12abf1a6"
    },
    {
      "file": "balance/probe_nativecaravannewssource.ts",
      "sha256": "6729d74e4652136e0147f6185f30e772a84f35437e330f1606c1d0a755ba5d05"
    },
    {
      "file": "balance/probe_nativecaravanrevisit.ts",
      "sha256": "59c25c0edcbf9131bbb431c47b0cd97765cbe063996911e50d425587e4f24209"
    },
    {
      "file": "balance/probe_nativecarriedadmissionfinal.ts",
      "sha256": "3cfb8c5a41190394f9aa965e9d6c6e7b5704fff7590ae746457bceee82610088"
    },
    {
      "file": "balance/probe_nativecarriedadmissionfinalsource.ts",
      "sha256": "2f555f94488933020bb1cabad406a7ce2783285ae503fcf11d24bfa481ad078b"
    },
    {
      "file": "balance/probe_nativecarriedbootstrap.ts",
      "sha256": "e050cec9127858616086b88c69dbe5c532742d61d553e7bd840998516b2824a4"
    },
    {
      "file": "balance/probe_nativecarriedcastcontinuation.ts",
      "sha256": "04cb0642c8094b715dfd7eec0b15838e1a862b94b2eb0355ab383bf729295846"
    },
    {
      "file": "balance/probe_nativecarriedcontrolsource.ts",
      "sha256": "4017ef5447f1e92608c29eea42f493aec7d2b2baff85f9d9fc49a382c1e612e5"
    },
    {
      "file": "balance/probe_nativecastingpreparation.ts",
      "sha256": "cd7d6a0e84ca0d63bc2d742fba9894c6f773359743dd1a674a7d4c4694f4d290"
    },
    {
      "file": "balance/probe_nativeclientboundaries.ts",
      "sha256": "bcaa220d04c093774d23051e67723d66956ff4fa1eef4c054276af34600ee6d5"
    },
    {
      "file": "balance/probe_nativeclientconclusioncomposition.ts",
      "sha256": "b6c50839b733271cada0fcccbda2b552841ea4c40b36982294d6ebe9466edb1c"
    },
    {
      "file": "balance/probe_nativeclientconclusioncompositionsource.ts",
      "sha256": "e08fd57a36153ff908a6f5f5313c088ac24722aa43f95d2963a55b808afae7ee"
    },
    {
      "file": "balance/probe_nativeclientconstructorcleanup.ts",
      "sha256": "db9d520b17a2fd4b4483c3443058f50984e5259b6f0bb1998a2952f9eaf4139f"
    },
    {
      "file": "balance/probe_nativeclientcontinue.ts",
      "sha256": "5260f385b5ce55f9dc5bb8334947fa07e0c5998bf93f23dcffde3e560315160e"
    },
    {
      "file": "balance/probe_nativeclientcontinueboundaries.ts",
      "sha256": "2c9a6906a0473db7b4dfdbead635d72ccf05fb9b09dcfd99ba68ad71d454d606"
    },
    {
      "file": "balance/probe_nativeclientcontinuecold.ts",
      "sha256": "e2a8d636a8fbd82b33f66f981ddaa9e46f35ebae976db99f037954a0e88b9a29"
    },
    {
      "file": "balance/probe_nativeclientcontinuemercs.ts",
      "sha256": "708ae29966d339a1f20254250c35fd68b8794db9991bb9332a89ad38a90c9019"
    },
    {
      "file": "balance/probe_nativeclientcontinuesource.ts",
      "sha256": "e3511892c4378ccdd0e799eafd1fc34a02626f054bd3390a73a7760383c94431"
    },
    {
      "file": "balance/probe_nativeclientcontinuethrong.ts",
      "sha256": "f3c680a6f23d14ad98c5d7682c4aff5f4048bd200c459a4b1d586da1304b3617"
    },
    {
      "file": "balance/probe_nativeclientcontinuity.ts",
      "sha256": "43b265854754bcc4af0dfa5202dd071f4089f2108a72974851255104dd5f9d89"
    },
    {
      "file": "balance/probe_nativeclientcontinuitysource.ts",
      "sha256": "143d5949351931b0623330193956d70392e8d1b4bf52679b447d023831cee595"
    },
    {
      "file": "balance/probe_nativeclientdispatch.ts",
      "sha256": "2fb281ef29bf9f44f6c4c57747c241d96509f1f1ddd5e9e935572d2391c8596f"
    },
    {
      "file": "balance/probe_nativeclientgeographysave.ts",
      "sha256": "853593839644a19103fd32a35927130a70df01cc58748d5d57c90b947b057dd3"
    },
    {
      "file": "balance/probe_nativeclientlifecycle.ts",
      "sha256": "3c2f88b68344ed845e7e36c8e12c00b876fdbaf77e12a92fbfa8a41e50969257"
    },
    {
      "file": "balance/probe_nativeclientmenucomposition.ts",
      "sha256": "981a8849721995fa925d8ac11ed70332be5f219117c17571a12cb65f744e029d"
    },
    {
      "file": "balance/probe_nativeclientmenucompositionsource.ts",
      "sha256": "df7c4a75f051d330915f6ff3d61064428817fef425128833ac701ebbde327062"
    },
    {
      "file": "balance/probe_nativeclientpublicationcomposition.ts",
      "sha256": "92ff675ce5d34305fd70b39cc78619fce5e223ba43b3662c3779c8ef05e346b0"
    },
    {
      "file": "balance/probe_nativeclientpublicationcompositionsource.ts",
      "sha256": "d4898aba7cb77e0a0b948b3e4bba43270c4db81c60d5c80c7e604c90da6bed44"
    },
    {
      "file": "balance/probe_nativeclientrestoreowner.ts",
      "sha256": "b9ac1c0e08e7b4785521c78ea90ae5616fa8ce3b34fdb0fed87bed440ea0c939"
    },
    {
      "file": "balance/probe_nativeclientrole.ts",
      "sha256": "9082786903108f34914b0586deb78728ecb4037d134a40c0f3d94c82bcd0c4f8"
    },
    {
      "file": "balance/probe_nativeclientruntime.ts",
      "sha256": "63169355b96a67940df862d2f9aea9bbe85dd2785b8d7c8d6bf4bf3c82ed9b67"
    },
    {
      "file": "balance/probe_nativeclientruntimesource.ts",
      "sha256": "45701f6c31918fb9cd499bdcf00f128bd87ecd019a771cb5196391b7cc20bd81"
    },
    {
      "file": "balance/probe_nativeclientstart.ts",
      "sha256": "089d57990b8d199d1ae6dbdbe3f652a1bef6d3bd631e0d7c44232733978a91b5"
    },
    {
      "file": "balance/probe_nativeclientstartactionscomposition.ts",
      "sha256": "61459d48aea4a6851816f06e984f5cf4b990536127fb08561c72ee2f1a69902e"
    },
    {
      "file": "balance/probe_nativeclientstartactionscompositionsource.ts",
      "sha256": "eac71c88d473c80a95a2887c375278b1c2ecb9692516214a33276ff82b30a1f6"
    },
    {
      "file": "balance/probe_nativeclientstartboundaries.ts",
      "sha256": "3c1bb9b2cbec1072877c0049ae1c3bb545b5cfe6aed49900f1371bf0d0d0f0a4"
    },
    {
      "file": "balance/probe_nativeclientstartmenucomposition.ts",
      "sha256": "875781145398c5d4cba14ce4d9a7df24d6442799dad53b4f897617ee47b550e4"
    },
    {
      "file": "balance/probe_nativeclientstartmenucompositionsource.ts",
      "sha256": "45503412e347481f879a4cb87f0454e4b84e7985809f90043b5fea9ce3d65f1f"
    },
    {
      "file": "balance/probe_nativeclientstartowner.ts",
      "sha256": "1e6c6c7c30077114e76eb8e6acd6589a95621be19119b3a61f6a1011d1427352"
    },
    {
      "file": "balance/probe_nativeclientstartownership.ts",
      "sha256": "693ddb20be81abdb3ef045273f39397242b2d5ae6b550f7b697688ac1e576ec4"
    },
    {
      "file": "balance/probe_nativeclientstartscenes.ts",
      "sha256": "c0861c1298192beef5df0e24e29c20661ecddd82566993ef3a4af892fe73887b"
    },
    {
      "file": "balance/probe_nativeclientstartsource.ts",
      "sha256": "622d4602764a51d1b025f60eda00184cecb623c75396b4232e9adc5388e013b2"
    },
    {
      "file": "balance/probe_nativeclientstarttown.ts",
      "sha256": "fbbfa707acf526f1f18d8ea4344bb12dc7d4e3650c03546aeb1b70e15211ee59"
    },
    {
      "file": "balance/probe_nativecoldfactory.ts",
      "sha256": "4880f400d415af53d160f5b74d67a60163dd10983a30a4a33b5c3843a801c7d2"
    },
    {
      "file": "balance/probe_nativecombatabsentobjective.ts",
      "sha256": "6569377fa1d093c9cfdbab22116e380dd00ca4fc0e1fa89d20355903fe04c85a"
    },
    {
      "file": "balance/probe_nativecombatacceptance.ts",
      "sha256": "7344d0356d69b71d2ff025629d70cb0bf12af550117ab5eff98223db53561260"
    },
    {
      "file": "balance/probe_nativecombatbuyerscope.ts",
      "sha256": "b09ceded37db47452ae42c6c0e5a7d2dff9f1b31013f6c4c6c283ec8a72011c6"
    },
    {
      "file": "balance/probe_nativecombatcampaignarenasource.ts",
      "sha256": "8517315f41004aa279348457f2e6cf396ed5a42f9af09fc02b096757ec74400d"
    },
    {
      "file": "balance/probe_nativecombatcarriedstats.ts",
      "sha256": "98fe6f195bf9b57749c27656a6f5acc5fd436b0e4f241b2c89a5073a7ae8e63b"
    },
    {
      "file": "balance/probe_nativecombatcarrytravel.ts",
      "sha256": "fb26f865488d208bec49b3f8077883d5ba3e211f1db963554f680b54de273323"
    },
    {
      "file": "balance/probe_nativecombatconstruction.ts",
      "sha256": "d2e2a21dc0cdf6b2afb7ac0523edf6057591515836ed623ad67a84da0c293982"
    },
    {
      "file": "balance/probe_nativecombatcycle.ts",
      "sha256": "35d1738fe9892cb3b0cb39959587639c0e800b00379f2b02e2f2e3efb45afa8d"
    },
    {
      "file": "balance/probe_nativecombatdeparture.ts",
      "sha256": "44feaedaa4e6b2b790b12f1695de2b2409070eb2d43ae852d13e0563fe150edf"
    },
    {
      "file": "balance/probe_nativecombatdetached.ts",
      "sha256": "03c39cc951ae44db52014985bdfb706351521842889d4a8a45aa33f07aa97216"
    },
    {
      "file": "balance/probe_nativecombatdirector.ts",
      "sha256": "68eb70953e365e309d5c90e9e765bb159823e7b5181a1a7d81d7ccc07b0aa223"
    },
    {
      "file": "balance/probe_nativecombatdirectory.ts",
      "sha256": "8f815ce80ab6aa3b73d4a7bbf90c1e496e8cef893cfaa6044e2df18a2a84352f"
    },
    {
      "file": "balance/probe_nativecombatdirectorysave.ts",
      "sha256": "42df90f30df8f3c82d91e93f2d7a6e7ec10fc54655a26b314a4a983279e4da3a"
    },
    {
      "file": "balance/probe_nativecombatentrybinding.ts",
      "sha256": "8240bc6d7640a18eb8103054e44652239e8631a9d3151f8513b82cdc206dada4"
    },
    {
      "file": "balance/probe_nativecombatframelifetimes.ts",
      "sha256": "8377d982c4a733f6803661d16a6c9cac7af079882d91720deb06638f25fe6e40"
    },
    {
      "file": "balance/probe_nativecombatfullframe.ts",
      "sha256": "33941c4b9dccac548598f8dfc167cc9b91db3957c599e8adfdb3d2cd1c015eec"
    },
    {
      "file": "balance/probe_nativecombathostedframe.ts",
      "sha256": "bb53512f3444d81a98e6a60907bf3d8e7a1f23d83803b116dcb8ec60f1f618de"
    },
    {
      "file": "balance/probe_nativecombatkernelhooks.ts",
      "sha256": "52b1b601a8c709bb31b0251b754d1dba10a4c7bd60c6cd348fee66cc5000e5ee"
    },
    {
      "file": "balance/probe_nativecombatkernelsource.ts",
      "sha256": "14adf5ad7b327a03b8690a9ea5ea6ec99107444d19480805caab25f0bd7a773a"
    },
    {
      "file": "balance/probe_nativecombatlifetimes.ts",
      "sha256": "2558c98480bc7b954bda586eb0790f7c02cd9d42d58bfe51ff6dab9b05fac1af"
    },
    {
      "file": "balance/probe_nativecombatlocalframe.ts",
      "sha256": "8150207e1e1b786414dfabfef873c99c1a99d3e164356c77981b59f4c1ba135a"
    },
    {
      "file": "balance/probe_nativecombatmassguard.ts",
      "sha256": "f65dd526d5d115cf7f084e1c9746997a43d5c1661bd8ad3f945bd14f4d2d850a"
    },
    {
      "file": "balance/probe_nativecombatmotionsource.ts",
      "sha256": "dc4022c5836417b8f9edfd29e9b8f2f7ed008c5521ae4543aac8579e5fcab52b"
    },
    {
      "file": "balance/probe_nativecombatobservationbootstrap.ts",
      "sha256": "4c6e58503742693a136b4ea018881ec38e53d7944bd29847da6147813749cccf"
    },
    {
      "file": "balance/probe_nativecombatongoingmass.ts",
      "sha256": "bbaa55a7367b9cdb391e8975b898f6d59bcf311381fe3a8ad2bb1a3777f08273"
    },
    {
      "file": "balance/probe_nativecombatoracleagreement.ts",
      "sha256": "03b71fb7cfb40a0fb5e9b73f116c9cd03419588150f1f1c2420604980a5e99ef"
    },
    {
      "file": "balance/probe_nativecombatportalabsence.ts",
      "sha256": "e7fa929ee8febbcf3da30bc8185118608128b5399e529e2d7ca4218add5a54e9"
    },
    {
      "file": "balance/probe_nativecombatpresentation.ts",
      "sha256": "18db328ec169e2dbb5fb1a8d69bb198611df381ca03aa65956d77649eb442a00"
    },
    {
      "file": "balance/probe_nativecombatpresentationsource.ts",
      "sha256": "0021f4e123d3e09932627e6b340eeb59e263ae133ce0cc6bc763c76efd616bde"
    },
    {
      "file": "balance/probe_nativecombatqueuebinding.ts",
      "sha256": "f667eb7d253416d6bbd2b998099a7c43d5c599a99289bbc22a0fddefce72cbe7"
    },
    {
      "file": "balance/probe_nativecombatrecordselection.ts",
      "sha256": "f48f62ca1242380114f46c3328412186fda1a4a05b1d053a8f7ccc925d22c1ed"
    },
    {
      "file": "balance/probe_nativecombatrescueattendance.ts",
      "sha256": "22ec4931514df5eb13d5ad58af0411b48c2825c5e61a53aa1350c72271ba500e"
    },
    {
      "file": "balance/probe_nativecombatroadcohort.ts",
      "sha256": "d88a1140cc24ed79ba38f09a3b8f6ff864760b99d6dbf7018a35ee746a35b02e"
    },
    {
      "file": "balance/probe_nativecombatroadfinalcheck.ts",
      "sha256": "281a7ae378697cc0eea0f94d0a5d823848c8598aa7fbcb9e89bac68c8b127944"
    },
    {
      "file": "balance/probe_nativecombatroadidentity.ts",
      "sha256": "67d2a778e059d1f97979e99744d742816fc53d3c6bf97815ee0203c07bbd4c68"
    },
    {
      "file": "balance/probe_nativecombatroadqueue.ts",
      "sha256": "d3af43a9ca554be679b003caaef8ba2365d555e7f0b4d5d2758b94edab183941"
    },
    {
      "file": "balance/probe_nativecombatscenecarry.ts",
      "sha256": "d4e653c720035021271be98725f422615a49de4938564a7e0eea887f55945ab7"
    },
    {
      "file": "balance/probe_nativecombatsharedstate.ts",
      "sha256": "46f8ae6ca6ec99f25bf0017c447c97726c7cc0f35a777fc83fd7a99daf07c21a"
    },
    {
      "file": "balance/probe_nativecombatstate.ts",
      "sha256": "42c07c8bace6f61ea861fde8192e13d6c3510e761fb89aee91c4bf32588dd175"
    },
    {
      "file": "balance/probe_nativecombattravel.ts",
      "sha256": "b564d9b4a6f621c6b75b9cd93d61847e001052f28f3e69ba19749186795e6e72"
    },
    {
      "file": "balance/probe_nativecombattravellifetimes.ts",
      "sha256": "88445e7bbc926a60dde70dd50d77228b751a56ae4416518ee11ec270428ff4af"
    },
    {
      "file": "balance/probe_nativecombattraversal.ts",
      "sha256": "f8980d45988b0e796ee25405800f243996139c6233935b9dc43bc891f1ea4a09"
    },
    {
      "file": "balance/probe_nativecontinuitycomposition.ts",
      "sha256": "64d4b074df743146eb773f4dea4143b2e7156c39b60dd34d43a4cc0962b9e3e0"
    },
    {
      "file": "balance/probe_nativecontinuitycompositionsource.ts",
      "sha256": "17c59e3a146a2b399b9938a6f5f9ce8087fc94a89b0d6c8c1c042117322c01be"
    },
    {
      "file": "balance/probe_nativecouchjoinlifetimesource.ts",
      "sha256": "57ca4198e7c95600d9a607cf4e2f0d354f83d8d2e13721547714c06042bbdba1"
    },
    {
      "file": "balance/probe_nativecrusadecold.ts",
      "sha256": "68d17a1c3705a82fe782440245cd20cbf7fcfe15fade888ce2de4d55246f8fc5"
    },
    {
      "file": "balance/probe_nativecrusadecommanderparity.ts",
      "sha256": "abc77a7473b0e2d4e5d94f529444e2952f8833ecf68dae468d3f4f8b1ef155e2"
    },
    {
      "file": "balance/probe_nativecrusadeepochboundaries.ts",
      "sha256": "f6bf7d1b3b03d4e182ee457273b7607c0f926b1b0d1b83286378223a7f989165"
    },
    {
      "file": "balance/probe_nativecrusadeepochwitness.ts",
      "sha256": "13f507f9e5dc7efa7e932f5e80efcfebf802471b81a28ccba378968fcf8787bb"
    },
    {
      "file": "balance/probe_nativecrusadeoldcommander.ts",
      "sha256": "d8c3057dfdb01ea6afcc10236b8ed45d9793ccfa764c43aa645b5d929af580f3"
    },
    {
      "file": "balance/probe_nativedefensepreparation.ts",
      "sha256": "cfdd10fb9099b6a77c0c8dbef77d445028f10b4641610a058b85d89c8757800a"
    },
    {
      "file": "balance/probe_nativedelayedarrivalboundaries.ts",
      "sha256": "fc0074a639a6bb23ecff204ff4156b8f31c375b4334703655ad22927cad75237"
    },
    {
      "file": "balance/probe_nativedelayedarrivalssource.ts",
      "sha256": "499f3afca715ee8f78c7be2d45c77aabc95b536c22b8d6220690465d104c67ae"
    },
    {
      "file": "balance/probe_nativedelayedcorpsearrival.ts",
      "sha256": "01e00bafc149f25305ada2ea998b5edbbf31d23438b48fffe647ae92dfbfab4c"
    },
    {
      "file": "balance/probe_nativedelayedcorpsegetterreview.ts",
      "sha256": "09bf9e2cd05e58fa9a127a663b3b4013dd339303ed951511d5fc25e24e85821a"
    },
    {
      "file": "balance/probe_nativedelayedcorpselifetime.ts",
      "sha256": "09bb54492c1c40116063e46f2ba0a6db8c8e73fc5309553d5af9b25065124753"
    },
    {
      "file": "balance/probe_nativedelayedcorpsepartial.ts",
      "sha256": "216d71a1bccde52caed13a2530105845c294690850c3c8083459b1569f1bb578"
    },
    {
      "file": "balance/probe_nativedelayedcorpseremote.ts",
      "sha256": "56c6e2d13e140329eee5bb6b346c214373ebf5838bd2a7b1815e7776037c465a"
    },
    {
      "file": "balance/probe_nativedelayeddelverarrival.ts",
      "sha256": "8e2dd0bcabddbec9d9807004642131eb92d19cb77b6c36b7c9b88b4e151fc0ba"
    },
    {
      "file": "balance/probe_nativedelayeddelvercontinue.ts",
      "sha256": "1cdffdd21f31895e9be64688f977868fe530505c25ad4506fcb39df48c08f816"
    },
    {
      "file": "balance/probe_nativedelayeddelverlifetime.ts",
      "sha256": "acc2edc44f411f7d5deb3d9930140513ed9ce4ca0f17d24b93f97aee7727e725"
    },
    {
      "file": "balance/probe_nativedelayeddelverpush.ts",
      "sha256": "e3eb3978f88071d65f7b48b1bdbce35dd3bd098b6537403312139d290052ae84"
    },
    {
      "file": "balance/probe_nativedelayedreceiversreview.ts",
      "sha256": "1d39ec75afbd0267aea26d83c6ab60a4ee13864f5c5368accd1bd83bfd6a12d6"
    },
    {
      "file": "balance/probe_nativedelayedunissuedreview.ts",
      "sha256": "1881c921e2ce7ace111ced507e84ce90407ccf4214c3cf4268e630e46f4840ba"
    },
    {
      "file": "balance/probe_nativedimensionboundaries.ts",
      "sha256": "0df03fa35c3f48e4f163f6f442825ab9be186c3e01cb1f8da58bac038194b7e6"
    },
    {
      "file": "balance/probe_nativedimensioncatalog.ts",
      "sha256": "ccce28274469f71889eeb38a5c6e5483a512a450db3fed95e1271e8f6ea02d9c"
    },
    {
      "file": "balance/probe_nativedimensioncatalogsource.ts",
      "sha256": "35208ae582ff11ea2703d9f0dfe8d3556ab58a83c404ae12a04de8668d918867"
    },
    {
      "file": "balance/probe_nativedimensioncontinue.ts",
      "sha256": "ea6f386de29ff8394d9261f04b04e5582e14d781b41350020ffc27aaae1ce969"
    },
    {
      "file": "balance/probe_nativedimensionentryidentity.ts",
      "sha256": "1f2859afe0202e18231b99b66a4e2df50b72766e466146ed71ae5b24d89a2e29"
    },
    {
      "file": "balance/probe_nativedimensionlegacy.ts",
      "sha256": "cf1f2a35286842b39539a9fb3a812b6720a81c8baeec47d91d4c93b9bc24a5d1"
    },
    {
      "file": "balance/probe_nativedimensionreturn.ts",
      "sha256": "43edc3e5bc36836e7c4c86995b079cc616b177cef047d80cfe16e18a9639720f"
    },
    {
      "file": "balance/probe_nativedirectorbirthsource.ts",
      "sha256": "29371132182af45a0199e90e9a407927d278dfdf4812240c4c2f7a3871693e2a"
    },
    {
      "file": "balance/probe_nativedisplacement.ts",
      "sha256": "51bb4cfd26e4fa3762cf51eba46f499a75c2dab89d379e3c494b1f9ea9ad3a66"
    },
    {
      "file": "balance/probe_nativeencountergroup.ts",
      "sha256": "46aa51e5e8191d73853f37f43a1cde5bbbdc57a27789bfedfeb57135945b3d3f"
    },
    {
      "file": "balance/probe_nativeencounterinsertionboundaries.ts",
      "sha256": "e3ea23ecd56fb1cd7953fdce838d226a4b585277af48d462b4edbca2259549b4"
    },
    {
      "file": "balance/probe_nativeencounterinsertionsource.ts",
      "sha256": "b3569ac62a2d5191440717764cfd9e90b4d87f67d207cbdb6bdddb4b9b2a47ca"
    },
    {
      "file": "balance/probe_nativeentrycoldselection.ts",
      "sha256": "fce1f254fa50af4a705d7545c4db7462a9b9f8363ae1d1a2d1c2b9cdd99c06ef"
    },
    {
      "file": "balance/probe_nativeentryconsolidation.ts",
      "sha256": "b3dba570e6debb1db21a8dded7fefd11728df06138f5620010dc0dafe87d6e11"
    },
    {
      "file": "balance/probe_nativeexactanchors.ts",
      "sha256": "67dde37585a5fee954a2d71816bf6ab86b50efb685a2d25525a8ebf29f1d723d"
    },
    {
      "file": "balance/probe_nativeexactanchorsource.ts",
      "sha256": "09c6a60066c537db71dfc2e1de0c00e53f760743ead356766c0915becdfbe256"
    },
    {
      "file": "balance/probe_nativeexitpreparation.ts",
      "sha256": "97401c905f61f6c40d74dadab9b92e07d382fe99839c4cb7098c7f19258966f0"
    },
    {
      "file": "balance/probe_nativefinalentryplan.ts",
      "sha256": "84156a45ef6c9efc6b0fda166b9076dfafe148288e3fba68793b10533451efed"
    },
    {
      "file": "balance/probe_nativefinalselectioncallbacks.ts",
      "sha256": "f74ec2c7b5736b135fc600c645664169a2fe077ce8d4d79fa3dd7c5d265db32a"
    },
    {
      "file": "balance/probe_nativeframeattendance.ts",
      "sha256": "8320acb8c74a0a42ecbeaf859e8a7eb53528c4e1a5db6d21de355e14660433e9"
    },
    {
      "file": "balance/probe_nativeframecontactsource.ts",
      "sha256": "5b2a5eb7ccb67d3d0888d03bc04c2cf45d000e35e1ce8e617f8896412571218e"
    },
    {
      "file": "balance/probe_nativeframehooks.ts",
      "sha256": "4976d9f91579c55bbb6c1d7121a3a1c9b6acb28ac5f181fe459208028258c8ba"
    },
    {
      "file": "balance/probe_nativeframephysicalseats.ts",
      "sha256": "a6ee8ee4be068049e34a75721eb86545bea74af00648ce9df239fc4047b820b0"
    },
    {
      "file": "balance/probe_nativeframesource.ts",
      "sha256": "559f0f2669c08fb13416de78640896df152296d9a8d5187194f4c7f725ef9071"
    },
    {
      "file": "balance/probe_nativegeneratedanchors.ts",
      "sha256": "586914118ec78f1cd22a6f1d6f886f6cdd739258c971d57d35975d142f902924"
    },
    {
      "file": "balance/probe_nativegroundfollowups.ts",
      "sha256": "3b1c13fbe5d24ae93edfdfae1057a2812d62c2d93e0299466c296905085313bb"
    },
    {
      "file": "balance/probe_nativegroundfollowupsintegration.ts",
      "sha256": "617af050c2a092403125aa84ac40c2dbd5f04c1e2d7ad199b80becb442d25f4f"
    },
    {
      "file": "balance/probe_nativegroundfollowupssource.ts",
      "sha256": "ca7562b44af1b7daf1e414b1cbad18cd5742055cc6761ec756fc72e5fa0e82b3"
    },
    {
      "file": "balance/probe_nativeharborarrivalsource.ts",
      "sha256": "110dac0555e2678662453c9e904efa3a7137c10df2f00ac0a6166e6cb7614f77"
    },
    {
      "file": "balance/probe_nativeharborservicessource.ts",
      "sha256": "b3d3d8412e7d9df691996653a440e7784626ff2bde423321574c6d2c551a2997"
    },
    {
      "file": "balance/probe_nativehistoricalactorreceipt.ts",
      "sha256": "6b6ae293df4eec2cf134825d02025ab1b5f6e5c69f7595cfdf263e4a5f9f71d2"
    },
    {
      "file": "balance/probe_nativehistoricalguards.ts",
      "sha256": "3dfb700cb5dbc28a884ee84334149fdff42b0826c1d02a025b6274945a717410"
    },
    {
      "file": "balance/probe_nativehistoricalreceipts.ts",
      "sha256": "ba2962fecfc4591f7b1dec8357f4c82d47c3553dc8b20a28813c45d0811c0c97"
    },
    {
      "file": "balance/probe_nativehistoryarrival.ts",
      "sha256": "9fff6ac767af7006aeda34c043b64db9ecc693a5df09de21ac01378095908a00"
    },
    {
      "file": "balance/probe_nativehistoryarrivalsource.ts",
      "sha256": "5f44d07734ad88170cd11ee4193fc33bae7b1080559c17adf8afac323be2b46c"
    },
    {
      "file": "balance/probe_nativeholdvocation.ts",
      "sha256": "c1facad23c877535d97a16a9f1a7ca9afe14a96947347b01c036fcc867d4e556"
    },
    {
      "file": "balance/probe_nativehostclosuresource.ts",
      "sha256": "620a92e5997b9facb1db964eae5da9b4146f931f5e2b3a1d16137a8a04707d41"
    },
    {
      "file": "balance/probe_nativehostedbootstrap.ts",
      "sha256": "581a0bf5e3f7104b22af0b4dff106a513e2b80ef801c002b53841e975e0bf5e8"
    },
    {
      "file": "balance/probe_nativehostedcontexts.ts",
      "sha256": "eec65fbb6acae65fd053cb76af7fdd93c2858b74a7350464f39100d86d24c48b"
    },
    {
      "file": "balance/probe_nativehostedpublication.ts",
      "sha256": "31a5848b3e92141c122caaf98500d2e5f21940fd663b7ee3870c9c306bb9f6a3"
    },
    {
      "file": "balance/probe_nativehostedruntime.ts",
      "sha256": "45ad2073803d0f3c2716efccef7bf67e4862c9d752c0f05a1214c5a354cc1041"
    },
    {
      "file": "balance/probe_nativehostedsource.ts",
      "sha256": "30240c8d1e9095056afd9fed69df1f12f519c5fbfadbcf2f9dd9a09170bf34b5"
    },
    {
      "file": "balance/probe_nativehostility.ts",
      "sha256": "cd35e39759defd955bc76e7ad6d94aa06b095031b577348381cab4531f3f8ac8"
    },
    {
      "file": "balance/probe_nativehostperformancesource.ts",
      "sha256": "14a462ddbe20b1630fffadf8aad819005d6096f9521c10d07904f2b77c434ae5"
    },
    {
      "file": "balance/probe_nativehuntmigration.ts",
      "sha256": "bad9d9d5e9c96d70962fd120a4a3735fe7c432e74ea4ec9765081267af0b8836"
    },
    {
      "file": "balance/probe_nativeinhabitants.ts",
      "sha256": "751b7930fab8a488f5a4e43f4d3b57b451fffd1aff377d2b431c08e210886d06"
    },
    {
      "file": "balance/probe_nativeinputcastcycle.ts",
      "sha256": "0e2ad794582c000408c04be8ea8857da429a051fad658bdfd932cdce560b3a39"
    },
    {
      "file": "balance/probe_nativeinputmetaauthority.ts",
      "sha256": "76277b6a51c37c0508661b43f7b85a2142787b32ba4281dbb1c1d765a7619e7f"
    },
    {
      "file": "balance/probe_nativeinputmetacases.ts",
      "sha256": "b2203f6e731af1eacba1e85c550f1fe960a82da0085e8d75defffad8522a1115"
    },
    {
      "file": "balance/probe_nativeinputsources.ts",
      "sha256": "56ff1f5dd1b85934395cc5bf30b8b161b27deae223fff18cc60c51b16ea39b75"
    },
    {
      "file": "balance/probe_nativeinstalledsources.ts",
      "sha256": "ecfce430327fee822c48048a83e220776d111212c7ddc812bb4bddd47658c110"
    },
    {
      "file": "balance/probe_nativeinteractioncargo.ts",
      "sha256": "08ebff8e5a1b5308597a80603d32b22e95b27e619ca205a6fff167cd8625c43c"
    },
    {
      "file": "balance/probe_nativejourneycompositionsource.ts",
      "sha256": "f4f04b549e10e3e3a10ea0ebe4e5679ee2c3621328159b179d821099d43e52b1"
    },
    {
      "file": "balance/probe_nativekillaftermath.ts",
      "sha256": "81404872eacfce56927ec6fc1c310e56735292e59d5c94b4d5906c4dc7f1d864"
    },
    {
      "file": "balance/probe_nativekillaftermathadmission.ts",
      "sha256": "cc8a4ac284f731c022bc3070b3f33e87b22aeaa4e48792ba9119311e9c3b128b"
    },
    {
      "file": "balance/probe_nativelateencounterarrival.ts",
      "sha256": "8255027451c4235f77bfdc186dc5d6773ca9b23e2b775248bfec66236eb41150"
    },
    {
      "file": "balance/probe_nativelateencounterboundaries.ts",
      "sha256": "7e02aa86b842538383b63690055780df75c5d4de4e6210a5b1fdcd894c4404cf"
    },
    {
      "file": "balance/probe_nativelateencountercontinue.ts",
      "sha256": "5d51e776cfa70adc8c8a8a12071b0a47ad8956f3b4b5675580e1d0a41dd469fa"
    },
    {
      "file": "balance/probe_nativelateencountercourt.ts",
      "sha256": "8f0d5ca224791b7d335eda6dcc24c1477c537a00c5e63aeac77576052491a2eb"
    },
    {
      "file": "balance/probe_nativelateencounterhosted.ts",
      "sha256": "bcf182e0819edc77fca22a9bbd0239982b90d7635153e24c8214970c08435108"
    },
    {
      "file": "balance/probe_nativelateencounterlifetime.ts",
      "sha256": "ebd99aed0dffd8e1f1e662ec08b67c00db62a717b2b356ecb9a362b99c19deb8"
    },
    {
      "file": "balance/probe_nativelateencounterpartial.ts",
      "sha256": "e0195fddb31df1cd7bf887093572237b6fa743cf46f8d1d13f1086525f336772"
    },
    {
      "file": "balance/probe_nativelateencounterrenewal.ts",
      "sha256": "70dfcbadb8076dbe6fa8fbf7423b43bff6bd398568c8bcf51dae6f3b29fb9f8c"
    },
    {
      "file": "balance/probe_nativelateencountersource.ts",
      "sha256": "cc95c3f44d0f47229223b0bc41eb1928cf694f7f5b8680ce55550b51e01a0ccb"
    },
    {
      "file": "balance/probe_nativelayoutgeneration.ts",
      "sha256": "1c906571bbb8c5baae139699ca649bbe5e34a52fc598f8c79f69eb405cc1bcbf"
    },
    {
      "file": "balance/probe_nativelivesitesource.ts",
      "sha256": "e4a97f74d41d895830e59fb3b2c496853638a4f9e58fa184a3a8f817e675a386"
    },
    {
      "file": "balance/probe_nativelocalinput.ts",
      "sha256": "365d6cb710e101317fb937115e4145aaa4f302bad89d28fe9f7e4b7890367cf2"
    },
    {
      "file": "balance/probe_nativelocalinputfinalreview.ts",
      "sha256": "a25b388c3a5eee1b6ab27504ded76c6b3edf6da7a655fd8d4038e03b28dd7a50"
    },
    {
      "file": "balance/probe_nativelocalinputfinalsource.ts",
      "sha256": "4c31cd8b78efbfdba7f988e110e06a7c80ba426d9b776d075b5f9f7b7065388e"
    },
    {
      "file": "balance/probe_nativelocalinputpollreview.ts",
      "sha256": "beeacad7b3a9bd81bb0c975292c3a8c120338b06e4f9b8e20b522edf6cca309e"
    },
    {
      "file": "balance/probe_nativelocalinputsource.ts",
      "sha256": "5e4b961c42fa34b151d2808e25b4972e667514cadf8eb623aac7613f5b222071"
    },
    {
      "file": "balance/probe_nativemaincastidentity.ts",
      "sha256": "473aa46d7bd02f81226a6e6410cb03c951c64583b3d44d4d30b02e7c6b119cc9"
    },
    {
      "file": "balance/probe_nativemaincastretained.ts",
      "sha256": "718944f42f19ce0808153d84064e248e16226de5431ca743534995522e2b473f"
    },
    {
      "file": "balance/probe_nativemaincastsource.ts",
      "sha256": "afbfc637104c36125abbedf133956a7dc16afb44cfd274b41606cf0fdb7314a3"
    },
    {
      "file": "balance/probe_nativemaincontent.ts",
      "sha256": "77204e3c76b655044c0cff2c61cdc3d17ee6112042b1e2595fdfa179e78298bc"
    },
    {
      "file": "balance/probe_nativemainhostcompositionsource.ts",
      "sha256": "9c54a7f529a22f528cdd5357d833de316737247a5bf34c0a7e0a52e8c760ad05"
    },
    {
      "file": "balance/probe_nativemainminions.ts",
      "sha256": "9845e3c38f93887f9d11986dfb83108223eb1984637265cf9fb86e3f8dbc78b0"
    },
    {
      "file": "balance/probe_nativemainorbs.ts",
      "sha256": "77e317bb57a0093b30d11f62cff1b9351414da35c5fa0d88de10f918185d276b"
    },
    {
      "file": "balance/probe_nativemainproofsource.ts",
      "sha256": "f3851cb21825bac83ff7070a11ecb88c0cb7e3dbd27d04e47758f82823332f92"
    },
    {
      "file": "balance/probe_nativemainspatialloot.ts",
      "sha256": "aaf90c327787ebe5f7d71d80f0baf05d91d40a2057a0d1589331bb5bc316b8cd"
    },
    {
      "file": "balance/probe_nativemainterrainvisuals.ts",
      "sha256": "dcc3fbcf5980252052838cfd736ce84a3ee1950c51108d3bb076cf66d4775b51"
    },
    {
      "file": "balance/probe_nativemainvisualparity.ts",
      "sha256": "13ba11525b035f22b16b988995d097e54d144977d05e8f57788af29be83943d2"
    },
    {
      "file": "balance/probe_nativemainvisualsource.ts",
      "sha256": "08a3e13174e836db9fda65e42bfa6777afa2d47295a8f2448de09457ae386a5d"
    },
    {
      "file": "balance/probe_nativemainwirevisuals.ts",
      "sha256": "1bb6adfe3c38b9e41656e1d78cc32eb92f511ecfed20a3ec7ed2f8b5ae03da51"
    },
    {
      "file": "balance/probe_nativemenufinalseat.ts",
      "sha256": "26dddf640862e910b46e654fd71a8565ef8ff890b343981c419d07b70042d373"
    },
    {
      "file": "balance/probe_nativemenupeertravel.ts",
      "sha256": "1697e5753f56f2cf2233fda8eea3d24f42ec3c13eb4ae98456a3464ab863d5f8"
    },
    {
      "file": "balance/probe_nativemercascentarrivals.ts",
      "sha256": "e3bfd28631162b9c954e089b3bb9743f8bc001586c777c2c764c8c2e5c6400ea"
    },
    {
      "file": "balance/probe_nativemercascentboundaries.ts",
      "sha256": "112707e889144907fbaf5a11953950acfa330e6b9f9d82b1e835d3c6774f6f15"
    },
    {
      "file": "balance/probe_nativemercascentcontinue.ts",
      "sha256": "82399993129bd2b46efff9d27927c9ab8e41f7cfa86525c515539067e9fca78e"
    },
    {
      "file": "balance/probe_nativemercascentlifetime.ts",
      "sha256": "72fb11367a0a280af9ac752b0dde897476a3edb6a7101368febfb3a01f4b487c"
    },
    {
      "file": "balance/probe_nativemercascentpartial.ts",
      "sha256": "c9a9d967a9ffa496092cac6d5ec6463f4782df3631167ca7d0ce4a09a68d242e"
    },
    {
      "file": "balance/probe_nativemercascentreturnedcallbacks.ts",
      "sha256": "f1596af1584d00b5cc070e13f94ad65710eaa25822c38571002fb07a8efaec1e"
    },
    {
      "file": "balance/probe_nativemercascentselection.ts",
      "sha256": "e129a32a45b3143cd9636bf8fdf5ee24d8cf039218875037b447edd60e823e2e"
    },
    {
      "file": "balance/probe_nativemonsterfactory.ts",
      "sha256": "d6eabc91d655e21f92042aa2cc687793acbdab74ea3335cc32ac93865ee06c05"
    },
    {
      "file": "balance/probe_nativemonsterpromotion.ts",
      "sha256": "7cb2612de735e69ac638e1eaf9430a95cf081a74780d829ca73f0e181e8d8301"
    },
    {
      "file": "balance/probe_nativenavigation.ts",
      "sha256": "e28476902ae1d0ccc5e75b80d2ee75a1e08195e555b65bd46ebbac48476218c7"
    },
    {
      "file": "balance/probe_nativenemesisdeparture.ts",
      "sha256": "11c5886b93612ab88fe41c1a8da7d2bb0bb0684e05714213daeb1092e602e1f5"
    },
    {
      "file": "balance/probe_nativenemesisdeparturesource.ts",
      "sha256": "a8d4045f83af60b4f88d8616b9d79c5e88a9d2de4435a4de6798143321e10d86"
    },
    {
      "file": "balance/probe_nativenemesishosted.ts",
      "sha256": "caa17e1f57ddb961d6c1e75928017b5072262473b8063d4e48092d5328da6ea9"
    },
    {
      "file": "balance/probe_nativenemesispolicy.ts",
      "sha256": "40db973c99f89b6cd355a9efc752f8fba9904c8d44ce9f0326bbf5aee537badf"
    },
    {
      "file": "balance/probe_nativenemesisselection.ts",
      "sha256": "a791a179fac64ea4f40bd1dfcf5a02565bdc9f4b452ef3d6968c7ab24ff85457"
    },
    {
      "file": "balance/probe_nativeodysseyboundaries.ts",
      "sha256": "8ac034bc37b3e77cf6bcff3d6c656005dccb4f3dc20034627cd0d4a6e0e3f68e"
    },
    {
      "file": "balance/probe_nativeodysseycanonicalbinding.ts",
      "sha256": "6127ec3057c2be4e81e0da18043484339df8eed772947b83c09438113babeac1"
    },
    {
      "file": "balance/probe_nativeodysseycold.ts",
      "sha256": "e2fd073ebf90dbca741cbf37ebba3e6d3dc99124a1b11dffbb6caf5854a172f0"
    },
    {
      "file": "balance/probe_nativeodysseygroundadmission.ts",
      "sha256": "420b2e12051e1dba6b311cd6ecfb4c71dbce2861f9fbb282e095c2509484a38d"
    },
    {
      "file": "balance/probe_nativeodysseygroundadmissionsource.ts",
      "sha256": "c9b15fa9ca15b93bcb8f350a53191dab1989be79b244115dc197e6c51f4810ec"
    },
    {
      "file": "balance/probe_nativeodysseygroundcold.ts",
      "sha256": "c240735a94ff30792ed827130a45f79c086f9d2fa4573179a0665a374517f69b"
    },
    {
      "file": "balance/probe_nativeodysseygroundcompleted.ts",
      "sha256": "75756afd511f77de1c04e07eaa2bea0c4c06d5f27f46070869aeaf4a91d3516f"
    },
    {
      "file": "balance/probe_nativeodysseygroundfailures.ts",
      "sha256": "ab0b2c163e273f9f3122432f891291d0db65ada7b6a92e0f3361439af55eb0cd"
    },
    {
      "file": "balance/probe_nativeodysseygroundlifetime.ts",
      "sha256": "4a6b99aa668e9b067226c820c52034b622912ad16f3ab040c4e4801764d7dd10"
    },
    {
      "file": "balance/probe_nativeodysseygroundrefresh.ts",
      "sha256": "8a9295d1df794a72d81875a0f9e2130cc9cd3f7aad7311a257e481c019f2ed24"
    },
    {
      "file": "balance/probe_nativeodysseygroundrevisit.ts",
      "sha256": "9193a5d220b75faea2f996042c642b751d8cb4ccb0dddf100c94e7becbdbf62a"
    },
    {
      "file": "balance/probe_nativeodysseygroundschema.ts",
      "sha256": "cab5b19d025066767f732ec39e5abb0af8665f8a9c5bc4589222922cb27bc37c"
    },
    {
      "file": "balance/probe_nativeodysseygroundsource.ts",
      "sha256": "5baed62132a7df67117817487bb3b8573bd323ba48e8bc2d1a5362f2e0e79cca"
    },
    {
      "file": "balance/probe_nativeodysseylifetime.ts",
      "sha256": "fba2d9183d139224850571475d29d2efd0a78bafa95d18dc0e355963eb154c78"
    },
    {
      "file": "balance/probe_nativeodysseypressure.ts",
      "sha256": "28864d0b54317f2311d7b2b5ac0f5c631d930966137b7f760cc1cee9b53a0aaf"
    },
    {
      "file": "balance/probe_nativeodysseypressuresource.ts",
      "sha256": "ee20be0e002407c4f426c3ea35fdfca8d35c9705769ab24881c644ce1433d196"
    },
    {
      "file": "balance/probe_nativeodysseyrisings.ts",
      "sha256": "718193598225773aaac365fed22b6190b3950b5987ad4c4e21c27c947a3cd0c3"
    },
    {
      "file": "balance/probe_nativeorderedcontinue.ts",
      "sha256": "60d768044c8f59eba614c62a0538f00f79a3342fb3390d5c4bfa01152da7dbd5"
    },
    {
      "file": "balance/probe_nativepartyadmission.ts",
      "sha256": "1915cf38fe36b5f7ec51966dc1154a6519bd259e6894347105b2cb86bfa54421"
    },
    {
      "file": "balance/probe_nativepartyboundaries.ts",
      "sha256": "0e495cbd0af05df620dcbb7687d1a951155432c03b3eced95fbbf27e1a863ee0"
    },
    {
      "file": "balance/probe_nativepartycallbacks.ts",
      "sha256": "32762eafbc2b625ddad493d380087e2e88fab890e1e453dfbec6a41b295d2dd2"
    },
    {
      "file": "balance/probe_nativepartydeath.ts",
      "sha256": "eaca27693673aeeb2aa8d2f50b2eecec49d35d9ea64a1d8a8d67cf971863fdd5"
    },
    {
      "file": "balance/probe_nativepartydeathboundary.ts",
      "sha256": "ae3a303f9a569ea9dcee3461de270a32652992cc46960595c5b34390a6ee6529"
    },
    {
      "file": "balance/probe_nativepartydeathpolicy.ts",
      "sha256": "0f4be9a188caa72ff1d3b70f63543f4ff0fef1f7a370762a4fa5fc8822d9f774"
    },
    {
      "file": "balance/probe_nativepartydeathsource.ts",
      "sha256": "9bd29ba2e664d89595cc288e6bb6e66115a1ef87492f38e871afede3fbaa48c8"
    },
    {
      "file": "balance/probe_nativepartydescent.ts",
      "sha256": "1c3c075ae5bef0e644d0eb9a8a6cf076db076abe2d0ef674b9318349b3a4d87a"
    },
    {
      "file": "balance/probe_nativepartyhiring.ts",
      "sha256": "627059788391a1a91ea8d8a91b0878b6d11afa885833bc0bf8dc8b925efd82fd"
    },
    {
      "file": "balance/probe_nativepartyparity.ts",
      "sha256": "7fcadef0d7a406d664c1e614244b6050a5a2767c41c4511c519a80077103aad7"
    },
    {
      "file": "balance/probe_nativepartysource.ts",
      "sha256": "6788c1b6c50629f4c7eea42bd3eee7368b4bd97d70c1ce9bfe3497f88cac76d3"
    },
    {
      "file": "balance/probe_nativepartywalletcontrol.ts",
      "sha256": "f4d66ad87fdbcb9b2b76e637b710e39703539d5829a033f82445c24d1e156dc3"
    },
    {
      "file": "balance/probe_nativeplacement.ts",
      "sha256": "fd802b85b29d7b7192147e13e77009528cbb9541d606624f7fd77e84b1cc6d61"
    },
    {
      "file": "balance/probe_nativepopulationresolution.ts",
      "sha256": "6c9393f3c2be69fa4784b55fac724970f83a1d702080ea4e20419d98aaa398e1"
    },
    {
      "file": "balance/probe_nativeprogressionstorage.ts",
      "sha256": "9ec724af348dde0722c2899805bd5256e512bd1fa116783800b1e7fde3b47683"
    },
    {
      "file": "balance/probe_nativeprojectilelaunch.ts",
      "sha256": "7d30154c3b1635eaa8cbbc46d60faf30c13d01d36ace7b706e83ea2e15bf08b7"
    },
    {
      "file": "balance/probe_nativequayarrivalboundaries.ts",
      "sha256": "522481cef606b596652ce50b1ce9c9f7135047a2df3cf113bf6f6fff9d959a61"
    },
    {
      "file": "balance/probe_nativequayarrivalreentry.ts",
      "sha256": "57ec5fe76105cc44204bf92c00198ec13215d1f73b92f3719437f9bf6c46b973"
    },
    {
      "file": "balance/probe_nativequayrevisit.ts",
      "sha256": "2adfb04d6926de91524c170abddde58dbed0ec5f07a7f7e9dd3190994f420370"
    },
    {
      "file": "balance/probe_nativequayserviceboundaries.ts",
      "sha256": "ed7faf911d8df04ff9a88a87ee276cdfda6653075c4ac692ca3582a352c28e90"
    },
    {
      "file": "balance/probe_nativequestinteraction.ts",
      "sha256": "1ef379efce81c987a1d81a4d60f0ac4add1115d82c9443f115b495f4429147a0"
    },
    {
      "file": "balance/probe_nativequestroadarrival.ts",
      "sha256": "d254403a1f77a2a0649014f601beb00ed1f21fa4d31b8026847a22c756adb598"
    },
    {
      "file": "balance/probe_nativereadyfusion.ts",
      "sha256": "30b994a56820bdf872f66e3a68ed45244e8ba1e34a9e98d27caa8b2623532faa"
    },
    {
      "file": "balance/probe_nativereadyroute.ts",
      "sha256": "b50df6a26594c64262a9a740fc3232543b6b046f67712d5f053c2a3b932ccb13"
    },
    {
      "file": "balance/probe_nativerealmboundaries.ts",
      "sha256": "0fb7fcbf54438d6b908fdaad58664330e0a4a969c6e33a1fce48dc7ac34a177c"
    },
    {
      "file": "balance/probe_nativerealmcontexts.ts",
      "sha256": "7b17134f3645453c8dd5722976733f2776cc69079c2f8570441afbc1cb10b583"
    },
    {
      "file": "balance/probe_nativerealmcontextsource.ts",
      "sha256": "1154fbb35bf21a6615b01408ffd82feca5442e89fa5d6b109b4188735e1798d5"
    },
    {
      "file": "balance/probe_nativerealmgateboundaries.ts",
      "sha256": "66fc7422facb972191cf7134d1f12bb024e48829f5ef9ba1088c65020486f342"
    },
    {
      "file": "balance/probe_nativerealmreentry.ts",
      "sha256": "4d73a9e5b312a8bb45046981682376671df3f2f6aa5480888b5783b4473f36d9"
    },
    {
      "file": "balance/probe_nativerepeatcrusade.ts",
      "sha256": "2d73705cddfd525e79f79bd85f645dc8e046adbf1e32ae832a657a0fbb9eb734"
    },
    {
      "file": "balance/probe_nativerepeatdemon.ts",
      "sha256": "1873cda9f180ec0104c318f116ffd4876e3dcb8c7ff76daca2993612849901cc"
    },
    {
      "file": "balance/probe_nativerepeateventsource.ts",
      "sha256": "0ca4e02f89fd2e3a418bb12c00c0f707bf70027c76c238ac729e4108ef3fd4ca"
    },
    {
      "file": "balance/probe_nativerescueanchor.ts",
      "sha256": "00c105fb2a72d486fb70fd31cad6ae63509dd6cdc5eca806766a6f5edb685330"
    },
    {
      "file": "balance/probe_nativerescueanchorsource.ts",
      "sha256": "1f7b28ce1fac45c57920e6a993b0216266fcdf27a38c52bdb334a1ad8d5938ca"
    },
    {
      "file": "balance/probe_nativeresidentsession.ts",
      "sha256": "d780991cba81bfb515c2fd5467ab65d4bf01aec9b19e126e5d5c52516e4e43d6"
    },
    {
      "file": "balance/probe_nativerestoration.ts",
      "sha256": "f9335d97345fd18f42fa4beec0bcbd468125d1434779f1d23fb53c00c0dd4a95"
    },
    {
      "file": "balance/probe_nativerewardstorage.ts",
      "sha256": "d1dacb581bb9b37ab61acb9d1bed74fd43fb63d4d05c2835dbe4244ac5b494d6"
    },
    {
      "file": "balance/probe_nativerunconclusion.ts",
      "sha256": "d9a4548fcd81b2074cf5c1b3afda12db56bf17fabfef5534e3b6c2b0fd0d8ba8"
    },
    {
      "file": "balance/probe_nativerunconclusioniteratorreview.ts",
      "sha256": "84fc2de613c1d88ddab7b470dfd6bc13d0dedf7b25d1306b8439f9cf7a119aef"
    },
    {
      "file": "balance/probe_nativerunconclusionpolicies.ts",
      "sha256": "9e990d3cfafa182d35ceb703bbe74a4ab66f866a22b11bf5aee8f64f6d0e7637"
    },
    {
      "file": "balance/probe_nativerunconclusionroster.ts",
      "sha256": "cda4c021fb521e69eca79b3a28e756a2d2e477be79f131baba6c18cbccf271bb"
    },
    {
      "file": "balance/probe_nativerunconclusionsource.ts",
      "sha256": "07d5cb99be18b8a2cb2971b28863a927eb781a50366e9595fd4dd2d626c46a8c"
    },
    {
      "file": "balance/probe_nativerunretirement.ts",
      "sha256": "4564e9eb501649c20598cfc138c5cd5db25c9648a313e8f473109f16cdff104e"
    },
    {
      "file": "balance/probe_nativeruntimebirthlifetime.ts",
      "sha256": "220fdeee579c4b8196f570c16f6dac83077c0702de4094504650344592314988"
    },
    {
      "file": "balance/probe_nativeruntimebirthtitanlifetime.ts",
      "sha256": "4916ce08ba16d771b2a3f2ccf4718f2195f40b4c26cb6c3fa51100df22da3819"
    },
    {
      "file": "balance/probe_nativesavewriteorder.ts",
      "sha256": "d63b67235f7a4e75c266e11fc3201aed34c2e59e6cf0ba2efc5123ccf007fc93"
    },
    {
      "file": "balance/probe_nativesavewriteordersource.ts",
      "sha256": "f7867740e7a3e70cfa8923a3367024ca7884e12cdcf7c20e8975c9a5834042d7"
    },
    {
      "file": "balance/probe_nativesceneadoption.ts",
      "sha256": "e82e2e0f0dfd946430f7b6983fcdfba7a63ca58466bff60c78405982c709b211"
    },
    {
      "file": "balance/probe_nativescenearrival.ts",
      "sha256": "290dd91104de3121948e8a3e801838b54b56ee722b52688bb3d270fd063c58e5"
    },
    {
      "file": "balance/probe_nativescenebirthcomposition.ts",
      "sha256": "fb38ee2e8f6e5e150acdf2aec6d4e6d6e810985d3b77ca29cac2f42b11b1c405"
    },
    {
      "file": "balance/probe_nativescenebounty.ts",
      "sha256": "0d8aec7f040490580223f80c6efbb8a409b13cab8c584e191fb42701d4d1c08f"
    },
    {
      "file": "balance/probe_nativescenecoast.ts",
      "sha256": "d993ae1067c9528652715dc7991fc4ca5d6d112577d4ae2f0a32b7f805416b13"
    },
    {
      "file": "balance/probe_nativescenedescent.ts",
      "sha256": "b753d529a158c3ba22cd64b27ae028d3ce92e4a1866e733d7cab411ca44e770c"
    },
    {
      "file": "balance/probe_nativesceneecology.ts",
      "sha256": "6ef9121f6432cff8ec9bedcf4d62d2d3e616a8c2e8dfc5d4fb7515c9d9a80d8d"
    },
    {
      "file": "balance/probe_nativesceneencounterbirth.ts",
      "sha256": "c730a43bbe33bb4caf4744eab88fba0ffe91039a9b89fb3ae28bea6340ee898d"
    },
    {
      "file": "balance/probe_nativesceneenvironment.ts",
      "sha256": "d05d7a699d5b65ad627f6c1fa71e76b2a6320bc1e84cd89a1c25a6f968b8af35"
    },
    {
      "file": "balance/probe_nativescenegeometry.ts",
      "sha256": "6caf5047dcca1aa2f512bfa18c3c21e637f089561b8248cb7caba33f130a4528"
    },
    {
      "file": "balance/probe_nativescenegraph.ts",
      "sha256": "b60a46d341164c6dc72f668d5fb5623606f89bda78e13dc6552fa4c84f06b3be"
    },
    {
      "file": "balance/probe_nativesceneharbor.ts",
      "sha256": "72085dcdd2cdefaa5d12682bbe7afbfb6c4932aca3de1de0dc8f77ac2ad5cff5"
    },
    {
      "file": "balance/probe_nativescenehistory.ts",
      "sha256": "14f0180b39cf404dd58b4f1ee7b10456e67310c83d44b28e1d928205be1a04bc"
    },
    {
      "file": "balance/probe_nativesceneloot.ts",
      "sha256": "2d209d7bb144e8d596fb2673c5f161a21e205f8580476daf5e0c46437fe92a16"
    },
    {
      "file": "balance/probe_nativesceneobjectivecompletion.ts",
      "sha256": "fdb8bab77ceb5f5901abb77823713c3f3a3fb6623ebaf963e391dad5686d484b"
    },
    {
      "file": "balance/probe_nativesceneobjectivewatching.ts",
      "sha256": "3093cca1d525f25becb7a53c370b96fae1898746b36c46cc212cf69e33f71efd"
    },
    {
      "file": "balance/probe_nativesceneoccurrences.ts",
      "sha256": "013c462a73f385317a25daa79885787f354861c2bcf7ccddc369f50edb36c0f7"
    },
    {
      "file": "balance/probe_nativesceneopenings.ts",
      "sha256": "852392438683e5af398d32569565c2fa9282b142a335c5dfdc93a4129b7d4ded"
    },
    {
      "file": "balance/probe_nativescenephysical.ts",
      "sha256": "fcfea5542070c2df0b8c9ca2eb4b6a9b85005013c4c1aeabc7391fc4441721bc"
    },
    {
      "file": "balance/probe_nativescenepopulation.ts",
      "sha256": "a4aef6a07db1b0f77aef4737686a62b27555dc4eb10a42beca3c64a9dacacc19"
    },
    {
      "file": "balance/probe_nativesceneprogression.ts",
      "sha256": "509aa346c25c57b523df9474bffc18f6017466727f24368d2cc3cf286d83ba95"
    },
    {
      "file": "balance/probe_nativescenepuzzles.ts",
      "sha256": "a81fb08163c95020e9b852604f1070f8c2255bc3904949682addcfbbb1572c6b"
    },
    {
      "file": "balance/probe_nativescenequests.ts",
      "sha256": "cf2ab893e1c04043db56c9b7da15a5ece32e46ace95328be835d8e685902c157"
    },
    {
      "file": "balance/probe_nativesceneruntimebirth.ts",
      "sha256": "b08a0a77e84fa92382c626cafc3381b9cab8358178365dc02571450594a353ae"
    },
    {
      "file": "balance/probe_nativesceneruntimeregistry.ts",
      "sha256": "4a3c5a4ba8ffef10ad1fbead44f79420b13da7f86239c45771c4be1cd560dbb5"
    },
    {
      "file": "balance/probe_nativescenesites.ts",
      "sha256": "ca4751a8a86c17947b27b8e3abc9373f0b95ff937c5b580db0854655c00d26b8"
    },
    {
      "file": "balance/probe_nativescenesky.ts",
      "sha256": "ee68f208c2c90d620b8c336f2c59e146e79b1adab2aef0c5b1bbddb23888a711"
    },
    {
      "file": "balance/probe_nativescenetheater.ts",
      "sha256": "176479575830e9809b1b90309e118fde10f92270b3f68ca994c218911de31f9f"
    },
    {
      "file": "balance/probe_nativescenetitans.ts",
      "sha256": "94255df3bc2dc45a81cf4ad92803a66f61f39410830c192d420b1726b43309f0"
    },
    {
      "file": "balance/probe_nativesettlementservices.ts",
      "sha256": "8100a3c3befa13bca152717b9880cedce9cadddaef4536d1e3b5bf613168e7c0"
    },
    {
      "file": "balance/probe_nativeshardentrylifetimesource.ts",
      "sha256": "f85f480b11d99cc146a0aa25d56f45fde876c9bcb7d52a6f8606064bbe79a0cf"
    },
    {
      "file": "balance/probe_nativeshardfoundationsource.ts",
      "sha256": "26776bb97e7fbf952adfc10e88d6afadf54b02c00e1796a14181bee4eb021c03"
    },
    {
      "file": "balance/probe_nativeshardframes.ts",
      "sha256": "4ceabc2b16006cabfeb58635377b662daa53c2659c8cda83cb1459b5234185b6"
    },
    {
      "file": "balance/probe_nativeshardhost.ts",
      "sha256": "925eff3a521d512119b9a0461d5c9ef67ce5385cd66a6356a3358a4246562f23"
    },
    {
      "file": "balance/probe_nativeshardhostbreaker.ts",
      "sha256": "2cfbd73aeda55e595c301e9894d6f78ab9191eef31c7a79f1196487f66681af9"
    },
    {
      "file": "balance/probe_nativeshardhostedboundaries.ts",
      "sha256": "8a86ca1e5bba8adbc287326b03167d8bfe686836e2d27cdaef092c9328d8a0e9"
    },
    {
      "file": "balance/probe_nativeshardhostkeeper.ts",
      "sha256": "524b898630fa14564f421552001062d4dfe9c15aa933413a5de96b25e1c9386f"
    },
    {
      "file": "balance/probe_nativeshardhostlifecycle.ts",
      "sha256": "2aea6ba8a4b7ce0699429b59baf083c28777de0983089f1141ebf3cc184cb1bf"
    },
    {
      "file": "balance/probe_nativeshardhostlisten.ts",
      "sha256": "5483eb305d39fac04b7886231d3fb9d67f27ea9137fc6ab6bbb4baa4eb48a32d"
    },
    {
      "file": "balance/probe_nativeshardhostsave.ts",
      "sha256": "1ba7d9e563cb5c53436abb48c8112288816da9d146564aecc4e9a38c900ef10e"
    },
    {
      "file": "balance/probe_nativeshardkeeper.ts",
      "sha256": "ae45e9260e0f423aac228f2bc2c5e02d274e91f2e535df2a04a9ea7cae471beb"
    },
    {
      "file": "balance/probe_nativeshardkeeperboundaries.ts",
      "sha256": "b8c3d2547c3c0af11084f906eb2cb8b2daf006484e5ec97270e2995a9110275a"
    },
    {
      "file": "balance/probe_nativeshardkeepercold.ts",
      "sha256": "e3dc5804fc4b3abba7afc6ab426dffb7497a1835147981676635d78b45b90f9e"
    },
    {
      "file": "balance/probe_nativeshardkeepercompositionsource.ts",
      "sha256": "e8eb9f32a0c1f80597f5cb13dc4a4601623048747f74f820c287226e391c429c"
    },
    {
      "file": "balance/probe_nativeshardkeeperselection.ts",
      "sha256": "9480abd823a039786a8b6b6767d5fdd2fad17f1b26918d553994222fa5b4801b"
    },
    {
      "file": "balance/probe_nativeshardkeepersource.ts",
      "sha256": "4492cc1266939ef9519b3e6f7b6ea825696dbfcf0892cbb7f0ffa14453176e12"
    },
    {
      "file": "balance/probe_nativeshardmuster.ts",
      "sha256": "4c161002c778e01f4f993359e17593a5bc9b9343fd50939a8c4f633c94014793"
    },
    {
      "file": "balance/probe_nativeshardmusterboundaries.ts",
      "sha256": "eded413b28098ea40680a433287f4c9e6f57f16bcd2fa649cd992f820ff2473f"
    },
    {
      "file": "balance/probe_nativeshardmusterlaws.ts",
      "sha256": "61346c2227382742fc9a9250f90651a284bf0ff4f9b50e8a708871e76cd9f4cf"
    },
    {
      "file": "balance/probe_nativeshardmusterlegacy.ts",
      "sha256": "9efea7b2055bcad34beae1524f393aef3c6a3879e349f444ae49f71d08a50b31"
    },
    {
      "file": "balance/probe_nativeshardmusterrealm.ts",
      "sha256": "cfd8134ffe30f080fa7211c75888b8a6fa817eb24f575839bfb1d32af6a5792d"
    },
    {
      "file": "balance/probe_nativeshardmustersource.ts",
      "sha256": "32ac6ee49bdf9d3d7cf2dde5a12a57c2ea86e27915a14a65d3024002b733a5a1"
    },
    {
      "file": "balance/probe_nativeshardnearscale.ts",
      "sha256": "486b0c73b00ee9a3416c0ce1749f034f6dda7dd3f14f1c99efb455237756d35a"
    },
    {
      "file": "balance/probe_nativeshardnearscaleselection.ts",
      "sha256": "01aaa3491a3c0589612a06126942d724ff85d76dfc7192cf4d765f82885ceec1"
    },
    {
      "file": "balance/probe_nativeshardnearscaleselectionsource.ts",
      "sha256": "352b443df5b220c5674eb165d6021d5db33b5ab7e83a229d785d97c86cb0200f"
    },
    {
      "file": "balance/probe_nativeshardnearscalesource.ts",
      "sha256": "f3f32203ba41f9462e24f956655a0047e720dc46d55956655d76c9067251174e"
    },
    {
      "file": "balance/probe_nativeshardpresentation.ts",
      "sha256": "4bf3e7abbbb67fd093382aaadae6605bba023b6abaae27fec08081a7f8717894"
    },
    {
      "file": "balance/probe_nativeshardpublication.ts",
      "sha256": "5821f88c3b2a7d10a0f76a77123693be67ef821adbe92e1eb8a945d5ed13bba9"
    },
    {
      "file": "balance/probe_nativeshardpublicationsource.ts",
      "sha256": "e094034a5484eda04a038fbea45b587b4a1a233a51ea1b16655013f234027246"
    },
    {
      "file": "balance/probe_nativeshardsave.ts",
      "sha256": "6c15ad1f9eac9c0c356510fcd6c1798be0b3d641d2a1f2cde01b21e060c34228"
    },
    {
      "file": "balance/probe_nativeshardscompositionsource.ts",
      "sha256": "c61ca7366c6abae530d517203d8047a7ec37c708ae55a86eb7f2ebe115fc9a0b"
    },
    {
      "file": "balance/probe_nativeshardseatboundaries.ts",
      "sha256": "ae720bc6f85604ed39f307d7def74c2dc9ce6fab6a0e864bcf81cdab965bc425"
    },
    {
      "file": "balance/probe_nativeshardseatcompositionsource.ts",
      "sha256": "f05d48a2ab38e1ffbf95193c67fa2c65a740f1808f1c479e3011a2f1268d7287"
    },
    {
      "file": "balance/probe_nativeshardseatprimitives.ts",
      "sha256": "9b3a0468ce77b82043a33f9c621b61fa8a613cbe17d0cb2833e11233ea90b767"
    },
    {
      "file": "balance/probe_nativeshardseats.ts",
      "sha256": "46f6a6ba784d3b549c0b60b3af32a4a9ac9ac5291d1d7106545c240eb59ab81c"
    },
    {
      "file": "balance/probe_nativeshardseatssource.ts",
      "sha256": "6239ecd453ce04cb5b7984dfad06ee093c996df583560e2fb84a393681a1079c"
    },
    {
      "file": "balance/probe_nativeshardslegacysource.ts",
      "sha256": "55d458c1182395f4a911688fa28f81943c03dec1dabda8d0c38b9b9eaa563bd1"
    },
    {
      "file": "balance/probe_nativeshardvesselcallbacks.ts",
      "sha256": "644bb7f2f04cf3dff8a768f1a9f41f2a4dfbbe575ca5f911827b3d45ea3c5a0d"
    },
    {
      "file": "balance/probe_nativeshardvesselcancellation.ts",
      "sha256": "de053a05c47a6149d866a3ef104979dfa1dbf9d4f6bfba33e2f1aa4c03b95617"
    },
    {
      "file": "balance/probe_nativeshardvesselcollections.ts",
      "sha256": "7ce965cac6d241bee4900803416b1c540d1a070d6f48f7f25e56cd5b1c36fb21"
    },
    {
      "file": "balance/probe_nativeshardvesseldeath.ts",
      "sha256": "a8e47b6495e10df01a4c10b6335e50ecef0ad7d916add68ea41bec2390e6218a"
    },
    {
      "file": "balance/probe_nativeshardvesselidentity.ts",
      "sha256": "e3296129376dcd8dabc499f0979a1f28bb1e47a48125bc484d0666ef7f84da7f"
    },
    {
      "file": "balance/probe_nativeshardvesseloracle.ts",
      "sha256": "c8ec6195f54e2df83b3286f913a77173787ecf7a574ea9fd4e0aef475fd9911f"
    },
    {
      "file": "balance/probe_nativeshardvesselthrong.ts",
      "sha256": "d589dee619294be9ae1c33ba319bcb875a3514a4c2153cea39e52292a22a1721"
    },
    {
      "file": "balance/probe_nativesidezonefurnish.ts",
      "sha256": "d5355c72b63d9fd2816638e6f2814011ec761f80a0bf7a4cfe47a82cbfee4105"
    },
    {
      "file": "balance/probe_nativesidezonefurnishactive.ts",
      "sha256": "49c0089cdd4ffb5313b3cd1ace0e4643aea85d8744d11b92adff8d335f3ebb86"
    },
    {
      "file": "balance/probe_nativesidezonefurnishcontinue.ts",
      "sha256": "580739a4802cfb71c64a3deda776eee175375c31787089ef45f4e3b46d77b00e"
    },
    {
      "file": "balance/probe_nativesidezonefurnishsource.ts",
      "sha256": "e678b0c709b9dbf22a0913506770a4cf8712af6a729f21d1c3fcae9b85c55ce8"
    },
    {
      "file": "balance/probe_nativesidezonefurnishstate.ts",
      "sha256": "4b35bfd4deb268562be4827618059c140e7d6f7c373e2a66640567eb5dd1aa0d"
    },
    {
      "file": "balance/probe_nativesight.ts",
      "sha256": "3d969b1df685b3bfe50f61066c47306e646e6be2b8dc68914ec937309f10b714"
    },
    {
      "file": "balance/probe_nativestatusrelay.ts",
      "sha256": "6cb75a98793c2177eb5155b751a423535d3bf5c459a5f411e662a0c86f7fde8c"
    },
    {
      "file": "balance/probe_nativestructureaccess.ts",
      "sha256": "57ec2e589de2cbcb86fe73cb918070176f4f9ceff628cba16fc84b8caf3452d9"
    },
    {
      "file": "balance/probe_nativesummonpreparation.ts",
      "sha256": "cd2cbb6667cc54c04b9620fbe5df13d2741db23cca574ff16059c03f41be8448"
    },
    {
      "file": "balance/probe_nativesummonpreparationasync.ts",
      "sha256": "26a9c6cec0d567564c2fe8f19fc156c95de8cfa7799925c54f29f4e6ef74ab51"
    },
    {
      "file": "balance/probe_nativesummonpreparationboundary.ts",
      "sha256": "50afdba7dc2bf5d155c7fc89347ab89ab4b6b8fa897833afb5ebbf2b97d6e0cc"
    },
    {
      "file": "balance/probe_nativesurfacearrivalorder.ts",
      "sha256": "11ce8e8adc001d9a717941b575b62a2dce960a96f8d4a0ac23773aebcbc478c6"
    },
    {
      "file": "balance/probe_nativesurfacearrivalordersource.ts",
      "sha256": "2dc23568bc65ce4100b22246cc6c24773fe8748ae0a1c9f4d6bd0d2dd991ea6f"
    },
    {
      "file": "balance/probe_nativesurfacearrivalsource.ts",
      "sha256": "7c61ebdeb303563c965df8dce7498ba9cdd83bcff9ec9a698170e2bcf666e31a"
    },
    {
      "file": "balance/probe_nativesurfacecompletedtext.ts",
      "sha256": "2345df71d3f73981db17bb06028becdc1933ab847fba40bfc763f9b5e0b34dba"
    },
    {
      "file": "balance/probe_nativetetherconstruction.ts",
      "sha256": "79a14db7a064cf66631beec3243d756b4790ad4755aac6b2a2d3837717bc8370"
    },
    {
      "file": "balance/probe_nativetitanattendance.ts",
      "sha256": "6ce294515b87c6f165b67bb63d9022af011cf959baa42b522cd971dee3d5f0e8"
    },
    {
      "file": "balance/probe_nativetitanattendancesource.ts",
      "sha256": "d9fc29c504d2ec0220524f13c2849b114eab5058decd892bf4ff2ea592154504"
    },
    {
      "file": "balance/probe_nativetitanreceiptsource.ts",
      "sha256": "f15111d67a11ad07b322cc07835be8682a121e8d420727f86d20c744b96f9b24"
    },
    {
      "file": "balance/probe_nativetownclientcomposition.ts",
      "sha256": "6692b45dd2828305a26d3fa13cfb2a56a8922c4c0d3277af14f7645487e6e53a"
    },
    {
      "file": "balance/probe_nativetownclientcompositionsource.ts",
      "sha256": "0de23650d50776ebf7d2865e7b947a7a6a3b23512f20009cffef4e88c2b5663f"
    },
    {
      "file": "balance/probe_nativetownconclusioncomposition.ts",
      "sha256": "dbe9bf285e9f8a0c20a2c1120abaeef775b2f86b32524fc68dab6dcd956e7ef6"
    },
    {
      "file": "balance/probe_nativetownconclusioncompositionsource.ts",
      "sha256": "d1382e69dba6a2be4f22b84c25350bd6318a9d53ce990f9228106e6867e10941"
    },
    {
      "file": "balance/probe_nativetownfreshfoldreview.ts",
      "sha256": "01b0b9f3443e828214ea347820cc6c5e5526d58b38d5d6e3fcf24f02a6b7a740"
    },
    {
      "file": "balance/probe_nativetownfreshfoldsource.ts",
      "sha256": "c33605de6b7049c94d035c7bf42144b8da8c8ddf247e6e92cf2d8751599e74d9"
    },
    {
      "file": "balance/probe_nativetownfreshfoldtiming.ts",
      "sha256": "d4766d942cc876f3613d39c017d2ce0cfeb9a0758ba8a6608c1e82444e2b52b3"
    },
    {
      "file": "balance/probe_nativetownlocalinput.ts",
      "sha256": "eb3418311cf9202dbd5ec24bf734ad9e037d9a8b25b4300392f98c0929c68e75"
    },
    {
      "file": "balance/probe_nativetownlocalinputsource.ts",
      "sha256": "7f98b306774678091685965be26b6b3e574bad770d17833cf4b71a90804469e2"
    },
    {
      "file": "balance/probe_nativetownstationboundaries.ts",
      "sha256": "a40d921b3c5dec9361ec7ce5683b12bcff613e51b0d84d3223ed057fc3509ed4"
    },
    {
      "file": "balance/probe_nativetownstations.ts",
      "sha256": "fb3de80a3a75b22bd8d32089dd1f80afc22789271b52f61358f7a722400d2565"
    },
    {
      "file": "balance/probe_nativetownstationsource.ts",
      "sha256": "b2027eefe74329b8b1a35d384331b267ae8b6b9f8f7e2d661b96ba3398e2c59a"
    },
    {
      "file": "balance/probe_nativetownunlock.ts",
      "sha256": "a16ed4bc3d58c43bd2d6a5ba9365d030f2e2f8b77f8c476d08f65a9bd32329ba"
    },
    {
      "file": "balance/probe_nativeuifinalseat.ts",
      "sha256": "ebd3c720fcb7ec9dcce428dfecb5e8d4c43702fcf5c0159c13a654e13bb3074f"
    },
    {
      "file": "balance/probe_nativeuipeertravel.ts",
      "sha256": "ca852bec67630a706b1d28757907070328858f7204836589ef229fdce34d4b44"
    },
    {
      "file": "balance/probe_nativeviewfinalactors.ts",
      "sha256": "9e287ecd6fd1f0681d7ee4b5f299e07a59a9416e934af0777b63662a92a6f0f5"
    },
    {
      "file": "balance/probe_nativeviewfinalseat.ts",
      "sha256": "8bd78c0c38763d430eca322b692298e0f9cb7d4cfa01f1e1406a7eb6dd6e5d8d"
    },
    {
      "file": "balance/probe_nativeviewseatidentity.ts",
      "sha256": "1634dc1b414ee2f132a67c1fbda2fa01bc195a2251dffa2c08d59ce1b2c082de"
    },
    {
      "file": "balance/probe_nativevoyagecastoff.ts",
      "sha256": "2ce2d07d52f1385871df777720c1acf839f08c96d51c22b6dc4f06571de6e0a1"
    },
    {
      "file": "balance/probe_nativevoyagedestination.ts",
      "sha256": "3cd5144f86b681a70f319cf738aed763ebdc5cec154ce7bc9013e30d4cdd62e5"
    },
    {
      "file": "balance/probe_nativevoyagejourney.ts",
      "sha256": "333730bea4d566436c083f71172a754e11f621ab7ad3e6132fae4a6b9431b02d"
    },
    {
      "file": "balance/probe_nativevoyagelifetime.ts",
      "sha256": "33ac9d03d6cece1fb8f778f1685762c5bee7338f6ed240a5952dba8aafb3441a"
    },
    {
      "file": "balance/probe_nativevoyageoracle.ts",
      "sha256": "6a2b583d8fc0b18346db5e4fc2baf133dd02110657b56a511e5132bd65085fa4"
    },
    {
      "file": "balance/probe_nativevoyagesource.ts",
      "sha256": "fd9969b40ead663c07f0dab2d45f09d5ee12b8f3fd60e79a8a4fb64308a6a824"
    },
    {
      "file": "balance/probe_nativevoyagewake.ts",
      "sha256": "f2955a44c568ba1a9e4609ee19ecc54fe43ddd3c71eb566b5c9a00da99d344d4"
    },
    {
      "file": "balance/probe_nativewarlordarrival.ts",
      "sha256": "50cff81b6021c1bd3e4faa5dd8e9cb39c8d751910230f15a90808e5b2c4da560"
    },
    {
      "file": "balance/probe_nativewarlordarrivalsource.ts",
      "sha256": "8f4016e26f096403c377b7a0dc4d1c17e38dbaa329873da6b2c82116008be476"
    },
    {
      "file": "balance/probe_nativewarlordboundaries.ts",
      "sha256": "a1f5dad84bbad558ca7934f067b2cc912b4d15c3c6c677330fb6192492d4d94b"
    },
    {
      "file": "balance/probe_nativewarlordcold.ts",
      "sha256": "b624cd490011ef22cc818a7e098842bbd84679dc62d22222cc63a173acc378c9"
    },
    {
      "file": "balance/probe_nativewarlordinitial.ts",
      "sha256": "4ff487fead9d433ea6529db184d8d9aebc673554c47858df9bb49f9c86deb80c"
    },
    {
      "file": "balance/probe_nativewarlordlifecycle.ts",
      "sha256": "daf1606e4ebb6f0617af5f8e11972bae03389bf46062ed921ea2cfaa8fa07d9a"
    },
    {
      "file": "balance/probe_nativezonemint.ts",
      "sha256": "3e29f2fb42e92cb4c6a54e9bad3824eb9f8dab5d1c45144a897f60c0dc57e37f"
    },
    {
      "file": "balance/probe_necromancercourts.ts",
      "sha256": "a45488f82c03d0a267589f46e5ee6a3d6e55726852c4ad7654988b7674cad575"
    },
    {
      "file": "balance/probe_necromancerrites.ts",
      "sha256": "b14c628c4a461ffd22116218a1f5b09b707b1c616f5da2a27ee7889c74dcbd99"
    },
    {
      "file": "balance/probe_necromancersacraments.ts",
      "sha256": "c910bb36eaf532c0ca61e6809cba2a664d70814f902ed887ff1a9f1de8cd56f7"
    },
    {
      "file": "balance/probe_necromancertrees.ts",
      "sha256": "4d4f50beaa3883f7029da8d8a1612e3e576929f6f4882e6fa3ba8276ac4a5bc6"
    },
    {
      "file": "balance/probe_nerverecovery.ts",
      "sha256": "fbb89f59a66350bc956e13d3fe2afef06ea599641ae25f5324dcbcb2e6113e60"
    },
    {
      "file": "balance/probe_nestednecromancer.ts",
      "sha256": "f457b8b8680a1b3cd65e48ddd41b6c07dce96d05445e3e3f01594c67d3bc6307"
    },
    {
      "file": "balance/probe_newsmove.ts",
      "sha256": "2591fcd055bb365b886018d75427dba1f80d01f4e80b17a2542d54e4d8e3d636"
    },
    {
      "file": "balance/probe_objectives.ts",
      "sha256": "8e50ee601826571223070705888630becc499ebe8f53f10e5e4ffda0084e5a77"
    },
    {
      "file": "balance/probe_occurrences.ts",
      "sha256": "0f05467238d5ec52c307e9231a4f457ebdfa74510bdd0d23b32aa9010a4f62c1"
    },
    {
      "file": "balance/probe_odyssey.ts",
      "sha256": "2cd1127e1235287417232697532540d9400602815fb0e1a77815acb57086dacc"
    },
    {
      "file": "balance/probe_odysseynights.ts",
      "sha256": "958ad667ca93f920fddc89e7db6a4d9f02c1ca2a4687e74ef720053e1506a976"
    },
    {
      "file": "balance/probe_oraclerefinement.ts",
      "sha256": "760e96d958e0999075a617164e6442fa61ad14de3a7256cee521775158932f7e"
    },
    {
      "file": "balance/probe_oraclerescue.ts",
      "sha256": "e347897dd23973592dd439f50aff3a7e03267fd694c27fb83f7daf42d85dabb6"
    },
    {
      "file": "balance/probe_orbgeneration.ts",
      "sha256": "882cc86ccdc1371aeea6954e586deaac005993ea40ef5b77751fd2cf9f9ffaf3"
    },
    {
      "file": "balance/probe_overdrive.ts",
      "sha256": "3bc9163af1ac3024687d62a0f6d1393f6ea446f3d63b990c5ee430ad4c0dc10a"
    },
    {
      "file": "balance/probe_pack.ts",
      "sha256": "54bbb90b96c1c2ebbd863aca84fb446c6e7c3c4a8a13e55361c9024c1aefee2d"
    },
    {
      "file": "balance/probe_packtempo.ts",
      "sha256": "fccbc63502e754a000b554751d598883e049c077bc17e83b15dd3ebd7410f9f2"
    },
    {
      "file": "balance/probe_pactsteelstartertrees.ts",
      "sha256": "54ad7b54c1f11a666e0935c921f4bdb41dfb78664f976ad96c768e8bd2d0aede"
    },
    {
      "file": "balance/probe_painterparams.ts",
      "sha256": "e1d0a2f2c7571de7909eae315ab7d9767c9c5372716d6940f14db46aa8b0ca3c"
    },
    {
      "file": "balance/probe_parry.ts",
      "sha256": "3994dde675171ce0ef3289f88b95642908151026382fe1d1a9a7eb3bb8c2a367"
    },
    {
      "file": "balance/probe_partylanding.ts",
      "sha256": "8c255b79c9bbd369c710d54ad1c026790cc32fa38cc2eb495f33affe49b0c783"
    },
    {
      "file": "balance/probe_passiveattributes.ts",
      "sha256": "e829aeb297ee520e21a99f50c48c07548186a2eabb72e9f2e65c7745853a5ea8"
    },
    {
      "file": "balance/probe_passivecrossroads.ts",
      "sha256": "8712da6bd60e68f650f4a5e89da1339b690f150ce5744ab5a6ef722921a49c72"
    },
    {
      "file": "balance/probe_passiveinvestment.ts",
      "sha256": "05016deff2339730f7e6b8433548b0cf5554dd5a340118c06972d38c8337ad6a"
    },
    {
      "file": "balance/probe_passiverefund.ts",
      "sha256": "0f701509def210b38fd67fe66163aafb35b0f08206149d03126c977c9e9797ab"
    },
    {
      "file": "balance/probe_passiveroutes.ts",
      "sha256": "120af7bc43c5c8e1f1abc5181e61bd6af4aa72588add820bdf9061e8e420a85b"
    },
    {
      "file": "balance/probe_passivespecializations.ts",
      "sha256": "bde898f6886cf071201bfcd916642ea06f8e5f9f558af07c0c3d8acb6d01892c"
    },
    {
      "file": "balance/probe_passiveweave.ts",
      "sha256": "94ca8a2905b4942c346d43b0914ac5a84479fe54bebd0cbcec0b7c2194b3a2dc"
    },
    {
      "file": "balance/probe_pathpref.ts",
      "sha256": "511440892af0a027b76f857bc5fc196651500bb112ea0a766650da8bd31fceca"
    },
    {
      "file": "balance/probe_payloadcues.ts",
      "sha256": "c29b8a97f2d0fd3dd868f12ee87758ed8c66b4854a6bc2205bc160a0c7c3c6b7"
    },
    {
      "file": "balance/probe_persistence.ts",
      "sha256": "b6ba74431b0794cd322fe98bc87f01db93f1980ac15ed30bbe51c88cd50d5c9e"
    },
    {
      "file": "balance/probe_pilgrimage.ts",
      "sha256": "2791c81d9a4bac868d779a36cbe6b261758fbe583b4ef14e9a709e3aa0f5e647"
    },
    {
      "file": "balance/probe_pitfall.ts",
      "sha256": "086f4dce369f4c25c3cf29bc3192a55a4e2688d32db2daa9c7cb66b9a9df0d9c"
    },
    {
      "file": "balance/probe_placedeterminism.ts",
      "sha256": "0d75171c362f35f39b7974130898ed832a60f4d8b785f179fa34c9f918a0ea08"
    },
    {
      "file": "balance/probe_playercastvisuals.ts",
      "sha256": "235492844bcb466cef80ab6d3532afd4182ee917a3b937e54dc8fb574169bc1d"
    },
    {
      "file": "balance/probe_playerdeath.ts",
      "sha256": "d8a05dc60cb78e17ee19c38b2ab769befe16e185d741fec8a0071f8b298ef231"
    },
    {
      "file": "balance/probe_plies.ts",
      "sha256": "bfb558cd86daa61bb6fd83f7f584721f21f24a63828d3bdf7d69f16b26cde266"
    },
    {
      "file": "balance/probe_portal_contract.ts",
      "sha256": "ea86222d51f97a801e0657fb660f11f6ba1c5f1b15844be61f7047a29279651f"
    },
    {
      "file": "balance/probe_possession.ts",
      "sha256": "83f06c1631d143b87349b4f2ceb3638feae1c5979346b7f1975388aaacf89e74"
    },
    {
      "file": "balance/probe_pours.ts",
      "sha256": "139122bfd4e856001ec2fe183afb217a6910f1895fc984bb4a9175cca206ae78"
    },
    {
      "file": "balance/probe_pourshape.ts",
      "sha256": "4c55e99464e9fbcde850026886097a7a63f08fbf2628a9a538ae354690a8ae3c"
    },
    {
      "file": "balance/probe_precisionstartertrees.ts",
      "sha256": "7a74ce7c8b83ce00dfc1eb3509b4c3e38d1d498c37d0fc05cc7eff4d24e80ee6"
    },
    {
      "file": "balance/probe_presencevisuals.ts",
      "sha256": "97d5e8de7e052a4fea6e81cea3c95e784175f2969b75c399ac5cdeb8574a3dd6"
    },
    {
      "file": "balance/probe_presentationdefaults.ts",
      "sha256": "ac08ffdb542acc87cc426cf2cad9c71ffa4e8a753720ccafd0b7c87e254f184c"
    },
    {
      "file": "balance/probe_proccues.ts",
      "sha256": "6dc4e62efff688e24fde2f511ccee3e3d88e9d0f345a550a3b00ccfe3d3516df"
    },
    {
      "file": "balance/probe_procreference.ts",
      "sha256": "21a8c25f6e1c5dc855500e485dcb918371027fdf8b94f2d4703245c263814ea4"
    },
    {
      "file": "balance/probe_projectilecull.ts",
      "sha256": "0b21f0498c393367cd4b6bdf0bcccf943a05ad5f529f346ee3cdc91fe59acb91"
    },
    {
      "file": "balance/probe_puzzlecalm.ts",
      "sha256": "b848761f71b07f5c96027449415ea1c5242c05cb0ac9ca4a33b0d2624723bd47"
    },
    {
      "file": "balance/probe_puzzles.ts",
      "sha256": "58341684610e5dc97dca5868504b5dd540db1ad031e7f752c890d08be2edaca6"
    },
    {
      "file": "balance/probe_questmap.ts",
      "sha256": "c2a6e89394d254ec07f78808f4004b61f46b0ad2ece927cba16c1c4ca5b2a9ca"
    },
    {
      "file": "balance/probe_quickening.ts",
      "sha256": "9e70020a7ec007afb0b85a476f7e7c61f4358f09185191e96c4309a8e512fef3"
    },
    {
      "file": "balance/probe_radiance.ts",
      "sha256": "852583a2220411a9eedbdfa96665eb7e34e84c4958474ef50c8e9dd4764312ed"
    },
    {
      "file": "balance/probe_rampage.ts",
      "sha256": "b563d814a317c9adfa55369244d36b44fc6392b5a1e51330ed1793f45bf8d0b7"
    },
    {
      "file": "balance/probe_reactiveuniques.ts",
      "sha256": "49f99a1321e1eca28d7dd2ab17c7eaf6cb8998657111604973f836f895a36605"
    },
    {
      "file": "balance/probe_readers.ts",
      "sha256": "50617d03fc567d06a03d8386de5a122d5714e561d09f140c9b81bbbd0607a070"
    },
    {
      "file": "balance/probe_reckoning.ts",
      "sha256": "fc713e84effac055fa3e54aed1a99cfe06c4234dc40c6277a3ec8601e085be5e"
    },
    {
      "file": "balance/probe_relicdeath.ts",
      "sha256": "01a693c7b9c9ea7d47f0956f3be21a9583f177fae9108785b0892bfe8c440951"
    },
    {
      "file": "balance/probe_relicflow.ts",
      "sha256": "f8b80a13fab3df3b52374978bf6940b0fe75e1058f8dca2998bb92f13a5697a9"
    },
    {
      "file": "balance/probe_relicuniques.ts",
      "sha256": "c952e270abb9c98f023bc383ca8b0bd73108b6cf876600ff5b3ff885203f4806"
    },
    {
      "file": "balance/probe_relief.ts",
      "sha256": "22c65ef7ae57af429b145aa85da7ba7f80c037b3d991b979f79ab9bceb2eb1bc"
    },
    {
      "file": "balance/probe_reliquary.ts",
      "sha256": "2ea56cb0b30e4678cbdd5faca3dc498c9a8a35c3801cb1549bdf09d2bc439439"
    },
    {
      "file": "balance/probe_reservecues.ts",
      "sha256": "302c6fae6e45830b8d5d32150d9cd43180a2039b061326c2f273ac36ec8ce7cc"
    },
    {
      "file": "balance/probe_resonatorstartertrees.ts",
      "sha256": "409a385b79370b46bb918a3324a717c49d5578bd4a86f3cdc9597869dec660b0"
    },
    {
      "file": "balance/probe_resourcevisuals.ts",
      "sha256": "fa3e9edb81833b56e9a3a8f9956bf2885728051ba980fd9b3c11556b1827322c"
    },
    {
      "file": "balance/probe_resurrection.ts",
      "sha256": "f5b01f53e9ff0b37b4493bec3ce8c96b96617447518406ff916e9be122f69605"
    },
    {
      "file": "balance/probe_revivering.ts",
      "sha256": "38ec5166fcf60b1a006a02128d9e5cc20bf75045b139873d4c6dfaefc1b1d52a"
    },
    {
      "file": "balance/probe_rewardlabels.ts",
      "sha256": "0044b11a26de2858961f3ee62936322f22fe2fc0ec5ae32a855952cb75e39af6"
    },
    {
      "file": "balance/probe_rootwild.ts",
      "sha256": "e2168beb53abdb2ffea89506b9665e1fa57ab525510d43042e8305a784a09364"
    },
    {
      "file": "balance/probe_runeweaverstartertrees.ts",
      "sha256": "2e8181f205fc4affce13090583931f75799ef1176abfe9963e380f954164c150"
    },
    {
      "file": "balance/probe_salvagemode.ts",
      "sha256": "3d1948c6307db49dabbe42cf4265b50da0bcab1467fe75591272f45c1d2da8b0"
    },
    {
      "file": "balance/probe_sandregent.ts",
      "sha256": "efe0c625a9ff1cb5152a3ed43355d8b5d9aa56a039b35de4f0414e9b5b28074a"
    },
    {
      "file": "balance/probe_satellites.ts",
      "sha256": "0c8cc80d4222f3b78c0547ef82cd69fa79bf195544bbd284f6798e5e8e5a715a"
    },
    {
      "file": "balance/probe_savecompatibility.ts",
      "sha256": "f582325b25dc75e899dfadb5f6f3e3bd5d597eba62177bcac7415229007009ea"
    },
    {
      "file": "balance/probe_scald.ts",
      "sha256": "65a36e4d27249d6b3ba71d5c63230856e8b40ba6e320d0a832931e365f874e9a"
    },
    {
      "file": "balance/probe_scaldkit.ts",
      "sha256": "0196a07c6c489944c8e92bdbcd4d31159c36664018bc314679c3438abe5b42cc"
    },
    {
      "file": "balance/probe_scenes.ts",
      "sha256": "148bee7b5c6a9b8e2c8df9362903d8b46d09c74acd08f5232d03c801961774c8"
    },
    {
      "file": "balance/probe_scorch.ts",
      "sha256": "328af17771661d17fc967a6a2f7964ebbc55221cefd2ece1d3505741f251e3b5"
    },
    {
      "file": "balance/probe_seas.ts",
      "sha256": "1fdbb0c57192fd7bff60ed2c271ab8f16dea3f14f9ba6fd00027045b85a4f55c"
    },
    {
      "file": "balance/probe_segments.ts",
      "sha256": "21e2d9d67b44249b793eb8faedc95d932350b5ede11799bd80f43842a05fa01a"
    },
    {
      "file": "balance/probe_selfvisuals.ts",
      "sha256": "583c43c9aa28adbfc4fb1aa002b26f6b8880cda692b9e070d54e88fdccdec7c8"
    },
    {
      "file": "balance/probe_settled.ts",
      "sha256": "c89a8fd6b467263f8539923a342e705a75adfc4caa8cb97d687b7887927cf91a"
    },
    {
      "file": "balance/probe_settlementdefenses.ts",
      "sha256": "c108a2ca32831a8e1a4d1f893f36a5d50e38f76204e5f33724cb8cde12794917"
    },
    {
      "file": "balance/probe_shadowarrival.ts",
      "sha256": "348d07c647ac9e494bf237148bf3f1328e1989fb6641cc0f591e7bab7c6e73ff"
    },
    {
      "file": "balance/probe_shard.ts",
      "sha256": "bbb0fb78551acc7444f40fbce29d3cfef573a08839f9c81ea3fab8d8838531e0"
    },
    {
      "file": "balance/probe_shardcharacter.ts",
      "sha256": "20eee3274f2a2b0da8d417722e07f574360909a4ded85083ba6a9afa973639e0"
    },
    {
      "file": "balance/probe_shardcounters.ts",
      "sha256": "70060d5456a3886a98fad00a29cc72c594fbf5ddb1b35346b8974919f140f948"
    },
    {
      "file": "balance/probe_shardcovenant.ts",
      "sha256": "1148f98c1cfbd9f7c3420bb7fb6701366ae028a1e201a8dde960c1b3fe490458"
    },
    {
      "file": "balance/probe_shardcrossing.ts",
      "sha256": "d753b587e28858b7997e2396935a7dd6830751d85a58bf90c5e0a216e99c173b"
    },
    {
      "file": "balance/probe_sharddiet.ts",
      "sha256": "d63fc24934aafa26bd74637998b1e23cfa6858e182a881ca5b4b5d9db48203c4"
    },
    {
      "file": "balance/probe_sharddoor.ts",
      "sha256": "cf5d0e0dbc1f77bb20d2cfac13639a97405611cbc5ed0ef25789ef5c27fd1027"
    },
    {
      "file": "balance/probe_sharddormant.ts",
      "sha256": "b0371cf5528eb784444bd9a7aed6fab58cd522642ff69f8994c7fcba3c013ce5"
    },
    {
      "file": "balance/probe_shardforesight.ts",
      "sha256": "467eb7aa97e615b460c024a98751774b2b44da5b4e26398b7918c3a1c74aee12"
    },
    {
      "file": "balance/probe_shardidentity.ts",
      "sha256": "09a5dce1a217c5d6dc76cfee3894adc7b09aff786f7162e61e3f5ec7e58dab06"
    },
    {
      "file": "balance/probe_shardimmortal.ts",
      "sha256": "1465a51c7df06999c6c9f263ca3287b6a0e5b6d0d17a02f266ddc03af913d7dd"
    },
    {
      "file": "balance/probe_shardinput.ts",
      "sha256": "c7ef17faf39e3bdd758e056bc2adfafde2210bafaa7ae15bd107ebc6e8acf921"
    },
    {
      "file": "balance/probe_shardparty.ts",
      "sha256": "81f17fa757740989ad9d0b6467512ba74b515d8aed6503125d433a44b3c53728"
    },
    {
      "file": "balance/probe_shardpartyreads.ts",
      "sha256": "768cf501ab94b97f041153a98531c8e7f29e38ece671d244144314ad2a8051a7"
    },
    {
      "file": "balance/probe_shardseat.ts",
      "sha256": "c5f65cde415d6364c71a5473637c437c433bee387e54ca37d6778f91bd73c448"
    },
    {
      "file": "balance/probe_shardshell.ts",
      "sha256": "603dfc138b38a88ada5565ba4a1bf1a136df01e276388538e84eb3afa9f6d373"
    },
    {
      "file": "balance/probe_shardslow.ts",
      "sha256": "13c1ba1c334156d0677b524e4af639860c1165a42eb43278144f37b82ea70aca"
    },
    {
      "file": "balance/probe_shardspoils.ts",
      "sha256": "aa95614df74599352cf68f789863a9eeb6645d8b707194887cb87d0e34b09b6e"
    },
    {
      "file": "balance/probe_shardunits.ts",
      "sha256": "8a8364b7b493fe9dc9d47cb6c3a273d4ad77a9cff01d6619fa6d08977bdfea3d"
    },
    {
      "file": "balance/probe_shardwire.ts",
      "sha256": "a9c2e414419a4eb010d26d057d785b241bcca3f609b102fdbc1b83739f0cf0ce"
    },
    {
      "file": "balance/probe_shardworkers.ts",
      "sha256": "e8d4691024fdf28926f8d712962ba4d27a8fc56f887d6aea7d320cb700f6a99c"
    },
    {
      "file": "balance/probe_sheet.ts",
      "sha256": "9bd525f21dcd01071b3a3cfe20c1280b65d956d6507f2f98971739312680e294"
    },
    {
      "file": "balance/probe_shieldup.ts",
      "sha256": "68379be89ebe61f2efcd2c6537aef44226ba10e1b6b129b3adb38779c0fe5aae"
    },
    {
      "file": "balance/probe_shimmy.ts",
      "sha256": "2c1661dbd30f5f8f5da6069c0828a4af0e080cc99321cf794972cd4c43431ec1"
    },
    {
      "file": "balance/probe_sightveil.ts",
      "sha256": "27fad254c33f8a3fdac7b66660547732c0673884acaf68db03db9ae74b5c6d30"
    },
    {
      "file": "balance/probe_skillempowerment.ts",
      "sha256": "ec0aa79e1b4f3e7d78e32667c073b19f9ebbedef872c7629133bad1264269f1f"
    },
    {
      "file": "balance/probe_skillflights.ts",
      "sha256": "a5ca2c26feb9d00d3d80163b26d33b85d967a46a2ec89c1e417547760faf6b07"
    },
    {
      "file": "balance/probe_skillicons.ts",
      "sha256": "4e8251242d03e00b4371c1fc71de119b26568014ab2d6a8f9e14c7ca559566f3"
    },
    {
      "file": "balance/probe_skillinputorder.ts",
      "sha256": "7041091035e3d25c9d3a96cf701665e59526360724718cd91477816b402138ee"
    },
    {
      "file": "balance/probe_skillitems.ts",
      "sha256": "5b0517e7c54c38e676c39509d43a130dd41d8749bbe362638b4a9ff34b0e27a4"
    },
    {
      "file": "balance/probe_skillmodes.ts",
      "sha256": "b73f78a2fdbb51ffcfe3af54a34201778c53968dc13704440f0a47ff581112e7"
    },
    {
      "file": "balance/probe_skillpreparation.ts",
      "sha256": "8d1f8db77cf105c45cad1956c0d3995dfa12192af7603c740c81028bb0f3fa4a"
    },
    {
      "file": "balance/probe_skillpreview.ts",
      "sha256": "bc9ab00b4571ab87092915a8079f470e15d0d60d471bc6d08753c567a7cca347"
    },
    {
      "file": "balance/probe_skillshowcase.ts",
      "sha256": "b44685cc9ca8fe917eb568d71a421f9fc61b3218d3b8086f9313b7da3d8f1979"
    },
    {
      "file": "balance/probe_skillvisuals.ts",
      "sha256": "10d72a13c153e4d44132d1fe05bbb0f20cbde6b54f314705de1d11bb0af7add4"
    },
    {
      "file": "balance/probe_slotgraft.ts",
      "sha256": "ace46a748d4a31b9be7a2b0a1ed02b294011692dc00e9d7bc20d2e6750894968"
    },
    {
      "file": "balance/probe_soulriver.ts",
      "sha256": "855aafbb93eb879f07236e1377d3ecdb7cbd0d56263a50013097d40291a13018"
    },
    {
      "file": "balance/probe_speech.ts",
      "sha256": "3a1796b771f37728ac90322cdc474dedc05adde737a2c0fdc44b9c09151f148e"
    },
    {
      "file": "balance/probe_speechapproach.ts",
      "sha256": "0a62a72d5632e578810a553136cf0af5068d383480bc8cf2334109ae4e502861"
    },
    {
      "file": "balance/probe_speechgrammar.ts",
      "sha256": "abb0bc256288bbd73debacac9eee7deee2f0a8ac55d262ebd34df36e80f8e828"
    },
    {
      "file": "balance/probe_spent.ts",
      "sha256": "fd0fcb6dea2c7430db748100f667d517566ea55cab121d508c29e802d071d191"
    },
    {
      "file": "balance/probe_spiritrun.ts",
      "sha256": "90523861adf04891d3e85a42fb9991cf6a998daf410143e2fc8104e845e1c279"
    },
    {
      "file": "balance/probe_spoils.ts",
      "sha256": "29e092df976bfde042a4e738a42b69fcb9f4b944fc1653ad86fb10ea2c775f4b"
    },
    {
      "file": "balance/probe_squish.ts",
      "sha256": "c3b0c903913345d4123ccc4487bcd0b7d5edb0b9303236f80ed9fc0b76ae8d28"
    },
    {
      "file": "balance/probe_stalkercommitment.ts",
      "sha256": "692012de7303c36efb3f15975ffb9c2efbaaaf5049f90708ae44d2c8fb840294"
    },
    {
      "file": "balance/probe_startertrees.ts",
      "sha256": "afcf83c1fe612912aa95c04945a0ccbb688c041ced09d1977af6541f79ccfd8b"
    },
    {
      "file": "balance/probe_stash.ts",
      "sha256": "30661fc3ee1ba09c199678932c08f98729d05fbdd4101d1bfcdc11f6c160c5ba"
    },
    {
      "file": "balance/probe_statusicons.ts",
      "sha256": "862f5dcc59382319924cddffb1ac4926bfc3830207dc323abcb4541422aaf390"
    },
    {
      "file": "balance/probe_statusreadout.ts",
      "sha256": "02473dc359b9c8bbd28c2ff91f3f009e25b56fc6b5fe85a1baa9ffefc0aa7e92"
    },
    {
      "file": "balance/probe_statusvoice.ts",
      "sha256": "09b498d63ff56e7b56144872ba5559725f78e213b4edcb8aaec16d47d61ddb10"
    },
    {
      "file": "balance/probe_stealth.ts",
      "sha256": "e77efc9efc393785d65627930f07937a1ffef83da0454b96c9269159eb87ff82"
    },
    {
      "file": "balance/probe_storedsupports.ts",
      "sha256": "ce0ad667046bc17eb9be2670b4bb167261ecb6ebbc37b1811ea166dd8d7d9c64"
    },
    {
      "file": "balance/probe_storey.ts",
      "sha256": "c7612f9cde11ddbbdd44f5e73f365d1acd9ff503aca05c02804c30aaa28e6d36"
    },
    {
      "file": "balance/probe_strata.ts",
      "sha256": "6dad1e22137e780f5da8ae69f72014a7056b94edf2210d3d61fc5527bbc15c44"
    },
    {
      "file": "balance/probe_straying.ts",
      "sha256": "d71dc853aacdbf7cde16827f3b2080efd12ce9e84e7236f007e9ceee660683c8"
    },
    {
      "file": "balance/probe_strikevisuals.ts",
      "sha256": "8c961802c3e6e90e58053423e4087233446cba1ad61c10074bc9b21e90f3d643"
    },
    {
      "file": "balance/probe_summonfill.ts",
      "sha256": "2f437d88b0b3508de9a6c20f2a0948e1cb924e1b9231a0a919be6ca76e0bb4b5"
    },
    {
      "file": "balance/probe_supportbase.ts",
      "sha256": "0ddcc3b052bdbacbc64cbc8d78fb705fc535357c3a0514534bcf502f2d0e0767"
    },
    {
      "file": "balance/probe_supportfabric.ts",
      "sha256": "9e6006ac37e662401a2520793715d3f1388ebd612a1d674eb2a77e57fa3cf68d"
    },
    {
      "file": "balance/probe_supportmatrix.ts",
      "sha256": "ec875573fbb3b182389ab4f78bbc9e20e4794098e798c4a2d16ce94b392ae651"
    },
    {
      "file": "balance/probe_surge.ts",
      "sha256": "644e017dcac717a0f9d1fd1048571cb729c33cb5ee4168e61fd6c8612cbcb796"
    },
    {
      "file": "balance/probe_swarm.ts",
      "sha256": "02d0b4954dc4e403d0fefee0f65728cb31fb0208ffe78210110c8c21a45c48d3"
    },
    {
      "file": "balance/probe_sympathy.ts",
      "sha256": "6aac98e713a02e0965f3bef152e582b97b9903c76d7c04720a62802e9b14c58a"
    },
    {
      "file": "balance/probe_tacticalai.ts",
      "sha256": "6f74672fcb2abcab4fc371eee9f0d4b5844a1e0729203aa133c7eba317621b34"
    },
    {
      "file": "balance/probe_tacticprogression.ts",
      "sha256": "2e5ae4898a46f15f4ad27872484968856974516719dc15b18be3b7e70f2d6e2d"
    },
    {
      "file": "balance/probe_talents.ts",
      "sha256": "dc143552607de736339c61f27e4c8a160f6f4ade6d57c0c76f4284835be5dd43"
    },
    {
      "file": "balance/probe_tamebeast.ts",
      "sha256": "3c326e3e0461dd5d32137fd2099913ae311f701806b93c7dd646ca45b8bf2059"
    },
    {
      "file": "balance/probe_targetstrike.ts",
      "sha256": "03cefd07bcc558d7364a43869565c58e396d3b5779f9c391c37bf18d7b88f701"
    },
    {
      "file": "balance/probe_targetvisuals.ts",
      "sha256": "168b71ca450fa5185b38d0fa7191a7544bfd2975dd7c9c623bdce15044deabe8"
    },
    {
      "file": "balance/probe_tells.ts",
      "sha256": "7640b1e77cad7dbf8c90605caa4faa275300720fae406783844d8b465263dc17"
    },
    {
      "file": "balance/probe_tetherecology.ts",
      "sha256": "6d174cbe1d158d9e74d220f159013ca276098142c5a3938e70450ee48a998f7c"
    },
    {
      "file": "balance/probe_theater.ts",
      "sha256": "55098f38190e04f9cbc0f62354e232ec7c7e40b0d1b43a0e303b1bcea9a40a75"
    },
    {
      "file": "balance/probe_throng.ts",
      "sha256": "933b12127bb47a38dd265c5fc8e3f408d1ad3de728defcb31dd6b30dd5331a0f"
    },
    {
      "file": "balance/probe_throngcombat.ts",
      "sha256": "0ae8603273982146e5265e32fb4d3bbaf9e455a9fc251105a213439581f464f1"
    },
    {
      "file": "balance/probe_tiers.ts",
      "sha256": "d049895135edd19715b374c472e708979d3219f5222b748666c3588b51cd8e94"
    },
    {
      "file": "balance/probe_tilesetchoice.ts",
      "sha256": "c3953403fb235c99a8e2c8ab3a2098e9dea2169d52fac8f4e78e0e3106082b54"
    },
    {
      "file": "balance/probe_timeflow.ts",
      "sha256": "2b520a02f69c8dfc2d98226259797adb17f8fe508674dede12e27db57781c922"
    },
    {
      "file": "balance/probe_titans.ts",
      "sha256": "96fd13d88360a0135c97a5319395157cddd70213946b05de99335cac32fb6a9e"
    },
    {
      "file": "balance/probe_tollspill.ts",
      "sha256": "5da12f3e0eba1d1a63e4b442357949e1c381eda5de8a7505795f8b962f18f771"
    },
    {
      "file": "balance/probe_townexits.ts",
      "sha256": "f0a113131e3215102dbb20cb0cf1a64d2bf74004fc27ba9cc1e3d82de32855a7"
    },
    {
      "file": "balance/probe_towngrowth.ts",
      "sha256": "4e3da1e8ba44952e371dcef58046c2b6687af1a6a27834856896af2dec729ba8"
    },
    {
      "file": "balance/probe_townportal.ts",
      "sha256": "651a4d810c8a5a3a30201f224ba7af0f1f50fbcc3254f5f0771bc7b73f6fafca"
    },
    {
      "file": "balance/probe_townwelcome.ts",
      "sha256": "5d25303f9eac4ba9a4dd19948c2a7d10f61cef570488d39e2e9876c5744eab39"
    },
    {
      "file": "balance/probe_trace.ts",
      "sha256": "6371ec393047a6b5d5f6e1dcb521b2254cf5cd25fd0b1818abff701d404aa450"
    },
    {
      "file": "balance/probe_tracks.ts",
      "sha256": "fe1e18a8e327c969e0d8d973728b40f871c24cbbe55cf2455b27eed4b4250244"
    },
    {
      "file": "balance/probe_transience.ts",
      "sha256": "446a1c0d2c4f0e7d01894a8e1128c9114cf4401c9c9169979da00db47fb9821b"
    },
    {
      "file": "balance/probe_trapworks.ts",
      "sha256": "920568ee198c41f41de97ee49ed81527b38c9d0e9adc58370e315111a2bbc59f"
    },
    {
      "file": "balance/probe_typingguard.ts",
      "sha256": "ef5a3fe4301752d92e6038cfb741bd3a509e433c09cf64f820f8a409a862e811"
    },
    {
      "file": "balance/probe_ugspan.ts",
      "sha256": "4926f99bcdf1e14d53871e3b50eabb3511f35f7cbdb0e8199e6c417dcc185bee"
    },
    {
      "file": "balance/probe_uiactiondismissreview.ts",
      "sha256": "4f9b370ea82455824840f839254a574033219766817725fbeae2e1b126801797"
    },
    {
      "file": "balance/probe_uiactionreceiverreview.ts",
      "sha256": "7b0348eaa17a4b8169a0b1d241232c18df1913b63193a7a83f983f2c58313313"
    },
    {
      "file": "balance/probe_uiactionremotedismissreview.ts",
      "sha256": "c987e6c74123d47ef6a19fa2a2b92ed001e4e35ce008a04d698c087df472f19a"
    },
    {
      "file": "balance/probe_ultimates.ts",
      "sha256": "3c424f5692d69e361a3578cf26d56872e743a26f68477727b28852ed90370d1e"
    },
    {
      "file": "balance/probe_uniqueaccords.ts",
      "sha256": "81ea9d06fbb6d1330d2fb93cd2a44227bd2107983fe7a35bd48a82ee1896e31b"
    },
    {
      "file": "balance/probe_unlocks.ts",
      "sha256": "7db45ce272948b1009855ad54a00f92ee2065270be9b90155c8f62c102d70436"
    },
    {
      "file": "balance/probe_vendorinvestment.ts",
      "sha256": "9399129120cc11a5e79366cd0ed33472e086d96b3def0c6b23aadb7ca5b29d29"
    },
    {
      "file": "balance/probe_vendorlocker.ts",
      "sha256": "7d3f792661dc98905347f7937fb1956fa0d6d5cba2e590b86ba32a27ee405b8e"
    },
    {
      "file": "balance/probe_visibility_stability.ts",
      "sha256": "a73637188513d113b4a17f793414a4e201b17d0668844935120f95b37c44d9c9"
    },
    {
      "file": "balance/probe_visualcues.ts",
      "sha256": "be6cb0b317b406cc493d573014ed904f95883a2ad93105dfa2d15b1688d7a75f"
    },
    {
      "file": "balance/probe_voidframe.ts",
      "sha256": "cb04c9586e63a1f5fbec34c668b2089be64bf9beeae14aa036373c6c305057d1"
    },
    {
      "file": "balance/probe_wakeflame.ts",
      "sha256": "0ed7c7fb7d0c797c044aac398c2263a003693b5d5614d7a11b58c36dc851f526"
    },
    {
      "file": "balance/probe_wallpress.ts",
      "sha256": "b2b8ddd5613d3ebe5d5153c678577f3f65f4d79902d18937acea66185b40559d"
    },
    {
      "file": "balance/probe_wardenbalance.ts",
      "sha256": "64d96a782d61e3647c52b0e0092102bbe23156b8a67418d9e021147174d17ae1"
    },
    {
      "file": "balance/probe_warfront.ts",
      "sha256": "02ada89354777088be13855edfdb2e1de6db4a7034d1020258071c0e92aae067"
    },
    {
      "file": "balance/probe_warningcues.ts",
      "sha256": "0c2717c0b1d8ab6713420ff7b3ea1d74cee835ba5876c089179f6543f4d7359a"
    },
    {
      "file": "balance/probe_watchers.ts",
      "sha256": "742aee3ba78d4cb3ae2b471056e136272b068c4c4b98dc85abdecc42e8070eaa"
    },
    {
      "file": "balance/probe_watersurface.ts",
      "sha256": "17ca5a4c6b818db787e2bc67574ee5cc31de990e15e7d6f01e6ff77fb8672a72"
    },
    {
      "file": "balance/probe_webperf.ts",
      "sha256": "1ecf2d4dfc4ff8a8d8d68c9140dbdb176de6ad530b86ca6d1f49d2af2fbf6271"
    },
    {
      "file": "balance/probe_webqa.ts",
      "sha256": "b0a130338542544ad9ea768d8294e3350fef601b0c6fee10c703c9b0666c1636"
    },
    {
      "file": "balance/probe_websiteportraits.ts",
      "sha256": "431e02dcad358d77a68eeb959361d105df9e395b17a5808d542ae92025308a14"
    },
    {
      "file": "balance/probe_wisplight.ts",
      "sha256": "a8e0034bfbea83b1f4e644401118fc2b80289c23fedce983e61aaf9733aba265"
    },
    {
      "file": "balance/probe_workshop.ts",
      "sha256": "db9a4179df8403fa7033b89c5bff4d5a5fb620e60db46182dca2a8ee61fe00e3"
    },
    {
      "file": "balance/probe_worldbossloot.ts",
      "sha256": "b1d6917c17863cd588cc1e5b2f462dc9e828d8a78e7a0343e2208519369eba7e"
    },
    {
      "file": "balance/probe_worldbossspectacle.ts",
      "sha256": "d9cf2bd8c4f606cbd3e6908c0bb3c46395ae0983481bd88a3a77b2216c760b3b"
    },
    {
      "file": "balance/probe_worldmass.ts",
      "sha256": "4ede392b61f38b8ac8a01e6ffba61af16945e9a6fa77292e87b260797cc9fe53"
    },
    {
      "file": "balance/probe_worldmass_accord.ts",
      "sha256": "9cf810d76772ddf4df5276d8616dc10b78db04192a09fab8260b4d9d8dd9c50f"
    },
    {
      "file": "balance/probe_worldmass_activityresidency.ts",
      "sha256": "cd6df4088c34b01ce4095315a3c427d6100362649cdad0735c2d3bd5d7786c46"
    },
    {
      "file": "balance/probe_worldmass_beaconcontinuity.ts",
      "sha256": "c8e274cbd9f02039289201532076770bcc0924ca44ba4afca13b38d860a0cec1"
    },
    {
      "file": "balance/probe_worldmass_beacons.ts",
      "sha256": "f7d3b330b607dc0f68438ed80f7bdd15d25b7ea57a89ecd8b6dc201c70a64dc5"
    },
    {
      "file": "balance/probe_worldmass_birth.ts",
      "sha256": "9691f522fe6a987c21d774456d9a742d549a4c16342b317c20b880786f0ebbe8"
    },
    {
      "file": "balance/probe_worldmass_bounties.ts",
      "sha256": "ba49ef8c7dbd353e969dad01914c94283f964e69ae1b51c70b5e32a5b019fc12"
    },
    {
      "file": "balance/probe_worldmass_bountycharacters.ts",
      "sha256": "37c0c968b07676bf17163fc4b789d190a98feda5b3d9e3e938cc74001d0dbc15"
    },
    {
      "file": "balance/probe_worldmass_brittleparity.ts",
      "sha256": "3a540679c6a125e8a771b4a3f2022b4abb9d7912782c8a1653613aa91379a640"
    },
    {
      "file": "balance/probe_worldmass_cacheopening.ts",
      "sha256": "690bceab5e4bd5468b10c678a76501e448057b680be730aa8eb88439e47644bf"
    },
    {
      "file": "balance/probe_worldmass_caravan.ts",
      "sha256": "f3f8d097c6db79c93ee3caece52065e5ba3d31d586c11ec4803a3f071fe44293"
    },
    {
      "file": "balance/probe_worldmass_cavestratum.ts",
      "sha256": "5c7b0d93c6949dbe9f06b4413770c9820599b21db26816641676d8631795037b"
    },
    {
      "file": "balance/probe_worldmass_checkpoint.ts",
      "sha256": "8909ca44245ad7cf0b6124d1d1676fbfdcd1927f9d68eb5385032d1123e3b621"
    },
    {
      "file": "balance/probe_worldmass_clearance.ts",
      "sha256": "01afedb9e41885d1a0c466f922ab4aa4684bc93bf6ad8f5360f47459d2e98b9c"
    },
    {
      "file": "balance/probe_worldmass_climate.ts",
      "sha256": "0d90ed3c89baf2a117388fa878f4d8356909afd201b72c811878c7b7274cd9ef"
    },
    {
      "file": "balance/probe_worldmass_cohorts.ts",
      "sha256": "e000e99c33467ee63f630cd0740aba5f5bac90cf0aa99bf3e031e03dd54d6b1b"
    },
    {
      "file": "balance/probe_worldmass_courtcontinuity.ts",
      "sha256": "4a76590488247cfc6c4cc97fc0aac23d01c63803079f99d205bd8016136184aa"
    },
    {
      "file": "balance/probe_worldmass_courtpuzzles.ts",
      "sha256": "f07ec21cf03affdf0760128e44841e7be7013fb08248b590af047ad315747ce7"
    },
    {
      "file": "balance/probe_worldmass_dirtyterrain.ts",
      "sha256": "6c388070e76085c6282cba54c57b01f5b11104f151149813b09315fa7971fd70"
    },
    {
      "file": "balance/probe_worldmass_doorplans.ts",
      "sha256": "d293cba31e81f7929f01a2a5e5c8f93dfb1019c515ca9ee5acfc5fc09e373379"
    },
    {
      "file": "balance/probe_worldmass_dormancy.ts",
      "sha256": "e382146c1adaca1b5a2d26a40d4e6c470ba4180d72f49138752deb2e48fd022f"
    },
    {
      "file": "balance/probe_worldmass_dormancypinattribution.ts",
      "sha256": "cab52bb9bac9732019b24cec7bfb09da6c12dfbc55b5bf686d78bc1d9f6510df"
    },
    {
      "file": "balance/probe_worldmass_embers.ts",
      "sha256": "59d304ece124c39e91cb64e9bde1aac9a3355098876066ebd21825612e7c0d99"
    },
    {
      "file": "balance/probe_worldmass_engine.ts",
      "sha256": "0e2f7ebc52bdc897c7eba286fb8e8bc1b1c352831efb68c98362276e52e77132"
    },
    {
      "file": "balance/probe_worldmass_exploration.ts",
      "sha256": "9e3b3fe89c196729879a08dc54792cc46f76652f046e3bee2f777cc60d5b98ec"
    },
    {
      "file": "balance/probe_worldmass_extensions.ts",
      "sha256": "e4cd11abf87a1e5b8bfd018a5759b93e0c2ad3b14bc3a3884063113cbba45119"
    },
    {
      "file": "balance/probe_worldmass_fieldresidency.ts",
      "sha256": "43f50cf9ddaf7a449678dcd61b440b62727df37887d6fdbb7dd5acd0cc6a25e3"
    },
    {
      "file": "balance/probe_worldmass_fields.ts",
      "sha256": "cf73e7cf4c42c8d827f3a5f789b232dcf271b5c983557a1382a0f036e7ce7b67"
    },
    {
      "file": "balance/probe_worldmass_floorwork.ts",
      "sha256": "993ae1330c553d0c27e7b35c57ffa2d57c88e9e348aa01a5862d4d4d3dd3e4dc"
    },
    {
      "file": "balance/probe_worldmass_foci.ts",
      "sha256": "36b42ca5d18e0607643a3488a8f7a5cab6213563890151a17080c62bfee64cab"
    },
    {
      "file": "balance/probe_worldmass_foragers.ts",
      "sha256": "a617d19b9e0f42e39021a364c123c5e2c98d0d636a401f63c8aea3e356bb55b9"
    },
    {
      "file": "balance/probe_worldmass_formations.ts",
      "sha256": "2d983c6953f0312ea86f6701394e19782e83ba02c25529d57950a597254a3477"
    },
    {
      "file": "balance/probe_worldmass_garrisonnames.ts",
      "sha256": "b773c4965d70eff28385d8035104503c91cc8af4e73b50fa22b69bfcdceffcf3"
    },
    {
      "file": "balance/probe_worldmass_geographicacceptance.ts",
      "sha256": "5dbf7043e963060cbca6fda37bfcd1be5eba8055cad6aa4a3596391e74013cd2"
    },
    {
      "file": "balance/probe_worldmass_geographicaccess.ts",
      "sha256": "be113bf8ba6411d5e1dafe9411013d3a7c60a030d121626458e6b1b20df94c2e"
    },
    {
      "file": "balance/probe_worldmass_geographicworker.ts",
      "sha256": "79ce2c838e4969660e0c76eab83401c6a7d091e2a66ef54f6b53fbd49ae3ccea"
    },
    {
      "file": "balance/probe_worldmass_ground.ts",
      "sha256": "057d5d6a860f606e7ca61c444bf298ccef98459128d8388a2a51d6e2510d089f"
    },
    {
      "file": "balance/probe_worldmass_haven.ts",
      "sha256": "cf551d5327cceb98aad5fcb87bf5f7be8da2994d99ecccbbc3610162d6f84f08"
    },
    {
      "file": "balance/probe_worldmass_hierarchy.ts",
      "sha256": "789450462114e7b8423f8d4752155827936c232fb9e2279fbd102dcaea956ad3"
    },
    {
      "file": "balance/probe_worldmass_hierarchyidentity.ts",
      "sha256": "9c5938676819fda62e51627eb09fedd1bcea4539771d46ec2c4ea90dcb66e537"
    },
    {
      "file": "balance/probe_worldmass_holdfamilies.ts",
      "sha256": "d2fb2d29696b156272ee1fdd6110b7907b103c1e8b556f9c50af05b8e093aebc"
    },
    {
      "file": "balance/probe_worldmass_journey.ts",
      "sha256": "0dbb0d6d2bb91469b989188e836dbf847e80dd725ca0590cdd4f995f582a8e4b"
    },
    {
      "file": "balance/probe_worldmass_landformdressing.ts",
      "sha256": "4536a2a3461486ab5bbee8641667b4e625f98b6b7745e71ac86da74a183dfbd3"
    },
    {
      "file": "balance/probe_worldmass_landformhabitats.ts",
      "sha256": "d38a9e2a2e3c99ac5e1ca4fd5c268af43138df7f1db5a5be2a5d4da3a19acce1"
    },
    {
      "file": "balance/probe_worldmass_landformintegrity.ts",
      "sha256": "310c8f728762c3bd11bda1605d2b10cf5e815084e997ecba379f03c1980bd6dd"
    },
    {
      "file": "balance/probe_worldmass_landforms.ts",
      "sha256": "34ebb2b686c33f451fef98ca5333aa0806692a19ae20be20c2243a795b2676a7"
    },
    {
      "file": "balance/probe_worldmass_localcues.ts",
      "sha256": "5c44b94dc053a31cd3853c85d0d2db06589f250db0d5e56386781bfc67b41f58"
    },
    {
      "file": "balance/probe_worldmass_maplabels.ts",
      "sha256": "8177aa19024a30e655ff4cec4aa62c576c2cecaea43f11f2818fc3a25828db9d"
    },
    {
      "file": "balance/probe_worldmass_nativeareaambient.ts",
      "sha256": "f7a3def25eb4a3b8285c9e503ad04b662d0e30c41563ff23cc9fdebb95fc04bf"
    },
    {
      "file": "balance/probe_worldmass_nativeareacompiler.ts",
      "sha256": "a5206f45bf6f43ce3efbf11f5c2945f5d87be72b4b7717338198945118dc8ee3"
    },
    {
      "file": "balance/probe_worldmass_nativeareageneration.ts",
      "sha256": "9ab3bcf3840529ec2f41388b4ce2dff88243bf584a190c09b2ae7a87cb7da27d"
    },
    {
      "file": "balance/probe_worldmass_nativeareageometry.ts",
      "sha256": "d34075267307953f94cdd98955368918dbd6757bfd379474e25bfe1c9efdb12e"
    },
    {
      "file": "balance/probe_worldmass_nativearealocal.ts",
      "sha256": "4b8872d3f57b6716b0463a1721bdb00428a85986a77f8d21408023f25c8973fd"
    },
    {
      "file": "balance/probe_worldmass_nativearearandom.ts",
      "sha256": "c0c716c383c281c4874af5c6f8eb93a1cdf7f2b21f8c8893dd8e3db25a939596"
    },
    {
      "file": "balance/probe_worldmass_nativearearoutes.ts",
      "sha256": "6287dc8ce2aa9960e0a88f0bac22ee4855807b2267a92ad2af7b852797079922"
    },
    {
      "file": "balance/probe_worldmass_nativeareaseams.ts",
      "sha256": "ce3d3bb840c87caac70004ac29865e4f03f92296ab40b465e46b8f6d2c963803"
    },
    {
      "file": "balance/probe_worldmass_nativebrittles.ts",
      "sha256": "08139f50e1144363319ac54cf144ba533b3b03eb9fa18a0b3a46c3bd0e0c5726"
    },
    {
      "file": "balance/probe_worldmass_nativebrittlesources.ts",
      "sha256": "c36b55e2df2c9621fab638c71bbdfcb1352c0dc359a3a3fb19e6d17f1788edf6"
    },
    {
      "file": "balance/probe_worldmass_nativecountry.ts",
      "sha256": "8f8b4a7fcb8690b3920b3311e1f7300bff829ca477bc1a1fed53178ae550c9c2"
    },
    {
      "file": "balance/probe_worldmass_nativeeffects.ts",
      "sha256": "e6b0ab561de606f9986b1bd9249bbad23407d65b045d12a141b9cd48f17a4030"
    },
    {
      "file": "balance/probe_worldmass_nativefeatures.ts",
      "sha256": "dbb52e2025e96c63edc78f18ebf946f409e1a89519f205d2ab84e3231f2336a7"
    },
    {
      "file": "balance/probe_worldmass_nativegeneration.ts",
      "sha256": "d4b681bed5ea67632425ba94a4eae49539e2b5ace3b874731b7daff5029211b4"
    },
    {
      "file": "balance/probe_worldmass_nativegeography.ts",
      "sha256": "bf79a031ce4924312064f42eca296734681eb2b5601aae04970de820e70e1d03"
    },
    {
      "file": "balance/probe_worldmass_nativehost.ts",
      "sha256": "3b44e2b1ea818ec1569b4f8442fa57feb7b7ee29ad3cdd2499a8d70a11f1db57"
    },
    {
      "file": "balance/probe_worldmass_nativeingress.ts",
      "sha256": "473fe8759a3315256b53783c4a7c6012b69e1765771134186b532eb508bfed52"
    },
    {
      "file": "balance/probe_worldmass_nativematerials.ts",
      "sha256": "d0253fbb4523870fe20bff705c3414496bd34e4e41126db6dc6611ee4c9eef5a"
    },
    {
      "file": "balance/probe_worldmass_nativeobstaclecache.ts",
      "sha256": "e8e90cce9bc6fd1c82112467267e8e5ba7a346ed9d4d5bdddd63b768d01dfcb4"
    },
    {
      "file": "balance/probe_worldmass_nativepaging.ts",
      "sha256": "41c68a5ea3cec903da22c1b8b258053cdd08becf772f1347f719ece9635affab"
    },
    {
      "file": "balance/probe_worldmass_nativeregional.ts",
      "sha256": "f02aa07e9e843d7a724a0eb6261ab122a7720870f81542c0132f13ab5b90abed"
    },
    {
      "file": "balance/probe_worldmass_nativeresidency.ts",
      "sha256": "08d1aaa4b426c68a356b5b14769328a2e7c31ce4d5161ec84f77e7f86b104ac7"
    },
    {
      "file": "balance/probe_worldmass_nativeresume.ts",
      "sha256": "012d0debab40b5c981210972637fe10ce3f8a48997a33c9f11c2388ea711b01f"
    },
    {
      "file": "balance/probe_worldmass_nativeseating.ts",
      "sha256": "05a69a799098e939bd61be0b33d7334773164971741ed44600c6d828c2cc8299"
    },
    {
      "file": "balance/probe_worldmass_nativesubstrate.ts",
      "sha256": "3814fa25a0ca2a6b2d92e8d644f776d1367709e393ba0899d2a31c51dc3b0c90"
    },
    {
      "file": "balance/probe_worldmass_nativewalkcache.ts",
      "sha256": "4bac922fdb4d98a1caf68cd1b6045398785995c78591b75eb12f2aaf905988df"
    },
    {
      "file": "balance/probe_worldmass_nativeworker.ts",
      "sha256": "fb89ac88edd8e24eacbff86b9643732b3372098a342944639aae65cda2d0c959"
    },
    {
      "file": "balance/probe_worldmass_neutralground.ts",
      "sha256": "c101aa3d66b0cf4888a2d2879eaf2d53301622b0627e9f94effb583337eeccdc"
    },
    {
      "file": "balance/probe_worldmass_objectivebounties.ts",
      "sha256": "372bd9e73a600a4715ab5dac350846744fd55296dfc563d308d68db46e70dfb7"
    },
    {
      "file": "balance/probe_worldmass_objectives.ts",
      "sha256": "fe660c7f01d2f58dbc1ac1f567c7da0aa47551eb04df92c1c95d870ed35703bc"
    },
    {
      "file": "balance/probe_worldmass_occurrencecontinuity.ts",
      "sha256": "dcb85395b4006b6f44d7152c4d9eba763a5c37fa8520f66ebd401b56498496cf"
    },
    {
      "file": "balance/probe_worldmass_occurrences.ts",
      "sha256": "c641f8a83c821dbc5e5fad168b7ffec434aafd8006672eb007f8d8079ffe5ab7"
    },
    {
      "file": "balance/probe_worldmass_origin.ts",
      "sha256": "ebbc929f9f740ba54a4569abca8dd58104df046a906934f61c0e8bdbc2c5e5a6"
    },
    {
      "file": "balance/probe_worldmass_outposts.ts",
      "sha256": "32eb221b976018a92e4d489afd24c4363298cee4af72ef58d6460e86cebded4a"
    },
    {
      "file": "balance/probe_worldmass_physicalintel.ts",
      "sha256": "6570eb3ee00fed562c79bf5c6c09e936e8e96d4a1983cd7ebac66b25bd9d0dc6"
    },
    {
      "file": "balance/probe_worldmass_population.ts",
      "sha256": "7ccad1b5469f80d1589a6c6b2e209926ee4e85acc10a39f0db776979a6a96f3e"
    },
    {
      "file": "balance/probe_worldmass_populationbudget.ts",
      "sha256": "5f88e83073630ee911132ca6093ec0e0eaf1610c7743a304486d5a320518d9ad"
    },
    {
      "file": "balance/probe_worldmass_processioncontinuity.ts",
      "sha256": "99840fc7ac50bf6f519a9852f1c9ea6871c0dcbf990243bce4b19d62c79bad43"
    },
    {
      "file": "balance/probe_worldmass_processiongameplay.ts",
      "sha256": "852e2aabc303e06e958131bc3bebfc281beab94afe5e7f5db44661ea492e1735"
    },
    {
      "file": "balance/probe_worldmass_processionroutes.ts",
      "sha256": "778a706d4a0962f891dca077a98ddc7fd8071cbf7f0fad8d8d2366eae63772f0"
    },
    {
      "file": "balance/probe_worldmass_processions.ts",
      "sha256": "d7ab37cc4bf499210f39dffe5a4bb4dcc8837e214c560203888d6ff05443dd23"
    },
    {
      "file": "balance/probe_worldmass_processionsources.ts",
      "sha256": "b22f64d3ba0a213141ebca4db997a3b72c59f4cb1fed7d411e302ab06bd317ee"
    },
    {
      "file": "balance/probe_worldmass_processionworker.ts",
      "sha256": "f907523b5f1ead43e3b9a1c6e9f33a5a9bb85cb1cdcd84ab00473967a16cef75"
    },
    {
      "file": "balance/probe_worldmass_progression.ts",
      "sha256": "f43217e28fe0b8f7d3c7aa994a9b60c79f3c415feea20f0249e647da08137aa8"
    },
    {
      "file": "balance/probe_worldmass_puzzlerewards.ts",
      "sha256": "f462333539b0a12560a8a8face6bcad65b3bc7a31e073a69dba5332b9180c5b4"
    },
    {
      "file": "balance/probe_worldmass_puzzles.ts",
      "sha256": "2cc3285c1a836a87f5d327afec7a216209c917eea71e8f1e1d39955dc9f9ef10"
    },
    {
      "file": "balance/probe_worldmass_questchoice.ts",
      "sha256": "7d70c6958c13acf55d9f3818aa947257e08bfed3801b10564762a013f74e7d75"
    },
    {
      "file": "balance/probe_worldmass_quests.ts",
      "sha256": "fde2f7284ef41396983430181a54178d7f73f381c808b98800fefc5fdbb74a91"
    },
    {
      "file": "balance/probe_worldmass_quietanatomy.ts",
      "sha256": "e3154e845d800127c5e053d596aa05403196afe8e0858257bf7da24d7f410449"
    },
    {
      "file": "balance/probe_worldmass_rebase.ts",
      "sha256": "6d68937be74f01ee8b22664d7e7874bdcb2b8184b24b98fe2c337286f73415a7"
    },
    {
      "file": "balance/probe_worldmass_regional.ts",
      "sha256": "f5495c2978cbf591c9f57f042533a5d2ecc177a3a5e92117757bad0df2e88531"
    },
    {
      "file": "balance/probe_worldmass_regionalexpansion.ts",
      "sha256": "2ab4fd40a9c1e099dee434d009bbf371afca66f56de403ad503fc54c5d609694"
    },
    {
      "file": "balance/probe_worldmass_regionalextents.ts",
      "sha256": "f76d847688db1f1b285569596b2800f632c6f3ac28f233797fc137c2562b5188"
    },
    {
      "file": "balance/probe_worldmass_regionallayers.ts",
      "sha256": "36201fcaa4d00955b3eaabfce512ec22c879d6e0b96d5e3a64e40f1998e90202"
    },
    {
      "file": "balance/probe_worldmass_regionalweave.ts",
      "sha256": "c8d2f10db079ef07c2ae7692604f9fe8a324de26429411da6f4365f1b5a54d24"
    },
    {
      "file": "balance/probe_worldmass_regions.ts",
      "sha256": "dc5ca99018e2edc4bf5c1eb528a98b43460b1c9d3716bee3943fede1f7201466"
    },
    {
      "file": "balance/probe_worldmass_resumeworld.ts",
      "sha256": "d4e446c37ee9c249e840212df29efbbaa94aaff652c424391fdc8e5d2b44dd50"
    },
    {
      "file": "balance/probe_worldmass_rewards.ts",
      "sha256": "4dc19edc4b4a2577cfe0a147bcbf1aebbdd96096662a5f74106d4ad07c6ead4f"
    },
    {
      "file": "balance/probe_worldmass_roadguide.ts",
      "sha256": "9d6a77b8a5ae8e888db7edc3841af1a313d7d336ab12b92b35c1a6708913a398"
    },
    {
      "file": "balance/probe_worldmass_roadside.ts",
      "sha256": "a772c750e810c984338cad01452a18d69789326787e7aba522e0fed550a121c2"
    },
    {
      "file": "balance/probe_worldmass_sanctuary.ts",
      "sha256": "1c8e3224d015b08fcd28c4565acb96a1d39ab3aca59ecce3723378ca4f7c4aa4"
    },
    {
      "file": "balance/probe_worldmass_shrines.ts",
      "sha256": "97110bc62aa9e3cc5b1e80972d6beb764ea2bf1c7e07f8b6767c9be418d6740f"
    },
    {
      "file": "balance/probe_worldmass_sideareas.ts",
      "sha256": "e3f715e5474034dec91de64fe4bb28a0b67adae3d914bf9301901cd70fa874a8"
    },
    {
      "file": "balance/probe_worldmass_sites.ts",
      "sha256": "dd3f64d7e295c93e35569e9d909efa2e51282c0ccbd2350e88a3866d51beb151"
    },
    {
      "file": "balance/probe_worldmass_snow.ts",
      "sha256": "46ad441c545f901db22ab7d4c9344adb662935cf5dadd7b29cd366f82afffdfe"
    },
    {
      "file": "balance/probe_worldmass_stops.ts",
      "sha256": "16d6730aaefc954040aa870664730ef9efc2d5e4c669d9f2c1beec2f8838a699"
    },
    {
      "file": "balance/probe_worldmass_storm.ts",
      "sha256": "e18b38a8f95ca527411c16364afcb5f1f8a1927142f29b76de2fdbe608fc29d7"
    },
    {
      "file": "balance/probe_worldmass_survey.ts",
      "sha256": "0af3f57224f6a4cccfe944563e03692702e55c72720cb33792d5c1f43a3415c8"
    },
    {
      "file": "balance/probe_worldmass_targets.ts",
      "sha256": "f2f851d244c040585a333ef2d73d4cf15efb0d6b0ca8fcc359abc897c6918f0e"
    },
    {
      "file": "balance/probe_worldmass_terrainpatches.ts",
      "sha256": "3e1ac1cf3c3531abf786d098b83016f7d1de8fc0cc883bb17efb79a5fb4f7298"
    },
    {
      "file": "balance/probe_worldmass_terrainvariation.ts",
      "sha256": "48dac1d6efbb1bfc1d139dbbe810c89c8500671a513e82bd0437d1ff9a031587"
    },
    {
      "file": "balance/probe_worldmass_territory.ts",
      "sha256": "22bc75b9594fa7514bffaa38c447c67c237ad83eabee65bd7258c8bb84522882"
    },
    {
      "file": "balance/probe_worldmass_weather.ts",
      "sha256": "97c2fdb8d42196aff4fd6616c57d16074e937efc0b9c134588623c759163c282"
    },
    {
      "file": "balance/probe_worldmass_weather_world.ts",
      "sha256": "adb883d249b73c3bbb024c43f223550b48f6d33021589f59e72c616365c24433"
    },
    {
      "file": "balance/probe_worldmass_welcome.ts",
      "sha256": "811cd0daa59b7e5c14443302d59182d486b13c4caae9128d0aaef5239dca3359"
    },
    {
      "file": "balance/probe_worldmass_wilderness.ts",
      "sha256": "eb25beb60d1ff503b52c24dbecde491f32cc651a0ea76d4a86499f6d82f67b4b"
    },
    {
      "file": "balance/probe_worldmass_windchill.ts",
      "sha256": "61be25c9e2c40faa6fb63f189bb76e7833547c4b52f8ce88a8b7ea0a0c738b08"
    },
    {
      "file": "balance/probe_worldmass_work.ts",
      "sha256": "63e039634d3fccb00382b1e573b4a6cb8def4c71f6260cbc61053ddcefeaa04d"
    },
    {
      "file": "balance/probe_worldprogression.ts",
      "sha256": "61336c35046d88598c6079a6c9a8e31106244c7d77b9e691907ed66756c2e9cf"
    },
    {
      "file": "balance/probe_zonepolicy.ts",
      "sha256": "9f5f0e1cb58a3c7e64eaf02fbc2b088f305faaf71e520fed5c53c4637f7c0311"
    },
    {
      "file": "balance/proc-cues-ui.cjs",
      "sha256": "d2e56bdafba89e2d9a53e3b5916c660f5be0beac00d8bd5742f8c419437ac6ff"
    },
    {
      "file": "balance/proc-reference-ui.cjs",
      "sha256": "209c430be2fa8d656d9d80d1526b94f0e9e776c5064d0536bb74de33c1a8d102"
    },
    {
      "file": "balance/progression-floats-ui.cjs",
      "sha256": "673abdbb4f3df5fba2f26b5bdda68a6afd8f1dad1aa2dd3e56290800fba96175"
    },
    {
      "file": "balance/puzzle-calm-ui.cjs",
      "sha256": "6a9580c5da23d7f38c7eeaa7243c1946baf0755586a467d6ec1cd3b4063c88cf"
    },
    {
      "file": "balance/quest-choice-ui.cjs",
      "sha256": "240d772ee76180bec904e3849b0f384f342aa116b0cfdd0d693896cf80be4b95"
    },
    {
      "file": "balance/quest-compass-ui.cjs",
      "sha256": "c37a46874681cc6f652c51170efdea80e234bf4770cc0d1f45d5c80fba1892bc"
    },
    {
      "file": "balance/questInteractionFixture.ts",
      "sha256": "d4cb6f6c0a167f6b5c0018826b77c6de02ebc320723ff53df1d2306abff07e85"
    },
    {
      "file": "balance/raised-guard-ui.cjs",
      "sha256": "879b6d7de274c715aa205612d114d85c6605ce797fcb3add87e2909c7facfc8f"
    },
    {
      "file": "balance/raised-guard-world-ui.cjs",
      "sha256": "15a257d9ad6f1246e4ef6c52d316c322cdb0038f4b3416445d5ff96a8ea0791c"
    },
    {
      "file": "balance/raised-surfaces-ui.cjs",
      "sha256": "5179fb52d604a271da34f494621f06c7f6a1eb5d4d8f63a26ac9a3d306ba37ef"
    },
    {
      "file": "balance/readable-night-ui.cjs",
      "sha256": "5841cb356188df5e3d612a9680d7236394e172f82e63d77e40964f9e0acf7985"
    },
    {
      "file": "balance/regional-extents-ui.cjs",
      "sha256": "5b6b1d1aee0ca03e0d1900b491a91c0cfa83fb7a3e5a642d967ba4b49a6dfe50"
    },
    {
      "file": "balance/regional-layers-ui.cjs",
      "sha256": "5add2e63d59ed367e7240ed3c000b8381749e2cc9a19baa0e636c659dd2236ce"
    },
    {
      "file": "balance/regional-weave-ui.cjs",
      "sha256": "5433c9eb98f03da80b604091ae309c3afdd984e68a3f3c284da8f1719573685d"
    },
    {
      "file": "balance/relicExpansionChecks.ts",
      "sha256": "8b6e38e4bee200ac967f5350acf0b335c7d3abfd49b1c98fe2949fb53afb2288"
    },
    {
      "file": "balance/reserve-cues-ui.cjs",
      "sha256": "17f8ae8d61bc03b8c8db8b38809afcbe5459ea340192f679fa0580c31468ca8c"
    },
    {
      "file": "balance/resource-floats-ui.cjs",
      "sha256": "0207f35f888884938a1b3b6ed143bf71db438044f19ff4efa006765424cab162"
    },
    {
      "file": "balance/resource-study.html",
      "sha256": "a04c9c87ec0559ecfea1e5010ed94c692c5d46438e5c19bc335d1f348d796ec5"
    },
    {
      "file": "balance/resource-visuals-ui.cjs",
      "sha256": "ba5bf4e09f248a9f0e5c1063f80b9b931ee6ba54c61eb1d7f34a337ec2e17ed6"
    },
    {
      "file": "balance/reward-floats-ui.cjs",
      "sha256": "7167ec3560420eda29aa36827888b55e848f9409805c3a0ea7251d20a65cc681"
    },
    {
      "file": "balance/reward-labels-ui.cjs",
      "sha256": "f24ab4e22ed17924834fe58e380d1b2dcc2202a266e25a397691cf496582d05f"
    },
    {
      "file": "balance/road-foragers-ui.cjs",
      "sha256": "b97cc62b228380ea2668d25831df613a3074eea333cde8aa755420c0352262e0"
    },
    {
      "file": "balance/road-guide-ui.cjs",
      "sha256": "b8b589f6dcea992e619839a18e3d9cba88826b1df11d9f695987dcba634932cc"
    },
    {
      "file": "balance/run-native-couch-join-ui.cjs",
      "sha256": "930d24fea3509d4c987817f8a1a27e0e254df0f6037e4513b807493c9435cfcb"
    },
    {
      "file": "balance/run-native-hosted-browser-ui.cjs",
      "sha256": "052074c53e9ef03e7777a713aa58bc173b33f897994fc84cd8982502d1ea0a45"
    },
    {
      "file": "balance/runprobes.ts",
      "sha256": "f8e90d361743b8d928ad464ee25fc61c23fea1ef3f49526a0e4fe986f474e167"
    },
    {
      "file": "balance/satellites-ui.cjs",
      "sha256": "0cae5dff2989a80cf6e515de0aa8c45d5363e1ef2a67da2ea0e9c17250241a0a"
    },
    {
      "file": "balance/scratch_bulwark.ts",
      "sha256": "d1f778588a01cb60470f93965ec8269909847d4aa9faa66555e55701df298380"
    },
    {
      "file": "balance/scratch_guardclass.ts",
      "sha256": "257c1cac35c619697089601c5a50b8ec4dbfe1fcaf6806ba302b6caac011d855"
    },
    {
      "file": "balance/scripted-input-ui.cjs",
      "sha256": "3ae02c8d755c08e45f2ef225397b3018388a5062224aa9d716e227e6bf91f223"
    },
    {
      "file": "balance/seamless-visual-sweep-ui.cjs",
      "sha256": "dad68f7dc946ead650163214c7327a0a08e65c1b73a244057b2d2a76091acbc1"
    },
    {
      "file": "balance/self-study.html",
      "sha256": "f6ce138726c81211c8d102158957dd181c0d80454a22358667caf1a75b442f9a"
    },
    {
      "file": "balance/self-visuals-ui.cjs",
      "sha256": "9a6c007cc930cb98a0f003d3d3aa05dc15e355fcf87610ce6fd110c153d88d7f"
    },
    {
      "file": "balance/sentinel-looks-ui.cjs",
      "sha256": "14de65dd8f564bd5978203037236e707402b6b5b773a0efe78aa946b1d8c719f"
    },
    {
      "file": "balance/sentinel-world-ui.cjs",
      "sha256": "480676499d16ad0cfe6c6af87875950ffe1a7fba7766d909b0813046389552c9"
    },
    {
      "file": "balance/service-prompts-ui.cjs",
      "sha256": "ddccacde554544dd1e06acdcded3afb8adb95848cffbcdc02a4919e4cc2a9d6a"
    },
    {
      "file": "balance/shield-up-ui.cjs",
      "sha256": "54c9879921e69b11fc798e797eab2ee3264cddc6d006b8305a5afb8b8e792a52"
    },
    {
      "file": "balance/sighted-survey-ui.cjs",
      "sha256": "f8e4c87ad9a80ebcef82e00086fd4c0319f30f25c812ab3bea2eb3e5c188ed3b"
    },
    {
      "file": "balance/site-activity-ui.cjs",
      "sha256": "fab5c3775ce6d397bb2b162c9909f3660ce3127a15c8b40831067077784d67a4"
    },
    {
      "file": "balance/site-cinema-ui.cjs",
      "sha256": "5bf163fc8cbd3455c5a922fc4c2e7b78dc1aa62ff68fbf3c56d5dbbdcbe3b63d"
    },
    {
      "file": "balance/skeletal-mages-ui.cjs",
      "sha256": "fb29ba35d4b41ec2068545c288542aa524a22fabd863146bf6c9dd547f96b9fa"
    },
    {
      "file": "balance/skill-empowerment-ui.cjs",
      "sha256": "065488030e42ac8dcb1c72acd3f8245a27053cd741691a3f1d81f8a36e5a5241"
    },
    {
      "file": "balance/skill-flight-study.html",
      "sha256": "3252d3372f8460ba0b35d5f2d5bbf14e36669b53e542ea0de4009b7ac5b0bb9e"
    },
    {
      "file": "balance/skill-flight-ui.cjs",
      "sha256": "c547257035cf2499c5d0d57f693787d43eeb29a1d6d13130fe0c46fc34013961"
    },
    {
      "file": "balance/skill-icon-atlas.cjs",
      "sha256": "9997b1e67357a349f9e0b9d47f873d0f24b207e3611a3830cf1dfd450722b764"
    },
    {
      "file": "balance/skill-icons-ui.cjs",
      "sha256": "c14443cde521daa966bc1aa62c8222bc334d2f4d4e3a14b51103a26751433263"
    },
    {
      "file": "balance/skill-showcase-ui.cjs",
      "sha256": "6eff9ab3d6d46a748ea1ea47c1fbf9f7e157bee63d4f8ffd63ef48de1ea6f8da"
    },
    {
      "file": "balance/skill-visual-harness.cjs",
      "sha256": "9670645ccd8107d04937cf79d01fecdd4faf3d4d28bebd3086599b2b7c7f588c"
    },
    {
      "file": "balance/skill-visuals-ui.cjs",
      "sha256": "1d63d4e8f9e577369fdb2540ba707a9135300a749e228a0fd193753dda3eba8f"
    },
    {
      "file": "balance/soak.config.json",
      "sha256": "05e75ed0f4817b0826acfbe49eff35604bbc21b23a259ea0a96a1b0eec65df23"
    },
    {
      "file": "balance/soak_bots.ts",
      "sha256": "d8ddf5d493429c0031a059abb31907c4f0f266ddc7daff04db4bfb31552d8c56"
    },
    {
      "file": "balance/soak_shard.ts",
      "sha256": "0d67346c95ca6dfd8ab50f077f92a09028ee54f4e9cb30efdb9224de35e64f8b"
    },
    {
      "file": "balance/speech-approach-ui.cjs",
      "sha256": "e1f7b625c6b60d47f29dc09be29c40d6e4726118a784715e59a2351572c7a864"
    },
    {
      "file": "balance/speech-focus-ui.cjs",
      "sha256": "b41d1bc50663ff5b4974ec2a4a50b88da122a95e9f79a95076b623991edb034b"
    },
    {
      "file": "balance/stalkers-ui.cjs",
      "sha256": "23999ab409d661183c039fe5c79562706a5e4e24a9e963a6bdf55d7eab6324b5"
    },
    {
      "file": "balance/status-readout-ui.cjs",
      "sha256": "a38fe02af0e896199a88b795ed2a19736809b028ec594dc79971386b6b52a42b"
    },
    {
      "file": "balance/stored-supports-ui.cjs",
      "sha256": "0b3b4974789d6465ee0f791838c477f024bb237b01b7293c558c0eb4f6c0ed51"
    },
    {
      "file": "balance/storm-fields-ui.cjs",
      "sha256": "379ea54b9620520001b0bad2d36ff6dcff025810097361772ad96d63c32413e6"
    },
    {
      "file": "balance/strike-study.html",
      "sha256": "73e0c815d7728463c443600214fd20beea1e010ac9e0703699f87105c78e2cdf"
    },
    {
      "file": "balance/strike-visuals-ui.cjs",
      "sha256": "a4449d1dfad69a661d293267b02d417dac29cd7d647779de707e2fbb626391ba"
    },
    {
      "file": "balance/summons-ui.cjs",
      "sha256": "3e805568a8da8d28c400eae6efab526113f0dc97bd7346e09e12e83840a91e05"
    },
    {
      "file": "balance/support-tooltips-ui.cjs",
      "sha256": "b7a5b06e6e00e8bef57c5b24834a87fdf895ee1ada1e36f99d55777966f2f083"
    },
    {
      "file": "balance/surface-detail-ui.cjs",
      "sha256": "72f77bcd97f8e364cd968cc7ca123df2c916ab214c0fe217059bee0fbe42296b"
    },
    {
      "file": "balance/surface-world-ui.cjs",
      "sha256": "f1dc74825d5568af4097e44d75bc75c4a5a885c855a756a902ce1dd826ad9958"
    },
    {
      "file": "balance/swap-readiness-ui.cjs",
      "sha256": "665f47e7f257bff42cf089cbc0ac2ca0dd55cf89dcaec16563335319d81996b1"
    },
    {
      "file": "balance/target-study.html",
      "sha256": "16a735333993da10fa5e1c75f1d0a1cd93d14314a497dec18f16ffb1dae35f95"
    },
    {
      "file": "balance/target-visuals-ui.cjs",
      "sha256": "82ecb9e9f9271e55e8995d551bb107a2532f5408290a8516dfa78faf197a6222"
    },
    {
      "file": "balance/terrain-variation-ui.cjs",
      "sha256": "3e2fc4024a7e68bc8a6c35bceee9677b5d8e5c64af039291eb1c0fd9e99f5b0d"
    },
    {
      "file": "balance/titans-ui.cjs",
      "sha256": "10f15e26df20ed3c0c039a3044496bf0960153bf6d4ace2331808871e3751571"
    },
    {
      "file": "balance/town-signs-ui.cjs",
      "sha256": "4a52199151d7d54a82f388ffe82d8574db7a68597f5cfd96afebcfed1cf3fc5a"
    },
    {
      "file": "balance/town-welcome-ui.cjs",
      "sha256": "868308e10f6240ebb2b2a308b6e604c77dcfbeb2d1dff34c30d88c487ed2116a"
    },
    {
      "file": "balance/trail-wear-ui.cjs",
      "sha256": "85d1b6d080094db8d15172644202a8f42ccd48cf50e2ffc483d247c2bb39ace8"
    },
    {
      "file": "balance/trail-wear-world-ui.cjs",
      "sha256": "41a1705d0537221624d2c2da9372abaebbd7c52b56ab15544ae8cceb7c878458"
    },
    {
      "file": "balance/ui-perf.cjs",
      "sha256": "9289f243e201f3342e470e6247cbfd4e729cbbe123b1f0ee6642b52809d31d75"
    },
    {
      "file": "balance/ui-perf.config.json",
      "sha256": "b4132a19c84b9d45c0cea23dd9893656b3aa53466705fe9a4a96dbc9ed45fa70"
    },
    {
      "file": "balance/undead-courts-ui.cjs",
      "sha256": "26892367c9bfb4948272d4b44fb05115e69a29390367b73a0013c1e67ee4264b"
    },
    {
      "file": "balance/upcoming-work-ui.cjs",
      "sha256": "c38f3428344a0067a7501bd80627226f29f486374d1b775b0dcbde043b64e0eb"
    },
    {
      "file": "balance/vault-discovery-ui.cjs",
      "sha256": "945418c55b4be51961701d2333dfd3bd8a53ce5f91e2e1c188ae9d38a186c077"
    },
    {
      "file": "balance/vault-progression-ui.cjs",
      "sha256": "9f4d1d927e745479dbd179bbfc99b32371577c8b1edb110b6331ef85ca4a4652"
    },
    {
      "file": "balance/vendor-investment-ui.cjs",
      "sha256": "ab248b33b0f2bcb6142c0cb6b21d64b4948aed70f9d31b6b44e28dce23dd77ce"
    },
    {
      "file": "balance/vendor-tooltips-ui.cjs",
      "sha256": "b6ef86e23956e3b2cc5383800347ecfb1e18b50bc749ab7e935d2c2b0e1282ab"
    },
    {
      "file": "balance/visibility-ui.cjs",
      "sha256": "8bb589889ad098f43b5c00a5a3f096c19f33e89b0d7de5ce3f2cf31e37c161df"
    },
    {
      "file": "balance/visibilityFixture.ts",
      "sha256": "8bd5eb99fb84d8fb524ad166418a865c1c41d53dbd994442d5c76b547615bbd3"
    },
    {
      "file": "balance/visibilityFrameFixture.ts",
      "sha256": "464cf6e7256a7d0135238ee0f57041f0b133ccd3df96f66bd524b48f5df7f831"
    },
    {
      "file": "balance/walking-parts-ui.cjs",
      "sha256": "7e8e9bccf59cc7dca18dbc5c6d3bfc3f0844cbb17defe900652929e231b43553"
    },
    {
      "file": "balance/walking-world-ui.cjs",
      "sha256": "3bfb284d794942ec3ef6a9191310c73224cfd52951a26c3dcb3443d929aca48f"
    },
    {
      "file": "balance/warning-cues-ui.cjs",
      "sha256": "58d57ea61e91f6425cc504b3f9e2d3debb7deb1eefa46ee88d7fa55e0f4a67fd"
    },
    {
      "file": "balance/water-watch-ui.cjs",
      "sha256": "1f60f2522b36b67189fc2187eaaee97594e0b86b202a43d8b7c3de2ca237ed5b"
    },
    {
      "file": "balance/wilderness-ui.cjs",
      "sha256": "63ecfc7d2b06d33d8fc9efe3a03f2cb11414df9dceab57605903ba684a31caad"
    },
    {
      "file": "balance/world-bosses-ui.cjs",
      "sha256": "850afbb11d3c7aa20b47cd96e3b1fb3bfeca53062cf94812e05fa509384e119d"
    },
    {
      "file": "balance/worldmass-birth-ui.cjs",
      "sha256": "f82a822d133df188a4e14eadbd766300514ba33b4446a1a9c8a31dff1e76cdcc"
    },
    {
      "file": "balance/worldmass-clearance-ui.cjs",
      "sha256": "fa173aced86feae57acec79b1eb5d11f42a42eb78d357cd22c301073f095d14a"
    },
    {
      "file": "balance/worldmass-door-press-ui.cjs",
      "sha256": "b0328376d4effdb205e6e368f427f8a61bc1f3d7e543a182cfd85f74be0cc9a0"
    },
    {
      "file": "balance/worldmass-embers-ui.cjs",
      "sha256": "4c2bb05166534654ce2026f9dc394e9528301806c9e39d0213becc57f3aac7cc"
    },
    {
      "file": "balance/worldmass-extensions-ui.cjs",
      "sha256": "9d65dab9a107f5ba9927ca04b36b92a9096fc9e2dffb1ffb5fdc9061e29b1d2d"
    },
    {
      "file": "balance/worldmass-fields-ui.cjs",
      "sha256": "8e67c38f651be278799a065aaeb332d2486a7f855d97e5943953d9d42623e1e4"
    },
    {
      "file": "balance/worldmass-formations-ui.cjs",
      "sha256": "974e805f640ac17ddf0ab44fa35dedbfd5daf1bd40dbab6efcab6bfd720a43df"
    },
    {
      "file": "balance/worldmass-haven-ui.cjs",
      "sha256": "9fcb8202a42b255443c8fdde13f04631d6eb803b277af071eaff83309d49be51"
    },
    {
      "file": "balance/worldmass-journey-ui.cjs",
      "sha256": "2a16f276023985ce867d41e5e7298ed8c899971c5b54b64186132a924198bc5d"
    },
    {
      "file": "balance/worldmass-maplabels-ui.cjs",
      "sha256": "893cb1da9cf06596b78cf8fca5a1cff41ddfaa33dae533491f4e47a8a7460f2f"
    },
    {
      "file": "balance/worldmass-opening-ui.cjs",
      "sha256": "b61c575170dd70e5cc15dc094539e12cfdb09375081325070ae8d49582418059"
    },
    {
      "file": "balance/worldmass-outposts-ui.cjs",
      "sha256": "c3ddc5a74c1f5721989860209c491f8c00b728470186e4f2b6a227f1d100cc1d"
    },
    {
      "file": "balance/worldmass-progression-ui.cjs",
      "sha256": "50f3d2516fad439fe913a8a55b96a0d696f6bf0324190e13ca0497ff57ca0f8e"
    },
    {
      "file": "balance/worldmass-puzzles-ui.cjs",
      "sha256": "8b7b1833a539c9e33cd76376cca2be75e1d7fc06e80b7fee47c7d4e8f965ca14"
    },
    {
      "file": "balance/worldmass-quests-ui.cjs",
      "sha256": "f45d0be883c2e06fb6293b55679b225ad5977f3eec02e8793560742c132a9740"
    },
    {
      "file": "balance/worldmass-roadside-ui.cjs",
      "sha256": "3e97ebbd501b35a0d1f57e84c7f46f7318d838d4e57e6925dcf94e2568bda2f8"
    },
    {
      "file": "balance/worldmass-sanctuary-ui.cjs",
      "sha256": "604b8ab1b2723ec3312f7a6e8631bb1f88285e0daef3bf573adf46975549105a"
    },
    {
      "file": "balance/worldmass-shrines-ui.cjs",
      "sha256": "aff025f5f81c60287594b04deaa380693c72d428eb7fb997422a30f5df63f707"
    },
    {
      "file": "balance/worldmass-sites-ui.cjs",
      "sha256": "835b3f6f69a00f9b89ab8dde9864028b167b53c29797aae8c6f06c182b56f61e"
    },
    {
      "file": "balance/worldmass-stops-ui.cjs",
      "sha256": "67ee788b072fedcc1a839a25b0fea3cb0ea25ce7eaffad95b54e81a9577f907d"
    },
    {
      "file": "balance/worldmass-targets-ui.cjs",
      "sha256": "bea75726aa171a8547e1e6abf5a7b1ea3ef14d6e235ff52a9bda127968a54498"
    },
    {
      "file": "balance/worldmass-territory-ui.cjs",
      "sha256": "ddc028a9c9b5f3bd9a31b575f44afa85f46bf30f278900515c2e9b9b82996577"
    },
    {
      "file": "balance/worldmass-ui.cjs",
      "sha256": "90bb03ce7ceb37de56e8cf9959976d774ed5524c0c9dcc1c6a292522e304142f"
    },
    {
      "file": "balance/worldmassFixtures.ts",
      "sha256": "181207280c770636a6aeb1e1a0e1498140ae931ec23cf8bf73284037084636e2"
    },
    {
      "file": "build/icon.ico",
      "sha256": "6e490d8d09fffb23b8969167c2e7842408404d14c8cd65e34dc8601c8ab02522"
    },
    {
      "file": "build/icon.png",
      "sha256": "13368fb608ece11688ad30d6a613b1c6b28413ca9ea16e782f7735306e604d2f"
    },
    {
      "file": "docs/ai/CROSS_MODEL_REVIEW.md",
      "sha256": "b13375f0bca31b36e2697f80fe3aa29bcb3e6ad64d7d640edeb813f80c675350"
    },
    {
      "file": "docs/ai/PLAYTEST_CLIENT.md",
      "sha256": "f3979f48f79653906b2c247879243f4206ecf1588caf2494c0555996d3d63a06"
    },
    {
      "file": "docs/balance/AGENT_PLAYBOOK.md",
      "sha256": "e5a5bf9aaf2f47c8946c3c288fd934264feca1cea63812acb0113215ea7abba6"
    },
    {
      "file": "docs/balance/README.md",
      "sha256": "cf7a2604e3c7e91c9c288746bcdc96e7749ed200f4ba3b53cd5e7db3ab425500"
    },
    {
      "file": "docs/design/abyss-visuals.md",
      "sha256": "ee7e829508e5d0c1e2b2780ef68fe7a441a880b7530eafb3c5b2c7351a9cae43"
    },
    {
      "file": "docs/design/account-reliquary.md",
      "sha256": "1aa3918dafb20ffbf64bf01f8b24792477dfe66e1c02b70f59e9889d0e514054"
    },
    {
      "file": "docs/design/affliction-cues.md",
      "sha256": "59a1ff7a1e1b943edac2107e6cb58a3b3ed0fc1c14a39fcbce5718dc43ae63fa"
    },
    {
      "file": "docs/design/ally-cooldown-and-impale-candidates.md",
      "sha256": "fec9ef5de8beb0ef875c7084bda93edd83085e69c2d630ad578a766539af2423"
    },
    {
      "file": "docs/design/anatomy-cues.md",
      "sha256": "d8d88979ef68c2ac6f13ae1d60a77273a1278dfde38d0f2c7ea3c1d730cb9197"
    },
    {
      "file": "docs/design/arena-bosses.md",
      "sha256": "77ec9cb4fae020f92c4a1dbfc0f79a0fdd04ca55ffcd0303de5c19b2a054fb0b"
    },
    {
      "file": "docs/design/bastion-starting-skill-trees.md",
      "sha256": "a23c1c675d68b81875c39591dd26167790e9b610639ca8a11f24199b34184451"
    },
    {
      "file": "docs/design/bond-starting-skill-trees.md",
      "sha256": "ee1a27b5674f6c47a83472e328bfb47376676a409613b93b36a6e824ce0ebe37"
    },
    {
      "file": "docs/design/bounty-board.md",
      "sha256": "0865b7042faf60188a10a0280588708550a3dd5662ca9f2689e237d6a13a3315"
    },
    {
      "file": "docs/design/bounty-first-writ.md",
      "sha256": "8ba0fe6e29e2e4750db20f2673d5c98a9e32d3943f2d20d1eb56757dee5a3e79"
    },
    {
      "file": "docs/design/bounty-quality.md",
      "sha256": "f25f6f2f9df3d225cc5ded1582cbaecf39c205b5eccee25219802b26761d4d61"
    },
    {
      "file": "docs/design/bounty-routes-rewards.md",
      "sha256": "6dead3bebb4af891eb91e13fd09441df63c7a49fc6d763fe2bb5c29df0650c5b"
    },
    {
      "file": "docs/design/brandt-progression.md",
      "sha256": "4982291c0c61b7de3ddb2949d07deaa145a8340564aa6da1194a744817405293"
    },
    {
      "file": "docs/design/caster-visuals.md",
      "sha256": "43a2ba05387c5ede224232511b25f5e3859ad59c458bc7c703909b3aaed0bec3"
    },
    {
      "file": "docs/design/casting-cues.md",
      "sha256": "268fbce2bd5205b8f2b4c2994c9ea2caa26fd0f97fd66f668beb581409d1d0f6"
    },
    {
      "file": "docs/design/class-starting-skill-trees.md",
      "sha256": "cbcd4a3e59768c6c8cc1788b01f3656bfdcc478987fb4bff5848acec787ea3bc"
    },
    {
      "file": "docs/design/cleave.md",
      "sha256": "d132214ca45afecc492081a83fbaacd940bcc31174da4c3fd5f830bbd4d21e60"
    },
    {
      "file": "docs/design/combat-outcome-cues.md",
      "sha256": "89ea371f6f87c0a5e4d43ec82cb1322cd575d9cca1f8879bb686e5c171391cb9"
    },
    {
      "file": "docs/design/combat-polish.md",
      "sha256": "7a23b4eee3dd643d99354303d481997dc6fd6e549bb2bf3d64653312cf8c79ec"
    },
    {
      "file": "docs/design/combat-readability.md",
      "sha256": "c98874e932d9dce5a70217227129a2b8061f2a9e883beefa2903f1d0198eec3c"
    },
    {
      "file": "docs/design/combat-threat-cues.md",
      "sha256": "c7f7799c12723c1be46b6d3ec47e4cef792c235a1d9c119672746d840c1dcb96"
    },
    {
      "file": "docs/design/combo-cues.md",
      "sha256": "70c8420e32b94ef037b4c3092c7ee423c69c5fb3fe68b87363da8250ed3e053f"
    },
    {
      "file": "docs/design/command-assault.md",
      "sha256": "00a4675c177c5791224a06d72f3d24f348005788a1f722164de6f3c20461c6f3"
    },
    {
      "file": "docs/design/companion-cues.md",
      "sha256": "255eb0fd448de8a48c294c5a3cde345864035b5287df22904aaafc5292b2629d"
    },
    {
      "file": "docs/design/container-loot.md",
      "sha256": "4c628a71c1df39bffebc2ce5e0211fabf5c1a4c29d917dd23ab8dcfa69fba2d6"
    },
    {
      "file": "docs/design/control-starting-skill-trees.md",
      "sha256": "702e6d05673d84c3bfe30419c048bfe292e6672f6c3cc52bc80080fe4d99e5ea"
    },
    {
      "file": "docs/design/cosmetics.md",
      "sha256": "85cda2d339c14fee27240b409cf8d5b9a5026c54d994d3795507ff77c054b723"
    },
    {
      "file": "docs/design/court-visuals.md",
      "sha256": "68360b526cf181c0c201e4685e48bbc0c5828ef1fbba80652c4a7fefb570a1a0"
    },
    {
      "file": "docs/design/defense-cues.md",
      "sha256": "b5440b1e94aa8d3f26403176cab6e124a63aefe3cae44356f7d10d6ee260a046"
    },
    {
      "file": "docs/design/demon-visuals.md",
      "sha256": "1994c5e6926b93a763c7b6e057a8e034bd8962ad8bee8492f28a372cf494a832"
    },
    {
      "file": "docs/design/devoted-starting-skill-trees.md",
      "sha256": "f3ffd78fd8960a5eed8684a59ec1c9d997c30d4bba61c0fe2b02d6c8641cd920"
    },
    {
      "file": "docs/design/discipline-starting-skill-trees.md",
      "sha256": "63854062deb62062463189ee1041b9abfebece8470a8e1c59c65fc8d93109fd2"
    },
    {
      "file": "docs/design/dissolution.md",
      "sha256": "3dd4cd50383e9fa5550d2f9abd4ee4b7943819e1d173de1db579ec8821a67477"
    },
    {
      "file": "docs/design/doom-cues.md",
      "sha256": "3451c7f9835e396ddfd74812b92f4173e0dea84b34dbebfe85953d6a987cfc81"
    },
    {
      "file": "docs/design/duelist-starting-skill-trees.md",
      "sha256": "16765942a7d1d784c7bb5fdff71432e3fc5810778ede1a27a32b7ca7b71869ef"
    },
    {
      "file": "docs/design/emergent-uniques.md",
      "sha256": "c5b2e918e13b7efc0372683038db5d0282b5a2f472b8120d61a9749181581f36"
    },
    {
      "file": "docs/design/encounter-combat.md",
      "sha256": "6a1a8e4f3dc73b45ba89cb0048671b287ecd931c57908d83593a071d9d6ab28a"
    },
    {
      "file": "docs/design/encounter-groups.md",
      "sha256": "13f9dc1816022939347cb47b7b4918d4ebccbd19b54bd651606475ef96e02ce9"
    },
    {
      "file": "docs/design/enemy-handling.md",
      "sha256": "fc0657f4314931c74c96cbf85473c47c96ad6567735be16d1926ef1c5f00e4a3"
    },
    {
      "file": "docs/design/exhaustion-cues.md",
      "sha256": "5980468764b73d3c09c8e89a2555c8246d85c7b993f84d63e616599e0e2cd114"
    },
    {
      "file": "docs/design/feeding-cues.md",
      "sha256": "2c9ff222b42586a3ccc734e84f439fb7502fc4643d9fcd7fec54420b3437d5d1"
    },
    {
      "file": "docs/design/flask-skill-trees.md",
      "sha256": "e7633a1199664bde5d9f19f16e0a59e77c613a331e5cf0cf91a9c974ffb934fe"
    },
    {
      "file": "docs/design/frontier-starting-skill-trees.md",
      "sha256": "1670943a640623c7ddecbb862ca40cc1e4b8b9e32d89b04cf2776ed8d6ebbea8"
    },
    {
      "file": "docs/design/gameplay-text-audit.md",
      "sha256": "2ed99a43402894956b62b56a7bf8e0ac58da73fa558acd37e334fe0707fea5c4"
    },
    {
      "file": "docs/design/gnatveil.md",
      "sha256": "ffe25d5b1bc8fa0fa3914193be162dcc42c44eea2ee6561b8e83f8285b507dff"
    },
    {
      "file": "docs/design/goad.md",
      "sha256": "624f2d68afb6861b30c0c7cd860c1433aa278ee10557e75a75c078f108887bc5"
    },
    {
      "file": "docs/design/gorer-gloomling-balance.md",
      "sha256": "f149a03892b690e9ba014fd8591489da2001d5b5186b490c163bc33461dc5104"
    },
    {
      "file": "docs/design/harassment-balance.md",
      "sha256": "0152770f1ee4865dde683df654f80fc9f4267573d0f29673763b00dd49d48de5"
    },
    {
      "file": "docs/design/hivecall.md",
      "sha256": "c16e51228554267510db676ad3fbffaec627cdeef3d170eaaca893885b15e81b"
    },
    {
      "file": "docs/design/impact-starting-skill-trees.md",
      "sha256": "fbe740a83f409cf932995a648706711f57bd9b9b5f179641efb912d8e76a2c25"
    },
    {
      "file": "docs/design/impale-cues.md",
      "sha256": "9de95f5da476d6ea9a784ebf35da5d212005671b151f1afe3e1f8427b0354d10"
    },
    {
      "file": "docs/design/item-readability.md",
      "sha256": "3485fa2e1daf691cfc0c0247a34db06f90a7dac79090e85cc9a6f753c0f6c365"
    },
    {
      "file": "docs/design/kinship-visuals.md",
      "sha256": "d55deee191c7d3f7714722aa4360150e53473b4b9ce251e0048420be34279510"
    },
    {
      "file": "docs/design/legendary-skill-empowerment.md",
      "sha256": "6bfc94d921981ab5f358b8d9c972ea65f1d14c42a58cb5aeba5e061262469329"
    },
    {
      "file": "docs/design/living-rubble.md",
      "sha256": "a677ac8a653a462f3a26d646ecf2ede48d4001f3c254e4f6ec01b16c2f8a6063"
    },
    {
      "file": "docs/design/living-uniques.md",
      "sha256": "bf9e63f1526cb4f8318ca11ba2828c8602eb5542ff99e775772591ed282c80cd"
    },
    {
      "file": "docs/design/magic-packs.md",
      "sha256": "0c24318acac54f7842fdc0192c54fa34aa5f5dc47939e6ab7ebddf24754a3756"
    },
    {
      "file": "docs/design/map-editor.md",
      "sha256": "8dbb6e8d061f695deeacdcbc555fc2071a24f684150fc176bb3f1715b8aff4b5"
    },
    {
      "file": "docs/design/mobile-touch.md",
      "sha256": "29ca767204358266f0e1bea241b94592279a337b05697e939592231cff233829"
    },
    {
      "file": "docs/design/movement-skill-visuals.md",
      "sha256": "90be77a0ec9854c4cc34f044a8fddda9bd6a366f5a571f969bfac17eb7c47e38"
    },
    {
      "file": "docs/design/necromancer-skill-trees.md",
      "sha256": "bdced5daf12ee48de289cb6481c1f41816a4dd7679af21e1bc23b34663350086"
    },
    {
      "file": "docs/design/odyssey.md",
      "sha256": "b7ec7e0b46ae5ef7f5fc56f0f04c8aeb257548be7792b4a4ec1a1736a18cfd28"
    },
    {
      "file": "docs/design/oracle-rescue.md",
      "sha256": "ff29449b8f9bd732d89b659d4ad5e3894250fc2ea688c927b5cb1b13372cc923"
    },
    {
      "file": "docs/design/pact-steel-starting-skill-trees.md",
      "sha256": "ecb5cff60d825d2e3e7892cdd758f2da0851173d37c3f75ebd8a5d76596ffc82"
    },
    {
      "file": "docs/design/passive-attributes.md",
      "sha256": "dc675a49e195863ec1091c155e9947e17eea0cb56d0e0f482e50cced74679799"
    },
    {
      "file": "docs/design/passive-crossroads.md",
      "sha256": "ca22019d41420ef2898de80d7fb60a086f22094775bf0c50b0651a8e529b14e2"
    },
    {
      "file": "docs/design/passive-investment.md",
      "sha256": "6794244df16dcd1a330f01228a9b2cad47d0532b466ce1bc20a2dbfaaba4edc9"
    },
    {
      "file": "docs/design/passive-refunds.md",
      "sha256": "eb9ec22fd1d5194a3ffecf065e33498b21105ec83170cbffbf68473f5e8afb7c"
    },
    {
      "file": "docs/design/passive-routes.md",
      "sha256": "c7ff1231d8d53acde636f3c9662786381b619fb430ac53e1073528664d4c8eab"
    },
    {
      "file": "docs/design/passive-specializations.md",
      "sha256": "fe0a30766fb7024bc2bf906c5fb912fa757b6fff17c33b32ff4d548ce416195a"
    },
    {
      "file": "docs/design/passive-weave.md",
      "sha256": "13a743e45855e982f0fa7d4a0411291a2ab8cf5c133fb29f1194fc3ca13fd4bd"
    },
    {
      "file": "docs/design/payload-cues.md",
      "sha256": "555065b2bca922b29cfc8701a3f99637d848a5a23343b33c498520f255631ab0"
    },
    {
      "file": "docs/design/precision-starting-skill-trees.md",
      "sha256": "e57d17278e21fc7ab2978caf75f30c45bedca2d70099b0a0ec864bdca2d09f15"
    },
    {
      "file": "docs/design/presence-skill-visuals.md",
      "sha256": "73b07aa8c59666121193fe8d6a1c7eb9bc3f51d6ab3ce182b0ca5e86f9895872"
    },
    {
      "file": "docs/design/proc-cues.md",
      "sha256": "9e259d047906c41525c96baadccfab63b6f5d119600e4612b7b74d34319ee544"
    },
    {
      "file": "docs/design/quest-geography.md",
      "sha256": "4134286cab423d9a5cb6b6c4d113fc0dd0bf7b32a0065e1ec21d6e827fdbeede"
    },
    {
      "file": "docs/design/reactive-uniques.md",
      "sha256": "b10da885645fd570408954cb42e98799cd5084023c63fdf8512c69c302931632"
    },
    {
      "file": "docs/design/relic-unique-pool.md",
      "sha256": "d95b340623f529fc612410c6c67fc139c1f7ea5806abe0b2c412524242b35955"
    },
    {
      "file": "docs/design/reserve-cues.md",
      "sha256": "6c5ec8b8ba4859a6c70970b02a8791f3b34ce777566fa15d143b17a024ec2a79"
    },
    {
      "file": "docs/design/resonator-starting-skill-trees.md",
      "sha256": "cf3d542e6c0a7741096e11d0b1b8208ffd6814ffb59df7f6f7ac219dae86ac3b"
    },
    {
      "file": "docs/design/rootwild.md",
      "sha256": "5fb5c2f9d84e4f8d7bab3df99c7e551d9c75f84d43fc41947fec8bdda9925204"
    },
    {
      "file": "docs/design/runeweaver-starting-skill-trees.md",
      "sha256": "88fed2c114e2d4b1fc6d919b9dff733e06b2385dec172644c0b2e91812585ee9"
    },
    {
      "file": "docs/design/salt-flats.md",
      "sha256": "824ac624afc3dcadd816e27e07d11a981b9e6d9d5e2f7f61038be9a9110fc10d"
    },
    {
      "file": "docs/design/scald-basin.md",
      "sha256": "e000fcec99fef7143c78f3fac83f6bc6fec68e4795ed6aab9cbb26fb46fe9987"
    },
    {
      "file": "docs/design/scald-kit.md",
      "sha256": "6f0978c20ed943c38912fd248b12f032767954d9ec11b705df5bcb7afc880616"
    },
    {
      "file": "docs/design/seamless-branch-audit.md",
      "sha256": "f3baffccfa48dc758e790e14f5a7dcc1f11c1257b687fd97dbf5e282fd201c08"
    },
    {
      "file": "docs/design/seamless-branch-files.md",
      "sha256": "d4683f067c1eba0835bb8bec09694e83fe6aba369f2fcace70d5ed240931ed51"
    },
    {
      "file": "docs/design/seamless-exploration-foundations.md",
      "sha256": "547e31cd597f7a91cc9e4f0868d1e087e378d28173ff76dc662c23fe8aff74e4"
    },
    {
      "file": "docs/design/seamless-gameplay-review.md",
      "sha256": "de7f75dbf38e975e58573e0529cda09cc8f271dd0cb1dde923e0222ca4f27b00"
    },
    {
      "file": "docs/design/seamless-visual-sweep.md",
      "sha256": "df9269f923d6955f73ba85bb014f634f6f91118c779fcddd896df689dd38965f"
    },
    {
      "file": "docs/design/seamless-world-foundation.md",
      "sha256": "702032ae6effa64d8742c63b743b62474ee36191714060d537a0beea2768a274"
    },
    {
      "file": "docs/design/self-skill-visuals.md",
      "sha256": "41ffd77d6eb6971b84b8344bb8f908139b3afa3e4f05145d1904db2ab0d42c90"
    },
    {
      "file": "docs/design/shard-m1-plan.md",
      "sha256": "4d01e55e85323cf9e821d52a888a4757e2fdaf48e794ef391d7dba9e22b6522d"
    },
    {
      "file": "docs/design/shard-m6-plan.md",
      "sha256": "3c43843c8240bd125e6450150bc897188db6d91b15c8b0abd9816bd42efe7031"
    },
    {
      "file": "docs/design/shard-world.md",
      "sha256": "a996a5bc2232636ee2477c5d1d0e42f56ea0ce3995d70fa16bff8d24c0099d72"
    },
    {
      "file": "docs/design/shield-defender-balance.md",
      "sha256": "8451bf77ab7dec68280cafbfff17a5d475a52ec934487ab7302d58aa0b347c96"
    },
    {
      "file": "docs/design/shield-up.md",
      "sha256": "7852a9deaf995e3ccd88a7aede4bdfc9316d93912444b018560df32d16a99212"
    },
    {
      "file": "docs/design/show-dont-tell.md",
      "sha256": "5c33ce45da383f65d435b883710133c7c342fe2e2e9c93c0bf79610dd3b1efb1"
    },
    {
      "file": "docs/design/site-cinema.md",
      "sha256": "9dd8596d73915a9fcd08bf40aca53119646994606956649a63a4530f99d84a57"
    },
    {
      "file": "docs/design/skill-items.md",
      "sha256": "76195e725f40357cac870c00803f5b511f470e0acbbf61446ad281d5520b4364"
    },
    {
      "file": "docs/design/skill-modes.md",
      "sha256": "f4e8ca4b675eb865881e6be9207f8e1c3abe94899486f23287bc652382dcbf90"
    },
    {
      "file": "docs/design/skill-support-candidates.md",
      "sha256": "41d0beb091edab1e28b5162d0b06f36534f4a81c6c0c383d948867aecf6eabfc"
    },
    {
      "file": "docs/design/skill-tree-gate.md",
      "sha256": "2f49eb6c28011cde2f384fdcb20c1f49494fc5e56c1810ea8632fa0147c8e8a3"
    },
    {
      "file": "docs/design/skill-visual-sweep.md",
      "sha256": "3e63bc77edc94362ae0b6bc6dc944ae0c1e43db7145098c4735d2f9025d5658d"
    },
    {
      "file": "docs/design/skill-visuals.md",
      "sha256": "6d6c08055b90d168c37ebda476e2882dcc85c9759292689e9f415b2ec9028a0c"
    },
    {
      "file": "docs/design/steady-hand.md",
      "sha256": "30b79b94d124eff19c36a5f7f033823d90b5e99026469606300a1c81e146d6f6"
    },
    {
      "file": "docs/design/strike-skill-visuals.md",
      "sha256": "01d0045d4660870f90ede1db164b306bfeb6e2f101099769dce599fcdf1204dc"
    },
    {
      "file": "docs/design/tactic-progression.md",
      "sha256": "6f8da0da89f85b2a2d6c4788baba2bf41f5ea0543796125d5c4d3a5da6754abb"
    },
    {
      "file": "docs/design/tactical-ai.md",
      "sha256": "a3900945257147b9675ee48e2be1de40b3e292611d9a13915f13698e46eada1c"
    },
    {
      "file": "docs/design/tame-beast.md",
      "sha256": "9c7c7800b13f5e204e7837356013b5cc827b61d979b834e91273f60fcf2dd0c4"
    },
    {
      "file": "docs/design/target-skill-visuals.md",
      "sha256": "93ad93d1403799ed3a1a0799d8aed92766c70f2771a8049668a8e7e8e6aa8e76"
    },
    {
      "file": "docs/design/throng-combat.md",
      "sha256": "e580f6284673c017834b069e4ac0d0f052999cdd9093fbf83087548723c328b5"
    },
    {
      "file": "docs/design/titans.md",
      "sha256": "cbbc178d448fc36e0b0021924c4cf255fbc944e01f20ea5e9aabbf10da1bad29"
    },
    {
      "file": "docs/design/town-growth.md",
      "sha256": "e3cdf5abadb8efb6e56d8f750c189adf9bd8c9046b562153cb8f9a9e8680adfa"
    },
    {
      "file": "docs/design/town-welcome.md",
      "sha256": "42399f288dddccdbc7449e789f641fa2044c7e4e2c054ce51346377ea2c4d02b"
    },
    {
      "file": "docs/design/townsfolk-life.md",
      "sha256": "bf7f577957268bf4816e094deb23d74e17b666a93b141cd3b6b56575a8bea04d"
    },
    {
      "file": "docs/design/unique-accords.md",
      "sha256": "4d0471dc37015910aa565ecf44574f0e93bd9fadbc9842ee359f00195e43f35b"
    },
    {
      "file": "docs/design/vendor-investment.md",
      "sha256": "fea4fc8dfc32c030cdccfb67810af9cd7aa32c216e89610fff1c816f462afebb"
    },
    {
      "file": "docs/design/visual-world-cues.md",
      "sha256": "6cde1ce5a88bdf2c8cdf1fe37aea23491d383cb84d31e74fb694289671a6065e"
    },
    {
      "file": "docs/design/warning-cues.md",
      "sha256": "be9bb824e015bc1a92402869832e1b9bfc8ea8957be5ac10ce9fda4c3d2eb818"
    },
    {
      "file": "docs/design/water-and-town-watch.md",
      "sha256": "e9405c4747a75451931184302b58b052834c73dd285bc906d1dbf795e0d17750"
    },
    {
      "file": "docs/design/world-atlas.md",
      "sha256": "e57211ed1cce4c09c66388058d16880a26313b5b94976101feb72af5ff9a8f64"
    },
    {
      "file": "docs/design/world-boss-colossi.md",
      "sha256": "7cb321e38999947a3120177241f5e69753f49c6a38ec4f19ae2fb22f32f9d993"
    },
    {
      "file": "docs/design/world-progression.md",
      "sha256": "8986c8f84f60339ba63785eb611331fb989c884370bc7cc8e1b3892b6ad9000c"
    },
    {
      "file": "docs/engine-hygiene-session-brief.md",
      "sha256": "f2813119230050e24d3553b86deb260af1504c1972ce019e5ee54d1ae439c25c"
    },
    {
      "file": "docs/engine/agent.md",
      "sha256": "62320618398158fb7e7447e083ef3edbf04d466d849dd9fd6bd82f81ad3b84f6"
    },
    {
      "file": "docs/engine/aoe-shapes.md",
      "sha256": "1c5733e46e8633779c79f2e2307ea549d698c2d5af40cfbf6d1a141a5e751093"
    },
    {
      "file": "docs/engine/atlas.md",
      "sha256": "62af37ceb2d144d11389be7268172d71fea6229f905c0d18d437c9326c658361"
    },
    {
      "file": "docs/engine/attunement.md",
      "sha256": "0cf8a31dc37a9d946d6db0b0b550c9d4511f387a661e7da055e8f6e3cd6971d4"
    },
    {
      "file": "docs/engine/auroras.md",
      "sha256": "7091ec543314bfd12c9345061543805b67338f487a49d3eb7cb02ffd0d61f8af"
    },
    {
      "file": "docs/engine/authored-maps.md",
      "sha256": "a6f8bab84d1415e57b625e90ca9b5da7879f29aa641aa3fddd6ddb12f7d7845d"
    },
    {
      "file": "docs/engine/bodyvoices.md",
      "sha256": "9f09690ffe6ea9f7a99c168a8b4a24b27f157a4ab063bf2f57b53378e3aa939c"
    },
    {
      "file": "docs/engine/bombardment.md",
      "sha256": "b1063bb0dcd53c3305170cbd6b0d406148462c76da39a331e90b6562a81f3b9d"
    },
    {
      "file": "docs/engine/boss-bar.md",
      "sha256": "caab0c2bea076b46738341005a0d2cc0f8da85ecced8d116661950f0b7375ae3"
    },
    {
      "file": "docs/engine/browser-previews.md",
      "sha256": "94df7202e0594413ccc69d205b90f20503da442aee37059357e978fef65aaff8"
    },
    {
      "file": "docs/engine/castseal.md",
      "sha256": "0176149b84888d4ba47426302e6d5257a74ea41cc1e24ccc93cb30534fcdc95d"
    },
    {
      "file": "docs/engine/cathedral.md",
      "sha256": "2bbb3d010e4ef15da61e9a0115e4dcfb757677b4060b61b5aa380295d03455bd"
    },
    {
      "file": "docs/engine/cistern.md",
      "sha256": "2cd51e3bf23b6009a6580af0cd916029c41985c890744b80038c01320c581420"
    },
    {
      "file": "docs/engine/clutch.md",
      "sha256": "da38398085d23e86e8b88c750cb2ea4b7629ab45fbb566275136e2d452a370a6"
    },
    {
      "file": "docs/engine/coherence.md",
      "sha256": "f09e14564537427067ae0efcda223fe5f55fb9ffee512a80fff14d84d6396215"
    },
    {
      "file": "docs/engine/collapse.md",
      "sha256": "8119106ef4e696e4c691cfbf91a8fe7c276ba9fd89f47c4fc607127330986112"
    },
    {
      "file": "docs/engine/combo.md",
      "sha256": "a3ad994ac54aac119341cd64aeb574dfe182014d18d4b2f63f234467225f9626"
    },
    {
      "file": "docs/engine/containers.md",
      "sha256": "dfedccfa48d3a7fb4033b6460b04bd0633b6e5ff7518a205e03000885e13e748"
    },
    {
      "file": "docs/engine/corpses.md",
      "sha256": "4c9dba6937532a8b0e5bcf51b1105495287ae0d97d67044310d2e64bdac04722"
    },
    {
      "file": "docs/engine/couch.md",
      "sha256": "8c37b99e9c134f92a738e820329ae62a151a55c863cb1032ce630baa7bf4ac3b"
    },
    {
      "file": "docs/engine/creep.md",
      "sha256": "65038e431ff07e41cbd9d5063325799467a34d98f490ca5897a382fb84e11b9e"
    },
    {
      "file": "docs/engine/creepers.md",
      "sha256": "bcdcd24139365f18f31d933d3def1ebd3bde99cb4924a46ef70b22debad23116"
    },
    {
      "file": "docs/engine/crusade-warfront.md",
      "sha256": "5b662308012a36934687f3c441a948be878a64cc4487880c3effc1535dcddaeb"
    },
    {
      "file": "docs/engine/cryvoices.md",
      "sha256": "cc22011a05cfa7db75b6989928c60416b8d74282cba7630a3ab600298c11d33c"
    },
    {
      "file": "docs/engine/defenses.md",
      "sha256": "02dc32de3a6b82ff5ac9369286572348ab46a80a05aa22bf0ba9ba89f57d3bc2"
    },
    {
      "file": "docs/engine/descent.md",
      "sha256": "40f0b974e8a4f8a9b5aea66497988818304f0cfd6e6ba08a9e72f736202eb240"
    },
    {
      "file": "docs/engine/dev-progression.md",
      "sha256": "b9d5a7f8e0e9eda280abd999ebb8f19900c0023f72120d11cd9a17722fe5cd10"
    },
    {
      "file": "docs/engine/dimensions.md",
      "sha256": "22780f6e7e7b7f8f1e3a59dcdc8cdc6116cf1f336289e38d4cfe1bf2c8787e92"
    },
    {
      "file": "docs/engine/director.md",
      "sha256": "32f62abc661c970e301fd2e9500570a2693136ce0fdf26454bf5ed79076160e7"
    },
    {
      "file": "docs/engine/discipline.md",
      "sha256": "da53e13ad0d306debed61d02578b80c23fc748fda9bb0081e8df1d83abd3c2bf"
    },
    {
      "file": "docs/engine/dissolution.md",
      "sha256": "e27be33bb2f2a9ca74b747b295cb9e950fddcd8518fe459fa221481faa89cb31"
    },
    {
      "file": "docs/engine/douse.md",
      "sha256": "6d2e485dc8430efcf0789f257c741f3b0581db2abf585f7ad11ab64239634c0d"
    },
    {
      "file": "docs/engine/drove.md",
      "sha256": "da886cc5d824721282e0e79cd49834f5e122b0968ab627c8e2dcc4e2fb344310"
    },
    {
      "file": "docs/engine/emergence.md",
      "sha256": "56e5d357a29c0ea260de615bf38a6f3ae797764f570f856fa71d008aa1b3cc50"
    },
    {
      "file": "docs/engine/extraction.md",
      "sha256": "17a1da3742404ba6fd2a0a4c5025a18a7411b67a684c55664882e8751d8e8d92"
    },
    {
      "file": "docs/engine/flocking.md",
      "sha256": "60005adfd8f97094c087535f6f7fd4483e38a9888db8b43521033368b0c55c50"
    },
    {
      "file": "docs/engine/flux.md",
      "sha256": "9a505edba9c5fab8817002ae25bf078b7e02e55610b444a4c79168e110e8a64e"
    },
    {
      "file": "docs/engine/fog.md",
      "sha256": "36d44903acaabd31c768f04fe1b113ef01e8c8e4ac3971a427fa05047bd5cc95"
    },
    {
      "file": "docs/engine/forechart.md",
      "sha256": "b38b40c8b0e9ed14c98368aa83d925eee148fb06d977646efe96cbb269bc8d53"
    },
    {
      "file": "docs/engine/fourthwall.md",
      "sha256": "fb6d48a2d4065aeb8e0395705563ae8e618d4a22954781b3a61a34cb6272538b"
    },
    {
      "file": "docs/engine/gauge.md",
      "sha256": "ffa851d9aa0ebb994679dfbb6b3567c5aa76aa9484a7f2b15b974f73f79dfad1"
    },
    {
      "file": "docs/engine/geysers.md",
      "sha256": "b5617b45258cc640747508b76cbca85a6d460aa70f281701d323ced559fd90d2"
    },
    {
      "file": "docs/engine/gloaming.md",
      "sha256": "9b5d72b66dd79ef6799e56a2223765729bf7c6447aefcf79d74543acc1f39626"
    },
    {
      "file": "docs/engine/grab.md",
      "sha256": "ddcc39b18908829411b0878c413ab335b35ad45c076c01450d13e603fb942395"
    },
    {
      "file": "docs/engine/greatgeyser.md",
      "sha256": "0b53a35bf778c1fb90a91b51b75a3f5fbfc72e91a4855808cd7b3deefe72244e"
    },
    {
      "file": "docs/engine/grove.md",
      "sha256": "a3c776dc5128369d63c4f1ba908897c790a1f1215387cd444c5feca4b8936ae3"
    },
    {
      "file": "docs/engine/guard-bash.md",
      "sha256": "c73f4b09e1846b926d814ae2444fbe41bffe918026e94a7c88b86fffb618b8ad"
    },
    {
      "file": "docs/engine/guardians.md",
      "sha256": "40a2f8ff0ada4c1727a3fe5c97de278e0b8c49d9d8a65a02e3a810bed1b72961"
    },
    {
      "file": "docs/engine/harborholds.md",
      "sha256": "2fca8f541bf634e30f0ad1cee4e89dd280521487d7374e18862dfeabcc73f19a"
    },
    {
      "file": "docs/engine/harvest.md",
      "sha256": "05391b86b5a124f4b4461280fdbadfb202413d3754d81fe1b1887bf61b50a9c8"
    },
    {
      "file": "docs/engine/hit-surfaces.md",
      "sha256": "0695dd44e446ea71fe5cd66f2389c0ad3b50514d38bc7c1b85e8bc0243f0b28b"
    },
    {
      "file": "docs/engine/infostream.md",
      "sha256": "745ab70d23064edd93ed7a75758cb5e3aa9e288d391647ee6d4caf4531254bac"
    },
    {
      "file": "docs/engine/input.md",
      "sha256": "9b3db12defde2f735ac0577180c8ff7b700f307c3082f3c57e3ecbdcd6fb26f4"
    },
    {
      "file": "docs/engine/interiors.md",
      "sha256": "8907bb37e0e6f4f4c92ccb51d6c6a95bec92a9d7722724009feeb538269afe77"
    },
    {
      "file": "docs/engine/lairs.md",
      "sha256": "885270f8dc9f799795e67485fc2ed3c5d3bba18f8fb4713f57c29ac452dfdcf9"
    },
    {
      "file": "docs/engine/lake.md",
      "sha256": "15ebb1e94da945b4be806ea5462e09d02de61485c16183db0b0c0b02e0199cf9"
    },
    {
      "file": "docs/engine/launcher-branches.md",
      "sha256": "1ca6f88755adf1272b87e86ee6245c7eb1bd38eaa1a3dcd3612d163014998eda"
    },
    {
      "file": "docs/engine/legends.md",
      "sha256": "e36a688aa5b4d56ae02c2a690b9e1b089475517829fb8d975d6fd5e27a644451"
    },
    {
      "file": "docs/engine/lite.md",
      "sha256": "ad95cdee090ff86c7c9e6575c9882ea1f579b6a0729d762186188d34eb0282d7"
    },
    {
      "file": "docs/engine/los-pathing.md",
      "sha256": "57e357a072070e916b533c74fb9c869407b7b35da6f0df4a33f18e34f395b8ab"
    },
    {
      "file": "docs/engine/madden.md",
      "sha256": "994f2f07b5d20014672669006f0fd23adfe940d553328ee95b723d43c5b1b7cd"
    },
    {
      "file": "docs/engine/mass.md",
      "sha256": "4d65bc6413462248fa2acd6de9c74f6a8ec9dd223aaff82c14d8fc3d49aeaadf"
    },
    {
      "file": "docs/engine/massif.md",
      "sha256": "9c76abd91d381880004c2ed4da1262c9171cac1c75b31fa2fc1c332d16b6ae60"
    },
    {
      "file": "docs/engine/mimicry.md",
      "sha256": "b0ba983ad4c7dc4505ce593ec6e63888f44a7ac6484b426001bc355f1287371c"
    },
    {
      "file": "docs/engine/modifier-audit.md",
      "sha256": "7f294d20507400d950482e5f14f9f21dc6006b06edb28ab5cc0774f2108f415c"
    },
    {
      "file": "docs/engine/mounts.md",
      "sha256": "e896b1fb592c21f40940e79c168ddb8834f83b9e058af32c622d2b1e32faa283"
    },
    {
      "file": "docs/engine/movement-tethers.md",
      "sha256": "4edc87a038b61a574212f8dedd5b09146f508cc55ca1fab748ad7f885a07ef29"
    },
    {
      "file": "docs/engine/mu.md",
      "sha256": "e0c92c6931b8788a7f56de798c4a5b888a0480e6026869b03158257fa6e42e71"
    },
    {
      "file": "docs/engine/objectives.md",
      "sha256": "c86050c62db244ac8ea73c4470ff983d7d6b7edf4c440f53f3d6428263031919"
    },
    {
      "file": "docs/engine/pack.md",
      "sha256": "08508606e89e61234985873f4313d1e6bab673f7f96b7e17c4be717e459e9934"
    },
    {
      "file": "docs/engine/parry.md",
      "sha256": "70ec9219e402fe769bc7751725daf563c725d9466d435fe9067e9caa368b20a9"
    },
    {
      "file": "docs/engine/pilgrimage.md",
      "sha256": "b1757f69d52505ee47ebd45b9d6ced9d9b811968df664cd02fe1b8165c09c1fb"
    },
    {
      "file": "docs/engine/pitfall.md",
      "sha256": "d51df637ae5ae5984d55c05359168dac1365f89a237cfd503bd99581afed32ad"
    },
    {
      "file": "docs/engine/plies.md",
      "sha256": "b2860d894f6c39f97df558caaab31026757cebc47012fe9f9d078cfd8689ad17"
    },
    {
      "file": "docs/engine/pockets.md",
      "sha256": "9d98bea271c45420675c19429a56e9ff43bf4fff57532d9f16843a8ff78c7281"
    },
    {
      "file": "docs/engine/possession.md",
      "sha256": "54236549758f705494679da639f18b1293e586799d87988dbec1a32ba045549a"
    },
    {
      "file": "docs/engine/puzzles.md",
      "sha256": "d19d60eb8abb2bf7ab06e7a9457df94de1bbcd973c79a1006280d5746453763e"
    },
    {
      "file": "docs/engine/quickening.md",
      "sha256": "98d8cfbbc815764960d2866ae07fdc63660aae2ff6bac4afa654fbbcd1d33641"
    },
    {
      "file": "docs/engine/rampage.md",
      "sha256": "dfa7badcec78db56d3b94c8f8d316893557d7150eac6a971a97a90aed9b4fbad"
    },
    {
      "file": "docs/engine/reflex.md",
      "sha256": "1adb2ea6ffd352e3fc6a0a909daefa960950ca4b4348b3039a19cd6cd79ea8e9"
    },
    {
      "file": "docs/engine/relief.md",
      "sha256": "6a2e1056589a1b7e3600e9d9029bbe0f1c2fd166bac1e1e35f9d6d91a86003e6"
    },
    {
      "file": "docs/engine/reserves.md",
      "sha256": "4d9d87c447ec471077f3e926eb72dfe62de5fcc27e73aff6a1fac17fe7218c81"
    },
    {
      "file": "docs/engine/satellites.md",
      "sha256": "0f49e01e3895dddc72bcecdd1c288ba05caf74e846c77bf4171dd79f8e0fb58d"
    },
    {
      "file": "docs/engine/save-compatibility.md",
      "sha256": "327af39d6a530fd10daec8917ff01ce4f103586cb7929bf34b8cb3b14853c6e2"
    },
    {
      "file": "docs/engine/scald.md",
      "sha256": "fc3e8a54af2b5950f83ceb6f9fd69a6f51cba1598e6ff8a12064c042e116a229"
    },
    {
      "file": "docs/engine/scaldkit.md",
      "sha256": "f8f303782c210f718c4a7063f4012f5328a7a06173635de1db8ca88db1d4ae93"
    },
    {
      "file": "docs/engine/scenes.md",
      "sha256": "48c98d3c851f4dc47db734a7b5befb499f013da0726c6421e972bd344feb21d5"
    },
    {
      "file": "docs/engine/scorch.md",
      "sha256": "717baa865cb067152b1724b13e8e808cc897798a67034eb30722640bd1ee95b8"
    },
    {
      "file": "docs/engine/seas.md",
      "sha256": "e2dab9895cdcd4fe4efde146c39153d4de8be0d04e854ed25c16675fe986cb52"
    },
    {
      "file": "docs/engine/segments.md",
      "sha256": "2f3a0b4055359ca56071c01ec26673207204ed133e9b7320677cc83f9ab3c820"
    },
    {
      "file": "docs/engine/settled.md",
      "sha256": "b1c7e305da4061629dc296d1cb2fca366909cd24f8b62f1eb2f32e59d75cacd6"
    },
    {
      "file": "docs/engine/shard-runtime-foundation.md",
      "sha256": "79a50734a997713c0668ff6996ed951a2ecc10ec23c73aeb7e8beeabbb0cf272"
    },
    {
      "file": "docs/engine/shard.md",
      "sha256": "8482364cab8251e0d8182150a219282cba5369615a288d6afe6a5be5e50c4828"
    },
    {
      "file": "docs/engine/skill-showcases.md",
      "sha256": "bd620248d13a3a622c9f67a845bde22d0d47d14279d114cf11649393d2534247"
    },
    {
      "file": "docs/engine/slotgrafts.md",
      "sha256": "6438a8d7687007509f6e8d4ff092870416228331f4e293a61c4caa52600676e7"
    },
    {
      "file": "docs/engine/soulriver.md",
      "sha256": "ea11145c385d3f0f2b0903576654454700bcf4f6424a21bf373c238cf840fbf4"
    },
    {
      "file": "docs/engine/spans.md",
      "sha256": "8f9805add94ce21df8510df798b8bc7f8b8e2306698d6c1e5d3b3584bfd39c58"
    },
    {
      "file": "docs/engine/speech-grammar.md",
      "sha256": "58d398e1e6b2e1547ad18c565e60602561d857a66476310a6cb452c8291e1110"
    },
    {
      "file": "docs/engine/spoils.md",
      "sha256": "85f55e3e8cc5f6494ccb0910cc7d5c743ddbe69c927b07b344722c41c0bc6d7f"
    },
    {
      "file": "docs/engine/squish.md",
      "sha256": "5d1bbd60681481cd96af0af25bce335b6ae5a52064b34f7dc78c88cc61f230ae"
    },
    {
      "file": "docs/engine/stashes.md",
      "sha256": "7b47b30ed10dde7a47f3531ec4e620bac08c759802a4b3e0de0e9cffebc3f01f"
    },
    {
      "file": "docs/engine/stat-performance.md",
      "sha256": "9a45e446affc0b497ef5ae8aed3bd4863f730336bb48c529cd6eaa8620206262"
    },
    {
      "file": "docs/engine/statusvoice.md",
      "sha256": "967712f77af5ba925692f726ed72b0d3479c1091c766bba82d7748ad46c7cb0b"
    },
    {
      "file": "docs/engine/stealth.md",
      "sha256": "2f57d93c57c7145cc36c8875d82bd72f107dc78e9798cbfc346462ca34c6fcae"
    },
    {
      "file": "docs/engine/storeys.md",
      "sha256": "2e76154278dd6b0f0a1d2e3dc5aa344150527dce609fb88d6d2c18fdb769879b"
    },
    {
      "file": "docs/engine/strata.md",
      "sha256": "41bbb0531cac400e22146dd1e55e5ed008dc4f607e52e7201dab7f76d0af075d"
    },
    {
      "file": "docs/engine/supportbase.md",
      "sha256": "20433c225125c36b4d2341b50ba9d9dbf1440a3fb0cfac1582220e06e6be3d23"
    },
    {
      "file": "docs/engine/sympathy.md",
      "sha256": "a9d2c46a8d4f38fd0386316704d07277158b6fad91cdbe784384fdd630faf49e"
    },
    {
      "file": "docs/engine/talents.md",
      "sha256": "962125bb6e15545f3e240197a4f0b2a5892b43e34b18c0ae3ec4d7e15b9c2ed7"
    },
    {
      "file": "docs/engine/tells.md",
      "sha256": "d6ee85283a6a299975a23dcdf102e601a03b6d23b55916467ce4b9dd9b61e5eb"
    },
    {
      "file": "docs/engine/theater.md",
      "sha256": "f2d6d12e6c6e812d6c0b1ffcef6f4ad964b0c2fd048b73fedb47961948dbe82c"
    },
    {
      "file": "docs/engine/throng.md",
      "sha256": "31076415ad264e628e82ba58e4b6e3493f2bf79046db368cfc9036f6201b06e5"
    },
    {
      "file": "docs/engine/tiers.md",
      "sha256": "660bdaae9ef1207044d156c60d75a90054c4618669931c643a38ed1c51951893"
    },
    {
      "file": "docs/engine/timeflow.md",
      "sha256": "4932c6b6610045637ae7a4b3414dcb6752ce8ff03c6dc6ff0e1d762e43d7744f"
    },
    {
      "file": "docs/engine/tollspill.md",
      "sha256": "9ec91e5c9009862d9ffd27c8d95ca2c108c814adf8fa49668305d40ddb066882"
    },
    {
      "file": "docs/engine/town-portals.md",
      "sha256": "9b44eab14151ec8ee846d1276c668f8e20740a296cef5832c142ca5851b4cde9"
    },
    {
      "file": "docs/engine/tracks.md",
      "sha256": "007fea7d5d8f1918872d0a2e3e439d7f9edd540f8a687c2b2e86542eaf97a387"
    },
    {
      "file": "docs/engine/transience.md",
      "sha256": "abb2dbc1b3ce3b796133ab15bde59c7123971ae3bf8b734c6d7bce6f587ff739"
    },
    {
      "file": "docs/engine/trapworks.md",
      "sha256": "cd752f0a99bfe5223fb4419197c4d9a41a8e012df1fc644b7252a2d11575324e"
    },
    {
      "file": "docs/engine/ui-performance.md",
      "sha256": "17c21008b43974dc74a76696a7e2ca68e05bed7c900397856f9675221dcf55a6"
    },
    {
      "file": "docs/engine/ultimates.md",
      "sha256": "0b1fe346a99b84c598c40b5ab3de89773df7ba58654360f0ade56e1b844664a8"
    },
    {
      "file": "docs/engine/underworld-war.md",
      "sha256": "8c9f2d3b3cfe36486f15a9329c9a3e3ab5fcd070f7b13190b9a35968e9a1d772"
    },
    {
      "file": "docs/engine/updates.md",
      "sha256": "d975ed9f93e9daa58ca6597f41e117372cc204604a3fd91932e48c81ce933398"
    },
    {
      "file": "docs/engine/vendors.md",
      "sha256": "ba312eb6f40f76f66519827f652a20112deecd828c58c97f0922f32685b0eebc"
    },
    {
      "file": "docs/engine/visibility-stability.md",
      "sha256": "d8432564c6ad0ac189ee2a018763ae04b7d72123277f52f761191b2b8242c34f"
    },
    {
      "file": "docs/engine/warfront.md",
      "sha256": "5e602f3cc6b9ede7e6f8cd52e4f990445f4a8096a93eec3ae3cc18e79fce0bbd"
    },
    {
      "file": "docs/engine/watchers.md",
      "sha256": "30099d107e88cc8ca9ff16dcf0a64469eb29c9195f8b90eb167a124d0ada1857"
    },
    {
      "file": "docs/engine/workshop.md",
      "sha256": "634d21f8cf36c430258498860efd035dab529b1b74641b48899bbe5b806e67bc"
    },
    {
      "file": "docs/engine/worldstate.md",
      "sha256": "c81b0ada4b717366e48e26c4bed9a827dc37c5102efec6aaa58b22704a93d313"
    },
    {
      "file": "docs/engine/worldweb.md",
      "sha256": "bb539286d5017a810383f85b7d0867581931edddd1ee0ec109fef842ab44b8c4"
    },
    {
      "file": "docs/events/README.md",
      "sha256": "1cb67589ada8ab88bc7279c2ae0c43519900b67c6da2ad5dc241da7811a9e632"
    },
    {
      "file": "docs/meta/class-deeds.md",
      "sha256": "8b2d8daf8ee832fd490959d616c14599986405c2e5c70658db8fa2ff21e7cd12"
    },
    {
      "file": "docs/meta/class-mastery.md",
      "sha256": "9a534adeeb080386132ebdcb77bcbed2a18409d79cf84b9307007659a67950c5"
    },
    {
      "file": "docs/meta/discovery.md",
      "sha256": "361b2d91d725d6701376a258e3374ec4f6dcf27fb87d8bc38cab28eddc9d9eac"
    },
    {
      "file": "docs/meta/gatework.md",
      "sha256": "0b237f19ed70ea5a2fe56ae489dbe057d3e20742c43f4baa130b138549b3c41a"
    },
    {
      "file": "docs/meta/memory-unlocks.md",
      "sha256": "08ea83da94b6a7d42ed7fea8065a40d1028d96ddd282a5030e0b0ca959b29aa4"
    },
    {
      "file": "docs/meta/power-progression.md",
      "sha256": "89578a42728921cd342f2beb8490ee7d90a43270468cf5fad874504cc4960df8"
    },
    {
      "file": "docs/meta/progression-maintenance.md",
      "sha256": "ac569905a66153ce940aa162d83357bfb0f8b12842e2bb2665b12a6614e66097"
    },
    {
      "file": "docs/meta/progression-map.md",
      "sha256": "25c50fef7a4664b15dbce8ecb21af7fb94b6784ef57a7df6e5d90f8d1c360caf"
    },
    {
      "file": "docs/meta/reckoning.md",
      "sha256": "a0f2c84d140369f905d0e1211bd03717d61d091922fa5a1c2c1053ffd0af0a82"
    },
    {
      "file": "docs/releases/v0.2.0.md",
      "sha256": "5a0407b43e4924ed48f0c006aee8361dc0d7679db78b9aca3bb25cc26f824b2b"
    },
    {
      "file": "docs/releases/v0.2.1.md",
      "sha256": "9dbb42a723f7e30f89400e458e9abce28dc2c65728004da4023e397497bcc43b"
    },
    {
      "file": "docs/releases/v0.3.0.md",
      "sha256": "06fd2cbed4a3d4f317dba4a489ea55efa585545f4e620df7316d8b3ee2852b92"
    },
    {
      "file": "docs/releases/v0.4.0.md",
      "sha256": "bc3f1b550be704f8e13df53d00b7bd9fe625231b07e75089e6a490444c0e9292"
    },
    {
      "file": "docs/releases/v0.5.0.md",
      "sha256": "1f9120bb4838a1792d1a8345f7181b41a10ceff5be8b5bfaa7daf69325f1ebd7"
    },
    {
      "file": "docs/releases/v0.6.0.md",
      "sha256": "92658fdf7fbc273c07cc93cbe9051c4399c70930b75873d94ce079a6a2da7f1b"
    },
    {
      "file": "docs/render/README.md",
      "sha256": "939ae79b6247bf81e429d5f33c93a0715f1a2fb083e202c292b8354a4dba799a"
    },
    {
      "file": "docs/render/arachnids.md",
      "sha256": "1b34dfb4e369ef0d7eebc9a5e041cb7bf355a38acb5de2fc572998d592563940"
    },
    {
      "file": "docs/render/avians.md",
      "sha256": "08dbe6c92fc23f2207db808d9c4f6c7284fee0de48a22b6e0bd674ac7d48e973"
    },
    {
      "file": "docs/render/canines.md",
      "sha256": "34d5749c9f4cb6b7a95165fb2f4fdd05b5a74a8eef5812dadc0d4e8581d8eb9d"
    },
    {
      "file": "docs/render/falter.md",
      "sha256": "6a7209c8c3a8dcb3c83f958b15c46bb8f85ddef223a30742e2502bf2559309a8"
    },
    {
      "file": "docs/render/forest-performance.md",
      "sha256": "c71a20f5556ce099692730d1234f5b24a9bc95b81268874c9f5f63709104d882"
    },
    {
      "file": "docs/render/golems.md",
      "sha256": "c3a13f4517416664372cfa51778da057edd22e18eb400e415d3ddcefa584b2d4"
    },
    {
      "file": "docs/render/player-death.md",
      "sha256": "9e69c0e4d69d2b0d637b5e728540b8cdb892763095730e4e962aec082b9b44c0"
    },
    {
      "file": "docs/render/skeletal-mages.md",
      "sha256": "9a087506e7f1c79975a931d91073efdd50a6a75722bcd343b9761f98ff16db4f"
    },
    {
      "file": "docs/render/speech.md",
      "sha256": "264be481e3620b2190593216b0db91b79e22da462838687bfec8ebca14c3a82c"
    },
    {
      "file": "docs/render/stalkers.md",
      "sha256": "a743bd02b8b5482897a08dae6286f22fc5b66277097752c2ecd9ca3abae01acb"
    },
    {
      "file": "docs/render/summons.md",
      "sha256": "215c2b1c6de40b7532d8fe13b74439b993e5b614fb558b4868d2cf62f5b36764"
    },
    {
      "file": "docs/render/undead-courts.md",
      "sha256": "7d42f11f18a8c84155df1e8d8f51c7c664705255b9234a4b8fc72293c7812180"
    },
    {
      "file": "docs/skills-combat-session-brief.md",
      "sha256": "0d46ab25f7004976324db984467fbfd2feea5d0cae7608f87094dbdfd5cb7264"
    },
    {
      "file": "docs/ui/classic-feedback.md",
      "sha256": "180e56a50d64d36635f529976d3ae84c93ca11a796f09f37d47b540edf500cea"
    },
    {
      "file": "docs/ui/conversation-integration.md",
      "sha256": "b0bc62b1b18fed0f1f9915c1a8a77617c191e29ef54a384d0c52dd5ba0966201"
    },
    {
      "file": "docs/ui/cursor-wisp.md",
      "sha256": "0b1fe85b1347143f2c1363b9674641292eb188108d356e83755fd8d0db66766c"
    },
    {
      "file": "docs/ui/dialogue-choices.md",
      "sha256": "58e0d1ef15a7929569109cd942f302411138d036c581ef7ed4959789b2e1dc25"
    },
    {
      "file": "docs/ui/dialogue.md",
      "sha256": "ef696c693bcd6c9fd91e8c69a3cdea278d637a346ed9e5476b26dfaeb302099a"
    },
    {
      "file": "docs/ui/folio.md",
      "sha256": "a2d6b62855c44f2a89c987fbcf0a7cfdceb834c890a566ed049326264ab67135"
    },
    {
      "file": "docs/ui/inventory-pages.md",
      "sha256": "f33340bb76fed2d40bccfae4198fa19f3c668b33134eb9e8fba5d759c4341a82"
    },
    {
      "file": "docs/ui/inventory.md",
      "sha256": "da8391db9866b8ac734dffe83eb6f0d883a77c68445815c869cbf620cb7a1401"
    },
    {
      "file": "docs/ui/loading-screen.md",
      "sha256": "959aa0a0cd20f50e3e88515ba8928fa6ebc5bd5d64f2e80f524d539a222afa29"
    },
    {
      "file": "docs/ui/menu.md",
      "sha256": "e0237c1fb151195149c8398a78d2401ae3920405f1f61f5fc7fc70097eaecef9"
    },
    {
      "file": "docs/ui/quiet-icons.md",
      "sha256": "d8234b8dea2f65f710d0025e4c64d514a2fd6421adebf149e01fead042dd3e57"
    },
    {
      "file": "docs/ui/service-workspace.md",
      "sha256": "b435bf21e822423bc4ac5612c13745d79a91056b6ffa6b59eae3501da5e3435b"
    },
    {
      "file": "docs/ui/skill-icons.md",
      "sha256": "2c65dd5d7a0a169f14b5626d63f887867c3c1d93c978337489d264c4df37b9dc"
    },
    {
      "file": "docs/ui/support-tooltips.md",
      "sha256": "6d169f407226852401e164ec9272ea50e580f02a50989cb56daa18f04cc88893"
    },
    {
      "file": "docs/worldgen/atlas-contracts.md",
      "sha256": "a53f7c0cd525ed7d2bd158285b8cb3c41fc3d8201a4abf98a3ea23c3abc1405b"
    },
    {
      "file": "docs/worldgen/blending.md",
      "sha256": "3ae13f1f67102ef00b66b8fad14c8942d956b189ca318b1c7262b589ffb29b78"
    },
    {
      "file": "docs/worldgen/climate.md",
      "sha256": "0895ea0a9e99bf723840834b8da3b48f96ad7fc070ca97282e4ee21619351c20"
    },
    {
      "file": "docs/worldgen/district-locales.md",
      "sha256": "e72a358345ae91f975fcc388b4c9111896e1464bcea97aaa08a3546a581f26d2"
    },
    {
      "file": "docs/worldgen/exploration-population.md",
      "sha256": "4719d33e5664ba074dfdba1ed999c2e9ba8440ff1e79daa2dcd5ed4e274f31ed"
    },
    {
      "file": "docs/worldgen/exploration.md",
      "sha256": "ae90cfd48eaca37db95a1127482ca2e212ca707c7eba73abad8802af55484a96"
    },
    {
      "file": "docs/worldgen/generated-quest-side-zones.md",
      "sha256": "dfaf8446b622fbf0dc7593116e241f6c66e58e7cf3f8f174023fc044c091eb95"
    },
    {
      "file": "docs/worldgen/geographic-adventure.md",
      "sha256": "59c4ad13053024ffb60f18e897ef10b523b25a0ec57eeb167cbefc330be4e291"
    },
    {
      "file": "docs/worldgen/hierarchical-generation.md",
      "sha256": "9dd4e208d9f29b764a1d66513c9e52d4de55743485f78e513c4650718c3f34b2"
    },
    {
      "file": "docs/worldgen/landforms.md",
      "sha256": "a9b4dbbf0b533d9ad31355c419d2e1de0c051f65a30242a5707432c51f75679f"
    },
    {
      "file": "docs/worldgen/landmark-regions.md",
      "sha256": "fe3a11fd7d2628c29de1d9ae6d2d1e192eba6894f6057099187616661d7bee12"
    },
    {
      "file": "docs/worldgen/locale-composition.md",
      "sha256": "a33a060ca61c5c65e3ac9956996d6eec2064616560722488b980459ed468272a"
    },
    {
      "file": "docs/worldgen/main-content-reconciliation.md",
      "sha256": "7134bc3a9640775c7cde0314168fa965203cb1dc91f9262b5639e31606d9462a"
    },
    {
      "file": "docs/worldgen/melding.md",
      "sha256": "0a1fa8f9436e86310c3612af118d7cf0f6829a8dc0bddf1e541002bfe250f991"
    },
    {
      "file": "docs/worldgen/native-area-birth-composition.md",
      "sha256": "0bd9ce9586422a2ff7b4fa9dedc87480fa1a71d43bac68c5b722d2d31d4258a8"
    },
    {
      "file": "docs/worldgen/native-area-birth-lifetime.md",
      "sha256": "8347fd939fc07bd3be7cbe2a4432ff6594207e6b02e3bb80d5e888c11fa5c427"
    },
    {
      "file": "docs/worldgen/native-area-casting-preparation.md",
      "sha256": "79fa721acf361908e4ff8300d25236038bdfdaafa6d55c163b0e49e9d32d013e"
    },
    {
      "file": "docs/worldgen/native-area-coexistence.md",
      "sha256": "ec098a58a46747b6772ac9b9cfc12c93eed2160696c30b2f7c65a6424f6c3b6a"
    },
    {
      "file": "docs/worldgen/native-area-combat-runtime.md",
      "sha256": "d5fc6eaba1f7d1c128ce1b5761d483d16a9b0fe45a6d4693aac0f7160efaafcb"
    },
    {
      "file": "docs/worldgen/native-area-combat-state.md",
      "sha256": "4e23e290124149d8c767bb4b3db91322a44189efedc683950dc9ff0efcd10858"
    },
    {
      "file": "docs/worldgen/native-area-defense-preparation.md",
      "sha256": "d73fb5def335818de50a4f53cf6bee32ee03672f633bbcb3a986589aa955d135"
    },
    {
      "file": "docs/worldgen/native-area-displacement.md",
      "sha256": "550c745f1c4a2f55be2612dea949b149f2d1d8e1d260fdf2232ef449455a191e"
    },
    {
      "file": "docs/worldgen/native-area-graph-preparation.md",
      "sha256": "a6f3f3d9e394fb576e80d49b04a7e47caf50b91b6d10c28dbe43e5291dc59b39"
    },
    {
      "file": "docs/worldgen/native-area-ground-follow-ups.md",
      "sha256": "85c5c465c8955c513acbb1f1fe43396bd737be6455e2a7b7b211f5ddfcd921f6"
    },
    {
      "file": "docs/worldgen/native-area-kill-aftermath.md",
      "sha256": "bce0c4c59407a083c0e91b5e058961b7dd3063bcdd6b2f95bc09f1802da7ade3"
    },
    {
      "file": "docs/worldgen/native-area-memory.md",
      "sha256": "0ea17e72e1e3841629cc01175ea362607ba3f40aa0137757c47a0a80bab0b36a"
    },
    {
      "file": "docs/worldgen/native-area-objective-watching.md",
      "sha256": "fe99624914b82a03e25926bcdf4e20f0c4b0a84c7e5b569b4a6baf8a288a4dad"
    },
    {
      "file": "docs/worldgen/native-area-progression-storage.md",
      "sha256": "e7431e9a1120643df534c237f36935ce02e633c8e1e7bc5a5b8a0c9c18b1caae"
    },
    {
      "file": "docs/worldgen/native-area-projectiles.md",
      "sha256": "ffba93c9b897207432923374b26337a593ac97414a5007f7f88ca7d58d3b508f"
    },
    {
      "file": "docs/worldgen/native-area-puzzles.md",
      "sha256": "5570fbfcb463798132312223aee456cfc4ab8a0174bc8e1c9e554fa870e6413a"
    },
    {
      "file": "docs/worldgen/native-area-quest-interaction.md",
      "sha256": "323a20c100a74324c9de9c6b177d494ba0318fe67332f62e58f0fa44b840cf42"
    },
    {
      "file": "docs/worldgen/native-area-restoration.md",
      "sha256": "373e9275170c7bbb39502b9cf9c62a574b848f6cacfa7a5cbdfe03091daeb9c0"
    },
    {
      "file": "docs/worldgen/native-area-reward-storage.md",
      "sha256": "36152aee659ecca7a8353354b8c2e419b373a3ed6006c9faecd88633bb7f2542"
    },
    {
      "file": "docs/worldgen/native-area-rewards.md",
      "sha256": "16d0ec4f495b88fc069dc4690482037ed9dbf612a6dd43b63e1d23fec0148571"
    },
    {
      "file": "docs/worldgen/native-area-source-session.md",
      "sha256": "df6d36643afcab673e6406643498a46756a33d0e8f5811031a6b1941ec9ac208"
    },
    {
      "file": "docs/worldgen/native-area-summon-async-boundary.md",
      "sha256": "f27457385f33aa6e8965a3da59e0374793b8ac0207f9e1f37cc66d8cd87f4a48"
    },
    {
      "file": "docs/worldgen/native-area-summon-preparation.md",
      "sha256": "8d045a2e8de247bebd55ee91c550290a2245b7f496570441b448383166a2d279"
    },
    {
      "file": "docs/worldgen/native-area-tethers.md",
      "sha256": "7d90c1826857ccb6a0f0db88b5f75c9b0e9c327185916a7a8ea464f3b0f93006"
    },
    {
      "file": "docs/worldgen/native-browser-hosted-sessions.md",
      "sha256": "c6e49d96dae438c8c5ceb80b9d69ee31a5f5f425395f313e24e957a33cf4b848"
    },
    {
      "file": "docs/worldgen/native-campaign-arrival-parity.md",
      "sha256": "2bee5231e2737880edcd360d782e02e850a6e33a817de5f9fd0469ae728705e4"
    },
    {
      "file": "docs/worldgen/native-caravan-notice-parity.md",
      "sha256": "e745172b6afc09845e1790abeab91806bfd854c744aaed5b34adff5fb8735f5c"
    },
    {
      "file": "docs/worldgen/native-client-browser-entry.md",
      "sha256": "c909e8fb3fb744f9be8be9c79617836373949e7ee92179e4171ac95384c5faf2"
    },
    {
      "file": "docs/worldgen/native-crusade-event-lifetime.md",
      "sha256": "95aa27179f381cb72b4973ccbd5a016b94af844375242c8e20bbcd1d8c4b258f"
    },
    {
      "file": "docs/worldgen/native-dedicated-shards.md",
      "sha256": "e16f39efd7b5945ec50c76400271235aa5c298124327af34a33008cbb9cbc6cd"
    },
    {
      "file": "docs/worldgen/native-geography-catalog.md",
      "sha256": "ed35b5cc33ee45b4fc6f13bafcd707ea746bf5520dd51a5cedcbe95b44fdd270"
    },
    {
      "file": "docs/worldgen/native-host-entry-performance.md",
      "sha256": "2aeecb45f99bd1dc53c42d4404721ac9e760c0f85026108adbe0009d1533149d"
    },
    {
      "file": "docs/worldgen/native-host-proof-closure.md",
      "sha256": "b838deb21913d0a88ebbea0659b571ab76d822022f7e2e158eeb01e51db05677"
    },
    {
      "file": "docs/worldgen/native-hunt-migration.md",
      "sha256": "d92a142124db859b207bab8734a34321f28bfbbdb909e3602600ecbbcdf36c11"
    },
    {
      "file": "docs/worldgen/native-installed-sources.md",
      "sha256": "3d4a8cae68e6b655353737c75d53314153b4a4b98849065fde18fd4d1099d1f6"
    },
    {
      "file": "docs/worldgen/native-main-casting-parity.md",
      "sha256": "95832eeac4013baf12b05eb87979fdc1d96db6165a8b8148cd24db7f2a8e89c7"
    },
    {
      "file": "docs/worldgen/native-main-followup-parity.md",
      "sha256": "4e6a01e013ae9079d4fe05ccfd590cc9314bc5f14212b3f56b5b7f62dd346932"
    },
    {
      "file": "docs/worldgen/native-main-visual-parity.md",
      "sha256": "eb15ccb78c210eda2ea459701dbe8d6ba8b6bb82c3aa85717955d33a191834e4"
    },
    {
      "file": "docs/worldgen/native-realm-gate-renewal.md",
      "sha256": "0eb1b2eac3bbb43374680c2382ad401b6c3fab816af9a5beba7f76e4319998a3"
    },
    {
      "file": "docs/worldgen/native-regional-seating.md",
      "sha256": "9fd93005a2bd7cad9a4a5bdb2eb619d11db6e2cce03ad53fcf891e9ce976f461"
    },
    {
      "file": "docs/worldgen/native-regional.md",
      "sha256": "5a280bab89932132ccbe71bab2fe7422e54272f431d4dd9210ef1307d9f58d2e"
    },
    {
      "file": "docs/worldgen/native-retained-journey-parity.md",
      "sha256": "a2859a3abd9d0519ca1daf3d6b54a83795bff68e4628754a324e8fa2a6c49011"
    },
    {
      "file": "docs/worldgen/native-titan-receipt-parity.md",
      "sha256": "4f6d0f31ce70df42b00d8a780e4daf9cb1ecb1a13ec67653e6556562bb6eedf1"
    },
    {
      "file": "docs/worldgen/neutral-ground.md",
      "sha256": "10bc8445c6261f2e5a63f60362d2ddbe72019071e6c80d4c767c1d8c16aa4ef6"
    },
    {
      "file": "docs/worldgen/seamless-landforms.md",
      "sha256": "3e385a14bfd3bb8ec7af352f577e5c1c01bc4c457a047e7f3465fdbda9c509d9"
    },
    {
      "file": "docs/worldgen/wilderness-paths.md",
      "sha256": "7b93653954d7496ab4572a50ecea9ae343f641699670bafff44a0c0a8bbd3ce1"
    },
    {
      "file": "electron-builder.yml",
      "sha256": "c53ba1234129f29b006328eac3fb8c22cb8c1b6bdd42514eb5e533a2ff2484f6"
    },
    {
      "file": "index.html",
      "sha256": "1c6fbe4a93094570bae969bf579044f99f4a7bb5d19e7ad69b0fc679f09a0d9f"
    },
    {
      "file": "launcher.config.json",
      "sha256": "a63822d95d3b3ae1a737dbb8106cb9b6974c629c7e31d1f328771643c3ada4bc"
    },
    {
      "file": "launcher/branches.cjs",
      "sha256": "718dae6828bd1d4b83f005ebdba09d72ee44a144cc9a573079ff52c043abafac"
    },
    {
      "file": "launcher/launcher.html",
      "sha256": "c4ba5c7af067d2b80dda79e979f08ab6595e5c98732ef0249a32009c1d4d1a11"
    },
    {
      "file": "launcher/main.cjs",
      "sha256": "0eb48011fa3ce406f3a846ba91d5b4e540b6aea164a62f78da6601e2fe02562b"
    },
    {
      "file": "launcher/perf-preload.cjs",
      "sha256": "d1c4a4b60fef5fe2765d275fce1012fc416c2eb3fbc139669ceaf7bcdcd74c3a"
    },
    {
      "file": "launcher/perfdeadman.cjs",
      "sha256": "9570dbe71924058b10ad06e264675d22347d961ba9a390a2ec6f9d233161ec89"
    },
    {
      "file": "launcher/preload.cjs",
      "sha256": "d4e1bd342350ffabb225d024fdf646e83c400d4bd546999852c44c487c6fabdc"
    },
    {
      "file": "launcher/saveWriteOrder.cjs",
      "sha256": "9b2b1b28cb3d69b3c8fd4f8ab4610e9d3b6e3f3a1fe6ba5b9fac696bf3fae2bf"
    },
    {
      "file": "launcher/server.cjs",
      "sha256": "272a2fd428424eb652fc7a50e4b3ff95416ae150fccf18264a4ecd0f0e3e51d7"
    },
    {
      "file": "launcher/updates.cjs",
      "sha256": "aa54b5866793757b30427d3e58545969c7bbcd52c2cdb0af90371663c31b2694"
    },
    {
      "file": "package-lock.json",
      "sha256": "a6e21fd93892ac3d5de75312afa2b5ef9f6c5dbf7ea559b36f571204f4bdfc23"
    },
    {
      "file": "package.json",
      "sha256": "4509cb6e8bee778333a968db4cd6b40e445ec661a9da6be4ce28a9efac38b643"
    },
    {
      "file": "public/favicon.ico",
      "sha256": "b52c8c62f8b6bafe92496143463103e00d427a9523cce9d0d1401b667b376f1b"
    },
    {
      "file": "scripts/afterPack.cjs",
      "sha256": "048e412b79f785edb917ee99b8191c5f4ed37d0bec4544561a44d9d3f3010f80"
    },
    {
      "file": "scripts/ai-review-context.mjs",
      "sha256": "3518ac5115458b539fd88cd67450caefb91198929d8d592fa31093c8a0bca070"
    },
    {
      "file": "scripts/audit-gameplay-text.mjs",
      "sha256": "4c8e2b1e951fa355c4c3fcc34397c600350a1d9df352e81a44c278b516b9773f"
    },
    {
      "file": "scripts/author-passive-routes.ts",
      "sha256": "57e1de92cd0573c25e406a423eede995906a1fd7c6512d4427cfc3c09523fd37"
    },
    {
      "file": "scripts/author-passive-specializations.ts",
      "sha256": "be9847b6d40a5923a5d0a39e76e863ea2fc1ea9b0ca711d795df62dc35d52be0"
    },
    {
      "file": "scripts/author-passive-weave.ts",
      "sha256": "c4ca6a835fbf02f538866c1c767431ba5e8a0202bd1bd134acf5bb535576fa50"
    },
    {
      "file": "scripts/browser-previews.json",
      "sha256": "c79957938beb00ba384be9fb821424a181bbe7cd9d810591430233ea2b5f4aec"
    },
    {
      "file": "scripts/build-browser-previews.mjs",
      "sha256": "a5b1e3516d6405ff2a7a9a86e3c16c4f355eea5bba485bd2e18fa04796a722c0"
    },
    {
      "file": "scripts/build-launcher-branch.mjs",
      "sha256": "dc37adc743c0dea3ecf1173652350a2f3ea0e3f75e20e08b65c1b268b80d107a"
    },
    {
      "file": "scripts/capture-gameplay.cjs",
      "sha256": "a97b53ff1601b6269a366c6370ededb3566dbf6953a75bcdc1eb928206f42d16"
    },
    {
      "file": "scripts/capture-skill-clips.cjs",
      "sha256": "60bd6a4ed5a64a8c55a66814addf9da57336390e9193de63a238a82e372b4832"
    },
    {
      "file": "scripts/cursor-preview/index.html",
      "sha256": "789306ac19e666b5ae8420836adbd8dd12d7f1feac6332e7b57647fa02d8c35d"
    },
    {
      "file": "scripts/cursor-preview/preview.ts",
      "sha256": "4b82b80a480da0dc6c9d3e60988ac9f2850bd8ba641ce5cceb441af4ef98d126"
    },
    {
      "file": "scripts/cursor-preview/vite.config.ts",
      "sha256": "71ae93cea95bb073eda50bb16e83e599e8d3a7ee72669f62c3eefd5264ab3c53"
    },
    {
      "file": "scripts/encode-film.mjs",
      "sha256": "998bd8acb80c8cb2e88136bafa181c4b978128d0ce9e715c707c80bc300c9fdf"
    },
    {
      "file": "scripts/export-web-data.ts",
      "sha256": "4da7e1d641d1581676f5a448f9314f101d8fd25f1a4fde3ebe4dd54f548ea52a"
    },
    {
      "file": "scripts/fetch-site-media.mjs",
      "sha256": "1d4ff084662517a7d34cfbccebfa903d8637c95db9f7250355e87ee29438bc5c"
    },
    {
      "file": "scripts/loading-frame-plugin.ts",
      "sha256": "1e4ed120db220b69aafbbe7bee55414757f4197d492abe197300fc2e73b1a773"
    },
    {
      "file": "scripts/make-build-info.mjs",
      "sha256": "7718be2df6f0cb4323d4903c24032481b71c67211a2ac9b907f21e6e3b4f0103"
    },
    {
      "file": "scripts/make-icon.mjs",
      "sha256": "b68578d4af765f51a8902d26c108f2f5f043ea8e66623b5537868ddf50aa4ec3"
    },
    {
      "file": "scripts/ownership-diff.mjs",
      "sha256": "92e76da4085b9b02226bfbfedc8339acd5cf211a1103542962fcbb41f9445e60"
    },
    {
      "file": "scripts/ownership-gate.mjs",
      "sha256": "b18efbc0978f1c1dd855485a2788ffc5b2da6f105323fe1d65fd98722be0f7d2"
    },
    {
      "file": "scripts/progression/current-paths.cjs",
      "sha256": "e3aab7509bb9775a51429258793bd29f0522bb1780237f5f9464e70922bad965"
    },
    {
      "file": "scripts/progression/export.ts",
      "sha256": "9f2be30cd59d3daa9a6eb690833a4f5f5315c5a5666e74401f87209e426a252e"
    },
    {
      "file": "scripts/progression/overview.cjs",
      "sha256": "28cf446bbfc943b8c14a0bb840cfc206eb634f2836a313864537a85967b2409f"
    },
    {
      "file": "scripts/progression/overview.template.html",
      "sha256": "0db702d2af69f192bcf4d58dac953a1250c8e82f58c34a8e7ebfd8db3fc966eb"
    },
    {
      "file": "scripts/progression/paths.cjs",
      "sha256": "96ec05a904b86d1383367180296621e40321241adba7256c2c0914882829a432"
    },
    {
      "file": "scripts/progression/paths.template.html",
      "sha256": "09803915a2cd3e3db4c1ed008a511f4eca74f7136e057b51919ca0d3d2cb7a64"
    },
    {
      "file": "scripts/progression/refresh.cjs",
      "sha256": "576fc900790e677cbbed5b0a7c6179974a7265a141566d6b67ecd89793aaadde"
    },
    {
      "file": "scripts/progression/reviewed-sources.json",
      "sha256": "58618ca4003f9aa05013b2c70032a73b8db02c42719f7e5bd5cdb8f2aae4e7e2"
    },
    {
      "file": "scripts/progression/verify-paths-ui.cjs",
      "sha256": "7c06221f5931c0bace2a0cf5b9818ea4052eb796e6b1ea877bf2fd97af355069"
    },
    {
      "file": "scripts/progression/verify-ui.cjs",
      "sha256": "06b00784678e1427a3ec7d6ab90bb2983305181b2b95ddd71d5a9919313b2599"
    },
    {
      "file": "scripts/publish-launcher-branch.mjs",
      "sha256": "ea88889443bdb7defc7489c33589f0c5b60669f8e42c53cae9cc87b80ddc3a4f"
    },
    {
      "file": "scripts/publish-site-media.mjs",
      "sha256": "0c169b353cf2853788fed57d886a1e97819a75b5b8eeff74dd14e367a32cc197"
    },
    {
      "file": "scripts/refine-passive-clusters.ts",
      "sha256": "1b08f21c341f7f6c57c861a234ae1ebddd6ea50edf0a74d50a657dbade99563e"
    },
    {
      "file": "scripts/smoke-launcher-branch.cjs",
      "sha256": "2f0e2dd452f12a2243e89cb682110f77d6b035306d6cf4ccc996899036fc4da2"
    },
    {
      "file": "scripts/steamdeck-install.sh",
      "sha256": "972c076cdc7771c5f728d218a8adc9f3665d852a2f63c2cf705ab0f4b0631656"
    },
    {
      "file": "scripts/test-browser-previews.mjs",
      "sha256": "0f997d9b12e4a023c7b2c363a17b8da016b5d6b2ff9d58134d5af8649b415a06"
    },
    {
      "file": "scripts/test-launcher-branches.mjs",
      "sha256": "e1e972a2e9e8797772215c8ecba4532edcc7917457e9040946374694bd6e0f6c"
    },
    {
      "file": "scripts/test-launcher-updates.mjs",
      "sha256": "307313e43bab738b126c53b36b1373d17a8e727cca7e8e9c240d931cb00faf49"
    },
    {
      "file": "scripts/test-ownership-gate.mjs",
      "sha256": "5497810d149e6d4a10091b6feef5c4b10357f9749beae49029eb87c532fd9743"
    },
    {
      "file": "server/corpses.ts",
      "sha256": "916f3d66adc0a9b3090bc368b12fba2267f4c521aaa88b53f8f9f9c20cd58ace"
    },
    {
      "file": "server/massCompiler.ts",
      "sha256": "01b3ceeb8890ee7ef71ad230573d12b96c0c26177edbb3435f1384dc0d96472e"
    },
    {
      "file": "server/massWorkerBootstrap.mjs",
      "sha256": "8daf95b5fa06c72c3ffb407a9aa3097514f027bd0872e432df8183c75994a42c"
    },
    {
      "file": "server/massWorkers.ts",
      "sha256": "44c71ab1f050c90303eca473b57e08ce549a65e2d1abc3474594ef74030942fb"
    },
    {
      "file": "server/muster.ts",
      "sha256": "95c4a357235b2af0364841c3df80a317cb0dfba9d06f3f81676fa034a5edfa27"
    },
    {
      "file": "server/musterAreas.ts",
      "sha256": "9771b9675a29ca1a01d3cdeef66a637f64ed11d7057697a77d243a9261e6b40f"
    },
    {
      "file": "server/nativeShardFrames.ts",
      "sha256": "1da068fd5ac46a45046ee3c10e563ec1e6cb7fd96ee5d38764b9249a856e46ca"
    },
    {
      "file": "server/nativeShardHost.ts",
      "sha256": "a9e3743f217950c44f38c4d1c9085b59242f9c0f725b13d9a630e97f9779a596"
    },
    {
      "file": "server/nativeShardMuster.ts",
      "sha256": "63b8a27919888e02a43a124a1a9eca8dd9d84704221276d5c75bfcef9ed4db38"
    },
    {
      "file": "server/nativeShardRuntime.ts",
      "sha256": "4a4bbf7bbca1b3a8fe4722c177acdd75daed9b0d3a4fd058ecb476224f3144ce"
    },
    {
      "file": "server/nativeShardSave.ts",
      "sha256": "2fbdf0df04ecad4e81b7a4261603ab22839a28c182d0781bee4c5f2b4ea2cef5"
    },
    {
      "file": "server/nativeShardSeats.ts",
      "sha256": "df3ecb5cc5957388135319204212577e88172830637c0ee512b0ad79e57c2f4f"
    },
    {
      "file": "server/nativeVesselAreas.ts",
      "sha256": "3e117d20a3a1fc2ef01f6a8443b8bf49fce26b7af69b1aa742fc26f7b4fa9b5b"
    },
    {
      "file": "server/party.ts",
      "sha256": "e76cc3a1bbbe4995c2d203283b84bf91c8984c4d9b0d43023031d28640f71757"
    },
    {
      "file": "server/shard.ts",
      "sha256": "583e2b94445bb8356207ef813a34fb9278286f9b044e80d335c539cc81043e86"
    },
    {
      "file": "server/shardHost.ts",
      "sha256": "c68ff10fb98613b10375303a5ced657f0fc276999860a0033a88ca3cafc8e0f2"
    },
    {
      "file": "server/shardTransport.ts",
      "sha256": "5bde6ae3f270072b148e7514abdbb39c930f110ddb45b57e1af3b755e9c842ce"
    },
    {
      "file": "server/simUnits.ts",
      "sha256": "d7ee9a7fbd4b9b1d59c166b29500312eddf1102c5ba99be52e25db59dd535b27"
    },
    {
      "file": "server/vessel.ts",
      "sha256": "85ef2228a6cb8a81898c7ef9b8820557e725dd9ba381779513829fc24f3e09bf"
    },
    {
      "file": "server/wildsSave.ts",
      "sha256": "a68db81ea39c2e6b1e5a4ea292fb4702a7972fe1ddeb1fb8b219eb58c7664f18"
    },
    {
      "file": "server/wireDiet.ts",
      "sha256": "007c3e22832d896e775942be2a963d110ced68e2a5d34425c33054ba520666b5"
    },
    {
      "file": "showcase.html",
      "sha256": "15bbf4c1eecb63b6fa0e83785760789df34e0ab12f19670c8bf133dcebd17cb7"
    },
    {
      "file": "site/assets/abyss.js",
      "sha256": "fe686a616e2d699550f963cd67fa9869e75da9f0d6f6aa6186eb228df18876fb"
    },
    {
      "file": "site/assets/cinema-theater.js",
      "sha256": "0216cd52cd1748eb62b41e8df44917144d411b7b3790f316237628fe2decd8cd"
    },
    {
      "file": "site/assets/cinema.js",
      "sha256": "9410586f4912c81951512f99ed75e763d04ed9232db48a3f8dd193fb3fdc81cc"
    },
    {
      "file": "site/assets/database.js",
      "sha256": "63ed21cc670243f9b612e4ec697432d7d69658fe829a86657c66d11710996b46"
    },
    {
      "file": "site/assets/decks.js",
      "sha256": "86a0e0f8cb30fdd741b491ab4973a4b29d0bb4446262b06182956d8c07265686"
    },
    {
      "file": "site/assets/favicon.ico",
      "sha256": "b52c8c62f8b6bafe92496143463103e00d427a9523cce9d0d1401b667b376f1b"
    },
    {
      "file": "site/assets/guide-copy.js",
      "sha256": "ac74f14f15163ef9d8b8c83e970e960c4f573df4813d1496b6df4f67d75c0650"
    },
    {
      "file": "site/assets/nav.js",
      "sha256": "afe587575ae8c935b453e183d6a980765f556a8d618f80ba59e6efb969644fb9"
    },
    {
      "file": "site/assets/sectionnav.js",
      "sha256": "256cd6f66b820adc0000ac67674881c97532e93ac8046e0564017c50ee6c32f1"
    },
    {
      "file": "site/assets/showcase.js",
      "sha256": "82a87b020f550405ff21893302b6a158cfea6dda928f1a00773e84fa006efedc"
    },
    {
      "file": "site/assets/site.css",
      "sha256": "26ceda8c401bcfe73c256610af4daa1c82d00a3a6fa686d81911ff1c339d9d54"
    },
    {
      "file": "site/assets/tree.js",
      "sha256": "02aec23c1eb41c7ec30b6ae0ea8328c46f0d72c91d3f01818a119475f71bb48a"
    },
    {
      "file": "site/data/.gitignore",
      "sha256": "0d0ea782f42acd9b7113d28186d5fa224c69d0aeb3ae35ba50e64bd3356bf92b"
    },
    {
      "file": "site/database/index.html",
      "sha256": "1c0f5bbab5ecc24097979aef25cec8f843d1c7b1d6067c322ad085ba0154ba4b"
    },
    {
      "file": "site/index.html",
      "sha256": "abf61e19d28f4120a083d6f2f55f9a68b4331de37db2bc0c11e323c9a775193d"
    },
    {
      "file": "site/media/announcement-v2/narration.en.vtt",
      "sha256": "e3affaf411db3f7a814492e11a200a9dcffbe42c5476de8d64a3f23d3204db06"
    },
    {
      "file": "site/media/announcement-v3/narration.en.vtt",
      "sha256": "3395af9274d9d1e0eb3a381ed4ca76e0c6827418d5a2efde6b0a8ff95c37c5d0"
    },
    {
      "file": "site/media/announcement/narration.en.vtt",
      "sha256": "bdb8ba5550e10aa7c101375a964a79f589c0943969d2ec3cba8986d8410424fd"
    },
    {
      "file": "site/media/manifest.json",
      "sha256": "375598a2744eaeabc45a94a1f758e994c0a2f3a8a94416c5a62d4b2719c0b7a0"
    },
    {
      "file": "site/systems/index.html",
      "sha256": "08d432af751b54fbf172fa9a70fa92dbcadc2b71386ea3d92e1149c23eb4e061"
    },
    {
      "file": "site/tree/index.html",
      "sha256": "cfb2a91b051c52dfc922f2699c53a39855922f9210dd0598a6057aa397642fda"
    },
    {
      "file": "src/agent/agent.ts",
      "sha256": "584b0cf888db6ad7310c2b1a8585ae538ce17a6a7c1799f812a81cfe2d49ec08"
    },
    {
      "file": "src/agent/kit.ts",
      "sha256": "feabac10f73fdc2b8c27218e04d9c2164d8340bd6e9758b2d81dba252b1b486e"
    },
    {
      "file": "src/agent/perception.ts",
      "sha256": "f40f1ae37d1862c44a60502b45929ba9a6aa668b9d077424cb2079886f616027"
    },
    {
      "file": "src/buildProfile.ts",
      "sha256": "b26670ae991e4435413474cd22e3153458b171ec6ec684889894d1aad45fb608"
    },
    {
      "file": "src/config.ts",
      "sha256": "4d00a37f54d5e4938943b9434a165c3ab8fa383bb97c55b6e6c3360de82a6932"
    },
    {
      "file": "src/core/cursor.ts",
      "sha256": "bf23abeb79a10077c57051caa7d4ad365719de09cf540cf62ff336d053de1ec1"
    },
    {
      "file": "src/core/cursorGlimmer.ts",
      "sha256": "a2cfa8357052a71ee136a8ce23f6c1e9b239f08efac15fbda27c13b62eb26ed2"
    },
    {
      "file": "src/core/cursorMotion.ts",
      "sha256": "6465aebb76342b321dd58fc3e6acae13323f6b15fc6ef9d4eb858148d57af3a8"
    },
    {
      "file": "src/core/cursorWisp.ts",
      "sha256": "dab12c6bd3eb04b51cb2a2c75ee8cb86a987150c0dc51c193bac9ec263dc8ba1"
    },
    {
      "file": "src/core/gamepad.ts",
      "sha256": "a8f83cf2e47540dd2fe0d884b309e1019d993d75512e5d14fcb98d2b49455b57"
    },
    {
      "file": "src/core/input.ts",
      "sha256": "ae01b99da03b64bcd0b70e053e7e5429b8a139bfaf6d8878fe39ccf98b392e36"
    },
    {
      "file": "src/core/math.ts",
      "sha256": "61879e2db45a922543fe26fe1e5cfb34cf7d472612e13f62085ed9f6e644c57b"
    },
    {
      "file": "src/core/rng.ts",
      "sha256": "56c80fddef28721e7196928fd1f097b1b8d0cf5b080f21ef309ea2eff692c0fd"
    },
    {
      "file": "src/core/scriptedInput.ts",
      "sha256": "fcf46c7e26143a9e30263752b6c672d6fc25f34de768ad9c7b5a61ca577af155"
    },
    {
      "file": "src/data/abyssGlyphs.ts",
      "sha256": "b306f4248eafc5b8143a2a345486f7ea189b212a17d841c731a574d066df68be"
    },
    {
      "file": "src/data/abyssLooks.ts",
      "sha256": "01545fd7a007ee44b607831238e41683536660a5c87b0ce6a64ad9de6f3f57d9"
    },
    {
      "file": "src/data/abyssMonsters.ts",
      "sha256": "ed25a82cbe3f61d4ea0defa69f3e4d3e6cb01590cc90cf15fa646f63039ea2d2"
    },
    {
      "file": "src/data/adventureGrammar.ts",
      "sha256": "2ed3f4d20ed9075ac500e53cf0317bdd9dc2d74f26f726afe264e21b3afbf7c3"
    },
    {
      "file": "src/data/adventureLocales.ts",
      "sha256": "14d43ee0e3093c2fcb1d7eb0fe1aa6347a4a7474defaa2c85319445b2ee9080a"
    },
    {
      "file": "src/data/afflictionCues.ts",
      "sha256": "5778b814ab4dd33a7ae462a5215d7ade532f42f839989d1c0f94786f1c2e8b13"
    },
    {
      "file": "src/data/agent.ts",
      "sha256": "55fc395d3926b423661675700a4c520b38216b0744249d1c2016525a0233ac29"
    },
    {
      "file": "src/data/anatomyCues.ts",
      "sha256": "87ba88d87a6eca8d797383afb6789c64f625221cfb67f988bf895349ffff0c5f"
    },
    {
      "file": "src/data/annexes.ts",
      "sha256": "228a5cdf6ee7d3bf02fc034b4885509f063b25aca5d3e8506987b2204f8330dc"
    },
    {
      "file": "src/data/arachnidCosmetics.ts",
      "sha256": "7928ef7d05e138dce6e2e14bf63b60b136b8eeb29c9f6376f84e8d5f0213c831"
    },
    {
      "file": "src/data/arachnidGlyphs.ts",
      "sha256": "6e9b10b1826545c031af7904c0d87bde56b3ee1c0c33cf0a3b144136f38d5061"
    },
    {
      "file": "src/data/arachnidLooks.ts",
      "sha256": "c033670d8c2cc8918742d3eb3eddbce785a3d6f510dff303841d7e9a8b689c03"
    },
    {
      "file": "src/data/arenaBossHabitats.ts",
      "sha256": "c74042a1ab6b435a858eab47bfb42b17f5df5e7c8fcae3eba672fe0ba35ea4a7"
    },
    {
      "file": "src/data/arenaBossTilesets.ts",
      "sha256": "6897ff6d7a1f552c3ca7fc8887775cfc88a79847d89d9029d0970858596ee928"
    },
    {
      "file": "src/data/arenaBosses.ts",
      "sha256": "837c61f6b3a0e4c6cf40d89c393b5b4d54d7c3192bef6ef1eca88d02945e819a"
    },
    {
      "file": "src/data/arenas.ts",
      "sha256": "94aff60ce668c3049e12a6b8e4159baa5b44f38516851d534633f906e0341699"
    },
    {
      "file": "src/data/armedCues.ts",
      "sha256": "2caf263de33ddd37827991183aaba12bff778e1a66771a18f9d4770cadf7425a"
    },
    {
      "file": "src/data/assaultTree.ts",
      "sha256": "508cbb076f35fd7f22885da614be38e9b83be79a51c2f655706c3ff64dff901e"
    },
    {
      "file": "src/data/atlasFeatures.ts",
      "sha256": "3923804494a3f2902e7690a14dbbf854745c7c3eb289b3c04866730e381b269f"
    },
    {
      "file": "src/data/attunements.ts",
      "sha256": "db24b5fc08faf1d0ad7571254c00b929b11e5fd8f488d342fb39f20f8f6c9f7a"
    },
    {
      "file": "src/data/auroras.ts",
      "sha256": "fc7cf91614a6d0405d680d454b43d8fc3aba303039d467933c261cd17aa0a956"
    },
    {
      "file": "src/data/authoredMaps.ts",
      "sha256": "48246e75e75c874851cde37859e98ebeb8203b1f4c3b0bf9bddde393486cec3f"
    },
    {
      "file": "src/data/avianCosmetics.ts",
      "sha256": "de623db9ad96fc8dd9f9a91b4e07b753cbbd9cbc281d9798a06091bdcc80346c"
    },
    {
      "file": "src/data/avianGlyphs.ts",
      "sha256": "9840aa6495b8634db0ce6971a8ea641b4ab495fb6725ccdcdbc24574dec392cb"
    },
    {
      "file": "src/data/avianLooks.ts",
      "sha256": "450d6f973d231ae45d03ea44dda3bb149bb32b774018f5c8a01e1277a7233cf4"
    },
    {
      "file": "src/data/bastionStarterTrees.ts",
      "sha256": "cb82cb868f7f93fa9879c0716210d0d44b593ea1c35d3ea96b19a4ac10b22134"
    },
    {
      "file": "src/data/beacons.ts",
      "sha256": "606ad442e1707e8bb202d946c71d074fa8308992d5da6d14d82634b8e15859b4"
    },
    {
      "file": "src/data/beastFamilies.ts",
      "sha256": "5b201b71a3a32284b5179a1199f2fd6578d488c25de001716df2fe1635af8b0b"
    },
    {
      "file": "src/data/bestiary.ts",
      "sha256": "fb206d4b7eb399da46b10e51c6e37f76ceab9887fa59258716d9d953f2c00054"
    },
    {
      "file": "src/data/bodyAction.ts",
      "sha256": "2ad8d129b8236eca3a8f383983a738dfa0a1c489b4dcc43bc9e0216a786e6fc7"
    },
    {
      "file": "src/data/bodyWalk.ts",
      "sha256": "1934d62d23d37e6f7a6189148dabb795e1ce0fcea7c728224a00a9ceace5486e"
    },
    {
      "file": "src/data/bondStarterTrees.ts",
      "sha256": "328f429cab41267e37a3aec6bc9a88c4bc11006dbef47fee8f863719ef7265a4"
    },
    {
      "file": "src/data/boroughs.ts",
      "sha256": "eb61e83ec38a85ba2664338faac8075c7dadb4f3e0c78f93f714af5afb7f86df"
    },
    {
      "file": "src/data/boundaryGates.ts",
      "sha256": "1fbb8c440b6b0b03e481f62a5cbe91e793a818c1aaa8f2ae5e80428a8c811967"
    },
    {
      "file": "src/data/bounties.ts",
      "sha256": "a237e19e27c1995fec22f2f94aec533849ae4b56b724060c1c091808b7efcfb4"
    },
    {
      "file": "src/data/bountyExpeditions.ts",
      "sha256": "1241a2114628c221f414e5a8f604a533678f553e5ada6e57d573ab837acd45b7"
    },
    {
      "file": "src/data/bountyJourneys.ts",
      "sha256": "428668fb433d9e5750a4fecb0bf409201e66566e5250e639c07b38e2d0207fd9"
    },
    {
      "file": "src/data/bountyRewards.ts",
      "sha256": "350ac4a82ac57e26908897b757767288ada44ed87f563b3dad40ae32def70261"
    },
    {
      "file": "src/data/bountyboard.ts",
      "sha256": "9f2240b56e75c9bd22f9d9318e1889504a8f6504069b9499910345e202c7d2fa"
    },
    {
      "file": "src/data/brandt.ts",
      "sha256": "7a80d8b94fddf7385570128a6cec05af52affff601e4fc183730757fee2f5585"
    },
    {
      "file": "src/data/canineCosmetics.ts",
      "sha256": "59a4ba16246b85db0a36662d37d36035e71046461cf8301d74d3e96f8e931839"
    },
    {
      "file": "src/data/canineGlyphs.ts",
      "sha256": "7601d04cb2585d4f04ff6e400389a469314748a130a8428883166f8f5be6dae1"
    },
    {
      "file": "src/data/canineLooks.ts",
      "sha256": "6d083a4c7fa06c90311485ad42aa091ee7589abb7b2f219e08b52e4766eea76e"
    },
    {
      "file": "src/data/caravan.ts",
      "sha256": "7d8a8292b941688a08f22deb117c139ae24d736122c024ec48284d9b200d3e51"
    },
    {
      "file": "src/data/casterGlyphs.ts",
      "sha256": "f1f9b10e0eeacb0256e3d230e9f09cd964dde127fa2d67bc371a2847368da154"
    },
    {
      "file": "src/data/casterLooks.ts",
      "sha256": "a3a706296da24dc342f80190c58fb1a95879e797ebca1666dccefb70335dfd10"
    },
    {
      "file": "src/data/casterMonsters.ts",
      "sha256": "9b2432a077d166a880a53157cfa0b5f9741db4ff740bfb2e6afd7f52aa335101"
    },
    {
      "file": "src/data/castingCues.ts",
      "sha256": "a93fc775260440fdc1c9de5fd019f659bba0dc53d9bc581fa9fef2cdfd640093"
    },
    {
      "file": "src/data/catacombs.ts",
      "sha256": "c23d13270e2074de4c0a26d0d62966342ddd89c564ba55b58e71885ed36a3d22"
    },
    {
      "file": "src/data/cistern.ts",
      "sha256": "c0b610cf074a8c310da295072cd779fa517025e6500eeea1f83892053a449030"
    },
    {
      "file": "src/data/classTiers.ts",
      "sha256": "c7966e855ef0724d63593cc409cc27aff765ec9ae4060b343a4d9bdd89463c26"
    },
    {
      "file": "src/data/classdeeds.ts",
      "sha256": "dbb962e9b45825a52e3f100f1a76b2bced01068b7cef4e0ef72ace4d9cc1ee9d"
    },
    {
      "file": "src/data/classes.ts",
      "sha256": "509cdc843de3694e0a62e65a2f7fec3f1385a17343c427dd668ff31d3e36a981"
    },
    {
      "file": "src/data/cleaveTree.ts",
      "sha256": "ac34a3ee3f83012c93ba2a40bc5f91f8a11aaca64386712950a03fd5250c4afd"
    },
    {
      "file": "src/data/clusters.ts",
      "sha256": "d549a673a9c5012443dec2e314dfba12d26e5de4cabb71994dc507880adfa587"
    },
    {
      "file": "src/data/combatCues.ts",
      "sha256": "fa5de2b8b6b49b09935cf6370d7625e7370073b6db42fc5820d85a745f32f242"
    },
    {
      "file": "src/data/combatReadability.ts",
      "sha256": "2c53be8449eb6a099cb8a8c2f6521a0cbdaa54c4948bdbe47d30dd859311b7a7"
    },
    {
      "file": "src/data/comboConditions.ts",
      "sha256": "a45b67cbfc5f74255ccd22ac8755193c1ccc3f916f2410ac5abeadfebfda38c1"
    },
    {
      "file": "src/data/comboCues.ts",
      "sha256": "9c1935762a258dd99c0c58978563ade2d3a58ee5f37f4b78ded692403adc3632"
    },
    {
      "file": "src/data/combos.ts",
      "sha256": "5a46b99558bd2b7f073380e014fa935e1d8b5b1e696eb2fb0d4c88a324e9393c"
    },
    {
      "file": "src/data/commanders.ts",
      "sha256": "5539988577465593ae3fe5ac7022b67003baba43733cb441ead1cfe6898cd1f9"
    },
    {
      "file": "src/data/companionCues.ts",
      "sha256": "df3cc6cd16b23b12a28a50618f4b7f757086efc4e773ab0dcb6c26bfa9a18ef9"
    },
    {
      "file": "src/data/companionSkills.ts",
      "sha256": "bfa28efe4e605b7171955a95387e99b1221204369806307ca1f465d59ea9d1a5"
    },
    {
      "file": "src/data/companionStances.ts",
      "sha256": "612c95af3a7e8696f5d186757a76cb050ee25cfc04314876fb9bfe5bde975cf2"
    },
    {
      "file": "src/data/complexLocales.ts",
      "sha256": "2244a243a0faa43f2251d133f990f441792b4a481c01e1317020929cb12261fc"
    },
    {
      "file": "src/data/compositions.ts",
      "sha256": "9f1d0c6942654b0a925dbceac0b40401b02f51e1965cefe20dc2d545eba3bb90"
    },
    {
      "file": "src/data/conjury.ts",
      "sha256": "838a8eb29fa364903e9fe9d40f1ac656801c250fe6291c6ca778717602446f9b"
    },
    {
      "file": "src/data/containerloot.ts",
      "sha256": "5311ccc67f4ecfcc84dc7b4622fe58d33ca320e0cb3d71c7194ba448ee4c1df4"
    },
    {
      "file": "src/data/containers.ts",
      "sha256": "d2edff3776ea3bcdf6ba8412f69364e988fd212549f0f4cf7e35a3afc57f21d7"
    },
    {
      "file": "src/data/controlStarterTrees.ts",
      "sha256": "1894619aa0bbac27b5475653fdf4da908ea92bc496fc8b9c3218991f6b76effc"
    },
    {
      "file": "src/data/coop.ts",
      "sha256": "56ba73cc40be92a714a3f9575bd6734a90df8fce6f956dafbe2e25cf0f7e294f"
    },
    {
      "file": "src/data/cosmeticExpansionGlyphs.ts",
      "sha256": "543b15d61ba08e1eba1bdf76b9da5d01af02c857a7b88dca0b54a5c37bbb1c62"
    },
    {
      "file": "src/data/cosmeticExpansionModels.ts",
      "sha256": "94b260db90267aee26e00a3022096192b2ae59d0941ef7d4c74a79e47458db45"
    },
    {
      "file": "src/data/cosmeticGlyphs.ts",
      "sha256": "68dd4a230174eb0da9945b6a5077700653f93ea12a71b3b732d6f8ed9ea09912"
    },
    {
      "file": "src/data/cosmeticModels.ts",
      "sha256": "6328efcc14b9a24c0c1bb17edb82f70ad38d4952076fc8b0a5f3d1d62de13b4f"
    },
    {
      "file": "src/data/cosmeticStyles.ts",
      "sha256": "41a0b2764b61519c9bb05b6912c11f3b0ba156853e2ee5109bab04864111a268"
    },
    {
      "file": "src/data/cosmetics.ts",
      "sha256": "d31281a4284427999b6a1098355dc030077db443b21cf7aef42a42e4ac0800a6"
    },
    {
      "file": "src/data/couch.ts",
      "sha256": "090b4eac5a57f43cb6295d235c0f6c9a5bd39f4438800031c9cbae3c7a203faa"
    },
    {
      "file": "src/data/courtGlyphs.ts",
      "sha256": "d30a1c887f0e25c6cb371a298dc677075dc812f08a5e15575ac6e772c8ebac15"
    },
    {
      "file": "src/data/courtLooks.ts",
      "sha256": "ea7a934c5a03e443cbacc266a9ac30ed140f86d4be2818435788fc40e3fc1412"
    },
    {
      "file": "src/data/courtMonsters.ts",
      "sha256": "2f6928e48fed357f361f22e3a694e6914154538b619e20220fc3c97c6ec9d517"
    },
    {
      "file": "src/data/creepers.ts",
      "sha256": "35bf36244136906ea7098d2b30920051e9884f65fcb33a45b755fd330927d8d8"
    },
    {
      "file": "src/data/creeps.ts",
      "sha256": "f716fdd5eb77dfb25be17e9b35513653e20a48a4f294f62cf280d97f1d6dbf66"
    },
    {
      "file": "src/data/deathPresentation.ts",
      "sha256": "d929aa41f610906a59dfbeaf0317351119e827f31a84303e8e404fa7e9793eea"
    },
    {
      "file": "src/data/defenseCues.ts",
      "sha256": "121489c008b42215d84976bace2ef63e914f723dcaf9ee0c0bdaa0fe0a722cc8"
    },
    {
      "file": "src/data/demonGlyphs.ts",
      "sha256": "c53b7e9c1cdd8595dc3ca0a3921a47f8baa051b0500f091577e90c3fd49c350c"
    },
    {
      "file": "src/data/demonLooks.ts",
      "sha256": "2638267a12c73a9ffef7bbca986b0ed8e550155779cdbcd4637c0d3388e5e011"
    },
    {
      "file": "src/data/devotedStarterTrees.ts",
      "sha256": "b3af8a631dc2b63e23eab55a0704765dc5e4669ecbc0386f77cb7a27fa654b9f"
    },
    {
      "file": "src/data/dialogue.ts",
      "sha256": "ba28d4eedcda2292d6ec1e0fdec9ae06c499df7d5c35f6926c761b1f4d6decb5"
    },
    {
      "file": "src/data/digsites.ts",
      "sha256": "2c0528b9fba02d673bae1a45dfbb0353bb7110d2d6e731990f0e2adce651df27"
    },
    {
      "file": "src/data/disciplineStarterTrees.ts",
      "sha256": "744f3118b83530bfdd7b7c1dbb09d8b522d47d9880fa923f0c9af6a7c2ca6108"
    },
    {
      "file": "src/data/doodadVisuals.ts",
      "sha256": "87fa0fc153dd9714b4c9813d57c093829d004cafd39f5ae43c01520b18a0f593"
    },
    {
      "file": "src/data/duelistStarterTrees.ts",
      "sha256": "552ef47f63998911436a586d5f2eec4bd77504aa292011d2310ab3899571eb8b"
    },
    {
      "file": "src/data/encounterAdventurers.ts",
      "sha256": "e6441111337ec028fc403ff24c6d2f12d1b353e2fa6242cd906174f50dcf5e08"
    },
    {
      "file": "src/data/encounterGroups.ts",
      "sha256": "69782c25c8752dd9d248ee633823b4b9ed3d5dd27df2be3e513a4a063745b70e"
    },
    {
      "file": "src/data/encounterTactics.ts",
      "sha256": "775bb2cc5a5ef6dc8274c2311f08a5392a866de2275c9c3eb18ecd9d8c8e0f9a"
    },
    {
      "file": "src/data/essences.ts",
      "sha256": "5c33087be8a8580132b44b78eb949acc605aef06da63c43397db7c84a94161fb"
    },
    {
      "file": "src/data/exhaustionCues.ts",
      "sha256": "ba84a91a73bf1202587347b96a55f8efa0a729cea55cf1009e1ad8669aef6958"
    },
    {
      "file": "src/data/explorationLocales.ts",
      "sha256": "d709f426f2b8d49e80fe8ccdec2ff785220d5319d36fbefb8944297b6b242e91"
    },
    {
      "file": "src/data/extraction.ts",
      "sha256": "ce72cb94b56570c6d06fc066c1b7084a7325497ea51c8feef71d85f9aad6df98"
    },
    {
      "file": "src/data/featureActivities.ts",
      "sha256": "6b840a3c1fe95357a8c75e6ee0a8ce396b8a06e022c1e02cbb583daa89e026e8"
    },
    {
      "file": "src/data/feedingCues.ts",
      "sha256": "90d4e1ea348d94c2f723583cb4c913ae09cc27a99bb447058f54ff30570b9f56"
    },
    {
      "file": "src/data/flaskSkills.ts",
      "sha256": "ab925e6fed6fa7922383a859477684a8c5bfa1c8f48d342f0b47cf295b3dff23"
    },
    {
      "file": "src/data/flaskTrees.ts",
      "sha256": "558e8f87db67044464a0959c1936aeb8a527d884195662629ade76810e3b50de"
    },
    {
      "file": "src/data/fog.ts",
      "sha256": "ee660c721842ca49b700f97edcb9ffda6431e31dfd7d096b261c95de09864b4c"
    },
    {
      "file": "src/data/formations.ts",
      "sha256": "92ed7260471b88003899be8b7429c25a33937d800478825caebae9ef0d743276"
    },
    {
      "file": "src/data/frontierStarterTrees.ts",
      "sha256": "2b3a78eb5ba506003f9bc800dd8659b7f07a343766bbd3ff7ea09da5a1da5b1d"
    },
    {
      "file": "src/data/garden.ts",
      "sha256": "3ae120513afc500b173d3474cd8b2a904349fcd7595538c5a7486bf36b13764e"
    },
    {
      "file": "src/data/gateVisuals.ts",
      "sha256": "4d6a97fb617b72dd0170e02e28886222363930f6c0b1da0f0c145b714217053b"
    },
    {
      "file": "src/data/glyphParts.ts",
      "sha256": "3ab902ff5fbd364076b8ae0d2928f3783e71d698ceb05d4b4ac45a8c81fe0018"
    },
    {
      "file": "src/data/gnatveilTree.ts",
      "sha256": "b46e71344007a1f72b6a3c2b8a0884634d3554e177c676a2fb78b9fbccd1fdc0"
    },
    {
      "file": "src/data/goadSkills.ts",
      "sha256": "eaa46ecea490753350e207b4977d549f583165d7e48522a120fbebd810e0decb"
    },
    {
      "file": "src/data/goadTree.ts",
      "sha256": "b76612abd7a28942454cbbca04b7368be13175fe2e9ba7c00f2dd261871960b4"
    },
    {
      "file": "src/data/golemGlyphs.ts",
      "sha256": "ed15c0de21b12f0c837527379662623cab05c97849db0a7372a2760bf0e74af6"
    },
    {
      "file": "src/data/golemLooks.ts",
      "sha256": "6c58f2fac508deaf14dca14a83f458baf57ff504835d304a60502b2a181d849d"
    },
    {
      "file": "src/data/graftReadSites.ts",
      "sha256": "fbcb1d52e18bdf115743dc25de2eee78cca3bd01f1132e8577fe29061e30b530"
    },
    {
      "file": "src/data/greatgeyser.ts",
      "sha256": "edc3c167144ca515e7c3c206715a79abb385433cbfe49a83456180e68c5155ec"
    },
    {
      "file": "src/data/grove.ts",
      "sha256": "2982cd312be7a0bcbf2d3ba011a51fedc151f005e0d51614d6813134e340d24a"
    },
    {
      "file": "src/data/guardians.ts",
      "sha256": "92f5a44dec3d17347b518078a9ae71211b6b00c8e956ead868f88a2aee94763c"
    },
    {
      "file": "src/data/harborholds.ts",
      "sha256": "16e600f420c83a6219afff89861c75b05d9663f4d049ca6d2a32d92bbc7388c6"
    },
    {
      "file": "src/data/harvest.ts",
      "sha256": "8186584361c93e23e40871f382b3062cee2ae114a546dfa5bb4f70396af45161"
    },
    {
      "file": "src/data/hivecall.ts",
      "sha256": "a8d2e049c4ada008474d673baf9f9b39f4f83ad247191b6169f9690571be2e88"
    },
    {
      "file": "src/data/hollows.ts",
      "sha256": "6e10578fb3fb15339ef48cfcc5f239fd97f8a90cea817f65feddea3ffd570f5a"
    },
    {
      "file": "src/data/identityCues.ts",
      "sha256": "c4902c577774766b552fa8a011c1df85db0957b26351056d7216535370af0d96"
    },
    {
      "file": "src/data/impactStarterTrees.ts",
      "sha256": "1dffc9912869eff83a4b59e865db6191417aed4a097c7580d444499058080b0f"
    },
    {
      "file": "src/data/impaleCues.ts",
      "sha256": "4df2f6a9ef8ca10646a1efd74f6d6d66af9c000c062aace2486545aae0c856f5"
    },
    {
      "file": "src/data/infrequents.ts",
      "sha256": "74c1c6077760424a02ee03111fadfda0f021bd71c364cb2c4df2ace9fad8ea71"
    },
    {
      "file": "src/data/innfolk.ts",
      "sha256": "cc102d74336b926884be1c9105462dd7d8e8a101c77114fc6dfe075c74b14cdc"
    },
    {
      "file": "src/data/invocations.ts",
      "sha256": "3790f118e1dc5373dc5ab8b09572004b6e09f30ed8baed92f9954dc568be7e9a"
    },
    {
      "file": "src/data/itemaffixes.ts",
      "sha256": "e74990e2ed2e267a32ee20762a97ceebc2da24792a22e8020f208c4d8d00a751"
    },
    {
      "file": "src/data/itembases.ts",
      "sha256": "aa6b03c40f1b2b8be35cf99187ac16f1db06e07fa4368003f879642d549f7274"
    },
    {
      "file": "src/data/kinshipGlyphs.ts",
      "sha256": "87d713c60e6c965999ae35cfe46f586403051ef9915aa0185575b68614d5b386"
    },
    {
      "file": "src/data/kinshipLooks.ts",
      "sha256": "6085aee2c6a195f3b9a896c835c2b4da43014405cfed1ece807a2ecf5105ddc0"
    },
    {
      "file": "src/data/kinshipMonsters.ts",
      "sha256": "c4e73664c7b1728f0d56c9db13a12273545a41a0eb12b75718f471f39ffcbf39"
    },
    {
      "file": "src/data/lairs.ts",
      "sha256": "65a656186a1ae03c780c94f147c758ffdcccad06d497bcba37d2cb1b76d4bb00"
    },
    {
      "file": "src/data/landformFeatures.ts",
      "sha256": "8c2c4d0a22efae6a45451a3ea93b4bdfdbd0a99b2dd5dff6043bb8b659d62e49"
    },
    {
      "file": "src/data/landformLocales.ts",
      "sha256": "1c8a88b16f154c939173192ad781ec098d7516dd9d6904cd63ec87ef588343b5"
    },
    {
      "file": "src/data/landmarkComplexes.ts",
      "sha256": "87d66799ec6e501c078b9c1595cbf1d2c299f797e0de6cdc8e9e61fcb2468055"
    },
    {
      "file": "src/data/landmarks.ts",
      "sha256": "616bf9762251956d08696912d524c5ac160bfbb1dec2ef887e5f2913cf37b317"
    },
    {
      "file": "src/data/leyline.ts",
      "sha256": "da650131731357279209eb608797e2b1ec4b94b86dd1418249029c1742459085"
    },
    {
      "file": "src/data/lightningVisuals.ts",
      "sha256": "31b96944c8e17a42af19acdf73036a683e3185fba3e126f3e8a0334385c57c88"
    },
    {
      "file": "src/data/lightwells.ts",
      "sha256": "310ecb481cd02f302fdacd8ff2a4da9f075ce9712d841773d68fcdfe50b454d1"
    },
    {
      "file": "src/data/livingSkills.ts",
      "sha256": "a9fea7fce949bdcec0385f8106105efa32963a6f8b613ea6c89ebb8c70184915"
    },
    {
      "file": "src/data/localeFragments.ts",
      "sha256": "85fb226342afef73432a9a4c5ea97a28ce512472c1b13ab886ccf0c234567c0a"
    },
    {
      "file": "src/data/localeMaterials.ts",
      "sha256": "56d1af1a4b72946187a63058f1f66ca3c8161f99d948b00bb1bee62b95ab40bf"
    },
    {
      "file": "src/data/locales.ts",
      "sha256": "b3f464f2386288d4964d2967d89bbb528db0146132f6582a9e0a2d9338302d53"
    },
    {
      "file": "src/data/lonecrypt.ts",
      "sha256": "7e1e3f613b51843e372140e84a0b911482926b188fbd28133698490b8b22b85a"
    },
    {
      "file": "src/data/looks.ts",
      "sha256": "ea3f7a56ccce9466e9932bfb5a10878c86b94a9678da36ea08924df6d4accbc5"
    },
    {
      "file": "src/data/loottables.ts",
      "sha256": "7acb51901ac3685867776d608de080f8ab208a7ec5c1159e3593bfc5dce7b7a3"
    },
    {
      "file": "src/data/magicPackSkills.ts",
      "sha256": "a1bbf9827510a728b1191310fcaf59817c9e6ac6127062fa9075f38538d1b861"
    },
    {
      "file": "src/data/magicPacks.ts",
      "sha256": "74f6585d626870870995f9e4a33abcbf025610534d722c58cb9521b703b57c09"
    },
    {
      "file": "src/data/massifs.ts",
      "sha256": "71a63ab3c3d2fe6ded51d905149ea1f84ac1dcb0d67364f3447f07a2017d5944"
    },
    {
      "file": "src/data/melds.ts",
      "sha256": "a935f751af0d353560ee8ad72178ace630775cd43e5875a577f4806b983989bb"
    },
    {
      "file": "src/data/memoryUnlocks.ts",
      "sha256": "159750cba86358bdf2e923d102d23b7fb6d5a2884c3eba6f9f064cbca24e3e16"
    },
    {
      "file": "src/data/menu.ts",
      "sha256": "0011e92eaefbb8ab4cc39b9b2ec7ac7b97587bf613669f7ee400d6863afed793"
    },
    {
      "file": "src/data/mercenaries.ts",
      "sha256": "b6b0f5e18a812fc6efc79fb8975b1747f01eedd4280d63758c7fcb2785a22c78"
    },
    {
      "file": "src/data/merelake.ts",
      "sha256": "48674609ed729cbe47cb3ce047b592c78afae9967e4bda9db6055187f0936a64"
    },
    {
      "file": "src/data/minionFamilies.ts",
      "sha256": "f6fd59246f7bd79dc7702151e5da76be143037320d595fd96e2c7511f5d51680"
    },
    {
      "file": "src/data/monsterNames.ts",
      "sha256": "0bbc778f56188353e2f40edb6d14c2b52441178965b834e8885e3d4ef4217033"
    },
    {
      "file": "src/data/monsters.ts",
      "sha256": "6ac7340f8ec4a13d3eee646e72eb184d2a100bd183022c5e856b79276089fa69"
    },
    {
      "file": "src/data/mu.ts",
      "sha256": "275b7a6e7fed86f0293793dd30935b8f12a540d16d577aab402891448f8f35b6"
    },
    {
      "file": "src/data/necromancerCourts.ts",
      "sha256": "25d23af96a570f1e43ab5d77a5a7cc8a540df8e7ea4e852fdbe3490a3f7d11f8"
    },
    {
      "file": "src/data/necromancerMinions.ts",
      "sha256": "9d59e1374ebde58ee7635fc4f267f4392f06b475e19d336ecd2e8d61e82e7b9d"
    },
    {
      "file": "src/data/necromancerRites.ts",
      "sha256": "50ae800cd9ecc6f040cc01faaed75436cd00197b00f1249d23800469c1e165b5"
    },
    {
      "file": "src/data/necromancerSacraments.ts",
      "sha256": "7ed4bf1fe5d73f03fb5a31d86c457e29d19fb501ee693d72ba1173c913e514f0"
    },
    {
      "file": "src/data/necromancerSkills.ts",
      "sha256": "afe1b42eaeae09348b867196dfb32798987c3536762ddafe0b897bea8315b380"
    },
    {
      "file": "src/data/necromancerTrees.ts",
      "sha256": "696c895b2a6c60bee82ad75e3da23853016e6937b980d5ba93ca98aebfa96d85"
    },
    {
      "file": "src/data/nemesis.ts",
      "sha256": "9f627fb726693d59cdfe94c901c912d6c0f2c070792c29246258bdebaf15bcb7"
    },
    {
      "file": "src/data/npcDialogues.ts",
      "sha256": "14540a65f43848612cb94f63b361d29f24d6f19e10444bdb87a7cadf7d00744a"
    },
    {
      "file": "src/data/objectiveRewards.ts",
      "sha256": "91085ffd5ffaf300c5d4c0a91d8bb1d868d8bbcee60863dc4412aebc775edbae"
    },
    {
      "file": "src/data/objectives.ts",
      "sha256": "fc3580e1e515acdcca758cd088d22e7cd9290329f0516520e975184feee10f2f"
    },
    {
      "file": "src/data/occurrences.ts",
      "sha256": "ad4eb205a83a79f7207b06b834030ace7ec5f46472932394a7698d5282498f39"
    },
    {
      "file": "src/data/odyssey.ts",
      "sha256": "e8920b0bcb62309bcebfb6c6adb54e078f2b98537d201672815236f28ab90715"
    },
    {
      "file": "src/data/odysseyPressure.ts",
      "sha256": "5ef45fdfa6a9be7dcbcc967a2f4c1de184c71548ea1c6cb2ffcb9d1a1d43d25a"
    },
    {
      "file": "src/data/odysseyRisings.ts",
      "sha256": "22c313943512bc7d6aaca1e361a9bf05f9161a926c59d52b3907d5fd373810dc"
    },
    {
      "file": "src/data/oracle.ts",
      "sha256": "1594458b498831d1db65105b222972622ed0a1decf48860af5b7d6c47de745fd"
    },
    {
      "file": "src/data/orbs.ts",
      "sha256": "7ac89fbf5fdc3c3d567649f7c52b45ebd6388698e732e0c08515c5bfa4d789e0"
    },
    {
      "file": "src/data/pactSkills.ts",
      "sha256": "e2809a22c1ceac514d232b6fc56c856269d4b043add007fb759ea7dfbb076c98"
    },
    {
      "file": "src/data/pactSteelStarterTrees.ts",
      "sha256": "60e0784f98a1972d0f317d95229a473ee0a387e07504db3e6e9107610f484fa8"
    },
    {
      "file": "src/data/partyCues.ts",
      "sha256": "f1c1c1a3f1baca9c2e2b9ef4622d34ffe109f37f65dad4f2da6058bc0bd4d9d7"
    },
    {
      "file": "src/data/passiveAttributes.ts",
      "sha256": "3edb22392d71472f5261ac34849e2ef455b7c7d408d8e40311a014f86ad2e0cc"
    },
    {
      "file": "src/data/passiveChoices.ts",
      "sha256": "cdad7ec25fb0df1048fe6a495ca0add843c81773e7845c22b6fb093e0a2e88d9"
    },
    {
      "file": "src/data/passiveCrossroads.ts",
      "sha256": "c01cdac0572e8a5595c62fb5370217515919be9f9d4daf143b27c3965b79d2de"
    },
    {
      "file": "src/data/passiveNotables.ts",
      "sha256": "4e5cef6aa4fa1c7989ae5119a825dcc35f874b13d84e5bb256a1b09fbcc4bf8a"
    },
    {
      "file": "src/data/passiveRealms.ts",
      "sha256": "1457bfed8f29938da38fd2bce1a1af1fd08afa9f0aa0ea98e45b9d88b16e4f8b"
    },
    {
      "file": "src/data/passiveRoutes.ts",
      "sha256": "b6ef154d0a59ed1124cd021c22eb3d2d213a0fee533d8312732226368eaf55cd"
    },
    {
      "file": "src/data/passiveSpecializations.ts",
      "sha256": "4e107485705bcd129f7a89b2f660e150bc42686178360f31b6cfdd8e48409bcc"
    },
    {
      "file": "src/data/passiveTopology.ts",
      "sha256": "75ef815c0549c809553f01dfbb139e513f5b316374d46afd57444ad302b4d35c"
    },
    {
      "file": "src/data/passiveWeave.ts",
      "sha256": "350d73c7e3409576988d06681f67d36262be7c3358303a5d52d0190184bd136a"
    },
    {
      "file": "src/data/passives.ts",
      "sha256": "3357d66d6fcd5b09901a492a8b32d856b818049b321f749d19b1db163e529dc7"
    },
    {
      "file": "src/data/payloadCues.ts",
      "sha256": "012ea06c6447d410775ddfd57338285f791c0142252ccad668798ebc41744080"
    },
    {
      "file": "src/data/pilgrimage.ts",
      "sha256": "650b6aa2d03ddc489e501a767ef798eee95802129a7155e611d0876363134620"
    },
    {
      "file": "src/data/playerBody.ts",
      "sha256": "0b415c724d418af426e19cdbe732189faccb9d0b2f95499f86ec07e1602b3738"
    },
    {
      "file": "src/data/pocketForms.ts",
      "sha256": "6f68bafed2388a379e3cf99469c957b19ab06d9c239e68b21fc794607ac1b503"
    },
    {
      "file": "src/data/ports.ts",
      "sha256": "d1b0b3bc901ac6a9638e876bb414f5dacfcd133f6112b6577143939f93ea2025"
    },
    {
      "file": "src/data/powerProgression.ts",
      "sha256": "b5354642364d4953cec5dffd05deb89841cd873a557d9ad6db1cf302fbe656d7"
    },
    {
      "file": "src/data/precisionStarterTrees.ts",
      "sha256": "a5ff5c42dbd02b85340edb6a7344c9f30d1554fbe65a9f5ca20bd116dd1fb6c2"
    },
    {
      "file": "src/data/procCues.ts",
      "sha256": "04cc1fde95eb2582639a4b58219df01b4abe2378f0699d57dee48a58a2204047"
    },
    {
      "file": "src/data/processions.ts",
      "sha256": "c9f8fddf296cd6a3dfb61e8a99b6bc4f20e57ff24f356b22b63217c71c81e13e"
    },
    {
      "file": "src/data/procs.ts",
      "sha256": "d5627f3f27f0c747f3202ed4ac80908fc9c1596433322171ff5ebba62500b77a"
    },
    {
      "file": "src/data/puzzles.ts",
      "sha256": "7fd4a45e866ae983de0a7c28bf6cf1badc7d2ea5602a004ab033c0de357383ef"
    },
    {
      "file": "src/data/pyres.ts",
      "sha256": "ea2d391a71d2910cff4357541ed51a160c0f2ab335c14e8a575ababf48b3d294"
    },
    {
      "file": "src/data/reactiveSkills.ts",
      "sha256": "6fabe2c96347b12429389f8420c5729c014d0cee432aa105485eca726fa2480b"
    },
    {
      "file": "src/data/reliquary.ts",
      "sha256": "6c31ecc9a7f151313e32856961996343843311de36da05f487db5f7ad4994b09"
    },
    {
      "file": "src/data/remnants.ts",
      "sha256": "f82e566c60861931ba6c42a19f611aeb4be1c233107df8b66fabed9e7aeef2e5"
    },
    {
      "file": "src/data/reserveCues.ts",
      "sha256": "2b791e829650213fd4cd9d9dd5dd959675a31ea7e79542a117c47825606e5fe4"
    },
    {
      "file": "src/data/resonatorStarterTrees.ts",
      "sha256": "50d9d154f4971cff2216e551745ec4b6cbee05f864ddc17471e3357a6a797eea"
    },
    {
      "file": "src/data/resourceVisuals.ts",
      "sha256": "0aab27107f4db146beef28a2660c4d8b4a11eb22605cb534805525f3a0eb7fc1"
    },
    {
      "file": "src/data/rifts.ts",
      "sha256": "945ba6e7180494a42f2307ae5928babed6885ad0a7f9bb8ee9df6e2a503367bd"
    },
    {
      "file": "src/data/rootwildGlyphs.ts",
      "sha256": "96a0fe372e89581eb1504eb89a8d1fa807c9aa9fc6fb6cfa75247716e0ca3c6f"
    },
    {
      "file": "src/data/rootwildHabitats.ts",
      "sha256": "f9e7f765e7ca0af779b0d73654716050a3cb8926b971e5edc0f3949db2cdab8e"
    },
    {
      "file": "src/data/rootwildLooks.ts",
      "sha256": "7295ada495c0a4a33937266ade33830551aae7ced8e8421c3cc6e62bf006396d"
    },
    {
      "file": "src/data/rootwildMonsters.ts",
      "sha256": "8ebf0ae86095e785d50a73bc253d309b8a3288b58ebf8f26b9e11e64e6abcb03"
    },
    {
      "file": "src/data/rootwildSkills.ts",
      "sha256": "fe93d73c7ae6e8128c508f71d1be98bad74e3b8062dfcdf7a5c35f4d01fcafc7"
    },
    {
      "file": "src/data/rubblekin.ts",
      "sha256": "3497a4cd8df40c0019a0ac3fe43d428d591eef11e4edde23172a7a2dc14e032f"
    },
    {
      "file": "src/data/rubblekinTree.ts",
      "sha256": "770e98a365d315fab3a1810eb2723ba2d793fd2e0c2c303352eec3ca71c07994"
    },
    {
      "file": "src/data/runescript.ts",
      "sha256": "296f0b64c48ec8700d6f04b3dcdebfe970fabcfc127a779dc9bd175310936e13"
    },
    {
      "file": "src/data/runeweaverStarterTrees.ts",
      "sha256": "b22d808925911045d991aaff4bf47736ec605359aaf5b8a79a4fc7f04464d219"
    },
    {
      "file": "src/data/satellites.ts",
      "sha256": "49ec25453f60d529b54c7142e08c7637b3f72ac27235e3ba4aec622688c6b29b"
    },
    {
      "file": "src/data/scald.ts",
      "sha256": "11683a2b62860c1d12945b444d920eaf6fc2a070e5c3e351f018c1f227eae137"
    },
    {
      "file": "src/data/scaldkit.ts",
      "sha256": "60c199aab8de9716b8e71eb1d2138c4f79ce6e5b459b463447ecbef54818af10"
    },
    {
      "file": "src/data/scenes.ts",
      "sha256": "c69d2219f0ecf8f18d7e09f123801ae826af536b083394ba232e37df4ef041d9"
    },
    {
      "file": "src/data/seas.ts",
      "sha256": "eeb4f9116b2c2cd783b29b5e5686d78bd45cd820b1ef522748d12465ea09176d"
    },
    {
      "file": "src/data/settled.ts",
      "sha256": "77e624c06e8eed6b23810c3608a664086683b71439fe85c360d75c9fc62900be"
    },
    {
      "file": "src/data/settlementDefenses.ts",
      "sha256": "a88452f280aa19c8c8b727885ba4979ac5481c7e065a9067a231c3d158b8be27"
    },
    {
      "file": "src/data/sheet.ts",
      "sha256": "3e74e84270e8107eb49a592ef1414ceeeb4a915cd08c8e3e38ed6a6a788f956e"
    },
    {
      "file": "src/data/shieldUpTree.ts",
      "sha256": "2c1c72dd88825ab645fceda397c6735a5965ebc8da78b8e133ee4724c746c152"
    },
    {
      "file": "src/data/ships.ts",
      "sha256": "8faf347b340f8dc07703e89b936f158aeb8743163b61ed54e87b369f60b1cafc"
    },
    {
      "file": "src/data/shrines.ts",
      "sha256": "c77f4fe639089bcd370072e6526d50861638b724a2df1e8aac9b684b23d766ad"
    },
    {
      "file": "src/data/sidezones.ts",
      "sha256": "cf17e17f3903951e5719e8032cf84f7d434967a896a44d594b5a0cf3f5da088e"
    },
    {
      "file": "src/data/skeletalMageCosmetics.ts",
      "sha256": "b0708e7eb8feed66da1fb8b0a51a445852011b5b02b876d6b9e6f77bf017f5fa"
    },
    {
      "file": "src/data/skeletalMageGlyphs.ts",
      "sha256": "16e0a16c1bcda334e1beccac68f6cf5a51bc4ebefef4421ce3867e85d89333d9"
    },
    {
      "file": "src/data/skeletalMageLooks.ts",
      "sha256": "9d085d33bf993080936c9ef2e5b705e2183428fb4f0de1100fb3c99c89173dca"
    },
    {
      "file": "src/data/skillCastVisuals.ts",
      "sha256": "782e347ef0e8a57768e6671a2643e447b0bf417d7d195946f530226ba734f800"
    },
    {
      "file": "src/data/skillEmpowerment.ts",
      "sha256": "67d854d4e770e059ee3ffb16edc5944e7b7572a6904ca529d9aa304eaf1f924b"
    },
    {
      "file": "src/data/skillFlightVisuals.ts",
      "sha256": "6d09f24f5b9616d429876cbf1ad46c736dc4c7c0f634b22ae0c7d835504cbce0"
    },
    {
      "file": "src/data/skillMovementVisuals.ts",
      "sha256": "8a072f3487c3fd9444070fc8b13c22df46e8f8338fcc6e7ad133817d6bbeb21b"
    },
    {
      "file": "src/data/skillPresenceVisuals.ts",
      "sha256": "38562706d3bf253524b6a456bf88dde3d6c1e76c984f65705b96655f83c0fc69"
    },
    {
      "file": "src/data/skillSelfVisuals.ts",
      "sha256": "80f4d4ec07ee4c082adf7989c3e757314e11f17e3995f689f554a37ea902c713"
    },
    {
      "file": "src/data/skillShowcase.ts",
      "sha256": "0315975110bc4f52227d1f1e715a97f67b97bde161f7fc942aa743f7caadfed0"
    },
    {
      "file": "src/data/skillStrikeVisuals.ts",
      "sha256": "f195849ef50a19416f45dd04b4c7cca7806c2b3c734f691aeeeb26e455a72098"
    },
    {
      "file": "src/data/skillTargetVisuals.ts",
      "sha256": "0dd74174a28f08f1f571478c50c7f9800402cda1e6930ba876f22ac8986ee838"
    },
    {
      "file": "src/data/skillTreeBuilder.ts",
      "sha256": "b34b71f5db312f69ef83b7609c531869c4526628f2e0f56e1ed46f3e082655f5"
    },
    {
      "file": "src/data/skillVisuals.ts",
      "sha256": "af98fc509c140eeea9b4edae1a1976c7b7b5a0a715b534197c213f5cc1c97a0e"
    },
    {
      "file": "src/data/skills.ts",
      "sha256": "1e03c12f1b0bc7b61a5c0e6154eab010fc3debba86bd7261d311cb458bcf0b71"
    },
    {
      "file": "src/data/speechAttention.ts",
      "sha256": "2fa4fffa51767e0ab344e469a2b99b0912366f62f217fead0c7085e850895260"
    },
    {
      "file": "src/data/speechGrammar.ts",
      "sha256": "01be80f784c94cef325d4172cdcbb9f6b7cf1541fbd1e5fad2838fc3cf6aeaf1"
    },
    {
      "file": "src/data/stalkerCosmetics.ts",
      "sha256": "514d48b91aebdc61dfd03d55e27ce0a1cc4c06a5dcd7c03cd4813230f559e482"
    },
    {
      "file": "src/data/stalkerGlyphs.ts",
      "sha256": "5c840af9da1ab2580097fdf0e596e219521f0efa62f034409bf9bdd93beb3f85"
    },
    {
      "file": "src/data/stalkerLooks.ts",
      "sha256": "05131e8f3fac999d3442878b16e97284b1c7d0cf426a1bca695c0ddeacc66f5e"
    },
    {
      "file": "src/data/starterSkillTrees.ts",
      "sha256": "f5b68f597d0b57316f83fc86338657eec3d7a2bfe1b2cdf1f53a3bf08cfcc22d"
    },
    {
      "file": "src/data/stashes.ts",
      "sha256": "b03d5c7587c6a2b5c7535dbe307804ba4ca90394914f9125f35fb803f762191a"
    },
    {
      "file": "src/data/structures.ts",
      "sha256": "5c90c60d46fda9b01b72fa79d44865faa9845f8c5e8e752fa6ad7d824685f2a1"
    },
    {
      "file": "src/data/suites.ts",
      "sha256": "6ba47de40935388e78cd101de59f8c31121129c326fa8cfe8b0e93108e0db4fa"
    },
    {
      "file": "src/data/summonCosmetics.ts",
      "sha256": "6c0cf48c034beb1a622629a25a26c31fa08c433ed67038e25e0a8079a49eb8c2"
    },
    {
      "file": "src/data/summonGlyphs.ts",
      "sha256": "eb21a9a1717b9f6368f67a93a9a7021eedd7b498bb30ae1f7b8c525c231f318b"
    },
    {
      "file": "src/data/summonLooks.ts",
      "sha256": "d29c6eca8a1cefce52e254fd2143b03c4f8fe58124ddc7db5e939588ef192832"
    },
    {
      "file": "src/data/supports.ts",
      "sha256": "744c7415f9ed6854b1e34fc413241d7b3faa164806fc1beadc1240f4f6417120"
    },
    {
      "file": "src/data/sympathies.ts",
      "sha256": "4612b159bcdeb223a5bc9579edfb280a0b1d49ab237bcf06f5ffe04fcff771ba"
    },
    {
      "file": "src/data/tacticalEncounters.ts",
      "sha256": "9e8cd4e72ba8cd188ba0dcba0e03b260332f9fb097672c977aba8f81f65a745f"
    },
    {
      "file": "src/data/tameBeastTree.ts",
      "sha256": "bec7fd149b7f1fd7491363570c5a1cf42ef7bd3249a2970eaec63430708c75de"
    },
    {
      "file": "src/data/tetheredHabitats.ts",
      "sha256": "32238c5734bc373fd50e8fe8f147f0c530a430fc6d51c5b07458b4eee14e8327"
    },
    {
      "file": "src/data/tetheredMonsters.ts",
      "sha256": "b131640a97bb943fae6f0ac9da0e13c203897e0057ac71a508107fb78b04dee8"
    },
    {
      "file": "src/data/theater.ts",
      "sha256": "a8a70acec3d874b047428561d83bad028cf5e6d378feb32f8118634707a6de5a"
    },
    {
      "file": "src/data/tilesets.ts",
      "sha256": "af2b4457ca7222c57c55db2c61aac47cd2b4b3b13cac0ac834bf5b8e46825408"
    },
    {
      "file": "src/data/titans.ts",
      "sha256": "a51e34b4b5f7584c4e6bfbb1dbe21343b55f38d2ff7aaf0b116c3a5e2fd2666f"
    },
    {
      "file": "src/data/townBuild.ts",
      "sha256": "8551e6f88fea0b9fed0c0a9b48f9d40506b1cf4cd3c057eccd472f2f17b9fe88"
    },
    {
      "file": "src/data/townportals.ts",
      "sha256": "9b45924fff90028f9f620063872b7fb4c09b68c41674425473615648747ce016"
    },
    {
      "file": "src/data/traceShapes.ts",
      "sha256": "77a5b85804a7390ee5148a44d53e94d5463eeae49380db805462bac5fa5558fa"
    },
    {
      "file": "src/data/tracks.ts",
      "sha256": "4862b42e47060fddb6d29056b7dedb1191eb89b828344d6eeeb4ddd9ced5d6a2"
    },
    {
      "file": "src/data/trainingYard.ts",
      "sha256": "24b2878498162c4b55285345ba6c5930b6454f55542ce78c992534c3b6eddd4c"
    },
    {
      "file": "src/data/transit.ts",
      "sha256": "88d2337fd812771eb6f618b1816d4e0c8ea16a49df8e71b495479c1bbcb0af01"
    },
    {
      "file": "src/data/trapworks.ts",
      "sha256": "e22aea35c5394ee904b0b911c7e98c87deb1fab8bd36e81ab705f9db38c74b21"
    },
    {
      "file": "src/data/traversals.ts",
      "sha256": "616145efc5caa933e78ef4965613be97df69e8eceacded01e56de9b4462477e8"
    },
    {
      "file": "src/data/tutorialObjectives.ts",
      "sha256": "95729e25c994f35b0029d069ac43062c333a0d5374ecd922f797342768653a73"
    },
    {
      "file": "src/data/ultimates.ts",
      "sha256": "3fc2582478e01e1bd0caa6e098be7600974578ec664c97a2a39533239b0294a6"
    },
    {
      "file": "src/data/undeadCourtCosmetics.ts",
      "sha256": "eabf85698c0e30c33e7be4458a6db97451d0605e22bd3ca89d854fa855fd0284"
    },
    {
      "file": "src/data/undeadCourtGlyphs.ts",
      "sha256": "2484ec31100f92ffdb77cb82e70fd37c671b9cc8a81350272467c7947fac73f2"
    },
    {
      "file": "src/data/undeadCourtLooks.ts",
      "sha256": "faf0ea407ee0448f55490e670485954224d69e23919f1c7485aa4105d2444d42"
    },
    {
      "file": "src/data/underspans.ts",
      "sha256": "f5a8d25ea4fb645dc8dc792c0a79836d1e6e95821e8948fe126e084faa68e186"
    },
    {
      "file": "src/data/uniques.ts",
      "sha256": "0946c2dc0a1de932bf374b4f34d6a32b375b58a8497cebb662e5b13a2db65617"
    },
    {
      "file": "src/data/uniques/accords.ts",
      "sha256": "5a9b682e0282027e2c5d2655c8afc1c5b060bc99bb2d89fa2472f3ac7c6ceab7"
    },
    {
      "file": "src/data/uniques/emergent.ts",
      "sha256": "267a398e66f6b3e5ebc1f68016e3b8b1f621ee5bceb4dac924fd8e902c303b05"
    },
    {
      "file": "src/data/uniques/living.ts",
      "sha256": "73230cc33146ab709c65f6727332f42a150e447a6fbbeee5d04b8d9fdda6f1c0"
    },
    {
      "file": "src/data/uniques/reactive.ts",
      "sha256": "02c84b6d830c63fb3dbc3cdb3b14514610f432f112a0f8760f5c59343516c312"
    },
    {
      "file": "src/data/uniques/relicPaths.ts",
      "sha256": "7c1547867a31de0715377705f7894d9f7eabb267e4ec7f0263b79a575a887a87"
    },
    {
      "file": "src/data/uniques/relics.ts",
      "sha256": "bcde9478035ee58f5cf9f32b230ac482367d1444c706705be24525c2483ee668"
    },
    {
      "file": "src/data/validate.ts",
      "sha256": "9ddce46eaf28d02c9c604c092cf4663d89c112e29c5f3ba2d03fdcd4c20ac5ea"
    },
    {
      "file": "src/data/validatePassiveLayout.ts",
      "sha256": "52a3842a31d65ed19d9d93a4e7275e2a8305f9a2b0cc03fc0c4256b422fad5fd"
    },
    {
      "file": "src/data/vendors.ts",
      "sha256": "670b7fefdedc61e3482a93a7d1a3383cf0d85671f4727569a078e5e541101d78"
    },
    {
      "file": "src/data/vestiges.ts",
      "sha256": "150bdee8d9dc1210012b6a3bc215299dfcf8b92592dbfae6c0198ed95f525c34"
    },
    {
      "file": "src/data/vocations.ts",
      "sha256": "1ffbd7d530cbbb2b29fa771c398f1f1384d433a023f1be5bf8e7bb8a32baf53f"
    },
    {
      "file": "src/data/voyageIslands.ts",
      "sha256": "7efed0b357f35d043d165871f93fb3538f2d63d6b2f995a0f4dd07c02ca8de6f"
    },
    {
      "file": "src/data/warfront.ts",
      "sha256": "96ad46ada5695e3024cd4d80573e9bed4c5598812e1839ca33a3d27a04c07ba5"
    },
    {
      "file": "src/data/warningCues.ts",
      "sha256": "85fd5208616db8c8f7bed394dc241559e53ee55c70c23160e1eb898f6cbb7124"
    },
    {
      "file": "src/data/watchposts.ts",
      "sha256": "e61118445f37c9dd85d65d98548e1037428004d9f574d5c79fe127fd685f2a63"
    },
    {
      "file": "src/data/waterSurface.ts",
      "sha256": "844042160628dd62a4082b3973d18d141600eab23cfc2881c8b432d4d25ccd24"
    },
    {
      "file": "src/data/waves.ts",
      "sha256": "864e73efbf0e20e2b71fe1acaaa355674a747ed2454c4a7063b3e6bf281d8211"
    },
    {
      "file": "src/data/workshopSkills.ts",
      "sha256": "7d484a924de107d96fe6264d2ec10839c08f0138d3608cd9cfddfcb3e6191d4d"
    },
    {
      "file": "src/data/worldBossEncounters.ts",
      "sha256": "099ffb0468f8024f0fbd8d4a8cb282dda057cdb21a9c2c53c09c9dbee3c08fe1"
    },
    {
      "file": "src/data/zoneKinds.ts",
      "sha256": "626223aad5c95e48632d4a27fcb3a8a922c4bef773afe4dfcb003678cacd853a"
    },
    {
      "file": "src/data/zones.ts",
      "sha256": "deee0fca184696a8267cc404a4838a1cff6c44e3c5fe6cbc39a5b871a27ac053"
    },
    {
      "file": "src/dev/entityForge.ts",
      "sha256": "cb4c430f3d739269ace2ef5e161a5e99773a60da177e4bb8ad33cf0f3e31be57"
    },
    {
      "file": "src/dev/forgeSchema.ts",
      "sha256": "9f259e6de248b7e62ae8049258120d6fde15dc96218e933a43929ae2d372844f"
    },
    {
      "file": "src/dev/glyphForge.ts",
      "sha256": "70d8c7ee38248544a0a0f4e4d77edf2fdfb28c15fbff4f9d6589c09b55f8e039"
    },
    {
      "file": "src/dev/mapForge.ts",
      "sha256": "7e3d7f3af96a17ea04bc6744d212f954e8a822e8309e347120d71c411d85fea5"
    },
    {
      "file": "src/dev/monsterSpawn.ts",
      "sha256": "96c50abe79baaa6a234610cf4e177ac9f5fde8c7bdc0f0f2cdc9838517dd29b2"
    },
    {
      "file": "src/dev/panel.ts",
      "sha256": "60a2b4bc9587377e0d1fbbb467aab9ef5c72d7442530c13070b6341a6356fa79"
    },
    {
      "file": "src/dev/passiveEditor.ts",
      "sha256": "38dbe3ee91ae7900c85106ad1a15cf80995a1f500725bdeacfd5dd8322e7f1f9"
    },
    {
      "file": "src/dev/perf.ts",
      "sha256": "d681c5d714f2c719cb615390c301415fe5199217e76edf43e15ef68eab8c7081"
    },
    {
      "file": "src/dev/progression.ts",
      "sha256": "0f62add62ef23b39ef689721e69dafffee3e1dc62ec6c9ecbf026a711f3c18ed"
    },
    {
      "file": "src/dev/tabs/account.ts",
      "sha256": "67d3582cc313fa7c2241d8820e6010ea700226ec46d02070475b203429a19a07"
    },
    {
      "file": "src/dev/tabs/atlas.ts",
      "sha256": "fd0b2db2599ef79d10092e58dbe4135d2cd09f8d9f6f7af0588b09ef8bad5fa3"
    },
    {
      "file": "src/dev/tabs/combo.ts",
      "sha256": "98618c7c702c89c5f0da20102b58d74116a6c913dc2737c135373c009e2729f4"
    },
    {
      "file": "src/dev/tabs/dissolve.ts",
      "sha256": "3dd191c2d5b2d448d3c90a02a37df40d1e4ebb189225a2d4f713766e809cf196"
    },
    {
      "file": "src/dev/tabs/emerge.ts",
      "sha256": "fbb2a541ef0bbee549c619c24b4261dfe2c38995a897f2648675eed146196618"
    },
    {
      "file": "src/dev/tabs/entity.ts",
      "sha256": "b2fb9bc4905a4d331a8cf8f9c7e0ca3da2e65d1a84603283c6bbb1fbb81cfc54"
    },
    {
      "file": "src/dev/tabs/events.ts",
      "sha256": "61cabd24b72e984edff6b34c86cf668560e4cf3b8ef4b3e5599cded3cb58a4fd"
    },
    {
      "file": "src/dev/tabs/gems.ts",
      "sha256": "835447c892b0c092de7ca79b568088173473bd413c936baf94f375ee86e9091e"
    },
    {
      "file": "src/dev/tabs/geysers.ts",
      "sha256": "fef08e89bf9696117b9862c326537b77fdf48ac263f4679ae7a8008766b3105b"
    },
    {
      "file": "src/dev/tabs/grab.ts",
      "sha256": "e7a4fb2c6f69875232d560aa671a2a30ae7f3e9641da0f3a25b4a7c25ac0a215"
    },
    {
      "file": "src/dev/tabs/holds.ts",
      "sha256": "fe4d1241f133deb4e527b2c25c484dbb35d60678301f4531b7711745e57a6395"
    },
    {
      "file": "src/dev/tabs/items.ts",
      "sha256": "a1b130ca389022a496d32c15bb46e9cb1b3049b17812bec8e0de6324c6d2d4ef"
    },
    {
      "file": "src/dev/tabs/lite.ts",
      "sha256": "54e65ebb9809df5c383cdba02d6dc0069b2b38b92a06aa71c3609891ab4980f6"
    },
    {
      "file": "src/dev/tabs/location.ts",
      "sha256": "9fd507b633aa659d91fe015e13cfb2ee9f2eb8894bc89eec7122fa8d4ea2c25a"
    },
    {
      "file": "src/dev/tabs/maps.ts",
      "sha256": "10b3709998bbe5561392f706cabd7a76ef5674f50d9ed432c2abd97aa1b85f35"
    },
    {
      "file": "src/dev/tabs/perf.ts",
      "sha256": "399b48aa00bd65b0023b773b384b7cb3262d514846cef855dc771257c66fbc85"
    },
    {
      "file": "src/dev/tabs/possess.ts",
      "sha256": "cba91c95a320d8898009ea964296b05d3746b23aed1734b84ee2ad5335a2581f"
    },
    {
      "file": "src/dev/tabs/progression.ts",
      "sha256": "06d4a4d5398a7cc51f35581f657d91b7b40820af85096487306583ca43c00926"
    },
    {
      "file": "src/dev/tabs/throng.ts",
      "sha256": "15124eed115f181a8d153aa589321ad50a5172c14947e1aaa25bc56e5b4737b6"
    },
    {
      "file": "src/dev/tabs/ultlab.ts",
      "sha256": "72d8e439e9e55ef27475f663a55bf05e3cc980c759c11d24907ecc160617c707"
    },
    {
      "file": "src/dev/tabs/watch.ts",
      "sha256": "1dced0fbc48a7725f92e2081a2237f79586f02abf198469ab68aed5114b1f7e5"
    },
    {
      "file": "src/dev/ui.ts",
      "sha256": "1e6e3cba8c973fc017be8188bd4f47abdbfa9b2b6b992866a915320cf2e03ad7"
    },
    {
      "file": "src/director/camera.ts",
      "sha256": "a9d32fdb84e3aedc18c9e69bb907addef3e1d963fab226bb77f28e9a4e4b9bb2"
    },
    {
      "file": "src/director/director.ts",
      "sha256": "dce9bea0f1a66e5b9f5a9084c6e791ae6e7c171b43efa2b8e7223f46f6ca23e1"
    },
    {
      "file": "src/director/shot.ts",
      "sha256": "2a481ae0853d44b35381ffc296446bf15869ce85ab041492c875d44dac0384fa"
    },
    {
      "file": "src/engine/absorb.ts",
      "sha256": "2db40e8772362b6a77d530947708e9cd4e9fa9498353c380df5ddc34b25f5a22"
    },
    {
      "file": "src/engine/accountReliquary.ts",
      "sha256": "3bab9f3ec5bffc93948939a87b9cfdc54137efb1638e855667c89ed65e254c89"
    },
    {
      "file": "src/engine/actor.ts",
      "sha256": "0d5769530cb899fe0328158d70312b80e916753f014e9fec02e1874bdf570dcf"
    },
    {
      "file": "src/engine/actorGrid.ts",
      "sha256": "34c6e471ff92bc51129cff01113dce81f658e225bec61241747487fdac12101b"
    },
    {
      "file": "src/engine/adventureDistricts.ts",
      "sha256": "58b3198f5163cfe7f889da45416d05ef25a501fd982f7a249f9873a47a025e7d"
    },
    {
      "file": "src/engine/afflictionPressure.ts",
      "sha256": "2da1217ba50d40ee0aceabd37c1a7cfe53c545dda0c4091ab05c8f88bd3ae681"
    },
    {
      "file": "src/engine/ai.ts",
      "sha256": "7057739bc34d5c3d682996b09524619d88c8d0e43f8ee0bf148fe06c4bea712b"
    },
    {
      "file": "src/engine/aiActions.ts",
      "sha256": "e2a2c7a0cef913170125d240d835ee66f507e5650055eb77095adf0e0087c4f1"
    },
    {
      "file": "src/engine/aimassist.ts",
      "sha256": "302794134e8d923e9800b9247f7e95d3fcd2a0d62bd82675948d5b3488bac16e"
    },
    {
      "file": "src/engine/altarBodies.ts",
      "sha256": "16f72b76bd467420d3b05176a7a7477e80974c521b03c75a75f53c83469f9823"
    },
    {
      "file": "src/engine/altarCues.ts",
      "sha256": "97f3447f4441e11d46c883a253c3a5779a086d45d630121b3b88bc73112dcc11"
    },
    {
      "file": "src/engine/anatomyCues.ts",
      "sha256": "1cb5b1247e357d40048a0da23e9ceafc6b0d9d7690c2b99502afb5a398eaf063"
    },
    {
      "file": "src/engine/arenaCourt.ts",
      "sha256": "db7d634c6e508b1d29ceda3d1a6e154df4bda710fa653fdbb46ce168e7d48f76"
    },
    {
      "file": "src/engine/armedCues.ts",
      "sha256": "7e9ea50be6535ce4ae157abcae8e46a21dc6dddbbafdee0c72144c11ccb74e7a"
    },
    {
      "file": "src/engine/assault.ts",
      "sha256": "64084452b1487593568e4d8a065ed126489b5468d453239f12972c1834818b97"
    },
    {
      "file": "src/engine/attackPatterns.ts",
      "sha256": "ca667992eb14675eae70d171551c3489f65f6a1b649735d5da94d91a380fbacf"
    },
    {
      "file": "src/engine/attackSequenceSpec.ts",
      "sha256": "6ffb006e0c79ec1943faafcbb6de5bdca7eae8bac286f3ea4fb2b8858ca3b267"
    },
    {
      "file": "src/engine/attackSequences.ts",
      "sha256": "0383eb4ff4c4da3590b6f38a5e1fb4adada85517aeced21a72d13abca6c9e0ef"
    },
    {
      "file": "src/engine/auroraSpec.ts",
      "sha256": "901e4a89d2ad7ed1da5cf6650caa979cd2d9dbb21f4e21871887d610f2cc3d3e"
    },
    {
      "file": "src/engine/auroras.ts",
      "sha256": "29cc7c2babfd4f4e0074e6c0194081e1746deddcad004661461ba55db6767d93"
    },
    {
      "file": "src/engine/authoredMaps.ts",
      "sha256": "5e7d137f093a78a81979d429b2ed5a2a8497e9df79fa7abe31cc9cadf0add36e"
    },
    {
      "file": "src/engine/bagsort.ts",
      "sha256": "213b16b97d0e5df84def3135d5993dd17b14c6706d77579f059f2f9cfe7d1b00"
    },
    {
      "file": "src/engine/beaconObjectives.ts",
      "sha256": "0fcf034b92b2b6f59de926056b0955a039f584460a56fb7ed2a1c7dcd585e6f1"
    },
    {
      "file": "src/engine/beaconSpec.ts",
      "sha256": "cff7533b5ed33a762ac56b7f2d5e7bd230dbce77a094fa8f0e36085a5c8cac25"
    },
    {
      "file": "src/engine/bequests.ts",
      "sha256": "0ba675d2f7237f6b2e93959b37c20640694fb491120a9d452a68332388c6f999"
    },
    {
      "file": "src/engine/blend.ts",
      "sha256": "3e361e6216fb487a6ea44a82b46247c55b65470370b79c5a577da855d525e3f3"
    },
    {
      "file": "src/engine/bodyAction.ts",
      "sha256": "a6dae1ac4f645beceb6e312b50cb2ad33c0307c51163d3c8ab27b1c1f6687d02"
    },
    {
      "file": "src/engine/bodyVoices.ts",
      "sha256": "299ac65c1f2d10e75a52e433d8df5cb5f42f2de3df0bd892f31984686d52e5a7"
    },
    {
      "file": "src/engine/bodyWalk.ts",
      "sha256": "69ff3efec650c972fe8369b70a4cf486ad522da5d71b1d0783b862995608ab6a"
    },
    {
      "file": "src/engine/bombard.ts",
      "sha256": "f3c6fea2446d27a990ab899be5cf9463cac14e9fffb00c8fbb4eb8d76ba59638"
    },
    {
      "file": "src/engine/brain.ts",
      "sha256": "88319b18f0c0f3d670ca2d9fa1c5010c9f474fe45e82619249e796e6a665d144"
    },
    {
      "file": "src/engine/carriedEffects.ts",
      "sha256": "d5645377597723631bfbb9fc5ec75ae9162d49214386ab5da9f830726fd8a7dc"
    },
    {
      "file": "src/engine/castAim.ts",
      "sha256": "29c592471c1538117a8e199d8683163c6d8c888ad7987ce081373b769722cb3a"
    },
    {
      "file": "src/engine/castingCues.ts",
      "sha256": "632d556e856f6d7c2e1af6e1a9fc21725aa6a2f4c50b6ff7cfc55807c8d5c071"
    },
    {
      "file": "src/engine/castseal.ts",
      "sha256": "9c6188e8eddb986477890285ca5cfe77bcc056340b864739afcc5fd6eccb4e3f"
    },
    {
      "file": "src/engine/challengeSpec.ts",
      "sha256": "5000e4e71c544c53ae8040fe5b45bf87c998b8478b5aaa0be9fb44f9e3de18b9"
    },
    {
      "file": "src/engine/challenges.ts",
      "sha256": "d77fc896488be3b0a218763982a0fad3e9e98c55f757b6424645fc909bb3c1c4"
    },
    {
      "file": "src/engine/charges.ts",
      "sha256": "20f0796de9f6adffef6bf344f9a0742cb456cac204b0f9cc9f11cdde48bdd708"
    },
    {
      "file": "src/engine/chestInteraction.ts",
      "sha256": "3885ccdb875e78e9291c809fce4fd6fd35d1abf99ebe1981965f2b1df2196bdc"
    },
    {
      "file": "src/engine/cling.ts",
      "sha256": "cb003b825a81394bbf65d730399e637b63bd220ad26b24a68c26fa59bd0d96e8"
    },
    {
      "file": "src/engine/clutch.ts",
      "sha256": "0934fce85fcf1c556dfb09487d0aa0b0eb6453e2787d762675497e58274fd9fd"
    },
    {
      "file": "src/engine/collapse.ts",
      "sha256": "48c75659871790e5442155dfcd5ec6b5ff6cb675e2376926db4371cfd23c6272"
    },
    {
      "file": "src/engine/combatCues.ts",
      "sha256": "da47803480c0afc0ef20685ffbff014e3ff5323a93df6ca5e8b067b8656b7bd2"
    },
    {
      "file": "src/engine/combatReadability.ts",
      "sha256": "9a96f9b11de741ac8f838753293d328277f55646ff53fd7e6d1777778c7f4622"
    },
    {
      "file": "src/engine/comboConditions.ts",
      "sha256": "18a17b2508d15acf97a924f5510fa17f233e4d8b64a486b9f3f4a5fd23ff220b"
    },
    {
      "file": "src/engine/comboCues.ts",
      "sha256": "bb03dec54740e339baf647903853a5770c3b44d37926d362630bcebf3890c766"
    },
    {
      "file": "src/engine/companionBonds.ts",
      "sha256": "6936226f2c05bd836e1f10b2137289a04e04f6456dc689da2caaaa9b7c736328"
    },
    {
      "file": "src/engine/companionCues.ts",
      "sha256": "3d686e8f0befbd5485ad487c364b338d0d755ba539fde6f645d1d1dc4cf12340"
    },
    {
      "file": "src/engine/companionGrants.ts",
      "sha256": "d435bbf41f96a9271fa3d3b5c18e2ab3d3efcf510ed9890bc09fee3498939e55"
    },
    {
      "file": "src/engine/companionSpec.ts",
      "sha256": "a930ecbaa7ea90259f619ee8790b2f7f18c356c2d5bbea3a3dcd1323ecf9553b"
    },
    {
      "file": "src/engine/companionStances.ts",
      "sha256": "3d1344382aaf9fd8337e90dd1e5ec3f198ebf3e8b0d34aab3c87ac2c4c0d52d6"
    },
    {
      "file": "src/engine/containers.ts",
      "sha256": "b8268a13cebb37ea4b226f7e67bc6c1fc5ea997fd8be6602722b2bc211f8b10c"
    },
    {
      "file": "src/engine/cosmetics.ts",
      "sha256": "1694f6d439af6b33a821b9c549af8b1e53e1319c6472e9af451264205ab4397e"
    },
    {
      "file": "src/engine/costward.ts",
      "sha256": "79e6c1c3c79dac64e7c799971b85f3c09f64e082e3f307ed0414724cbd366d4a"
    },
    {
      "file": "src/engine/crafting.ts",
      "sha256": "8261d5706525ed35b1ec7a6168ba797ae3db969757b578ad31d68fbeac69ae92"
    },
    {
      "file": "src/engine/creep.ts",
      "sha256": "5a22fa4473634318bcd70cf2cab2459f4164c2ac579e32197a8781b8af0ed7ea"
    },
    {
      "file": "src/engine/creeperSpec.ts",
      "sha256": "d61700118b0ff5c8424186ec1f8edd0881e5390c0b500533be0a41b3c5abcf98"
    },
    {
      "file": "src/engine/creepers.ts",
      "sha256": "5ffbf6ec44f4d9536bba2c6960e9f0e355a8dcec815ce0d42e8364cf6ea50633"
    },
    {
      "file": "src/engine/curves.ts",
      "sha256": "2301cc4f51747d4a26037860480604f7f323c2af34d941849ec6e664ddf05dec"
    },
    {
      "file": "src/engine/damage.ts",
      "sha256": "dbfe8a43e1c92842e46ad0ebfb819cd412fa7ef69bf4c114d481fedba4551b4f"
    },
    {
      "file": "src/engine/deathPresentation.ts",
      "sha256": "3c1721da16167988cdf708127ef8826afd97f2686846acfc6aa378c07d5f1bdd"
    },
    {
      "file": "src/engine/deeds.ts",
      "sha256": "98678e0c71cdaf7b5756253bc17ba43621e5b96c3228c66e4c4f2e5b594939ba"
    },
    {
      "file": "src/engine/defense.ts",
      "sha256": "5e15d4d1a6b13ab1b3a7b78cecf3b6b223cef8344f356700fba37fc85cabcdab"
    },
    {
      "file": "src/engine/defenseCues.ts",
      "sha256": "2e9a0452acd96e788bcdf57dcb7dc677380adc7b548283796e59226ba528eb46"
    },
    {
      "file": "src/engine/dialogue.ts",
      "sha256": "80bb310669b004cb8e2bf8e678928b0dedd8ca8c8c632fdaa3e5f37b889fea42"
    },
    {
      "file": "src/engine/dialogueActions.ts",
      "sha256": "b054ea4bc57d22ba7b040867c5890ddef78ad842d08fb78a82157b75c82b93b1"
    },
    {
      "file": "src/engine/dissolve.ts",
      "sha256": "2d35af54916010a006a8cb303abc9ab6d35ae40f6416f74310bbec4613c9323a"
    },
    {
      "file": "src/engine/doodadFamilies.ts",
      "sha256": "07b25462821ff60f70074505096da32a19ecfd173228735179f1484544a0d794"
    },
    {
      "file": "src/engine/doorPress.ts",
      "sha256": "132bfe8565410a562350c52e0b476c0732199e90674f83e4e3039a360e549b77"
    },
    {
      "file": "src/engine/dwellFocus.ts",
      "sha256": "58d84a0700b0f2786afe8cd3ec615e42266fa2a2874fc1ca93fc12c0b76af24a"
    },
    {
      "file": "src/engine/emerge.ts",
      "sha256": "360cd791e1ef6827208b1a3f689b24224d8988b8ff952066bb3dd018384f365f"
    },
    {
      "file": "src/engine/encounter.ts",
      "sha256": "32c5e117c8f6e03c36b277cc9c5109eed392f991936de7908a4b2e1c5b69bb0f"
    },
    {
      "file": "src/engine/encounterCombat.ts",
      "sha256": "d3c47bd18fd4d9e11416bf37589c182e5683466868206cf9260d09bb0b39da51"
    },
    {
      "file": "src/engine/encounterGroups.ts",
      "sha256": "0ccbfc9899e640f2b791a8c08b228fc64efe29cf9dcbdf12d83290539fd16a0d"
    },
    {
      "file": "src/engine/escarpmentGen.ts",
      "sha256": "13ed4ded60a25335d7f252497900b7b3e51bd9f8aec7f7cb624ad9b1ddcf52c0"
    },
    {
      "file": "src/engine/eventWeather.ts",
      "sha256": "88f9e03285ed1091818a202f57ec83103d5dcf2dbceb53d4a5740a177eda1082"
    },
    {
      "file": "src/engine/eventbus.ts",
      "sha256": "63635652a98318b610830dd8e0ce60c7c454a5cb8098120d4685e12c0eb399a5"
    },
    {
      "file": "src/engine/exitSiting.ts",
      "sha256": "63a4d6ae47f6db11ab8922d4037ceee0bbee4e8d27119a7285a3fe7d4dad3268"
    },
    {
      "file": "src/engine/explorationDistricts.ts",
      "sha256": "a8361a27a64b133d4a3f7cac6205d1fbc85d422e091fdc59ffb7e4d32ca072da"
    },
    {
      "file": "src/engine/feedingCues.ts",
      "sha256": "8f3718c592eefe47eff3f671d0ed26b34af0cb53631a890cca43d67f888db812"
    },
    {
      "file": "src/engine/fieldgrants.ts",
      "sha256": "7e3380e4d14fab2ce57aead1971d42d00a1b1fcac79ff11faf0668562f4de2a7"
    },
    {
      "file": "src/engine/flaskState.ts",
      "sha256": "e7ec7eccc01213fb868abb9fb828b31eaeb65ed000510f7e410f6e671b5c8e77"
    },
    {
      "file": "src/engine/flight.ts",
      "sha256": "2684cddf354c878d6b3aa24bd4984b69797444efb5a6f95565ea601fcca78a90"
    },
    {
      "file": "src/engine/flux.ts",
      "sha256": "39b61f295abc85c528588f0d17971eb7e291fdadc28c7c14bf69666fc05b8f0f"
    },
    {
      "file": "src/engine/fog.ts",
      "sha256": "ed82d5978d280c65e1930a67c3c28708415056ef2f991afb7e6c8fa0234aa49f"
    },
    {
      "file": "src/engine/fontPlacement.ts",
      "sha256": "65c2b09088de82601a7cd5354b7a0f2fab27de0cf335e0f4782d997f1ee9ae2a"
    },
    {
      "file": "src/engine/foresight.ts",
      "sha256": "f709bb9452eedbf6870897547101f3961e5c45697eb03c4e624c3346be64c011"
    },
    {
      "file": "src/engine/fourthwall.ts",
      "sha256": "a38171c8a907c630e2de41ee68223aa6c4071463d3395b6b67090a5a9b736e55"
    },
    {
      "file": "src/engine/gauge.ts",
      "sha256": "358e581df8c2a592d085c2eb5414b44c19fca25927c1bf0c01e4a94eb697d48d"
    },
    {
      "file": "src/engine/gauges.ts",
      "sha256": "0965650f89d499bb56fd58f298d27c527d9d17c6755b3ad111be901cd3963339"
    },
    {
      "file": "src/engine/gemitems.ts",
      "sha256": "99c963f3dbae3277022549e090cdacfab7c8802bc2ba8942e410107a9736d5d7"
    },
    {
      "file": "src/engine/genPins.ts",
      "sha256": "45b59d6cd9bdb02efacb332fa6c5cccef211f0feada544139be22c1bf9dbb987"
    },
    {
      "file": "src/engine/genkit.ts",
      "sha256": "20e656f881d4c7623018f90067f8299c5bbeefbaaf5651da5d8efdcd7ec99005"
    },
    {
      "file": "src/engine/geysers.ts",
      "sha256": "74651875639b000794d6235430e290b8008e22667d64d8f66a2480f222498f3c"
    },
    {
      "file": "src/engine/grab.ts",
      "sha256": "e45661cfcfa5044d6acbcd05bac2c3bca7b7febd7d63ef9a4b960106017c84a1"
    },
    {
      "file": "src/engine/gridSpine.ts",
      "sha256": "450db867056c8b201fcc7fe93c2a405b7e57877f8a4e719917b1d8ed5d78928c"
    },
    {
      "file": "src/engine/guardArts.ts",
      "sha256": "423d73d064a9a7da045d7a4ed9e7de5f53ff9e3d78bcaca5352cce599118a75e"
    },
    {
      "file": "src/engine/guardArtsSpec.ts",
      "sha256": "91b2d9d9009ec8f6d5426a630b88e43d654cfe5aade93c3c89036f738644052d"
    },
    {
      "file": "src/engine/guardSurge.ts",
      "sha256": "38430d746916ea072baa92b33b92f73e28eb7b405ae22013ddd9058faf030d4c"
    },
    {
      "file": "src/engine/guardianSpec.ts",
      "sha256": "0822fed626965810e7f74bc0c3a5421c9d3eee345e5e424a437b2ae6decc94db"
    },
    {
      "file": "src/engine/guardians.ts",
      "sha256": "3143fd75c85d6f8a3de56a0de715cd5773f72d06f2d8b1b5344355dcfb822032"
    },
    {
      "file": "src/engine/handling.ts",
      "sha256": "c92b22a808ec08d2b3ea281226beeb79520656a63a7d123dd129934eaca2b4b1"
    },
    {
      "file": "src/engine/harvest.ts",
      "sha256": "963259e607b7f53c6d93960aca075fb34a2db2d7f4a374eb9955ce8e264144ea"
    },
    {
      "file": "src/engine/hash.ts",
      "sha256": "70d7fde28e2803a587f5b798008906fb2fb46aeafa1eaf94de96c94f8f310cd1"
    },
    {
      "file": "src/engine/hivecall.ts",
      "sha256": "1716e5cca6f0780014e064158be8b6bce65f6b43d972b057a61cb259f61b9c74"
    },
    {
      "file": "src/engine/holdObjectives.ts",
      "sha256": "b24d105adead3eba857874d8ad5497366987a42a398ea43b4c9a881f1c257985"
    },
    {
      "file": "src/engine/interiorGen.ts",
      "sha256": "348c1239eb024bd550e54b63918b73e18bde7c008b040b8bd64c6f5003147d60"
    },
    {
      "file": "src/engine/inventory.ts",
      "sha256": "f813317cd2ebee2ef87a53c457e62123799b470ffd0487840273b73c1f25ad57"
    },
    {
      "file": "src/engine/invocation.ts",
      "sha256": "93f99cda428085972cb2fbe8dc15dc573f75d0f2f9cf5cf47cb7d431e2997778"
    },
    {
      "file": "src/engine/itemLimits.ts",
      "sha256": "fe51f75084d25328bcec37d9abb1f08219fc58956ef5e825fdfe891634fbef0a"
    },
    {
      "file": "src/engine/itemchoices.ts",
      "sha256": "58fb0ea9995f4840e805b2d6cc16f2ae2e6f5e2ed39d22844d935a76abdad638"
    },
    {
      "file": "src/engine/itemgen.ts",
      "sha256": "c0de581b67894898817f1cfc1d2175f00a626ce035649c697f9233f777c6c82f"
    },
    {
      "file": "src/engine/items.ts",
      "sha256": "795ebbf951a6ff23ef41e4f4fc4532a3b4f6faea15eaa896d6dff5ef80bb27ec"
    },
    {
      "file": "src/engine/killHandlers.ts",
      "sha256": "77100bfc68057eafb2c6c71a3aac493350769bb012f538c362b8ab474196257b"
    },
    {
      "file": "src/engine/lairs.ts",
      "sha256": "faee1e07666003e85a9f5f67dedef6252c6a0833eaf2d31e2ee01ae362c671f0"
    },
    {
      "file": "src/engine/lake.ts",
      "sha256": "1a9e57d295a5cb85caa2059b4aa02f7e2175c61e9d4f0bc23438aca44f236fbf"
    },
    {
      "file": "src/engine/landmarkBuilders.ts",
      "sha256": "96e8d15341a6275b7b2e19d917e0b535eed5caffc5fb6d10c24ff89797729e19"
    },
    {
      "file": "src/engine/landmarkComplexGen.ts",
      "sha256": "8e6a743d3c34a802e1aa66dd0e594e84a3c2522ac96d1f13e7ddcb17e37d6290"
    },
    {
      "file": "src/engine/layoutRecipes.ts",
      "sha256": "c342bb32afea0ada3c4c1f7724bb63cae140bd467a9e98f7a05ceb1fc54f44d3"
    },
    {
      "file": "src/engine/lightningVisual.ts",
      "sha256": "03884c0de4e3973153f5f61c93cd1ebb6a8d1e77684028108a363f70ef504cf3"
    },
    {
      "file": "src/engine/lightwells.ts",
      "sha256": "c6140d21c2bc5273b11df1c131695154e13f981affd466e320e698ff96d63aaf"
    },
    {
      "file": "src/engine/lite.ts",
      "sha256": "c96df2ade63439ff478188afa961a9635cf493cd74ce52de0fd724f7700c0c72"
    },
    {
      "file": "src/engine/localeGen.ts",
      "sha256": "6326f2a6e7413c1b51de6888a74dae05f1b574418c6a8030d2d416184ae375fd"
    },
    {
      "file": "src/engine/loot.ts",
      "sha256": "cf2e8ae94536bab373167a630e5382bf7cf5da788a4002dab10edbed5ac5483c"
    },
    {
      "file": "src/engine/los.ts",
      "sha256": "8c6f5d1727bf97537a33ad929609c350fd4cc83fdefc135dd18c6fe423daf9d3"
    },
    {
      "file": "src/engine/magicPackEvents.ts",
      "sha256": "19a387fa86a43ec263db8daf9c9046e6e39d3d776c2a516c3bced9800756bd0c"
    },
    {
      "file": "src/engine/magicPackMechanics.ts",
      "sha256": "35025355dcd2038d03ee082c05d99e69e60ee0ca59bdf2a7728bef61bc5502b9"
    },
    {
      "file": "src/engine/magicPacks.ts",
      "sha256": "3b77365201b18fae3711a4dd49dc8ff75dc2b8e9454f60da17226c6c06091b8b"
    },
    {
      "file": "src/engine/mass.ts",
      "sha256": "a12a0c9e45964b7a1a42d192bd8ee20da49c8070d365bcb5256be9f7b0b75f93"
    },
    {
      "file": "src/engine/massif.ts",
      "sha256": "0a9fe6c7edf14ece7e3f492c1c808960be53e085e29f32e4ed8ff3d3b9582fc2"
    },
    {
      "file": "src/engine/meleeReach.ts",
      "sha256": "e98f30dcb19261dc290e0001cc295f6ce7b09b5df3ac89ed160138d64a011ff0"
    },
    {
      "file": "src/engine/memories.ts",
      "sha256": "7f0f1370aebfc058e0d18ee5de32a6117ba0a369a12e247c85db9a325f9fbcc1"
    },
    {
      "file": "src/engine/menu.ts",
      "sha256": "1ebc5ef54880ae5194e501e654aee33e597c708df2b880346159e15d5f0f810a"
    },
    {
      "file": "src/engine/mercbrain.ts",
      "sha256": "74854c54dc703afe966e4e84a71e7c5dec80b2913daa500317791cea5b04ed43"
    },
    {
      "file": "src/engine/mimic.ts",
      "sha256": "48acf647b2dc7fd0feb731f2059d04345251c3d85cfb474fb98f3b6c1ede0afb"
    },
    {
      "file": "src/engine/minionCombat.ts",
      "sha256": "18fbcd3e02f749079b710237b14709478216317b0d195118bf001a91aa0a5ccc"
    },
    {
      "file": "src/engine/minionInheritance.ts",
      "sha256": "36adef52c50aa49ead2ada3a8ebd028c4fd89456ad83f5e60df273a8dcf40e5a"
    },
    {
      "file": "src/engine/minionTargets.ts",
      "sha256": "8bf96a34d686d19bb3b25aaddc64666781f4301c6a84832dd601ccf0b22f6534"
    },
    {
      "file": "src/engine/mounts.ts",
      "sha256": "f4e45aa00d0a9aec6e06b988f04e5a9e80e801a3f8c8701e218980ca400bebc8"
    },
    {
      "file": "src/engine/movementTether.ts",
      "sha256": "1c545607b6e18598bb2a50c323fdb7397f56e3f982407c809f1512b3511847f9"
    },
    {
      "file": "src/engine/muDeal.ts",
      "sha256": "dce3e93eebab680245748c650c57031a6fac34ba43423f24fe12692691d4ef57"
    },
    {
      "file": "src/engine/muRing.ts",
      "sha256": "ff93d8cc0168fb6f1e91a51180e43bdfe8170a4525af4d20b38725de0627a95a"
    },
    {
      "file": "src/engine/nativeAIActionHost.ts",
      "sha256": "07ee5a679cff49f8020a2e2e81469215e19e34328d48c3007799ac7340265958"
    },
    {
      "file": "src/engine/nativeActorConstruction.ts",
      "sha256": "9c019da7d2930336a0609643a240c31619dc5088e24a815936b2b08125d73a11"
    },
    {
      "file": "src/engine/nativeAmbient.ts",
      "sha256": "ca700485f6ed65c83795788777d3195115ff28a8125c2b00e5e6284c9986c6d0"
    },
    {
      "file": "src/engine/nativeAreaArena.ts",
      "sha256": "3a491fc22f297e05730bc95f97a507ea76b2c6279bc26aa357020faa57e71620"
    },
    {
      "file": "src/engine/nativeAreaBoundaries.ts",
      "sha256": "5117b9ec6cde9ac205c1e27324b0ceb383f654053a183ef220f3d0d50fffd7ac"
    },
    {
      "file": "src/engine/nativeAreaLayout.ts",
      "sha256": "b32dae389d6e34beaa2a6a69aad7e69e4f0b22c2c82512a4902a8530411ae68d"
    },
    {
      "file": "src/engine/nativeAssaultHost.ts",
      "sha256": "d5ba88b144301893f3f1cd712c06e133e021d6f9333f14660e6547f8cf7eed31"
    },
    {
      "file": "src/engine/nativeCharacterCreation.ts",
      "sha256": "d1172bda77f7489e54311ecb1dfd1fd1cf6b04acdfef0ffca36b635639e14172"
    },
    {
      "file": "src/engine/nativeCombatRecordObservation.ts",
      "sha256": "cb65ef1fbb88507e9103408f2a358a7a8d78ee0d03e88b9eb7346140b570789e"
    },
    {
      "file": "src/engine/nativeCrusadeIdentity.ts",
      "sha256": "05a222aa4368db6af368a394a281a46cdbb6e7b0a9e9e70ebd3b3af3543f706e"
    },
    {
      "file": "src/engine/nativeEncounterGroup.ts",
      "sha256": "c77bc5396ce24d1176b0a3d3c4ade1a796ac3f9a01cbd7d30ca04c1cf446656c"
    },
    {
      "file": "src/engine/nativeExitPreparation.ts",
      "sha256": "79e104e22cd81d4c9dc27276512120264a51bf5fd21f8b0349ce384d7b18fdeb"
    },
    {
      "file": "src/engine/nativeHostility.ts",
      "sha256": "6703568c543a792a5ef421e40d6b7491f83970735d74bac1ad01affd4898ebc0"
    },
    {
      "file": "src/engine/nativeInhabitants.ts",
      "sha256": "de8998a3ef8bd44939a927108e85d13b45100411b2d58d17d46a87e9d283eacd"
    },
    {
      "file": "src/engine/nativeMonsterFactory.ts",
      "sha256": "c297dd2e1d8a0f099a8e6ecfec29b47b4a24c4251c29a33c76b336c71fc90bc1"
    },
    {
      "file": "src/engine/nativeMonsterPromotion.ts",
      "sha256": "5c4032242ecf93b6ef9ba4151931fff4a32e8058d44cade1028f908696848a4a"
    },
    {
      "file": "src/engine/nativeNavigation.ts",
      "sha256": "6e46954545e5b20a6f7e8c18ac433673b4c65008059968e9f9bb7d56d23f1532"
    },
    {
      "file": "src/engine/nativeNpcDialogueHost.ts",
      "sha256": "daefc25b507687e965a3f08f4466301d02157e892c492a39e467a0c455e1be49"
    },
    {
      "file": "src/engine/nativePlacement.ts",
      "sha256": "1c579621c5aec9705706e0ac42a62822f5a2e454179534157becc813c50cc276"
    },
    {
      "file": "src/engine/nativePopulationResolution.ts",
      "sha256": "f7d575983ab449a2a27fbff9468eb9ddb0980cd3241d03bd0f9a19c5ad456af0"
    },
    {
      "file": "src/engine/nativePopulationRules.ts",
      "sha256": "4530a37dbbebf1f4c34f5dfad68937b29ff5a09081aa6b5501f83bb21e3c35db"
    },
    {
      "file": "src/engine/nativeProgressionMeta.ts",
      "sha256": "fa638ecee47baef81a9e9875ccda54f35a14f8386e374113728895e02a9d50de"
    },
    {
      "file": "src/engine/nativeQuestOdyssey.ts",
      "sha256": "16bd44d4c17aa52f54bd3616d33470ef6ed45cf651c1c4c3333dc8af86dcf278"
    },
    {
      "file": "src/engine/nativeSceneAIHost.ts",
      "sha256": "d23351a861719cb514654f1b237f6cd0760cb02031d53a586e02e893a9d1cbbc"
    },
    {
      "file": "src/engine/nativeSceneAIPreparation.ts",
      "sha256": "3c89456c5866bf859f77f4ce1dce630d6519ab93e743e90633f9b805fc735f3f"
    },
    {
      "file": "src/engine/nativeSceneActorTick.ts",
      "sha256": "e8b9fdd71e0d040edf465ab9340c69274ac1f4d3c4203c161cd62afdab2d216a"
    },
    {
      "file": "src/engine/nativeSceneArrival.ts",
      "sha256": "d430595fb45b858cdce4c05062157a90ae8256bec4d67eafadac17a1812a7ebc"
    },
    {
      "file": "src/engine/nativeSceneBootstrap.ts",
      "sha256": "9183198902a6f8e8b1ce15e6e228ac28fe6e6d8e567e39d3cf3de86fb1581c3a"
    },
    {
      "file": "src/engine/nativeSceneBounty.ts",
      "sha256": "ee99c8c06e69d5eb80c9002a77fa7c10ddffd6aeb90544ade5a1d33dd472391b"
    },
    {
      "file": "src/engine/nativeSceneCampaignDeath.ts",
      "sha256": "7b01d07f3f00273dee823b349672b4ebf8c778d4176edc38ccaf2aafb427c259"
    },
    {
      "file": "src/engine/nativeSceneCampaignEvents.ts",
      "sha256": "039f9745e92f8161cec2fc4139c8b21cebd9e2cc73d5964dc64bfd28610bd070"
    },
    {
      "file": "src/engine/nativeSceneCampaignFrame.ts",
      "sha256": "8f47d200ca679112277888aff60c5865d09ed6d079ca70df5db08b3eab8444ee"
    },
    {
      "file": "src/engine/nativeSceneCampaignFrameClosureHost.ts",
      "sha256": "59ed9b02abf256f6c8739a2aed7c202d0953367a3013fadae4bdad3ef7ed39a5"
    },
    {
      "file": "src/engine/nativeSceneCampaignFrameSteps.ts",
      "sha256": "bed70707ccde4ec3a60ada153c4f9302a96ac650d38e2d46606e84a3b941e653"
    },
    {
      "file": "src/engine/nativeSceneCampaignLifecycle.ts",
      "sha256": "46d62e1f75b6d932bd09b698fdcd051a4887666d317845d4480c6ec9a4dfb0cb"
    },
    {
      "file": "src/engine/nativeSceneCampaignQueries.ts",
      "sha256": "251615bdc583601da69a55d4218f6d09c2c5c38e946ecde4bc5b4e2de12a1095"
    },
    {
      "file": "src/engine/nativeSceneCampaignTransitions.ts",
      "sha256": "db9cd0c5fc9ed16140e1ef41b3e5e4d32b5d71b6d427428c7c9841db071dac10"
    },
    {
      "file": "src/engine/nativeSceneCastingPreparation.ts",
      "sha256": "5e6bbca1410a421214cda443e6417b07f42f72d17307a8a45690197e2d2137d3"
    },
    {
      "file": "src/engine/nativeSceneCoast.ts",
      "sha256": "a6ec0c73bdfebeff070f7e3352ab885201ba7b99522701d54c614d9b8441d6d1"
    },
    {
      "file": "src/engine/nativeSceneCombatArena.ts",
      "sha256": "a612067449422a303910d6be6ff05447b2f356643638bc7c761bd6f6ecd5c688"
    },
    {
      "file": "src/engine/nativeSceneCombatCampaign.ts",
      "sha256": "a9d136abb61193d843b6e9541edba5b0b645378414332c1629bea7be59763ff9"
    },
    {
      "file": "src/engine/nativeSceneCombatCasting.ts",
      "sha256": "fd3f3ca62e65533e131216609798c15500fec49090fb4fec793611936e095830"
    },
    {
      "file": "src/engine/nativeSceneCombatContext.ts",
      "sha256": "5eff53eb6ec1ffc31b5bb244649853ffc6fcc25d50429dab6672fa9257c6c441"
    },
    {
      "file": "src/engine/nativeSceneCombatControl.ts",
      "sha256": "3efc2fcaa848070f5f2e7f545e9381dc9c691c954c0a44b1326e7301f424286a"
    },
    {
      "file": "src/engine/nativeSceneCombatEvents.ts",
      "sha256": "b58f70ec6731fffd5a3aecb653acd0974140cb3db087a2b713c012e4225e0224"
    },
    {
      "file": "src/engine/nativeSceneCombatHost.ts",
      "sha256": "3591322328583fa1c8d7060420145df361bb6f29448c7959b2a7657eeca4f2e9"
    },
    {
      "file": "src/engine/nativeSceneCombatMotion.ts",
      "sha256": "8f4c7a9920e72f65f028c9723e85c1c077e7742548f14cfd4e5367c80798f1ec"
    },
    {
      "file": "src/engine/nativeSceneCombatResolution.ts",
      "sha256": "2d50726ff39a3379f19b7e16f333c60bbda54e14c46cb9baee15a18ef269f06f"
    },
    {
      "file": "src/engine/nativeSceneCombatSpawning.ts",
      "sha256": "6dd2a7120bf21c66070a15ec7baf83c72050e627edaa210105bca8f0efc3b7ff"
    },
    {
      "file": "src/engine/nativeSceneCombatState.ts",
      "sha256": "2e5b873d67cf5b8813e616c4af0e325dfbd863bee6b6e327c753dbe79395dc58"
    },
    {
      "file": "src/engine/nativeSceneConfig.ts",
      "sha256": "77eb7f2f6e0089bf6fafba84c819d9ea9c4645305758cd62efd889c1f70ab314"
    },
    {
      "file": "src/engine/nativeSceneDefensePreparation.ts",
      "sha256": "b0f494f8e25d9163c3a3c26c4ec5e574b7eba61a4f70176e2b31e10b4c3f7539"
    },
    {
      "file": "src/engine/nativeSceneDepartureMemory.ts",
      "sha256": "cc14341f178bfcf79d06dd5d6d5e02d660ccab85f12aa04792e65824b5f9957e"
    },
    {
      "file": "src/engine/nativeSceneDescent.ts",
      "sha256": "e545f66aec2c0f8969bc22cd8b56791d5a0e0908b2ff0190ace5f0fcdd0da580"
    },
    {
      "file": "src/engine/nativeSceneDirectorHost.ts",
      "sha256": "444bf0805c68d6632a9a3ab798616b10708591303440249a644d85bce469d286"
    },
    {
      "file": "src/engine/nativeSceneDirectory.ts",
      "sha256": "ea91c28295f697ad01449a3bce69c4d63f055743382d4033ade643d206c1db4a"
    },
    {
      "file": "src/engine/nativeSceneDisplacement.ts",
      "sha256": "e8ce1f088b4d1c3c858cf952a386dca65a22732cd15c6bf09c66cd83c5b1f067"
    },
    {
      "file": "src/engine/nativeSceneDwell.ts",
      "sha256": "33e8fd68ebe847ca643f1fa83f1b97902ffbefde3645004c3967062c8d7812b0"
    },
    {
      "file": "src/engine/nativeSceneEcology.ts",
      "sha256": "438797d4e5947799628330fe844b6c20c85df8669952afd4fdb37436132e19bf"
    },
    {
      "file": "src/engine/nativeSceneEffectsTick.ts",
      "sha256": "ae3198896899a8d03740e9c7be809f12ef228a024bc6d66d9f083d02c84f67f6"
    },
    {
      "file": "src/engine/nativeSceneEncounterBirth.ts",
      "sha256": "67eaa96719e3a79b7036db5eca9475a9c790b949bd61210fbc0211ad77861e37"
    },
    {
      "file": "src/engine/nativeSceneEnvironment.ts",
      "sha256": "4c0ae7643bcba643af9f21245267f32ab9ee3aba7d695157a75eef9f2fc8a760"
    },
    {
      "file": "src/engine/nativeSceneFrame.ts",
      "sha256": "885b8e4199a46b1208889101b3b7d23bd73346a16d040cdcef03bb42a458cfb6"
    },
    {
      "file": "src/engine/nativeSceneFrameAreaEvents.ts",
      "sha256": "8e61391a6c801ce37ede690ad9d375ab772dc4c71eb548116f0108c6f24ea3eb"
    },
    {
      "file": "src/engine/nativeSceneFrameCallbacks.ts",
      "sha256": "66971baea8616471b98ababa55164b18ff095e049a5535e61d95a00796e1e7de"
    },
    {
      "file": "src/engine/nativeSceneFrameHost.ts",
      "sha256": "e80e57b96054085788066114deb4f51a1b6aa743df6318a98538d99ebecbfb02"
    },
    {
      "file": "src/engine/nativeSceneFrameServices.ts",
      "sha256": "286666fad21e8aea69538b8a7b0a2c0d2e8384250b969aa6c10357f18038082c"
    },
    {
      "file": "src/engine/nativeSceneFrameTravel.ts",
      "sha256": "429a88f73f871f5f54cc294a82a9264a3d2a27158006e8a1fd7b3b4c17d0960d"
    },
    {
      "file": "src/engine/nativeSceneGeometry.ts",
      "sha256": "e376effec05cc53f7a1b2aa2fa20f24239a7e37b47d47504516d0d73d27ea5cd"
    },
    {
      "file": "src/engine/nativeSceneGraph.ts",
      "sha256": "2e151a3f2ff95b755d7c4fac15999948f6ba626433115bac2e5a382f834e4847"
    },
    {
      "file": "src/engine/nativeSceneGroundFollowUps.ts",
      "sha256": "c568fd4f3ce7674868200d4b63a4c7ea330664cc6c92d0348b9aa4b0e73578f7"
    },
    {
      "file": "src/engine/nativeSceneHarbor.ts",
      "sha256": "9ec52f62351f1dc3cc3ac77c43c02acd89959a9552db1f4a07ffa91bcca8b459"
    },
    {
      "file": "src/engine/nativeSceneHistory.ts",
      "sha256": "b195be850796deca451d5acdfb34d1e87ea6a95afe3290382e69eb9f07b7f66a"
    },
    {
      "file": "src/engine/nativeSceneInput.ts",
      "sha256": "fee472e85f4018061fc16ed2804d99bedc87bea341931f363424ec7df7dda1fe"
    },
    {
      "file": "src/engine/nativeSceneKillAftermath.ts",
      "sha256": "60605459504f4e84a6282147b6d4ed239736c734f1241fee17d119e7889800e3"
    },
    {
      "file": "src/engine/nativeSceneLocalControllers.ts",
      "sha256": "ad850b74d7bb75ad8e0f1c2ce3fe5078d8c65e90350054b9f5d6b5d76386ff16"
    },
    {
      "file": "src/engine/nativeSceneLoot.ts",
      "sha256": "c830da86f515840c4758ad0c85156b675f94381170c65495f80c2f9d8712ff0a"
    },
    {
      "file": "src/engine/nativeSceneMenuHost.ts",
      "sha256": "3539b75d8524c9889ad999bbe08c5edb3eb3519a22d79ab099f612aed37d8f6b"
    },
    {
      "file": "src/engine/nativeSceneMenuQueries.ts",
      "sha256": "7b448ab271e3ed0e6c0a50da05bddc3c1d8c9b71119c43d7d237ab2e8409d3d9"
    },
    {
      "file": "src/engine/nativeSceneNearScale.ts",
      "sha256": "1833c31e4cf553492aa26fec849e166c7b19955d9d9dd6cd182f4dec16a09095"
    },
    {
      "file": "src/engine/nativeSceneObjectiveCompletion.ts",
      "sha256": "be81f8adf6f13e4a4c9307573f02c554517e1538cf120c9b03866be80c8c76db"
    },
    {
      "file": "src/engine/nativeSceneObjectiveWatching.ts",
      "sha256": "fd3dd3eb012531bff794f1a93837db7e4cc7e9efe1821d57101f8bd17ded78c0"
    },
    {
      "file": "src/engine/nativeSceneOccurrences.ts",
      "sha256": "321f332fcfd526b648e2f705fb00b5f7cb17d2e59856eaf27468133b8682db55"
    },
    {
      "file": "src/engine/nativeSceneOpenings.ts",
      "sha256": "2fde761bd077def80fb87109d5e535c6cdbac648c0a832260eac10cfa94815ae"
    },
    {
      "file": "src/engine/nativeSceneProgression.ts",
      "sha256": "c98aaa9bb1f0f3523f2f867abd70312afbbc7a7456eab62c8a365f8a9592fb95"
    },
    {
      "file": "src/engine/nativeSceneProjectiles.ts",
      "sha256": "010d4baa38c46803df7ae0d169da2d5bf4c652e4d759547788482b536db64a31"
    },
    {
      "file": "src/engine/nativeScenePuzzles.ts",
      "sha256": "1231d2939bf1955d19149ab69b09a748de5e8a99ab20dd8833b43c18822f09e6"
    },
    {
      "file": "src/engine/nativeSceneQuestInteraction.ts",
      "sha256": "c911353d1bf949f6367d98cf12724c2d466fd7d7e95c669b0ca362ed9d3a120e"
    },
    {
      "file": "src/engine/nativeSceneQuests.ts",
      "sha256": "3bd54761c3b14b3f20d5b1ab44e514e0951ab6bd7a401a480f20bb66d80ba7c1"
    },
    {
      "file": "src/engine/nativeSceneRealmArrival.ts",
      "sha256": "c6decab1c1a92ae3057d7f264a7e142b07a31c1f9be7ad42e78d77d6dd3df65b"
    },
    {
      "file": "src/engine/nativeSceneRegistration.ts",
      "sha256": "695383b5d9b20c2f5fd28c360c8c42becbe39afc1e016584b941d07be5e76990"
    },
    {
      "file": "src/engine/nativeSceneRestoration.ts",
      "sha256": "9ae4008adde9c08d86688665aae21e9690e67c2db728eaf5010a6f623141b609"
    },
    {
      "file": "src/engine/nativeSceneRetainedRealmGates.ts",
      "sha256": "53e76107c230827095ca85b24e229747e2d5aed874ea09efb3b37bfaa46f83d2"
    },
    {
      "file": "src/engine/nativeSceneRoadContext.ts",
      "sha256": "9e9a6d9f30bc5de9ed53bd8159e56fa0a78906a6cd080774c12295cc1f52db79"
    },
    {
      "file": "src/engine/nativeSceneRoadScan.ts",
      "sha256": "31871ba94bac5f00cb897d4ba3e39272b0b20aa649c6e740224e52784782b8cd"
    },
    {
      "file": "src/engine/nativeSceneRunConclusion.ts",
      "sha256": "da6de61752f2c5116567b750ac15badbee810b8f616a258c36ad607949becaaf"
    },
    {
      "file": "src/engine/nativeSceneRuntimeBirth.ts",
      "sha256": "677a995baadd1292760ef4be3b777bdde64c1dd51735fc3c81227da8044802ac"
    },
    {
      "file": "src/engine/nativeSceneRuntimeRegistry.ts",
      "sha256": "e88312be2b33e820a1d69c21a6d91bed98454d3f881479170dcfb25a8491980a"
    },
    {
      "file": "src/engine/nativeSceneSeatHiring.ts",
      "sha256": "4a302f3ec489785ff3187da4765e58a9a3ded52ad2b569f1b5285c722ba729ba"
    },
    {
      "file": "src/engine/nativeSceneServerVessel.ts",
      "sha256": "e4543c78da50b7dbca142aacec659ebaa2bfa6f5bbdcc03b1d9b12e502c025d0"
    },
    {
      "file": "src/engine/nativeSceneSites.ts",
      "sha256": "77a2a4ae7f36684a636a093698b6fb2676bcb51cac89f9916836834705a7944b"
    },
    {
      "file": "src/engine/nativeSceneSkillArrival.ts",
      "sha256": "13ac96aa67a97e3f79dcdeee47e9b24e0a666ca679f3da237ecf634f565cd0a9"
    },
    {
      "file": "src/engine/nativeSceneSky.ts",
      "sha256": "57e294f28269a18171c81ef3d757323d8c066760a01a2ed46411a10edb170be0"
    },
    {
      "file": "src/engine/nativeSceneSources.ts",
      "sha256": "31b9d3402962ae67397ac4b78179c0ab15850ecf3a77e89fe12eb6aa12ae9d2b"
    },
    {
      "file": "src/engine/nativeSceneSummonPreparation.ts",
      "sha256": "13305c7aacc0abf4fbc96ddc7b4efb79afd941d7af7213d2428abc8dc5b3ce10"
    },
    {
      "file": "src/engine/nativeSceneTerrain.ts",
      "sha256": "fb74d7de7e568a6a58348e747f69a3e75b25b3c1433948d6cabcfd1d6bcbb208"
    },
    {
      "file": "src/engine/nativeSceneTethers.ts",
      "sha256": "d24b0207aec57ccce4726350b5f176ba1ee4172d410a53e4ce0285b6f8feb947"
    },
    {
      "file": "src/engine/nativeSceneTheater.ts",
      "sha256": "0b05a888d9e67ebc79289898eee8d747052e66133890c7051f0eb72db5294c54"
    },
    {
      "file": "src/engine/nativeSceneUIActionHost.ts",
      "sha256": "e59f86c5c49d27d4b94dbdcf549c408c31bc0059df8dd5c2f0ab275cc166337a"
    },
    {
      "file": "src/engine/nativeSceneUIActions.ts",
      "sha256": "deab3b24789ab72a56cd5ab6e3950af872e65e6e15e87e189652afd437c8e765"
    },
    {
      "file": "src/engine/nativeSceneViewHost.ts",
      "sha256": "2c147c364f5bf4695a596f3cb5837bce8b626a875fb877ff0b1edec3ac2233a9"
    },
    {
      "file": "src/engine/nativeSceneViewQueries.ts",
      "sha256": "ba249ba5bd51f35047c6cbcfaa8338a9e9d0574a00fc9708d8f688238669082b"
    },
    {
      "file": "src/engine/nativeSceneVoyageArrival.ts",
      "sha256": "afcde989dbe4b3f203af4037025bfd2dff25b31bb9dd34a32c438d3725c01954"
    },
    {
      "file": "src/engine/nativeSceneWarlordBirth.ts",
      "sha256": "c3454a8dd7b2873d0831e2aeeb2049f35b368848576d299a74e9e6a70f26c462"
    },
    {
      "file": "src/engine/nativeSceneWireQueries.ts",
      "sha256": "7cc79f6935c2b8742ef2a51a9db234096a19aee67902b19de55eb9decae8364b"
    },
    {
      "file": "src/engine/nativeSettlementServices.ts",
      "sha256": "1b4ee2d4dc30f0218c464f6b3651bcf7ca1ea5d649b8d12bdfc653cae509aafe"
    },
    {
      "file": "src/engine/nativeSight.ts",
      "sha256": "7a1b7d5d233a5486bc332b63bb1174d8482e992d65eaaf613bf8824af596d729"
    },
    {
      "file": "src/engine/nativeSkillRuleHost.ts",
      "sha256": "c17d88997346663fe3f3fa18f96330118f13ea7810826b33cc7e1ddd99616945"
    },
    {
      "file": "src/engine/nativeStatusProvenance.ts",
      "sha256": "8177f34378484d5851d575e0b9ca5a42976618a424a651fb2707cd9cdab0f12d"
    },
    {
      "file": "src/engine/nativeStatusRelay.ts",
      "sha256": "fc3fc8241ab04334285751f1ad59941424bab41ea8b970216047683ccea7342c"
    },
    {
      "file": "src/engine/nativeTheaterHost.ts",
      "sha256": "5d8ea39a507864421d1b8c370ffaa318e14061e480ca3c87a446103d61300bc3"
    },
    {
      "file": "src/engine/nativeTownBody.ts",
      "sha256": "c9b0635571eedbaef7802bde90929f8323f303a4b64e340d33125057b38611bb"
    },
    {
      "file": "src/engine/nativeTownStations.ts",
      "sha256": "eb6dfbb581b3d120ee23200bf9b4d577ad7681f75d7a1c149e5193d68a4e7dbd"
    },
    {
      "file": "src/engine/nativeWarlordIdentity.ts",
      "sha256": "d07ae988f7f395c3bdec323f8eda93f4d39b41503bf717acc86c0df1f54aa35c"
    },
    {
      "file": "src/engine/nativeZoneMint.ts",
      "sha256": "c49fffc1f8df028a6783d301eb8803064fee55bff2fb26305ad1fcac7b931144"
    },
    {
      "file": "src/engine/npcDialogues.ts",
      "sha256": "5d42bfc49901e598c1d15d9bc8c9b64322f19f513bef5c2fae7019af0437c4ed"
    },
    {
      "file": "src/engine/occurrences.ts",
      "sha256": "d31d8f814fedfecfe82da607084e34d69123d3a8b5f965af68ae929c7e455084"
    },
    {
      "file": "src/engine/odyssey.ts",
      "sha256": "e9276da457da973988110add0bc9b6ef48cad5744dca59c26e9a36d113ac1b8f"
    },
    {
      "file": "src/engine/odysseyRisings.ts",
      "sha256": "ee208499b172abf009ebc34b10cb009183ac21600cbf40fe76023f5ee963e36b"
    },
    {
      "file": "src/engine/orbGeneration.ts",
      "sha256": "bc2a5008a7d11bd9278bb19f337ede98d238ce065fade3e44862d4345136f025"
    },
    {
      "file": "src/engine/pack.ts",
      "sha256": "c394f16106d714d5937afcc9809ef25634c2450fabd9ef1586d6df2b248d691a"
    },
    {
      "file": "src/engine/parry.ts",
      "sha256": "68b63d1e7299a3c3e3f5601fc3e2244be27d298276daf243366f72608bd0bab0"
    },
    {
      "file": "src/engine/party.ts",
      "sha256": "426b4d6a74460cca1ad314fa8600b5767702275a3b3b9a46a6507f8ec947573d"
    },
    {
      "file": "src/engine/passiveRefund.ts",
      "sha256": "d04037d2cb9e294400600c4b761f27a923c359c37a9d6f51ce96369cac2435e8"
    },
    {
      "file": "src/engine/payloadCues.ts",
      "sha256": "b2cf817cf5d0f3d2d4e1c5925faf19629533ac8946e8205c5dfe01eaae8ef6ce"
    },
    {
      "file": "src/engine/perception.ts",
      "sha256": "677babf9224a46accd2be6c9a6e404a3eda7df1dbe6a92145b441c2b8c8d1692"
    },
    {
      "file": "src/engine/pilgrimage.ts",
      "sha256": "b43527ae9fcb9adf4e72a73f7382aebd114c87302b75b10b7988d0c6ad2f8cb1"
    },
    {
      "file": "src/engine/pings.ts",
      "sha256": "62a060064c65f47abfd6e77c968604a03ccc1d810cfac528d23f3feda9d1d21e"
    },
    {
      "file": "src/engine/pitfall.ts",
      "sha256": "74aa7490a3347c123267bdc0db08baaae313537879069e3fe81067f9a9549b07"
    },
    {
      "file": "src/engine/playerCastVisual.ts",
      "sha256": "e5bd8f331b1d7aa7674986633f9333fc1560ebb221c51ece6930503c214d5d37"
    },
    {
      "file": "src/engine/plies.ts",
      "sha256": "b66893ee3eb96bd3368a4707258937b88201596ae8d6b4a95298beff95ba6ceb"
    },
    {
      "file": "src/engine/possess.ts",
      "sha256": "0309c2214312f20f385878c04764d365a36e665786c50c174457deb22ed1fd34"
    },
    {
      "file": "src/engine/presence.ts",
      "sha256": "2812a44bfedb22180cb556fe4dcbc1ee9309fa5b29744fa9df80387b8629d399"
    },
    {
      "file": "src/engine/procCues.ts",
      "sha256": "aded5a12f9c025788a249e504c289b468c1e7c7ec7329f285fdbc454da453e74"
    },
    {
      "file": "src/engine/procReference.ts",
      "sha256": "dfc6e49e2f8f62d00c6f155796fb04da4d0a6ec06cb9158e6bed92c84af59958"
    },
    {
      "file": "src/engine/processionObjectives.ts",
      "sha256": "40d6f5211cd99c5a60605b0efbd20aebb72c696609fe4fc582664149575dbbfb"
    },
    {
      "file": "src/engine/projForms.ts",
      "sha256": "d8cd59552e6fc0883f7055f1dbf9575912bf331dcf87e10525197b1ce36842d1"
    },
    {
      "file": "src/engine/puzzles.ts",
      "sha256": "fef055c7ba5b0a98b6da32d190554833edb343f0e73ae60239038e786e407b81"
    },
    {
      "file": "src/engine/questImbue.ts",
      "sha256": "2a9636c4137a94cf71ecc5b8f4694a391f3b7b8688b1d0b40403cefa3e61ef77"
    },
    {
      "file": "src/engine/questLedger.ts",
      "sha256": "73810003a9d492958cbc73085ed78fe4738085b4394dc26a4e184cf5468b8ce4"
    },
    {
      "file": "src/engine/questRescues.ts",
      "sha256": "9997eb09e1f6cccc85512d385def7a170788a139060b5e4f9e9ac93bd45acba7"
    },
    {
      "file": "src/engine/questRewardChoices.ts",
      "sha256": "83e336a15b0a97ac2d847e9561c0a388901442efe130d935b75e3eca181cae9c"
    },
    {
      "file": "src/engine/rampage.ts",
      "sha256": "8d5b5947097da5aec83d588720fda994d49f1bc8fcaac7177d62d9e2a62af73a"
    },
    {
      "file": "src/engine/rarity.ts",
      "sha256": "6f2531176c44e251d6c8e1acdf2cc5f42b8b126822b191056bdadba5187c9c3c"
    },
    {
      "file": "src/engine/recency.ts",
      "sha256": "1e9dd98cd8d355d76fcc24437c47f1b3b343ccefde5f508fc248aa2e22170893"
    },
    {
      "file": "src/engine/reception.ts",
      "sha256": "eff3a5d710f8aef6674eca4a27b1bf6081a9503b8095e82084b1e4a796782ca5"
    },
    {
      "file": "src/engine/refugeDeparture.ts",
      "sha256": "1c22db6a713abf249bd0e5e49db2000a8873c92f01387572141f708ea0b7155f"
    },
    {
      "file": "src/engine/relicPower.ts",
      "sha256": "ab9219babc9b29f8f3c1d9d53ab612454e1dd250ebcd56a221dcacbc008d3b35"
    },
    {
      "file": "src/engine/replenishment.ts",
      "sha256": "00049f4f83a9a75bf8e49cf4a696ed52a033181c15cf8004c2923566d1ef2ede"
    },
    {
      "file": "src/engine/reserveCues.ts",
      "sha256": "91de5d290083c63ab16bd203d6e1a40355aed09d9b394b860465de740715cb0e"
    },
    {
      "file": "src/engine/reserves.ts",
      "sha256": "98d3451986f84f849c9d215c4e99f0817b6a1fc671ee7bc75e48fcb61748316c"
    },
    {
      "file": "src/engine/rockForms.ts",
      "sha256": "5a2980a3ab7902ee20c5cfb56978d398f70fb4f0eb5d49e8caa264e86099209a"
    },
    {
      "file": "src/engine/rooted.ts",
      "sha256": "52d4ba2099131dd8dddaeca88c69441e9ddb5c85a945025ea14a12708225c379"
    },
    {
      "file": "src/engine/satelliteFlights.ts",
      "sha256": "2e4b8d8e96739bc04f18c447462179f985865d1e3391752b12638ac1918dc989"
    },
    {
      "file": "src/engine/satelliteSpec.ts",
      "sha256": "97348651424b2ba48f5fdef82fd933dbb2b80de4d9568407df0e6fe024b8af65"
    },
    {
      "file": "src/engine/satellites.ts",
      "sha256": "6e503ac3f6bd3a4a753d10306498a24ca6fb807898febbe320fbf6f506838d4c"
    },
    {
      "file": "src/engine/sceneRoad.ts",
      "sha256": "045a0fc4b1ca30800327a81943e3e394a331f170915aa7a63b1f72e24e714755"
    },
    {
      "file": "src/engine/scenes.ts",
      "sha256": "473db48b05c2a26e2fe1ee3a1e2f4cd6299de57407a1d8374601a8c37c1897a9"
    },
    {
      "file": "src/engine/seatlaw.ts",
      "sha256": "e07526d88ebdf5f151f10f1baf5cb18b0d10ab55c28ab15ba410233b49bd5895"
    },
    {
      "file": "src/engine/segments.ts",
      "sha256": "38e3cde47b808ea8ec07741a6b53d375734866dd5c8c747b172b9536a93fa8b0"
    },
    {
      "file": "src/engine/sequence.ts",
      "sha256": "033ba59cff18822678e6e4dabeb612474d08939a974513fd06d933e6f5714027"
    },
    {
      "file": "src/engine/settled.ts",
      "sha256": "fed190251efaa471ccbd8b102acce1d7a4649046f8357fc5db0c79f26da41aa8"
    },
    {
      "file": "src/engine/shapes.ts",
      "sha256": "a7cdd37cd221970959d5c42d5464df67faebc78e2f0f6591e6b33f04d60e87db"
    },
    {
      "file": "src/engine/shardMuster.ts",
      "sha256": "98c06e445d50f523b5f5b670f67b764062870afe5aba87a4a3480c34c3d99255"
    },
    {
      "file": "src/engine/shardRoads.ts",
      "sha256": "3beab6820e34f01d65adcdbe681032d1234f5f47f691dffbdd5b093c7366b1fc"
    },
    {
      "file": "src/engine/shardUnits.ts",
      "sha256": "ec14c0c7f0e32ac892bb9a1f37e0e0644e7012f4b34b151e78393a90abf700ff"
    },
    {
      "file": "src/engine/sightCover.ts",
      "sha256": "dc3ffd1f7cb5fba9f3b54bf019882185fbafecbff6a03dab12b45ddc2c681ccd"
    },
    {
      "file": "src/engine/skillEmpowerment.ts",
      "sha256": "c659d7289a834482b38358fc4e55b7158ec786fe4847544c27e2e08f58e13f23"
    },
    {
      "file": "src/engine/skillFieldVisual.ts",
      "sha256": "b2848d46a8daae13ebcf983e052d80ea2cbfb4c6984042ef17f6aac4c485ba37"
    },
    {
      "file": "src/engine/skillInputOrder.ts",
      "sha256": "c7dd5f5aa663d8c0e41aeefedda1a1d5d0ee6e8dc7ab99e132af1b0ca7e650b9"
    },
    {
      "file": "src/engine/skillMerge.ts",
      "sha256": "4e7670b341b650bb1ad32cc5d672dc56a3b7cd1238f644704c9e48af018da883"
    },
    {
      "file": "src/engine/skillMovementVisual.ts",
      "sha256": "219bdc080de5683db2a63470a60bfbb75307ca99e86bb19fda13fda24a568b9e"
    },
    {
      "file": "src/engine/skillPreview.ts",
      "sha256": "fd9049f70b7c9d44fbfc5998076df28157e606eed9ef918ae8b40dee55378455"
    },
    {
      "file": "src/engine/skillScopes.ts",
      "sha256": "fcc7ee24eef09d43f92a28767367b80f7409a93613694df508ac55bdda6df23e"
    },
    {
      "file": "src/engine/skillSelfVisual.ts",
      "sha256": "f7e22dd35a5dc7961bb896449b1f2172ce838417edb9533f0f7c35dc872640dd"
    },
    {
      "file": "src/engine/skillTetherVisual.ts",
      "sha256": "0e3e649fbda620b32f71003c79a84702220c92323e3a955b90e8a808fd284e31"
    },
    {
      "file": "src/engine/skills.ts",
      "sha256": "7e6263653e504197b439f8d4681396f28fcfaaff00b1dc74e21b50791253dc12"
    },
    {
      "file": "src/engine/skilltree.ts",
      "sha256": "f69483ee3694b0f3b3590fb0d76ed3344ce48e292864819bb60cf459c71f131b"
    },
    {
      "file": "src/engine/snowCover.ts",
      "sha256": "26d317666f98eac66e96491671b1755b313365c87efb70b1862ae08e22a08267"
    },
    {
      "file": "src/engine/spans.ts",
      "sha256": "d7ea489888aa1d89ec36494fc534cbc9e154ffb7db65611b741a4e902bc7c00d"
    },
    {
      "file": "src/engine/spatial.ts",
      "sha256": "849ac10dead8790fa2241bba39655e59e7a031b0e1b20492b13c41cfb12bf724"
    },
    {
      "file": "src/engine/speech.ts",
      "sha256": "2571875bcdadd8cce609d99b2c7b74a44e2a57c9b1a1214a3ba24d2d1747584f"
    },
    {
      "file": "src/engine/speechGrammar.ts",
      "sha256": "16bd538b3f06888cecdd0961420460eac90b2c7a3e9511c0f5ff96b8a48ddc95"
    },
    {
      "file": "src/engine/squish.ts",
      "sha256": "86a70ae81cd1f1cc4e3c3ae9510864ee665114d2d91af9960bf90612dd240813"
    },
    {
      "file": "src/engine/stash.ts",
      "sha256": "1f421a4b8a71fc378325175b154164ba42f4be7f3bec5877e0fcf3d8859d3e2d"
    },
    {
      "file": "src/engine/stats.ts",
      "sha256": "1967810c34bb5a8bc7a03023fb0d24c1321d749a5050fc4040e83846fa9df52c"
    },
    {
      "file": "src/engine/status.ts",
      "sha256": "f4b6a7e42f7cf5bcc2023c502cd6757cab4ffe085a6e2392978090006c6eba38"
    },
    {
      "file": "src/engine/statusVoice.ts",
      "sha256": "b4049873a4c90d96c4a6d079852a84c220ff9d1949f1bf54b2acfa322a665bd9"
    },
    {
      "file": "src/engine/structureGen.ts",
      "sha256": "62f037c144012d1000763508ab47e1d1dfcc49e9b7318be6b69b12d9eb373165"
    },
    {
      "file": "src/engine/structurePlans.ts",
      "sha256": "b3705ebdc9d316d1f2a83fe7f099e8b5a5d20ae65a69cb7d62effe31188f740a"
    },
    {
      "file": "src/engine/summonContracts.ts",
      "sha256": "7fb42ae8c4e2bff47a927bb2c4678024aabe86843758551277b3e9fc33d321e5"
    },
    {
      "file": "src/engine/supportbase.ts",
      "sha256": "e012cd0a303702a6b952a04146ad942d432e075432769ec5d732657019ae6f5a"
    },
    {
      "file": "src/engine/swapReadiness.ts",
      "sha256": "f97a9309f508d094fe12cad8915343edffe99139b3bb5f13cd0e27b964e0c9f8"
    },
    {
      "file": "src/engine/sympathy.ts",
      "sha256": "f66dad992eba1bb738d650d37f6b36df4a4b1714af026709e2fd34026b092f1f"
    },
    {
      "file": "src/engine/tap.ts",
      "sha256": "71cd4dc70d9d262f68d8ed83d7c69b96e8a1e228153a8bb9015460f626d9c1a1"
    },
    {
      "file": "src/engine/tells.ts",
      "sha256": "f49a7f611cbb07048902321b6158129831352879240a7a1568319ef6ed424f08"
    },
    {
      "file": "src/engine/theater.ts",
      "sha256": "99f394b9c4ac8df1d86fe11880f6f0bf4bd58c0132748395f6b50fb8f738a062"
    },
    {
      "file": "src/engine/throng.ts",
      "sha256": "9e19bfdded011de4940578d6f28b266c00a1b423618eae18f777c18ee9ed3479"
    },
    {
      "file": "src/engine/throngEvolution.ts",
      "sha256": "791212f22d673bd37575c1feafc24743f1e90fb3ab474e02a4b172ee0f619078"
    },
    {
      "file": "src/engine/tiers.ts",
      "sha256": "8492e09732df982b1c5bb920651438592dddbbd085717232fecd86a856c18eb5"
    },
    {
      "file": "src/engine/timeflow.ts",
      "sha256": "a8f16f0aa68bc609ffff4e32baf7c07c68edecc4f71edcb99836b52ea6a9a33e"
    },
    {
      "file": "src/engine/titans.ts",
      "sha256": "7106c69ba1d83abebc0c8e2e94764eb942ff44b337b692df21665bdce1cec9f4"
    },
    {
      "file": "src/engine/townportal.ts",
      "sha256": "5d2b0b4933619bfd5b292dc3eb5ea971da92a417fa1a263e5c5515dbf789bab1"
    },
    {
      "file": "src/engine/trace.ts",
      "sha256": "6d847384c821a24c421023a46f12174ecf2b3f67ea5c9a0e20bd6914b5124af1"
    },
    {
      "file": "src/engine/tracks.ts",
      "sha256": "01ea6bc99b6c46ff7cb69d46f94d2fa66ab7e4127aa800d5790ee033384b4b3d"
    },
    {
      "file": "src/engine/trainingYard.ts",
      "sha256": "eabb586b6d4892a9f574a3a6037cef37dfc1652850c35db2c9629a2e002c84a5"
    },
    {
      "file": "src/engine/trapworks.ts",
      "sha256": "24c793773ad82a28f486670b8bd7f1fb37988abea87ceb6bf78bd3f2a70ea1c7"
    },
    {
      "file": "src/engine/traversal.ts",
      "sha256": "fd330661c552fcb2a4a8c6b6655023631738dc93569633d2ffa1d2926368c155"
    },
    {
      "file": "src/engine/tuning.ts",
      "sha256": "e5b965c2a63a1cdc4bf8ac31c74918944e73a2974838b3ba824067fe2361b8ea"
    },
    {
      "file": "src/engine/ultimates.ts",
      "sha256": "e6f32615c0f92fc884c2261f30d1898086e53c3a9393ccb08d7904837e9fdb18"
    },
    {
      "file": "src/engine/veil.ts",
      "sha256": "efdd01eb86e2d528cc60cee28bb72ce871dedfecc80906ead1c0efa439def6c4"
    },
    {
      "file": "src/engine/ventDweller.ts",
      "sha256": "ec9c60d04caebf795b21fd7d594078c8546589321f6af49a78c8feb0500ca4c8"
    },
    {
      "file": "src/engine/ventcauldron.ts",
      "sha256": "4994c3dd6b5186b917f1f9e4b27ab26ea37c9570211e84f234347b93ad23a910"
    },
    {
      "file": "src/engine/victim.ts",
      "sha256": "1d0ddc6578d1e965ef148551df2c52e275cec0eee76283ad739f3e03f09d87ee"
    },
    {
      "file": "src/engine/warningCues.ts",
      "sha256": "c6adbf4e4e2484bf68fc1f1519065dc130d8ebebc8177a7f6b8ca77baaf41a3a"
    },
    {
      "file": "src/engine/watch.ts",
      "sha256": "fc3c859c34b075ae055dfd1b62e580ebc8bc38ea0ee3d1b54a3c8fd46c58e1c1"
    },
    {
      "file": "src/engine/weakpoints.ts",
      "sha256": "47fc89dcc30596d7bab77217006ba25365cb946e62f1ded562ee7a3ddd2c377e"
    },
    {
      "file": "src/engine/weatherDress.ts",
      "sha256": "709ddd7115332454e674748cc0269e4f44fab0f64584ae49b745a290f89fd7a0"
    },
    {
      "file": "src/engine/worldgen.ts",
      "sha256": "3945ca6d4b63f01f69f20c386b0b32b60a82f3e2228b12fb5686f3415126a224"
    },
    {
      "file": "src/engine/zonecontents.ts",
      "sha256": "15b897806b1c907b9778bfeb9c0b1ee5f86454a64415f18a72bd431ab790b9dd"
    },
    {
      "file": "src/loading/frame.ts",
      "sha256": "59f9ddbad054f61cf176bbcf8c53ecb582c011a428dcb149c5723424f23fd216"
    },
    {
      "file": "src/loading/frameAsset.d.ts",
      "sha256": "ca060732999f45caec50d0d7d4f7f64fd07a6537fa050b5a52ec6e31eac07e1a"
    },
    {
      "file": "src/loading/loadingSurface.ts",
      "sha256": "1f05341be99381ac791da73d58cf4932dfb0a13ff3898c0e3e11c5d9d3913908"
    },
    {
      "file": "src/loading/protocol.ts",
      "sha256": "0c9d2d830be5ce04234235b6489640c96db75c280260ab32bbbd45d0b31d7306"
    },
    {
      "file": "src/loading/spiritRun.ts",
      "sha256": "3cd95250e9a7276409c9d269329cf7e6f820ec72bed40dae4d11671709fa6286"
    },
    {
      "file": "src/loading/spiritView.ts",
      "sha256": "d013e4281ea5e077b10f19df1b4f84762cd1ebecd894accb480230d2b55a8d51"
    },
    {
      "file": "src/main.ts",
      "sha256": "437b0e94d66690b0948a3ffe9794909904a4bb4f3b55407f60ea9d6961816e5c"
    },
    {
      "file": "src/meta/account.ts",
      "sha256": "49879fb74d781d73a786f6bfa3907ff7427532f7135b2dece0b78ddc4fc16e19"
    },
    {
      "file": "src/meta/atlas.ts",
      "sha256": "a1a29cd4e76a75d6dd8350334140ddb550593ff16ec1d2d36ac3ee415e04db22"
    },
    {
      "file": "src/meta/browserNativePages.ts",
      "sha256": "d5a07e6296e82ab446afde44936ed2f4ab813e8c2a6a2407dd6cff6bde14f9f5"
    },
    {
      "file": "src/meta/browserRunStore.ts",
      "sha256": "879489f8ed426ec5674b66b491ef94e1fa225cdbdd2546dbc7d9fcfbf26b5329"
    },
    {
      "file": "src/meta/character.ts",
      "sha256": "ba4db0fea49b942ba6b767edfda57d0f418974f0ea1c88bcec3016ed166765bb"
    },
    {
      "file": "src/meta/characterPages.ts",
      "sha256": "b400ed2f97678ec00b405bb948576f8017f161ae82cda6304e4e1baad8ea0a18"
    },
    {
      "file": "src/meta/characterResume.ts",
      "sha256": "2a823bceff27d4754ac50692f3dd10c06868380a2dea3413f4415178dd8d3304"
    },
    {
      "file": "src/meta/classkit.ts",
      "sha256": "cfbefb3b6961d2c90e9245534acbb6c07b4e6ce10825a863a98b9fd4d462d498"
    },
    {
      "file": "src/meta/cosmetics.ts",
      "sha256": "3254605cbba2a0f57c1bbdd5814bd0f468f937f79d323931bf1a882e0a875ed1"
    },
    {
      "file": "src/meta/death.ts",
      "sha256": "15b6045f17e00a051f0a505ab30806948dee767538cbffa5b5f42b35b6890195"
    },
    {
      "file": "src/meta/gates.ts",
      "sha256": "6b8a8b6c992e0a68d65d87d31cc02dbc388589984c1dd1d4ceaefd57e9de753c"
    },
    {
      "file": "src/meta/memoryUnlocks.ts",
      "sha256": "3f1f37415b070e65deb228c147f388cedbca78d3ac97760f232805ee62a115e1"
    },
    {
      "file": "src/meta/mercs.ts",
      "sha256": "9e7c36027fd2fc31d43403408ed029c2dbd4c7b6becce8667135e25f0376c94c"
    },
    {
      "file": "src/meta/modes.ts",
      "sha256": "58d9cd69f5049d3030a36e654eec43fbb472f33ba6c1f3da015979621959101e"
    },
    {
      "file": "src/meta/nemesis.ts",
      "sha256": "e286a236383a32eba5853de70bb1bae9e0b9767a18571e1a0162061f1c5014d4"
    },
    {
      "file": "src/meta/persistence.ts",
      "sha256": "3a90cbd6875da213a0f50d51f4d8bc4a9662aab1003612a405b553247988acaf"
    },
    {
      "file": "src/meta/portage.ts",
      "sha256": "2dec6b606c542730d9ecf29ba88e2356eeaaf1651ec7a51756bf4a37e717fe11"
    },
    {
      "file": "src/meta/reliquary.ts",
      "sha256": "96764894022198a4529e2d33b2e360803ebbde8d98683485f485cdd13cebaf9b"
    },
    {
      "file": "src/meta/resumeWorld.ts",
      "sha256": "89fb5111e2e209c08efdf05ca5dbeb414993c762a37dee531703ed7d1d06ac59"
    },
    {
      "file": "src/meta/saveCompatibility.ts",
      "sha256": "39209ee54234eb351ecfa4bd18949e0e8798fbb9868df3aa99607609c83836d7"
    },
    {
      "file": "src/meta/settings.ts",
      "sha256": "54caa84780c37e395505b64d443b5ccd09a02fa12e4e975bb27d2fa7621a6200"
    },
    {
      "file": "src/meta/shardVessel.ts",
      "sha256": "467697d844dc551cf93ed9bc853a9a62280d64aa9fbfc67103ea1856fcae1b8d"
    },
    {
      "file": "src/meta/skillSlotMemory.ts",
      "sha256": "d5efc5637555b615d61450b568fa6183b1653c08501b09d4577664a37ac29db5"
    },
    {
      "file": "src/meta/unlocks.ts",
      "sha256": "2aee46475e693debc1664ac203d12bdc6d9cc5bdd1de27b29eae5179fab85fee"
    },
    {
      "file": "src/meta/workshop.ts",
      "sha256": "1aa1e12dc5b5593938d30d94f3fd692cfd4df5b1b18324521ae2844713f12116"
    },
    {
      "file": "src/net/couch.ts",
      "sha256": "54ccec333b3b8cb317a6c214b2b0403be5411fc2ca49be086e9a8f9912723dcd"
    },
    {
      "file": "src/net/crossing.ts",
      "sha256": "190162ffc2e45f56d6f7bb15b1b4f26bd1e45fc7b8100c5704e56a998e79d600"
    },
    {
      "file": "src/net/foresightWire.ts",
      "sha256": "86347c54c0afe12d623acc8a67976a140b45fe78dc37849d23b81006333fce84"
    },
    {
      "file": "src/net/intent.ts",
      "sha256": "d01e672985faff26b2e7952bab6452ebc3af9b9b5685dc7137c51ca6460911e4"
    },
    {
      "file": "src/net/journalWire.ts",
      "sha256": "014784aad2d71cecac840b506aee9a5f41eeee33b26d1796d7dc69e10e8a9327"
    },
    {
      "file": "src/net/local.ts",
      "sha256": "4f21b4b051a4a33e9e103fb2d4fb607d7d49953ff6039b57fde37a981bf0ef24"
    },
    {
      "file": "src/net/nativeHostedPublication.ts",
      "sha256": "aee60f2b96a6dc7e359be9c4412815a17ecae3267157fc0f2b7d4e0b6a0820ff"
    },
    {
      "file": "src/net/nativeSnapshotHost.ts",
      "sha256": "428fbe6391d3cd758147c3cc8ab1958ba9f92ecb8414003ea54435a38592e34b"
    },
    {
      "file": "src/net/partyReads.ts",
      "sha256": "9b9da9aafad36d6456039e9937f58bc70ad81907f5db4d6636b151a4c52f421a"
    },
    {
      "file": "src/net/partyWire.ts",
      "sha256": "f50fe74e82245a9577572ca47b19831d3f2bf370e749fd9b4ec9cb866fbbe6c9"
    },
    {
      "file": "src/net/predict.ts",
      "sha256": "f4a965472668b8e4137061b99ac46dfda95ff00d298c84e5b6bbe01a4e405e47"
    },
    {
      "file": "src/net/remote.ts",
      "sha256": "c55a26b07f0eb5b92a1cb786ec94966372975e6d56f5d560ca92cf29a5c008bd"
    },
    {
      "file": "src/net/scripted.ts",
      "sha256": "8f8d4d596c3ff66118173f8e5d7d1ebca7d8a7bf49e8302b9d348b2981efbce2"
    },
    {
      "file": "src/net/seatView.ts",
      "sha256": "d343bfe773dd9375988af100c16025a793a3fd9aec2f0a6c7c4c5937dce22ca4"
    },
    {
      "file": "src/net/shardBuild.ts",
      "sha256": "d3dd24bed68ad3349a8499c5907e86ec81abcb25e976f9aa96885b63dbc261b8"
    },
    {
      "file": "src/net/shardDoor.ts",
      "sha256": "b22d622c6c79d5c70a357590c86436a6bebde78438d0a2425620dc5541c17d31"
    },
    {
      "file": "src/net/shell.ts",
      "sha256": "bb14b8b3e49fb0f831dcb9c5b40cef3cef435efcf40de5358dcf19d005cf1d53"
    },
    {
      "file": "src/net/snapshot.ts",
      "sha256": "1818765334fe6a259615a30483519197460984ea086f17b243d9002b735846c2"
    },
    {
      "file": "src/net/spoils.ts",
      "sha256": "a326f6e65728fb72f9a290d04cbc6d18683182dc1bdbf2887fee76ba39bb6729"
    },
    {
      "file": "src/net/transport.ts",
      "sha256": "465a382a9835ee599f34aa5b8d902cac78979845e40a048408512f203be2f891"
    },
    {
      "file": "src/net/vesselWire.ts",
      "sha256": "77e7befa2ba2efaf003bbac010ec1b59e6b1993cd7de16e2529003db7cd38fbb"
    },
    {
      "file": "src/net/webrtc.ts",
      "sha256": "f1122479d352e1bca1a751222792633f88639afa30f512f3f27844a15026c750"
    },
    {
      "file": "src/net/wildsClient.ts",
      "sha256": "5c1c98565ce9b45aca2ab4f31d48727262bf37e0fdbc4e1a507e27310ae52d59"
    },
    {
      "file": "src/net/wireDiet.ts",
      "sha256": "9551f7205810c0ea69df070f915abf492c147d1f2506ee224563e53bd0eaa75e"
    },
    {
      "file": "src/net/ws.ts",
      "sha256": "7d1461c909fc69fefadc2e2088d9beb6ed6b0ce72db19fe0273d6f755f7d13f1"
    },
    {
      "file": "src/net/wsframe.ts",
      "sha256": "2bd891f2b435f4ce2ded77c21509c9e3a806073eaea6ed25e600d0c2285160c8"
    },
    {
      "file": "src/packages/contagionStrains.ts",
      "sha256": "e6fcd1572c1b33575804ccbb0ab20752a7ab550a8af9a8195ac8e41ba09e4971"
    },
    {
      "file": "src/packages/courts.ts",
      "sha256": "21ee029c7c1ef9aca3b5aeafa3db37cbbc47abf4329ea2ca14a35c2450808665"
    },
    {
      "file": "src/packages/defs/amalgamation.ts",
      "sha256": "606e59ee0e402371becdf7557ec41822385340d9596a7422530c4a64112d841d"
    },
    {
      "file": "src/packages/defs/ascent.ts",
      "sha256": "df49a0758bc81e8abca031353ab96e0ec2665c72bed9b803ffcbe061f34931a3"
    },
    {
      "file": "src/packages/defs/borough.ts",
      "sha256": "bb775f270ebec5b7de438efdd73b73c71e87a4f6eee37ceeb10481a1cd048fbd"
    },
    {
      "file": "src/packages/defs/breach.ts",
      "sha256": "f8f8fdfafd1765e822984de8da66007a12c5ca88d402b6bbab4ba57bb4d7f6d2"
    },
    {
      "file": "src/packages/defs/brigands.ts",
      "sha256": "7594d0e78e497ef4c14d8511941e7332d95e34288bc70d460bcdf3aed4827b75"
    },
    {
      "file": "src/packages/defs/conclave.ts",
      "sha256": "5b802f38cb059636119d66eef4546f2e866e8c205af4be7ff5db5904bca1dcaf"
    },
    {
      "file": "src/packages/defs/contagion.ts",
      "sha256": "7550db4ebaa5661a83c0a5dad2f4571b72dd392ab22bf333616d77db9b71c1ec"
    },
    {
      "file": "src/packages/defs/crusade.ts",
      "sha256": "034aa1250d639c9ea895dcd095148e3180256904614da4a1490f962f13abdf76"
    },
    {
      "file": "src/packages/defs/deadwake.ts",
      "sha256": "0f2bd8967e9d6bfbb1be25aa1608d0071472aad184d7208c1672367a50f9cd0b"
    },
    {
      "file": "src/packages/defs/deepwinter.ts",
      "sha256": "c41bf1feb22ea22b36773e029794d695d047ec1715c512bf9764afc99c1889ac"
    },
    {
      "file": "src/packages/defs/demonInvasion.ts",
      "sha256": "557f460c35193361f3fb12265731d9e461b71bc297787f8069aca8cb1f1407a8"
    },
    {
      "file": "src/packages/defs/descent.ts",
      "sha256": "684c601add1cfc60284bc720797e101f2ceb50938a6ebd6a363c5ab3e0ae63d7"
    },
    {
      "file": "src/packages/defs/drove.ts",
      "sha256": "1f76441b59aff567861481cdf14caccd77e2b1a8db88b80a5ae4771295f6411d"
    },
    {
      "file": "src/packages/defs/extraction.ts",
      "sha256": "3dfe8fe51560233e13e4cd1e486b1121dbdd455ea3723f702b4a06b7949deed2"
    },
    {
      "file": "src/packages/defs/factionPolitics.ts",
      "sha256": "76165a897251b14f16ea1cc6fab3b11c9ea4447763315e394abdf547dfb8bf0f"
    },
    {
      "file": "src/packages/defs/fractures.ts",
      "sha256": "592274867d637b3609029b383e1a5a178779b8cb56232d5fd5fa3ec178d13c9e"
    },
    {
      "file": "src/packages/defs/gloaming.ts",
      "sha256": "ef4e8bd988997b1fad4852662a9beb8cbedb7df4099e3825dfa0ca1a95b676a9"
    },
    {
      "file": "src/packages/defs/haunting.ts",
      "sha256": "537ec6fcc698428548baa1bcdf5bf5b7473fb1bbe0e3d362620b619b374ec135"
    },
    {
      "file": "src/packages/defs/holdfast.ts",
      "sha256": "4df83100777eea7687cf1a65e2494679b6d5517ffaed38656b172d30db5c4ffc"
    },
    {
      "file": "src/packages/defs/hunt.ts",
      "sha256": "dee9059b6e60daa14d8c97c95759fab3d0a2c5d74e81a615f0e6fd5a1f3efdd0"
    },
    {
      "file": "src/packages/defs/longNight.ts",
      "sha256": "a2732cfc87272f445a501308dcd8a1d68d1117b2e1d4467da312d8e1a94ea4c4"
    },
    {
      "file": "src/packages/defs/longcandle.ts",
      "sha256": "f10100c68deba3472234b5760c102344d64cf6db104dcd6ceea3c0d7ecae6af8"
    },
    {
      "file": "src/packages/defs/migration.ts",
      "sha256": "3efc6057c2403aafb3db84498a4811c97fcc2db9427fb28a189f748e57edc659"
    },
    {
      "file": "src/packages/defs/mirrorkin.ts",
      "sha256": "a86952f51677357332dc401cc478df4f100751a87546e3489c7dd63389a91f36"
    },
    {
      "file": "src/packages/defs/mycelia.ts",
      "sha256": "da688ea5aca21e835ee73e758898652068ef6f11fb5aad6ff6ae42d1b9d714fc"
    },
    {
      "file": "src/packages/defs/pit.ts",
      "sha256": "66ffa7cfd3b9284cc18de27521413de532eafef7f4ba9aca4c9ae57e61250ad3"
    },
    {
      "file": "src/packages/defs/quickening.ts",
      "sha256": "f3dd2e68b341fa52854a468193d710b018b5f62879bb70f4ea165d984cb6006a"
    },
    {
      "file": "src/packages/defs/stormFronts.ts",
      "sha256": "0d9711d5e9ac5b717675e2463b9a2d92d940aa8cbc947f75758c6688b24e999b"
    },
    {
      "file": "src/packages/defs/straying.ts",
      "sha256": "399f741ee32f71df6830644fd36d0ae1c2e8eededf3f23a3fd6195e1e0e9a18f"
    },
    {
      "file": "src/packages/defs/swarming.ts",
      "sha256": "24d9c16302685bed1a097a065b7cfcbabed2361665e589121434b7df93693577"
    },
    {
      "file": "src/packages/defs/titans.ts",
      "sha256": "11d9c3dbfb15639fccd728e80ae9b1c939d006ee44858c63d5c1a8b702639a07"
    },
    {
      "file": "src/packages/defs/underworldWar.ts",
      "sha256": "eeb34f0294511cba26d7462b6afd9c8f112134c2f822af64e43746faaad1243c"
    },
    {
      "file": "src/packages/defs/unsealing.ts",
      "sha256": "7e022f661d431bcfc92e3916943affd3e9267bbebab4d733fb0295c01aa3c49b"
    },
    {
      "file": "src/packages/defs/vendetta.ts",
      "sha256": "fcd71577b41fd8689e987e37088695680bde45258a187653b8c63c3b47da4521"
    },
    {
      "file": "src/packages/defs/verminfall.ts",
      "sha256": "196e06973fb7534f8d4c9bd9c2fb2d8ee02534d2c261bcceee204e00c3dd2ae8"
    },
    {
      "file": "src/packages/defs/warbands.ts",
      "sha256": "88d9fe9fc3a2fd0cd5a98898d59c5cec56fafb872ac5c72e24bf8cf6fd9de3d3"
    },
    {
      "file": "src/packages/defs/wisplight.ts",
      "sha256": "faf4b7989823f3e1a22165d0f706c089f9514ed17f531a1c7b74f134810bb26a"
    },
    {
      "file": "src/packages/defs/worldboss.ts",
      "sha256": "b5930d1fb99cb2fb3c65bdf705803545a7e438b3465affcc0e502eb048ab48a1"
    },
    {
      "file": "src/packages/defs/wraithsail.ts",
      "sha256": "9e4873a3ca2e4b3cf2025594cb5013e375b276deca689b6f2fb35d0c958c99f0"
    },
    {
      "file": "src/packages/encounters.ts",
      "sha256": "0e6673fc2ec9072e3c1dc482cf8e8b03fa43a86b58bdd2ef2779fccb79a9178d"
    },
    {
      "file": "src/packages/factionGen.ts",
      "sha256": "7714b547d97f8c2077ac3f38d1f3f839eb9bdb9b204dcb7d605b68ae49ce0f34"
    },
    {
      "file": "src/packages/frequency.ts",
      "sha256": "7194f006c5c025af15dd53fa64c16cce9700d3fcf60ce008bb5b12a7b4358df6"
    },
    {
      "file": "src/packages/groundClaims.ts",
      "sha256": "3ac8bd41dc50314f170bc63f03bc1af088a17f044435363aea7aace9d8c8bd4c"
    },
    {
      "file": "src/packages/holdfast.ts",
      "sha256": "3e2ae6bae88eb5a5af919082313e742200c3cabaac9bf4999d804437fb69b60c"
    },
    {
      "file": "src/packages/ledger.ts",
      "sha256": "1f00ae629319f78f26d234a8c1aff7d538f631d82219b3753f49803e5962fcbd"
    },
    {
      "file": "src/packages/lords.ts",
      "sha256": "4c3150b67b4f88d476ddef76d242e2804c0e597545f8dff58c4d69671546b259"
    },
    {
      "file": "src/packages/manifest.ts",
      "sha256": "5d439d3065786f4ee2af3f14dde41caafacecaca41299d4d080ea4fb508525f8"
    },
    {
      "file": "src/packages/overlays/amalgamation.ts",
      "sha256": "7bdb7ffb9ef53daefddc43781a43f42eee64b99eeb90631f081e48523b4da1e8"
    },
    {
      "file": "src/packages/overlays/ascent.ts",
      "sha256": "1c7c56b6ed9590f5555d1ae73df5a4b933bf93fbb771d3c7e016d230b8e1ba26"
    },
    {
      "file": "src/packages/overlays/borough.ts",
      "sha256": "4ebb3ab02c83c5153af7cb8c53d7697677c3bfd9fab55bb739b250e267bb0762"
    },
    {
      "file": "src/packages/overlays/breach.ts",
      "sha256": "647beaa371c5916125d8bb04b3091bcaca3f371101cb8f02384eb928dae43f7a"
    },
    {
      "file": "src/packages/overlays/brigands.ts",
      "sha256": "8540c9e36fb95a94fd1c2922ac8568fe12dea0f5eedc9ce614d8c11af187f3b4"
    },
    {
      "file": "src/packages/overlays/conclave.ts",
      "sha256": "3dfd3d404d13f75dff966a919a37d5455d2d86176c9b4dbea25e1240fe3257b8"
    },
    {
      "file": "src/packages/overlays/contagion.ts",
      "sha256": "6d329528e92c99fc3b0f51706091c64c0820b6940c885c8459ca6914d5b843c9"
    },
    {
      "file": "src/packages/overlays/deadwake.ts",
      "sha256": "01f5171d5b67fe653e242cc1ad4eb6a310d317ad77a3fd6e4488d8680399edae"
    },
    {
      "file": "src/packages/overlays/deepwinter.ts",
      "sha256": "647e0489d8f7b8778a9dd5b586d12710f0ecbc715f0a4d6acb56089ba94144cb"
    },
    {
      "file": "src/packages/overlays/demonInvasion.ts",
      "sha256": "2068cae8a952f35dff73a3ea1e3e5463eb92bedf344c2ca8b04ea550e4fdd50d"
    },
    {
      "file": "src/packages/overlays/descent.ts",
      "sha256": "7ef0d52eff382c125741c3ee2d3e131c043f4a8814e532c92e3802c438100bcb"
    },
    {
      "file": "src/packages/overlays/drove.ts",
      "sha256": "0b12ed3468f5c748935c06d9b06178b9b0a28a6fc639a07e2f71b865c9f4d1d9"
    },
    {
      "file": "src/packages/overlays/extraction.ts",
      "sha256": "70194179f47fe5bf6bd445022bbcb2de8dd7cb24e624de76bec7a2de2b3e5d91"
    },
    {
      "file": "src/packages/overlays/fractures.ts",
      "sha256": "99857ae35016ef24a360a04749f4145b7e731e1a24b65b2da0eaa45b78e6d355"
    },
    {
      "file": "src/packages/overlays/gloaming.ts",
      "sha256": "81668cb34c2855745066222b1cca2b5f14bab78182bf5bb99d7ca528ecd09aa5"
    },
    {
      "file": "src/packages/overlays/haunting.ts",
      "sha256": "1f18fed376fa69d96b8a9ab30173b23934e2ae91fa74528c2addbbc440f03b66"
    },
    {
      "file": "src/packages/overlays/hellWar.ts",
      "sha256": "5dc6c3656cbca10babc20fcadd3735409c0b4d59ee1ce74d7b884dc9a90bffaa"
    },
    {
      "file": "src/packages/overlays/holdfast.ts",
      "sha256": "72ebbd8a78f7383b346e9a654ee706fc68a23647e0c09f14f072812ae4300d86"
    },
    {
      "file": "src/packages/overlays/hunt.ts",
      "sha256": "f274660db586f70192545b9fbc061a417a0eb2a20f6e53cbb8a454ff7df42a50"
    },
    {
      "file": "src/packages/overlays/incursion.ts",
      "sha256": "eeee1aa6f9372e225f78acfc0fa98db3895dd406899e3530f421bc50d1dfc7c5"
    },
    {
      "file": "src/packages/overlays/longNight.ts",
      "sha256": "dfcffcfede912a965e3f634fbe39c1b9884e934c0ef9f1659715edf462f9c638"
    },
    {
      "file": "src/packages/overlays/longcandle.ts",
      "sha256": "b9f7f8ffaf661c8ad3d323912277882856ee155d3b12a64d1fd8ce3f8800c968"
    },
    {
      "file": "src/packages/overlays/migration.ts",
      "sha256": "b08e781c12cf29155a45e5eec17e8d80a11ab71e68968e818f857cd041aea4d0"
    },
    {
      "file": "src/packages/overlays/mycelia.ts",
      "sha256": "c755d892ea4707cad710d237c1ee4f161f48b2fd8e2ac0dd6f5a7d6ed3e57098"
    },
    {
      "file": "src/packages/overlays/quickening.ts",
      "sha256": "8ac4d3bf12d8af98d60ef4ffa589895097a6951ee95998b187b51f7bc6fba239"
    },
    {
      "file": "src/packages/overlays/straying.ts",
      "sha256": "50dd452835acae01ba93b8e9b189ff51e408ec0562308bd24eda1c0f416f38c6"
    },
    {
      "file": "src/packages/overlays/swarming.ts",
      "sha256": "530c753dfbb1addf81abe5701e2e7efa2afbe7ba0bd604ea3772c86d31a877a5"
    },
    {
      "file": "src/packages/overlays/titans.ts",
      "sha256": "8604be03901faee5797e0331ef509ab96dbf4e1c43703425c49fafb82299705d"
    },
    {
      "file": "src/packages/overlays/unsealing.ts",
      "sha256": "57f08ad0b9d217c353932011e44de59bbc22efcfe16b4540d7e921394f45f10d"
    },
    {
      "file": "src/packages/overlays/vendetta.ts",
      "sha256": "ae3073043515cecad59cf7a393bd9470e0bbf2f0a9db3907d42fdf7b08006f65"
    },
    {
      "file": "src/packages/overlays/verminfall.ts",
      "sha256": "a4695f1f452cc231fcf9d61b34c62d96c94b6e12554801bc51db9893d2c7a5d8"
    },
    {
      "file": "src/packages/overlays/wisplight.ts",
      "sha256": "fc9df4740cde2e0ff822fc65fa187ce2984ab16ae321575abb7401d9f1c18224"
    },
    {
      "file": "src/packages/overlays/worldboss.ts",
      "sha256": "038bdcdc7b5932dce1fae5f5426b4d3d2f191e9915035e218d284ce9675f3250"
    },
    {
      "file": "src/packages/overlays/wraithsail.ts",
      "sha256": "ab9a48f787a32b556cbb5fa021e93797e77e5d4a07936230977e50f1dd312c8f"
    },
    {
      "file": "src/packages/registry.ts",
      "sha256": "c57e80a3eb417dce0c438a1a636f6bd45f4ab046d88ce95f16150a6f32a4a1e5"
    },
    {
      "file": "src/packages/types.ts",
      "sha256": "8694317ac979dac04b9fb80c1edd031473b31e51f54e02127f047414b42070d8"
    },
    {
      "file": "src/packages/unsealing.ts",
      "sha256": "79814ae20c9194b73935da7a7e73c3829f833b4761893ce22084e0d427125e07"
    },
    {
      "file": "src/packages/validation.ts",
      "sha256": "43ae51d55b6792c4b3556601db2ab91c229431a9c2e78224699635ef3f20c09e"
    },
    {
      "file": "src/packages/weighting.ts",
      "sha256": "2d38b8335f98de9ec69de7eeeba67e3749d3ede2f192e4c2904ece6adaa35f60"
    },
    {
      "file": "src/quests/brandt.ts",
      "sha256": "f0b642575fa7065e16c3cd9386fd1b6d6bb62ac7966edb89a7197a9223258c77"
    },
    {
      "file": "src/quests/defs.ts",
      "sha256": "82c1d49b00339e5f6d5f885f043105937e36108dcde6e17a9e7556996dafa468"
    },
    {
      "file": "src/quests/frontier.ts",
      "sha256": "74ca2f14670a8bca2fc795dc856239640df8a98f48c3a3a6373639e9c9d1647a"
    },
    {
      "file": "src/quests/odyssey.ts",
      "sha256": "f058428686e132f241c50c6b30b9639068981d96fcc07efb5dcbea85a03a91df"
    },
    {
      "file": "src/quests/reliquary.ts",
      "sha256": "41f3e586e6f28268142b01bbc0b4ae254bb13ed08a2ed003c08e69813ac639a4"
    },
    {
      "file": "src/quests/revenge.ts",
      "sha256": "109a87b5ed00de8e0b72cdf214a87292ed8b926dd0165577c6980d192b9b7ee0"
    },
    {
      "file": "src/quests/types.ts",
      "sha256": "f6db5d180d511d8b86546933ef7af92a092d7db3654897101c2c789e56204858"
    },
    {
      "file": "src/quests/vocations.ts",
      "sha256": "ece05a5be066f75b56997cc20a47fae116f3e73db85b07b64e209e2dc9df3bdb"
    },
    {
      "file": "src/render/actorPortrait.ts",
      "sha256": "5b1869e050961f6e435eabf82a0181e737a58a0b8ec17d9fee9b567b5632923c"
    },
    {
      "file": "src/render/camera.ts",
      "sha256": "18ce5ad0f5fc4456fc82477dac7972d960b271fe16f3df8092a043fca13e73b6"
    },
    {
      "file": "src/render/groundItems.ts",
      "sha256": "335c4501e10be1b1eb2cf5886f4ffe2fd58038a5541be6178aab9715894e9c2d"
    },
    {
      "file": "src/render/itemIcons.ts",
      "sha256": "fcf1eb6afd423063668e94dba2690358b2446014561ebd1c083946a91c170a3d"
    },
    {
      "file": "src/render/portraitLib.ts",
      "sha256": "529350501621252992458646462fe1411e6dff7dfab1652b136210aff92815c7"
    },
    {
      "file": "src/render/renderScale.ts",
      "sha256": "1c52e30e88a1efe278af1dfce708072fc5d7d9df0815f82613c097e3bf62c6c8"
    },
    {
      "file": "src/render/renderer.ts",
      "sha256": "4d66a199592f38ecd5275d4426c0ce43f20dad57af633a8aba7ab52e51e8c0f6"
    },
    {
      "file": "src/render/screenFx.ts",
      "sha256": "032990db22c4889762411ad8383144a625eff17900d89d00320e90ce86345cac"
    },
    {
      "file": "src/render/skillIconArt.ts",
      "sha256": "1cef51f8a41a482ae9db2fe3146bc20759c14fa9d603965ae21cb767781d2760"
    },
    {
      "file": "src/render/skillIconCatalog.ts",
      "sha256": "bbffcc402e9534950326166dac8dd630ab514aa15e7096e39aa5bbe60a9ec5a3"
    },
    {
      "file": "src/render/skillIcons.ts",
      "sha256": "dfc6a5983b1cfca78fe55d86925fc98ddef453a21390ff6a27c2b904b48bb53e"
    },
    {
      "file": "src/render/statusPresentation.ts",
      "sha256": "ce82aac62ddf3000768aac0386b78dd4111a8f3964336215402bf89b6bbac642"
    },
    {
      "file": "src/render/vis/actionParts.ts",
      "sha256": "7e8b84f98602859143cc5035f02f1382fb214c952cea0e212ed1da5bb959f99f"
    },
    {
      "file": "src/render/vis/afflictionEdge.ts",
      "sha256": "ae568fc010d865f2a8be735a9086069f5db11b7cf1d28ad0780b88839fc728ba"
    },
    {
      "file": "src/render/vis/aimtick.ts",
      "sha256": "4a3be5357778d69af6cc74dd27de2a3f7c1ef13e803e49bd0dd6c723483935aa"
    },
    {
      "file": "src/render/vis/altarCueLayer.ts",
      "sha256": "ab50ef7eff587e08f9505338d30f389b8459ff13df8729c57e86387dbe9b56f1"
    },
    {
      "file": "src/render/vis/ambientFx.ts",
      "sha256": "0ec5274743a761cf98e4216f18793e097ea0a5e2b0c0a49d1164b28a2c1ee402"
    },
    {
      "file": "src/render/vis/anatomyCueLayer.ts",
      "sha256": "58920ac3c493820291feed7e85f492ce6e5b1aa0cb544df8839ffce688644888"
    },
    {
      "file": "src/render/vis/aoeTrace.ts",
      "sha256": "551e7851bace7fe98fad400f5beb2108ef75ce84b522f2e90d7ac6fbbac73e88"
    },
    {
      "file": "src/render/vis/armedCueLayer.ts",
      "sha256": "22bc6297cff8b9008c18f7407f46463b5771020665d044eb1796c6690e17b91f"
    },
    {
      "file": "src/render/vis/attackSequenceVoice.ts",
      "sha256": "df0be51744f1644093162d6e52c81b2c7e90f299b50fd172f05e743ad30c03a0"
    },
    {
      "file": "src/render/vis/auroraLayer.ts",
      "sha256": "d35ef7b6a1daad6872051c4c59cec3a263804a38e61c52485677d46339736408"
    },
    {
      "file": "src/render/vis/bakeScale.ts",
      "sha256": "85d849f6ab7077c3475487ab4402bd473298c20d8588deeb293cf9332794dcc5"
    },
    {
      "file": "src/render/vis/body.ts",
      "sha256": "2fa40c19bb8a6a09be918c16ab4b00f87a73aade7598144791a042784e9e6aba"
    },
    {
      "file": "src/render/vis/bodyActionLayer.ts",
      "sha256": "a298785aba1f4cdbbab894159499513fe02415b5f327ec238264400c122ed000"
    },
    {
      "file": "src/render/vis/bodyContrast.ts",
      "sha256": "44ceb6b166c72f30bb8bd5bbe37edd08f24f2c982fef0b7f69e0b4b334729f66"
    },
    {
      "file": "src/render/vis/boilLayer.ts",
      "sha256": "55227830424b10a04155233bab1bc7c9002b46d4566067c684d4a641e621a879"
    },
    {
      "file": "src/render/vis/broadleafCrown.ts",
      "sha256": "090b73367cc5d74e7dcc37063ec188430e92bda2e48219fa44b2daad67d95388"
    },
    {
      "file": "src/render/vis/buffReadout.ts",
      "sha256": "ddfaee9207fc44e4599b8a02dec9fee463e87a3e96c1dbde8a26d8d3034ad004"
    },
    {
      "file": "src/render/vis/caches.ts",
      "sha256": "a030396aae902fe4f6ad960a7a848e990405e58d99f47dc8821115d894f365cf"
    },
    {
      "file": "src/render/vis/canopy.ts",
      "sha256": "82babe324ca6d0ba08b54627f6d94faba6b934ff8e274705f84589673069cabc"
    },
    {
      "file": "src/render/vis/canopyEyes.ts",
      "sha256": "618c51fba2cc1866e6bd3633abd64652f261eeff5e6982245ebe54a2e39b0bfe"
    },
    {
      "file": "src/render/vis/canvasCaps.ts",
      "sha256": "6000c0e09fd91cb723d4a8c53ce99eec4c7b8ef4325f2302517abdf095657e9e"
    },
    {
      "file": "src/render/vis/castReadout.ts",
      "sha256": "d77ee28bff2f4907870abe07152c83580829d1dd586561aa03d7871e327aaa50"
    },
    {
      "file": "src/render/vis/castingCueLayer.ts",
      "sha256": "537a52e1dbc96f8fb0a5b42998aad754eab514217f6124757dac0ab14ddc621c"
    },
    {
      "file": "src/render/vis/chestReadout.ts",
      "sha256": "a20fd129adc81131df8c539b598a3a5c53e8058f625840169bf3f9147a8ecc2f"
    },
    {
      "file": "src/render/vis/color.ts",
      "sha256": "43fea1cd6cc4c8e0cdcad22944f43aa559de314602909a865ea108801e892f95"
    },
    {
      "file": "src/render/vis/colorDrift.ts",
      "sha256": "07588e3cd0c19e9ec366db895b21bb91604bcc5b13fcebd83400e36b9adcdc38"
    },
    {
      "file": "src/render/vis/combatCueLayer.ts",
      "sha256": "22e1301e5b02bcdebfcf725504e7249661100a77a5931eaa31d1157da2fa326f"
    },
    {
      "file": "src/render/vis/combatFocus.ts",
      "sha256": "cae855cdc0fbbab07317ea27b2ca78120c06646dcb03825b119c9b8f8c145ba2"
    },
    {
      "file": "src/render/vis/combatMeters.ts",
      "sha256": "2e49d601aef717e4df2e1c6334ee8c2243c9974568206e10152e77a299c0cf95"
    },
    {
      "file": "src/render/vis/combatReadabilityLayer.ts",
      "sha256": "eddf011f24ac12154469f88520583ffa0d4d5204eff125d8b4401f4dbe9f8e74"
    },
    {
      "file": "src/render/vis/combatTargets.ts",
      "sha256": "544989522228e2fec83f0d03b779511e3d6579f6d51abf13b369334fbbdebc71"
    },
    {
      "file": "src/render/vis/comboConditionLayer.ts",
      "sha256": "cfd467c71f50387517d67b6414fcc183b7a9ee94264c0fa6b75286dde1bae7a6"
    },
    {
      "file": "src/render/vis/comboCueLayer.ts",
      "sha256": "0cf86aaff7fa548b0465f215e4766524878e51524fc30baaa4e144f9d81db31a"
    },
    {
      "file": "src/render/vis/companionCueLayer.ts",
      "sha256": "a0d432d58705cfbb357f3f2794743f235d9a20d1c88d415ca67690fa63a53791"
    },
    {
      "file": "src/render/vis/containers.ts",
      "sha256": "0abe321f44d57064a55e715ce3f300e16a348e5aa938898a1ffb0e4bb1681f2d"
    },
    {
      "file": "src/render/vis/cosmeticEffects.ts",
      "sha256": "433ad185ab7b2fe31aea28c2888776b05972b27166220520fcf68310e23ea139"
    },
    {
      "file": "src/render/vis/cosmetics.ts",
      "sha256": "1b3de3677244c18fd75044e49a62d374241cee203ccb0ab2262325fb736bf4c1"
    },
    {
      "file": "src/render/vis/creatureTerrain.ts",
      "sha256": "6526d0fe4b44cd025268b0f885280f85f4031263cc18ebbfb7c5677281db1c84"
    },
    {
      "file": "src/render/vis/creepLayer.ts",
      "sha256": "485db08d6e5ef9281c29a587266137be3a50de967fdc64aba057883e247a941d"
    },
    {
      "file": "src/render/vis/creeperLayer.ts",
      "sha256": "57563e901d67023509c4a8b69e1ebad26db1e2d2428ffecc860ab593956e7b8f"
    },
    {
      "file": "src/render/vis/cryVoices.ts",
      "sha256": "612dad71afc9ef8a4818418c8f3ba9c518c08a6bae9d2b8e56e3947336d9aab1"
    },
    {
      "file": "src/render/vis/defenseCueLayer.ts",
      "sha256": "4e1640a1952e362167751f9fe0e055a6a14b1f6e2ce28de474ee46ed365fd381"
    },
    {
      "file": "src/render/vis/destinationLabels.ts",
      "sha256": "2188a09291b88726402e14a3f04c4577b25a4f15378eeacac6cafefd559093af"
    },
    {
      "file": "src/render/vis/dissolveLayer.ts",
      "sha256": "ccf39359d9e609244b4b8ddfe4e37646d3407a64067b5fa54ea3f7e36c34c098"
    },
    {
      "file": "src/render/vis/dressFade.ts",
      "sha256": "fe8075b05fdab214cb3741c2f944a0909f6e32722260dd1e8334e6c1442cf4cc"
    },
    {
      "file": "src/render/vis/effectVoice.ts",
      "sha256": "21812cbd7b959ec4ba86438426eb75991b5ac76fa83f54fbacaf38a9b23b5f9c"
    },
    {
      "file": "src/render/vis/emergeLayer.ts",
      "sha256": "05e450e84fa11d3da089fa1de1f89fc3e340d7be300b8718ffafd301e74b7178"
    },
    {
      "file": "src/render/vis/eyecatch.ts",
      "sha256": "c0cfc8ef0ac38ad6b0b56fb6f3b71da75e4f5f4aa01e99caf2ae56a53ecba216"
    },
    {
      "file": "src/render/vis/feedingCueLayer.ts",
      "sha256": "a3f0322be72e4f5c449ec9a2a654f017502a25592d7a1a224fabdde4013a6ad7"
    },
    {
      "file": "src/render/vis/floors.ts",
      "sha256": "b3d9615145e84ee1ca40d0044b2f9f4fa23840fe4d4a4decb058826b5539bd37"
    },
    {
      "file": "src/render/vis/fluxLayer.ts",
      "sha256": "d6ab0088d11a1512b9b768e782bf189edbc8226e1da6cfee7439a4a56bd9ad71"
    },
    {
      "file": "src/render/vis/fogLayer.ts",
      "sha256": "7d60f347e61df437363926d911885a273bb18e2bae6551ce6f4d7fad9271a5b1"
    },
    {
      "file": "src/render/vis/foresightLayer.ts",
      "sha256": "f2429b647afb6df2ddc3f930985c627cc656b9d52007aaa42783d760f56dce59"
    },
    {
      "file": "src/render/vis/formationIdentity.ts",
      "sha256": "c6ec484d102f59eb3c12db75db711fa2a64639dc4d09cd46ebd978f98e980459"
    },
    {
      "file": "src/render/vis/garrisonName.ts",
      "sha256": "85e7a08ed40c6ce1f9b0936cfc41b2d0e62effba49c56841dc7958a40be085d6"
    },
    {
      "file": "src/render/vis/geyserLayer.ts",
      "sha256": "38375e252d764ba639c7377f6340893f67b772e38da65de7e68b0a3f2d8a0d8c"
    },
    {
      "file": "src/render/vis/glyphDoodad.ts",
      "sha256": "dfb05c608072038c221e9e930cae58cc9a1772990b4e6981c22be4b27f573be6"
    },
    {
      "file": "src/render/vis/ground.ts",
      "sha256": "14c4a72e080710fdc9af67427d035a752e14fa310e7ea23d30b6b0d8526a9861"
    },
    {
      "file": "src/render/vis/groundRising.ts",
      "sha256": "6e0e5b9dc32d84e9879d479930eb1deb7e211127c9572d4482bc1b31344f91ff"
    },
    {
      "file": "src/render/vis/guardArtsLayer.ts",
      "sha256": "93153e2281d42d6389cdcad99f1f5941b4dee7a5a01ef2da65e8e5777146c897"
    },
    {
      "file": "src/render/vis/guardianLayer.ts",
      "sha256": "fc3a8631a96c6b4ce2c98d474caf881f96836b2cfad23d7e39930c9ed5a9b250"
    },
    {
      "file": "src/render/vis/hitFlash.ts",
      "sha256": "ed78fc84b3d0d3e8efc6e68ae636fe20e54a2daa6670102e73015b46a212dd39"
    },
    {
      "file": "src/render/vis/hudText.ts",
      "sha256": "8c204f91964217266feb2d356b8f8fcf0a949c2165d82d926aa2b4cd80292f7f"
    },
    {
      "file": "src/render/vis/lakeLayer.ts",
      "sha256": "55e5bd352243cd056b7671c63c3aaf77b9cd47baeea1e6472f1fa8c142a39f5f"
    },
    {
      "file": "src/render/vis/lightningVoice.ts",
      "sha256": "16c129698f83ba9c027a4be2e98cac0550a952c68ae94203da47e4f65e997e42"
    },
    {
      "file": "src/render/vis/lights.ts",
      "sha256": "9e1d40f9837844766bc6a8299e136df4b5534eb4c9f9bc485d1c5dc22aa61d4c"
    },
    {
      "file": "src/render/vis/magicPackLayer.ts",
      "sha256": "78ae1d421f0200989a47898ec790fd1c1f88859bf908cc73e4ae930d04cc9ca8"
    },
    {
      "file": "src/render/vis/materials.ts",
      "sha256": "dfa1f5b4982520737b327b3e5cc90ee0bd6c32f27780fdc15d5f54d168b308b9"
    },
    {
      "file": "src/render/vis/meleeReachLayer.ts",
      "sha256": "e01145abb1ed0d6297e54fccdc63c22a643a170c263ab47b657592184aa57a9b"
    },
    {
      "file": "src/render/vis/metalSpikes.ts",
      "sha256": "7e28be107d3323ac3278f89465ac1f20dfcf4dfe6300afdcca0b1e24ee19a179"
    },
    {
      "file": "src/render/vis/movementTetherLayer.ts",
      "sha256": "5d82074b4170e9c2a38f495e8e7c19e73a74953e7fc919ef402d6b29a39a802b"
    },
    {
      "file": "src/render/vis/needleCrown.ts",
      "sha256": "51eff4994c1cf11aae9ee3f93f58a2ffc965d4abf517111f8187c1092fbe79f9"
    },
    {
      "file": "src/render/vis/noticeLayout.ts",
      "sha256": "49ba1454df456bbebbca7fe2b542ae703b426d7ce03d8dc92c3398f75478af69"
    },
    {
      "file": "src/render/vis/objectiveReadout.ts",
      "sha256": "737c34f36ebb7cde14c8375d49d482f8ebfc2255ac1e49408637190b6fa74116"
    },
    {
      "file": "src/render/vis/orbMote.ts",
      "sha256": "2d20530eb3b12f58257a8b0ce56f4e96d8cac113c9e05283dade8da88662018b"
    },
    {
      "file": "src/render/vis/overlays.ts",
      "sha256": "39b5e411da94b75237c99061a2ed681848853eb4b3b047b01b1c91b3388cc34a"
    },
    {
      "file": "src/render/vis/painters.ts",
      "sha256": "3790964f8a2af548bfdcb9c4466b2bde490931edea2d0a57008db060abc23ea8"
    },
    {
      "file": "src/render/vis/paintersAether.ts",
      "sha256": "574ddcee2264539d1a4bcd9f43b13e789df17da69d2b84224c37f1e1f54005c0"
    },
    {
      "file": "src/render/vis/paintersGarden.ts",
      "sha256": "e168bbf1b5651340c5142fd71dcb8a2d7bb2dcbc9c2e373ee616e88ac8dca760"
    },
    {
      "file": "src/render/vis/paintersGloam.ts",
      "sha256": "a4f7857690db65e4ba25e3b33ed8dd3ae61d185194e1b41b046d5f05b7443b92"
    },
    {
      "file": "src/render/vis/paintersGrove.ts",
      "sha256": "a453a2b9cca451e8d0fd90423b6903bb7f57ab632a994c4c5cbd98c1a2143e30"
    },
    {
      "file": "src/render/vis/paintersHallow.ts",
      "sha256": "cc9d0a193c015ba85f6f934c336de583678321b99058b9635d053d1c97b3ad95"
    },
    {
      "file": "src/render/vis/paintersHome.ts",
      "sha256": "09f997c4b6f3896501f8bfc15b5bfd10d9df59e44eeab4a63386d945553123b1"
    },
    {
      "file": "src/render/vis/paintersInn.ts",
      "sha256": "f982e48552cdc7f69026817654a42a9591b3c6fcd58085cd04f75d3cf84fb030"
    },
    {
      "file": "src/render/vis/paintersSea.ts",
      "sha256": "211af8355862dd8b3f026c46ab77d32a8c48a89bbe4a80ef79eabe557e812201"
    },
    {
      "file": "src/render/vis/paintersWarfront.ts",
      "sha256": "c22ffd25bee5c2937a7dd4ef1b4cb651a06afb11201ad292fc3178cdfc40a267"
    },
    {
      "file": "src/render/vis/parts.ts",
      "sha256": "ca262d22a6b9a3a8f4a4b843fb4178ba5fb2276f2560cbef0b7b8873d235a51b"
    },
    {
      "file": "src/render/vis/payloadCueLayer.ts",
      "sha256": "d24a1806a80056d37a4585da12787d2bbc707029accb9e97f1571abf7ce0edb8"
    },
    {
      "file": "src/render/vis/playerDeath.ts",
      "sha256": "5bc8f7fd7fe789309f495c101201cdec46462dc35aefe52daf082c3bba53580a"
    },
    {
      "file": "src/render/vis/portrait.ts",
      "sha256": "9d0070bb56090e45a8849cf6ac132e6c85c34027cc652561f21a06f745593670"
    },
    {
      "file": "src/render/vis/procCueLayer.ts",
      "sha256": "e0ad46573ec1d8a6345bea65c570ecafb6648b638d36e6bca698135639a991cc"
    },
    {
      "file": "src/render/vis/projectileBounds.ts",
      "sha256": "b97dd4782fe2f1d8f4a4e8f6ebb565363a40f759294a2814022434df3ebe50d0"
    },
    {
      "file": "src/render/vis/questCompass.ts",
      "sha256": "d0383c4b9af2baaf7d110f5e9833f14ac19c57582fa64cc7b93d977d4c0bce74"
    },
    {
      "file": "src/render/vis/raisedGuard.ts",
      "sha256": "4dc80013fe11d75929f38ee913bb95e4db241405c6fcf3cf9c872b9b3ec3b13f"
    },
    {
      "file": "src/render/vis/readableLight.ts",
      "sha256": "448f042dedc5b6790c728be2b5d1bd261bc9ec1491330add6abd075c8fe4396e"
    },
    {
      "file": "src/render/vis/refugeDeparture.ts",
      "sha256": "4fc61f1f611070a2c189c57382bf7dc8e44b0522804c2c527b5e9714810cd174"
    },
    {
      "file": "src/render/vis/regionMaterials.ts",
      "sha256": "e493bec65747d14d14129da01f0a0dd5a675bd4b2cc00e590852d4e22c599107"
    },
    {
      "file": "src/render/vis/reserveCueLayer.ts",
      "sha256": "b0e8259615c4bff42e4db07737bf70f68b4c664f63d85bc7942b4e3ac374ba9e"
    },
    {
      "file": "src/render/vis/resourceFlowLayer.ts",
      "sha256": "d482a220aa4faf9dbe96cba2a219eacadcd96779d076e01d1d5185f1c8ac3464"
    },
    {
      "file": "src/render/vis/rewardLabels.ts",
      "sha256": "565583b65bff377eb6840740d8f95d0d9b05862840b68c0f878ab8e2762450cf"
    },
    {
      "file": "src/render/vis/rockFaceEntrance.ts",
      "sha256": "554e603ace0a2852972e253bdbe842e8314892ea083a33e7431820725972a99b"
    },
    {
      "file": "src/render/vis/roomVeil.ts",
      "sha256": "5af20c1138fed5c13607ac66b250e589520f91eaaa1ccb441add812e6183d4b0"
    },
    {
      "file": "src/render/vis/runeRing.ts",
      "sha256": "08131a7f0ec6cb1e14c43b02857bc6feb2e501eff88f24867354bb277abf0583"
    },
    {
      "file": "src/render/vis/satelliteLayer.ts",
      "sha256": "9ec2796cc278140fde4e64f9edbaf54e9eb2d738dc8058b6c8877ff00d114146"
    },
    {
      "file": "src/render/vis/sight.ts",
      "sha256": "ba540b50d3bfa97fb61d0a9410aa046e596e5ed9918106ef3f088100eb79fe03"
    },
    {
      "file": "src/render/vis/sightVeil.ts",
      "sha256": "2e1a1e50c61b2d814b8156b78bb6bb7f0202657a2b93a735ee8a3ef063a9d4d8"
    },
    {
      "file": "src/render/vis/skillBurstVoice.ts",
      "sha256": "78ad12e2da2ccaae9abaeb43c777ac8482bfc761328f976f53fe22cc192db7ea"
    },
    {
      "file": "src/render/vis/skillCastPreparation.ts",
      "sha256": "96e632dd1f99294e441e81ec2b0dc52a12c3b7565bbce0c2c92e219cb3f56d45"
    },
    {
      "file": "src/render/vis/skillFlightVoice.ts",
      "sha256": "d567339f273afc02982f361a92f2e7bb6a828ce203ebd43260c362b09438ebd0"
    },
    {
      "file": "src/render/vis/skillMovementVoice.ts",
      "sha256": "4a474b86b94886160d2d0777597779a1e2ff588b21088f41c70ebbb2a44c6cf2"
    },
    {
      "file": "src/render/vis/skillPresenceVoice.ts",
      "sha256": "d576ba1e5d4390132a41de554a4e16d139a3a4fbc9e4519a3be9706762194347"
    },
    {
      "file": "src/render/vis/skillSelfVoice.ts",
      "sha256": "e3a0eae8e24c66d314aae4c81dbb525f0fa154ae7d550e99512988988f39f08f"
    },
    {
      "file": "src/render/vis/skillStrikeVoice.ts",
      "sha256": "93ab341a5199146587d441aa4607aca6f70885af181399c52cbcf79e6e570522"
    },
    {
      "file": "src/render/vis/skillTargetVoice.ts",
      "sha256": "a89d248f23e4ef9a73ca3d1be41864e517d9239e313d4d27bd2988d7bbe69fd3"
    },
    {
      "file": "src/render/vis/speech.ts",
      "sha256": "ca44714cd85f629692e444fbdabd85de9fa02559c867542dba63f6bac9872c18"
    },
    {
      "file": "src/render/vis/sprites.ts",
      "sha256": "0b5b902c534955aae04ef44c31c75b0fc98556232b6748713a6794b246e0f875"
    },
    {
      "file": "src/render/vis/statue.ts",
      "sha256": "fb90cd74ee916d89772961bf657ca923ac6555a545aaefdc1ea9abc2f1b6db3b"
    },
    {
      "file": "src/render/vis/statusIcons.ts",
      "sha256": "6818d8b14a1460bd1e9ad462466df525e6018b9754555705a31bb66612e9487b"
    },
    {
      "file": "src/render/vis/statusReadout.ts",
      "sha256": "b0cbf095217fc5b383b7e4052257b41209d241abe34c960b140c244d3da2cc78"
    },
    {
      "file": "src/render/vis/statusVoiceLayer.ts",
      "sha256": "e2013a1f132e0282a013b7476f36f130124c99b30ff9afccd37ca5cacf14beff"
    },
    {
      "file": "src/render/vis/trackLayer.ts",
      "sha256": "4274a4ee74db2d6a3c641d19ed9b495d65cbc678482c00a52171cda5ffa8e259"
    },
    {
      "file": "src/render/vis/trapLayer.ts",
      "sha256": "61fee7eacc74116da4da09488f46e79c53d7a57ec98560265de8825c1aee3a0b"
    },
    {
      "file": "src/render/vis/understory.ts",
      "sha256": "d1114f829e4b27d5efab8a7aa549e7e3de55f4824683ca424196343813f49d35"
    },
    {
      "file": "src/render/vis/ventRideLayer.ts",
      "sha256": "e4ebd5d2ab57a907cb455be44056b8e005357cf82a13acfd75f45e0a68eb82ea"
    },
    {
      "file": "src/render/vis/visConfig.ts",
      "sha256": "1404f504586709b74bc2dbc9945677fbc999e758f5593f8b18ff2161a40d5582"
    },
    {
      "file": "src/render/vis/voidFrame.ts",
      "sha256": "2016cb93f837c3cb65bdf4db2b38977a45edf476faab547a8abf58826f3ef9fa"
    },
    {
      "file": "src/render/vis/walkParts.ts",
      "sha256": "cd2a2a87fa4b4203e1d5b80a53f5fd3bc0b7876267d0e873c84d4234778d0d39"
    },
    {
      "file": "src/render/vis/wallEyes.ts",
      "sha256": "ccd4554504b4c868633a25f4ad54f2d0205ae18b49492124234c81dc441db80d"
    },
    {
      "file": "src/render/vis/warningCueLayer.ts",
      "sha256": "345d317c73c8f31658f37e47dd8222a64f64894422d4c7ae04c6510af5baee99"
    },
    {
      "file": "src/render/vis/watchLayer.ts",
      "sha256": "8d9c7cb1ffcb50b483ec47564120c0d5694fb0aa6735e304586f6bebd3d0b4a6"
    },
    {
      "file": "src/render/vis/waterSurface.ts",
      "sha256": "82ec546bb27b4e4d3b076e02fe29800e0c278fc7757870c75c18b8025312d264"
    },
    {
      "file": "src/render/vis/weatherFx.ts",
      "sha256": "11a47afd26527d3f490970c9b07b011c1e6cd32a7275219b4016416b2db885cf"
    },
    {
      "file": "src/render/vis/worldVoices.ts",
      "sha256": "d6bbf4e0650b5e56bbb7f14c6f3f759575851674957c24ad0ace365501fb6651"
    },
    {
      "file": "src/showcase/engine.ts",
      "sha256": "b13953ade2fb5d8f8880418c647c71ee6a653b734e6424f736e0447afa6347ba"
    },
    {
      "file": "src/showcase/host.ts",
      "sha256": "2473f45d510f777cd1d178cc9c1aad1f378f4842ddca3ee530fb594c7bf2d389"
    },
    {
      "file": "src/showcase/shield.ts",
      "sha256": "168cd7fccf508560efffc346f723c75d843a053e51eb4be9b7cac3cb40acf7c3"
    },
    {
      "file": "src/showcase/stage.ts",
      "sha256": "afe5752fbd0ba64fee983f0a6b747a0db35bca7a00c1b52ccb345fa52daea87e"
    },
    {
      "file": "src/showcase/stagePlan.ts",
      "sha256": "876877ddb8a5ba4a4b2e1de096abab145ec1e0031a035230ce67db5c7d51e80e"
    },
    {
      "file": "src/sim/arena.ts",
      "sha256": "31b6fe72f6a7c3b1ab8d272ca751c74dcb35fd7b0d0ac7448fd42895e96ff11e"
    },
    {
      "file": "src/sim/builds.ts",
      "sha256": "31a7732ae591240f12e82e81be12c2516dc9cb0110e9b9f74e357e7ffbb64cca"
    },
    {
      "file": "src/sim/compat.ts",
      "sha256": "9af7ac13bc39b95e727f0824c2e004a371eaf333aa5f96c8b18fa8c164f6f0e0"
    },
    {
      "file": "src/sim/data/builds.ts",
      "sha256": "c6d146f91cd343502d236eab8099f8d00bc339c1d0962e21a1ad7dab98dc859c"
    },
    {
      "file": "src/sim/data/panels.ts",
      "sha256": "00de38c4668ac50b2934f4438a37551184d62fe94f018d653316819d1aa52eb5"
    },
    {
      "file": "src/sim/data/scenarios.ts",
      "sha256": "ec6a89d34ae369c1a9312c59765009cfaf8ce01b1d093644ab60a099b58476f8"
    },
    {
      "file": "src/sim/data/targets.ts",
      "sha256": "53d59bd0ac53abab40b2517b73e1045dd3041a975b4927db37dba660736d0b34"
    },
    {
      "file": "src/sim/economy.ts",
      "sha256": "d91ceaf8c8934d07fc79c0689cb71f66acebd8d5ec8f01dd979166d57465a5b3"
    },
    {
      "file": "src/sim/ledger.ts",
      "sha256": "152d9fa13a4311cfc524b21030415a2fe3704266d010bdf2b46da079dc5e3287"
    },
    {
      "file": "src/sim/metrics.ts",
      "sha256": "b1727f4f79ebd0b33b895d84c4c620fbd8dd3e7cedafc68c9f158b0ac4e9e540"
    },
    {
      "file": "src/sim/pilots.ts",
      "sha256": "fd90f58d8bb7e96e4839b1abe8d8e8e5443627dbfc2c2554f7c45a384d3ca091"
    },
    {
      "file": "src/sim/rng.ts",
      "sha256": "4b9d3a72eee7f115ddc9cd9e414c6241429956f681db1e88a8a2506156c1df43"
    },
    {
      "file": "src/sim/runner.ts",
      "sha256": "1e99c5145188635fba7f01de127399038d8f816d1cf6ca23505431707955accf"
    },
    {
      "file": "src/sim/shims.ts",
      "sha256": "3d6915881f4dec28401ee64576064045917444f3e48cf7594ad34f1ea88b137b"
    },
    {
      "file": "src/sim/textures.ts",
      "sha256": "1582707458672563034747f482b3946e1842898bafa1c47170051195b3d6fbcf"
    },
    {
      "file": "src/sim/types.ts",
      "sha256": "a4133c4c9905689189434c42baa8c836e81e71fab3aad45aa2d05ec46d3beeb0"
    },
    {
      "file": "src/ui/atlasBudget.ts",
      "sha256": "c09aacfa02eee06729f854348d0f94db4fd6d0fd76eb2c0b3af7902dc8fe097c"
    },
    {
      "file": "src/ui/atlasInputCache.ts",
      "sha256": "b4b2200479c142631ca724ffaad802ff9932892f61f5f97c5d1b41b6b6dd292b"
    },
    {
      "file": "src/ui/atlasPaint.ts",
      "sha256": "d0f7994e95a5961a8e9fc6a1e49eca3708e69ab5dfc7c7653546cd6860bc2340"
    },
    {
      "file": "src/ui/buildPanels.ts",
      "sha256": "36ee5d3164e7bcaa747170011c6ea19265c39db2f4ce783bbfafe1e1ca7b285f"
    },
    {
      "file": "src/ui/containerPane.ts",
      "sha256": "957abdcc7d93ca0b9d43741251b6b6ac2b8a893d882d843a7e89dbb7be4c858e"
    },
    {
      "file": "src/ui/couchJoin.ts",
      "sha256": "1a4cc5705f4d96de73abc235693eae90749829cc2c47a5e29feb0c318cf8191e"
    },
    {
      "file": "src/ui/dialogue.ts",
      "sha256": "a08f5b3cfc05dc9146be31d64fa83903890c6d6d1df15325d1a9e8256d6c92ee"
    },
    {
      "file": "src/ui/dialogueLayout.ts",
      "sha256": "234a476f999faf1dbc6aef17dd487d73b1720ef1c555bd63e05a74939e1fbd4f"
    },
    {
      "file": "src/ui/dnd.ts",
      "sha256": "e9c696f21cdc97a0ceb3a1d7c1f2cf6026dd3f7a0248f94e2052e668d6ee1214"
    },
    {
      "file": "src/ui/dom.ts",
      "sha256": "74fcc77660894de51a40d7dc14782718b81988fe6ae7a4a3402adb6f8f4c62f7"
    },
    {
      "file": "src/ui/errorOverlay.ts",
      "sha256": "2f634080718f7cb1fbe2942967d267c949dd9dae0d16cdaa4748576b50ddfbf0"
    },
    {
      "file": "src/ui/escapeConfig.ts",
      "sha256": "5e37c48f2bf6f82f20ae1a6615f83001a4c6e6215a05bcef8ceaae9869054780"
    },
    {
      "file": "src/ui/folio.ts",
      "sha256": "c3d22676ac785d6ce2800f203d1d100fa28dea2089dc0fd28ecb942b9a0d9807"
    },
    {
      "file": "src/ui/icons.ts",
      "sha256": "24a17ef2d5799d0b9f3049d3f18f23dd424ad1f74e81741cdce2395800797c76"
    },
    {
      "file": "src/ui/inventoryPages.ts",
      "sha256": "24acb9826205443e0aafd188fd0f965111017b3fc948a3ecc6fe4a0e1ba141f5"
    },
    {
      "file": "src/ui/itemhold.ts",
      "sha256": "85b90c046bd519f9afbf8de75fd9875e47c0eb3aa61c85ba7fe1bd3065384d04"
    },
    {
      "file": "src/ui/loadingScreen.ts",
      "sha256": "65233f8e5abcd8ab70c17fc9c544be19efdb3eab8c43321f477a6bc35328c744"
    },
    {
      "file": "src/ui/lobby.ts",
      "sha256": "147f7ba8a7ff2cc29ab148a5afc5c76581550221e7f241e7895e378b6bd778a3"
    },
    {
      "file": "src/ui/mapBearings.ts",
      "sha256": "91ac5669845f3cbf4ae2b1bff0047cdfffe6f5074bf93a141c8d162475c25cc6"
    },
    {
      "file": "src/ui/mapConfig.ts",
      "sha256": "a12de41a9f11ffcb16bf3404183d10526a46f65cad5a572591943375f5ff1a73"
    },
    {
      "file": "src/ui/mapLens.ts",
      "sha256": "8e0ecab5a25106d3d124b90c07a3fd97e6be46c3cdc4ddc95c76e11e18f17cf2"
    },
    {
      "file": "src/ui/mapViewport.ts",
      "sha256": "e1543aca99cea1d95d1a751de428efc6532de4cdf686b2e703d7c28212776c59"
    },
    {
      "file": "src/ui/menuConfig.ts",
      "sha256": "0994c456dcb4e60efb9b418a762a3fada2045788d1fc2ebf5f20dae84fe8cb43"
    },
    {
      "file": "src/ui/menubar.ts",
      "sha256": "16245ad2d556bd44feccc9ffc27bc886e60d9be75035ca45c4f9b9838f140181"
    },
    {
      "file": "src/ui/minigames.ts",
      "sha256": "cde5c9eb352b59fa096860d02d068def983192e59afb02c11797a1443a58bf50"
    },
    {
      "file": "src/ui/npcConversation.ts",
      "sha256": "2b38c0b669fbaa618d3f9d3df3570444c6831fa52cc2d1db728259473c29aac6"
    },
    {
      "file": "src/ui/padpointer.ts",
      "sha256": "926c50a5018d48c3a322c2ecd8523b9bc09e69536f51b99b17a100025ef4e4ca"
    },
    {
      "file": "src/ui/panelmove.ts",
      "sha256": "705186ca382c53f96ad7b13f8ab64acb3be02f4cd340be743a615f28d4e42767"
    },
    {
      "file": "src/ui/panels.ts",
      "sha256": "d12284a4310c380ee54d2d20719391d9500c9a648deaefa2c92d633795160809"
    },
    {
      "file": "src/ui/panzoom.ts",
      "sha256": "983ca756c2b1e7ecfabe5ff3fef0f64c68fcb6c872e4013c0e79228ad7a54e46"
    },
    {
      "file": "src/ui/party.ts",
      "sha256": "5ed36219815245b5869e86c2f7219240cc82ab8c907842ae2d384e5d471747cb"
    },
    {
      "file": "src/ui/passiveFrontier.ts",
      "sha256": "43fe6b5b1cf4c1196c0ad9787aa0461a3ee3762c212ec4a4030b564c94690ba2"
    },
    {
      "file": "src/ui/portalConfig.ts",
      "sha256": "0a0ff13f5eeb156ded615f79c0c7698ec2af0e993451ee1912f843dee20d8f24"
    },
    {
      "file": "src/ui/portalbutton.ts",
      "sha256": "8835a1743d7d7848ddbda2807cff650fbc1b849b9ade4a33263064c8b55a1205"
    },
    {
      "file": "src/ui/questOffers.ts",
      "sha256": "21c76989aefec7dfd6eb0d767e0b86e77d5ab2c83943d0a1c55bf37898117bbc"
    },
    {
      "file": "src/ui/questRewards.ts",
      "sha256": "1609bf85ea96aa341e3798827280d68ff101c136de804f5eaaf40948669d532d"
    },
    {
      "file": "src/ui/reliquary.ts",
      "sha256": "fd790130fccc7c3cde5e7334a54ab946ea5d67f2837903e7ead5fddd0010300c"
    },
    {
      "file": "src/ui/roadGuide.ts",
      "sha256": "819566120d1ed6c1099cce0ecdf357df1fc068a0bcdefe6b3fb1ebdc8721ccf7"
    },
    {
      "file": "src/ui/serviceWorkspace.ts",
      "sha256": "9b02634dfd749c11b2ba0bce6c8f033cb1232eb824bad688576eb90a77cefd9a"
    },
    {
      "file": "src/ui/skillPreparation.ts",
      "sha256": "097f4fa96c9417aad6c92c849964b488295c7b2a477448adfe497b71564b525f"
    },
    {
      "file": "src/ui/stash.ts",
      "sha256": "360fa7d81ff64683b5c09a6f61b5d5e35f59662b7618d91a9b97ae7149e80d67"
    },
    {
      "file": "src/ui/storedSupports.ts",
      "sha256": "f99844ce9a45a318e06dc7e68aa1b9c3afe681bd183347d0d44d44d200a5ec74"
    },
    {
      "file": "src/ui/supportCompatibility.ts",
      "sha256": "6a5aa50d6bc46dfc6d7a0ec10ed7c153ef9e95e9179c81144c181a73b67841a2"
    },
    {
      "file": "src/ui/swapReadiness.ts",
      "sha256": "ec2bd2fb500c596f08ea4d494e122f505d2da280d175fa07de1336b5e5cbf6c6"
    },
    {
      "file": "src/ui/tooltip.ts",
      "sha256": "685d4863741b8f4b5bf80e7d99f64a7903f0ba0aee58852d28e595f3a75e8e29"
    },
    {
      "file": "src/ui/uiScale.ts",
      "sha256": "26e55702d84fc16aaff39dd52fa76e33ad176bcdf9f8d657856879440fd5019c"
    },
    {
      "file": "src/ui/wardrobe.ts",
      "sha256": "3a55335ae08341135c4b6e1dcd47fa311d4dd415f3d86d62e165ada55d834161"
    },
    {
      "file": "src/ui/zorder.ts",
      "sha256": "956d31992a75630310256b4d6930bae9c42f5fa38b6564382fcc4a5185574aad"
    },
    {
      "file": "src/world/atlas.ts",
      "sha256": "2a8bf87b5e01ce1f4a01e3029858dbea93544e63884d2d09f48d81b4f0a619f7"
    },
    {
      "file": "src/world/attention.ts",
      "sha256": "cbf43a3e2554b877473a567067ab8268ac5929a4c445d81347cc0a5621fc1285"
    },
    {
      "file": "src/world/biomeField.ts",
      "sha256": "3e3e0c37598407c5df3956dec0d20b4f85fb8454cc828b7884d911cc69858940"
    },
    {
      "file": "src/world/biomes.ts",
      "sha256": "d515fa5ea4413bdd4e0b9e75a93744ac54ecab93c669dafce06e7514735a0c34"
    },
    {
      "file": "src/world/bountyRoutes.ts",
      "sha256": "54085fc29900b034b01a5159881d0f46fc178cbbd374bb966f1fc6bd618ec985"
    },
    {
      "file": "src/world/bulletins.ts",
      "sha256": "5f480223d79512a6e32a8d0f4755ca148b4be3c5064928bace16f34326a82c50"
    },
    {
      "file": "src/world/captureGeography.ts",
      "sha256": "654798ac0b198aa5c548ceb4c26cc11c25d4ffd6c3c248fe60ff761b3b01664d"
    },
    {
      "file": "src/world/civics.ts",
      "sha256": "9bcfc5b7001109ea4c6d0799debd2d2969165a392d0dd3e3f0302b6f6e4575ad"
    },
    {
      "file": "src/world/climate.ts",
      "sha256": "bd67a06a6809959d9b2ea1387979c411f612b8d836dd404fdfe3b993e0ac7149"
    },
    {
      "file": "src/world/climateCore.ts",
      "sha256": "2c6b97ca00254e7a7f8dd646312406228fb90a57afa3ef8ecc3a1ab9c78fdfed"
    },
    {
      "file": "src/world/continentCore.ts",
      "sha256": "03f44f82f7caf0f5616ff4ea2f7270acf2d9bccb43290196b308a1337fd08303"
    },
    {
      "file": "src/world/continents.ts",
      "sha256": "458a98bd091645e3b4e57755b3ae2adb1c5d4fc1f9a2444d7d4f7fc03f46b10a"
    },
    {
      "file": "src/world/coords.ts",
      "sha256": "fded7edd91dbbbdcebfd8d00c437ef294f01e876b5127ff9324601c958c599bd"
    },
    {
      "file": "src/world/courseStages.ts",
      "sha256": "deb65a351862b788524a815fc07fc5ff03aab92c19d6112b7291a6130b5dacea"
    },
    {
      "file": "src/world/courses.ts",
      "sha256": "e20bd418d3df5e11a605e8caf479a446fb0b48b496783ad32e4baac4352df098"
    },
    {
      "file": "src/world/daynight.ts",
      "sha256": "ea91652bef417547abb7ee530b5d6dd9ea0edd777781442b6ab1876187eb2459"
    },
    {
      "file": "src/world/dimensionGeometry.ts",
      "sha256": "3e296e6a25b61013a9853a83e8725c2767f04c2756125c754f197aa1e932583c"
    },
    {
      "file": "src/world/dimensions.ts",
      "sha256": "812f2dcc8ed8fa46c0ba59b769fbcbcf1d68b6e79e7fd2cc62e5823c18c5b5e0"
    },
    {
      "file": "src/world/drives.ts",
      "sha256": "929e6c32edd115cd9a3495e4904815ddaffcdb2b629a0acc1b8f0dc57c9a4d36"
    },
    {
      "file": "src/world/edgeBlocks.ts",
      "sha256": "ac282f92c8732935e375ae15bf8e6e872408456947220658e32be3d151714c0c"
    },
    {
      "file": "src/world/escarpments.ts",
      "sha256": "06f2bc0adf8184c97cf4fdee48c77268b68c8a0e3791735f8578cc1490f56a3e"
    },
    {
      "file": "src/world/faction.ts",
      "sha256": "32427cf0dd6c32d55a956a458cf12bf8fe5286609106f3a9f8b7137047cdd439"
    },
    {
      "file": "src/world/featureActivity.ts",
      "sha256": "c2d50fb13e08873c557d642b3b642025cfe0bc8e0406ac5be16e088265937560"
    },
    {
      "file": "src/world/fieldChoice.ts",
      "sha256": "18ea0f96c03ec2f7997ee77f3684b8abffa34656316ab762d74c5890a8fd206d"
    },
    {
      "file": "src/world/fieldRegion.ts",
      "sha256": "aa9a2af78188d3805ad9256f8a6e7489568830de1ffc7aec1373bcc6a19e4c95"
    },
    {
      "file": "src/world/forechart.ts",
      "sha256": "f17371f8f2992949cd978291ff14f3156f0cc246865a0018753dc5e5007cc632"
    },
    {
      "file": "src/world/geographySource.ts",
      "sha256": "86a256bbdf10aca951fc6a776908648d3bba5c44c75c09b3382df3270d7b620c"
    },
    {
      "file": "src/world/harborholds.ts",
      "sha256": "49f2bc973096a4ba8c1d194d45c2ad624e4a5d7ba45329c35fc8e3f8c2e20397"
    },
    {
      "file": "src/world/invasion.ts",
      "sha256": "46aa38276a06fe9a19243e8ef40c2b211d0903419c5bb8f934500c53c7ebcfc8"
    },
    {
      "file": "src/world/landmarkComplexes.ts",
      "sha256": "0b7adc3551c0910aabf73d0e7d57d49cf95918b83b63ee92e52d25844603dd1c"
    },
    {
      "file": "src/world/levelField.ts",
      "sha256": "da8ee47119eae6f2f3daa60de97626a1e966a7261cbd6e771b8849e91b76a823"
    },
    {
      "file": "src/world/localeFragments.ts",
      "sha256": "e4203e3492717e4c4b893a644c2812d2e2c75236d8d78eb2d8830586f71cdf0b"
    },
    {
      "file": "src/world/locales.ts",
      "sha256": "d60674bab125eb9dae681d72bdfd216e36563a2d76940c0e82b9925cfc7e74f2"
    },
    {
      "file": "src/world/mapMarkers.ts",
      "sha256": "670facef90abe26eacdfa0f8c69cc009478927d4107e0b05534381dca7ed5e3e"
    },
    {
      "file": "src/world/odyssey.ts",
      "sha256": "e1f61f3f45154772c9e79066588136cc7efb3731e2da74cb40798b014a032580"
    },
    {
      "file": "src/world/odysseyPressure.ts",
      "sha256": "26232832b5c4417a33bd4779dd75b53025330ba1873f3c01cc17056204902542"
    },
    {
      "file": "src/world/odysseyRisings.ts",
      "sha256": "0c711eb5ad6ffc5baf5292ce64d20ff2d9620041a070127876506957c5fad6fb"
    },
    {
      "file": "src/world/omens.ts",
      "sha256": "38c10b62f2b9b34ca5650d0c4c64a20bf625c202e769892e2c6d35f17015bf63"
    },
    {
      "file": "src/world/openingProgression.ts",
      "sha256": "5df9cf425fef32f6e378816436b4f0cb647cbe448971facbb44af5477f782c4a"
    },
    {
      "file": "src/world/overlay.ts",
      "sha256": "b6bc1c41e185c6fc80213cb8b7f6b59c413273e7f3496dd07ca1325239187432"
    },
    {
      "file": "src/world/palette.ts",
      "sha256": "f77ce9e4e7c8cc64ea92fc43ad364b8c5f0e63f15b66401f904e6955cd653258"
    },
    {
      "file": "src/world/radiance.ts",
      "sha256": "2b53dc16a2fd285f708e8b47daebfae37e426b8daab26f1eb8b4d3f3b2dc1a32"
    },
    {
      "file": "src/world/regionGeometry.ts",
      "sha256": "ebd9a868b4f05fb3241b2c02f726ecf90165221acfe6ce8244e2f3db4e27d071"
    },
    {
      "file": "src/world/regions.ts",
      "sha256": "3ad59b11d397e5c5583d9e4c8a917d58f937439cbabaad67606334b0eb796aff"
    },
    {
      "file": "src/world/relief.ts",
      "sha256": "87961ed33ee2cacfb2c4e9a7f3a352aff9528ddb54392b5a6114f9b8d1cd1901"
    },
    {
      "file": "src/world/reputation.ts",
      "sha256": "7eb9e8ea905ed0d42fa0c14bfed7a487704522d8ed6b749f0182fa4eadd92176"
    },
    {
      "file": "src/world/seas.ts",
      "sha256": "82fa3856e88b3141dacfe05a907fd52774fbf2a47fe38fc4c215fd3e144b9e99"
    },
    {
      "file": "src/world/seats.ts",
      "sha256": "43b40c3368ca14113f2e9719df75ba41622985d3d7ef7f79185eecb78447af1c"
    },
    {
      "file": "src/world/shape.ts",
      "sha256": "daf83d9d1244efe6b216e06b59ae113db4ae00e637a336229f4d97023634be81"
    },
    {
      "file": "src/world/sim.ts",
      "sha256": "830425a48c9dee315f63d8438faaa6157688cb78c2ccd3804dc16e9de6ab95f5"
    },
    {
      "file": "src/world/soulriver.ts",
      "sha256": "00b8f3958ffe742ce1ba4c0b87e6a5898db1e286150ae297b591c75618b3aa36"
    },
    {
      "file": "src/world/strata.ts",
      "sha256": "5de0808db7630d9b6bc0ca5fbc5abc7e3c030190d8bf62ffc78c21fe601c7530"
    },
    {
      "file": "src/world/tilesetChoice.ts",
      "sha256": "ff40aa849ce0aa9e34ca2a1ab3a019a5da0b6a6fcfda8625c01313a44382bd49"
    },
    {
      "file": "src/world/traits.ts",
      "sha256": "e83276d34a073a605f1b4a3a2c268fc733b81ac16085d73c13832a37e125cf9e"
    },
    {
      "file": "src/world/travelRoutes.ts",
      "sha256": "0976d78145b4d0878918e3c7edc5771b2b77e3250295eabee82acc093c4df121"
    },
    {
      "file": "src/world/voyage.ts",
      "sha256": "2f43a737f174ce2b6593e0951c6a27d4e96486c22565e2e8c1f29a555a162c8a"
    },
    {
      "file": "src/world/walk.ts",
      "sha256": "45d50e47d698caaf6464b9eda2777840ece25e68883442ca6c4f048a89ca8eac"
    },
    {
      "file": "src/world/warfield.ts",
      "sha256": "61711517dac59cf762d41fa8706cf62e8936243d608e81aa93340359f3e1ccbe"
    },
    {
      "file": "src/world/warlord.ts",
      "sha256": "a0b14c99eec78a64c1ea725854f97c7d596bcfa6666f72523e135950cd8c8834"
    },
    {
      "file": "src/world/weather.ts",
      "sha256": "453cae4bf0c20f296b1d216284bcce9e6b6cd1480f9f4d4ba245eb87579e7634"
    },
    {
      "file": "src/world/zoneInfo.ts",
      "sha256": "8dccc68e276371a3aaa09d90e5a75dde4681be93cd682775ae55d7731a3a233b"
    },
    {
      "file": "src/world/zonePolicy.ts",
      "sha256": "e677ff1c52c8e7d26ba43f5f708d4f29e4d610c364591dd30dbbded5f4b989de"
    },
    {
      "file": "src/world/zoneVariety.ts",
      "sha256": "ffea30076fc64039cbff9ff5da54caa48449eb503e487938bc14d097596bf809"
    },
    {
      "file": "src/world/zoneWash.ts",
      "sha256": "b7c351b6ae7a1ce26f0a0bc5527003bbcfe6cb2d943522cee31ad75043a14fef"
    },
    {
      "file": "src/worldmass/activitySites.ts",
      "sha256": "06b19553171365e9b9ac5a3562ff088699d6657b4dfab45e30e6146b5e35172a"
    },
    {
      "file": "src/worldmass/address.ts",
      "sha256": "bf1632c89d12907f1bc614cf73b4c85ac3a16640bb90aacfc070450186214b56"
    },
    {
      "file": "src/worldmass/ambientPacks.ts",
      "sha256": "f4793b446f4d15c3efa78e786a619c24affa07703463f8ee79caa218496d23df"
    },
    {
      "file": "src/worldmass/biomes.ts",
      "sha256": "9059af98fd2ee33c3f61476f599e34de08650a5ff3d456152ede5ebec4b20ace"
    },
    {
      "file": "src/worldmass/birth.ts",
      "sha256": "5873b1b61552b3354b04264485d31a98656c3b797552eb45331f9921113b0d77"
    },
    {
      "file": "src/worldmass/bounties.ts",
      "sha256": "c12ecef4f2841146151d27f3f75ab2eaae683103c42f380c6471961d1a621e9d"
    },
    {
      "file": "src/worldmass/cartography.ts",
      "sha256": "1a37ddcb64db0f232fc7762fecba6da3eb8f01380b3b0e5e309f27e640a5b587"
    },
    {
      "file": "src/worldmass/caveStratum.ts",
      "sha256": "acc4d19c062a2a1d027ddbd0186ca2444b01e15316b88f879777a805599be2bd"
    },
    {
      "file": "src/worldmass/checkpoint.ts",
      "sha256": "a4b9960bfdecd583f9cc288e522bb25dfb91c7acb2504367a0ecd72043476939"
    },
    {
      "file": "src/worldmass/clearance.ts",
      "sha256": "4c44e3181ed7edba0163135bcf95432621bea1bfc9639eafc372d9d9e9f92ad4"
    },
    {
      "file": "src/worldmass/compilePort.ts",
      "sha256": "78e0a67129004bdb61736d180c4da85967db838b2ac849b92d22df587b6171f4"
    },
    {
      "file": "src/worldmass/contracts.ts",
      "sha256": "5b5782a124d45a2a40e6ed4c6eb5175ee367237340b41a46ef55353cf0e548c7"
    },
    {
      "file": "src/worldmass/countryOutposts.ts",
      "sha256": "249f743a8fdc91f7029de01ba336f547e0daa5479148d391fdacfcde869c33f1"
    },
    {
      "file": "src/worldmass/courtPuzzles.ts",
      "sha256": "427d0d9c3af6fb2211d6ca4f1814f428e86675daff04c3d863cee4062ffaab97"
    },
    {
      "file": "src/worldmass/dormancy.ts",
      "sha256": "41435e7f1892b5bbb6ca53b851e9c221039deba255fbd741c08ce2cb0e36dcaf"
    },
    {
      "file": "src/worldmass/ecology.ts",
      "sha256": "7fbd147049983079ec3e7fa8eba05c9a3fbef391a06c244a39f5c978698c67c0"
    },
    {
      "file": "src/worldmass/encounters.ts",
      "sha256": "772f9e3bfeb059142756cd3a5dda79daf4af9aaf1d5966a41b0935c4a19ff227"
    },
    {
      "file": "src/worldmass/fieldSites.ts",
      "sha256": "90d2e3bb58fb66f5e93b740e55a60ff4a609f5ad3df5714b64666924d9e83c3f"
    },
    {
      "file": "src/worldmass/fields.ts",
      "sha256": "9bcf0f9b651700d06588df3c3c7857f6b2b33863ec8e47f0eb67d4ebc23d07b3"
    },
    {
      "file": "src/worldmass/foci.ts",
      "sha256": "1af3e7119aaa27d261d58668f501e9be885d9155f512e1ab7b07461a8aabe8e8"
    },
    {
      "file": "src/worldmass/generator.ts",
      "sha256": "5221fa836d274d45842acf05764ff15b63cf13a80b49ae06b58c7e5d0a54e134"
    },
    {
      "file": "src/worldmass/geographicAccess.ts",
      "sha256": "5ec8cb9b1d27cd7a948b957907566dda85db1e1f0a07c8f486f011490db938d9"
    },
    {
      "file": "src/worldmass/geographicAccessCore.ts",
      "sha256": "8aa30125b22f112db4ceafb614e1790802d9bd910b5dffd31f6d9f3107fa0ec5"
    },
    {
      "file": "src/worldmass/geographicGameplay.ts",
      "sha256": "a96987cbd6f7ce738fd88261f8ad95bc377eef07bc23601260006e82e88b81da"
    },
    {
      "file": "src/worldmass/geographicObjectiveChoice.ts",
      "sha256": "0d7fb6a7af770872ab1cc9b0d4a083b10d4a3fd53733487de64bf0d26b9c0e3f"
    },
    {
      "file": "src/worldmass/geographicPlan.ts",
      "sha256": "747117363710c8bce888b68b61960febd78b751d5a560089b9ece95ccc9d64de"
    },
    {
      "file": "src/worldmass/geographicPlan.worker.ts",
      "sha256": "bc5aef182cb7e9bcb6e0cddad69ab9415d4861b23234174fb3970c0fbebbd2d6"
    },
    {
      "file": "src/worldmass/geographicWarm.ts",
      "sha256": "b69a5597d00af0c0f231a8266157bd8081a20e564731588f257471076aa13bb2"
    },
    {
      "file": "src/worldmass/ground.ts",
      "sha256": "7965a61e922a991b3a37f27d870b395c9026fec3a5d4588259b7b409484f6331"
    },
    {
      "file": "src/worldmass/hierarchy.ts",
      "sha256": "5fca8bfdfb59a74b948e4ce10669a399572fce63aab2a65cf36a8c373a625f99"
    },
    {
      "file": "src/worldmass/journey.ts",
      "sha256": "a9c1a1120214a84eb43d0752f4e3062b3e38cbf39776bc1c3ac0cdb01e6a38ca"
    },
    {
      "file": "src/worldmass/landformDressing.ts",
      "sha256": "3d6f093d6c78ef6810e842db9184e475febcca3f7328abdfd2dfe900dd62f492"
    },
    {
      "file": "src/worldmass/landformHabitats.ts",
      "sha256": "2e3753a60c7af6c78a428229860bcf05ddab26b5cc51af56267a33d2552cb282"
    },
    {
      "file": "src/worldmass/landformSources.ts",
      "sha256": "4e0f1e12c72cb9af274ecfee1f4cfd99a318e1e51d0520b24b07e20ca5b42f61"
    },
    {
      "file": "src/worldmass/landforms.ts",
      "sha256": "758d7cb37c43ca851470b0cc386b318a88f459c1470fa48a192a6cb62a0e0b85"
    },
    {
      "file": "src/worldmass/landmarks.ts",
      "sha256": "81a8c50a83e7b5dee764ba38a9e28c5c4e1ef352036dd8e82cdb855e6857d095"
    },
    {
      "file": "src/worldmass/mapLabels.ts",
      "sha256": "014924287fde0692dee2c173e7a867b38f0b015c74858952da560b785c1a6f30"
    },
    {
      "file": "src/worldmass/nativeArea.ts",
      "sha256": "030f50d35a01ba25a4ae4fb021180fad2f90ec2e43b8c11e024d989d0cf6a439"
    },
    {
      "file": "src/worldmass/nativeAreaAmbient.ts",
      "sha256": "8958fa9d804e9274a78da348fb1b739c3cd2ea8b94b99f9d4ddef3573759f1a6"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignFrameState.ts",
      "sha256": "7ebf9efdf43106afd63e5de905a7fb9baaa7c66d2edd68767c463099fe002c8a"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignInputState.ts",
      "sha256": "3e6a87d4fe45093cc3a4fa611e448e8a75258eb423e48630dc0c443bafb68f2e"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignOdyssey.ts",
      "sha256": "e6e79295b241b9081521a763bfd4b4f791feee1977c203fb877d06cce4ab7a5a"
    },
    {
      "file": "src/worldmass/nativeAreaCampaignSession.ts",
      "sha256": "74af99df650e0f525ca73b222de2760d3ff76189add0464b26a7992bf80a3066"
    },
    {
      "file": "src/worldmass/nativeAreaCharacterCreation.ts",
      "sha256": "948788568ce35079894428f167efd9a3007bd8a93cec34367c70d3d5c2d57863"
    },
    {
      "file": "src/worldmass/nativeAreaCharacterResume.ts",
      "sha256": "f8d3c427ab217aa22f5506b7f927d9389facfc5ebc945eed01250be25673b633"
    },
    {
      "file": "src/worldmass/nativeAreaCombatOperation.ts",
      "sha256": "f9f98240c57ece5bed51b12e0cb6452186b222f7dcd2848f6f96b349770d25ec"
    },
    {
      "file": "src/worldmass/nativeAreaCompiler.ts",
      "sha256": "2ed4723b99ccf43fb22a5e65e3c875bc691882e8792be7a1756888f74fd99489"
    },
    {
      "file": "src/worldmass/nativeAreaDirectoryView.ts",
      "sha256": "f721bd52508aaecf47fbbe6b8fdc4ed9d7b5960cef26a5f5c83951e8b1267fb1"
    },
    {
      "file": "src/worldmass/nativeAreaFinalEntryPlan.ts",
      "sha256": "1380f05becde4b97121a374685183ac6679a9eff836276a7616bc56c64551a0e"
    },
    {
      "file": "src/worldmass/nativeAreaGeneration.ts",
      "sha256": "a4ea667f7034bf922b2419ad9e2eb7dd18ccd34f8b1b1ce9cece93ac772d6493"
    },
    {
      "file": "src/worldmass/nativeAreaGeometry.ts",
      "sha256": "7eff9475be05da3f37db09ba1240467b776c8f0e3314ae0e148befbd6997465d"
    },
    {
      "file": "src/worldmass/nativeAreaGeometryCapture.ts",
      "sha256": "764993077dc1323a6136d349909424ff48b2166eec42fbf4843fe20bc146473f"
    },
    {
      "file": "src/worldmass/nativeAreaHostedPresentation.ts",
      "sha256": "f998370e452d841ce24bcbb4994e0ab27452990b53e014f2a2c3ca21d59598a1"
    },
    {
      "file": "src/worldmass/nativeAreaHostedRoadSupport.ts",
      "sha256": "84d1e4c31a945246ef2aba40bde53ba0bd81f25e7da11e3f4073c48b87e97821"
    },
    {
      "file": "src/worldmass/nativeAreaHostedSnapshots.ts",
      "sha256": "c2ffa21d309b5a23c682437296cc28e91f7a66c109b73b56c93f12be5062a482"
    },
    {
      "file": "src/worldmass/nativeAreaInstalledSources.ts",
      "sha256": "ffb4473a907ed16699cc56157cbbd0790e9df189304985152bb3964394031c43"
    },
    {
      "file": "src/worldmass/nativeAreaLocal.ts",
      "sha256": "a792ecd8f35892643e1dfb9a7b3c73f07d30f6f8a8f65876935788b6f6d29ce6"
    },
    {
      "file": "src/worldmass/nativeAreaMaddenLedger.ts",
      "sha256": "d4c4af52349657f28dc993eee8fa93525931a6fa05c18404e2adc3fd9e131f61"
    },
    {
      "file": "src/worldmass/nativeAreaMemoryRegistry.ts",
      "sha256": "5f25299eb4fecf7ba3725e9ab34096fb080ea50300688ed497dc91f03729fb79"
    },
    {
      "file": "src/worldmass/nativeAreaMenuPublication.ts",
      "sha256": "7d8dfcd961e3500d18d77f3a17945e0cc99ca54fd117703ceaec7ba85b2112c3"
    },
    {
      "file": "src/worldmass/nativeAreaMenuQueries.ts",
      "sha256": "0798f04eb1336818ba65019904ab312796c563f52eb3c03bf530e24b8a10ef60"
    },
    {
      "file": "src/worldmass/nativeAreaParty.ts",
      "sha256": "73dfc90f36f5017a0456228b1486b8057c98fd325d05a7ab31efc8e34c520b5c"
    },
    {
      "file": "src/worldmass/nativeAreaPopulation.ts",
      "sha256": "9c48f01ef3b331b37c20bf4c6053baab7a49cf7041b35a9c0a123dd94e3be7ac"
    },
    {
      "file": "src/worldmass/nativeAreaRandom.ts",
      "sha256": "6959b4820a9064a000428bc05351e20ba1a9ba24884dcfba5a4579a5b9b6a15d"
    },
    {
      "file": "src/worldmass/nativeAreaRetainedLifetime.ts",
      "sha256": "c14a7f9f6e5a47a353fd5769adff117ce924803d28974faccc148e9ab6fc9b10"
    },
    {
      "file": "src/worldmass/nativeAreaRetainedMassState.ts",
      "sha256": "1534e40cedcfb85e34db4e43aa4586ad0c17d6074fdabb515975184d76d46296"
    },
    {
      "file": "src/worldmass/nativeAreaRoadContext.ts",
      "sha256": "bb5cc7c0b1bc8d5c35350cac3d70d7258e5a0e78e77cf9fe0a72fff2e62c85b6"
    },
    {
      "file": "src/worldmass/nativeAreaRoadDestination.ts",
      "sha256": "b1ee42339d9e427dfecbf9bb247e84095291a0b84344ffa9a27be68465342f43"
    },
    {
      "file": "src/worldmass/nativeAreaRoadOwnerBridge.ts",
      "sha256": "2971b5c8095e3d2f32d40ac42f295758894d464472fe5b0e3a7b1caa2626636e"
    },
    {
      "file": "src/worldmass/nativeAreaRoutes.ts",
      "sha256": "816cd5ae3ec7a0e2613249edf7c4d8224a5c928d2a4654722fa8b3f57c2cfd33"
    },
    {
      "file": "src/worldmass/nativeAreaSceneAI.ts",
      "sha256": "d998ea11fc797c2a11aa6702ea103e98ae9180c8e652546a5b5a3cd24a2f95b4"
    },
    {
      "file": "src/worldmass/nativeAreaSceneAdoption.ts",
      "sha256": "1671411a56c952670f976cb44f9447ea973708838f2099f18edd22e839fbccba"
    },
    {
      "file": "src/worldmass/nativeAreaSceneArrival.ts",
      "sha256": "814d25d7204ba0264368c4dd6a48138a39ed5193c30f2c6ffc924df3a0f56dee"
    },
    {
      "file": "src/worldmass/nativeAreaSceneBirthAdmission.ts",
      "sha256": "2382b7e43b7627e4e66f22fca7248e270fbd7f8379cfea8eb3b4436b7643b64b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneBoundaries.ts",
      "sha256": "d16db8ba409c99a8a38ef7ca4e917602d8b430fef57dd0a94ed3651de3927f52"
    },
    {
      "file": "src/worldmass/nativeAreaSceneBounty.ts",
      "sha256": "4676a1252420bfdc26d63f31c3439bcc46337ccc9189e500fcb37311b7bbeabc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "sha256": "3802525cc36b613f476b479007fd7af409d5b2848d1da9dc59e83ebdb89f68dd"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignTransitions.ts",
      "sha256": "876de07b4d4144218b487eb6f81ee0b59219ef6f3675a7f2498a7d7c563d08c1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCastingPreparation.ts",
      "sha256": "41641fc498db2f8a91dc3651df761d1a0a795b9cc441efbc790703b210a3f429"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCoast.ts",
      "sha256": "fbb907bf56bd0167d987f6e00f7abbd390f7b42684ad436bbad0bf435702a1d2"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatArena.ts",
      "sha256": "0b0ed820ac0c4c4d27b112120a0152a2438ad50768899decff7a4bfa67f5db92"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatCampaign.ts",
      "sha256": "bbb10b0c8add1846302a86fcffe18ce6788b13ae9116407b3a6414e771f34cc8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatControl.ts",
      "sha256": "b8e146d1bd13b872192e1372f906e9d4ac49930562de062e9d6f420c067f2ee0"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatFrameState.ts",
      "sha256": "d1dda3a88d82723f79eda2eb0de25c2cff62b8286e41996d1551d70fe826c240"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatRuntimeState.ts",
      "sha256": "ace08272541de1f6033dd8acc4517931b5eddbabf36335228c06447f63acd2b8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCombatState.ts",
      "sha256": "f2322f51665a2d1758846d6dfc6755b5a6ad357d3ae6261da2d1d7d9a9e174c9"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCrusadeLifetime.ts",
      "sha256": "96b00fb6ea70dfaad447de80fd49d38492875184e939da07f7bf2f5d049e9ebf"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDefensePreparation.ts",
      "sha256": "9f7752d2ca28ca35eecbd87fd9f08f1d6975b09d732b353111541ab65b670ba7"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDepartureMemory.ts",
      "sha256": "a3468d1117fbee02e093732d6473e83b2e582ac41dbe5ca18b44c9ff6073671c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDescent.ts",
      "sha256": "4cd5a51ec5e78a868836092a78fd385a3355cf2136881e551a39fad0fec1bbea"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDirectory.ts",
      "sha256": "0df38cf6a2d412a8e6831497bd6e27dc9059ba1392e906faf56e1379523ec471"
    },
    {
      "file": "src/worldmass/nativeAreaSceneDisplacement.ts",
      "sha256": "9be546cb6ceea3aeeb9b76c10d93395a543fead09d7837cfbb4267e267c4461e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEcology.ts",
      "sha256": "72f88c3f477777b2ce3b4b8fb14d2789aa20faf0ea80cb10b765611da3301ae1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEncounterArrival.ts",
      "sha256": "02723a38e782da0898642f2ed6dfa68752e9cd73506d6a6ae628aa946d15a134"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEncounterBirth.ts",
      "sha256": "cee1995a9eef8290cb12c393b47f3c20c216873676f0c064820abfdd44225520"
    },
    {
      "file": "src/worldmass/nativeAreaSceneEnvironment.ts",
      "sha256": "1a4cd214a4eaae73dcdc66dee9af901c65374305491f3350bc6d299e909782d1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGeometry.ts",
      "sha256": "33a6cc466df76e4ce143efd7c64e130547654e06bf1322fd8fad106d574a8759"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGraph.ts",
      "sha256": "44c29e35f3c45a6d6dcdfdda431f2dab4482d40a65ad2c15cd819c941e43b5b3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneGroundFollowUps.ts",
      "sha256": "d717f24cc92a58befca3faaee25654a3ad60d7027411ddda02ddc3ec7864fe79"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHarbor.ts",
      "sha256": "413d4477d1261074a00fe1485257e9bfcd093f0da2a7801d4c6af2b50b4b66ff"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHarborServices.ts",
      "sha256": "61b77d432a9ad7d6a5d171c04df0ed71984e08e16c0912b3856f7327bd89606c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHistory.ts",
      "sha256": "a50a940bf79c1312c64300e49ace6e510f088561476a6bac8cc2e122d6f3810c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneHistoryArrival.ts",
      "sha256": "83e1c6dc6d8c186454fc225e8386f96e9d4497294c9d8026a28d8cdb98875979"
    },
    {
      "file": "src/worldmass/nativeAreaSceneInput.ts",
      "sha256": "f57d4830f90b714ad655bb4f9ca86c97f9c1724ff4be60b912b8285f1f1f416e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneKillAftermath.ts",
      "sha256": "3bbf0db85f5a37ce0498c20fdbf30a2770ccdc649e967c8ad139f80ec05db81e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneLoot.ts",
      "sha256": "20a1f13b9f69fc1d00637a0f624d39fdfa3c6338a959674baeadcd99a9846e5b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneMemory.ts",
      "sha256": "fc9f0cfb30d3e0797ddd2d7cb214f8e867d1d576b7cef10a1c47e846b16b4e9d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneObjectiveCompletion.ts",
      "sha256": "72f4bc77bf0781c6268772b02489b96d56c054534435c083405c72de1f3f917d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneObjectiveWatching.ts",
      "sha256": "8ce5e2a0b35130ecae73a7888e373c072e6b688b7e7cebc1cda1c2b1f0dce627"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOccurrences.ts",
      "sha256": "3a11b2e4deae636e9c58eae45d1acb8c0803d1496376ff76cae011a9c7030ecb"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOdyssey.ts",
      "sha256": "93fa861ffe0f76a63d5c6bec42bb7d6103638872a1c11e81e9f9872be3dca232"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOngoing.ts",
      "sha256": "c6dac7aa728afa7b99de222d045ed3b0ca9672e7478eda8223a40cc4fc7a9da0"
    },
    {
      "file": "src/worldmass/nativeAreaSceneOpenings.ts",
      "sha256": "c58e9d65502b566e1b670eede8548ac36ec42a14027ce8d35702ac9d51ea9ae8"
    },
    {
      "file": "src/worldmass/nativeAreaScenePhysical.ts",
      "sha256": "6cc3620c78cd3a4352191a69b76de44e849a2b2e7add380acd21d981976cb9cf"
    },
    {
      "file": "src/worldmass/nativeAreaScenePreparation.ts",
      "sha256": "7b154527e1334a0fa86ece835d12aba9441f1460163fc32f19c7f348cfca0269"
    },
    {
      "file": "src/worldmass/nativeAreaScenePresence.ts",
      "sha256": "add0057a6caf4a0df2971dcf719a1c48616549ac5faddecc5b5e334818cd23b4"
    },
    {
      "file": "src/worldmass/nativeAreaSceneProgression.ts",
      "sha256": "4d3ed7c3485e1be22f94ca33ef358e4a983b1c6d834763a91f0034fffb492398"
    },
    {
      "file": "src/worldmass/nativeAreaSceneProjectiles.ts",
      "sha256": "3e7d3c68aa759ab684cc7a54daf04ceaed3224836d6ae79f693acfc3696e8326"
    },
    {
      "file": "src/worldmass/nativeAreaScenePublication.ts",
      "sha256": "4e3a89a32e43cd739048fa038cfe3a956c7699093d9436175da70d35f3cee005"
    },
    {
      "file": "src/worldmass/nativeAreaScenePuzzles.ts",
      "sha256": "b14da7232808be17a11e992dafcc25edfacb81e753792b861916f9c73852fc7d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneQuestInteraction.ts",
      "sha256": "2eb07f46cd126ede8b450fd09d2e470cae8250ff9e098ae35d5f808e9144e26a"
    },
    {
      "file": "src/worldmass/nativeAreaSceneQuests.ts",
      "sha256": "256d866e6dc676a40ad7b441c8b9f37b7aa87961496b8be04c2b42be08fcc386"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRestoration.ts",
      "sha256": "6dad4f083121db8403ab07e552287d561a0c75eaeb1e7ca6f0f62017e8704ede"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRewardStorage.ts",
      "sha256": "428430cf9f3071ff0901183f9813ac77b30ca268b66f7522a5515174388dcb61"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRuntimeBirth.ts",
      "sha256": "8f3f68eea3367b8ea09fac835f05b0a83e00b55e0fb46bcefde9059beb7230b5"
    },
    {
      "file": "src/worldmass/nativeAreaSceneRuntimeRegistry.ts",
      "sha256": "825243773999808629b196079c8b05423363eda44e1d25235177e5f991a45b54"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSettlement.ts",
      "sha256": "96ce150c0bf0f32076d2483d7b770a65827321e52dc2f1d3266769f2f8a7bce8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSiteBirths.ts",
      "sha256": "c3a28edea2cdea051a58c5fee3f776c984f4175a85933b7a58c235310c429f4a"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSites.ts",
      "sha256": "c1db856c7e8d0aeb23ba5de60934691244284fe72aa9d646b56fee88678bd1ad"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSky.ts",
      "sha256": "b000054c92fb87a1e5ce24ed10f8f426c85e2d9569d54568a15f6ab442fdbfaf"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSummonPreparation.ts",
      "sha256": "ecbf3c4443c5be25f988cd442cc19835bf69df865fbb4d1e7ab6edfee8217b7b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneSurfaceArrival.ts",
      "sha256": "433fe020fee3f5e21781e0cd35108180f97b3fdcc4e2d5cca589d100bfebb7fc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTethers.ts",
      "sha256": "9ebb17d28f352d0365e597b50e655bd956d58283cc3cd617d81728c3b6fdcb22"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTheater.ts",
      "sha256": "4abb057d32789b6bad0c32747327a5fb46ed810fcf8f3adbfee0f9852edd8de3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTitans.ts",
      "sha256": "661cc7809e6b76d61f29e97aae62e0d9dfa55577f2f8cdcfdfe599de97da7387"
    },
    {
      "file": "src/worldmass/nativeAreaSceneWarlordArrival.ts",
      "sha256": "71f785557b1e80f281727f3fc3df8ac33308639a8555395f75ddfde03321b245"
    },
    {
      "file": "src/worldmass/nativeAreaSeams.ts",
      "sha256": "64a94560def33c8c753e7d34656a66cc3dbf8a234cbaadbced8ec3d4d8840224"
    },
    {
      "file": "src/worldmass/nativeAreaServerSeats.ts",
      "sha256": "5bc7af33daf436e106190c4759d320a81e38a856c5cd894b47b814d9977d70eb"
    },
    {
      "file": "src/worldmass/nativeAreaSourceSession.ts",
      "sha256": "e14a95699ce2b8a3d351f8f8854a72016a91066664b3cfd492afc87811dd4731"
    },
    {
      "file": "src/worldmass/nativeAreaStorageClaims.ts",
      "sha256": "c740ef289985192bc9a1bbc8159881418c3ab79faacb2b58b3965af4d3e3b113"
    },
    {
      "file": "src/worldmass/nativeAreaTimeflow.ts",
      "sha256": "69cbb3db86d025883387077d41256224c3c12fe5116105a5093979979d94974b"
    },
    {
      "file": "src/worldmass/nativeAreaTownStationRefresh.ts",
      "sha256": "9ce1f0b745e1b3087d047ac012aee20167c4a9fe506458a1fc3bc5ac0cd9bed4"
    },
    {
      "file": "src/worldmass/nativeAreaTownStations.ts",
      "sha256": "45dbd46cd4cdc7ce950d0627cba2001effe0d3b807c214bf05043c1599b67a76"
    },
    {
      "file": "src/worldmass/nativeAreaUIActions.ts",
      "sha256": "5b4477c566463ec9f1fedca01d60e71030d47bcad3a829744c7eec07e18073fb"
    },
    {
      "file": "src/worldmass/nativeAreaViewQueries.ts",
      "sha256": "f42ab210a60d01b4ebb2ccb70ef0550a5800089c896fb943280c62218c6c11bb"
    },
    {
      "file": "src/worldmass/nativeBootstrap.ts",
      "sha256": "0176c6264791d183336842df29c0d4df22965d6688c78c2b6445836df73b5619"
    },
    {
      "file": "src/worldmass/nativeBrittleSources.ts",
      "sha256": "54654c3adcb3b08677c3434d2c33d1ea3cf47b6c84903410aaaeb230f4eb9517"
    },
    {
      "file": "src/worldmass/nativeBrittles.ts",
      "sha256": "6fe4a2c7e22a44f5d7ca61b760b6d3ff5246c4bf5944bfa72ac80f7a83540dc2"
    },
    {
      "file": "src/worldmass/nativeClientContinue.ts",
      "sha256": "6f8cb1024fa243d53e96e2d607277a08b8b01a9d44aaf3e9b9328fdc7caddf60"
    },
    {
      "file": "src/worldmass/nativeClientRuntime.ts",
      "sha256": "ec9b1181b6d6b5fbd2ada9d59fd62373e3555e043185cc92712e57096386b4fc"
    },
    {
      "file": "src/worldmass/nativeClientStart.ts",
      "sha256": "897f671f598fbd8955fef5416c9507048d1fc01ef29fcc3cb8b1f53e5899c7d1"
    },
    {
      "file": "src/worldmass/nativeCompile.worker.ts",
      "sha256": "01403485027d62f09ece1fcad77b282bc5cafff427553ef89def1575fa64f337"
    },
    {
      "file": "src/worldmass/nativeCountry.ts",
      "sha256": "aa2fe9139750092a3e236d68a2c1473f4096f5ecfd061007b505534c42f46c94"
    },
    {
      "file": "src/worldmass/nativeEffectSources.ts",
      "sha256": "a412ab330e09d87a9b8b48a5f5226e54ab80ce33cda7b5a919149acf3782dfc0"
    },
    {
      "file": "src/worldmass/nativeEffects.ts",
      "sha256": "aa5af06d05ac593aa6e14e386df27a88351308f11cb5b8b640292d76f4c61e11"
    },
    {
      "file": "src/worldmass/nativeFeatures.ts",
      "sha256": "8649b18d6e0ce3411480823ee9578904829f376575275a297bc2311c3628f29d"
    },
    {
      "file": "src/worldmass/nativeGeneration.ts",
      "sha256": "4246a81a582ed07f20ccb0af51c8644e3904a828eb06781770d1eee9fc937a66"
    },
    {
      "file": "src/worldmass/nativeGeography.ts",
      "sha256": "95f80056a0d998250867072edfd4f02b4cfcdaf1bede59a8ee7da72fd65581f9"
    },
    {
      "file": "src/worldmass/nativeGeographyCatalog.ts",
      "sha256": "5474f5216c43f8eabfac2ea6f08641534dddf3f2eb66ff71be8ae7abc3c766f5"
    },
    {
      "file": "src/worldmass/nativeHost.ts",
      "sha256": "0f046a8aa8c8849dd04ed285ff53a77ef4260ec3c33146565e3cd4b06a4bb496"
    },
    {
      "file": "src/worldmass/nativeHostedSerialization.ts",
      "sha256": "61aefc92bad3b5e36f1c1b47bf57f2b71c754af212104a7f812a69e9a7982e5c"
    },
    {
      "file": "src/worldmass/nativeOdysseyGroundRefresh.ts",
      "sha256": "c22a63aa08f71c65f94be3f59f680ad18b3006bb9baabc17d58a3651df7c3901"
    },
    {
      "file": "src/worldmass/nativeOdysseyGroundRegistration.ts",
      "sha256": "d0422bc069ec5942d4694c2fcfe11a81b1221c4ceb6a817477547b91df9425c8"
    },
    {
      "file": "src/worldmass/nativePaging.ts",
      "sha256": "f542fd9c0a168c38ddcdee1941f0bfb9d379fef2c1e3eb9ceb99bb80373b4110"
    },
    {
      "file": "src/worldmass/nativePreparation.ts",
      "sha256": "458760942f1aa1dfe5c83459e5bc383f82ba7abca213fc4e23a44def74470c8d"
    },
    {
      "file": "src/worldmass/nativeQuietAnatomy.ts",
      "sha256": "67351b14a30e0bed6bb2d659deb78644948e5a82b4633c5a95cda20ba97d0afb"
    },
    {
      "file": "src/worldmass/nativeRegional.ts",
      "sha256": "215ba0e41c431d6aa437a96dcee8c2d70d59bd19e14451b07fdda1a25ba8af4f"
    },
    {
      "file": "src/worldmass/nativeRegionalGeometry.ts",
      "sha256": "68538f84272e2d0804a6f06af5d395996a6529fcf35b0a551d9bbf28f6cd7276"
    },
    {
      "file": "src/worldmass/nativeRegionalSeating.ts",
      "sha256": "50a0e99d2d892be3a86fd8fb9ad1ad977f8d5439f6bff5757f8c4e04aee976b0"
    },
    {
      "file": "src/worldmass/nativeRegionalSources.ts",
      "sha256": "830a1ecbdbb55a8691f30de1059aba7208a89498745b0be9b365e4a636ddbfa3"
    },
    {
      "file": "src/worldmass/nativeResidency.ts",
      "sha256": "1fa3c7cffb1bdd809132dd9c2f8613f847c665ae77402c843d0a8369fcf1ec43"
    },
    {
      "file": "src/worldmass/nativeResidentSession.ts",
      "sha256": "c26bef7c238afafce0fdda078faf3471d5346e20fc97541803cb41291d728170"
    },
    {
      "file": "src/worldmass/nativeRetainedSave.ts",
      "sha256": "2afef135cd3b5a3ab52eae8353dec2b0d45aea8cb3b2984f53e3bc74daf823c9"
    },
    {
      "file": "src/worldmass/nativeSceneBirthComposition.ts",
      "sha256": "6453ceaf063810e33e2616d3e8bf3b5fc63f2aa87e113c831eaed7cdeb99b024"
    },
    {
      "file": "src/worldmass/nativeSceneObjectives.ts",
      "sha256": "572adc6f7e924bd11dd8d1bf5a0cfe2423b29f0ed44564b575fffcd26da4988f"
    },
    {
      "file": "src/worldmass/nativeSceneState.ts",
      "sha256": "1d976ea8b5599d2b2d385db722329a62e7a8b3d2d48749b92b18a4667ce44611"
    },
    {
      "file": "src/worldmass/nativeSidezoneFurnish.ts",
      "sha256": "22491c051e87c4153e26fa13f4cdbdb96609889254597245100be979a0bd201d"
    },
    {
      "file": "src/worldmass/nativeSubstrate.ts",
      "sha256": "f7c0815c2279e715bd6035e3c477175b1d05f23b977a4fb9a12b8ab1219d152e"
    },
    {
      "file": "src/worldmass/nativeTownBodyLedger.ts",
      "sha256": "6d2d4f17ecfe807a7835cee94cdb0e05e20f5e253bcc6971147d7126d1d32d90"
    },
    {
      "file": "src/worldmass/nativeWarm.ts",
      "sha256": "577ad70bacdfe1e8f96b8fc1576246c481658a4a434731efd00c4542ae3c6af5"
    },
    {
      "file": "src/worldmass/noise.ts",
      "sha256": "2b0f2e6e7f81d43ea68957624ad7e4bcefa808194b9805d7fdb6ff10b485b903"
    },
    {
      "file": "src/worldmass/objectiveBodies.ts",
      "sha256": "960969361d0786ed1a0eff08f796277c35db31704274ccb91b989b62eca8d629"
    },
    {
      "file": "src/worldmass/objectives.ts",
      "sha256": "723b7d6937cc3fe1d74a53e9463bbd719c2397d36d60192cb0ff113c8ecab52e"
    },
    {
      "file": "src/worldmass/occurrences.ts",
      "sha256": "45b78853b8d14e86fa91352db71b746f7fdcc1601c72b0363e9a45b7fc4b6ec5"
    },
    {
      "file": "src/worldmass/origin.ts",
      "sha256": "bf6d85698c184eb5a77c27d855d232934b562930df10bb3d807df824e3cd219d"
    },
    {
      "file": "src/worldmass/paint.ts",
      "sha256": "27f48d99deecaccff1f934614e60efe2f85f671bb829c902bfb6761cf37ff591"
    },
    {
      "file": "src/worldmass/patchReservations.ts",
      "sha256": "28f075d64f20e07f1e8e48b5d94c674cf84653327edb94e0f65fcfb0b9bafbdf"
    },
    {
      "file": "src/worldmass/physicalIntel.ts",
      "sha256": "d4887ced42f4c252086b3f9e41ab8f12de5608078283c25b718cdcdcf4c135c5"
    },
    {
      "file": "src/worldmass/population.ts",
      "sha256": "985780d4c5f3cba42c8b901a04c9395150456d792fd2f7114e418f2470814139"
    },
    {
      "file": "src/worldmass/preset.ts",
      "sha256": "253aba1e57f627781c24ff1795c4d2a4b5ef32c2952ff27b673fb6bdd7930134"
    },
    {
      "file": "src/worldmass/processionGameplay.ts",
      "sha256": "0b87415aef988131cd0e866ea520c6c6120de288953e95019c898f5e7e84a5eb"
    },
    {
      "file": "src/worldmass/processionPlan.ts",
      "sha256": "da9c71520f326c0b72281b620bd3392d274c81caf563aa875ad4ec7aa4ec1bc8"
    },
    {
      "file": "src/worldmass/processionPlan.worker.ts",
      "sha256": "6174c9d9e1d74e5fa0337df750a09af4e940ab464ff0e264cfc75e9c40ccbf02"
    },
    {
      "file": "src/worldmass/processionSources.ts",
      "sha256": "16c7403567f45dff2d9dd7ccf92790f1e4b330d7ade88cbcb9047774435d6ce0"
    },
    {
      "file": "src/worldmass/processionTypes.ts",
      "sha256": "ddca721e57ba9b05b145890d5e2aa0c5a728b7a3da7ee201a85e097f487a1a87"
    },
    {
      "file": "src/worldmass/processionWarm.ts",
      "sha256": "f440df0f7673bfc70bc3f697611c25dd58128caa616dce86d5d524752ad7dd24"
    },
    {
      "file": "src/worldmass/processions.ts",
      "sha256": "39189fc56278b78e495a00d7f3580caff8a998a1feaff1d20d77964d71303f68"
    },
    {
      "file": "src/worldmass/progression.ts",
      "sha256": "729404dd54c7282ac65e293f054d8b19c8e3ae9b8244971906f50b82a73a672f"
    },
    {
      "file": "src/worldmass/puzzles.ts",
      "sha256": "e11bd12a9bb4ec5a6af5effeefb744cf37f6a652cf5cb8475191f073ef8eddcc"
    },
    {
      "file": "src/worldmass/quests.ts",
      "sha256": "6965103781c7cf2c5ccf1e102d16f37738ccf028a7d410200f45975a8d16dc8d"
    },
    {
      "file": "src/worldmass/random.ts",
      "sha256": "4a2a5d79ab39ed752804d7142a368f0e66f8526014128a2802d0dd2e6daf650d"
    },
    {
      "file": "src/worldmass/rebase.ts",
      "sha256": "f7daa31d4b7d93a2e2263ce904dcc9eaf150dd95dff88203b720020c1478fbd4"
    },
    {
      "file": "src/worldmass/regionalCourtShapes.ts",
      "sha256": "4a3e69089291b3ff47eaf900d25c7b3e76a79b6d42f63e935eddab5a01432eef"
    },
    {
      "file": "src/worldmass/regionalDiscoveries.ts",
      "sha256": "129605b7f6e20df3735412485cc27a8c39e2f46f22df83b7f51085a8a1c98b8f"
    },
    {
      "file": "src/worldmass/regionalDiscoverySources.ts",
      "sha256": "b23676ef391b09bcc692f99fadc62075573b3f4779492970119eab89cff96a0f"
    },
    {
      "file": "src/worldmass/regionalLandformComposition.ts",
      "sha256": "66f671565085c71dbf3869c9e1f0eb8474bf5ba61dd3757164bba149bed3eafb"
    },
    {
      "file": "src/worldmass/regionalLandformSources.ts",
      "sha256": "571beacd868c2e9e1cf31a9ebd5a634364eaf8e32e65f86da066b73e95eb9b9a"
    },
    {
      "file": "src/worldmass/regionalLandforms.ts",
      "sha256": "275f10fae28f621eb9fb6be399ccbbefc57ff127d00facee1a19a4b00c8df929"
    },
    {
      "file": "src/worldmass/regionalMotifSupport.ts",
      "sha256": "b73550976d6689f871b5eb0c8ba8e5ebf5eccbcc0c587ed468b141d0fa72e2b2"
    },
    {
      "file": "src/worldmass/regionalPathWeave.ts",
      "sha256": "f841283e2342d803205261e3a6e7c06911147cdec86d917f399093118648bf36"
    },
    {
      "file": "src/worldmass/regionalSites.ts",
      "sha256": "b3ad3c7e2e7d8b6a3a5729b537f2110f75065f48ec29172ed44111a6f8787338"
    },
    {
      "file": "src/worldmass/regionalTerrainFootprint.ts",
      "sha256": "47816fdd40ebc7fedcda6736b271a1ee5a4a3baf3857cda087e71315cd17fcc3"
    },
    {
      "file": "src/worldmass/regionalTerrainGrammar.ts",
      "sha256": "1004d4b3fcb8021eb24d21006e71d120198215e333355a50b7d728bc7172eb3b"
    },
    {
      "file": "src/worldmass/regionalTransitions.ts",
      "sha256": "6b332adb5c2abfa77a62fa0d5289a6980f25376ad7fce723bc65ac7c8de46333"
    },
    {
      "file": "src/worldmass/regionalWeave.ts",
      "sha256": "decb7fd67489992b96f60480f3439f16e3884e36dafd902c434a62ed4e731aa1"
    },
    {
      "file": "src/worldmass/regions.ts",
      "sha256": "d9d0d17ba192e765064011969174d447b878f29fbf02a8f918bcf2f6d1b96e46"
    },
    {
      "file": "src/worldmass/rewards.ts",
      "sha256": "44c48237f0f0f734572a6ac3ff52328e5e44182ccd41867f80c02a084376dfdf"
    },
    {
      "file": "src/worldmass/roadGuide.ts",
      "sha256": "79dfbc5541d66ec866b9295739dd7a7318e336a3819504f2bc43c69f2c38d295"
    },
    {
      "file": "src/worldmass/roadside.ts",
      "sha256": "dee68addde048fd5d118a6c7159baa64e34a8b7cb3df679be0661ef566a3342c"
    },
    {
      "file": "src/worldmass/runtime.ts",
      "sha256": "b164ee64918b7108785c50805e4e38b1b4333a3fe0dacf7b36f52085bb0e0d6e"
    },
    {
      "file": "src/worldmass/sanctuary.ts",
      "sha256": "007df8e3cda66564f90a18acb3d63f2e3ac9adc264e1b41512ef1aa4f43dd4ea"
    },
    {
      "file": "src/worldmass/settlement.ts",
      "sha256": "fdd088db438d750eb0848e8b2bd9cc5999f53292565318c7accb59b7dfff2a31"
    },
    {
      "file": "src/worldmass/settlementDefenses.ts",
      "sha256": "2a67647a77d7a9f2fcdc078165d8d832a9bf5c5e3e14ea6c7c666f21cdfd76b0"
    },
    {
      "file": "src/worldmass/settlementExits.ts",
      "sha256": "56247b5d6aed929ed29ac4e1e2f2538b0809e933ac36e3ebf7c4fe29e4dee022"
    },
    {
      "file": "src/worldmass/shrines.ts",
      "sha256": "ba596b7253eb43ac7513f320ce81a99c665c2df8e56b689daa996418846bcf5c"
    },
    {
      "file": "src/worldmass/sideareas.ts",
      "sha256": "fd2cfedcbaf7a27e7567e49b051b1082195187df63a0a9817bb0ce0ba1c98385"
    },
    {
      "file": "src/worldmass/sites.ts",
      "sha256": "630d47c5a64764960393929df8d6605dcb859bcc059798761672af2b2f756d93"
    },
    {
      "file": "src/worldmass/snow.ts",
      "sha256": "6b650db6d122d755ff0aa3a75c7b6b5bfb0ee99a9b6f5f1887d979fdf8d3fa55"
    },
    {
      "file": "src/worldmass/state.ts",
      "sha256": "0d647a2b9b7e1499f8ea5b689bae5ebf95b00d582f0977040b19258bad9bb71c"
    },
    {
      "file": "src/worldmass/storm.ts",
      "sha256": "e52baf5cedab0af276a56f575809daaefda428200439a047ea6530f1cd3201b4"
    },
    {
      "file": "src/worldmass/stream.ts",
      "sha256": "3558668eeaea5d68e86dfab75f09310f4e97944cb4d6e9ff023754fbd52d2f8e"
    },
    {
      "file": "src/worldmass/surfaceDetail.ts",
      "sha256": "f5538c71867c0ed443fc371c352b3b992b70fff05dfd132bcea8fca382a14012"
    },
    {
      "file": "src/worldmass/survey.ts",
      "sha256": "62eced879745c4b55d33ff7d88a4dfe92e7cf7bbff2ee849b124dda51d8a7cae"
    },
    {
      "file": "src/worldmass/terrainPatches.ts",
      "sha256": "edddba13ad15c8cf74b8d8588cbfd0e3d5abf87376d26f977f5c7e9c83e8bceb"
    },
    {
      "file": "src/worldmass/territory.ts",
      "sha256": "46f0ab1925bc31e379c2f64b5b364c5594f7d2a57be99ed96dfbd5d83203e272"
    },
    {
      "file": "src/worldmass/trailWear.ts",
      "sha256": "0866ba6b98e1b94995e9e9f61f601ac9f90135dbda33e442584aa9bde3e94a80"
    },
    {
      "file": "src/worldmass/walk.ts",
      "sha256": "2b36301cf112ba33bdd62abe54553cd77e1aa52fdf0886f8b9e8499bf2f46979"
    },
    {
      "file": "src/worldmass/weather.ts",
      "sha256": "b21cd5089fe25eafb460173e62deee989527dea46c5e717a27075708180ed095"
    },
    {
      "file": "src/worldmass/wildernessPaths.ts",
      "sha256": "502a6da69276edb649aca7be78a346608236ddc40d20095f33c6f4b957339ee5"
    },
    {
      "file": "src/worldmass/worldContexts.ts",
      "sha256": "9b1c08ae45135e4a168d937ce1d2a4973b9719ee6f33981fc5f3f6d43292f13b"
    },
    {
      "file": "tsconfig.json",
      "sha256": "e69f580c068169912931c07e9f6494c4f3248baf3b1d9f5262a7431213479028"
    },
    {
      "file": "tsconfig.launcher.json",
      "sha256": "f1743d63f71c1196f0417f9dc8c34590215ebf3306e37eb4b317124ca07e4aa7"
    },
    {
      "file": "tsconfig.shard.json",
      "sha256": "e6123634a5236cba8e1533d9d90a49e282e685a97182b07653116208e6444ffc"
    },
    {
      "file": "tsconfig.sim.json",
      "sha256": "d206660d82178b88f8bce8fb6d673414aab4bf54e22440ad15a9ce3f993d7410"
    },
    {
      "file": "vite.config.ts",
      "sha256": "f3bbdda1675707b378ee97201d729a66321f3b641ee77bff9908280959fd8ee1"
    },
    {
      "file": "vite.portraits.config.ts",
      "sha256": "b13f044872c7a5555ef1728dde2faf4b34e5761bdd0a02226048210dc3476d91"
    }
  ],
  "probes": [
    "probe_criticcrusadeterraincold.ts",
    "probe_criticcurrentcontinue175.ts",
    "probe_criticcurrentevent175.ts",
    "probe_criticcurrentspent175.ts",
    "probe_nativecrusadecurrentcallbacks.ts",
    "probe_nativecrusadecurrentcontinue.ts",
    "probe_nativecrusaderestorationcompletion.ts",
    "probe_nativecrusadeterrainboundaries.ts",
    "probe_nativecrusadeterraincallbacks.ts",
    "probe_nativecrusadeterraincold.ts",
    "probe_nativecrusadeterrainprovenance.ts",
    "probe_nativecrusadeterrainwitness.ts",
    "probe_nativecrusadeterrainsource.ts",
    "probe_criticcurrentdoor183.ts"
  ]
};
