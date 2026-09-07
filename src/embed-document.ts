// Webpack loads the runtime as source text; it executes only in the child frame.
const runtime: string = require('./runtime/interactive.runtime.js');

export function makeDocument(embedCode: string): string {
  const doc = new DOMParser().parseFromString(embedCode, 'text/html');
  const baseStyle = doc.createElement('style');
  baseStyle.textContent = '*{box-sizing:border-box}body{margin:0;overflow:auto;-webkit-text-size-adjust:100%}img,svg,canvas,video{max-width:100%}button,input,select,textarea{font:inherit}';
  const script = doc.createElement('script');
  script.textContent = runtime;
  // Install helpers before author scripts, for fragments and full documents.
  doc.head.prepend(baseStyle);
  doc.head.prepend(script);
  if (!doc.querySelector('meta[name="viewport"]')) {
    const viewport = doc.createElement('meta');
    viewport.name = 'viewport'; viewport.content = 'width=device-width, initial-scale=1';
    doc.head.prepend(viewport);
  }
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
