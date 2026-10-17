# Generated quest and event side zones

Design requirement recorded from the user's continuation request; this does not claim runtime activation.

A quest or world event may create a visible entrance structure in suitable terrain and an owned side zone behind it. Odyssey objectives can therefore use a fitting generated region. A crusade can culminate in a temporary arena structure whose dwell entrance leads to its boss arena. The player can explore the side zone and return through a durable route.

Shared geography, entrance placement, and instance identity are separate. The same zone definition may produce different player or party instances, with different entrance locations and independent objective progress, rewards, memory and lifetime. Coordinates and definition IDs must never substitute for actual instance identity. The existing party tenancy in sidezones and shardUnits is precedent; it does not prove isolated entrance publication in the retained-area runtime.

Only the owning player and eligible party members receive the entrance, its map marker, actors, objective state and relevant collision geometry. An unrelated player's world must not acquire an invisible obstacle or access path. The authority admitting travel checks the real instance and eligible cohort, including changed quest or party membership; hiding a marker alone is insufficient.

The instance address and placement seed must survive save, reconnect and return travel. Completion and reward receipts belong to that instance. Define creation, expiration, last-occupant return, abandonment and party join/leave policies before activation. Never close an occupied instance without a valid return route, merge two parties' memories by zone ID, or move a quest entrance whenever the view reloads.

Implementation order remains complete native retained-area runtime, publication and persistence; then generated bounded/open terrain and owned quest entrances, with hierarchy and map zoom. Preserve full native content and mechanisms while replacing tiled progression with navigable places, barriers, valleys and meaningful routes.
