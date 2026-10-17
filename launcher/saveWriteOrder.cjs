// @ts-check
'use strict';
/** Same-page save ordering, shared by the Vite and launcher endpoints. This is
 * transport ordering, not authentication or a policy for independent writers.
 * The serialized save body remains byte-for-byte unchanged. */
function createSaveWriteOrder() {
  /** @type {Map<string,number>} */
  const committed = new Map();
  return {
    /** @param {string} slot @param {string} url
     * @returns {{key:string,sequence:number}|null} */
    select(slot, url) {
      const query = new URL(url, 'http://save.invalid').searchParams;
      const writers = query.getAll('writer'), sequences = query.getAll('sequence');
      if (!writers.length && !sequences.length) return null;
      if (writers.length !== 1 || sequences.length !== 1 || !/^[a-f0-9]{32}$/.test(writers[0]) || !/^[1-9][0-9]*$/.test(sequences[0])) throw Error('Invalid save write order');
      const sequence = Number(sequences[0]);
      if (!Number.isSafeInteger(sequence)) throw Error('Invalid save write sequence');
      return {key:slot + ':' + writers[0], sequence};
    },
    /** Publish the revision only after the real disk write succeeds. A failed
     * newer request therefore cannot suppress an earlier valid pending write.
     * @param {{key:string,sequence:number}|null} selected @param {()=>void} write */
    commit(selected, write) {
      if (selected && selected.sequence <= (committed.get(selected.key) ?? 0)) return false;
      write();
      if (selected) committed.set(selected.key, selected.sequence);
      return true;
    },
  };
}
module.exports = {createSaveWriteOrder};
