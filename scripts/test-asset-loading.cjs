// Exercise the real React widget with a minimal SDK host, not a manually injected engine URL.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const esbuild=createRequire(require.resolve('esbuild-loader'))('esbuild');
const root=path.join(__dirname,'..');
const fixture='<button id="engine-start">Load 3D</button><p id="engine-result"></p><script>document.getElementById("engine-start").addEventListener("click",async()=>{try{const kit=await InteractiveEmbed.load3D();document.getElementById("engine-result").textContent="Loaded "+kit.engineRevision;}catch(e){document.getElementById("engine-result").textContent=e.message;}});</script>';
const sdk=`import React from 'react';import ReactDOM from 'react-dom';
export const AppEvents={RemChanged:'rem-changed'},WidgetLocation={UnderRemEditor:'under-rem'};
const rem={getPowerupProperty:async(_,slot)=>slot==='embed_code'?window.testCode:slot==='embed_height'?'420':'Test embed'};
const plugin={rootURL:window.testRootURL,widget:{getWidgetContext:async()=>({remId:'fixture'})},rem:{findOne:async()=>rem}};
export const usePlugin=()=>plugin;
export function useRunAsync(fn,deps){const [value,setValue]=React.useState();React.useEffect(()=>{let live=true;Promise.resolve(fn()).then(v=>{if(live)setValue(v);});return()=>{live=false;};},deps);return value;}
export function useAPIEventListener(){}
export function renderWidget(Component){ReactDOM.render(React.createElement(Component),document.getElementById('mount'));}`;
(async()=>{
 const built=await esbuild.build({entryPoints:[path.join(root,'src/widgets/interactive_embed.tsx')],bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'test-host',setup(b){
  b.onResolve({filter:/^@remnote\/plugin-sdk$/},()=>({path:'sdk',namespace:'test-sdk'}));
  b.onLoad({filter:/.*/,namespace:'test-sdk'},()=>({contents:sdk,loader:'js',resolveDir:root}));
  b.onLoad({filter:/\.runtime\.js$/},a=>({contents:fs.readFileSync(a.path,'utf8'),loader:'text'}));
  b.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));
 }}]});
 const requests=[];
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('Access-Control-Allow-Origin','*');
  if(url.pathname==='/widget.js'){res.setHeader('Content-Type','text/javascript');res.end(built.outputFiles[0].text);}
  else if(url.pathname.startsWith('/plugin-files/')&&url.pathname.endsWith('/interactive-3d.js')){requests.push(req.url);res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'dist/interactive-3d.js')));}
  else if(url.pathname.endsWith('/interactive-3d.js')){requests.push(req.url);res.writeHead(404);res.end('Not a plugin asset address');}
  else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="mount"></div>');}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const suffix of ['/', '']){
   await page.goto(origin+'/desktop-shell/notes/');
   await page.evaluate(({code,rootURL})=>{window.testCode=code;window.testRootURL=rootURL;},{code:fixture,rootURL:origin+'/plugin-files/interactive-embed'+suffix});
   await page.addScriptTag({url:origin+'/widget.js'});
   const before=requests.length;await page.getByRole('button',{name:'Run interactive',exact:true}).click();
   const frame=page.frameLocator('iframe[title="Interactive RemNote embed"]');
   await frame.locator('#engine-start').waitFor();assert.equal(requests.length,before,'No engine request before user starts 3D');
   await frame.locator('#engine-start').click();await frame.locator('#engine-result').filter({hasText:/Loaded|Could not|requires/}).waitFor();
   const result=await frame.locator('#engine-result').innerText();
   assert.equal(result,'Loaded 185','Real widget must use SDK rootURL, not desktop-shell page URL. Requests: '+JSON.stringify(requests));
   assert.equal(new URL(requests.at(-1),origin).pathname,'/plugin-files/interactive-embed/interactive-3d.js');
   assert.equal(new URL(requests.at(-1),origin).searchParams.get('v'),require('../package.json').version);
   assert.equal(await page.locator('iframe').getAttribute('sandbox'),'allow-scripts allow-presentation');
   console.log('PASS real widget uses SDK plugin root'+(suffix?' with':' without')+' trailing slash; lazy load and sandbox unchanged');
  }
  if(process.env.PA_SAMPLE_PATH){
   const code=fs.readFileSync(process.env.PA_SAMPLE_PATH,'utf8');
   await page.goto(origin+'/desktop-shell/notes/');
   await page.evaluate(({code,rootURL})=>{window.testCode=code;window.testRootURL=rootURL;},{code,rootURL:origin+'/plugin-files/interactive-embed/'});
   await page.addScriptTag({url:origin+'/widget.js'});
   await page.getByRole('button',{name:'Run interactive',exact:true}).click();
   const frame=page.frameLocator('iframe[title="Interactive RemNote embed"]');
   await frame.locator('#p3-enable').click();await frame.locator('#p3-status').filter({hasText:'3D ready'}).waitFor();
   assert.equal(await frame.locator('canvas').count(),1);
   await frame.locator('[data-site="3"]').click();assert.ok((await frame.locator('#p3-ranges').innerText()).includes('6–12'));
   await frame.locator('#p3-flat').click();assert.equal(await frame.locator('canvas').count(),0);
   console.log('PASS unchanged PA catheter snippet loads 3D through the real widget and SDK root, then releases graphics');
  }
  assert.deepEqual(errors,[]);console.log('Asset-loading integration checks passed.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
