/** Exact primitive-string quoting only. No object validation or identity is
 * memoized, and callers still traverse/validate all current object fields. */
const nativeStringify=JSON.stringify;
const quotedStrings=new Map<string,string>();
const maxBytes=4*1024*1024;
let bytes=0;
export function quoteCanonicalString(value:string):string {
  const stringify=JSON.stringify;
  if(stringify!==nativeStringify)return Reflect.apply(stringify,JSON,[value]) as string;
  const known=quotedStrings.get(value);
  if(known!==undefined){quotedStrings.delete(value);quotedStrings.set(value,known);return known;}
  const quoted=stringify(value),size=(value.length+quoted.length)*2;
  if(size>maxBytes||JSON.stringify!==nativeStringify)return quoted;
  quotedStrings.set(value,quoted);bytes+=size;
  while(quotedStrings.size>4||bytes>maxBytes){const first=quotedStrings.keys().next().value!,prior=quotedStrings.get(first)!;quotedStrings.delete(first);bytes-=(first.length+prior.length)*2;}
  return quoted;
}
