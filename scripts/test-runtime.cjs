const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Events {
  constructor() { this.events = new Map(); }
  addEventListener(k, fn) { if (!this.events.has(k)) this.events.set(k, new Set()); this.events.get(k).add(fn); }
  removeEventListener(k, fn) { this.events.get(k)?.delete(fn); }
  emit(k, value) { for (const fn of this.events.get(k) || []) fn(value); }
}
const window = new Events(), document = new Events(), motion = new Events();
const frames = new Map(); let nextId = 0;
motion.matches = false; document.hidden = false; window.matchMedia = () => motion;
const context = vm.createContext({ window, document, requestAnimationFrame: fn => { frames.set(++nextId, fn); return nextId; }, cancelAnimationFrame: id => frames.delete(id) });
const source = readFileSync(join(__dirname, '../src/runtime/interactive.runtime.js'), 'utf8');
vm.runInContext(source, context);
const ui = window.InteractiveEmbed;
vm.runInContext(source, context); assert.equal(window.InteractiveEmbed, ui, 'runtime installs once');
let renders = 0;
const store = ui.store({ x: 1, nested: { y: 2 } }, () => renders++);
store.get().nested.y = 88; assert.equal(store.get().nested.y, 2);
store.set(s => ({ x: s.x + 4 })); assert.equal(store.get().x, 5);
store.reset(); assert.equal(store.get().x, 1); assert.equal(renders, 3);
const deltas = []; const stop = ui.animate(dt => deltas.push(dt));
function tick(time) { const all = Array.from(frames.values()); frames.clear(); all.forEach(fn => fn(time)); }
tick(0); tick(1000); assert.equal(deltas[1], 0.05);
document.hidden = true; document.emit('visibilitychange'); assert.equal(frames.size, 0);
document.hidden = false; document.emit('visibilitychange'); tick(9000); assert.equal(deltas[2], 0);
motion.matches = true; motion.emit('change'); assert.equal(frames.size, 0); stop();
motion.matches = false;
window.parent = {};
const stopVisible = ui.animate(() => {});
window.emit('message',{source:{},data:{type:'interactive-embed-visibility-v1',visible:false}});
assert.equal(frames.size,1,'ignore other frames');
window.emit('message',{source:window.parent,data:{type:'interactive-embed-visibility-v1',visible:false}});
assert.equal(frames.size,0,'pause offscreen');
window.emit('message',{source:window.parent,data:{type:'interactive-embed-visibility-v1',visible:true}});
assert.equal(frames.size,1,'resume onscreen'); stopVisible();
const el = new Events(); el.style = { touchAction: 'pan-y' }; el.getBoundingClientRect = () => ({left:10,top:20,width:100,height:80});
let captured = null; el.setPointerCapture = id => captured = id; el.hasPointerCapture = id => captured === id; el.releasePointerCapture = () => captured = null;
let points = []; const endDrag = ui.drag(el, p => points.push(p));
el.emit('pointerdown', {pointerId:1,button:0,clientX:40,clientY:50,type:'pointerdown'});
assert.equal(points[0].x,30); assert.equal(captured,1);
el.emit('pointercancel',{}); el.emit('pointermove',{pointerId:1}); assert.equal(points.length,1);
endDrag(); assert.equal(el.style.touchAction,'pan-y');
let calls = 0; ui.on(el,'click',() => calls++); window.emit('pagehide'); el.emit('click'); assert.equal(calls,0);
assert.equal(frames.size,0);
console.log('Runtime behavior checks passed: state/reset, idempotence, animation timing, visibility/reduced motion, dragging cancellation, cleanup.');
