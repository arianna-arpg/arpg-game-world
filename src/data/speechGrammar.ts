// ---------------------------------------------------------------------------
// THE SPEECH GRAMMAR'S CORPUS — what the folk say, as data.
//
// engine/speechGrammar.ts is the grammar (templates × slots × the deal);
// this file is the STARTING CORPUS: dozens of templates per role, each in
// the world's own voice — a guest tells you something about the country,
// about the room, about each other; never about the menu. Every row is a
// DIAL (hers to cut, re-word, add to): a template is one line of data, a
// new role is a string, a new slot is one registerSpeechSlot call.
//
// SLOT PHRASE FORMS (write the sentence around them):
//   {name}       the SPEAKER's name                 "Corran Vale"
//   {other}      another named body in the company  "Old Hesk"
//   {doing}      that body's haunt piece            "at the keg" (HAUNT PHRASES)
//   {phase}      a noun after at/by/for             "dawn" "midday" "dusk" "night"
//   {weather}    the front, lowercased, no "the"    "rain" "fog" "blood moon"
//   {lastEvent}  the news line as a clause          "Warband storms Ashford"
//   {from}       the zone the hero came from        "Sallow Fen"
//   {heroClass}  the class, lowercased              "warrior"
//   {town}       the home town                      "Lastlight"
//   {zone}       this zone                          "Lastlight"
//   {monster}    a kind the hero killed, an article "a goblin skirmisher"
//   {hero}       the hero's address (renown-gated; the renderer's {name})
// A template that needs a slot the world cannot fill is skipped that
// telling (THE EMPTY WORLD) — so lean on slotless rows for the floor.
//
// ROLES: 'any' fits every speaker; the inn's rows wear patron/lodger plus
// a trade (FolkRow.roles); the ward's families are 'resident'; camper /
// mercenary / traveler / visitor pools stand ready for the bodies that
// will wear them (a wilds camp's fire, a hired blade at the counter).
// ---------------------------------------------------------------------------

import { registerHauntPhrase, registerSpeechTemplates, type SpeechTemplate } from '../engine/speechGrammar';

// --- HAUNT PHRASES ('{doing}' — what a body is doing at a piece) --------------
const HAUNT_PHRASES: Record<string, string> = {
  bar_counter: 'at the bar',
  tavern_table: 'at a table',
  bench: 'on the bench',
  hearth: 'by the fire',
  chair: 'in a chair',
  keg: 'at the keg',
  bed: 'abed',
  washstand: 'at the washstand',
  dresser: 'at the dresser',
  linen_chest: 'rummaging the chest',
  shelf: 'at the shelf',
  candle_stand: 'by the candle',
  anvil: 'at the anvil',
  well: 'at the well',
  fountain: 'by the fountain',
  notice_board: 'reading the board',
  planter: 'by the planters',
  campfire: 'at the fire',
  wall_lantern: 'under the lamp',
};
for (const [kind, phrase] of Object.entries(HAUNT_PHRASES)) registerHauntPhrase(kind, phrase);

// --- THE TEMPLATES ------------------------------------------------------------------
const t = (id: string, text: string, roles: SpeechTemplate['roles'], extra: Partial<SpeechTemplate> = {}): SpeechTemplate =>
  ({ id, text, roles, ...extra });

