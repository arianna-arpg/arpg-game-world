# Classic feedback and shared debuff presentation

Options → Visuals → Skill Faces → ACRONYMS restores main's original face:
solid skill-color tiles and small dark initials on the hotbar; native inherited
fonts and colors in the rack, bag, vendor and Memory chips. Initials are the
first three space-delimited words; Recall is REC. Artwork remains the saved,
independent preference supplied by the separate skill-illustration pass.
Cooldowns, affordability, slots and controls retain their native behavior.

Options → Visuals → Combat Text Placement defaults to CLASSIC, including old
settings with no preference. Floating numbers draw at their actual positions;
there is no packing displacement. SPREAD explicitly enables the existing
crowd-avoidance layout. Native values, trajectories, lifetimes and visibility
filters are unchanged. Rendering never edits the simulation's text objects.

Options → Interface → Aim Ticks now offers Line, Dot and Facing + Brackets.
Line remains the default. Facing + Brackets places the local player's locator
and directional chevron above world text, without an additional body tick.
Other actors retain the normal line. The existing opacity slider controls the
whole marker, including zero to hide it. Dead, downed, burrowed and concealed
players do not reveal their position through it. Enemy silhouettes are separate.

## Debuffs use the same live state

statusPresentation supplies the icon and screen-effect paths with the same
active-debuff rule, native labels/colors and optional paired glyph/screen profile.
A new harmful status inherits both presentations without a renderer special case:
a mnemonic/color icon and restrained soft vignette. Authored screenCue profiles
and explicit opt-outs take precedence; existing frost, stars, pall and other
specialized screen effects retain their behavior. DoTs keep their material cues.
Beneficial effects remain quiet. Parallel applications share one icon/effect;
expiry, empty stacks and cleansing retire both on the next draw. Co-op mirrors
read the same status state. No new gameplay clocks or mechanics are introduced.

The compact icons remain beside Life with draining duration tracks. Names and
details stay on hover by default. Affliction Overlays retains GENTLE, STILL and
OFF independently of icon visibility. Soft vignettes use the bounded existing
edge compositor and leave the center clear; different authored colors retain
their own layers rather than collapsing to one unrelated tint.

## Verification

- presentationdefaults covers every registered status, future data-only status
  extension, native application/expiry/cleanse and co-op parity, saved settings,
  all skill abbreviations against gemInitials, and inherited DOM fallbacks.
- Existing affliction, status, skillicons and combatfocus probes retain coverage
  of specialized effects, stacking, comfort settings, icon tracks and artwork.
- classic-feedback-ui runs a controlled hidden game and drives actual Options.
  It compares classic face pixels with the painter extracted from main (20
  readiness/affordability/Recall cases), checks real bar/rack faces, compares
  classic damage coordinates with native text positions, and exercises SPREAD.
  It verifies marker direction, opacity, concealment, paired icon/vignette
  application/cleanse/expiry, actual overlay pixels and comfort controls, exact
  Save/Continue, legacy preferences and six untouched production-save sentinels.
- combat-focus-ui explicitly enables the opt-in layout/locator/meter preferences
  before checking their existing crowd behavior. debuff-icons-ui verifies real
  hover input and narrow/scaled HUD behavior. These are controlled integration
  checks, not an ordinary-input gameplay review.

Build with HOLLOW_WAKE_STORAGE_SCOPE=preview:seamless-world and
HOLLOW_WAKE_WORLDMASS=1, then run the UI harnesses with HOLLOW_WAKE_QA_DIST pointing
to that build. classic-feedback-ui defaults to balance/reports/classic-feedback-r62-dist;
HOLLOW_WAKE_QA_TAG controls the ignored screenshot/report prefix.
