import type { Actor, Team } from './actor';
import type { Doodad, GeneratedLayout } from './levelgen';
import type { MonsterRarity, RARITY_DEFS } from './rarity';
import type { ZoneDef, PackTableEntry } from '../data/zones';
import type { MONSTERS, FIXTURE_IDS, FACTIONS } from '../data/monsters';
import type { vec, rand, randInt, Vec2 } from '../core/math';
import type { withSeededRandom } from '../core/rng';
import type { rollFolk } from '../data/innfolk';
import type { makeSpeakerRow, SpeechSpeakerRow } from './speechGrammar';
import type { NpcDialogueDirector } from './npcDialogues';

/** Original native load-stage providers. Reads stay lazy; no catalogue filtering. */
export interface NativeInhabitantSources {
 readonly MONSTERS:typeof MONSTERS; readonly FIXTURE_IDS:typeof FIXTURE_IDS; readonly FACTIONS:typeof FACTIONS;
 readonly RARITY_DEFS:typeof RARITY_DEFS; readonly DAY_LENGTH:number;
 readonly vec:typeof vec; readonly rand:typeof rand; readonly randInt:typeof randInt;
 readonly hashStr:(s:string)=>number; readonly withSeededRandom:typeof withSeededRandom;
 readonly rollFolk:typeof rollFolk; readonly makeSpeakerRow:typeof makeSpeakerRow; readonly random:()=>number;
}
/** Each stage needs the actual locally owned geometry, bodies and dialogue state.
 * Door/annex/memory replay must occur at the original boundary before these calls.
 * Field inhabitants occur much later, after the objective and scenery owners. */
export interface NativeInhabitantHost {
 readonly actors:Actor[]; readonly doodads:readonly Doodad[];
 readonly account:{readonly ledger:Record<string,number>}; readonly ledger:Record<string,number>;
 readonly massSettlementDay:number|null; readonly time:number;
 readonly speakerRows:Map<number,SpeechSpeakerRow>;
 readonly speechMemory:{clear():void}; readonly speechFocus:{clear():void};
 speechFocusSpeaker:number|undefined; dialogueScene:number;
 readonly npcDialogues:Pick<NpcDialogueDirector,'leaveZone'>;
 createMonster(id:string,level:number,team:Team):Actor;
 clampPos(pos:Vec2,radius:number):Vec2;
 findFreeSpot(pos:Vec2,radius:number,tier?:number):Vec2;
 nextSquadId():number; weightedPick(table:readonly PackTableEntry[],level?:number):string;
 armAmbush(actor:Actor,spec:NonNullable<Actor['ambushSpec']>):void;
 promoteMonster(actor:Actor,rarity:MonsterRarity):void;
}

export function spawnNativeDoorGuards(host: NativeInhabitantHost, sources: NativeInhabitantSources, def: ZoneDef, _layout: GeneratedLayout) {
    // BREAKABLE door-actors: every still-closed breakable door gets a passive
    // guard-actor at the exact door pos (RAW — no clampPos snap off the sealed
    // cells; it is anchored + passive, nothing ever re-legalizes it). Spawned
    // HERE, outside the memory tagging window, so memory never captures one —
    // door persistence is owned solely by doorState.
    for (const d of host.doodads) {
      const dr = d.door;
      if (!dr || dr.open || dr.broken) continue;
      if (dr.mode !== 'breakable' && dr.mode !== 'both') continue;
      const c = host.createMonster(sources.FIXTURE_IDS.door_timber, Math.max(1, def.level), 'enemy');
      c.pos = (0, sources.vec)(d.pos.x, d.pos.y);
      c.doorId = dr.id;
      if (dr.life) c.life = Math.min(dr.life, c.maxLife()); // per-door data may weaken a rotten door
      host.actors.push(c);
    }


}

export function spawnNativeFurniture(host: NativeInhabitantHost, sources: NativeInhabitantSources, def: ZoneDef, layout: GeneratedLayout) {
    // The blueprint's furniture: destructible clutter and friendly folk.
    for (const b of layout.breakables) {
      const c = host.createMonster(b.id, Math.max(1, def.level), 'enemy');
      c.fromZoneGen = true; // furniture is part of the persistent population
      c.pos = host.clampPos((0, sources.vec)(b.pos.x, b.pos.y), c.radius);
      host.actors.push(c);
    }

}

