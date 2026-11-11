/* Project the resolved game graph, including its generated crest. No layout
   algorithm: a uniform translation is the only change to node coordinates. */
export function projectVocationTrees({vocations, nodes, adjacency, attributes={}, choices={}}) {
  const radius={small:9,notable:14,keystone:17,vocation:15,choice:15,attr:11,start:13};
  const fill={small:'#26262e',notable:'#3a3a5a',keystone:'#5a2a3a',vocation:'#241f33',choice:'#33244a'};
  const labels={small:'Passive',notable:'Notable',keystone:'Keystone',vocation:'Vocation crest',choice:'Choice node',attr:'Attribute',start:'Class start'};
  return Object.values(vocations).map(vocation=>{
    if(!/^[a-z0-9_-]+$/.test(vocation.id))throw new Error('Invalid Vocation export ID: '+vocation.id);
    const source=nodes.filter(node=>node.vocation===vocation.id);
    const crest=source.find(node=>node.kind==='vocation');
    if(!crest)throw new Error('Missing Vocation crest: '+vocation.id);
    const ids=new Set(source.map(node=>node.id)),seen=new Set(),edges=[];
    for(const node of source)for(const target of adjacency[node.id]||[]){
      if(!ids.has(target))continue; // The external class gate is not part of this tree.
      const pair=[node.id,target].sort(),key=pair.join('|');
      if(!seen.has(key)){seen.add(key);edges.push(pair);}
    }
    const projected=source.map(node=>{
      if(!Number.isFinite(node.x)||!Number.isFinite(node.y))throw new Error('Invalid Vocation position: '+node.id);
      const lines=[];
      if(node.attributes)lines.push(Object.entries(node.attributes).map(([key,value])=>'+'+value+' '+(attributes[key]?.label||key)).join(', '));
      if(node.attributesPct)lines.push(Object.entries(node.attributesPct).map(([key,value])=>Math.round(value*100)+'% increased '+(attributes[key]?.label||key)).join(', '));
      const group=choices.choiceGroupOf?.(node);
      const choice=group?{name:group.name,pick:choices.choicePickLimit(node),unique:group.unique||'node',deal:group.deal||'each',
        options:group.options.map(option=>({id:option.id,name:option.name,description:option.description}))}:null;
      return {id:node.id,name:node.name,description:node.description||'',kind:node.kind,kindLabel:labels[node.kind]||node.kind,
        x:node.x-crest.x,y:node.y-crest.y,radius:radius[node.kind]||9,fill:fill[node.kind]||fill.small,
        stroke:node.kind==='vocation'?vocation.color:'#4a4a5e',strokeWidth:node.kind==='small'?1.5:2.5,
        attributes:lines,choice};
    });
    const xs=projected.map(node=>node.x),ys=projected.map(node=>node.y),pad=45;
    return {id:vocation.id,name:vocation.name,color:vocation.color,root:crest.id,
      bounds:{x:Math.min(...xs)-pad,y:Math.min(...ys)-pad,width:Math.max(...xs)-Math.min(...xs)+pad*2,height:Math.max(...ys)-Math.min(...ys)+pad*2},
      nodes:projected,edges};
  });
}
