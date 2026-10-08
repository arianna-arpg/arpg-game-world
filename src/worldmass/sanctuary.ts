import { SETTLEMENT_WATCH } from '../data/settlementDefenses';
import type { Actor } from '../engine/actor';
import type { MassSettlement } from './settlement';
import type { Vec2 } from '../core/math';

export const MASS_SANCTUARY_CFG = { exitClearance: 48, bodyClearance: 3, arrivalPad: 24, ownershipLimit: 16 };

/** Spatial combat policy for a native safe settlement embedded in a live world.
 * Native residents (including practice targets) retain their existing rules.
 * Wilderness combat cannot cross the refuge, including through owned minions. */
export class MassSanctuary {
  private returning = new WeakMap<Actor, Vec2>();
  constructor(private readonly town: MassSettlement) {}
  get enabled(): boolean { return this.town.spec.sanctuary ?? this.town.zone.objective.kind === 'safe'; }
  contains(pos: Vec2): boolean { return this.enabled && this.town.contains(pos.x,pos.y); }
  private root(a: Actor): Actor {
    // Native ownership is acyclic; keep a malformed mod's chain bounded.
    for(let i=0;i<MASS_SANCTUARY_CFG.ownershipLimit&&a.owner&&a.owner!==a;i++)a=a.owner;
    return a;
  }
  private settlementGuard(a: Actor): boolean {
    return !a.owner && this.town.isResident(a) && this.town.defenders.includes(a);
  }
  private protected(a: Actor): boolean { return this.contains(a.pos)||this.contains(this.root(a).pos); }
  private wild(a: Actor): boolean {
    const root=this.root(a);
    return root.team==='enemy'&&!this.town.isResident(root);
  }
  blocks(a: Actor,b: Actor,origin?: Vec2): boolean {
    if(!this.enabled||a===b||!this.wild(a)&&!this.wild(b))return false;
    // The watch can fight and be wounded in the refuge. Player-owned bodies
    // never inherit this exemption, even when they stand beside a guardsman.
    if (this.settlementGuard(a) && this.wild(b) || this.settlementGuard(b) && this.wild(a)) return false;
    return this.protected(a)||this.protected(b)||!!origin&&this.contains(origin)||this.returning.has(a)||this.returning.has(b);
  }
  /** Returning bodies keep their wounds and use native pathing. Neither a free
   * attack from town nor chasing an unresponsive returning body pays damage. */
  retreat(a: Actor,target?: Actor, visible: (guard: Actor) => boolean = () => true): Vec2|undefined {
    if(!this.enabled||a.dead||a.passive||a.construct||a.owner||!this.wild(a))return;
    // A real defender intercepts at the gate; ordinary native AI owns the fight.
    const defender = this.town.defenders.find(g => this.settlementGuard(g) && !g.dead && g.tier === a.tier
      && Math.hypot(g.pos.x-a.pos.x,g.pos.y-a.pos.y) <= SETTLEMENT_WATCH.engage
      && !!g.aiAnchor && Math.hypot(g.pos.x-g.aiAnchor.x,g.pos.y-g.aiAnchor.y) <= SETTLEMENT_WATCH.leash
      && visible(g));
    if (defender) { this.returning.delete(a); a.aiTargetId = defender.id; return; }
    let goal=this.returning.get(a),fresh=false;
    if(!goal&&(this.contains(a.pos)||target&&this.protected(target))){
      const home=a.aiAnchor;
      if(home&&!this.contains(home))goal={...home};
      else{
        const {w,h}=this.town.zone.size,gap=Math.max(MASS_SANCTUARY_CFG.exitClearance,a.radius*MASS_SANCTUARY_CFG.bodyClearance);
        const x=Math.max(0,Math.min(w,a.pos.x)),y=Math.max(0,Math.min(h,a.pos.y));
        // A fenced refuge evacuates through a real opening, never into a rail.
        const exits = this.town.defenseGates.length ? this.town.defenseGates.map(g => ({
          x: g.pos.x + g.normal.x * gap, y: g.pos.y + g.normal.y * gap,
        })) : [{x:-gap,y},{x:w+gap,y},{x,y:-gap},{x,y:h+gap}];
        goal=exits
          .sort((p,q)=>Math.hypot(p.x-a.pos.x,p.y-a.pos.y)-Math.hypot(q.x-a.pos.x,q.y-a.pos.y))[0];
      }
      this.returning.set(a,goal);fresh=true;
      if(!home||this.contains(home))a.aiAnchor={...goal};
    }
    if(goal&&!this.contains(a.pos)&&Math.hypot(goal.x-a.pos.x,goal.y-a.pos.y)<=a.radius+MASS_SANCTUARY_CFG.arrivalPad){
      this.returning.delete(a);return fresh?goal:undefined;
    }
    return goal;
  }
}
