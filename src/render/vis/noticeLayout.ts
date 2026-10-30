import { wrapSpeech } from './speech';

/** Notices preserve whole words where possible, but even an unspaced modded
 * name must fit. A bounded row budget marks omitted text explicitly. Pure
 * presentation: no bulletin text, lifetime or channel is modified. */
export function wrapNotice(text: string, width: number, limit: number, measure: (text: string) => number): string[] {
  if (width <= 0 || limit < 1) return [];
  const lines: string[] = [];
  for (const line of wrapSpeech(text, width, measure)) {
    if (measure(line) <= width) lines.push(line);
    else {
      let chunk = '';
      for (const letter of Array.from(line)) {
        if (chunk && measure(chunk + letter) > width) { lines.push(chunk); chunk = ''; }
        chunk += letter;
      }
      if (chunk) lines.push(chunk);
    }
  }
  const clipped = lines.slice(0, limit);
  if (lines.length > limit) {
    const tail = Array.from(clipped[limit - 1]);
    while (tail.length && measure(tail.join('') + '…') > width) tail.pop();
    clipped[limit - 1] = measure('…') <= width ? tail.join('').trimEnd() + '…' : '';
  }
  return clipped;
}
