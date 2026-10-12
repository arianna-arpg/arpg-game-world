/** Shared lifetime ownership of raw area stores. This registry grants no actor,
 * operation or record authority. Tokens are private to the actual slot owners. */
const claims=new WeakMap<object,object>();
export const nativeAreaStoreClaims=Object.freeze({
 has:(value:object):boolean=>claims.has(value),
 get:(value:object):object|undefined=>claims.get(value),
 set:(value:object,token:object):void=>{const prior=claims.get(value);if(prior&&prior!==token)throw Error('Native area store already belongs to another owner or slot');claims.set(value,token);},
});
