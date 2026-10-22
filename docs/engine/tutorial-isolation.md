# Tutorial enemy isolation

Tutorial scenes and Mu are outside the character run. Enemy-memory callbacks
must remain inactive throughout their combat and zone transitions. Scene-owned
and rewardless actors are also ineligible independently of the active director.

Previously `loadZone` scanned surviving tutorial enemies when entering Mu.
A commander marked by combat could become an account nemesis, survive the shell's
fresh World construction and manifest in a level-one opening zone. This affected
all seven commanders, including Szikkith, the Swarmfather.

The unique tutorial/revenge commanders now carry `noNemesis`; their authored
encounters, stats and skills are unchanged. Manifestation honors this flag on
existing account records as well as new formations. Old records remain as
history; they cannot summon these commanders. Other nemeses retain their names,
rarities, formation chances and persistence.

Verify `balance/probe_tutorialisolation.ts`, `probe_scenes.ts`, `probe_mu.ts`,
Odyssey checks and all types. The isolation probe reproduces the real director's
commander birth and Mu departure for all seven factions, then constructs the
fresh World used by class selection. Winning random rolls remove chance from
the assertions. It also checks contaminated account records, existing scene
grudges and ordinary enemy controls. The unpatched code fails 24 assertions.

Seamless routes these rules through `nativeSceneHistory` and the native campaign
lifecycle. The history owner reads the live scene director from the campaign
projection. `probe_tutorialnative.ts` covers that binding, scene-owned eligibility
and actual native arrival with all seven legacy commander records plus an ordinary
hunter. Both isolation probes are part of the current playable gate.
