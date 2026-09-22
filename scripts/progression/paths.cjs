const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const out = path.resolve(process.argv[2] || 'balance/reports/progression-refresh');
const raw = JSON.parse(fs.readFileSync(path.join(out,'progression-snapshot.json'),'utf8'));
const byId = Object.fromEntries(raw.rows.map(r=>[r.id,r]));
const byFlag = Object.fromEntries(raw.rows.filter(r=>r.kind==='feature').map(r=>[r.payload.flag,r.label]));
const list = v=>v==null?[]:Array.isArray(v)?v:[v];
const ledgerLabels = {
  essence_touched:'Touch ordinary Essence', mireille_flasks_filled:'Complete Mireille’s flask refill lesson', vendor_bought:'Buy something from a vendor', bounty_done:'Complete a bounty', legendary_skill_dropped:'Find a genuine legendary skill', merc_market_met:'Meet a mercenary market', voyages_sailed:'Sail a voyage', islands_landed:'Land on an island', unmade_slain:'Slay the Unmade', zones_explored:'Explore distinct zones', crafts_unlocked:'Unlock craft families', account_deaths:'Counted account deaths', cellar_entered:'Discover Lastlight’s cellar'
};
function ledger(k){return ledgerLabels[k] || (/^reached_level_/.test(k)?`Any character reaches level ${k.split('_').at(-1)}`:k.replaceAll('_',' '));}
const rows = raw.rows.map(r=>{
  const all = [r.reqLevel?`Account level ${r.reqLevel}`:null,
    ...list(r.requiresUnlock).map(id=>byId[id]?.label||id),
    r.requiresFeature?(byFlag[r.requiresFeature]||r.requiresFeature==='reliquary'&&'Reliquary quest reward'||r.requiresFeature):null,
    ...list(r.reqLedger).map(ledger),
    ...Object.entries(r.reqLedgerCounts||{}).map(([k,n])=>`${ledger(k)} ≥ ${n}`),
    r.reqClasses?`${r.reqClasses} activated selectable classes`:null,
    r.requiresMemoryCommission?`Odyssey stage ${raw.power.awakening.odysseyStage}; at least one eligible discovered skill (awakened) or support (${raw.commissionFinds} genuine finds)`:null].filter(Boolean);
  let any = r.anyLabels||[], effect=r.description, source='src/meta/unlocks.ts';
  if(r.kind==='package'){
    const p=raw.packages.find(p=>p.id===r.payload.packageId);source=`src/packages/defs/${({storm_fronts:'stormFronts',demon_invasion:'demonInvasion',long_night:'longNight',underworld_war:'underworldWar'})[p.id]||p.id}.ts`;
    if(r.payload.tierId){const i=p.tiers.findIndex(t=>t.id===r.payload.tierId);all.push(`${p.label}: base configuration purchased`,...p.tiers.slice(0,i).map(t=>`${t.label} purchased`),p.tiers[i].requirement);effect=`Widen tuning bounds: ${JSON.stringify(p.tiers[i].grants)}`;}
    else {all.push(p.unlock.label);effect=!p.defaultEnabled?'Add this optional package to future expeditions':p.alwaysOn?'Always active':p.pressureless?'Recognize/configure existing world content; no frequency sliders':'Configure an already-active event in future expeditions';}
  }
  if(r.kind==='memory')all.push(r.payload.memoryUnlockId==='memory_discovery'?'At least one eligible undiscovered skill/support':`Odyssey stage ${raw.power.awakening.odysseyStage}; at least one discoverable, unawakened skill`);
  if(r.kind==='graft')all.push('No unused Skill Graft charge already armed');
  return {...r,all,any,effect,source};
});
const n=(id,label,kind,detail,row)=>({id,label,kind,detail,row});
const map=(id,title,nodes,layers,edges,filter,focus)=>({id,title,nodes,layers,edges:edges.map(s=>s.split('>')),catalog:rows.filter(filter).map(r=>r.id),focus});
const maps=[];
maps.push(map('loop','The account loop',[
 n('mu','Mu: choose a class','play','Fresh accounts start with Warrior, Magician and Rogue; later hands use Vault-activated classes.'),
 n('run','Live an expedition','play','Explore, fight, find Memories, complete objectives and encounter the world’s existing systems.'),
 n('build','Develop this character','character','XP buys passive growth; equipment and Memory Essence develop the current build.'),
 n('deeds','Record deeds & discoveries','account','Class discoveries grant their gem rewards immediately; other deeds expose later Vault purchases.'),
 n('purse','Carry ordinary Essence','character','Spend it on services now, or carry it into the run-end appraisal. Memory Essence is a separate wallet.'),
 n('end','Conclude a mortal run','play','The normal mortal conclusion appraises carried Essence at 1/2/3/5 by tint and pays 100%.'),
 n('vault','Reckoning in the Vault','vault','The first counted death opens Vault access. Lifetime earned Mortal Essence also raises account level.'),
 n('buy','Claim, invest, or buy','vault','Services, class activation, repeatable Memory draws, mastery, world configuration and resurrection; Wardrobe purchases share the same balance.'),
 n('seal','Seal & begin another life','account','Completed unlocks and partial investments persist. Unassigned Mortal Essence is lost on sealing.')
],[['mu'],['run'],['build','deeds','purse'],['end'],['vault'],['buy'],['seal']],['mu>run','run>build','run>deeds','run>purse','purse>end','end>vault','deeds>buy','vault>buy','buy>seal'],()=>false,'vault'));
maps.push(map('classes','Classes & starting kits',[
 n('parent','Parent gates + any one deed','play','Each class combines all structural prerequisites with any one authored gameplay objective. Exact roads are listed below.'),
 n('discover','Class discovered','account','Discovery grants earned bundle ownership. This can satisfy child-class discovery gates before activation.'),
 n('gems','Class skills & supports enter finds','account','Current class gem rewards are unchanged; skills become discoverable immediately, without secondary awakening.'),
 n('vessel','Named background vessel in Mu','account','The discovered class is visible, but is not selectable or offered under an Immortal contract.'),
 n('activate','Activate class in Vault · free','vault','Explicit Unlock admits the class to selection. Merely visiting the Vault does not activate it.'),
 n('pool','Selectable class pool','account','Mu deals from activated classes. Starter classes are already selectable.'),
 n('slots','Class card slots 4 → 12','vault','Each rung needs the preceding rung and enough activated classes to fill it. Costs: 40/80/130/200/300/420/560/720/900.'),
 n('levels','Play that class to 10 / 30 / 60 / 100','play','Class-specific achievements persist on the account and expose authored mastery rungs.'),
 n('mastery','Mastery · 90 / 180 / 320 / 600','vault','Only authored kit rungs exist: currently 32 across eight classes. Previous existing tiers are required.'),
 n('kit','Alternate openings + skill finds','account','The next class creation can choose the owned alternate or receive an extra starter. Drop discovery alone does not buy this kit permission.')
],[['parent'],['discover'],['gems','vessel'],['activate'],['pool'],['slots','levels'],['mastery'],['kit']],['parent>discover','discover>gems','discover>vessel','vessel>activate','activate>pool','pool>slots','pool>levels','levels>mastery','mastery>kit'],r=>['class','classtier','slot'].includes(r.kind),'discover'));
maps.push(map('memories','Memory discovery & awakening',[
 n('grant','Starter / class / mastery rewards','account','Rewards directly grant discovery. Class activation is not required for its discovery rewards.'),
 n('draw','Discover a Memory','vault','One equal-chance entry from the combined still-locked skill/support pool; repeatable, no duplicates.','memory_discovery'),
 n('found','Find eligibility · either route','account','Discovery allows future acquisition; it does not place a copy in the character’s inventory. Authored drop-level and source rules remain.'),
 n('copy','Acquire a usable copy','play','Drop or identify a Memory, or buy eligible stock; satisfy binding and casting requirements.'),
 n('wake','Awaken a Skill','vault','Randomly awaken one already-discoverable skill whose secondary access is locked.','memory_secondary'),
 n('legend','Genuine legendary mint / recall','play','Awards awakening; an out-of-pool regional/fixed legendary also grants global discovery. Preview, purchases and Font merges do not count.'),
 n('level','Spend Memory Essence I–IV','character','Level the skill instance; level bands 5/10/15/20 supply Ability points. Awakening is not required for leveling.'),
 n('access','Awakened · either route','account','Persistent permission for that skill’s tree and commissioning. Supports currently retain their existing commission rules.'),
 n('tree','Tree: access AND level/points','character','Spending also requires valid nodes and calm. Existing allocations survive, and points earned while locked remain available.'),
 n('order','Commission: access AND service','play','The market/Commission purchase chain, eligible counter and normal roll odds remain necessary. See Markets.'),
 n('debug','Debug Grand Codex','debug','Bypasses discovery and awakening by default; account level 2 is required.','feat_unlock_all_gems'),
 n('graft','Skill Grafting','vault','Still requires the debug Codex. Arms one chosen next-run skill; a used charge can be bought again.','skill_graft')
],[['grant','draw'],['found'],['copy','wake'],['legend','level'],['access'],['tree','order'],['debug','graft']],['grant>found','draw>found','found>copy','found>wake','copy>legend','copy>level','legend>access','wake>access','access>tree','level>tree','access>order','debug>graft'],r=>['memory','graft'].includes(r.kind)||r.id==='feat_unlock_all_gems','access'));
maps.push(map('markets','Markets & commissioning',[
 n('touch','Touch ordinary Essence','play','The first genuine gain stamps essence_touched; the Vault is accessible after the first counted death.'),
 n('salvage','Salvage Station','vault','Opens ordinary vendor purchases, scrap selling and the crafting bench.','feat_salvage_station'),
 n('trade','Buy at a counter','play','A successful purchase stamps vendor_bought. Local trade can be blocked temporarily by an unresolved Lastlight raid.'),
 n('wares','Broader Wares I','vault','More gear and future direct-Memory shelf slots; prerequisite to Memory Counter.','feat_vendor_wares_1'),
 n('rush','Rush Orders I → II','vault','100 then 220; reduce restock from 5 to 4 to 3 minutes. Both descend from Salvage ownership.'),
 n('counter','Memory Counter','vault','Direct Skill Memories join stock; pouches and gear already have their own stock lane.','feat_vendor_gems'),
 n('supports','Support stock','vault','Adds Support Memories to the direct-Memory stock.','feat_brandt_supports'),
 n('reserve','Reserved Wares I','vault','Requires Memory Counter, Broader Wares I, and a successful vendor purchase. Further reservation rungs cost 160/280.','feat_vendor_lock_1'),
 n('ready','Eligible Memory known','account','A discovered and awakened skill, OR a discovered support genuinely found at least three times.'),
 n('service','Commission service','vault','Reserve I plus at least one eligible Memory is required to purchase the service.','feat_vendor_commission'),
 n('place','Place a standing order','play','Specify an eligible gem at a counter that can roll it. Normal restock odds resolve the watch; the find still has to be purchased.')
],[['touch'],['salvage'],['trade','wares','rush'],['counter'],['supports','reserve'],['ready'],['service'],['place']],['touch>salvage','salvage>trade','salvage>wares','salvage>rush','wares>counter','counter>supports','counter>reserve','trade>reserve','reserve>service','ready>service','service>place'],r=>/^feat_vendor_|^feat_brandt_|^feat_salvage/.test(r.id),'service'));
maps.push(map('craft','Equipment, relics & skill levels',[
 n('salvage','Salvage Station','vault','Ordinary essence, gear breaking and account craft lore start here.','feat_salvage_station'),
 n('lore','Study natural affixes','account','Suitable salvages unlock craft ranks after 3/5/8/12/16 studies. Crafted lines do not teach their own recipe.'),
 n('forge','Craft / socket equipment','character','Costs ordinary Essence and uses learned affix families. One crafted affix normally; Twin Anvils adds the second.'),
 n('oracle','Five families → Oracle','vault','Reroll an item affix at the stone; an answered line is sealed.','feat_oracle_stone'),
 n('memory','Memory Essence → skill levels','character','Separate currency: tiers I–IV feed the bands ending at 5/10/15/20. Drop floors are zone levels 1/6/11/16.'),
 n('font','Sacrificial Font · location access','play','No Vault purchase: merge copies, convert Memory Essence, or pay to reset a whole skill tree. Font-forged legendary copies do not awaken access.'),
 n('quest','Quartermaster + level 8 relic quest','play','Buy Town Expansion after a character reaches level 5; complete the lost-relic quest and return for the reward choice.'),
 n('case','Charm + one-cell Reliquary · free','account','Quest turn-in gives both; a new character can repeat the quest if the first charm was lost.'),
 n('seat','Seat first relic','play','Completes the relic lesson and enables ambient relic drops. Relics function when seated, not merely carried.'),
 n('grow','Expand Reliquary','vault','Four successive sizes: 60, then 140 at character milestone 12, 260 at 25, 420 at 40.')
],[['salvage','memory','quest'],['lore','font','case'],['forge','oracle','seat'],['grow']],['salvage>lore','lore>forge','lore>oracle','memory>font','quest>case','case>seat','case>grow'],r=>/^feat_craft|^feat_oracle|^feat_reliquary|^feat_salvage/.test(r.id),'font'));
maps.push(map('town','Town care & activities',[
 n('lesson','Mireille refills flasks','play','The first refill lesson exposes the life-care purchase; the lesson itself precedes paid ongoing care.'),
 n('life','Life care','vault','Linger near Mireille for life restoration.','feat_mireille_life'),
 n('mana','Mana care','vault','Requires life care.','feat_mireille_mana'),
 n('xp','XP blessing','vault','Requires mana care; 5 minutes of +5% experience.','feat_mireille_xp'),
 n('tracker','Weslan the Tracker','vault','Requires mana care. Opens the Bestiary station and eligible mastered-form attunement. Kill study already accumulates.','feat_tracker'),
 n('board','Bounty Board · free claim','vault','Claim after the Vault becomes accessible; take one live posting and return for its reward.','feat_bounty_board'),
 n('bounty','Complete a bounty','play','Opens the first rung of each independent board-upgrade ladder.'),
 n('post','Broader / farther / reserved postings','vault','Two rungs per branch: 90/180, 80/160, and 100/200 respectively.'),
 n('legend','Find a legendary skill','play','The genuine legendary-find flag also opens a town practice purchase.'),
 n('dummy','Training Dummy','vault','A reusable practice target in Lastlight.','feat_target_dummy'),
 n('zones','Explore 50 zones','play','Account discovery tally; repeated visits are not fifty distinct discoveries.'),
 n('fire','Campfire','vault','Refresh remembered wilds on demand; cleared objectives stay claimed.','feat_campfire')
],[['lesson','board'],['life','bounty'],['mana','post'],['xp','tracker'],['legend','zones'],['dummy','fire']],['lesson>life','life>mana','mana>xp','mana>tracker','board>bounty','bounty>post','legend>dummy','zones>fire'],r=>/^feat_mireille|^feat_tracker|^feat_bounty|^feat_target|^feat_camp/.test(r.id),'tracker'));
maps.push(map('travel','Travel & mercenaries',[
 n('roads','Explore normal roads','play','The world can be explored without buying Caravan. Authored geography, danger, and local doors still matter.'),
 n('caravan','Reach 10 → Caravan','vault','120; travel to the near bands, up to zone level 20.','feat_caravan'),
 n('deep','Reach 30 → Deep Frontier','vault','200; requires Caravan and opens the 21–30 band.','feat_caravan_deep'),
 n('far','Reach 40 + slay Unmade','vault','320; requires Deep Frontier, opens bands 31–50.','feat_caravan_far'),
 n('world','Reach 60 + slay Unmade','vault','480; requires Beyond the Veil, opens bands 51–100.','feat_caravan_world'),
 n('port','Find a port / sail free Dinghy','play','Port boards and harborhold services are discovered in the world. A first voyage opens the Sloop purchase.'),
 n('hulls','Sloop → Brigantine → Galleon','vault','90/220/450; successive hull ownership, first voyage, island landfall, account levels 1/2, and character milestone 40 govern the chain.'),
 n('market','Meet a mercenary market','play','Outposts and ports have their own access and capacity rules; current carried Essence pays hires.'),
 n('recruit','Lastlight Recruiter','vault','Permanent town hiring access; one dealt roster per world, no retiring at this table.','feat_merc_recruiter'),
 n('hold','Harborholds, charts & hires','character','Use in-world services and restore held ground with carried Essence. These are separate from Mortal Essence Vault purchases.')
],[['roads','port','market'],['caravan','hulls','recruit'],['deep','hold'],['far'],['world']],['roads>caravan','caravan>deep','deep>far','far>world','port>hulls','port>hold','market>recruit'],r=>/^feat_caravan|^ship_|^feat_merc/.test(r.id),'roads'));
maps.push(map('journey','Odyssey & Vocations',[
 n('world','World deals four faction campaigns','world','Four from eight; the tutorial faction remains mandatory until its Odyssey leader is first defeated on the account.'),
 n('lead','Explore / discover leads','play','Local kills and world exploration reveal routes. Optional supply operations weaken leaders; the personal commander is not mandatory.'),
 n('leaders','Defeat leaders in any order','play','Readiness 23/45/60/75 is guidance, not a hard level gate. Each victory changes the remaining factions’ world pressure.'),
 n('points','Each: +2 Vocation, +1 passive point','character','Also six Memories, XP, and one signal fragment. Vocation points can be banked before choosing a Vocation.'),
 n('release','Tutorial leader: permanent release','account','Only that faction’s Odyssey leader releases future tutorial enrollment. The earlier revenge commander does not.'),
 n('survey','Four victories → signal survey','world','Survey ground is authored at level 80. The final undertaking and victory remain future design.'),
 n('chain','Vocation chain / secret calling','play','Ordinary chains usually start at character level 30 through the Quartermaster. Exceptions and secret sites are listed below.'),
 n('grant','Complete chain: grant one Vocation','character','One per character. Completing it also opens its chain to future classes when account progression is permitted.'),
 n('spend','Vocation + points + home start node','character','All three are required to spend. Off-class characters must path to the home-class start node unless a definition overrides it.')
],[['world'],['lead','chain'],['leaders','grant'],['points','release'],['spend','survey']],['world>lead','lead>leaders','leaders>points','leaders>release','leaders>survey','chain>grant','grant>spend','points>spend'],r=>r.id==='feat_quest_giver','spend'));
maps.push(map('events','World events & configuration',[
 n('baseline','Encounter the existing world','world','Most packages are default-enabled and appear according to authored level, habitat, time and event rules, before purchase.'),
 n('deed','Meet a package’s discovery deed','play','Examples: open a Breach, meet a Delver, or witness a sovereign. Exact predicates are in the register below.'),
 n('base','Buy base configuration','vault','38 package base rows. For ordinary events this buys control over an existing feature, not its first possible encounter.'),
 n('tier','Further deeds + preceding tiers','play','Each investment tier requires base ownership, all earlier tiers, and its own milestone.'),
 n('widen','Buy wider tuning bounds','vault','69 tier rows widen frequency/start-level ranges; the effect is data on each tier.'),
 n('next','Choose next expedition settings','account','The new run freezes its manifest. A resumed existing run retains its manifest.'),
 n('pit','Cellar discovered → Pit','vault','The sole default-disabled package: its 140 purchase adds it to a future expedition.','pkg_pit'),
 n('substrate','Faction Politics: always active','world','No Vault purchase. Unsealing and War Below also run by default despite their pressureless purchase rows.'),
 n('tempo','Reach character 100 → World Tempo','vault','Separate global event-frequency control.','feat_global_frequency')
],[['baseline','pit','substrate'],['deed'],['base'],['tier','tempo'],['widen'],['next']],['baseline>deed','deed>base','base>tier','tier>widen','base>next','widen>next','pit>next','tempo>next'],r=>r.kind==='package'||r.id==='feat_global_frequency','base'));
maps.push(map('lives','Immortal contracts & legacy',[
 n('mortal','Mortal run','character','Full account progression; ordinary death ends the character and appraises carried Essence at 100%.'),
 n('deaths','20 counted deaths','account','Only stages whose policy counts account deaths advance this gate.'),
 n('covenant','Immortal Covenant','vault','Unlocks the possibility of the offered contract, not an always-selectable mode toggle.','feat_immortal'),
 n('offer','Mu offer + free vessel slot','play','10% chance; at most one activated class receives the offer. The player can take it or decline.'),
 n('sworn','Sworn character','character','Account progression continues until the first death.'),
 n('cross','First death: 25% appraisal','play','Advance to Undying; retain build, lose carry, wake in Lastlight.'),
 n('undying','Undying character','character','Build progression continues; no account gains or death Essence. Corpse recovery is self-only.'),
 n('fallen','Later death: Fallen vessel','character','The character persists but cannot be resumed until its frozen resurrection fee is fully paid.'),
 n('resurrect','Mortal runs fund resurrection','vault','Repeatable dynamic row: round((30 + 6 × character level) × (1 + .05 × account level)), minimum 1. Partial investment persists.'),
 n('slots','Vessel slots 2 → 3','vault','200 then 350; separate from the class-card hand-size ladder.'),
 n('legacy','Account legacy survives','account','Town services, discovery, craft knowledge and other account ownership remain; mode policy decides whether current play can add to them.')
],[['mortal'],['deaths'],['covenant'],['offer','slots'],['sworn'],['cross'],['undying','legacy'],['fallen'],['resurrect']],['mortal>deaths','deaths>covenant','covenant>offer','covenant>slots','offer>sworn','sworn>cross','cross>undying','undying>fallen','fallen>resurrect'],r=>/^feat_immortal/.test(r.id),'undying'));

