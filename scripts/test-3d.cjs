// Run after a production build. PLAYWRIGHT_MODULE_PATH may point to an existing installation.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const esbuild=createRequire(require.resolve('esbuild-loader'))('esbuild');
const root=path.join(__dirname,'..');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const built=await esbuild.build({entryPoints:[path.join(root,'src/embed-document.ts')],bundle:true,write:false,format:'iife',globalName:'EmbedDocument',plugins:[{name:'runtime-text',setup(b){b.onLoad({filter:/\.runtime\.js$/},a=>({contents:fs.readFileSync(a.path,'utf8'),loader:'text'}));}}]});
 let engineRequests=0;
 const server=http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.url==='/builder.js'){res.setHeader('Content-Type','text/javascript');res.end(built.outputFiles[0].text);}
  else if(req.url.startsWith('/plugin-files/test/interactive-3d.js')){engineRequests++;res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'dist/interactive-3d.js')));}
  else if(req.url==='/missing.js'){res.writeHead(404);res.end();}
  else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0;background:#101c30}iframe{width:100%;height:1100px;border:0}</style><iframe sandbox="allow-scripts allow-presentation"></iframe><script src="/builder.js"></script>');}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-features=PaintHolding','--disable-site-isolation-trials']});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.waitForFunction(()=>window.EmbedDocument);
  async function mount(code,url){await page.evaluate(({code,url,rootURL})=>document.querySelector('iframe').srcdoc=EmbedDocument.makeDocument(code,url===undefined?EmbedDocument.getEngineUrl(rootURL):url),{code,url,rootURL:origin+'/plugin-files/test/'});await page.frameLocator('iframe').locator('body').waitFor();const f=page.frames().find(f=>f.parentFrame());await f.waitForFunction(()=>window.InteractiveEmbed);return f;}
  const check=(pass,message)=>{assert.ok(pass,message);console.log('PASS '+message);};
  const version=require('../package.json').version;
  check(await page.evaluate(({origin,version})=>{
   const expected=origin+'/plugin-files/test/interactive-3d.js?v='+version;
   return [origin+'/plugin-files/test',origin+'/plugin-files/test/',origin+'/plugin-files/test/?old=1#hash'].every(url=>EmbedDocument.getEngineUrl(url)===expected);
  },{origin,version}),'asset-root path and trailing-slash normalization');
  check(await page.evaluate(()=>[undefined,'','relative/path','blob:https://example.test/id','data:text/plain,wrong','javascript:alert(1)'].every(url=>EmbedDocument.getEngineUrl(url)==='')),'unsupported roots never become guessed asset addresses');
  check(await page.evaluate(()=>new DOMParser().parseFromString(EmbedDocument.makeDocument('<p>2D</p>'),'text/html').querySelector('script').textContent==='window.__interactiveEmbed3DUrl="";'),'missing root does not fall back to the host page');
  let f=await mount('<h2>Plain 2D</h2><div id="stage" style="height:340px;width:100%"></div>');
  check(engineRequests===0,'2D makes zero engine requests');
  check(await f.evaluate(()=>{try{parent.document.body;return false;}catch{return true;}}),'sandbox remains isolated');
  check(await f.evaluate(async()=>{const a=InteractiveEmbed.load3D(),b=InteractiveEmbed.load3D();await a;return a===b&&InteractiveEmbed3D.THREE.REVISION==='185';}),'deduplicated pinned engine loading');
  check(engineRequests===1,'one request for concurrent loaders');
  await f.evaluate(()=>{
   const k=InteractiveEmbed3D;window.stageA=k.createStage(document.getElementById('stage'));
   const mesh=new k.THREE.Mesh(new k.THREE.BoxGeometry(2,2,2),new k.THREE.MeshStandardMaterial({color:0x22aabb}));window.disposals=0;mesh.geometry.addEventListener('dispose',()=>window.disposals++);stageA.add(mesh);
  });
  await f.waitForFunction(()=>stageA.stats().draws>0);
  let stats=await f.evaluate(()=>stageA.stats());check(stats.triangles===12,'general custom geometry renders');
  check(await f.evaluate(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return !!stageA.pick(r.left+r.width/2,r.top+r.height/2); }),'general mesh picking');
  await pause(200);check((await f.evaluate(()=>stageA.stats().draws))===stats.draws,'no idle rendering loop');
  await page.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({type:'interactive-embed-visibility-v1',visible:false},'*'));
  await f.waitForFunction(()=>!InteractiveEmbed.visible);await f.evaluate(()=>stageA.render());await pause(100);
  check((await f.evaluate(()=>stageA.stats().draws))===stats.draws,'offscreen draw requests suppressed');
  await page.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({type:'interactive-embed-visibility-v1',visible:true},'*'));
  await f.waitForFunction(n=>stageA.stats().draws>n,stats.draws);
  check(await f.evaluate(()=>{stageA.dispose();stageA.dispose();return stageA.stats().disposed&&disposals===1&&!document.querySelector('canvas');}),'idempotent resource cleanup');
  await f.evaluate(()=>{window.stageA=InteractiveEmbed3D.createStage(document.getElementById('stage'));const asset=InteractiveEmbed3D.createAsset('heart-chambers-v1');asset.setFilling(.5);asset.setCutaway(true);stageA.add(asset.object);window.assetA=asset;});
  await f.waitForFunction(()=>stageA.stats().draws>0);
  stats=await f.evaluate(()=>stageA.stats());check(stats.triangles<50000,'starter heart within triangle budget');
  check(await f.evaluate(()=>!assetA.parts.shells.visible),'catalog cutaway changes scene');
  check(await f.evaluate(()=>{try{InteractiveEmbed3D.createStage(document.getElementById('stage'));return false;}catch{return true;}}),'one stage per iframe enforced');
  await f.evaluate(()=>{stageA.dispose();window.lost=false;window.stageA=InteractiveEmbed3D.createStage(document.getElementById('stage'),{onUnavailable:()=>window.lost=true});document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();});
  await f.waitForFunction(()=>window.lost);
  check(await f.evaluate(()=>window.lost&&!document.querySelector('canvas')),'context-loss fallback notification and cleanup');
  const beforeSpring=engineRequests;f=await mount(fs.readFileSync(path.join(root,'examples/spring-lab.html'),'utf8'));
  await f.locator('[data-position]').fill('80');check(await f.locator('[data-distance]').innerText()==='0.80 m','existing 2D spring controls');await f.locator('[data-reset]').click();check(await f.locator('[data-distance]').innerText()==='0.40 m','existing 2D reset');check(engineRequests===beforeSpring,'existing 2D never loads 3D');
  const example=fs.readFileSync(path.join(root,'examples/scene-3d.html'),'utf8');f=await mount(example);
  await f.locator('#s3-enable').click();await f.locator('#s3-status').filter({hasText:'3D active'}).waitFor();
  check(!(await f.locator('#s3-fallback').isVisible()),'2D illustration hides when 3D is active');
  await f.locator('[data-select="torus"]').click();check((await f.locator('#s3-observation').innerText()).startsWith('Torus:'),'general example linked controls');
  await f.locator('[data-angle="1.57"]').focus();await page.keyboard.press('Enter');
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  await page.screenshot({path:path.join(root,'test-results/scene-3d-test.png')});
  await page.setViewportSize({width:280,height:1100});check(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'280px 3D layout fits');
  await f.locator('#s3-reset').click();check((await f.locator('#s3-observation').innerText()).startsWith('Cube:'),'reset');
  await f.locator('#s3-flat').click();check(await f.locator('canvas').count()===0,'2D switch removes graphics canvas');
  await f.locator('#s3-enable').click();await f.locator('#s3-status').filter({hasText:'3D active'}).waitFor();check(await f.locator('canvas').count()===1,'recreate after disposal');
  f=await mount(example,origin+'/missing.js');await f.locator('#s3-enable').click();await f.locator('#s3-status').filter({hasText:'Could not load'}).waitFor();check(await f.locator('#s3-fallback').isVisible(),'failed asset load keeps 2D usable');
  // Simulate denied graphics context before an otherwise successful engine load.
  f=await mount('<script>HTMLCanvasElement.prototype.getContext=function(){return null;};</script>'+example);
  await f.locator('#s3-enable').click();await f.locator('#s3-status').filter({hasText:'unavailable'}).waitFor();check(await f.locator('#s3-fallback').isVisible(),'unavailable WebGL keeps fallback');
  // Previous standalone snippets still work without the new host.
  const portable=fs.readFileSync(path.join(root,'src/runtime/interactive.runtime.js'),'utf8');
  await page.evaluate(({example,portable})=>document.querySelector('iframe').srcdoc='<script>'+portable+'</script>'+example,{example,portable});
  f=page.frames().find(f=>f.parentFrame());await f.locator('#s3-enable').click();await f.locator('#s3-status').filter({hasText:'requires Interactive Embed'}).waitFor();check(await f.locator('#s3-fallback').isVisible(),'standalone feature fallback');
  check(errors.length===0,'no uncaught script errors: '+errors.join('; '));
  console.log('3D sandbox checks passed (desktop Chrome software WebGL, reduced motion).');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
