# Compact debuffs and optional skill artwork

Debuffs appear above Life in a translucent grid of 24-pixel icons, clear of the
orb arcs and caption. Common ailments have individual glyphs; other registered
effects use a name mnemonic and their authored color. Color is never the only
identifier. A thin track drains with the latest application to expire. Stacks
share one icon; hovering shows the name, first/last expiry where different, a
larger duration track and definition-derived effect information. Removing an
effect removes its readout on the next draw. Only one hover card is drawn.

Options → Visuals → Debuff Names & Durations defaults to ON HOVER. NEAR HERO,
UPPER CORNER and OFF remain available; OFF hides details but retains the compact
icons. Screen effects keep their independent setting. statusPresentation shares native
active-status rules and metadata between icons and screen effects. Unprofiled
harmful effects receive a soft edge vignette; explicit screenCue opt-outs and
specialized effects are preserved. Both paths retire on cleanse/expiry. Former unversioned FOCUS
settings migrate to ON HOVER, including existing preview saves. Deliberate
CORNER/OFF choices survive. New explicit choices round-trip normally.

Options → Visuals → Skill Faces defaults to ARTWORK everywhere: hotbar, Skills,
preparation, vendor and Memory chips. Every skill has its own authored composition;
see [Skill artwork](skill-icons.md). ACRONYMS remains an explicit preference:
Cleave is C, Sunder Maul SM, Frenzy F and Recall REC. classicSkillMarkup restores
main's inherited tile fonts/colors; the hotbar uses its colored tile and small
dark initials. Saved choices survive. Native
slot controls, cooldowns, affordability, charge and cast cues remain in place.

The display span is separate from the mechanical DoT curve clock. Accepted
refreshes reset it; weaker rejected burns and fixed-fuse reapplications do not.
Optional snapshot spans give peers the same fraction. Legacy mirrors with no
span omit the fractional track; with no expiry they also omit the countdown.
The hover description uses qualitative authored rules, not unscaled base
percentages or estimates of future damage. All drawing is read-only.

Validation: statusicons exercises real application, refresh, fixed fuse,
expiry/cleanse, mirrors, unknown clocks and bounds. skillicons covers every
catalogue entry in acronym and artwork modes. debuff-icons-ui drives native
mouse hover, live effects, the real Options buttons, hotbar/rack faces, narrow
scaled HUD and exact Save/Continue with six production-save sentinels. The
existing presentation and artwork harnesses retain their opt-in coverage.
