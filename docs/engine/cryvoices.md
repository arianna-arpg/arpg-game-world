# THE CRY VOICES — the combat cries' drawn twins (M-CRY)

*The last rung of the show-don't-tell ladder (`docs/design/show-dont-tell.md`
§3f/§5). Render seat `src/render/vis/cryVoices.ts`; engine seat `World.cry`;
probe `balance/probe_cryvoices.ts`.*

## The law

The combat cries — 'PARRY!', 'block!', 'evade', 'immune', 'resisted', 'guard
broken!', 'SHELL BREAKS!', 'BROKEN!'/'POISED', the timing cries ('Perfect!',
'Flawless!', 'On the spark!', 'crit mend!', 'crit affliction!'), 'aftershock!',
'shield bash!' — NAME THE RULE that fired: the D2/PoE readability vocabulary,
precision-adjacent, so they KEEP their words. But a cry was a bare `this.text`
at sixteen seats, un-kinded — the player could not mute it — and the ring beside
it (where one stood) was the generic pop. M-CRY does two things at every seat:

1. **Kinds the cry `combat`** (`Settings.floatKinds` → `floatKindOn`): every cry
   mutes with the toggle. Numbers ('IMPALED n') are kinded with no twin.
2. **Gives it a DRAWN TWIN** — `World.cry(at, text, color, size, fx?, radius?,
   facing?)` pushes the kinded floater AND a flash wearing an effect voice at the
   same seat (life 0.22s), so the read survives the mute.

| cry | twin (voice) | seat |
|---|---|---|
| PARRY! | **clash** — two bright strokes crossing + a core flare (the spark at the weapon) | the guardian's weapon point (pos + facing × (radius+10)), facing carried |
| blocked / block! / shield bash! | **glint** — a short white highlight sweeping the shield's rim | the shield point (blocked reuses its own flash; block! at the body) |
| evade | **blur** — fading ghosts trailing BEHIND the move | the body, facing carried |
| immune / resisted / POISED | **ward** — a flat grey ring, thin, steady, no growth, six ticks | the body (radius + 8) |
| guard broken! / SHELL BREAKS! / BROKEN! | **shatter** (the dissolution grammar's voice) | the body |
| Perfect! / Flawless! / release! / On the spark! / crit mend! / crit affliction! | **wink** (the blessing's voice) | the caster / the mend seat |
| aftershock! | **ripple** | the shock seat |
| AMBUSH! / backstab! / SHATTER! / CULLED! / volatile! / IMPALED n | — (already kinded; the kill flash / status voice / number speak) | — |

The four new voices are pure painters on THE EFFECT VOICE registry
(`render/vis/effectVoice.ts`), dials in `VIS_CFG.cryVoice` (all unblessed);
the renderer imports the module for its side effect. A new cry is one
`this.cry(...)` line naming any registered voice.

## Moved, not muted

`ART WITNESSED` / `ART CAPTURED` (the mimic's art ledger) were head floaters
at the monster; a ledger note is NEWS, not a blow — they now ride the notice
feed's 'world' channel (`World.notice`, the M-NEWS seam).

## Gates

`npx tsx balance/probe_cryvoices.ts` (fast lane of `npm run probe`): the
voices registered, `World.cry`'s floater + flash contract, the source census
(no bare un-kinded cry; the twins at their seats; ART on the feed; the renderer
import).
