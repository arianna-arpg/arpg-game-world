import { Rng } from '../core/rng';
import { validateNativeAreaDescriptor, type NativeAreaDescriptor, type NativeAreaCompilerCertificate } from './nativeArea';
import { copyNativeAreaData, serializeNativeAreaData, restoreNativeAreaData } from './nativeAreaGeometry';
import { restoreNativeAreaRandomState, type NativeAreaRandomState } from './nativeAreaRandom';
import type { MassNativeGeographySpec } from './nativeGeography';

/** Exact saved preparation boundary, distinct from historic area-v1 output.
 * Keep this entire receipt: the area's old source identity does not include
 * transitive random state. Cursors and shape checks are not source authority.
 * The caller's same-build lease and complete native load ordering remain owed. */
export interface NativeAreaGenerationReceipt {
  schema: 1;
  algorithm: 'native-area-generation-continuation-v1';
  area: Readonly<NativeAreaDescriptor>;
  randomStart: Readonly<NativeAreaRandomState>;
  randomAfterGeneration: Readonly<NativeAreaRandomState>;
  randomAfterCapture: Readonly<NativeAreaRandomState>;
}
const same=(a:unknown,b:unknown)=>serializeNativeAreaData(a)===serializeNativeAreaData(b);
export function captureNativeAreaGeneration(raw:NativeAreaGenerationReceipt):Readonly<NativeAreaGenerationReceipt> {
  const receipt=copyNativeAreaData(raw);
  const keys=['schema','algorithm','area','randomStart','randomAfterGeneration','randomAfterCapture'];
  if(!receipt||Reflect.ownKeys(receipt).length!==keys.length||keys.some(k=>!Object.hasOwn(receipt,k))
    ||receipt.schema!==1||receipt.algorithm!=='native-area-generation-continuation-v1')throw Error('Invalid native area generation receipt');
  validateNativeAreaDescriptor(receipt.area);
  const before=restoreNativeAreaRandomState(receipt.randomStart);
  const generated=restoreNativeAreaRandomState(receipt.randomAfterGeneration);
  const captured=restoreNativeAreaRandomState(receipt.randomAfterCapture);
  if(before.geometry!==new Rng(receipt.area.sourceZone.seed!).snapshot())throw Error('Native geometry continuation did not start at its resolved seed');
  if(!same(generated,captured))throw Error('Native capture consumed a generation continuation');
  const witness=Rng.fromState(generated.geometry);
  if(!same(Array.from({length:4},()=>witness.next()),receipt.area.generationNext))throw Error('Native generation continuation differs from its witnesses');
  return receipt;
}
export function serializeNativeAreaGeneration(receipt:NativeAreaGenerationReceipt):string {
  return serializeNativeAreaData(captureNativeAreaGeneration(receipt));
}
/** Restores the recorded area and cursors without generation or registry reads.
 * Expected identities are still a caller-provided source trust boundary. */
export function restoreNativeAreaGeneration(bytes:string,expected:{certificate:NativeAreaCompilerCertificate;geography:MassNativeGeographySpec}):Readonly<NativeAreaGenerationReceipt> {
  const receipt=captureNativeAreaGeneration(restoreNativeAreaData<NativeAreaGenerationReceipt>(bytes));
  const sources=copyNativeAreaData(expected);
  if(!same(receipt.area.certificate,sources.certificate)||!same(receipt.area.geography,sources.geography))throw Error('Native generation continuation requires its exact recorded compiler/source and geography');
  return receipt;
}
