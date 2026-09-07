// Local validation host; never included in the plugin bundle.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.join(__dirname, '..');
const esbuild = createRequire(require.resolve('esbuild-loader'))('esbuild');
(async () => {
  const result = await esbuild.build({entryPoints:[path.join(root,'src/embed-document.ts')],bundle:true,write:false,format:'iife',globalName:'EmbedDocument',plugins:[{name:'runtime-text',setup(build){build.onLoad({filter:/\.runtime\.js$/},args=>({contents:fs.readFileSync(args.path,'utf8'),loader:'text'}));}}]});
  const checks = `<script>
    setTimeout(() => {
      const results=[]; const check=(name,pass)=>results.push({name,pass});
      const root=document.getElementById('spring-lab');
      check('runtime ready',window.InteractiveEmbed.version===1);
      const pos=root.querySelector('[data-position]'); pos.value='80';pos.dispatchEvent(new Event('input',{bubbles:true}));
      check('linked control updates',root.querySelector('[data-distance]').textContent==='0.80 m');
      root.querySelector('[data-reset]').click();check('reset restores state',root.querySelector('[data-distance]').textContent==='0.40 m');
      root.querySelector('[data-step]').click();check('step changes state',root.querySelector('[data-position]').value !== '40');
      root.querySelector('[data-reset]').click();
      check('fits narrow viewport',document.documentElement.scrollWidth<=innerWidth);
      try { parent.document.body;check('sandbox isolates parent',false); } catch (_) { check('sandbox isolates parent',true); }
      const canvas=root.querySelector('canvas');check('canvas has painted',canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0));
      check('no runtime error',!document.getElementById('ie-runtime-error'));
      parent.postMessage({kind:'validation',results},'*');
    },500);
  <\/script>`;
  const html = `<!doctype html><meta name="viewport" content="width=device-width"><title>Interactive Embed sandbox verification</title>
    <style>body{font:16px system-ui;margin:20px;background:#eef1f8}button{padding:12px;margin:4px}iframe{display:block;border:0;max-width:100%;height:850px}pre{white-space:pre-wrap}</style>
    <h1>Interactive Embed sandbox verification</h1><button id="wide">Desktop width</button><button id="narrow">Phone width (280px)</button><button id="restart">Restart</button><button id="error">Test error display</button><pre id="results">Starting checks…</pre>
    <iframe title="Test interactive" sandbox="allow-scripts allow-presentation"></iframe><script src="/builder.js"></script>
    <script>
      const frame=document.querySelector('iframe');let snippet='';
      function run(){frame.srcdoc=EmbedDocument.makeDocument(snippet+${JSON.stringify(checks).replace(/</g, '\\u003c')});}
      document.getElementById('wide').onclick=()=>{frame.style.width='900px';run()};
      document.getElementById('narrow').onclick=()=>{frame.style.width='280px';run()};
      document.getElementById('restart').onclick=run;
      document.getElementById('error').onclick=()=>{frame.srcdoc=EmbedDocument.makeDocument('<h1>Error example</h1><script>throw new Error("Test error feedback")<'+ '/script>')};
      window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.data.kind==='validation')document.getElementById('results').textContent=e.data.results.map(r=>(r.pass?'PASS ':'FAIL ')+r.name).join('\\n')});
      fetch('/example').then(r=>r.text()).then(s=>{snippet=s;frame.style.width='900px';run()});
    </script>`;
  http.createServer((req,res)=>{
    if(req.url==='/builder.js'){res.setHeader('Content-Type','text/javascript');res.end(result.outputFiles[0].text);}
    else if(req.url==='/example'){res.setHeader('Content-Type','text/plain');res.end(fs.readFileSync(path.join(root,'examples/spring-lab.html')));}
    else {res.setHeader('Content-Type','text/html');res.end(html);}
  }).listen(8091,'127.0.0.1',()=>console.log('Validation at http://127.0.0.1:8091'));
})();