export function spawnNativeResidents(host: NativeInhabitantHost, sources: NativeInhabitantSources, def: ZoneDef, layout: GeneratedLayout) {
    // The spoken seats re-learn per zone (a plan npc's line, a family's line
    // — both keyed by the body minted below).
    host.speakerRows.clear(); // THE SPEECH GRAMMAR's rows go with them (the deck re-deals at the next telling)
    host.speechMemory.clear(); // THE TRANSIENT TELLING: the clocks go with the lines (speechTell keeps no memory across a load)
    host.speechFocus.clear();
    host.speechFocusSpeaker = undefined;
    host.dialogueScene++;
    host.npcDialogues.leaveZone();
    let npcSeat = 0; // THE SPEECH GRAMMAR's seat index — a stable speaker key per plan seat
    for (const n of layout.npcs) {
      const arrival = sources.MONSTERS[n.id]?.npcRequiresLedger;
      if (arrival && !host.account.ledger[arrival] && !host.ledger[arrival]) continue;
      // Mireille the Innkeep is ALWAYS present (she talks if her heal is locked).
      const c = host.createMonster(n.id, 1, 'player');
      // THE STOREY (engine/storeys.ts): a body seated on a structure's floor
      // above wears that story from its first tick — clamped on the story's
      // own view so it never spawns inside a hanging wall.
      c.tier = n.tier ?? 0;
      c.pos = c.tier >= 1 ? host.findFreeSpot((0, sources.vec)(n.pos.x, n.pos.y), c.radius, c.tier)
        : host.clampPos((0, sources.vec)(n.pos.x, n.pos.y), c.radius);
      host.actors.push(c);
      // THE SPOKEN SEAT: a plan's npc row may carry a line — it rides the
      // residents' bubble lane (residentPrompt reads npcRole 'resident') on
      // the 'seat' lane of THE TRANSIENT TELLING (engine/speech.ts).
      // THE SPEECH GRAMMAR (engine/speechGrammar.ts) speaks through the same
      // row: the seat's structure is its COMPANY, MonsterDef.speechRoles its
      // pools, the authored line its FIRST WORD (a def-named body is not
      // NAMED — it never fills '{other}').
      const speechRoles = sources.MONSTERS[n.id]?.speechRoles ?? [];
      if (n.line || speechRoles.length) {
        host.speakerRows.set(c.id, (0, sources.makeSpeakerRow)(c.id, n.line ?? '', 'seat', {
          key: `${n.sid ?? def.id}:seat${npcSeat}:${n.id}`, company: n.sid ?? `zone:${def.id}`, name: null,
          roles: speechRoles, own: n.line ? [n.line] : [],
        }));
      }
      npcSeat++;
    }
    // THE FOLK SEATS (data/innfolk.ts): every seat a plan declared rolls its
    // guest on a seed of (zone, seat, DAY) — the same company through one
    // day, new faces at dawn; a seat's chance may leave it empty. The guest
    // wears a rolled name, colour and line and its row's haunt.
    const seated = new Set<string>(); // THE COMPANY LAW: no two seats deal the same guest in one house
    for (const fk of layout.folk ?? []) {
      const day = host.massSettlementDay ?? Math.floor(host.time / sources.DAY_LENGTH);
      let roll: ReturnType<typeof rollFolk> = null;
      for (let salt = 0; salt < 4; salt++) {
        // THE COMPANY IS THE DAY'S, NOT THE RUN'S: seeded off the ZONE's own seed
        // (the manifest's would deal a different head-count per world, and every
        // actor id after the town's bodies with it — the hermetic-world law).
        const seed = (((def.seed ?? 0) * 0x9e3779b1) ^ (0, sources.hashStr)(`folk:${def.id}:${fk.key}:${day}:${salt}`)) >>> 0;
        roll = (0, sources.withSeededRandom)(seed, () => (sources.random.call(Math) < (fk.chance ?? 1) ? (0, sources.rollFolk)(fk.pool, sources.random) : null));
        if (!roll || !seated.has(roll.name)) break; // an empty seat stays empty; a repeated face re-deals
      }
      if (!roll) continue;
      seated.add(roll.name);
      const c = host.createMonster(roll.defId, 1, 'player');
      c.name = roll.name;
      c.color = roll.color;
      c.tier = fk.tier ?? 0;
      c.pos = c.tier >= 1 ? host.findFreeSpot((0, sources.vec)(fk.pos.x, fk.pos.y), c.radius, c.tier)
        : host.clampPos((0, sources.vec)(fk.pos.x, fk.pos.y), c.radius);
      host.actors.push(c);
      // THE TRANSIENT TELLING's 'folk' lane (speechTell) + THE SPEECH GRAMMAR's
      // speaker row: the rolled line is its FIRST WORD, the row's other lines
      // follow, its roles are the row's (FolkRow.roles), its company the house
      // that seated it, its rolled name the one '{other}' may speak.
      host.speakerRows.set(c.id, (0, sources.makeSpeakerRow)(c.id, roll.line, 'folk', {
        key: fk.key, company: fk.sid ?? fk.key.replace(/:folk\d+$/, ''), name: roll.name,
        roles: roll.row.roles ?? [], own: [roll.line, ...roll.row.lines.filter(l => l !== roll.line)].filter(l => !!l),
      }));
    }

}

