/** Host-side order for simultaneous skill holds. A new held choice wins the
 * next opportunity; it never cancels, queues a released button or bypasses a
 * skill's native use gate. Slot order resolves edges received in one frame. */
export const SKILL_INPUT_CFG = { priority: 'recent-held' as 'recent-held' | 'slot' };

export class SkillInputOrder {
  private priorities = new WeakMap<object, readonly number[]>();
  slots(seat: object, count: number, held: readonly boolean[], edge: readonly boolean[],
    metaEdge?: readonly boolean[]): readonly number[] {
    const slots = Array.from({length:count},(_,i)=>i);
    if(SKILL_INPUT_CFG.priority==='slot'){
      this.priorities.delete(seat);return slots;
    }
    const fresh=slots.filter(i=>edge[i]||metaEdge?.[i]);
    const prior=(this.priorities.get(seat)??[]).filter(i=>i<count&&held[i]&&!fresh.includes(i));
    const ordered=[...fresh,...prior];
    this.priorities.set(seat,ordered.filter(i=>held[i]));
    return [...ordered,...slots.filter(i=>!ordered.includes(i))];
  }
}
