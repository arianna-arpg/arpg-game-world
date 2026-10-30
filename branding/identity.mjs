/** Hollow Wake's authored vector identity.
 * The established website/desktop insignia geometry is preserved here.
 * Letter outlines are original repository artwork, with no font dependency. */
export const PALETTE = {
  etherA: '#b0c6e4', etherB: '#8fa8d8',
  teal: '#4fd6c4', violet: '#a98bff', ember: '#ff8a4c',
  ivory: '#f4ebd9', silver: '#d7ddd8', shade: '#a8b9bb',
};
export const INSIGNIA = {
  ringR: 12, coreR: 4.4,
  spokes: [[16, 11.6, 16, 6.2], [19.8, 18.2, 24.5, 20.9], [12.2, 18.2, 7.5, 20.9]],
  points: [{x:16,y:4,color:PALETTE.teal}, {x:26.4,y:22,color:PALETTE.violet}, {x:5.6,y:22,color:PALETTE.ember}],
  ringAlpha: .9, spokeAlpha: .55, lift: 1.1,
};
export const LOCKUP = {
  width: 600, height: 230, top: 35,
  mark: {x:172,y:22,size:256,opacity:.74},
  lines: [
    {word:0, y:67, height:78, width:536},
    {word:1, y:167, height:78, width:436},
  ],
};
// Wedge serifs, tapered stems and optically rounded counters. Coordinates
// use a 100-unit cap height; both lines reuse these exact outlines.
const LETTERS = {
  H: {width:76, path:'M0 0H25V2L18 5V46H58V5L51 2V0H76V2L69 5V95L76 98V100H51V98L58 95V51H18V95L25 98V100H0V98L7 95V5L0 2Z'},
  O: {width:82, path:'M41-2C16-2 0 18 0 50S16 102 41 102S82 82 82 50S66-2 41-2ZM41 3C59 3 69 21 69 50S59 97 41 97S13 79 13 50S23 3 41 3Z'},
  L: {width:66, path:'M0 0H27V2L19 5V95H45Q57 95 63 78H66L62 100H0V98L8 95V5L0 2Z'},
  W: {width:112, path:'M0 0H29V2L20 5L43 77L54 43L42 5L35 2V0H65V2L55 5L78 77L99 8Q100 4 91 2V0H112V2L105 6L75 102H72L57 53L40 102H37L7 5L0 2Z'},
  A: {width:84, path:'M40-2H44L78 95L84 98V100H54V98L64 95L55 69H22L14 93Q13 96 25 98V100H0V98L8 94ZM24 64H53L38 22Z'},
  K: {width:82, path:'M0 0H27V2L19 5V49L60 9Q66 3 54 2V0H80V2L71 5L34 42L75 95L82 98V100H52V98L61 95L26 51L19 58V95L27 98V100H0V98L8 95V5L0 2Z'},
  E: {width:69, path:'M0 0H63L65 19H62Q58 5 47 5H19V46H42Q48 46 50 35H53V62H50Q48 51 42 51H19V95H47Q59 95 66 78H69L65 100H0V98L8 95V5L0 2Z'},
};
const escapeXml = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]);
const defs = `<defs>
  <linearGradient id="ether" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${PALETTE.etherA}"/><stop offset="1" stop-color="${PALETTE.etherB}"/></linearGradient>
  <linearGradient id="letter" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${PALETTE.ivory}"/><stop offset=".48" stop-color="${PALETTE.silver}"/><stop offset="1" stop-color="${PALETTE.shade}"/></linearGradient>
  <radialGradient id="ether-halo"><stop stop-color="${PALETTE.teal}" stop-opacity=".10"/><stop offset=".55" stop-color="${PALETTE.etherB}" stop-opacity=".045"/><stop offset="1" stop-color="${PALETTE.etherB}" stop-opacity="0"/></radialGradient>
</defs>`;
function mark({fine=false, halo=false}={}) {
  const m=INSIGNIA;
  return `<g fill="none" stroke="url(#ether)">
    <circle cx="16" cy="16" r="${m.ringR}" stroke-width="${fine?.15:1.4}" opacity="${m.ringAlpha}"/>
    <path d="${m.spokes.map(([a,b,c,d])=>'M'+a+' '+b+'L'+c+' '+d).join('')}" stroke-width="${fine?.14:1.1}" opacity="${m.spokeAlpha}"/>
    <circle cx="16" cy="16" r="${m.coreR}" stroke-width="${fine?.22:1.5}"/>
  </g>${m.points.map(p => `${halo ? '<circle cx="'+p.x+'" cy="'+p.y+'" r="1.8" fill="'+p.color+'" opacity=".12"/>' : ''}
    <circle cx="${p.x}" cy="${p.y}" r="${fine?.48:2.2}" fill="${p.color}"/>`).join('')}`;
}
export function renderInsignia(options = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" role="img" aria-label="Hollow Wake insignia">${defs}${mark(options)}</svg>\n`;
}
export function renderLockup(title) {
  const words=title.toUpperCase().split(' ');
  if(words.length!==LOCKUP.lines.length) throw Error('Configure LOCKUP.lines for the title word count.');
  const letters=LOCKUP.lines.map(line => {
    const chars=[...words[line.word]], scale=line.height/100;
    const widths=chars.map(c=> {if(!LETTERS[c])throw Error('Author a vector glyph for '+c);return LETTERS[c].width;});
    const gap=(line.width/scale-widths.reduce((a,b)=>a+b,0))/(chars.length-1);
    let x=0;
    return `<g transform="translate(${(LOCKUP.width-line.width)/2} ${line.y}) scale(${scale})">${chars.map((c,i)=>{
      const path='<path transform="translate('+x+' 0)" d="'+LETTERS[c].path+'"/>';x+=widths[i]+gap;return path;
    }).join('')}</g>`;
  }).join('');
  const m=LOCKUP.mark;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${LOCKUP.top} ${LOCKUP.width} ${LOCKUP.height}" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>${defs}
  <ellipse cx="300" cy="150" rx="280" ry="150" fill="url(#ether-halo)"/>
  <g transform="translate(${m.x} ${m.y}) scale(${m.size/32})" opacity="${m.opacity}">${mark({fine:true,halo:true})}</g>
  <g fill="#050c10" fill-rule="evenodd" stroke="#050c10" stroke-width="3" opacity=".8" transform="translate(0 2)">${letters}</g>
  <g fill="url(#letter)" fill-rule="evenodd">${letters}</g>
</svg>\n`;
}
