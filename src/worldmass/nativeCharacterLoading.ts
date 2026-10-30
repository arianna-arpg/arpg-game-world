/** Owned inert inputs for the opt-in cooperative factory. Descriptor reads can
 * reenter through proxies; the factory rechecks its lifetime after capture. */
import type {NativeFreshCharacter,NativeFreshCharacterOptions} from './nativeAreaCharacterCreation';
function data(input:object,allowed:readonly string[],label:string):Record<string,unknown> {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)throw Error('Native loading needs ordinary '+label);
  const result:Record<string,unknown>=Object.create(null) as Record<string,unknown>;
  for(const key of Reflect.ownKeys(input)){
    if(typeof key!=='string'||!allowed.includes(key))throw Error('Unsupported native loading '+label+' field');
    const d=Object.getOwnPropertyDescriptor(input,key);
    if(!d||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('Native loading needs own data '+label+' fields');
    Object.defineProperty(result,key,{value:d.value,enumerable:true,writable:false,configurable:false});
  }
  return result;
}
export function copyNativeLoadingCharacter(input:NativeFreshCharacter):NativeFreshCharacter {
  const row=data(input,['classDef','options','labArts','graft','scene','provisionalMu'],'character');
  for(const key of ['graft','scene'])if(row[key]!==undefined&&typeof row[key]!=='string')throw Error('Invalid native loading '+key);
  if(row.labArts!==undefined&&typeof row.labArts!=='boolean'||row.provisionalMu!==undefined&&row.provisionalMu!==true)throw Error('Invalid native loading character policy');
  let options:NativeFreshCharacterOptions=Object.freeze({modeId:undefined,charId:undefined,name:undefined,kit:undefined});
  if(row.options!==undefined){
    const raw=data(row.options as object,['modeId','charId','name','kit'],'options');
    for(const key of ['modeId','charId','name'])if(raw[key]!==undefined&&typeof raw[key]!=='string')throw Error('Invalid native loading '+key);
    const copied:{modeId?:string;charId?:string;name?:string;kit?:readonly (string|null)[]}={modeId:undefined,charId:undefined,name:undefined,kit:undefined};
    for(const key of ['modeId','charId','name'] as const)if(raw[key]!==undefined)copied[key]=raw[key] as string;
    if(raw.kit!==undefined){
      const kit=raw.kit;if(!Array.isArray(kit)||Object.getPrototypeOf(kit)!==Array.prototype)throw Error('Native loading kit must be an ordinary array');
      const length=Object.getOwnPropertyDescriptor(kit,'length')?.value;
      if(!Number.isSafeInteger(length)||length<0||Reflect.ownKeys(kit).length!==length+1)throw Error('Native loading kit must be dense');
      const slots:(string|null)[]=[];
      for(let i=0;i<length;i++){const d=Object.getOwnPropertyDescriptor(kit,String(i));if(!d||!d.enumerable||!Object.hasOwn(d,'value')||d.value!==null&&typeof d.value!=='string')throw Error('Native loading kit needs own string/null data');slots.push(d.value);}
      copied.kit=Object.freeze(slots);
    }
    options=Object.freeze(copied);
  }
  return Object.freeze({classDef:row.classDef as NativeFreshCharacter['classDef'],options,labArts:row.labArts as boolean|undefined,graft:row.graft as string|undefined,scene:row.scene as string|undefined,provisionalMu:row.provisionalMu as true|undefined});
}