// Narrative changes are reviewed alongside the runtime source; catalog fields are extracted.
const revise=(mapId,id,detail)=>{maps.find(m=>m.id===mapId).nodes.find(n=>n.id===id).detail=detail;};
revise('classes','gems','Discovery grants the actual base starting bar and authored supports; mastery alternates remain separate. Existing grants survive.');
revise('memories','legend','A genuine legendary find or identified recall records permanent per-skill entitlement. It stays dormant until Odyssey stage '+raw.power.awakening.odysseyStage+'. Purchases and Font merges do not count.');
revise('memories','access','Odyssey stage '+raw.power.awakening.odysseyStage+' AND per-skill entitlement from a legendary find or Vault draw. This opens the tree and satisfies skill commissioning knowledge. Debug Codex can bypass.');
revise('memories','wake','After Odyssey stage '+raw.power.awakening.odysseyStage+', randomly awaken one discoverable skill whose secondary access remains locked.');
revise('markets','ready','Odyssey stage '+raw.power.awakening.odysseyStage+' AND a discovered awakened skill, or a discovered support with '+raw.commissionFinds+' genuine finds.');
revise('journey','chain','Account Odyssey stage '+raw.power.vocations.odysseyStage+' first; then class, level, site and sequential quest requirements.');
for(const m of maps){const ids=new Set(m.nodes.map(n=>n.id)); for(const [a,b] of m.edges)if(!ids.has(a)||!ids.has(b))throw Error('bad edge '+a+b);for(const id of m.layers.flat())if(!ids.has(id))throw Error('bad layer');for(const node of m.nodes)if(node.row&&!byId[node.row])throw Error('bad row '+node.row);}
const data={captured:raw.captured,cosmetics:raw.cosmetics,counts:{rows:rows.length,classes:raw.classes.length,packages:raw.packages.length,vocations:raw.vocations.length,quests:raw.quests.length},maps,rows,
 packages:raw.packages.map(p=>({id:p.id,label:p.label,enabled:p.defaultEnabled,alwaysOn:p.alwaysOn,pressureless:p.pressureless,start:p.defaultStartLevel,unlock:p.unlock,tiers:p.tiers})),
 vocations:raw.vocations.map(v=>({id:v.id,name:v.name,home:raw.classes.find(c=>c.id===v.classId)?.name||v.classId,level:v.quest.offerAtLevel||30,secret:!!v.secret,steps:v.quest.steps.length,site:v.secret?.site,gateNode:v.gateNode}))};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'progression-data.json'),JSON.stringify(data));

