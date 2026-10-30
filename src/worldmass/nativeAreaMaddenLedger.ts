/** One genuine raw madness ledger for a campaign/session, shared by all areas. */
import type {MaddenBank} from '../engine/world';
import type {SkillInstance} from '../engine/skills';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
const campaigns=new WeakSet<object>(),maps=new WeakSet<object>(),ledgers=new WeakSet<object>();
const weakHas=WeakMap.prototype.has,brandKey={};
export interface NativeAreaMaddenLedgerInput {campaign:object;authority:NativeAreaActorAuthority<any>;banks:WeakMap<SkillInstance,MaddenBank>}
export class NativeAreaMaddenLedger {
 readonly input:NativeAreaMaddenLedgerInput;
 constructor(raw:NativeAreaMaddenLedgerInput){
  const b=Object.create(null);for(const key of ['campaign','authority','banks']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native madness ledger needs own object binding: '+key);b[key]=d.value;}
  const input:NativeAreaMaddenLedgerInput=Object.freeze(b);
  if(!(input.authority instanceof NativeAreaActorAuthority)||input.authority.campaign!==input.campaign)throw Error('Native madness ledger needs the actual campaign authority');
  try{Reflect.apply(weakHas,input.banks,[brandKey]);}catch{throw Error('Native madness ledger needs an actual WeakMap');}
  if(campaigns.has(input.campaign))throw Error('Native campaign already owns its madness ledger');
  if(maps.has(input.banks))throw Error('Native madness ledger map already has a campaign owner');
  this.input=input;Object.defineProperty(this,'input',{writable:false,configurable:false,enumerable:false});
  // No native routine replaces this World-lifetime map. All ordinary validation
  // precedes the two claims; failed construction consumes neither identity.
  campaigns.add(input.campaign);maps.add(input.banks);ledgers.add(this);
 }
}

/** Nominal constructor provenance; a copied prototype/input cannot mint a ledger. */
export function assertNativeMaddenLedger(ledger:NativeAreaMaddenLedger,campaign:object,authority:object):void {
 if(!ledgers.has(ledger)||ledger.input.campaign!==campaign||ledger.input.authority!==authority)throw Error('Native ground construction needs the actual campaign madness ledger');
}
