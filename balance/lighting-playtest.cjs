// Local, isolated build preview with opt-in diagnostic capture. Game saves
// use this origin's browser storage; this server never exposes player saves.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..','dist'),reports=path.resolve(__dirname,'reports');
const port=Number(process.env.LIGHTING_QA_PORT||5187);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.mp3':'audio/mpeg'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/__visibility-diagnostics'&&req.method==='POST'){
  if(req.headers.origin && req.headers.origin!=='http://127.0.0.1:'+port){res.writeHead(403);res.end();return;}
  let body='',size=0;req.on('data',chunk=>{size+=chunk.length;if(size>16*1024*1024){req.destroy();return;}body+=chunk});
  req.on('end',()=>{try{const report=JSON.parse(body);if(report.version!==1||!Array.isArray(report.frames))throw Error('Invalid capture');
   fs.mkdirSync(reports,{recursive:true});const name='lighting-capture-'+Date.now()+'.json';
   fs.writeFileSync(path.join(reports,name),body);console.log('Captured '+name);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({name}));
  }catch{res.writeHead(400);res.end();}});return;
 }
 if(req.method!=='GET'||url.pathname.startsWith('/__')){res.writeHead(404);res.end();return;}
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));}catch{res.writeHead(400);res.end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);});
}).listen(port,'127.0.0.1',()=>console.log('Lighting playtest: http://127.0.0.1:'+port+'/?lightingDiagnostics=1&lightingCaptureSink=1'));