const cell=v=>String(v??'—').replaceAll('|','\\|').replaceAll('\n',' ');
let appendix=`\n\nLive extraction: ${raw.captured}. **${rows.length} active catalog entries**, excluding dynamic Fallen vessels. Costs below are Mortal Essence.\n`;
const groups=[['Town services, travel, contracts and debug','feature'],['Class card slots','slot'],['Earned class discoveries','class'],['Class mastery','classtier'],['Repeatable Memory purchases','memory'],['Repeatable Skill Grafting','graft'],['World package purchases and tiers','package']];
for(const [title,kind] of groups){appendix+=`\n### ${title}\n\n| Entry | Cost | All required | Any one road | Result |\n|---|---:|---|---|---|\n`;for(const r of rows.filter(r=>r.kind===kind))appendix+=`| ${cell(r.label)} (\`${r.id}\`) | ${r.cost} | ${cell(r.all.join('; ')||'No row-specific prerequisite')} | ${cell(r.any.join(' OR ')||'—')} | ${cell(r.kind==='class'?'Earned discovery + gems; free Vault activation still required':r.effect)} |\n`;}
appendix+='\n### World baselines and executable discovery tests\n\nThe predicate column is retained because human-facing labels can be narrower than their actual OR conditions. Tiers remain sequential even if a later milestone is already held.\n\n| Package | Active before purchase? | Default start level | Base discovery test |\n|---|---|---:|---|\n';
for(const p of raw.packages)appendix+=`| ${p.label} | ${p.alwaysOn?'Always; no purchase':p.defaultEnabled?'Yes':'No'} | ${p.defaultStartLevel} | ${cell(p.unlock?.predicate)} |\n`;
appendix+='\n### Vocation chains\n\nAll chains use the shared per-character cap and sequential-step rules described above. Secret-site discovery is an additional prerequisite; it does not replace the offer level.\n\n| Vocation | Home class | Offer level | Steps | Discovery route |\n|---|---|---:|---:|---|\n';
for(const v of data.vocations)appendix+=`| ${v.name} | ${v.home} | ${v.level} | ${v.steps} | ${v.secret?`Secret site; ${cell(v.site?.npc||'authored site')}`:'Ordinary home-class chain; account discovery opens other classes'} |\n`;
appendix+='\n### Registered quest catalog\n\nQuest offer level is distinct from the generated destination’s level. Ordinary town offers also require the giver to exist; Odyssey auto-enrollment and secret sites use their own paths. Vocation and revenge conditional policies are described above and in their linked sources.\n\n| Quest | Offer level | Destination level | Prior ledger | Reward / persistent outcome |\n|---|---:|---:|---|---|\n';
for(const q of raw.quests){const r=q.reward;appendix+=`| ${cell(q.offerLabel||q.id)} (\`${q.id}\`) | ${q.offerAtLevel??'—'} | ${q.zone?.level??'—'} | ${cell(q.requiresLedger||'Shared route-specific gate')} | ${cell(JSON.stringify(r))} |\n`;}
appendix+='\n### Wardrobe progression outside the Vault catalog\n\n| Cosmetic | Acquisition | Effect |\n|---|---|---|\n';
for(const c of raw.cosmetics)appendix+=`| ${c.name} | ${c.acquire.kind==='credits'?`${c.acquire.cost} Mortal Essence${c.consume?`; repeatable; ${c.consume.starterCharges} included initially`:''}`:cell(c.labels.join(c.acquire.mode==='any'?' OR ':' + '))} | ${cell(c.description)} |\n`;
appendix+=`\n### Inactive legacy bundles\n\n${raw.legacyRows.length} legacy skill/support package rows remain authored for comparison but are hidden by \`legacyGemBundles: false\`. Existing grants survive, and stored investments transfer to random discovery.\n\n`+raw.legacyRows.map(r=>`- ${r.label} (\`${r.id}\`)`).join('\n')+'\n';
const doc=path.join(out,'catalog.md');fs.writeFileSync(doc,'# Extracted progression catalog\n'+appendix);
console.log(JSON.stringify({maps:maps.length,nodes:maps.reduce((n,m)=>n+m.nodes.length,0),rows:rows.length,unmappedRows:rows.filter(r=>!maps.some(m=>m.catalog.includes(r.id))).map(r=>r.id),dataBytes:fs.statSync(path.join(out,'progression-data.json')).size,docBytes:fs.statSync(doc).size}));
