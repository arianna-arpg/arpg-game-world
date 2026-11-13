// The exact kind + canonical ID is the join. Names and item bases are not IDs.
export function makeIconResolver(manifest){
 // Paths are derived from kind + ID in the browser; only a short content hash
 // travels with each entry. This keeps the compact collection within budget.
 const selected=new Map(manifest.entries.map(entry=>[entry.key,entry.imageSha256.slice(0,12)]));
 return (kind,id)=>selected.get(kind+':'+id)||null;
}