export function spawnNativeFieldInhabitants(host: NativeInhabitantHost, sources: NativeInhabitantSources, def: ZoneDef, layout: GeneratedLayout) {
    // Walled camps post their guards — each watch is a squad.
    if (def.packs) {
      for (const c of layout.camps) {
        const type = host.weightedPick(def.packs.table, def.level);
        const n = (0, sources.randInt)(3, 5);
        const squadId = host.nextSquadId();
        for (let k = 0; k < n; k++) {
          const m = host.createMonster(type, def.level, 'enemy');
          m.squadId = squadId;
          m.squadLeader = k === 0;
          m.pos = host.clampPos((0, sources.vec)(c.x + (0, sources.rand)(-70, 70), c.y + (0, sources.rand)(-70, 70)), m.radius);
          host.actors.push(m);
        }
      }
    }
    // Faction POIs (war camps, halls, fortresses, townships) come pre-inhabited
    // by their garrison faction — drawn from that faction's own roster, with the
    // faction forced on each so the census/contest sim counts them correctly.
    for (const grn of layout.garrisons) {
      const roster = sources.FACTIONS[grn.faction];
      if (!roster) continue;
      const type = host.weightedPick(roster.table, def.level);
      const n = (0, sources.randInt)(grn.size[0], grn.size[1]);
      const squadId = host.nextSquadId();
      for (let k = 0; k < n; k++) {
        const m = host.createMonster(type, Math.max(1, def.level), 'enemy');
        m.faction = grn.faction;
        m.squadId = squadId;
        m.squadLeader = k === 0;
        m.pos = host.clampPos((0, sources.vec)(grn.pos.x + (0, sources.rand)(-70, 70), grn.pos.y + (0, sources.rand)(-70, 70)), m.radius);
        host.actors.push(m);
      }
    }
    // LANDMARK dwellers (pit spawns): positions + ids resolved AT GEN
    // (deterministic per seed) — spawned raw at their sampled cells (a pocket
    // dweller must stay ON its jump-only island; clampPos would snap it off).
    for (const ls of layout.landmarkSpawns ?? []) {
      if (!sources.MONSTERS[ls.id]) continue;
      const m = host.createMonster(ls.id, Math.max(1, def.level), 'enemy');
      m.pos = (0, sources.vec)(ls.pos.x, ls.pos.y);
      // THE ALOFT COURT (the wildlife wTier precedent): a spawn row placed on
      // an upper story wears that story, or the mover contract snaps it off
      // the rim at the first step.
      if (ls.tier) m.tier = ls.tier;
      // Spawner-row ambush (LandmarkSpawns.ambush): arm the INSTANCE — the
      // same kind roams free elsewhere; these wait (the penned herd).
      if (ls.ambush) {
        m.ambushSpec = ls.ambush;
        host.armAmbush(m, ls.ambush);
      }
      // THE SEAT'S TEMPERS (SpawnSeat — the authored-map fabric): a DUTY POST
      // at the seat (the theater's posted-folk idiom) and a RARITY promotion
      // through the real elite ladder. Classic rows carry neither.
      if (ls.post) {
        m.aiPost = (0, sources.vec)(ls.pos.x, ls.pos.y);
        m.postSpec = ls.post === true ? {} : ls.post;
        if (ls.facing !== undefined) m.aiPostFacing = ls.facing;
      }
      host.actors.push(m);
      // SpawnSeat.rarity — the seat's promotion through the real elite ladder (authored maps).
      if (ls.rarity && ls.rarity !== 'normal' && ls.rarity in sources.RARITY_DEFS) host.promoteMonster(m, ls.rarity as MonsterRarity);
    }

}