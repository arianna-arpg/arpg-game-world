import { MECHANIC_BURSTS } from '../src/data/mechanicVisuals';
import '../src/render/vis/mechanicVisuals';
import { effectVoiceOf } from '../src/render/vis/effectVoice';

// Same radius, tint, position and clock for both members of each comparison.
// This study can also run without loading any save, actor or menu.
export function mechanicStudy() {
  const tile=document.createElement('canvas'); tile.width=tile.height=112;
  const ctx=tile.getContext('2d',{willReadFrequently:true});
  const signatures=new Map(), rows=[];
  function paint(id,life) {
    ctx.clearRect(0,0,112,112); ctx.save();
    try {
      effectVoiceOf('mechanic:'+id)(ctx,{pos:{x:56,y:56},radius:46,color:'#bce0e4',life,maxLife:1,facing:0},life);
    } finally {ctx.restore();}
  }
  for (const id of Object.keys(MECHANIC_BURSTS)) {
    const hashes=[], counts=[];
    for (const life of [.78,.37]) {
      paint(id,life);
      const pixels=ctx.getImageData(0,0,112,112).data;
      let hash=2166136261, count=0;
      for (let i=3;i<pixels.length;i+=4) {
        if (pixels[i]>8) count++;
        hash=Math.imul(hash^pixels[i],16777619);
      }
      hashes.push(hash>>>0); counts.push(count);
    }
    const signature=hashes.join('/'), twin=signatures.get(signature);
    signatures.set(signature,id);
    const state=twin||counts.some(n=>n<8)?'Missing':'Painter';
    const detail=twin?'Same two-frame silhouette as '+twin:counts.join(' / ')+' pixels above the alpha floor at equal radius and tint';
    rows.push({group:'Mechanic silhouette',id,state,detail});
  }
  const examples=[
    ['Orb discharge','orbZap','Neural Surge','neuralSparkPower'],
    ['Physical burst','burst_physical','Scattered Aftershock','scatteredAftershock'],
    ['Channel Storm','channelStorm','Power Extractor','energyExtractPower'],
    ['Stone death burst','deathStone','Burrow eruption','burrowEruption'],
    ['Blood release','releaseBlood','Stored rupture','ruptureBank'],
  ];
  const sheet=document.createElement('canvas'); sheet.width=830; sheet.height=examples.length*110+70;
  const g=sheet.getContext('2d');g.fillStyle='#192327';g.fillRect(0,0,sheet.width,sheet.height);
  g.fillStyle='#e8efeb';g.font='600 22px system-ui';g.fillText('Mechanic silhouettes',22,31);
  g.fillStyle='#adc1c1';g.font='14px system-ui';g.fillText('Matching tint and radius · early and late frames',22,54);
  for (const [i,row] of examples.entries()) for (const [column,label,id] of [[0,row[0],row[1]],[1,row[2],row[3]]]) {
    const x=column*412+12,y=70+i*110;
    g.fillStyle=i%2?'#202d32':'#243238';g.fillRect(x,y,403,106);
    g.fillStyle='#f3e3c0';g.font='600 14px system-ui';g.fillText(label,x+10,y+21);
    for (const [j,life] of [.78,.37].entries()) {paint(id,life);g.drawImage(tile,x+135+j*112,y+2,102,102);}
  }
  return {rows,preview:sheet.toDataURL()};
}
