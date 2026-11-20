import type { IconSubject } from '../render/skillIconArt';

/** Original Hollow Wake symbol assignments. Stable local IDs, never names or
 * array positions, select art. Shared symbols come from skillIconArt.ts. */
export interface VocationNodeArt {
  silhouette: string;
  emblem: IconSubject;
  nodes: Readonly<Record<string, IconSubject>>;
  author: string;
}
const profile = (silhouette: string, emblem: IconSubject, nodes: VocationNodeArt['nodes']): VocationNodeArt =>
  ({ silhouette, emblem, nodes, author: 'Hollow Wake' });

export const VOCATION_NODE_ART: Readonly<Record<string, VocationNodeArt>> = {
  warbringer: profile('shield', 'horn', { s1:'brokenShield', s2:'boot', s3:'horn', n1:'book', n2:'banner', n3:'heart', n4:'axe', k1:'axes' }),
  gravebinder: profile('coffin', 'skull', { s1:'ghost', s2:'ribs', s3:'grave', n1:'book', n2:'bell', n3:'hand', n4:'coffin', k1:'portal' }),
  wildstalker: profile('fang', 'bow', { s1:'arrow', s2:'boot', s3:'quiver', n1:'blades', n2:'barb', n3:'paw', n4:'target', k1:'wolf' }),
  archmage: profile('diamond', 'rune', { s1:'rune', s2:'chalice', s3:'wind', n1:'runes', n2:'lightning', n3:'pylon', n4:'prism', k1:'crown' }),
  spellblade: profile('diamond', 'sword', { s1:'sword', s2:'rune', s3:'lungs', n1:'blood', n2:'plate', n3:'clock', n4:'buckler', k1:'spiral' }),
  hierophant: profile('sun', 'censer', { s1:'heart', s2:'shield', s3:'candle', n1:'towerShield', n2:'sun', n3:'chalice', n4:'brokenNote', k1:'halo' }),
  greenwarden: profile('leaf', 'tree', { s1:'seed', s2:'leaf', s3:'flower', n1:'book', n2:'house', n3:'thorns', n4:'pod', n5:'shield', k1:'tree' }),
  plaguelord: profile('drop', 'plague', { s1:'snowflake', s2:'crow', s3:'rune', n1:'venom', n2:'zombie', n3:'brokenNote', n4:'scythe', k1:'plague' }),
  shadowdancer: profile('fang', 'hood', { s1:'boot', s2:'target', s3:'hand', n1:'dagger', n2:'shroud', n3:'wound', n4:'blade', k1:'hood' }),
  bloodreaver: profile('drop', 'axes', { s1:'axes', s2:'blood', s3:'drum', n1:'heart', n2:'boot', n3:'wound', n4:'spiral', k1:'skull' }),
  stormweaver: profile('diamond', 'lightning', { s1:'cloud', s2:'lightning', s3:'wave', n1:'orb', n2:'pylon', n3:'tornado', n4:'eye', k1:'spiral' }),
  bastion: profile('shield', 'towerShield', { s1:'plate', s2:'shoulder', s3:'shield', n1:'towerShield', n2:'heart', n3:'mountain', n4:'helm', k1:'house' }),
  corsair: profile('fang', 'rapier', { s1:'eye', s2:'boot', s3:'clock', n1:'blood', n2:'figure', n3:'rapier', n4:'cape', k1:'blades' }),
  ashborn: profile('flame', 'flame', { s1:'flame', s2:'candle', s3:'ash', n1:'ember', n2:'furnace', n3:'pyre', n4:'volcano', k1:'phoenix' }),
  exsanguinator: profile('drop', 'scalpel', { s1:'scalpel', s2:'heart', s3:'hand', n1:'blood', n2:'wound', n3:'dagger', n4:'droplet', k1:'scythe' }),
  stonewrought: profile('hexagon', 'golem', { s1:'rock', s2:'stone', s3:'pick', n1:'book', n2:'brick', n3:'heart', n4:'mountain', k1:'rubble' }),
  packwarden: profile('fang', 'wolf', { s1:'horn', s2:'paw', s3:'heart', n1:'book', n2:'wolf', n3:'house', n4:'claws', k1:'fangs' }),
  groundbreaker: profile('hexagon', 'maul', { s1:'maul', s2:'shoulder', s3:'hammer', n1:'fault', n2:'rubble', n3:'boot', n4:'brokenArmor', k1:'mountain' }),
  spearhead: profile('shield', 'spear', { s1:'spear', s2:'boot', s3:'shoulder', n1:'arrow', n2:'ledger', n3:'pillar', n4:'brokenShield', k1:'portal' }),
  swordsaint: profile('diamond', 'katana', { s1:'lungs', s2:'eye', s3:'clock', n1:'book', n2:'katana', n3:'orb', n4:'ledger', k1:'sword' }),
  pitfighter: profile('hexagon', 'fist', { s1:'fist', s2:'heart', s3:'boot', n1:'hand', n2:'droplet', n3:'crown', n4:'figure', k1:'helm' }),
  thornwall: profile('leaf', 'thorns', { s1:'quills', s2:'boot', s3:'roots', n1:'ledger', n2:'barb', n3:'brokenShield', n4:'tree', k1:'thorns' }),
  impaler: profile('fang', 'spear', { s1:'spear', s2:'hand', s3:'boot', n1:'barb', n2:'pillar', n3:'hook', n4:'arrow', k1:'scythe' }),
  enginewright: profile('hexagon', 'gear', { s1:'gear', s2:'cannon', s3:'crate', n1:'bomb', n2:'trap', n3:'detonator', n4:'eye', k1:'caltrop' }),
  bannerlord: profile('shield', 'banner', { s1:'horn', s2:'flag', s3:'crown', n1:'banner', n2:'skull', n3:'ledger', n4:'trumpet', k1:'helm' }),
  warchanter: profile('sun', 'drum', { s1:'lungs', s2:'horn', s3:'tuningFork', n1:'drum', n2:'brokenNote', n3:'organ', n4:'note', k1:'bell' }),
  veilweaver: profile('fang', 'masks', { s1:'boot', s2:'note', s3:'cloak', n1:'mask', n2:'ash', n3:'portal', n4:'dagger', k1:'masks' }),
  chronarch: profile('diamond', 'hourglass', { s1:'clock', s2:'hand', s3:'ledger', n1:'icicle', n2:'hourglass', n3:'gear', n4:'scythe', k1:'clock' }),
  stillmind: profile('circle', 'palm', { s1:'lungs', s2:'palm', s3:'chalice', n1:'wave', n2:'mountain', n3:'jar', n4:'figure', k1:'flower' }),
  swarmlord: profile('hexagon', 'beetle', { s1:'ant', s2:'shell', s3:'spider', n1:'book', n2:'egg', n3:'venom', n4:'antenna', k1:'beetle' }),
  harborwarden: profile('shield', 'hook', { s1:'ledger', s2:'boot', s3:'eye', n1:'flag', n2:'shield', n3:'crate', n4:'chalice', k1:'banner' }),
};
