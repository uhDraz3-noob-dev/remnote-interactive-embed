// Webpack loads the runtime as source text; it executes only in the child frame.
const runtime: string = require('./runtime/interactive.runtime.js');
const pluginVersion: string = require('../package.json').version;

// RemNote supplies the plugin's asset root before mounting the widget. Its page
// and downloaded module URLs need not live beside the plugin's packaged files.
export function getEngineUrl(pluginRootURL?: string): string {
  if (!pluginRootURL) return '';
  try {
    const root = new URL(pluginRootURL);
    if (root.protocol !== 'http:' && root.protocol !== 'https:') return '';
    root.search = '';
    root.hash = '';
    if (!root.pathname.endsWith('/')) root.pathname += '/';
    const asset = new URL('interactive-3d.js', root);
    asset.searchParams.set('v', pluginVersion);
    return asset.href;
  } catch (_) {
    return ''; // Missing host configuration must not break ordinary 2D embeds.
  }
}

export function makeDocument(embedCode: string, engineUrl?: string): string {
  const doc = new DOMParser().parseFromString(embedCode, 'text/html');
  const baseStyle = doc.createElement('style');
  baseStyle.textContent = '*{box-sizing:border-box}body{margin:0;overflow:auto;-webkit-text-size-adjust:100%}img,svg,canvas,video{max-width:100%}button,input,select,textarea{font:inherit}';
  const script = doc.createElement('script');
  script.textContent = runtime;
  // Only the host supplies this address. Never guess from the RemNote page,
  // a blob-loaded module, or a <base> element in the user's pasted HTML.
  const url = engineUrl || '';
  const config = doc.createElement('script');
  config.textContent = 'window.__interactiveEmbed3DUrl=' + JSON.stringify(url).replace(/</g, '\\u003c') + ';';
  // Install helpers before author scripts, for fragments and full documents.
  doc.head.prepend(baseStyle);
  doc.head.prepend(script);
  doc.head.prepend(config);
  if (!doc.querySelector('meta[name="viewport"]')) {
    const viewport = doc.createElement('meta');
    viewport.name = 'viewport'; viewport.content = 'width=device-width, initial-scale=1';
    doc.head.prepend(viewport);
  }
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