export const SPEECH_TEMPLATES: SpeechTemplate[] = [
  // ---- ANY: the floor every body stands on -------------------------------------
  t('any_01', 'Quiet in here for {phase}. I’ll take quiet.', ['any']),
  t('any_02', 'The road gets worse every season. The company in here gets better. Make of that what you will.', ['any']),
  t('any_03', 'You’re the {heroClass}, then. Word gets round a room like this.', ['any']),
  t('any_04', '{hero}. They said you’d be taller.', ['any']),
  t('any_05', 'Came up from {from}, did you? Your boots say so before you do.', ['any']),
  t('any_06', 'Heard you put down {monster} out there. Somebody had to.', ['any']),
  t('any_07', 'The talk in the square is all "{lastEvent}." I’ve stopped listening.', ['any']),
  t('any_08', '{other} has been {doing} half the day. Don’t let them start on the fells.', ['any']),
  t('any_09', 'This {weather} will not lift before morning. Sit. Nobody’s going anywhere.', ['any'], { sky: 'front' }),
  t('any_10', 'Clear sky over {town} tonight. Doesn’t happen often enough to trust.', ['any'], { sky: 'clear', phase: ['night', 'dusk'] }),
  t('any_11', 'First light and the fire’s already cold. Somebody sleeps on the job.', ['any'], { phase: ['dawn'] }),
  t('any_12', 'Nobody honest is awake at this hour. Present company excepted, I hope.', ['any'], { phase: ['night'] }),
  t('any_13', 'Mireille waters nothing. That is the whole reason this house still stands.', ['any']),
  t('any_14', 'Brandt’s hammer starts before the birds do. You learn to sleep through it or you leave.', ['any']),
  t('any_15', 'The board out front pays better than honest work. Pays faster, too.', ['any']),
  t('any_16', 'If you hear the bell from the wall, don’t ask what for. Just get inside.', ['any']),
  t('any_17', '{other} told me you were coming. {other} tells everyone everything.', ['any']),
  t('any_18', 'Watch {other}. Not because they’re dangerous. Because they’ll talk your ear off.', ['any']),
  t('any_19', 'A {heroClass} walked in here a season back. We did not see them again. Different {heroClass}, I hope.', ['any']),
  t('any_20', 'Word came up the road with the last cart: "{lastEvent}." Believe half of it.', ['any']),
  t('any_21', 'The Font swallows gems and gives back memories. I keep mine in my head where they’re cheaper.', ['any']),
  t('any_22', 'You smell of {from}. No offence. Everyone who comes from there does.', ['any']),
  t('any_23', 'The dark comes earlier every week, or I get older every week. One of the two.', ['any'], { phase: ['dusk', 'night'] }),
  t('any_24', 'Midday and the whole town’s indoors. Says something about the outside.', ['any'], { phase: ['day'] }),
  t('any_25', 'Was it {monster} you killed, or was that the tale that reached us? The tale had teeth either way.', ['any']),
  t('any_26', 'There’s {weather} on the fells again. The drovers won’t move till it breaks.', ['any'], { sky: 'front' }),
  t('any_27', 'I’ve been {town}’s guest three nights. It grows on you. Like moss.', ['any']),
  t('any_28', 'Don’t mind me. I mind everyone else, and that’s a full day’s work.', ['any']),
  t('any_29', '{other} and I go back. Not far back. Two nights and one argument.', ['any']),
  t('any_30', 'They call me {name}. My mother called me worse.', ['any']),
  t('any_31', '{hero}. Sit before you fall. That’s not a threat, it’s the state of you.', ['any']),
  t('any_32', 'The waypoint hummed this morning. It hums before something arrives. You arrived.', ['any']),
  t('any_33', 'Every soul you bring back from the boroughs is another mouth at Mireille’s table. She counts them proudly.', ['any']),
  t('any_34', 'The ward’s cottages went up faster than the walls did. Says where the town’s heart is.', ['any']),
  t('any_35', 'If {other} offers to show you the fourth stair tread, decline. It’s a long story and a short stair.', ['any']),
  t('any_36', 'Whatever you’re drinking, it isn’t as bad as what’s in the wells past the fen.', ['any']),
  t('any_37', 'Never thought I’d see {zone} this quiet. I don’t trust it, but I’ll take it.', ['any']),
  t('any_38', 'Everyone who passes through {zone} leaves something behind. Mostly boots. Sometimes worse.', ['any']),

  // ---- PATRON: the common room's company -------------------------------------
  t('patron_01', 'Best seat is by the hearth and {other} has it. Has had it since {phase}.', ['patron']),
  t('patron_02', 'The keg on the left is the honest one. The right one is for people who ask questions.', ['patron']),
  t('patron_03', 'I don’t drink for the taste. I drink because it’s indoors.', ['patron']),
  t('patron_04', '{other}’s been {doing} since I came in. Either patient or asleep with the eyes open.', ['patron']),
  t('patron_05', 'Mireille cut me off once. I deserved it. Don’t tell her I said so.', ['patron']),
  t('patron_06', 'Somebody sang last night. Nobody will admit who. I have a guess and it’s {other}.', ['patron']),
  t('patron_07', 'The bench nearest the door is cold and the one by the fire is taken. Life in a sentence.', ['patron']),
  t('patron_08', 'When the {weather} came in, half the square came in with it. Wet company is still company.', ['patron'], { sky: 'front' }),
  t('patron_09', 'You’ll want the stew. You’ll regret the stew. Everyone does both.', ['patron']),
  t('patron_10', 'This is the hour the wall watch comes in. They drink like they’re owed it. They are.', ['patron'], { phase: ['dusk', 'night'] }),
  t('patron_11', 'By {phase} the room’s mostly empty and mostly me. I’m fine with it.', ['patron']),
  t('patron_12', 'I owe {other} a drink from a wager over which way the wind was blowing. It was blowing both.', ['patron']),
  t('patron_13', 'The hearth smokes when the wind’s east. It’s east. You’ll get used to the eyes.', ['patron']),
  t('patron_14', 'A {heroClass} at the bar. That’ll be a night worth remembering or a night worth forgetting.', ['patron']),
  t('patron_15', 'I heard "{lastEvent}" from a courier this morning. By noon it was twice as bad. By now I’ve no idea.', ['patron']),
  t('patron_16', 'The dice at that table are honest. The hands aren’t. Sit with your back to the wall.', ['patron']),
  t('patron_17', 'You killed {monster}? Then the next round is on {other}. They bet you couldn’t.', ['patron']),
  t('patron_18', 'The road from {from} passes the old fold. If the gate was hanging, that was mine once.', ['patron']),
  t('patron_19', 'The fire, the keg, the door. Three things I keep an eye on. Not in that order.', ['patron']),
  t('patron_20', 'Mireille’s never once asked what I did before {town}. Best landlady in the country.', ['patron']),
  t('patron_21', 'It’s {phase}. If you’re looking for the smith, he’s at the bench. He is always at the bench.', ['patron']),
  t('patron_22', 'They put the notice board out front so we’d stop reading it over each other’s shoulders. We read it over each other’s shoulders out front now.', ['patron']),
  t('patron_23', 'Clear night. The wardens hate a clear night. Everything can see the wall.', ['patron'], { sky: 'clear', phase: ['night'] }),
  t('patron_24', 'The stair creaks on the fourth tread. That’s not a warning, it’s an announcement.', ['patron']),
  t('patron_25', '{other} came in with {weather} on their coat and hasn’t moved from the fire since.', ['patron'], { sky: 'front' }),
  t('patron_26', 'Since the lamps went up along the ways the walk home is shorter. Same distance. Shorter.', ['patron']),

  // ---- LODGER: the rooms above --------------------------------------------------
  t('lodger_01', 'The corner room’s the quiet one. Mine isn’t the corner room.', ['lodger']),
  t('lodger_02', 'Every room in this house creaks in its own key. Learn them and you’ll know who’s coming.', ['lodger']),
  t('lodger_03', 'I paid for a week. I’ll stay a season. That’s how {town} works on people.', ['lodger']),
  t('lodger_04', 'The washstand’s cold at {phase}. Mireille says the brook is colder. She’s right, I checked.', ['lodger']),
  t('lodger_05', '{other} snores through the wall. I’ve stopped minding. I’ve started timing it.', ['lodger']),
  t('lodger_06', 'The window looks over the brook. When the {weather} comes you can’t see the water, only hear it.', ['lodger'], { sky: 'front' }),
  t('lodger_07', 'Slept under this roof more nights than I meant to. Roofs do that.', ['lodger']),
  t('lodger_08', 'I keep my chest locked and my door open. Backwards, {other} says. {other} keeps neither.', ['lodger']),
  t('lodger_09', 'You can hear the whole common room through the floor. I know every story they tell down there twice.', ['lodger']),
  t('lodger_10', 'A {heroClass} on the stair at {phase}. The house has gone up in the world.', ['lodger']),
  t('lodger_11', 'I heard about "{lastEvent}" through the floorboards. Everything I know I know through the floorboards.', ['lodger']),
  t('lodger_12', '{other} has been {doing} since {phase}. Some of us came upstairs to rest.', ['lodger']),
  t('lodger_13', 'The bed nearest the stair is the draughty one. The far one has the mice. Choose your company.', ['lodger']),
  t('lodger_14', 'At night the whole house ticks as it cools. First night I sat up with a knife. Now I sleep through it.', ['lodger'], { phase: ['night'] }),
  t('lodger_15', 'Dawn comes through the east window like a creditor. I turn to the wall.', ['lodger'], { phase: ['dawn'] }),
  t('lodger_16', 'From up here you see the road from {from}. I watched you come in. You walk like someone who got here on purpose.', ['lodger']),
  t('lodger_17', 'They say you killed {monster}. Up here we say it quieter. The walls are thin.', ['lodger']),
  t('lodger_18', 'Mireille changes the linen every third day whether it needs it or not. It needs it.', ['lodger']),
  t('lodger_19', 'Clear night. You can see the far lamps from the window. Somebody out there is keeping one lit.', ['lodger'], { sky: 'clear', phase: ['night'] }),
  t('lodger_20', 'The landing opens straight onto the hall. There is no sneaking in this house. Ask {other}.', ['lodger']),
  t('lodger_21', 'I count the stairs on the way up so I know if one’s gone missing. One did, once, in another house.', ['lodger']),
  t('lodger_22', 'Rain on that roof is the only lullaby I’ll pay for.', ['lodger'], { sky: 'front' }),

  // ---- MERCHANT: goods, prices, caravans ----------------------------------------
  t('merchant_01', 'Selling nothing till the caravan comes. Everything I own is either sold or on a cart.', ['merchant']),
  t('merchant_02', 'Brandt’s shelf gets finer as the town fills. It’s the only honest scale in the country: souls in, steel out.', ['merchant']),
  t('merchant_03', 'A {heroClass} with a full purse. My favourite kind of weather.', ['merchant']),
  t('merchant_04', 'The road from {from} is the one the carts take. If it’s bad, the prices here will tell you before I do.', ['merchant']),
  t('merchant_05', 'This {weather} costs me a day. A day costs me more than you’d think.', ['merchant'], { sky: 'front' }),
  t('merchant_06', 'The salvage station takes anything. It gives back less. That’s not a complaint, that’s a business.', ['merchant']),
  t('merchant_07', '{other} owes me for a kettle. {other} says the kettle owed them first.', ['merchant']),
  t('merchant_08', 'I heard "{lastEvent}" and raised my prices before I heard the rest of the sentence.', ['merchant']),
  t('merchant_09', 'Kettles mended, pots patched. The ones that come back from the wilds need it most.', ['merchant']),
  t('merchant_10', 'Somebody killed {monster} and the price of hide fell by a coin. That somebody was you, they say.', ['merchant']),
  t('merchant_11', 'A merchant sleeps with one eye on the chest and one on the door. I have two eyes. It works out.', ['merchant']),
  t('merchant_12', 'The gem counter opens when Brandt says it opens. Brandt says it opens when the town earns it.', ['merchant']),
  t('merchant_13', 'At {phase} I count stock. At every other hour I count the people who might want it.', ['merchant']),
  t('merchant_14', 'Never bet against the notice board. The board always collects.', ['merchant']),

  // ---- WARDEN: the wall, the watch ----------------------------------------------
  t('warden_01', 'Off the wall till dawn. The first ale is the only one that tastes of anything.', ['warden']),
  t('warden_02', 'Something walked the brook last night. Big. Didn’t cross. I counted the spans twice.', ['warden']),
  t('warden_03', 'The lamps along the ways were my idea. The wardens claimed it. I let them.', ['warden']),
  t('warden_04', 'At {phase} the watch changes. If you hear boots on the wall, that’s all it is. Probably.', ['warden']),
  t('warden_05', 'You put down {monster}? Good. Do it again. There are always more of whatever that was.', ['warden']),
  t('warden_06', 'A {heroClass} in the town is one less body I have to stand for. Don’t take that as a compliment.', ['warden']),
  t('warden_07', 'The {weather} hides the road from the wall. I hate the {weather}.', ['warden'], { sky: 'front' }),
  t('warden_08', 'Clear night. You can see to the crossroads. So can everything at the crossroads.', ['warden'], { sky: 'clear', phase: ['night'] }),
  t('warden_09', 'I heard "{lastEvent}" from the wall before the town did. The wall hears everything first.', ['warden']),
  t('warden_10', '{other} asked to stand a watch once. Lasted till the first owl.', ['warden']),
  t('warden_11', 'The road from {from} has a bend where the trees close in. We lost a cart there. Walk it in daylight.', ['warden']),
  t('warden_12', 'The ward’s cottages are inside the wall now. Took some arguing. The families were the argument.', ['warden']),
  t('warden_13', 'If the bell rings twice it’s a drill. If it rings once, it isn’t.', ['warden']),
  t('warden_14', 'By dawn I can’t feel my hands. By {phase} I can, and I wish I couldn’t.', ['warden']),

  // ---- PILGRIM: waypoints, the Font, the roads ---------------------------------
  t('pilgrim_01', 'Walking to every waypoint before I die. Yours burns warm.', ['pilgrim']),
  t('pilgrim_02', 'The Font drank a gem from me once. I still dream the colour.', ['pilgrim']),
  t('pilgrim_03', 'From {from} to here is three days on foot and one on a cart. I take the three. The cart misses things.', ['pilgrim']),
  t('pilgrim_04', 'A {heroClass} keeps the roads I walk. I keep the roads in my prayers. We both keep them.', ['pilgrim']),
  t('pilgrim_05', 'The {weather} is a blessing on a pilgrim. A wet one. Everything is a blessing if you say it firmly.', ['pilgrim'], { sky: 'front' }),
  t('pilgrim_06', 'I heard "{lastEvent}." I lit a candle. It’s what I have.', ['pilgrim']),
  t('pilgrim_07', 'Killing {monster} is a mercy to the land and a weight on the hand. Wash both.', ['pilgrim']),
  t('pilgrim_08', 'At {phase} I say the words. {other} thinks I’m talking to myself. Half right.', ['pilgrim']),
  t('pilgrim_09', 'The waypoint in the square is the ninth I’ve touched. It remembered me. They do, I think.', ['pilgrim']),
  t('pilgrim_10', 'Every cottage in the ward is a soul somebody carried home. I stop at each door. It takes a while.', ['pilgrim']),
  t('pilgrim_11', 'Night on the road teaches you what the day hides. Mostly that the day is kind.', ['pilgrim'], { phase: ['night'] }),
  t('pilgrim_12', 'I walk at dawn. The dark is done and the heat isn’t started. The only honest hour.', ['pilgrim'], { phase: ['dawn'] }),

  // ---- RESIDENT: the ward's families -------------------------------------------
  t('resident_01', 'We came from the borough by the ford. The walls here hold.', ['resident']),
  t('resident_02', 'The cottage is small and the roof is ours. Say that twice and see how it sounds.', ['resident']),
  t('resident_03', 'The children sleep through Brandt’s hammer now. That’s when I knew we’d stay.', ['resident']),
  t('resident_04', 'You brought us here. I don’t forget faces, and I won’t forget yours.', ['resident']),
  t('resident_05', 'The brook floods the lane when the {weather} sits. We put stones down. They wash away. We put more.', ['resident'], { sky: 'front' }),
  t('resident_06', 'At {phase} the square’s ours. The inn’s company hasn’t woken and the wall watch has gone to bed.', ['resident']),
  t('resident_07', '{other} keeps a garden and gives half of it away. The other half they talk about.', ['resident']),
  t('resident_08', 'They say you came from {from} today. We came from somewhere worse. Welcome back.', ['resident']),
  t('resident_09', 'I heard "{lastEvent}" from the notice board. We read it every morning like weather.', ['resident']),
  t('resident_10', 'A {heroClass} at my door. In the borough that meant trouble. Here it means the trouble is elsewhere.', ['resident']),
  t('resident_11', 'You killed {monster}. My youngest wants to hear it told. Not tonight. Tonight they sleep.', ['resident']),
  t('resident_12', 'The lamps along the ways mean the little ones can run to the inn and back after dark. That was the whole point of walls.', ['resident']),
  t('resident_13', 'We keep the count of souls, six founders and every one after. It goes up. That’s the only number I read.', ['resident']),
  t('resident_14', 'The fire by the south road burns all night now. Someone keeps it.', ['resident']),
  t('resident_15', 'Two of us, one roof. We will take the east wall if it comes to that.', ['resident']),
  t('resident_16', 'Nights are long in the ward. Long and quiet. We came a long way for quiet.', ['resident'], { phase: ['night'] }),
  t('resident_17', 'Dawn in {town} is bread and the brook and the smith. I could set a clock by all three.', ['resident'], { phase: ['dawn'] }),
  t('resident_18', 'Mireille sends a pot down when someone’s ill. She won’t be thanked for it. We thank her anyway.', ['resident']),
  t('resident_19', 'The waypoint lights the square at night. The children think it’s a moon we own.', ['resident'], { phase: ['night', 'dusk'] }),
  t('resident_20', 'Clear sky. Washing day, then. The whole ward’s linen goes up like flags.', ['resident'], { sky: 'clear', phase: ['day', 'dawn'] }),

  // ---- MERCENARY: hired steel, veterans -----------------------------------------
  t('mercenary_01', 'Slept under a roof three nights running. I keep waking to check the door.', ['mercenary']),
  t('mercenary_02', 'The stair creaks on the fourth tread. Learn it. You will want to know who is coming up.', ['mercenary']),
  t('mercenary_03', 'A {heroClass} who came back from {from}. Most who take that road don’t. Mind the ones who do.', ['mercenary']),
  t('mercenary_04', 'You killed {monster}. Alone? Then you’re either good or lucky. Both wear out.', ['mercenary']),
  t('mercenary_05', 'I don’t fight in {weather}. I say that every time. Then I fight in the {weather}.', ['mercenary'], { sky: 'front' }),
  t('mercenary_06', 'I heard "{lastEvent}." That’s work. Work somewhere else, which is the best kind.', ['mercenary']),
  t('mercenary_07', '{other} asked me what the worst thing I ever saw was. I told them. They stopped asking things.', ['mercenary']),
  t('mercenary_08', 'The recruiting officer knows my price. He doesn’t know why it went up. Neither do I.', ['mercenary']),
  t('mercenary_09', 'At {phase} I clean the blade. It doesn’t need it. My hands do.', ['mercenary']),
  t('mercenary_10', 'A wall you can see over is a wall that can see you. This one’s about right.', ['mercenary']),
  t('mercenary_11', 'Night’s when the hired ones earn it. Day’s when the town forgets they’re owed.', ['mercenary'], { phase: ['night'] }),
  t('mercenary_12', 'Retiring here. That’s the plan. Every blade has that plan. Some of us keep it.', ['mercenary']),

  // ---- CAMPER: the wilds' fires -------------------------------------------------
  t('camper_01', 'Keep the fire low and the voice lower. The dark has ears and no manners.', ['camper']),
  t('camper_02', 'You came through from {from}. Then you crossed the bad ground. Sit. You’ve earned the fire.', ['camper']),
  t('camper_03', 'Something killed {monster} up the way. Track said it was on two legs and in a hurry. You?', ['camper']),
  t('camper_04', 'The {weather} keeps the worst things in their holes. It keeps me in mine too.', ['camper'], { sky: 'front' }),
  t('camper_05', 'At {phase} I move. Camp twice in the same place and the place learns you.', ['camper']),
  t('camper_06', 'A {heroClass} at my fire. Last one ate my beans and left at dawn. Eat the beans. Stay past dawn.', ['camper']),
  t('camper_07', 'The waypoint at {town} is a day’s walk. I don’t walk it. I like it out here. That’s a lie I tell well.', ['camper']),
  t('camper_08', 'Night out here isn’t dark. It’s full. You learn the difference or you don’t learn anything again.', ['camper'], { phase: ['night'] }),

  // ---- TRAVELER: roads, drovers, couriers ------------------------------------------
  t('traveler_01', 'Drove forty head down from the fells. Lost two to the dark. Mireille poured for the rest of us.', ['traveler']),
  t('traveler_02', 'The road past the crossroads is quieter than it was. That worries me more than the noise did.', ['traveler']),
  t('traveler_03', 'I run the caravan road. Ask me where it isn’t safe, not where it is.', ['traveler']),
  t('traveler_04', 'Three writs in my satchel and none of them mine. The board out front pays better.', ['traveler']),
  t('traveler_05', 'From {from}? Then you passed the fold with the gate off. That was mine. Was.', ['traveler']),
  t('traveler_06', 'This {weather} closes the passes. I’ve slept in worse. I’ve slept in this, actually. Twice.', ['traveler'], { sky: 'front' }),
  t('traveler_07', 'Word on the road is "{lastEvent}." Word on the road is usually two days late and one degree wrong.', ['traveler']),
  t('traveler_08', 'Saw {monster} dead by the road. Fresh. Whoever did that walks ahead of me and I’m glad of it.', ['traveler']),
  t('traveler_09', 'A {heroClass} on the road makes the drovers brave. Brave drovers lose cattle. Walk behind us.', ['traveler']),
  t('traveler_10', 'At {phase} the road belongs to whoever’s on it. I try not to be.', ['traveler']),
  t('traveler_11', '{other} wanted to come with me next run. I said the road doesn’t want company. It wants attention.', ['traveler']),
  t('traveler_12', 'Every waypoint I pass I touch for luck. My luck is average. My hands are warm.', ['traveler']),
  t('traveler_13', 'The lamps on the ways here reach the crossroads now. First light I’ve seen from the road in a year.', ['traveler'], { phase: ['night', 'dusk'] }),
  t('traveler_14', 'If you see a fold with the gate torn off, that one was mine.', ['traveler']),

  // ---- VISITOR: scholars, midwives, the passing-through -------------------------
  t('visitor_01', 'Took the corner room for the light. The scratching in the walls keeps me company.', ['visitor']),
  t('visitor_02', 'I copy the runes off the vestiges. Mireille thinks I am mad. She is not wrong.', ['visitor']),
  t('visitor_03', 'Two births in the ward this month. The town is deciding to live.', ['visitor']),
  t('visitor_04', 'Wash your hands before you touch anyone here. I mean it kindly.', ['visitor']),
  t('visitor_05', 'A {heroClass}. I have a page on you. Several. Most of them wrong, I expect.', ['visitor']),
  t('visitor_06', 'From {from}. I have notes on {from}. Tell me the notes are out of date. Please.', ['visitor']),
  t('visitor_07', 'You killed {monster}. Describe the eyes. No, the eyes. It matters.', ['visitor']),
  t('visitor_08', '"{lastEvent}." I wrote it down. Writing things down is what I have instead of courage.', ['visitor']),
  t('visitor_09', 'The {weather} keeps me at the desk. The desk is where I do my best worrying.', ['visitor'], { sky: 'front' }),
  t('visitor_10', '{other} asked what I’m writing. I said "a history." {other} said "of what." I haven’t decided.', ['visitor']),
];

registerSpeechTemplates(SPEECH_TEMPLATES);
