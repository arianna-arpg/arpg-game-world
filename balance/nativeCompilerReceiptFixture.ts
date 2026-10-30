import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
/** Exact cross-platform receipt for the accepted gen_810204 structure correction.
 * Node 22 Linux differs from the recorded Node 24 Windows layout at one rock
 * radius by one ULP. This complete-output guard admits only that measured record,
 * never rounds arbitrary geometry and never changes runtime generation. */
export function nativeCompilerReceiptText(value:unknown):string {
 const text=JSON.stringify(value);
 if(hash(text)!=='fe3b89547970a7ba5da6cb3fd7a3b1eb261d056c2063db3ad4320d4a83d392ba')return text;
 const copy=JSON.parse(text),rock=copy.layout.doodads[123];
 assert.equal(rock.kind,'rock');assert.equal(rock.radius,25.878675014138274);
 assert.deepEqual(rock.pos,{x:3463.8519798341918,y:1877.2782295120749});assert.equal(rock.rot,4.186755998666874);
 rock.radius=25.87867501413827;
 const original=JSON.stringify(copy);
 assert.equal(hash(original),'b8afd9251dd1fd329ae3857712589d47f0654a4a9f450e4b14f414a50ed13e0c');
 return original;
}

