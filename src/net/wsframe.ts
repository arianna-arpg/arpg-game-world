// ---------------------------------------------------------------------------
// THE WIRE FRAME — RFC 6455 (WebSocket) framing as PURE functions over
// Uint8Array, browser-safe and dependency-free (THE CLEAN TREE: the tree
// carries zero runtime dependencies, so the shard's socket speaks the
// protocol itself instead of pulling a library). The SERVER half of the
// shard (server/shardTransport.ts) is the only producer/consumer today: a
// browser or Node client speaks WebSocket natively and never sees this.
//
// Scope, honest: text + binary frames, fragmentation (continuation frames
// assembled per message), the three control frames (close / ping / pong),
// client→server masking (unmasked here), server→client frames written
// UNMASKED (the RFC forbids a server to mask). No extensions (permessage-
// deflate is declined by never negotiating it), no subprotocols.
// ---------------------------------------------------------------------------

/** The RFC's handshake GUID: accept = base64(sha1(key + WS_GUID)). */
export const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** THE INBOX LAWS: a message may span at most `maxFragments` frames, and
 *  every fragment is charged at least `fragmentMinCost` bytes against the
 *  message cap — an endless stream of empty continuations used to grow the
 *  fragment list without bound (2 GB of heap off 64 MB of wire). */
export const WS_FRAME_CFG = {
  maxFragments: 64,
  fragmentMinCost: 1024,
};

export const WS_OP = {
  continuation: 0x0, text: 0x1, binary: 0x2, close: 0x8, ping: 0x9, pong: 0xa,
} as const;

export interface WsFrame {
  fin: boolean;
  opcode: number;
  payload: Uint8Array;
}

/** One message as the assembler hands it up: a whole text/binary message,
 *  or a control frame (which never fragments). */
export type WsMessage =
  | { kind: 'text'; text: string }
  | { kind: 'binary'; data: Uint8Array }
  | { kind: 'ping'; data: Uint8Array }
  | { kind: 'pong'; data: Uint8Array }
  | { kind: 'close'; code: number; reason: string };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Encode one frame, server-style (unmasked). `fin` false starts/continues a
 *  fragmented message; the shard never fragments, every message is one frame. */
export function encodeFrame(opcode: number, payload: Uint8Array, fin = true): Uint8Array {
  const len = payload.length;
  const header = len < 126 ? 2 : len < 65536 ? 4 : 10;
  const out = new Uint8Array(header + len);
  out[0] = (fin ? 0x80 : 0) | (opcode & 0x0f);
  if (len < 126) {
    out[1] = len;
  } else if (len < 65536) {
    out[1] = 126; out[2] = len >>> 8; out[3] = len & 0xff;
  } else {
    out[1] = 127;
    const hi = Math.floor(len / 4294967296), lo = len >>> 0;
    out[2] = (hi >>> 24) & 0xff; out[3] = (hi >>> 16) & 0xff; out[4] = (hi >>> 8) & 0xff; out[5] = hi & 0xff;
    out[6] = (lo >>> 24) & 0xff; out[7] = (lo >>> 16) & 0xff; out[8] = (lo >>> 8) & 0xff; out[9] = lo & 0xff;
  }
  out.set(payload, header);
  return out;
}

export const encodeText = (text: string): Uint8Array => encodeFrame(WS_OP.text, encoder.encode(text));
export const encodePing = (data: Uint8Array = new Uint8Array(0)): Uint8Array => encodeFrame(WS_OP.ping, data);
export const encodePong = (data: Uint8Array = new Uint8Array(0)): Uint8Array => encodeFrame(WS_OP.pong, data);

/** A close frame: 2-byte status code + optional UTF-8 reason (≤ 123 bytes). */
export function encodeClose(code = 1000, reason = ''): Uint8Array {
  const r = encoder.encode(reason).subarray(0, 123);
  const p = new Uint8Array(2 + r.length);
  p[0] = (code >>> 8) & 0xff; p[1] = code & 0xff; p.set(r, 2);
  return encodeFrame(WS_OP.close, p);
}

export interface DecodeResult {
  frames: WsFrame[];
  /** Bytes left over (an incomplete trailing frame) — prepend to the next chunk. */
  rest: Uint8Array;
  /** A protocol violation: the connection must close with 1002 / 1009. */
  error?: { code: number; reason: string };
}

/** Parse every COMPLETE frame at the head of `buf`. Client frames arrive
 *  masked and are unmasked here; a frame longer than `maxPayload` is refused
 *  (1009), a malformed control frame or a masked-server-frame mix-up is a
 *  protocol error (1002). Pure: never throws, never keeps state. */
