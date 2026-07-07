// ---------------------------------------------------------------------------
// Shared DOM helpers for the UI layer.
// ---------------------------------------------------------------------------

/** Escape a string for interpolation into innerHTML — safe for both text
 *  content and double-quoted attribute values. */
export const esc = (s: string): string =>
  s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c));
