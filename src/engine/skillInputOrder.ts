/** Host-side order for simultaneous held intentions. A fresh skill press or
 * walk wins the next opportunity; neither cancels a committed cast, queues a
 * released button, nor bypasses the native use/movement gates. */
export const SKILL_INPUT_CFG = {
  priority: 'recent-held' as 'recent-held' | 'slot',
  movement: 'recent-walk' as 'recent-walk' | 'ignore',
};

const WALK = -1;
export class SkillInputOrder {
  private priorities = new WeakMap<object, readonly number[]>();
  private walking = new WeakMap<object, boolean>();
  private observedHolds = new WeakMap<object, readonly boolean[]>();
  slots(seat: object, count: number, held: readonly boolean[], edge: readonly boolean[],
    metaEdge?: readonly boolean[], moving = false): readonly number[] {
    const slots = Array.from({length:count},(_,i)=>i);
    if(SKILL_INPUT_CFG.priority==='slot'){
      this.priorities.delete(seat);this.walking.delete(seat);this.observedHolds.delete(seat);return slots;
    }
    const walk=SKILL_INPUT_CFG.movement==='recent-walk'&&moving;
    const freshWalk=walk&&!this.walking.get(seat);
    this.walking.set(seat,walk);
    const previousHolds=this.observedHolds.get(seat);
    // Older scripted/remote intents may omit edge bits. A hold first observed
    // during walking is still a new choice, never an older repeat to suppress.
    const fresh=slots.filter(i=>edge[i]||metaEdge?.[i]||(walk&&held[i]&&!previousHolds?.[i]));
    this.observedHolds.set(seat,held.slice(0,count));
    const prior=(this.priorities.get(seat)??[]).filter(i=>i===WALK
      ?walk&&!freshWalk:i<count&&held[i]&&!fresh.includes(i));
    // Same-frame ties favor the explicit skill press. Direction corrections
    // during an existing walk never manufacture a new movement press.
    const ordered=[...fresh,...(freshWalk?[WALK]:[]),...prior];
    this.priorities.set(seat,ordered.filter(i=>i===WALK?walk:held[i]));
    const attempts=[...ordered,...slots.filter(i=>!ordered.includes(i))];
    const stop=attempts.indexOf(WALK);
    return stop<0?attempts:attempts.slice(0,stop);
  }
}