export function decodeFrames(buf: Uint8Array, maxPayload: number, expectMasked = true): DecodeResult {
  const frames: WsFrame[] = [];
  let off = 0;
  while (buf.length - off >= 2) {
    const b0 = buf[off], b1 = buf[off + 1];
    const fin = (b0 & 0x80) !== 0;
    const rsv = b0 & 0x70;
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let hdr = 2;
    if (rsv !== 0) return { frames, rest: buf.subarray(off), error: { code: 1002, reason: 'reserved bits set' } };
    if (opcode >= 0x8) {
      // Control frames: never fragmented, payload ≤ 125.
      if (!fin || len > 125) return { frames, rest: buf.subarray(off), error: { code: 1002, reason: 'bad control frame' } };
    } else if (opcode > 0x2) {
      return { frames, rest: buf.subarray(off), error: { code: 1002, reason: `unknown opcode ${opcode}` } };
    }
    if (masked !== expectMasked) return { frames, rest: buf.subarray(off), error: { code: 1002, reason: masked ? 'masked server frame' : 'unmasked client frame' } };
    if (len === 126) {
      if (buf.length - off < 4) break;
      len = (buf[off + 2] << 8) | buf[off + 3];
      hdr = 4;
    } else if (len === 127) {
      if (buf.length - off < 10) break;
      const hi = ((buf[off + 2] << 24) >>> 0) + (buf[off + 3] << 16) + (buf[off + 4] << 8) + buf[off + 5];
      const lo = ((buf[off + 6] << 24) >>> 0) + (buf[off + 7] << 16) + (buf[off + 8] << 8) + buf[off + 9];
      if (hi !== 0 || lo > maxPayload) return { frames, rest: buf.subarray(off), error: { code: 1009, reason: 'frame too large' } };
      len = lo;
      hdr = 10;
    }
    if (len > maxPayload) return { frames, rest: buf.subarray(off), error: { code: 1009, reason: 'frame too large' } };
    const maskLen = masked ? 4 : 0;
    if (buf.length - off < hdr + maskLen + len) break; // incomplete — wait for more bytes
    const payload = new Uint8Array(len);
    const start = off + hdr + maskLen;
    if (masked) {
      const m0 = buf[off + hdr], m1 = buf[off + hdr + 1], m2 = buf[off + hdr + 2], m3 = buf[off + hdr + 3];
      for (let i = 0; i < len; i++) {
        const k = (i & 3) === 0 ? m0 : (i & 3) === 1 ? m1 : (i & 3) === 2 ? m2 : m3;
        payload[i] = buf[start + i] ^ k;
      }
    } else {
      payload.set(buf.subarray(start, start + len));
    }
    frames.push({ fin, opcode, payload });
    off = start + len;
  }
  return { frames, rest: off === 0 ? buf : buf.subarray(off) };
}

/** Stateful per-connection assembler: feeds raw chunks through decodeFrames,
 *  stitches fragmented messages, and hands up whole WsMessages. On a protocol
 *  error it reports once and refuses further input (the caller closes). */
export class WsMessageAssembler {
  /** THE GROWABLE INBOX: bytes not yet parsed live here, appended in
   *  amortized-linear time and compacted only when frames are consumed —
   *  a frame trickled in 64-byte chunks used to cost a copy of the whole
   *  inbox per chunk (half a second of the tick thread per 256 KB frame). */
  private buf = new Uint8Array(0);
  private len = 0;
  private fragOp = -1;
  private frag: Uint8Array[] = [];
  private fragBytes = 0;
  private fragCost = 0;
  error: { code: number; reason: string } | null = null;

  constructor(private readonly maxMessage = 8 * 1024 * 1024, private readonly expectMasked = true) {}

  /** Bytes buffered and unparsed (a connection's own memory ledger). */
  get buffered(): number { return this.len; }

  push(chunk: Uint8Array): WsMessage[] {
    if (this.error) return [];
    if (this.len + chunk.length > this.buf.length) {
      let cap = Math.max(1024, this.buf.length * 2);
      while (cap < this.len + chunk.length) cap *= 2;
      const grown = new Uint8Array(cap);
      grown.set(this.buf.subarray(0, this.len));
      this.buf = grown;
    }
    this.buf.set(chunk, this.len);
    this.len += chunk.length;
    const { frames, rest, error } = decodeFrames(this.buf.subarray(0, this.len), this.maxMessage, this.expectMasked);
    if (rest.length !== this.len) {
      if (rest.length) this.buf.copyWithin(0, this.len - rest.length, this.len);
      this.len = rest.length;
      if (this.len === 0 && this.buf.length > 256 * 1024) this.buf = new Uint8Array(0); // a drained giant inbox lets its memory go
    }
    const out: WsMessage[] = [];
    for (const f of frames) {
      if (f.opcode === WS_OP.ping) { out.push({ kind: 'ping', data: f.payload }); continue; }
      if (f.opcode === WS_OP.pong) { out.push({ kind: 'pong', data: f.payload }); continue; }
      if (f.opcode === WS_OP.close) {
        const code = f.payload.length >= 2 ? (f.payload[0] << 8) | f.payload[1] : 1005;
        const reason = f.payload.length > 2 ? decoder.decode(f.payload.subarray(2)) : '';
        out.push({ kind: 'close', code, reason });
        continue;
      }
      if (f.opcode === WS_OP.continuation) {
        if (this.fragOp < 0) { this.fail(1002, 'continuation without a start'); break; }
      } else {
        if (this.fragOp >= 0) { this.fail(1002, 'new message inside a fragmented one'); break; }
        this.fragOp = f.opcode;
      }
      this.frag.push(f.payload);
      this.fragBytes += f.payload.length;
      this.fragCost += Math.max(f.payload.length, WS_FRAME_CFG.fragmentMinCost);
      if (this.fragCost > this.maxMessage) { this.fail(1009, 'message too large'); break; }
      if (this.frag.length > WS_FRAME_CFG.maxFragments) { this.fail(1008, 'too many fragments'); break; }
      if (!f.fin) continue;
      const whole = this.frag.length === 1 ? this.frag[0] : concat(this.frag, this.fragBytes);
      const op = this.fragOp;
      this.fragOp = -1; this.frag = []; this.fragBytes = 0; this.fragCost = 0;
      out.push(op === WS_OP.text ? { kind: 'text', text: decoder.decode(whole) } : { kind: 'binary', data: whole });
    }
    if (error && !this.error) this.error = error;
    return out;
  }

  private fail(code: number, reason: string): void { this.error = { code, reason }; }
}

function concat(parts: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
