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
  private protected(a: Actor): boolean { return this.contains(a.pos)||this.contains(this.root(a).pos); }
  private wild(a: Actor): boolean {
    const root=this.root(a);
    return root.team==='enemy'&&!this.town.isResident(root);
  }
  blocks(a: Actor,b: Actor,origin?: Vec2): boolean {
    if(!this.enabled||a===b||!this.wild(a)&&!this.wild(b))return false;
    return this.protected(a)||this.protected(b)||!!origin&&this.contains(origin)||this.returning.has(a)||this.returning.has(b);
  }
  /** Returning bodies keep their wounds and use native pathing. Neither a free
   * attack from town nor chasing an unresponsive returning body pays damage. */
  retreat(a: Actor,target?: Actor): Vec2|undefined {
    if(!this.enabled||a.dead||a.passive||a.construct||a.owner||!this.wild(a))return;
    let goal=this.returning.get(a),fresh=false;
    if(!goal&&(this.contains(a.pos)||target&&this.protected(target))){
      const home=a.aiAnchor;
      if(home&&!this.contains(home))goal={...home};
      else{
        const {w,h}=this.town.zone.size,gap=Math.max(MASS_SANCTUARY_CFG.exitClearance,a.radius*MASS_SANCTUARY_CFG.bodyClearance);
        const x=Math.max(0,Math.min(w,a.pos.x)),y=Math.max(0,Math.min(h,a.pos.y));
        goal=[{x:-gap,y},{x:w+gap,y},{x,y:-gap},{x,y:h+gap}]
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
