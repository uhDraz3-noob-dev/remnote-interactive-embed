# Interactive Embed v1

The host installs `window.InteractiveEmbed` inside each sandbox before author scripts. Existing ordinary HTML/CSS/JavaScript snippets still work. No RemNote API, persistence, or parent-page access is exposed by this toolkit. The iframe permissions remain `allow-scripts allow-presentation`.

For portable output, inline the exact `src/runtime/interactive.runtime.js` file in a script before the application script. It detects an existing v1 installation and avoids installing twice. Do not alter this shared runtime in individual interactives.

## Authoring contract

Use a fragment with one root marked `data-interactive-embed="1"`, scoped CSS, inline SVG/Canvas as appropriate, and an IIFE script. Use JSON-serializable state, a central render function, explicit event listeners, and a Reset control. Recommended height goes in a leading HTML comment. No external dependencies are required or loaded by the runtime. The skill generates offline snippets; the host does not block all network requests in arbitrary pasted code.

| API | Contract |
| --- | --- |
| `version` | Number `1`. Feature-detect before use. |
| `store(initial, render)` | Plain JSON object; renders immediately. Returns `get()` (copy), `set(patchOrFunction)` (shallow merge), `reset()`. Render should only update the view, never recursively update the store. |
| `on(element, event, callback, options?)` | Adds a listener; returns a cleanup function. |
| `animate((dt, elapsed) => {})` | Seconds; first dt is zero; subsequent dt capped at 0.05. At most 30 callbacks/second. Returns stop function. Pauses while document hidden, reduced motion requested, or host reports offscreen; provide a Step control and initial static render. Elapsed excludes hidden time. |
| `drag(element, ({x,y,width,height,phase}) => {})` | Local CSS-pixel pointer coordinates; pointer capture with cancellation. Returns cleanup. Sets `touch-action:none` on that surface only; supply sliders/buttons for keyboard and touch alternatives. SVG coordinates require conversion through the viewBox. |
| `canvas(element, (ctx,width,height) => {})` | 2D canvas; CSS-pixel drawing coordinates, backing resolution capped at 2×. Returns `redraw()` and `dispose()`. Redraw is batched; canvas clears each redraw. CSS must set width AND explicit height/aspect-ratio to prevent size feedback. |
| `clamp(value,min,max)` | Numeric bounds; validate user input before calling. |
| `reducedMotion` | Current boolean preference. |

Listeners, animation loops, and canvas observers registered with helpers are disposed on pagehide. Restart remounts the frame and clears its in-memory state. State is not saved between runs/devices. Uncaught script errors show a compact message inside the frame; a blocking infinite loop cannot reliably be recovered by this JavaScript handler.

## Rich interaction patterns

Combine linked views around a shared state: SVG map selection updates a detail panel; controls update a Canvas simulation and numeric output; branching cases update explanations and progress. Stable layouts with optional pan/zoom are preferable to constantly moving maps. WebGL and Web Audio can be used directly when needed, with feature detection and a 2D/text or silent fallback. Start audio on a user gesture. Do not require experimental APIs or raw React/TypeScript compilation at paste time.

Use native controls with labels, visible focus, 44px targets, 16px input text, and a 280px-wide layout. Drag gestures must have a non-drag alternative. Reduced motion must preserve learning via manual stepping. Avoid `100vh` layouts: content scrolls in the saved-height viewport; Larger view raises it to at least 800px without restarting. This is not OS fullscreen or automatic content-height fitting.

## Performance

Code is prepared only on Run; stopped, collapsed, or editing embeds have no running content iframe. The host observes frame visibility and sends a boolean hint to pause toolkit animation loops offscreen. This does not pause arbitrary pasted timers, CSS animations, Web Audio, or code that ignores the toolkit. Inactive widgets still have the RemNote SDK/UI overhead and their saved source; hundreds of widgets or large embedded assets can affect document load and sync size. Run only the interactives in use. No performance figures for a large real knowledge base or physical phones are claimed.

Keep one managed loop, bounded workloads, small state, and redraw only on changes. Canvas resolution is capped at 2× and backing buffers are reused until size changes. Do not write simulation frames back to RemNote. A sandbox isolates access, not CPU usage.

## Verify

Test the actual final snippet inside `sandbox="allow-scripts allow-presentation"`, not only as a top-level page. Check first render, meaningful actions, reset, repeat restart, narrow width, keyboard alternatives, reduced motion, and console errors. Never claim all-device compatibility or guaranteed correctness from a desktop test alone. See `examples/spring-lab.html` for a working host-runtime example.
