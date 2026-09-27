/** Serializable intent, not executable content or a direct save mutation. */
export interface DialogueAction {
  type: string;
  target: string;
}

export interface DialogueActionHandler<C> {
  /** Pure, live admission. Null means available; a reason keeps the choice visible. */
  refusal(context: C, action: DialogueAction): string | null;
  /** Synchronous dispatch through the owning system's validated command path.
   * False means no action was accepted; do not advance the conversation. */
  run(context: C, action: DialogueAction): boolean;
}

/** New service, quest or roleplay actions register here, never in reader branches.
 * Execution rechecks admission; preview alone grants no authority. */
export class DialogueActions<C> {
  private handlers = new Map<string, DialogueActionHandler<C>>();

  register(type: string, handler: DialogueActionHandler<C>): void {
    if (!type.trim() || this.handlers.has(type)) throw new Error(`Duplicate or empty dialogue action '${type}'`);
    this.handlers.set(type, handler);
  }

  refusal(context: C, action: DialogueAction): string | null {
    const handler = this.handlers.get(action.type);
    return handler ? handler.refusal(context, action) : 'This response is unavailable.';
  }

  run(context: C, action: DialogueAction): boolean {
    const handler = this.handlers.get(action.type);
    return !!handler && this.refusal(context, action) === null && handler.run(context, action);
  }
}
