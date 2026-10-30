export interface NativeHoldfastSourceRow {file:string;predecessor:string;beforeHash:string;afterHash:string;beforeRawSha256:string;afterRawSha256:string;crlfLines:readonly number[];hunks:readonly {before:string;after:string}[]}
export interface NativeHoldfastSourcePin {file:string;normalSha256:string;rawSha256:string;checkoutRawSha256?:string}
export const nativeHoldfastSourceArchive:{parent:string;rows:readonly NativeHoldfastSourceRow[];archives:readonly NativeHoldfastSourcePin[];dependencies:readonly NativeHoldfastSourcePin[];unchanged:readonly NativeHoldfastSourcePin[];current:readonly NativeHoldfastSourcePin[]} = {
  "parent": "41fc4f42ef81929a9fac69f07bf401842be8cb58",
  "rows": [
    {
      "file": "src/world/gridWalk.ts",
      "predecessor": "41fc4f42ef81929a9fac69f07bf401842be8cb58",
      "beforeHash": "32a12d0e74078641b827cff8c93fbd60c1a89609d507c0919423639b2e3e5c16",
      "afterHash": "cf133066cc70381485557aefb70364d7dfbb80e51f9005fa21eb9c89346eedbe",
      "beforeRawSha256": "32a12d0e74078641b827cff8c93fbd60c1a89609d507c0919423639b2e3e5c16",
      "afterRawSha256": "cf133066cc70381485557aefb70364d7dfbb80e51f9005fa21eb9c89346eedbe",
      "crlfLines": [],
      "hunks": [
        {
          "before": " *  the packed bytes identically regardless of its own registration order. */\nexport interface PackedWalk { cols: number; rows: number; cell: number; kinds: string[]; kbits: string; }\n\nlet nativePaints:Map<GridWalkField,Set<number>>|undefined;\nexport function beginNativeGridPaintReceipt(){const prior=nativePaints,rows=new Map<GridWalkField,Set<number>>();nativePaints=rows;let done=false;return Object.freeze({finish(){if(!done){if(nativePaints!==rows)throw Error('Native grid receipt nesting changed');nativePaints=prior;done=true;}return rows;}});}\nexport function inheritNativeGridPaintReceipt(from:GridWalkField,to:GridWalkField):void {if(!nativePaints)return;const next=new Set<number>();for(const i of nativePaints.get(from)??[]){const y=Math.floor(i/from.cols),x=i%from.cols;if(x<to.cols&&y<to.rows)next.add(y*to.cols+x);}nativePaints.set(to,next);}\nfunction recordNativePaint(g:GridWalkField,a:number,b:number,c:number,d:number,circle?:{x:number;y:number;r2:number}){if(!nativePaints)return;let rows=nativePaints.get(g);if(!rows){rows=new Set();nativePaints.set(g,rows);}for(let y=c;y<=d;y++)for(let x=a;x<=b;x++){if(circle&&Math.pow((x+.5)*g.cell-circle.x,2)+Math.pow((y+.5)*g.cell-circle.y,2)>circle.r2)continue;rows.add(y*g.cols+x);}}\n/** Temporary open-door topology restores the same cells; it creates no terrain owner. */\nexport function withoutNativeGridPaintReceipt<T>(run:()=>T):T {const prior=nativePaints;nativePaints=undefined;try{return run();}finally{nativePaints=prior;}}\nexport class GridWalkField implements WalkField {\n  readonly cellOcclusion = true; // shared finite-grid / worldmass ray contract\n  readonly cols: number;\n  readonly rows: number;\n  readonly cell: number;\n  /** 1 = walkable, 0 = blocked. A DERIVED CACHE of regionKind(kindOf(i)).walkable,\n   *  so isWalkable/reachable/pathStep/BFS stay fast + unchanged. */\n  readonly mask: Uint8Array;\n  /** Per-cell region-kind BYTE (Phase 3). 0 = the default 'wall'. Indexes kindList. */\n  readonly kind: Uint8Array;\n  /** byte → region-kind id. Byte 0 is always 'wall' (the unpainted default), so an\n   *  all-zero kind array = an all-blocked grid (byte-identical to Phase 2). */\n  private kindList: string[] = ['wall'];\n  /** Bumped on every region repaint (door breaks, terraforms) — cache-keying\n   *  seam for anything that bakes the grid (the renderer's ground chunks). */\n  version = 0;\n",
          "after": " *  the packed bytes identically regardless of its own registration order. */\nexport interface PackedWalk { cols: number; rows: number; cell: number; kinds: string[]; kbits: string; }\n\n/** An opaque generation-only claim on the negative ground a recipe just painted.\n * Public array borrowing revokes it permanently; native paints consume touched\n * cells even when a paint writes the same kind. No public version is authority. */\nexport interface NativeGridGroundView {\n  readonly token: object;\n  readonly packed: PackedWalk;\n  readonly mask: readonly number[];\n  readonly owned: readonly number[];\n}\nexport interface NativeGridGroundClaim {\n  snapshot(): NativeGridGroundView | undefined;\n  current(view: NativeGridGroundView): boolean;\n  paintGround(view: NativeGridGroundView, cells: readonly number[], stillAdmitted: () => boolean): boolean;\n  close(): void;\n}\nexport interface NativeGridRecipePainter {\n  paintRect(x0: number, y0: number, x1: number, y1: number): void;\n  finish(): NativeGridGroundClaim;\n}\ninterface NativeGridGroundState {\n  active: boolean;\n  epoch: number;\n  readonly cols: number;\n  readonly rows: number;\n  readonly cell: number;\n  byte: number;\n  readonly region: string;\n  painting: boolean;\n  readonly owned: Uint8Array;\n  readonly views: WeakMap<object, number>;\n}\n\nlet nativePaints:Map<GridWalkField,Set<number>>|undefined;\nexport function beginNativeGridPaintReceipt(){const prior=nativePaints,rows=new Map<GridWalkField,Set<number>>();nativePaints=rows;let done=false;return Object.freeze({finish(){if(!done){if(nativePaints!==rows)throw Error('Native grid receipt nesting changed');nativePaints=prior;done=true;}return rows;}});}\nexport function inheritNativeGridPaintReceipt(from:GridWalkField,to:GridWalkField):void {if(!nativePaints)return;const next=new Set<number>();for(const i of nativePaints.get(from)??[]){const y=Math.floor(i/from.cols),x=i%from.cols;if(x<to.cols&&y<to.rows)next.add(y*to.cols+x);}nativePaints.set(to,next);}\nfunction recordNativePaint(g:GridWalkField,a:number,b:number,c:number,d:number,circle?:{x:number;y:number;r2:number}){if(!nativePaints)return;let rows=nativePaints.get(g);if(!rows){rows=new Set();nativePaints.set(g,rows);}for(let y=c;y<=d;y++)for(let x=a;x<=b;x++){if(circle&&Math.pow((x+.5)*g.cell-circle.x,2)+Math.pow((y+.5)*g.cell-circle.y,2)>circle.r2)continue;rows.add(y*g.cols+x);}}\n/** Temporary open-door topology restores the same cells; it creates no terrain owner. */\nexport function withoutNativeGridPaintReceipt<T>(run:()=>T):T {const prior=nativePaints;nativePaints=undefined;try{return run();}finally{nativePaints=prior;}}\nconst nativeInteriorGroundToken = Symbol('native interior initial ground');\nconst nativeGridImportToken = Symbol('native grid import');\nconst nativeInteriorGroundClaims = new WeakMap<GridWalkField, NativeGridGroundClaim>();\n\n/** The only initial-ground allocator. The private constructor token attests\n * actual zero initialization before the grid can escape. It cannot claim an\n * existing grid or infer ownership from equal wall bytes/public version. */\nexport function createNativeInteriorGrid(w: number, h: number, cell = DEFAULT_CELL): {\n  grid: GridWalkField; claim?: NativeGridGroundClaim;\n} {\n  const grid = new GridWalkField(w, h, cell, nativeInteriorGroundToken);\n  const claim = nativeInteriorGroundClaims.get(grid);\n  nativeInteriorGroundClaims.delete(grid);\n  return { grid, claim };\n}\n\nexport class GridWalkField implements WalkField {\n  readonly cellOcclusion = true; // shared finite-grid / worldmass ray contract\n  #mask: Uint8Array;\n  #kind: Uint8Array;\n  #arraysBorrowed = false;\n  #groundImport = false;\n  #recipeProducer: NativeGridGroundState | undefined;\n  readonly #groundClaims = new Set<NativeGridGroundState>();\n  readonly #maskBorrow = (): Uint8Array => this.#borrowArray(this.#mask);\n  readonly #kindBorrow = (): Uint8Array => this.#borrowArray(this.#kind);\n  readonly #kindListBorrow = (): string[] => this.#borrowArray(this.#kindList);\n\n  #borrowArray<T extends Uint8Array | string[]>(value: T): T {\n    this.#arraysBorrowed = true;\n    for (const claim of this.#groundClaims) claim.active = false;\n    this.#groundClaims.clear();\n    return value;\n  }\n\n  #invalidateGround(a: number, b: number, c: number, d: number,\n    circle?: { x: number; y: number; r2: number }): void {\n    for (const claim of this.#groundClaims) {\n      claim.epoch++;\n      for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) {\n        if (circle && ((x + .5) * this.cell - circle.x) ** 2\n          + ((y + .5) * this.cell - circle.y) ** 2 > circle.r2) continue;\n        claim.owned[y * this.cols + x] = 0;\n      }\n    }\n  }\n\n  #groundCurrent(claim: NativeGridGroundState): boolean {\n    return claim.active && !this.#arraysBorrowed && !this.#groundImport\n      && Object.getOwnPropertyDescriptor(this, 'cols')?.value === claim.cols\n      && Object.getOwnPropertyDescriptor(this, 'rows')?.value === claim.rows\n      && Object.getOwnPropertyDescriptor(this, 'cell')?.value === claim.cell\n      && Object.getOwnPropertyDescriptor(this, 'mask')?.get === this.#maskBorrow\n      && Object.getOwnPropertyDescriptor(this, 'kind')?.get === this.#kindBorrow\n      && Object.getOwnPropertyDescriptor(this, 'kindList')?.get === this.#kindListBorrow;\n  }\n\n  /** The producer owns only cells its own completed paints actually wrote.\n   * Merely finding an equal region never creates ownership. */\n  beginNativeRecipeGround(region: string): NativeGridRecipePainter | undefined {\n    return this.#beginNativeRecipeGround(region, false);\n  }\n\n  #beginNativeRecipeGround(region: string, initialized: boolean): NativeGridRecipePainter | undefined {\n    if (this.#arraysBorrowed || this.#groundImport || this.#kind.length > 65536 || (region !== 'wall' && region !== 'briarwall')) return undefined;\n    const claim: NativeGridGroundState = {\n      active: true, painting: true, epoch: 0,\n      cols: this.cols, rows: this.rows, cell: this.cell,\n      region, byte: initialized ? 0 : -1, owned: new Uint8Array(this.#kind.length), views: new WeakMap(),\n    };\n    // Only the private constructor branch requests this, immediately after its\n    // actual fresh wall-buffer allocations. Every later paint consumes cells.\n    if (initialized) claim.owned.fill(1);\n    this.#groundClaims.add(claim);\n    const current = (view: NativeGridGroundView): boolean => this.#groundCurrent(claim)\n      && claim.views.get(view) === claim.epoch;\n    const close = (): void => { claim.active = false; this.#groundClaims.delete(claim); };\n    const handle: NativeGridGroundClaim = Object.freeze({\n      snapshot: (): NativeGridGroundView | undefined => {\n        if (claim.painting || !this.#groundCurrent(claim)) { close(); return undefined; }\n        let s = '';\n        for (const b of this.#kind) s += String.fromCharCode(b);\n        const token = Object.freeze({});\n        const view: NativeGridGroundView = Object.freeze({ token, packed: {\n          cols: this.cols, rows: this.rows, cell: this.cell,\n          kinds: this.#kindList.slice(), kbits: btoa(s),\n        }, mask: Array.from(this.#mask), owned: Array.from(claim.owned.keys()).filter(i => claim.owned[i] === 1) });\n        claim.views.set(view, claim.epoch);\n        return view;\n      },\n      current,\n      paintGround: (view: NativeGridGroundView, cells: readonly number[], stillAdmitted: () => boolean): boolean => {\n        const selected = [...new Set(cells)].sort((a, b) => a - b);\n        const ground = this.#kindList.indexOf('ground');\n        const walkable = regionKind('ground')?.walkable;\n        if (ground < 0 || walkable !== true || !current(view) || !stillAdmitted()\n          || selected.some(i => !Number.isSafeInteger(i) || i < 0 || i >= claim.owned.length\n            || claim.owned[i] !== 1 || this.#kind[i] !== claim.byte || this.#mask[i] !== 0)) return false;\n        claim.views.delete(view);\n        // Selected native policy reads have ended. Each run consumes private\n        // authority before painting; no external callback can renew that right.\n        for (let k = 0; k < selected.length;) {\n          if (!this.#groundCurrent(claim)) throw Error('Native recipe ground ownership changed during paint');\n          const start = selected[k], y = Math.floor(start / this.cols);\n          let end = start;\n          while (++k < selected.length && selected[k] === end + 1\n            && Math.floor(selected[k] / this.cols) === y) end++;\n          const a = start % this.cols, b = end % this.cols;\n          this.#invalidateGround(a, b, y, y);\n          if (nativePaints) recordNativePaint(this, a, b, y, y);\n          for (let i = start; i <= end; i++) { this.#kind[i] = ground; this.#mask[i] = 1; }\n          const epoch = claim.epoch;\n          this.pushDirty(a * this.cell, y * this.cell,\n            (b + 1) * this.cell - .01, (y + 1) * this.cell - .01);\n          if (!this.#groundCurrent(claim) || claim.epoch !== epoch || !stillAdmitted())\n            throw Error('Native recipe ground ownership changed during paint');\n        }\n        return true;\n      },\n      close,\n    });\n    return Object.freeze({\n      paintRect: (x0: number, y0: number, x1: number, y1: number): void => {\n        if (!claim.painting) throw Error('Native recipe negative paint is sealed');\n        // Ordinary paint semantics continue even if a selected callback has\n        // revoked the claim. Revocation removes recovery rights, not effects.\n        // A replaced selected method still runs, with no recipe authority.\n        // The one-shot tag is consumed at the native method's entry, before\n        // its first policy read: a callback's nested paint is never ours.\n        const ownMethod = Object.getOwnPropertyDescriptor(this, 'fillRegion');\n        const nativeMethod = Object.getOwnPropertyDescriptor(GridWalkField.prototype, 'fillRegion');\n        if (ownMethod || Object.getPrototypeOf(this) !== GridWalkField.prototype\n          || nativeMethod?.value !== nativeRecipeFillRegion) close();\n        else this.#recipeProducer = claim;\n        try { this.fillRegion(x0, y0, x1, y1, region); }\n        finally { this.#recipeProducer = undefined; }\n      },\n      finish: (): NativeGridGroundClaim => { claim.painting = false; return handle; },\n    });\n  }\n\n  readonly cols: number;\n  readonly rows: number;\n  readonly cell: number;\n  /** 1 = walkable, 0 = blocked. A DERIVED CACHE of regionKind(kindOf(i)).walkable,\n   *  so isWalkable/reachable/pathStep/BFS stay fast + unchanged. */\n  readonly mask!: Uint8Array;\n  /** Per-cell region-kind BYTE (Phase 3). 0 = the default 'wall'. Indexes kindList. */\n  readonly kind!: Uint8Array;\n  /** byte → region-kind id. Byte 0 is always 'wall' (the unpainted default), so an\n   *  all-zero kind array = an all-blocked grid (byte-identical to Phase 2). */\n  readonly kindList!: string[]; // Emitted undefined slot; the constructor redefines it in place.\n  #kindList: string[] = ['wall'];\n  /** Bumped on every region repaint (door breaks, terraforms) — cache-keying\n   *  seam for anything that bakes the grid (the renderer's ground chunks). */\n  version = 0;\n"
        },
        {
          "before": "    this.refreshesLeft = WALK_CFG.distRefreshPerTick;\n  }\n\n  constructor(w: number, h: number, cell = DEFAULT_CELL) {\n    this.cell = cell;\n    this.cols = Math.max(1, Math.ceil(w / cell));\n    this.rows = Math.max(1, Math.ceil(h / cell));\n    this.mask = new Uint8Array(this.cols * this.rows);\n    this.kind = new Uint8Array(this.cols * this.rows); // all 0 = 'wall'\n  }\n\n  /** Sweep granularity for swept collision (the WalkField contract). */\n",
          "after": "    this.refreshesLeft = WALK_CFG.distRefreshPerTick;\n  }\n\n  constructor(w: number, h: number, cell = DEFAULT_CELL, initialGround?: symbol) {\n    this.#groundImport = initialGround === nativeGridImportToken;\n    this.cell = cell;\n    this.cols = Math.max(1, Math.ceil(w / cell));\n    this.rows = Math.max(1, Math.ceil(h / cell));\n    this.#mask = new Uint8Array(this.cols * this.rows);\n    this.#kind = new Uint8Array(this.cols * this.rows); // all 0 = 'wall'\n    try {\n      // Mint before even the descriptor installer can observe this instance.\n      // Ordinary construction performs no extra fill, dirty/version operation,\n      // policy read or selected method dispatch.\n      if (initialGround === nativeInteriorGroundToken) {\n        const claim = this.#beginNativeRecipeGround('wall', true)?.finish();\n        if (claim) nativeInteriorGroundClaims.set(this, claim);\n      }\n      Object.defineProperties(this, {\n        mask: { enumerable: true, configurable: true, get: this.#maskBorrow },\n        kind: { enumerable: true, configurable: true, get: this.#kindBorrow },\n        kindList: { enumerable: true, configurable: true, get: this.#kindListBorrow },\n      });\n    } catch (error) {\n      // A descriptor callback may observe this grid then fail. Retire all\n      // private rights, retain its partial effects, and rethrow that same error.\n      for (const claim of this.#groundClaims) claim.active = false;\n      this.#groundClaims.clear();\n      nativeInteriorGroundClaims.delete(this);\n      this.#groundImport = false;\n      throw error;\n    }\n  }\n\n  /** Sweep granularity for swept collision (the WalkField contract). */\n"
        },
        {
          "before": "\n  /** byte for a region id (find-or-add to the per-grid table). */\n  private kindByte(id: string): number {\n    let b = this.kindList.indexOf(id);\n    if (b < 0) { b = this.kindList.length; this.kindList.push(id); }\n    return b;\n  }\n\n",
          "after": "\n  /** byte for a region id (find-or-add to the per-grid table). */\n  private kindByte(id: string): number {\n    let b = this.#kindList.indexOf(id);\n    if (b < 0) { b = this.#kindList.length; this.#kindList.push(id); }\n    return b;\n  }\n\n"
        },
        {
          "before": "   *  field, so hazard-free grids and heedless minds never pay for weighting. */\n  private profileEntry(p: PathProfile): { idx: number; t: Uint8Array; uniform: boolean } {\n    let e = this.profTables.get(p.key);\n    if (!e || e.n !== this.kindList.length) {\n      const n = this.kindList.length;\n      const t = new Uint8Array(n);\n      let uniform = true;\n      for (let b = 0; b < n; b++) {\n        const id = this.kindList[b];\n        let w = PATH_SCALE;\n        if (regionKind(id)?.walkable) {\n          const c = Math.min(PATH_CFG.maxCost, Math.max(PATH_CFG.minCost, p.costOf(id)));\n",
          "after": "   *  field, so hazard-free grids and heedless minds never pay for weighting. */\n  private profileEntry(p: PathProfile): { idx: number; t: Uint8Array; uniform: boolean } {\n    let e = this.profTables.get(p.key);\n    if (!e || e.n !== this.#kindList.length) {\n      const n = this.#kindList.length;\n      const t = new Uint8Array(n);\n      let uniform = true;\n      for (let b = 0; b < n; b++) {\n        const id = this.#kindList[b];\n        let w = PATH_SCALE;\n        if (regionKind(id)?.walkable) {\n          const c = Math.min(PATH_CFG.maxCost, Math.max(PATH_CFG.minCost, p.costOf(id)));\n"
        },
        {
          "before": "   *  chunks never stale and the dirty ring never floods under a drift of a\n   *  dozen moving carriers. Never pass it for a repaint a bake can see. */\n  fillRegion(x0: number, y0: number, x1: number, y1: number, id: string, quiet = false): void {\n    const byte = this.kindByte(id);\n    const walkable = regionKind(id)?.walkable ? 1 : 0;\n    const a = this.cx(Math.min(x0, x1)), b = this.cx(Math.max(x0, x1));\n    const c = this.cy(Math.min(y0, y1)), d = this.cy(Math.max(y0, y1));\n    if(nativePaints)recordNativePaint(this,a,b,c,d);\n    for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) {\n      const i = cy * this.cols + cx;\n      this.kind[i] = byte; this.mask[i] = walkable;\n    }\n    if (quiet) { this.version++; return; }\n    // No eager cache clears: pushDirty's version bump lazily stales the\n",
          "after": "   *  chunks never stale and the dirty ring never floods under a drift of a\n   *  dozen moving carriers. Never pass it for a repaint a bake can see. */\n  fillRegion(x0: number, y0: number, x1: number, y1: number, id: string, quiet = false): void {\n    const producer = this.#recipeProducer;\n    this.#recipeProducer = undefined;\n    this.#fillRegion(x0, y0, x1, y1, id, quiet, producer);\n  }\n\n  #fillRegion(x0: number, y0: number, x1: number, y1: number, id: string, quiet: boolean,\n    producer?: NativeGridGroundState): void {\n    const byte = this.kindByte(id);\n    const walkable = regionKind(id)?.walkable ? 1 : 0;\n    const a = this.cx(Math.min(x0, x1)), b = this.cx(Math.max(x0, x1));\n    const c = this.cy(Math.min(y0, y1)), d = this.cy(Math.max(y0, y1));\n    this.#invalidateGround(a,b,c,d);\n    if(nativePaints)recordNativePaint(this,a,b,c,d);\n    const own = producer && this.#groundCurrent(producer) && producer.painting\n      && producer.region === id && this.#kindList[byte] === id && walkable === 0 ? producer : undefined;\n    for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) {\n      const i = cy * this.cols + cx;\n      this.#kind[i] = byte; this.#mask[i] = walkable;\n      if (own) {\n        own.byte = byte;\n        own.owned[i] = 1;\n      }\n    }\n    if (quiet) { this.version++; return; }\n    // No eager cache clears: pushDirty's version bump lazily stales the\n"
        },
        {
          "before": "    const walkable = regionKind(id)?.walkable ? 1 : 0;\n    const a = this.cx(cx - r), b = this.cx(cx + r), c = this.cy(cy - r), d = this.cy(cy + r);\n    const r2 = r * r;\n    if(nativePaints)recordNativePaint(this,a,b,c,d,{x:cx,y:cy,r2});\n    for (let gy = c; gy <= d; gy++) for (let gx = a; gx <= b; gx++) {\n      const px = (gx + 0.5) * this.cell - cx, py = (gy + 0.5) * this.cell - cy;\n      if (px * px + py * py > r2) continue;\n      const i = gy * this.cols + gx;\n      this.kind[i] = byte; this.mask[i] = walkable;\n    }\n    this.pushDirty(cx - r, cy - r, cx + r, cy + r);\n  }\n",
          "after": "    const walkable = regionKind(id)?.walkable ? 1 : 0;\n    const a = this.cx(cx - r), b = this.cx(cx + r), c = this.cy(cy - r), d = this.cy(cy + r);\n    const r2 = r * r;\n    this.#invalidateGround(a,b,c,d,{x:cx,y:cy,r2});\n    if(nativePaints)recordNativePaint(this,a,b,c,d,{x:cx,y:cy,r2});\n    for (let gy = c; gy <= d; gy++) for (let gx = a; gx <= b; gx++) {\n      const px = (gx + 0.5) * this.cell - cx, py = (gy + 0.5) * this.cell - cy;\n      if (px * px + py * py > r2) continue;\n      const i = gy * this.cols + gx;\n      this.#kind[i] = byte; this.#mask[i] = walkable;\n    }\n    this.pushDirty(cx - r, cy - r, cx + r, cy + r);\n  }\n"
        },
        {
          "before": "  }\n\n  /** Count of walkable cells (sanity / density). */\n  walkableCount(): number { let n = 0; for (const v of this.mask) if (v) n++; return n; }\n\n  // --- WalkField interface ---------------------------------------------------\n\n  isWalkable(x: number, y: number): boolean {\n    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);\n    if (!this.inGrid(cx, cy)) return false;\n    return this.mask[cy * this.cols + cx] === 1;\n  }\n\n  /** The region-kind id painted at a world point ('wall' for the unpainted\n",
          "after": "  }\n\n  /** Count of walkable cells (sanity / density). */\n  walkableCount(): number { let n = 0; for (const v of this.#mask) if (v) n++; return n; }\n\n  // --- WalkField interface ---------------------------------------------------\n\n  isWalkable(x: number, y: number): boolean {\n    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);\n    if (!this.inGrid(cx, cy)) return false;\n    return this.#mask[cy * this.cols + cx] === 1;\n  }\n\n  /** The region-kind id painted at a world point ('wall' for the unpainted\n"
        },
        {
          "before": "  kindAt(x: number, y: number): string | undefined {\n    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);\n    if (!this.inGrid(cx, cy)) return undefined;\n    return this.kindList[this.kind[cy * this.cols + cx]] ?? 'wall';\n  }\n\n  /** LEDGE GRASP (WALK_CFG.ledgeGrasp): is any part of a body disc still on\n",
          "after": "  kindAt(x: number, y: number): string | undefined {\n    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);\n    if (!this.inGrid(cx, cy)) return undefined;\n    return this.#kindList[this.#kind[cy * this.cols + cx]] ?? 'wall';\n  }\n\n  /** LEDGE GRASP (WALK_CFG.ledgeGrasp): is any part of a body disc still on\n"
        },
        {
          "before": "    const gy1 = Math.min(this.rows - 1, Math.floor((y + r) / this.cell));\n    for (let gy = gy0; gy <= gy1; gy++) {\n      for (let gx = gx0; gx <= gx1; gx++) {\n        const rk = regionKind(this.kindList[this.kind[gy * this.cols + gx]]);\n        if (rk && !rk.walkable && !rk.blocks) continue; // void: nothing to hold\n        // Disc-vs-cell overlap: nearest point of the cell rect to the center.\n        const nx = Math.max(gx * this.cell, Math.min(x, (gx + 1) * this.cell));\n",
          "after": "    const gy1 = Math.min(this.rows - 1, Math.floor((y + r) / this.cell));\n    for (let gy = gy0; gy <= gy1; gy++) {\n      for (let gx = gx0; gx <= gx1; gx++) {\n        const rk = regionKind(this.#kindList[this.#kind[gy * this.cols + gx]]);\n        if (rk && !rk.walkable && !rk.blocks) continue; // void: nothing to hold\n        // Disc-vs-cell overlap: nearest point of the cell rect to the center.\n        const nx = Math.max(gx * this.cell, Math.min(x, (gx + 1) * this.cell));\n"
        },
        {
          "before": "  regionAt(x: number, y: number): string {\n    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);\n    if (!this.inGrid(cx, cy)) return 'wall';\n    return this.kindList[this.kind[cy * this.cols + cx]] ?? 'wall';\n  }\n\n  /** Nearest walkable point — a ring search outward from the point's cell,\n",
          "after": "  regionAt(x: number, y: number): string {\n    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);\n    if (!this.inGrid(cx, cy)) return 'wall';\n    return this.#kindList[this.#kind[cy * this.cols + cx]] ?? 'wall';\n  }\n\n  /** Nearest walkable point — a ring search outward from the point's cell,\n"
        },
        {
          "before": "   *  point itself if the grid is somehow empty. */\n  snapToWalkable(p: Vec2): Vec2 {\n    const sx = this.cx(p.x), sy = this.cy(p.y);\n    if (this.mask[sy * this.cols + sx] === 1) return vec(this.centerX(sx), this.centerY(sy));\n    const maxR = Math.max(this.cols, this.rows);\n    let best = -1, bestD = Infinity;\n    for (let r = 1; r <= maxR; r++) {\n",
          "after": "   *  point itself if the grid is somehow empty. */\n  snapToWalkable(p: Vec2): Vec2 {\n    const sx = this.cx(p.x), sy = this.cy(p.y);\n    if (this.#mask[sy * this.cols + sx] === 1) return vec(this.centerX(sx), this.centerY(sy));\n    const maxR = Math.max(this.cols, this.rows);\n    let best = -1, bestD = Infinity;\n    for (let r = 1; r <= maxR; r++) {\n"
        },
        {
          "before": "        for (let dx = -r; dx <= r; dx++) {\n          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // ring only\n          const cx = sx + dx, cy = sy + dy;\n          if (!this.inGrid(cx, cy) || this.mask[cy * this.cols + cx] !== 1) continue;\n          const d = (this.centerX(cx) - p.x) ** 2 + (this.centerY(cy) - p.y) ** 2;\n          if (d < bestD) { bestD = d; best = cy * this.cols + cx; }\n        }\n",
          "after": "        for (let dx = -r; dx <= r; dx++) {\n          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // ring only\n          const cx = sx + dx, cy = sy + dy;\n          if (!this.inGrid(cx, cy) || this.#mask[cy * this.cols + cx] !== 1) continue;\n          const d = (this.centerX(cx) - p.x) ** 2 + (this.centerY(cy) - p.y) ** 2;\n          if (d < bestD) { bestD = d; best = cy * this.cols + cx; }\n        }\n"
        },
        {
          "before": "      const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);\n      if (!this.inGrid(cx, cy)) return false;\n      const i = cy * this.cols + cx;\n      return this.mask[i] === 1 && (tab[this.kind[i]] || PATH_SCALE) <= PATH_SCALE;\n    };\n    const dx = to.x - from.x, dy = to.y - from.y;\n    const len = Math.hypot(dx, dy);\n",
          "after": "      const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);\n      if (!this.inGrid(cx, cy)) return false;\n      const i = cy * this.cols + cx;\n      return this.#mask[i] === 1 && (tab[this.#kind[i]] || PATH_SCALE) <= PATH_SCALE;\n    };\n    const dx = to.x - from.x, dy = to.y - from.y;\n    const len = Math.hypot(dx, dy);\n"
        },
        {
          "before": "    if (prof && this.profileEntry(prof).uniform) prof = null; // neutral view → the classic field\n    const tCell = this.cy(to.y) * this.cols + this.cx(to.x);\n    const fCell = this.cy(from.y) * this.cols + this.cx(from.x);\n    if (this.mask[tCell] !== 1) {\n      const s = this.snapToWalkable(to); // target off-mesh → aim at nearest walkable\n      const sc = this.cy(s.y) * this.cols + this.cx(s.x);\n      if (this.mask[sc] !== 1) return null;\n      return this.stepToward(fCell, sc, from, s, prof);\n    }\n    return this.stepToward(fCell, tCell, from, to, prof);\n",
          "after": "    if (prof && this.profileEntry(prof).uniform) prof = null; // neutral view → the classic field\n    const tCell = this.cy(to.y) * this.cols + this.cx(to.x);\n    const fCell = this.cy(from.y) * this.cols + this.cx(from.x);\n    if (this.#mask[tCell] !== 1) {\n      const s = this.snapToWalkable(to); // target off-mesh → aim at nearest walkable\n      const sc = this.cy(s.y) * this.cols + this.cx(s.x);\n      if (this.#mask[sc] !== 1) return null;\n      return this.stepToward(fCell, sc, from, s, prof);\n    }\n    return this.stepToward(fCell, tCell, from, to, prof);\n"
        },
        {
          "before": "  private stepToward(fCell: number, tCell: number, from: Vec2, to: Vec2, prof: PathProfile | null): Vec2 | null {\n    if (fCell === tCell) return vec(to.x, to.y);\n    const dist = this.distanceTo(tCell, prof);\n    if (this.mask[fCell] !== 1 || dist[fCell] < 0) return null; // actor off-mesh / unreachable\n    // Adjacent (cell coords, not field units — weighted fields don't count in\n    // steps) → walk straight in.\n    const cx = fCell % this.cols, cy = Math.floor(fCell / this.cols);\n",
          "after": "  private stepToward(fCell: number, tCell: number, from: Vec2, to: Vec2, prof: PathProfile | null): Vec2 | null {\n    if (fCell === tCell) return vec(to.x, to.y);\n    const dist = this.distanceTo(tCell, prof);\n    if (this.#mask[fCell] !== 1 || dist[fCell] < 0) return null; // actor off-mesh / unreachable\n    // Adjacent (cell coords, not field units — weighted fields don't count in\n    // steps) → walk straight in.\n    const cx = fCell % this.cols, cy = Math.floor(fCell / this.cols);\n"
        },
        {
          "before": "      const nx = cx + dx, ny = cy + dy;\n      if (!this.inGrid(nx, ny)) continue;\n      const nc = ny * this.cols + nx;\n      if (this.mask[nc] !== 1 || dist[nc] < 0) continue;\n      if (dist[nc] < bestD) { bestD = dist[nc]; bestC = nc; }\n    }\n    if (bestC < 0) return vec(to.x, to.y);\n",
          "after": "      const nx = cx + dx, ny = cy + dy;\n      if (!this.inGrid(nx, ny)) continue;\n      const nc = ny * this.cols + nx;\n      if (this.#mask[nc] !== 1 || dist[nc] < 0) continue;\n      if (dist[nc] < bestD) { bestD = dist[nc]; bestC = nc; }\n    }\n    if (bestC < 0) return vec(to.x, to.y);\n"
        },
        {
          "before": "          const nx = cx + dx, ny = cy + dy;\n          if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;\n          const nc = ny * this.cols + nx;\n          if (this.mask[nc] !== 1) continue;\n          const nd = cur + (tab[this.kind[nc]] || PATH_SCALE);\n          if (d[nc] >= 0 && d[nc] <= nd) continue;\n          d[nc] = nd;\n          ring[nd % W].push(nc);\n",
          "after": "          const nx = cx + dx, ny = cy + dy;\n          if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;\n          const nc = ny * this.cols + nx;\n          if (this.#mask[nc] !== 1) continue;\n          const nd = cur + (tab[this.#kind[nc]] || PATH_SCALE);\n          if (d[nc] >= 0 && d[nc] <= nd) continue;\n          d[nc] = nd;\n          ring[nd % W].push(nc);\n"
        },
        {
          "before": "        const nx = cx + dx, ny = cy + dy;\n        if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;\n        const nc = ny * this.cols + nx;\n        if (this.mask[nc] !== 1 || d[nc] >= 0) continue;\n        d[nc] = nd; q.push(nc);\n      }\n    }\n",
          "after": "        const nx = cx + dx, ny = cy + dy;\n        if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;\n        const nc = ny * this.cols + nx;\n        if (this.#mask[nc] !== 1 || d[nc] >= 0) continue;\n        d[nc] = nd; q.push(nc);\n      }\n    }\n"
        },
        {
          "before": "    let label = 0;\n    const q = this.scratchQ;\n    for (let start = 0; start < n; start++) {\n      if (this.mask[start] !== 1 || reg[start] >= 0) continue;\n      q.length = 0;\n      q.push(start); reg[start] = label;\n      for (let head = 0; head < q.length; head++) {\n",
          "after": "    let label = 0;\n    const q = this.scratchQ;\n    for (let start = 0; start < n; start++) {\n      if (this.#mask[start] !== 1 || reg[start] >= 0) continue;\n      q.length = 0;\n      q.push(start); reg[start] = label;\n      for (let head = 0; head < q.length; head++) {\n"
        },
        {
          "before": "          const nx = cx + dx, ny = cy + dy;\n          if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;\n          const nc = ny * this.cols + nx;\n          if (this.mask[nc] !== 1 || reg[nc] >= 0) continue;\n          reg[nc] = label; q.push(nc);\n        }\n      }\n",
          "after": "          const nx = cx + dx, ny = cy + dy;\n          if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;\n          const nc = ny * this.cols + nx;\n          if (this.#mask[nc] !== 1 || reg[nc] >= 0) continue;\n          reg[nc] = label; q.push(nc);\n        }\n      }\n"
        },
        {
          "before": "   *  walkable mask is DERIVED on unpack, so kinds are the single source of truth. */\n  pack(): PackedWalk {\n    let s = '';\n    for (const b of this.kind) s += String.fromCharCode(b);\n    return { cols: this.cols, rows: this.rows, cell: this.cell, kinds: this.kindList.slice(), kbits: btoa(s) };\n  }\n\n  static unpack(p: PackedWalk): GridWalkField {\n    const g = new GridWalkField(p.cols * p.cell, p.rows * p.cell, p.cell);\n    g.kindList = p.kinds.slice();\n    const s = atob(p.kbits);\n    for (let i = 0; i < g.kind.length; i++) {\n      const b = s.charCodeAt(i) || 0;\n      g.kind[i] = b;\n      g.mask[i] = regionKind(g.kindList[b])?.walkable ? 1 : 0;\n    }\n    return g;\n  }\n}\n",
          "after": "   *  walkable mask is DERIVED on unpack, so kinds are the single source of truth. */\n  pack(): PackedWalk {\n    let s = '';\n    for (const b of this.#kind) s += String.fromCharCode(b);\n    return { cols: this.cols, rows: this.rows, cell: this.cell, kinds: this.#kindList.slice(), kbits: btoa(s) };\n  }\n\n  static unpack(p: PackedWalk): GridWalkField {\n    // The private token closes acquisition before the constructor's selected\n    // installer can expose this instance, through every selected input/policy read.\n    const g = new GridWalkField(p.cols * p.cell, p.rows * p.cell, p.cell, nativeGridImportToken);\n    try {\n      g.#kindList = p.kinds.slice();\n      const s = atob(p.kbits);\n      for (let i = 0; i < g.#kind.length; i++) {\n        const b = s.charCodeAt(i) || 0;\n        g.#kind[i] = b;\n        g.#mask[i] = regionKind(g.#kindList[b])?.walkable ? 1 : 0;\n      }\n      return g;\n    } finally {\n      // Import is not a producer paint. Preserve completed writes and the first\n      // native error, but leave no rights across this scope. Later real paints\n      // may acquire their own cells unless a backing array actually escaped.\n      for (const claim of g.#groundClaims) claim.active = false;\n      g.#groundClaims.clear();\n      g.#groundImport = false;\n    }\n  }\n}\n\nconst nativeRecipeFillRegion = GridWalkField.prototype.fillRegion;\n"
        }
      ]
    },
    {
      "file": "src/engine/levelgen.ts",
      "predecessor": "41fc4f42ef81929a9fac69f07bf401842be8cb58",
      "beforeHash": "9d23e90b970c0b474b828894de0caa1b2be3db858e81dd523c7afe5259eb34a6",
      "afterHash": "99dd855ed922e9cc816fdf144817e445d7d9ba2f56928cf95afc09918b92f0a8",
      "beforeRawSha256": "9d23e90b970c0b474b828894de0caa1b2be3db858e81dd523c7afe5259eb34a6",
      "afterRawSha256": "99dd855ed922e9cc816fdf144817e445d7d9ba2f56928cf95afc09918b92f0a8",
      "crlfLines": [],
      "hunks": [
        {
          "before": "\nimport type { Actor } from './actor';\nimport { dist, vec, type Vec2 } from '../core/math';\nimport { shapeBoundR, shapeDistance, type HitShape } from './shapes';\nimport type { TrackSpec, TrackPayload } from './tracks';\nimport type { TrapworkSpec } from './trapworks';\nimport type { GeyserSpec } from './geysers'; // authoredVents — the geyser fabric's authoring seam\n",
          "after": "\nimport type { Actor } from './actor';\nimport { dist, vec, type Vec2 } from '../core/math';\nimport { shapeBoundR, shapeAabbHalf, shapeDistance, type HitShape } from './shapes';\nimport type { TrackSpec, TrackPayload } from './tracks';\nimport type { TrapworkSpec } from './trapworks';\nimport type { GeyserSpec } from './geysers'; // authoredVents — the geyser fabric's authoring seam\n"
        },
        {
          "before": "// erased at runtime — no actual module cycle exists.\nimport { Mask, GEN_CELL, disc, radial, bearingNoise, pourLobes, paintLiquid, valueNoise2, wanderPath } from './genkit';\nimport { blendDither, compileBlendField } from './blend';\n\nexport type KnownDoodadKind =\n  | 'rock' | 'cliff' | 'chasm' | 'bridge' | 'wall'\n",
          "after": "// erased at runtime — no actual module cycle exists.\nimport { Mask, GEN_CELL, disc, radial, bearingNoise, pourLobes, paintLiquid, valueNoise2, wanderPath } from './genkit';\nimport { blendDither, compileBlendField } from './blend';\nimport { closeRecipeGround, recoverRecipeGround } from './nativeRecipeGround';\nimport {\n  RequiredStructureSeatError, requireStructure, completeRequiredStructure, verifyRequiredStructures,\n  closeRequiredStructures, nativeStructureCursor, nativeStructureGeneration, nativeStructureRoll,\n  endNativeStructureRoll, nativeStructureAttempt, nativeStructureContext, nativeStructureReturned,\n  type NativeStructureAttempt,\n} from './nativeStructureProof';\nexport { beginNativeRequiredStructureReceipt } from './nativeStructureProof';\n\nexport type KnownDoodadKind =\n  | 'rock' | 'cliff' | 'chasm' | 'bridge' | 'wall'\n"
        },
        {
          "before": "  const mul = layoutParam(def, 'dressTryMul', 1) as number;\n  if (mul !== 1) ctx.siteTryMul = mul;\n  try {\n    for (const spec of def.layout) {\n      const n = ctx.rng.int(spec.count[0], spec.count[1]);\n      for (let i = 0; i < n; i++) stamp(ctx, spec);\n    }\n  } finally {\n    ctx.siteTryMul = prevMul;\n",
          "after": "  const mul = layoutParam(def, 'dressTryMul', 1) as number;\n  if (mul !== 1) ctx.siteTryMul = mul;\n  try {\n    let rowIndex = 0;\n    for (const spec of def.layout) {\n      const index = rowIndex++, isStructure = spec.kind === 'structure';\n      const before = isStructure ? nativeStructureCursor(ctx) : undefined;\n      const n = ctx.rng.int(spec.count[0], spec.count[1]);\n      const prior = isStructure ? nativeStructureRoll(ctx, 'layout', index, spec.structure, before, true, n) : undefined;\n      try { for (let i = 0; i < n; i++) stamp(ctx, spec); }\n      finally { if (isStructure) endNativeStructureRoll(ctx, prior); }\n    }\n  } finally {\n    ctx.siteTryMul = prevMul;\n"
        },
        {
          "before": "    aquatic: def.aquatic,\n    overgrowth: overgrowthOf(def),\n  };\n  // THE BLEND FIELD (engine/blend.ts): compiled ONCE per generation from the\n  // def's resolved blend — findSpot's dither gate and the 'blend' WHERE field\n  // both sample it. Pure math off (arena, seed): zero rng, zero cost when\n",
          "after": "    aquatic: def.aquatic,\n    overgrowth: overgrowthOf(def),\n  };\n  try {\n  nativeStructureGeneration(ctx);\n  // THE BLEND FIELD (engine/blend.ts): compiled ONCE per generation from the\n  // def's resolved blend — findSpot's dither gate and the 'blend' WHERE field\n  // both sample it. Pure math off (arena, seed): zero rng, zero cost when\n"
        },
        {
          "before": "    const n = roll.count ? ctx.rng.int(roll.count[0], roll.count[1]) : 1;\n    for (let i = 0; i < n; i++) stamp(ctx, { kind: 'landmark', landmark: roll.landmark, count: [1, 1] });\n  }\n  for (const roll of ctx.lite ? [] : def.structures ?? []) {\n    if (!ctx.rng.chance(roll.chance)) continue;\n    const n = roll.count ? ctx.rng.int(roll.count[0], roll.count[1]) : 1;\n    for (let i = 0; i < n; i++) stamp(ctx, { kind: 'structure', structure: roll.structure, count: [1, 1] });\n  }\n  // COMPOSITION POST entries: after the base layout + landmark/structure rolls\n  // so their shore bands measure EVERY liquid (authored and landmark-poured)\n",
          "after": "    const n = roll.count ? ctx.rng.int(roll.count[0], roll.count[1]) : 1;\n    for (let i = 0; i < n; i++) stamp(ctx, { kind: 'landmark', landmark: roll.landmark, count: [1, 1] });\n  }\n  let structureRollIndex = 0;\n  for (const roll of ctx.lite ? [] : def.structures ?? []) {\n    const index = structureRollIndex++, before = nativeStructureCursor(ctx);\n    if (!ctx.rng.chance(roll.chance)) {\n      const prior = nativeStructureRoll(ctx, 'structures', index, roll.structure, before, false, 0);\n      endNativeStructureRoll(ctx, prior);\n      continue;\n    }\n    const n = roll.count ? ctx.rng.int(roll.count[0], roll.count[1]) : 1;\n    const prior = nativeStructureRoll(ctx, 'structures', index, roll.structure, before, true, n);\n    try { for (let i = 0; i < n; i++) stamp(ctx, { kind: 'structure', structure: roll.structure, count: [1, 1] }); }\n    finally { endNativeStructureRoll(ctx, prior); }\n  }\n  // COMPOSITION POST entries: after the base layout + landmark/structure rolls\n  // so their shore bands measure EVERY liquid (authored and landmark-poured)\n"
        },
        {
          "before": "  if (ctx.storeyLevels && !def.tiers) {\n    def.tiers = { kind: 'over', exposure: 'open', levels: ctx.storeyLevels, packSplit: 0, interior: true };\n  }\n  return {\n    ...(fixturePlacements.length ? {fixturePlacements} : {}),\n    doodads: ctx.doodads, pois: ctx.pois, camps: ctx.camps,\n",
          "after": "  if (ctx.storeyLevels && !def.tiers) {\n    def.tiers = { kind: 'over', exposure: 'open', levels: ctx.storeyLevels, packSplit: 0, interior: true };\n  }\n  verifyRequiredStructures(ctx, def);\n  nativeStructureReturned(ctx);\n  return {\n    ...(fixturePlacements.length ? {fixturePlacements} : {}),\n    doodads: ctx.doodads, pois: ctx.pois, camps: ctx.camps,\n"
        },
        {
          "before": "    bossSeat: ctx.bossSeat,\n    localeReport: ctx.localeReport,\n  };\n}\n\n/** The universal invariant's engine (grid zones; convex zones stay guaranteed\n",
          "after": "    bossSeat: ctx.bossSeat,\n    localeReport: ctx.localeReport,\n  };\n  } finally {\n    closeRecipeGround(ctx);\n    closeRequiredStructures(ctx);\n  }\n}\n\n/** The universal invariant's engine (grid zones; convex zones stay guaranteed\n"
        },
        {
          "before": "\n/** A complete structure cannot be seated without changing protected ground. */\nexport class ResolvedStructureSeatError extends Error {}\nfunction fitResolvedStructure(ctx: GenCtx, at: Vec2, w: number, h: number, aprons: ApronOffset[], explicit: boolean): Vec2 {\n  const original=plannedRect(at,w,h), center=vec(original.x+w/2,original.y+h/2), edge=aprons.filter(a=>a.edge);\n  // Generation owns the native convex BASE arena (annex union admission is later).\n  // Convexity makes corner containment a whole rectangular footprint proof and\n",
          "after": "\n/** A complete structure cannot be seated without changing protected ground. */\nexport class ResolvedStructureSeatError extends Error {}\n/** Only this native function can return a refusal; arbitrary callback throws\n * are never caught, inspected, message-matched or treated as recovery rights. */\nfunction nativeResolvedStructureSeat(ctx: GenCtx, at: Vec2, w: number, h: number,\n  aprons: ApronOffset[], explicit: boolean): Vec2 | 'whole-arena' | 'no-seat' {\n  const original=plannedRect(at,w,h), center=vec(original.x+w/2,original.y+h/2), edge=aprons.filter(a=>a.edge);\n  // Generation owns the native convex BASE arena (annex union admission is later).\n  // Convexity makes corner containment a whole rectangular footprint proof and\n"
        },
        {
          "before": "  const span=ctx.arena.boundless?backing:ctx.arena,margin=ctx.arena.boundless?0:BORDER;\n  const loX=Math.ceil((margin-minRelX)/WALK_CELL)*WALK_CELL,hiX=Math.floor((span.w-margin-maxRelX)/WALK_CELL)*WALK_CELL;\n  const loY=Math.ceil((margin-minRelY)/WALK_CELL)*WALK_CELL,hiY=Math.floor((span.h-margin-maxRelY)/WALK_CELL)*WALK_CELL;\n  if(loX>hiX||loY>hiY)throw new ResolvedStructureSeatError('resolved structure cannot fit whole arena');\n  const candidates=structureSeatCandidates(original,loX,hiX,loY,hiY);\n  const severs=severanceTest(ctx);\n  for(const p of candidates){\n",
          "after": "  const span=ctx.arena.boundless?backing:ctx.arena,margin=ctx.arena.boundless?0:BORDER;\n  const loX=Math.ceil((margin-minRelX)/WALK_CELL)*WALK_CELL,hiX=Math.floor((span.w-margin-maxRelX)/WALK_CELL)*WALK_CELL;\n  const loY=Math.ceil((margin-minRelY)/WALK_CELL)*WALK_CELL,hiY=Math.floor((span.h-margin-maxRelY)/WALK_CELL)*WALK_CELL;\n  if(loX>hiX||loY>hiY)return 'whole-arena';\n  const candidates=structureSeatCandidates(original,loX,hiX,loY,hiY);\n  const severs=severanceTest(ctx);\n  for(const p of candidates){\n"
        },
        {
          "before": "    if(severs&&severs(r))continue;\n    return c;\n  }\n  throw new ResolvedStructureSeatError('resolved structure has no whole admissible seat');\n}\n\nfunction findStructureSpot(\n  ctx: GenCtx, w: number, h: number, aprons: ApronOffset[],\n): Vec2 | null {\n  const severs = severanceTest(ctx);\n  for (let tries = 0; tries < 18; tries++) {\n    const c = vec(\n      ctx.rng.range(BORDER + w / 2, Math.max(BORDER + w / 2, ctx.arena.w - BORDER - w / 2)),\n      ctx.rng.range(BORDER + h / 2, Math.max(BORDER + h / 2, ctx.arena.h - BORDER - h / 2)));\n",
          "after": "    if(severs&&severs(r))continue;\n    return c;\n  }\n  return 'no-seat';\n}\n\n/** The only inherited entry overlap recovery accepts: one actual unrotated\n * door slab, with both centers strictly outside the SAME face and a linear\n * outward escape. Native pushOutOfShape projects an outside-face overlap in\n * this direction. No door state/position or portal ground is changed here. */\nfunction recipeEntryDoorEscape(ctx: GenCtx, from: Vec2, to: Vec2,\n  bodyRadius: number, paddedRadius: number): Doodad | null {\n  if (![from.x, from.y, to.x, to.y, bodyRadius, paddedRadius].every(Number.isFinite)\n    || bodyRadius <= 0 || paddedRadius < bodyRadius) return null;\n  let inherited: Doodad | null = null;\n  for (let i = 0; i < ctx.doodads.length; i++) {\n    const d = ctx.doodads[i];\n    if ((d.tier ?? 0) !== 0 || d.kind !== 'door' || !d.door) continue;\n    const shape = hitSurfaceOf(d, 'move');\n    // Shipped doorSurfaceOf slabs are unrotated rectangles. Refuse unsupported\n    // authored door geometry instead of inferring an escape through a corner.\n    if (shape.kind !== 'rect' || (shape.rot ?? 0) !== 0\n      || ![shape.hw, shape.hh, d.pos.x, d.pos.y].every(Number.isFinite)\n      || shape.hw <= 0 || shape.hh <= 0) return null;\n    if (shapeDistance(shape, d.pos.x, d.pos.y, from.x, from.y) >= bodyRadius) continue;\n    if (inherited) return null;\n    const fx = from.x - d.pos.x, fy = from.y - d.pos.y;\n    const tx = to.x - d.pos.x, ty = to.y - d.pos.y;\n    const face = (a: number, b: number, tangentA: number, tangentB: number,\n      halfDepth: number, halfBreadth: number): boolean => {\n      const gap = a - halfDepth, endGap = b - halfDepth;\n      return gap > 0 && gap < bodyRadius && endGap > gap && endGap >= paddedRadius\n        && Math.abs(tangentA) <= halfBreadth && Math.abs(tangentB) <= halfBreadth;\n    };\n    // The tangent stays within the face for the whole linear stub; its signed\n    // clearance is therefore linear and strictly increasing, not merely clear\n    // at sampled points. Inside-center, corner, parallel and reversed stubs fail.\n    if (!face(fx, tx, fy, ty, shape.hw, shape.hh)\n      && !face(-fx, -tx, fy, ty, shape.hw, shape.hh)\n      && !face(fy, ty, fx, tx, shape.hh, shape.hw)\n      && !face(-fy, -ty, fx, tx, shape.hh, shape.hw)) return null;\n    inherited = d;\n  }\n  return inherited;\n}\n\nfunction repairStructureGround(ctx: GenCtx, at: Vec2, w: number, h: number,\n  aprons: ApronOffset[], audit?: NativeStructureAttempt): Vec2 | null {\n  const facts = audit ? { terminal: 'declined', considered: 0, routeCells: 0,\n    paintedCells: 0, firstRefusals: {} as Record<string, number> } : undefined;\n  if (audit) audit.recovery = facts;\n  return recoverRecipeGround(ctx, at, w, h, aprons, {\n    cell: WALK_CELL, border: BORDER, entryClear: ENTRY_CLEAR, exitClear: EXIT_CLEAR,\n    rectReserved, inReserved, candidates: structureSeatCandidates, entryDoorEscape: recipeEntryDoorEscape,\n    // Interior-only physical topology: all doors stay barriers regardless of\n    // open/broken state. Current ground-level movement blockers (including\n    // functional passage plugs) also separate the OLD floor components.\n    barrierRects: cx => {\n      const rects: { x: number; y: number; w: number; h: number }[] = [];\n      for (const d of cx.doodads) if (d.door || (d.tier ?? 0) === 0 && blocksMovement(d)) {\n        if (d.door) {\n          if (!d.door.cells) return null;\n          rects.push(d.door.cells);\n        }\n        const { ex, ey } = shapeAabbHalf(hitSurfaceOf(d, 'move'));\n        rects.push({ x: d.pos.x - ex, y: d.pos.y - ey, w: ex * 2, h: ey * 2 });\n      }\n      for (const structure of cx.structures ?? []) {\n        if (!Array.isArray(structure.doors)) return null;\n        for (const placed of structure.doors) {\n          if (!placed.door.cells) return null;\n          rects.push(placed.door.cells);\n        }\n      }\n      return rects;\n    },\n    // This is the original site-clear predicate on ALL tiers. Recovery has\n    // no provenance to delete even a nonblocking foreign doodad.\n    erases: (cx, rect) => cx.doodads.some(d => !Number.isFinite(d.radius)\n      || !Number.isFinite(d.pos.x) || !Number.isFinite(d.pos.y)\n      || d.pos.x > rect.x - d.radius * .4 && d.pos.x < rect.x + rect.w + d.radius * .4\n        && d.pos.y > rect.y - d.radius * .4 && d.pos.y < rect.y + rect.h + d.radius * .4),\n    // AABB overlap is a conservative WHOLE-shape exclusion, not sampled\n    // circles. Reject every tier/record whose shape can touch a repainted cell;\n    // the original live-body route check below remains a separate tier-0 gate.\n    paintBlocked: (cx, rect) => cx.doodads.some(d => {\n      const { ex, ey } = shapeAabbHalf(hitSurfaceOf(d, 'move'));\n      if (![ex, ey, d.pos.x, d.pos.y].every(Number.isFinite) || ex < 0 || ey < 0) return true;\n      return d.pos.x + ex > rect.x && d.pos.x - ex < rect.x + rect.w\n        && d.pos.y + ey > rect.y && d.pos.y - ey < rect.y + rect.h;\n    }) || [...cx.pois, ...cx.camps, ...cx.garrisons.map(g => g.pos), ...cx.npcs.map(n => n.pos),\n      ...cx.breakables.map(b => b.pos), ...(cx.mustReach ?? [])].some(p =>\n      !Number.isFinite(p.x) || !Number.isFinite(p.y) || dist(p, vec(\n        Math.max(rect.x, Math.min(p.x, rect.x + rect.w)),\n        Math.max(rect.y, Math.min(p.y, rect.y + rect.h)))) < WALK_CELL / 2),\n    blocked: (cx, p, r) => cx.doodads.some(d => (d.tier ?? 0) === 0\n      && (d.keep || d.door || blocksMovement(d) || hazardGrounds().includes(d.kind))\n      && shapeDistance(hitSurfaceOf(d, 'move'), d.pos.x, d.pos.y, p.x, p.y) < r)\n      || [...cx.pois, ...cx.camps, ...cx.garrisons.map(g => g.pos), ...cx.npcs.map(n => n.pos),\n        ...cx.breakables.map(b => b.pos), ...(cx.mustReach ?? [])].some(q => dist(p, q) < r + WALK_CELL / 2),\n    admit: (cx, p, sw, sh, as) => {\n      const result = nativeResolvedStructureSeat(cx, p, sw, sh, as, false);\n      return typeof result === 'string' ? null : result;\n    },\n    way: (cx, points) => {\n      const roll = wayRoller(cx, 0);\n      const reserved: Reservation[] = [];\n      for (const p of points) {\n        const before = cx.doodads.length;\n        roll(p, WALK_CELL / 2, 'road');\n        if (cx.doodads.length === before) throw Error('Native recipe clearway refused its ground');\n        reserved.push({ pos: p, radius: WALK_CELL / 2 + COHERENCE_CFG.wayReservePad });\n      }\n      return reserved;\n    },\n  }, facts);\n}\nfunction fitResolvedStructure(ctx: GenCtx, at: Vec2, w: number, h: number,\n  aprons: ApronOffset[], explicit: boolean, audit?: NativeStructureAttempt): Vec2 {\n  const result = nativeResolvedStructureSeat(ctx, at, w, h, aprons, explicit);\n  if (typeof result !== 'string') return result;\n  if (audit) { audit.nativeTerminal = result; audit.context = nativeStructureContext(ctx); }\n  const recovered = explicit ? null : repairStructureGround(ctx, at, w, h, aprons, audit);\n  if (recovered) return recovered;\n  if (audit) audit.terminal = 'native-refusal';\n  throw new ResolvedStructureSeatError(result === 'whole-arena'\n    ? 'resolved structure cannot fit whole arena' : 'resolved structure has no whole admissible seat');\n}\n\nfunction findStructureSpot(\n  ctx: GenCtx, w: number, h: number, aprons: ApronOffset[], audit?: { tries: number },\n): Vec2 | null {\n  const severs = severanceTest(ctx);\n  for (let tries = 0; tries < 18; tries++) {\n    if (audit) audit.tries++;\n    const c = vec(\n      ctx.rng.range(BORDER + w / 2, Math.max(BORDER + w / 2, ctx.arena.w - BORDER - w / 2)),\n      ctx.rng.range(BORDER + h / 2, Math.max(BORDER + h / 2, ctx.arena.h - BORDER - h / 2)));\n"
        },
        {
          "before": " *  window + prop doodads, record roofs/slots/doors on a PlacedStructure, stamp\n *  fx layers, and guarantee every door an open apron reachable from the entry. */\nfunction placeStructurePlan(ctx: GenCtx, def: StructureDef, at?: Vec2): PlacedStructure | undefined {\n  def = structurePlanOf(def, ctx.structurePlans);\n  const resolved = resolvePlan(ctx, def);\n  if (!resolved) return;\n  const { rows, cells } = resolved;\n  // QUANTIZE the plan cell to a multiple of the WALK cell (WALK_CELL), and\n  // later snap the footprint origin to the walk lattice (plannedRect): every\n",
          "after": " *  window + prop doodads, record roofs/slots/doors on a PlacedStructure, stamp\n *  fx layers, and guarantee every door an open apron reachable from the entry. */\nfunction placeStructurePlan(ctx: GenCtx, def: StructureDef, at?: Vec2): PlacedStructure | undefined {\n  const audit = nativeStructureAttempt(ctx, def, at);\n  def = structurePlanOf(def, ctx.structurePlans);\n  const required = requireStructure(ctx, def);\n  const resolved = resolvePlan(ctx, def);\n  if (!resolved) {\n    if (audit) audit.terminal = 'no-plan';\n    if (required) throw new RequiredStructureSeatError('required structure has no plan: ' + def.id);\n    return;\n  }\n  const { rows, cells } = resolved;\n  // QUANTIZE the plan cell to a multiple of the WALK cell (WALK_CELL), and\n  // later snap the footprint origin to the walk lattice (plannedRect): every\n"
        },
        {
          "before": "    return { dx: gx + n.x * cell * APRON_CELLS, dy: gy + n.y * cell * APRON_CELLS, ox: gx, oy: gy, n, cell, edge };\n  });\n\n  const selected = at ?? findStructureSpot(ctx, w, h, apronOffsets);\n  if (!selected) return;\n  const sited = fitResolvedStructure(ctx, selected, w, h, apronOffsets, at !== undefined);\n  // Snap the footprint origin onto the walk lattice (see the quantization\n  // note) — the SAME derivation the siting gates judged the candidate by.\n  const rect = plannedRect(sited, w, h);\n",
          "after": "    return { dx: gx + n.x * cell * APRON_CELLS, dy: gy + n.y * cell * APRON_CELLS, ox: gx, oy: gy, n, cell, edge };\n  });\n\n  if (audit) audit.resolved = { w, h, cell, aprons: apronOffsets.map(a => ({ ...a, n: { ...a.n } })) };\n  const finder = audit && at === undefined ? { tries: 0 } : undefined;\n  const beforeFinder = finder ? ctx.rng.snapshot() : 0;\n  const selected = at ?? findStructureSpot(ctx, w, h, apronOffsets, finder);\n  if (audit && finder) audit.finder = { tries: finder.tries, before: beforeFinder,\n    after: ctx.rng.snapshot(), selected: selected ? { ...selected } : null };\n  let sited: Vec2;\n  if (!selected) {\n    if (audit) { audit.nativeTerminal = 'finder-null'; audit.context = nativeStructureContext(ctx); }\n    if (!required) { if (audit) audit.terminal = 'no-spot'; return; }\n    // The original finder exhausted all 18 tries and their 36 draws. Only the\n    // selected required feature gets a draw-free annex attempt from this stop.\n    const recovered = repairStructureGround(ctx, ctx.entry, w, h, apronOffsets, audit);\n    if (!recovered) {\n      if (audit) audit.terminal = 'required-no-spot';\n      throw new RequiredStructureSeatError('required structure has no whole admissible seat: ' + def.id);\n    }\n    sited = recovered;\n  } else sited = fitResolvedStructure(ctx, selected, w, h, apronOffsets, at !== undefined, audit);\n  // Snap the footprint origin onto the walk lattice (see the quantization\n  // note) — the SAME derivation the siting gates judged the candidate by.\n  const rect = plannedRect(sited, w, h);\n"
        },
        {
          "before": "  if (def.garrison) {\n    ctx.garrisons.push({ pos: center, faction: def.garrison, size: def.garrisonSize ?? [3, 5] });\n  }\n  return placed;\n}\n\n",
          "after": "  if (def.garrison) {\n    ctx.garrisons.push({ pos: center, faction: def.garrison, size: def.garrisonSize ?? [3, 5] });\n  }\n  completeRequiredStructure(ctx, required, placed);\n  if (audit) {\n    audit.terminal = 'placed'; audit.after = ctx.rng.snapshot();\n    audit.placed = { id: placed.id, defId: placed.defId, rect: { ...placed.rect } };\n  }\n  return placed;\n}\n\n"
        }
      ]
    },
    {
      "file": "src/engine/layoutRecipes.ts",
      "predecessor": "41fc4f42ef81929a9fac69f07bf401842be8cb58",
      "beforeHash": "c342bb32afea0ada3c4c1f7724bb63cae140bd467a9e98f7a05ceb1fc54f44d3",
      "afterHash": "b0252ac8db0fd240c5fbfd613eb4454c1c566a7ab00ecaf4d18bf5446f5e032a",
      "beforeRawSha256": "c342bb32afea0ada3c4c1f7724bb63cae140bd467a9e98f7a05ceb1fc54f44d3",
      "afterRawSha256": "b0252ac8db0fd240c5fbfd613eb4454c1c566a7ab00ecaf4d18bf5446f5e032a",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import { boundaryGateOf, type BoundaryGateDef } from '../data/boundaryGates';\nimport { meldOf, MELD_CFG } from '../data/melds';\nimport { GridWalkField } from '../world/gridWalk';\nimport { regionKind } from '../world/regions';\nimport {\n  registerLayout, layoutParam, ensureGrid, scatterDecoration,\n",
          "after": "import { boundaryGateOf, type BoundaryGateDef } from '../data/boundaryGates';\nimport { meldOf, MELD_CFG } from '../data/melds';\nimport { GridWalkField } from '../world/gridWalk';\nimport { beginRecipeReservations, installRecipeGround } from './nativeRecipeGround';\nimport { regionKind } from '../world/regions';\nimport {\n  registerLayout, layoutParam, ensureGrid, scatterDecoration,\n"
        },
        {
          "before": " *  polyline so the tileset scatter that follows (and later landmark rolls)\n *  can never re-plug the zone's only passage — findSpot/blobs/landmarks all\n *  honor reservations. */\nfunction reserveArtery(ctx: GenCtx, pts: Vec2[], halfW: number): void {\n  for (let i = 0; i < pts.length - 1; i++) {\n    const ax = pts[i].x, ay = pts[i].y, bx = pts[i + 1].x, by = pts[i + 1].y;\n    const len = Math.hypot(bx - ax, by - ay);\n    const steps = Math.max(1, Math.ceil(len / 100));\n    for (let s = 0; s <= steps; s++) {\n      ctx.reserved.push({\n        pos: vec(ax + (bx - ax) * (s / steps), ay + (by - ay) * (s / steps)),\n        radius: halfW + 30,\n      });\n",
          "after": " *  polyline so the tileset scatter that follows (and later landmark rolls)\n *  can never re-plug the zone's only passage — findSpot/blobs/landmarks all\n *  honor reservations. */\nfunction reserveArtery(ctx: GenCtx, pts: Vec2[], halfW: number,\n  capture?: (reservation: import('./levelgen').Reservation) => void): void {\n  for (let i = 0; i < pts.length - 1; i++) {\n    const ax = pts[i].x, ay = pts[i].y, bx = pts[i + 1].x, by = pts[i + 1].y;\n    const len = Math.hypot(bx - ax, by - ay);\n    const steps = Math.max(1, Math.ceil(len / 100));\n    for (let s = 0; s <= steps; s++) {\n      if (capture) {\n        const reservation = {\n          pos: vec(ax + (bx - ax) * (s / steps), ay + (by - ay) * (s / steps)),\n          radius: halfW + 30,\n        };\n        capture(reservation);\n        ctx.reserved.push(reservation);\n      } else ctx.reserved.push({\n        pos: vec(ax + (bx - ax) * (s / steps), ay + (by - ay) * (s / steps)),\n        radius: halfW + 30,\n      });\n"
        },
        {
          "before": "  const grid = ensureGrid(ctx);\n  const all = Mask.forRect(0, 0, arena.w, arena.h);\n  all.invert(); // full coverage\n  paintRegion(grid, all, negativeRegion(def));\n\n  const gutW = layoutParam(def, 'gutWidth', [64, 96]) as [number, number];\n  const carve = Mask.forRect(0, 0, arena.w, arena.h);\n",
          "after": "  const grid = ensureGrid(ctx);\n  const all = Mask.forRect(0, 0, arena.w, arena.h);\n  all.invert(); // full coverage\n  const negative = negativeRegion(def);\n  const producer = grid.beginNativeRecipeGround(negative);\n  const reservations = producer ? beginRecipeReservations() : undefined;\n  let handedOff = false;\n  try {\n  paintRegion(grid, all, negative, producer?.paintRect);\n  const claim = producer?.finish();\n\n  const gutW = layoutParam(def, 'gutWidth', [64, 96]) as [number, number];\n  const carve = Mask.forRect(0, 0, arena.w, arena.h);\n"
        },
        {
          "before": "    const pts = wanderPath(rng, anchors[0], anchors[i], { step: 130, wobble: 60, bowFrac: 0.34 });\n    const halfW = rng.range(gutW[0], gutW[1]) / 2;\n    band(carve, pts, halfW);\n    reserveArtery(ctx, pts, halfW);\n  }\n  // Branch stubs: dead-end pockets off the gut (loot corners, ambush nooks).\n  const branches = layoutParam(def, 'branches', [2, 4]) as [number, number];\n",
          "after": "    const pts = wanderPath(rng, anchors[0], anchors[i], { step: 130, wobble: 60, bowFrac: 0.34 });\n    const halfW = rng.range(gutW[0], gutW[1]) / 2;\n    band(carve, pts, halfW);\n    reserveArtery(ctx, pts, halfW, reservations?.capture);\n  }\n  // Branch stubs: dead-end pockets off the gut (loot corners, ambush nooks).\n  const branches = layoutParam(def, 'branches', [2, 4]) as [number, number];\n"
        },
        {
          "before": "  // Portal mouths breathe.\n  for (const pt of anchors) disc(carve, pt.x, pt.y, 100);\n  paintRegion(grid, carve, 'ground');\n  scatterDecoration(ctx, def);\n}\nregisterLayout('winding', windingLayout);\n\n",
          "after": "  // Portal mouths breathe.\n  for (const pt of anchors) disc(carve, pt.x, pt.y, 100);\n  paintRegion(grid, carve, 'ground');\n  if (claim) {\n    installRecipeGround(ctx, grid, claim, reservations!.finish());\n    handedOff = true;\n  }\n  scatterDecoration(ctx, def);\n  } finally {\n    if (!handedOff) producer?.finish().close();\n    reservations?.finish();\n  }\n}\nregisterLayout('winding', windingLayout);\n\n"
        }
      ]
    },
    {
      "file": "src/engine/genkit.ts",
      "predecessor": "41fc4f42ef81929a9fac69f07bf401842be8cb58",
      "beforeHash": "20e656f881d4c7623018f90067f8299c5bbeefbaaf5651da5d8efdcd7ec99005",
      "afterHash": "a20d053ab4138c79a59a79f11a46c86ce9cbb93394544a0664424a9589a56d38",
      "beforeRawSha256": "20e656f881d4c7623018f90067f8299c5bbeefbaaf5651da5d8efdcd7ec99005",
      "afterRawSha256": "a20d053ab4138c79a59a79f11a46c86ce9cbb93394544a0664424a9589a56d38",
      "crlfLines": [],
      "hunks": [
        {
          "before": "// --- PAINT / MATERIALS ---------------------------------------------------------------\n\n/** Paint a mask's cells as a walk-grid REGION (per-row runs → exact fills). */\nexport function paintRegion(grid: GridWalkField, m: Mask, regionId: string): void {\n  for (let cy = 0; cy < m.rows; cy++) {\n    let run = -1;\n    for (let cx = 0; cx <= m.cols; cx++) {\n",
          "after": "// --- PAINT / MATERIALS ---------------------------------------------------------------\n\n/** Paint a mask's cells as a walk-grid REGION (per-row runs → exact fills). */\nexport function paintRegion(grid: GridWalkField, m: Mask, regionId: string,\n  recipePaint?: (x0: number, y0: number, x1: number, y1: number) => void): void {\n  for (let cy = 0; cy < m.rows; cy++) {\n    let run = -1;\n    for (let cx = 0; cx <= m.cols; cx++) {\n"
        },
        {
          "before": "      if (on && run < 0) run = cx;\n      else if (!on && run >= 0) {\n        const y0 = m.oy + cy * m.cell;\n        grid.fillRegion(m.ox + run * m.cell, y0, m.ox + cx * m.cell - 0.01, y0 + m.cell - 0.01, regionId);\n        run = -1;\n      }\n    }\n",
          "after": "      if (on && run < 0) run = cx;\n      else if (!on && run >= 0) {\n        const y0 = m.oy + cy * m.cell;\n        if (recipePaint) recipePaint(m.ox + run * m.cell, y0, m.ox + cx * m.cell - 0.01, y0 + m.cell - 0.01);\n        else grid.fillRegion(m.ox + run * m.cell, y0, m.ox + cx * m.cell - 0.01, y0 + m.cell - 0.01, regionId);\n        run = -1;\n      }\n    }\n"
        }
      ]
    },
    {
      "file": "src/data/structures.ts",
      "predecessor": "41fc4f42ef81929a9fac69f07bf401842be8cb58",
      "beforeHash": "5c90c60d46fda9b01b72fa79d44865faa9845f8c5e8e752fa6ad7d824685f2a1",
      "afterHash": "0ef8fd89d4a080e33393ad97803d666431607d0572b538f9daf8a130494cfe85",
      "beforeRawSha256": "5c90c60d46fda9b01b72fa79d44865faa9845f8c5e8e752fa6ad7d824685f2a1",
      "afterRawSha256": "0ef8fd89d4a080e33393ad97803d666431607d0572b538f9daf8a130494cfe85",
      "crlfLines": [],
      "hunks": [
        {
          "before": "  garrison?: string;\n  /** Garrison pack size override [lo, hi] (default [3, 5]). */\n  garrisonSize?: [number, number];\n  // --- plan-structure fields (all optional; legacy defs untouched) ----------\n  /** Char-grid blueprint rows (see STRUCTURE_LEGEND). Presence routes the def\n   *  through placeStructurePlan (grid-painted interiors, rect reservation). */\n",
          "after": "  garrison?: string;\n  /** Garrison pack size override [lo, hi] (default [3, 5]). */\n  garrisonSize?: [number, number];\n  /** Selecting this gameplay feature promises both the building and its one\n   * ground-floor mouth. Optional chances remain optional before selection. */\n  requiredMouth?: string;\n  // --- plan-structure fields (all optional; legacy defs untouched) ----------\n  /** Char-grid blueprint rows (see STRUCTURE_LEGEND). Presence routes the def\n   *  through placeStructurePlan (grid-painted interiors, rect reservation). */\n"
        },
        {
          "before": "  // descent — someone keeps these lights.\n  sealed_grave: {\n    id: 'sealed_grave', halfW: 91, halfH: 65, cellSize: 26,\n    plan: [\n      '#######',\n      '#z...z#',\n",
          "after": "  // descent — someone keeps these lights.\n  sealed_grave: {\n    id: 'sealed_grave', halfW: 91, halfH: 65, cellSize: 26,\n    requiredMouth: 'lone_crypt_door',\n    plan: [\n      '#######',\n      '#z...z#',\n"
        }
      ]
    },
    {
      "file": "src/engine/interiorGen.ts",
      "predecessor": "41fc4f42ef81929a9fac69f07bf401842be8cb58",
      "beforeHash": "348c1239eb024bd550e54b63918b73e18bde7c008b040b8bd64c6f5003147d60",
      "afterHash": "336d44b9f867a6f14dc572ca9275eba32caa4090604e90d4016919f9dec99c53",
      "beforeRawSha256": "348c1239eb024bd550e54b63918b73e18bde7c008b040b8bd64c6f5003147d60",
      "afterRawSha256": "336d44b9f867a6f14dc572ca9275eba32caa4090604e90d4016919f9dec99c53",
      "crlfLines": [],
      "hunks": [
        {
          "before": "\nimport { vec, type Vec2 } from '../core/math';\nimport type { StampSpec, ZoneDef } from '../data/zones';\nimport { GridWalkField } from '../world/gridWalk';\nimport {\n  doorSurfaceOf, layoutParam, layTraveledWay, registerLayout, registerTrapPass, scatterDecoration,\n  stampEntries, type DoodadDoor, type GenCtx, type PlacedDoor, type PlacedStructure,\n} from './levelgen';\nimport { ringPath, trackRider } from './tracks';\nimport { TRAPWORK_CFG } from './trapworks';\n\nconst CELL = 30;\n/** Interior margin (cells) between the arena border and any carved space. */\n",
          "after": "\nimport { vec, type Vec2 } from '../core/math';\nimport type { StampSpec, ZoneDef } from '../data/zones';\nimport { GridWalkField, createNativeInteriorGrid } from '../world/gridWalk';\nimport {\n  doorSurfaceOf, layoutParam, layTraveledWay, registerLayout, registerTrapPass, scatterDecoration,\n  stampEntries, type DoodadDoor, type GenCtx, type PlacedDoor, type PlacedStructure,\n} from './levelgen';\nimport { ringPath, trackRider } from './tracks';\nimport { TRAPWORK_CFG } from './trapworks';\nimport { installInteriorRecipeGround } from './nativeRecipeGround';\n\nconst CELL = 30;\n/** Interior margin (cells) between the arena border and any carved space. */\n"
        },
        {
          "before": "    return p === undefined ? dflt : (p as T);\n  };\n  const { rng, arena } = ctx;\n  const grid = new GridWalkField(arena.w, arena.h, CELL);\n  const wallKind = P('interiorWall', 'wall');\n  const floorKind = P('interiorFloor', 'ground');\n  // A fresh grid is all byte-0 'wall'; only a THEMED wall needs painting.\n",
          "after": "    return p === undefined ? dflt : (p as T);\n  };\n  const { rng, arena } = ctx;\n  const initial = createNativeInteriorGrid(arena.w, arena.h, CELL);\n  const { grid } = initial;\n  let handedOff = false;\n  try {\n  const wallKind = P('interiorWall', 'wall');\n  const floorKind = P('interiorFloor', 'ground');\n  // A fresh grid is all byte-0 'wall'; only a THEMED wall needs painting.\n"
        },
        {
          "before": "  // 7) ROLES — BFS depth over the FINAL edge set from the entry room, then the\n  // registry decides what the deep rooms are and how they dress.\n  ctx.walk = grid;\n  const adj: number[][] = rooms.map(() => []);\n  for (const [i, j] of edges) { adj[i].push(j); adj[j].push(i); }\n  const depth = new Array<number>(n).fill(-1);\n",
          "after": "  // 7) ROLES — BFS depth over the FINAL edge set from the entry room, then the\n  // registry decides what the deep rooms are and how they dress.\n  ctx.walk = grid;\n  if (initial.claim) {\n    installInteriorRecipeGround(ctx, grid, initial.claim);\n    handedOff = true;\n  }\n  const adj: number[][] = rooms.map(() => []);\n  for (const [i, j] of edges) { adj[i].push(j); adj[j].push(i); }\n  const depth = new Array<number>(n).fill(-1);\n"
        },
        {
          "before": "  // 8) The tileset's own clutter dresses the carved floor (walk-gated), same\n  // as rooms/flesh/mycelia.\n  scatterDecoration(ctx, def);\n}\n\n// --- THE TRAP PASS -------------------------------------------------------------\n",
          "after": "  // 8) The tileset's own clutter dresses the carved floor (walk-gated), same\n  // as rooms/flesh/mycelia.\n  scatterDecoration(ctx, def);\n  } finally {\n    if (!handedOff) initial.claim?.close();\n  }\n}\n\n// --- THE TRAP PASS -------------------------------------------------------------\n"
        }
      ]
    },
    {
      "file": "balance/nativeResidencySourceFixture.ts",
      "predecessor": "41fc4f42ef81929a9fac69f07bf401842be8cb58",
      "beforeHash": "1103cd29cc9b1c38573594f30a634d288a954460e54ddb7694a080ad5608c27e",
      "afterHash": "315ddb21d775a0df7094fa2cdfbac194b1af61cce119dbc95f4444a6d394e0d5",
      "beforeRawSha256": "1103cd29cc9b1c38573594f30a634d288a954460e54ddb7694a080ad5608c27e",
      "afterRawSha256": "315ddb21d775a0df7094fa2cdfbac194b1af61cce119dbc95f4444a6d394e0d5",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeHoldfastSourceFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n"
        }
      ]
    },
    {
      "file": "balance/check_nativeresidencysource.ts",
      "predecessor": "41fc4f42ef81929a9fac69f07bf401842be8cb58",
      "beforeHash": "481fd23dd13a736a835f21065173aec6a50a0591e9358136af2e3a18a3c4e1f3",
      "afterHash": "871021827c3bd1d7d71f8cfc4ba6905be6f9048087ea422d09a554481b389b8d",
      "beforeRawSha256": "481fd23dd13a736a835f21065173aec6a50a0591e9358136af2e3a18a3c4e1f3",
      "afterRawSha256": "871021827c3bd1d7d71f8cfc4ba6905be6f9048087ea422d09a554481b389b8d",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Mutation, byte identity and filesystem controls for the residency source boundary. */\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\n",
          "after": "/** Mutation, byte identity and filesystem controls for the residency source boundary. */\nimport assert from 'node:assert/strict';\nimport * as fs from './nativeHoldfastSourceFS';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\n"
        }
      ]
    },
    {
      "file": ".github/workflows/ci.yml",
      "predecessor": "41fc4f42ef81929a9fac69f07bf401842be8cb58",
      "beforeHash": "e97f26028773d8954a9b4e0d8ae3967a052b39386d7549f1c5a7df94c667d4dc",
      "afterHash": "d24906a1d4a2ca76503ba2e92c52f5e0cb4c52077edbecce0da5a55b63dfb299",
      "beforeRawSha256": "e97f26028773d8954a9b4e0d8ae3967a052b39386d7549f1c5a7df94c667d4dc",
      "afterRawSha256": "d24906a1d4a2ca76503ba2e92c52f5e0cb4c52077edbecce0da5a55b63dfb299",
      "crlfLines": [],
      "hunks": [
        {
          "before": "          npx tsx balance/check_nativeresidencysource.ts\n",
          "after": "          npx tsx balance/check_nativeresidencysource.ts\n          npx tsx balance/check_nativeholdfastsource.ts\n"
        }
      ]
    }
  ],
  "archives": [
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "normalSha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f",
      "rawSha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "normalSha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a",
      "rawSha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "normalSha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8",
      "rawSha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "normalSha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d",
      "rawSha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAmalgamationStageArchive.ts",
      "normalSha256": "48528ec62621be10c8fedcd035e32f3fc09b28147201ee5333b1ef5d0ff64f04",
      "rawSha256": "48528ec62621be10c8fedcd035e32f3fc09b28147201ee5333b1ef5d0ff64f04"
    },
    {
      "file": "balance/nativeAreaMenuArchive.ts",
      "normalSha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870",
      "rawSha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870"
    },
    {
      "file": "balance/nativeAreaPublicationArchive.ts",
      "normalSha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48",
      "rawSha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48"
    },
    {
      "file": "balance/nativeAreaUIActionArchive.ts",
      "normalSha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8",
      "rawSha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8"
    },
    {
      "file": "balance/nativeAreaViewQueryArchive.ts",
      "normalSha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31",
      "rawSha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31"
    },
    {
      "file": "balance/nativeArrivalCompositionArchive.ts",
      "normalSha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40",
      "rawSha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40"
    },
    {
      "file": "balance/nativeArrivalInvocationSourceArchive.ts",
      "normalSha256": "37d9dad012d1f9a26d3810aab8562143464c54fbd63fb045aa6d15fa1a5ed638",
      "rawSha256": "37d9dad012d1f9a26d3810aab8562143464c54fbd63fb045aa6d15fa1a5ed638"
    },
    {
      "file": "balance/nativeBirthLifetimeArchive.ts",
      "normalSha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22",
      "rawSha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceArchive.ts",
      "normalSha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c",
      "rawSha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c"
    },
    {
      "file": "balance/nativeBountyArrivalArchive.ts",
      "normalSha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b",
      "rawSha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionArchive.ts",
      "normalSha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918",
      "rawSha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionArchive.ts",
      "normalSha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6",
      "rawSha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6"
    },
    {
      "file": "balance/nativeCampaignCompositionArchive.ts",
      "normalSha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a",
      "rawSha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    },
    {
      "file": "balance/nativeCanvasReleaseArchive.ts",
      "normalSha256": "be35c2be7d3c25a12e0c12e52c1e4f8b0728bc48c3368af67dcc34889393b6e7",
      "rawSha256": "be35c2be7d3c25a12e0c12e52c1e4f8b0728bc48c3368af67dcc34889393b6e7"
    },
    {
      "file": "balance/nativeCaravanCompositionArchive.ts",
      "normalSha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4",
      "rawSha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4"
    },
    {
      "file": "balance/nativeCaravanExtractedReadArchive.ts",
      "normalSha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0",
      "rawSha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0"
    },
    {
      "file": "balance/nativeCaravanNewsArchive.ts",
      "normalSha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f",
      "rawSha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalArchive.ts",
      "normalSha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32",
      "rawSha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32"
    },
    {
      "file": "balance/nativeCarriedControlArchive.ts",
      "normalSha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66",
      "rawSha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66"
    },
    {
      "file": "balance/nativeClientConclusionCompositionArchive.ts",
      "normalSha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41",
      "rawSha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41"
    },
    {
      "file": "balance/nativeClientContinueArchive.ts",
      "normalSha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0",
      "rawSha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0"
    },
    {
      "file": "balance/nativeClientContinuityCompositionArchive.ts",
      "normalSha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945",
      "rawSha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945"
    },
    {
      "file": "balance/nativeClientMenuCompositionArchive.ts",
      "normalSha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496",
      "rawSha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496"
    },
    {
      "file": "balance/nativeClientPublicationCompositionArchive.ts",
      "normalSha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f",
      "rawSha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f"
    },
    {
      "file": "balance/nativeClientRuntimeArchive.ts",
      "normalSha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a",
      "rawSha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionArchive.ts",
      "normalSha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1",
      "rawSha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1"
    },
    {
      "file": "balance/nativeClientStartArchive.ts",
      "normalSha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f",
      "rawSha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionArchive.ts",
      "normalSha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1",
      "rawSha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1"
    },
    {
      "file": "balance/nativeCombatLeafVisualArchive.ts",
      "normalSha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505",
      "rawSha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505"
    },
    {
      "file": "balance/nativeCombatPresentationArchive.ts",
      "normalSha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c",
      "rawSha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c"
    },
    {
      "file": "balance/nativeCompilerPlatformReceiptArchive.ts",
      "normalSha256": "f8d389a09bbcd3438f089bd6d50a333f87d01fc5dac32d31f04f5c1fa40d02a4",
      "rawSha256": "f8d389a09bbcd3438f089bd6d50a333f87d01fc5dac32d31f04f5c1fa40d02a4"
    },
    {
      "file": "balance/nativeCompleteBirthArchive.ts",
      "normalSha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206",
      "rawSha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206"
    },
    {
      "file": "balance/nativeConclaveCompositionArchive.ts",
      "normalSha256": "48a1c1497986350fb1a5e0552684b5a607964325c0f72be5df9dde5c66d2f6bb",
      "rawSha256": "48a1c1497986350fb1a5e0552684b5a607964325c0f72be5df9dde5c66d2f6bb"
    },
    {
      "file": "balance/nativeContinuityCompositionArchive.ts",
      "normalSha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405",
      "rawSha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405"
    },
    {
      "file": "balance/nativeConvergenceRepairArchive.ts",
      "normalSha256": "b9b71e137161348e2051aa5069b9c8bba2d7e5d9be84adeda1af15b18ef04598",
      "rawSha256": "b9b71e137161348e2051aa5069b9c8bba2d7e5d9be84adeda1af15b18ef04598",
      "checkoutRawSha256": "168148e5a7868cb9e7e70c74bde47cf9b25481ac88b8005102b58bf6e44f4df1"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeArchive.ts",
      "normalSha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e",
      "rawSha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e"
    },
    {
      "file": "balance/nativeCrusadeArrivalSourceArchive.ts",
      "normalSha256": "471e489f3adbce006e275cccfececfc60d3251bd4162fe6af5b1a237fe27bc95",
      "rawSha256": "471e489f3adbce006e275cccfececfc60d3251bd4162fe6af5b1a237fe27bc95"
    },
    {
      "file": "balance/nativeCrusadeTerrainArchive.ts",
      "normalSha256": "f093dfdad3fbdec6eabfb1471b246a52d372b7ec95e36cface0c5497cbe80f16",
      "rawSha256": "f093dfdad3fbdec6eabfb1471b246a52d372b7ec95e36cface0c5497cbe80f16"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceArchive.ts",
      "normalSha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d",
      "rawSha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d"
    },
    {
      "file": "balance/nativeDesktopPerfArchive.ts",
      "normalSha256": "2cb79307ec1fb32f4c0598681cec065fc46cda019295375d86ad7b6e4cf12833",
      "rawSha256": "2cb79307ec1fb32f4c0598681cec065fc46cda019295375d86ad7b6e4cf12833"
    },
    {
      "file": "balance/nativeDimensionCatalogArchive.ts",
      "normalSha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107",
      "rawSha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107"
    },
    {
      "file": "balance/nativeDirectorBirthSourceArchive.ts",
      "normalSha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112",
      "rawSha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceArchive.ts",
      "normalSha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed",
      "rawSha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceArchive.ts",
      "normalSha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6",
      "rawSha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6"
    },
    {
      "file": "balance/nativeExactAnchorArchive.ts",
      "normalSha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d",
      "rawSha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d"
    },
    {
      "file": "balance/nativeFractureCompositionArchive.ts",
      "normalSha256": "2feba0bba34ebfe31fa6979d4c223b392fdf04d78d548471a0863a4bb68c3eb6",
      "rawSha256": "2feba0bba34ebfe31fa6979d4c223b392fdf04d78d548471a0863a4bb68c3eb6"
    },
    {
      "file": "balance/nativeFrameContactSourceArchive.ts",
      "normalSha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb",
      "rawSha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsArchive.ts",
      "normalSha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db",
      "rawSha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db"
    },
    {
      "file": "balance/nativeFullGateRepairArchive.ts",
      "normalSha256": "f1e63e5a9476c14ff847e21e0800e79ce0a62185e2a5172b167e0671ec81c19d",
      "rawSha256": "f1e63e5a9476c14ff847e21e0800e79ce0a62185e2a5172b167e0671ec81c19d",
      "checkoutRawSha256": "b02b1cfb1a01a065e726e4bc2a1f04769e05682448d74490305814af3be54821"
    },
    {
      "file": "balance/nativeGraphArchive.ts",
      "normalSha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e",
      "rawSha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e"
    },
    {
      "file": "balance/nativeGroundCurrentSourceArchive.ts",
      "normalSha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5",
      "rawSha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5"
    },
    {
      "file": "balance/nativeGroundFollowUpsOwnerArchive.ts",
      "normalSha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b",
      "rawSha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b"
    },
    {
      "file": "balance/nativeHarborArrivalArchive.ts",
      "normalSha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842",
      "rawSha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842"
    },
    {
      "file": "balance/nativeHarborServicesArchive.ts",
      "normalSha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8",
      "rawSha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8"
    },
    {
      "file": "balance/nativeHistoricalCleaveArchive.ts",
      "normalSha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd",
      "rawSha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd"
    },
    {
      "file": "balance/nativeHistoricalConcealmentArchive.ts",
      "normalSha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c",
      "rawSha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c"
    },
    {
      "file": "balance/nativeHistoryArrivalArchive.ts",
      "normalSha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450",
      "rawSha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450"
    },
    {
      "file": "balance/nativeHostClosureArchive.ts",
      "normalSha256": "9c79682e31cc6f743c25799e376668742526a9714fa0d1484962001ab6f4114e",
      "rawSha256": "9c79682e31cc6f743c25799e376668742526a9714fa0d1484962001ab6f4114e"
    },
    {
      "file": "balance/nativeHostPerformanceArchive.ts",
      "normalSha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607",
      "rawSha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "normalSha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858",
      "rawSha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
    },
    {
      "file": "balance/nativeHuntMigrationArchive.ts",
      "normalSha256": "be9e859a9ef5713ee23cb06d7dc715debdd48eccec9e3484811ef9ff8413d1d5",
      "rawSha256": "be9e859a9ef5713ee23cb06d7dc715debdd48eccec9e3484811ef9ff8413d1d5"
    },
    {
      "file": "balance/nativeInstalledSourcesArchive.ts",
      "normalSha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16",
      "rawSha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16"
    },
    {
      "file": "balance/nativeJourneyCompositionArchive.ts",
      "normalSha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07",
      "rawSha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07"
    },
    {
      "file": "balance/nativeLegacySourceRepairArchive.ts",
      "normalSha256": "25e8f1034399e80b7174a140b0f8206d8b451f7d084e13a7a41391e31a6d696d",
      "rawSha256": "25e8f1034399e80b7174a140b0f8206d8b451f7d084e13a7a41391e31a6d696d"
    },
    {
      "file": "balance/nativeLiveSiteArchive.ts",
      "normalSha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8",
      "rawSha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8"
    },
    {
      "file": "balance/nativeLoadingResponsivenessArchive.ts",
      "normalSha256": "3417fb2ef0ab8bcdd536b1a45adb448d091b6a5e9f411bfea0ddf60ad356ff90",
      "rawSha256": "3417fb2ef0ab8bcdd536b1a45adb448d091b6a5e9f411bfea0ddf60ad356ff90"
    },
    {
      "file": "balance/nativeLocalInputArchive.ts",
      "normalSha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a",
      "rawSha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a"
    },
    {
      "file": "balance/nativeLocalInputFinalArchive.ts",
      "normalSha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f",
      "rawSha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f"
    },
    {
      "file": "balance/nativeMainCastSourceArchive.ts",
      "normalSha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe",
      "rawSha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe"
    },
    {
      "file": "balance/nativeMainContentArchive.ts",
      "normalSha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604",
      "rawSha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604"
    },
    {
      "file": "balance/nativeMainHostCompositionArchive.ts",
      "normalSha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84",
      "rawSha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84"
    },
    {
      "file": "balance/nativeMainProofSourceArchive.ts",
      "normalSha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441",
      "rawSha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441"
    },
    {
      "file": "balance/nativeMainRosterCancellationArchive.ts",
      "normalSha256": "7ca74e59120fcb55d685c89caed580a00430a195834c1df2d255a64e5baa9726",
      "rawSha256": "7ca74e59120fcb55d685c89caed580a00430a195834c1df2d255a64e5baa9726"
    },
    {
      "file": "balance/nativeMainVisualSourceArchive.ts",
      "normalSha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d",
      "rawSha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d"
    },
    {
      "file": "balance/nativeMergeSourceArchive.ts",
      "normalSha256": "5e58ee5acba68c3f1493f53933b957ee766f9c339cb4c6bb4e59748d818ac7eb",
      "rawSha256": "5e58ee5acba68c3f1493f53933b957ee766f9c339cb4c6bb4e59748d818ac7eb"
    },
    {
      "file": "balance/nativeNearScaleSelectionArchive.ts",
      "normalSha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5",
      "rawSha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5"
    },
    {
      "file": "balance/nativeNemesisDepartureArchive.ts",
      "normalSha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c",
      "rawSha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionArchive.ts",
      "normalSha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92",
      "rawSha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "normalSha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223",
      "rawSha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    },
    {
      "file": "balance/nativeOdysseyHistoricalRescueArchive.ts",
      "normalSha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4",
      "rawSha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4"
    },
    {
      "file": "balance/nativeOdysseyPressureArchive.ts",
      "normalSha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1",
      "rawSha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1"
    },
    {
      "file": "balance/nativePartyArchive.ts",
      "normalSha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582",
      "rawSha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582"
    },
    {
      "file": "balance/nativePartyDeathArchive.ts",
      "normalSha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d",
      "rawSha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d"
    },
    {
      "file": "balance/nativeRealmContextArchive.ts",
      "normalSha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6",
      "rawSha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6"
    },
    {
      "file": "balance/nativeRepeatEventArchive.ts",
      "normalSha256": "1c87579238125a790b59f430894d4786e9675927e3b099637713536ebef159e8",
      "rawSha256": "1c87579238125a790b59f430894d4786e9675927e3b099637713536ebef159e8"
    },
    {
      "file": "balance/nativeRescueAnchorArchive.ts",
      "normalSha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05",
      "rawSha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05"
    },
    {
      "file": "balance/nativeRunConclusionArchive.ts",
      "normalSha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d",
      "rawSha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeArchive.ts",
      "normalSha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0",
      "rawSha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0"
    },
    {
      "file": "balance/nativeSaveOrderWatchArchive.ts",
      "normalSha256": "5ac2dd2c10684e8323ff3b7787a5f4383ae9894b2c4b67f9b59fd9adc84c70a9",
      "rawSha256": "5ac2dd2c10684e8323ff3b7787a5f4383ae9894b2c4b67f9b59fd9adc84c70a9"
    },
    {
      "file": "balance/nativeSaveWriteOrderArchive.ts",
      "normalSha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14",
      "rawSha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14"
    },
    {
      "file": "balance/nativeSceneAIArchive.ts",
      "normalSha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a",
      "rawSha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a"
    },
    {
      "file": "balance/nativeSceneCampaignFrameArchive.ts",
      "normalSha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad",
      "rawSha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad"
    },
    {
      "file": "balance/nativeSceneCampaignFrameAttendanceArchive.ts",
      "normalSha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1",
      "rawSha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureArchive.ts",
      "normalSha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb",
      "rawSha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb"
    },
    {
      "file": "balance/nativeSceneCampaignTransitionsArchive.ts",
      "normalSha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da",
      "rawSha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da"
    },
    {
      "file": "balance/nativeSceneCastingPreparationArchive.ts",
      "normalSha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11",
      "rawSha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationArchive.ts",
      "normalSha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a",
      "rawSha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a"
    },
    {
      "file": "balance/nativeSceneCombatCampaignArenaArchive.ts",
      "normalSha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160",
      "rawSha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160"
    },
    {
      "file": "balance/nativeSceneCombatHooksArchive.ts",
      "normalSha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e",
      "rawSha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e"
    },
    {
      "file": "balance/nativeSceneCombatKernelArchive.ts",
      "normalSha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af",
      "rawSha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af"
    },
    {
      "file": "balance/nativeSceneCombatMotionArchive.ts",
      "normalSha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a",
      "rawSha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a"
    },
    {
      "file": "balance/nativeSceneCombatMotionHooksArchive.ts",
      "normalSha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50",
      "rawSha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50"
    },
    {
      "file": "balance/nativeSceneCombatRecordSelectionArchive.ts",
      "normalSha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86",
      "rawSha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86"
    },
    {
      "file": "balance/nativeSceneCombatStateArchive.ts",
      "normalSha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df",
      "rawSha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationArchive.ts",
      "normalSha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22",
      "rawSha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22"
    },
    {
      "file": "balance/nativeSceneDefensePreparationArchive.ts",
      "normalSha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f",
      "rawSha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationArchive.ts",
      "normalSha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02",
      "rawSha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02"
    },
    {
      "file": "balance/nativeSceneDisplacementArchive.ts",
      "normalSha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a",
      "rawSha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationArchive.ts",
      "normalSha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2",
      "rawSha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2"
    },
    {
      "file": "balance/nativeSceneFrameArchive.ts",
      "normalSha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba",
      "rawSha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba"
    },
    {
      "file": "balance/nativeSceneFrameAttendanceArchive.ts",
      "normalSha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71",
      "rawSha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71"
    },
    {
      "file": "balance/nativeSceneFrameCallbacksArchive.ts",
      "normalSha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0",
      "rawSha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0"
    },
    {
      "file": "balance/nativeSceneFrameClosureArchive.ts",
      "normalSha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58",
      "rawSha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58"
    },
    {
      "file": "balance/nativeSceneFrameHooksArchive.ts",
      "normalSha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5",
      "rawSha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5"
    },
    {
      "file": "balance/nativeSceneFrameInterfacesArchive.ts",
      "normalSha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77",
      "rawSha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsArchive.ts",
      "normalSha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c",
      "rawSha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationArchive.ts",
      "normalSha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8",
      "rawSha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8"
    },
    {
      "file": "balance/nativeSceneInputArchive.ts",
      "normalSha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1",
      "rawSha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1"
    },
    {
      "file": "balance/nativeSceneKillAftermathArchive.ts",
      "normalSha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8",
      "rawSha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationArchive.ts",
      "normalSha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7",
      "rawSha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7"
    },
    {
      "file": "balance/nativeSceneLootArchive.ts",
      "normalSha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20",
      "rawSha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20"
    },
    {
      "file": "balance/nativeSceneMemoryArchive.ts",
      "normalSha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e",
      "rawSha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionArchive.ts",
      "normalSha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe",
      "rawSha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingArchive.ts",
      "normalSha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d",
      "rawSha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d"
    },
    {
      "file": "balance/nativeSceneProgressionArchive.ts",
      "normalSha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f",
      "rawSha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f"
    },
    {
      "file": "balance/nativeSceneProjectileArchive.ts",
      "normalSha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33",
      "rawSha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33"
    },
    {
      "file": "balance/nativeScenePuzzleArchive.ts",
      "normalSha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443",
      "rawSha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443"
    },
    {
      "file": "balance/nativeSceneQuestArchive.ts",
      "normalSha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c",
      "rawSha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c"
    },
    {
      "file": "balance/nativeSceneQuestAuxArchive.ts",
      "normalSha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a",
      "rawSha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a"
    },
    {
      "file": "balance/nativeSceneQuestInteractionArchive.ts",
      "normalSha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062",
      "rawSha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062"
    },
    {
      "file": "balance/nativeSceneRestorationArchive.ts",
      "normalSha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0",
      "rawSha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationArchive.ts",
      "normalSha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b",
      "rawSha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b"
    },
    {
      "file": "balance/nativeSceneSummonPreparationArchive.ts",
      "normalSha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c",
      "rawSha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationArchive.ts",
      "normalSha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca",
      "rawSha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca"
    },
    {
      "file": "balance/nativeSceneTetherArchive.ts",
      "normalSha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101",
      "rawSha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101"
    },
    {
      "file": "balance/nativeSeamlessConsolidationArchive.ts",
      "normalSha256": "cd887e3ff558e684038a23ebbc64d6a436eab6ccccf88bc3a518031ff467ef9d",
      "rawSha256": "cd887e3ff558e684038a23ebbc64d6a436eab6ccccf88bc3a518031ff467ef9d"
    },
    {
      "file": "balance/nativeShardEntryLifetimeArchive.ts",
      "normalSha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa",
      "rawSha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa"
    },
    {
      "file": "balance/nativeShardFoundationArchive.ts",
      "normalSha256": "831898e76223802e8461fc15c2ab7b1bb057a55a825ac75bd2b243bec80ce17f",
      "rawSha256": "831898e76223802e8461fc15c2ab7b1bb057a55a825ac75bd2b243bec80ce17f"
    },
    {
      "file": "balance/nativeShardGroundArchive.ts",
      "normalSha256": "7514fa70975ccbba0f1f1126344dcefa8222e2ad8b662969419af323e1b52cbb",
      "rawSha256": "7514fa70975ccbba0f1f1126344dcefa8222e2ad8b662969419af323e1b52cbb"
    },
    {
      "file": "balance/nativeShardKeeperArchive.ts",
      "normalSha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518",
      "rawSha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518"
    },
    {
      "file": "balance/nativeShardKeeperCompositionArchive.ts",
      "normalSha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8",
      "rawSha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8"
    },
    {
      "file": "balance/nativeShardMusterArchive.ts",
      "normalSha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837",
      "rawSha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837"
    },
    {
      "file": "balance/nativeShardProbeDeliveryArchive.ts",
      "normalSha256": "cb71b3250ecd21d7a0cc327583337dbb57a72bb36b304aaf08ab9a5733880b8c",
      "rawSha256": "cb71b3250ecd21d7a0cc327583337dbb57a72bb36b304aaf08ab9a5733880b8c"
    },
    {
      "file": "balance/nativeShardPublicationArchive.ts",
      "normalSha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4",
      "rawSha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4"
    },
    {
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "normalSha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01",
      "rawSha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "normalSha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c",
      "rawSha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardsCompositionArchive.ts",
      "normalSha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b",
      "rawSha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b"
    },
    {
      "file": "balance/nativeShardsLegacySourceArchive.ts",
      "normalSha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd",
      "rawSha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd"
    },
    {
      "file": "balance/nativeSidezoneFurnishArchive.ts",
      "normalSha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75",
      "rawSha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75"
    },
    {
      "file": "balance/nativeSkyArchive.ts",
      "normalSha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b",
      "rawSha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b"
    },
    {
      "file": "balance/nativeSummonAsyncBoundaryArchive.ts",
      "normalSha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b",
      "rawSha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderArchive.ts",
      "normalSha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f",
      "rawSha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceArchive.ts",
      "normalSha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0",
      "rawSha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0"
    },
    {
      "file": "balance/nativeTitanAttendanceArchive.ts",
      "normalSha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8",
      "rawSha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8"
    },
    {
      "file": "balance/nativeTitanReceiptArchive.ts",
      "normalSha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc",
      "rawSha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc"
    },
    {
      "file": "balance/nativeTownClientCompositionArchive.ts",
      "normalSha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b",
      "rawSha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b"
    },
    {
      "file": "balance/nativeTownConclusionCompositionArchive.ts",
      "normalSha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff",
      "rawSha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff"
    },
    {
      "file": "balance/nativeTownFreshFoldArchive.ts",
      "normalSha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f",
      "rawSha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionArchive.ts",
      "normalSha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8",
      "rawSha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8"
    },
    {
      "file": "balance/nativeTownStationArchive.ts",
      "normalSha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4",
      "rawSha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4"
    },
    {
      "file": "balance/nativeVendettaCompositionArchive.ts",
      "normalSha256": "b9dd6eb5354813c5fe9fd02cedc0b9420e6f82b47c9870ff150c9c4080c6dcc6",
      "rawSha256": "b9dd6eb5354813c5fe9fd02cedc0b9420e6f82b47c9870ff150c9c4080c6dcc6"
    },
    {
      "file": "balance/nativeVerminfallArrivalSourceArchive.ts",
      "normalSha256": "4fa454266fb8684c99cff9fcff473414d614011557dd0dcf933c5ee50cb702b9",
      "rawSha256": "4fa454266fb8684c99cff9fcff473414d614011557dd0dcf933c5ee50cb702b9"
    },
    {
      "file": "balance/nativeVerminfallSourceArchive.ts",
      "normalSha256": "01bcc7a2263e52cb0219affdd74f6b05667f958df289ee6ca309ad03688618ae",
      "rawSha256": "01bcc7a2263e52cb0219affdd74f6b05667f958df289ee6ca309ad03688618ae"
    },
    {
      "file": "balance/nativeVoyageTransitionArchive.ts",
      "normalSha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac",
      "rawSha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac"
    },
    {
      "file": "balance/nativeWarlordArrivalArchive.ts",
      "normalSha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8",
      "rawSha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8"
    }
  ],
  "dependencies": [
    {
      "file": "scripts/residency-launcher-fixture.cjs",
      "normalSha256": "26607f82e177ee9624bb3fd75dd9c125777a0c23853d2596243f50eb2793ffc9",
      "rawSha256": "26607f82e177ee9624bb3fd75dd9c125777a0c23853d2596243f50eb2793ffc9"
    },
    {
      "file": "scripts/residency-launcher-course.cjs",
      "normalSha256": "d563cf1335db0dc97a13af44cb55a1bc497cf7c591f26a7a8e2edea163b61234",
      "rawSha256": "d563cf1335db0dc97a13af44cb55a1bc497cf7c591f26a7a8e2edea163b61234"
    },
    {
      "file": "scripts/test-residency-launcher-course.mjs",
      "normalSha256": "de1ef33a6feef87e2bfd3259a81dbea5044677615b021e759de517d95b8428e7",
      "rawSha256": "de1ef33a6feef87e2bfd3259a81dbea5044677615b021e759de517d95b8428e7"
    },
    {
      "file": "docs/design/desktop-residency.md",
      "normalSha256": "c4e118fcd8c76acb55f3427bae763adf9d37c601f5416946a2a0ff8e1d98a75d",
      "rawSha256": "c4e118fcd8c76acb55f3427bae763adf9d37c601f5416946a2a0ff8e1d98a75d"
    },
    {
      "file": "balance/nativeResidencySourceArchive.ts",
      "normalSha256": "694b38325aee8589155769623397367ae84aad29f9125071871287255eff2fea",
      "rawSha256": "694b38325aee8589155769623397367ae84aad29f9125071871287255eff2fea"
    }
  ],
  "unchanged": [
    {
      "file": "balance/proberoster.ts",
      "normalSha256": "63700ea35d9b3726ceef55aa297ac4b40b718ca871e9f53ed543e698b0aa56ed",
      "rawSha256": "63700ea35d9b3726ceef55aa297ac4b40b718ca871e9f53ed543e698b0aa56ed"
    },
    {
      "file": "balance/probe_holdfast_pocket.ts",
      "normalSha256": "674b2c9f5dc2ef0ac2e3a5584831ad43d8de0e828f695f45122c9294f4bc445f",
      "rawSha256": "674b2c9f5dc2ef0ac2e3a5584831ad43d8de0e828f695f45122c9294f4bc445f"
    },
    {
      "file": "balance/probe_lonecrypt.ts",
      "normalSha256": "43b6f716fc0f3183289fa8255a7ca7d3316e1a1053a5a2e137b4f83432368c17",
      "rawSha256": "43b6f716fc0f3183289fa8255a7ca7d3316e1a1053a5a2e137b4f83432368c17"
    },
    {
      "file": "balance/probe_nativesidezonefurnishstate.ts",
      "normalSha256": "4b35bfd4deb268562be4827618059c140e7d6f7c373e2a66640567eb5dd1aa0d",
      "rawSha256": "4b35bfd4deb268562be4827618059c140e7d6f7c373e2a66640567eb5dd1aa0d"
    },
    {
      "file": "balance/probe_nativestructureaccess.ts",
      "normalSha256": "57ec2e589de2cbcb86fe73cb918070176f4f9ceff628cba16fc84b8caf3452d9",
      "rawSha256": "57ec2e589de2cbcb86fe73cb918070176f4f9ceff628cba16fc84b8caf3452d9"
    },
    {
      "file": "balance/probe_pourshape.ts",
      "normalSha256": "4c55e99464e9fbcde850026886097a7a63f08fbf2628a9a538ae354690a8ae3c",
      "rawSha256": "4c55e99464e9fbcde850026886097a7a63f08fbf2628a9a538ae354690a8ae3c"
    }
  ],
  "current": [
    {
      "file": ".github/workflows/ci.yml",
      "normalSha256": "d24906a1d4a2ca76503ba2e92c52f5e0cb4c52077edbecce0da5a55b63dfb299",
      "rawSha256": "d24906a1d4a2ca76503ba2e92c52f5e0cb4c52077edbecce0da5a55b63dfb299"
    },
    {
      "file": "balance/check_nativeholdfastsource.ts",
      "normalSha256": "b9a50d03aff704ba841c67ef1eb63cf8a1e68cbda2cce7f20387dc3c97b4d9fb",
      "rawSha256": "b9a50d03aff704ba841c67ef1eb63cf8a1e68cbda2cce7f20387dc3c97b4d9fb"
    },
    {
      "file": "balance/check_nativeresidencysource.ts",
      "normalSha256": "871021827c3bd1d7d71f8cfc4ba6905be6f9048087ea422d09a554481b389b8d",
      "rawSha256": "871021827c3bd1d7d71f8cfc4ba6905be6f9048087ea422d09a554481b389b8d"
    },
    {
      "file": "balance/nativeHoldfastSourceFixture.ts",
      "normalSha256": "e602d19093a07a531b6cf056e8bb5c5a31bda4dec19174f9993560f2197047e6",
      "rawSha256": "e602d19093a07a531b6cf056e8bb5c5a31bda4dec19174f9993560f2197047e6"
    },
    {
      "file": "balance/nativeHoldfastSourceFS.ts",
      "normalSha256": "5f48cce67225308dca398a0e61fc93b8aa9d3d34573ff285b127e772822d40ff",
      "rawSha256": "5f48cce67225308dca398a0e61fc93b8aa9d3d34573ff285b127e772822d40ff"
    },
    {
      "file": "balance/nativeResidencySourceFixture.ts",
      "normalSha256": "315ddb21d775a0df7094fa2cdfbac194b1af61cce119dbc95f4444a6d394e0d5",
      "rawSha256": "315ddb21d775a0df7094fa2cdfbac194b1af61cce119dbc95f4444a6d394e0d5"
    },
    {
      "file": "src/data/structures.ts",
      "normalSha256": "0ef8fd89d4a080e33393ad97803d666431607d0572b538f9daf8a130494cfe85",
      "rawSha256": "0ef8fd89d4a080e33393ad97803d666431607d0572b538f9daf8a130494cfe85"
    },
    {
      "file": "src/engine/genkit.ts",
      "normalSha256": "a20d053ab4138c79a59a79f11a46c86ce9cbb93394544a0664424a9589a56d38",
      "rawSha256": "a20d053ab4138c79a59a79f11a46c86ce9cbb93394544a0664424a9589a56d38"
    },
    {
      "file": "src/engine/interiorGen.ts",
      "normalSha256": "336d44b9f867a6f14dc572ca9275eba32caa4090604e90d4016919f9dec99c53",
      "rawSha256": "336d44b9f867a6f14dc572ca9275eba32caa4090604e90d4016919f9dec99c53"
    },
    {
      "file": "src/engine/layoutRecipes.ts",
      "normalSha256": "b0252ac8db0fd240c5fbfd613eb4454c1c566a7ab00ecaf4d18bf5446f5e032a",
      "rawSha256": "b0252ac8db0fd240c5fbfd613eb4454c1c566a7ab00ecaf4d18bf5446f5e032a"
    },
    {
      "file": "src/engine/levelgen.ts",
      "normalSha256": "99dd855ed922e9cc816fdf144817e445d7d9ba2f56928cf95afc09918b92f0a8",
      "rawSha256": "99dd855ed922e9cc816fdf144817e445d7d9ba2f56928cf95afc09918b92f0a8"
    },
    {
      "file": "src/engine/nativeRecipeGround.ts",
      "normalSha256": "554b73118b9b2ecd70ced86995b6589c02edc88705931c4b7f144406793a5f99",
      "rawSha256": "554b73118b9b2ecd70ced86995b6589c02edc88705931c4b7f144406793a5f99"
    },
    {
      "file": "src/engine/nativeStructureProof.ts",
      "normalSha256": "d948b82857fc8dadf46ed76f6c45733d25d2410231c6a8617772f68fc69f281b",
      "rawSha256": "d948b82857fc8dadf46ed76f6c45733d25d2410231c6a8617772f68fc69f281b"
    },
    {
      "file": "src/world/gridWalk.ts",
      "normalSha256": "cf133066cc70381485557aefb70364d7dfbb80e51f9005fa21eb9c89346eedbe",
      "rawSha256": "cf133066cc70381485557aefb70364d7dfbb80e51f9005fa21eb9c89346eedbe"
    }
  ]
};
