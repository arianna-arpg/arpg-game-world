// Preview configuration is shared by the coordinated browser/desktop publisher.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export function validatePreviews(value) {
  if (!Array.isArray(value)) throw new Error('Preview configuration must be an array');
  const ids = new Set(), scopes = new Set(), refs = new Set();
  for (const row of value) {
    if (!row || !/^[a-z][a-z0-9-]{0,47}$/.test(row.id ?? '')) throw new Error('Invalid preview id');
    if (ids.has(row.id)) throw new Error('Duplicate preview id');
    if (typeof row.ref !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(row.ref)
        || row.ref.includes('..') || row.ref === 'main' || refs.has(row.ref)) throw new Error('Invalid or duplicate preview branch');
    if (typeof row.storageScope !== 'string' || !/^preview:[a-z][a-z0-9-]{0,47}$/.test(row.storageScope)) throw new Error('Preview requires isolated storage');
    if (scopes.has(row.storageScope)) throw new Error('Preview storage scopes must be unique');
    if (typeof row.worldmass !== 'boolean') throw new Error('Preview worldmass must be boolean');
    ids.add(row.id); scopes.add(row.storageScope); refs.add(row.ref);
  }
  return value;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  throw new Error('Independent browser publication is retired. Use build-coordinated-release.mjs.');
}
