# Optional 3D · Interactive Embed 0.3.0

Use this general-purpose contract for plugin-backed 3D snippets: geometry, molecules, mechanisms, spatial graphs, anatomy or other suitable concepts. Build custom geometry and scene graphs with `kit.THREE`; the starter asset catalog is optional, not a domain restriction. Keep 2D for concepts that do not benefit from spatial depth. A simple learning objective may still deserve rich materials, lighting and composition; do not equate clarity with visual blandness.

## Loading and compatibility

The host injects the lightweight v1 runtime first. `await InteractiveEmbed.load3D()` loads one separately bundled `interactive-3d.js` from the plugin installation, not a CDN. It returns the same promise for concurrent calls within a frame. There is no engine request until called. Three.js is pinned to 0.185.1; the engine exposes API version 1. Existing inline v1 runtime guards preserve the newer host runtime.

Feature-detect `ui.load3D` and catch rejection. Show an interactive SVG/HTML fallback first; leave it usable if loading, WebGL2 or the graphics context fails. Snippets remain one paste, but their 3D layer requires plugin 0.3.0+ and access to its packaged asset. Do not describe them as standalone/offline-guaranteed HTML. The engine may be browser-cached, but each running iframe has its own JavaScript and GPU resources. No new sandbox permissions are granted.

## Engine API

`const kit = await ui.load3D()` returns:

- `version: 1`, `engineRevision`, `THREE`: the bundled Three.js namespace. Never import Three.js or duplicate its source in pasted snippets.
- `createStage(container, {label?, background?, camera?, onUnavailable?})`: one managed stage per iframe; throws if another is active or graphics cannot initialize. Container must be connected with explicit CSS height and fluid width. Default camera `[5,2.7,8]`, target `[0,0.25,0]`; background is a Three.js color value. `onUnavailable(message)` runs after cleanup on context loss. Set the supplied canvas label and provide native keyboard alternatives.
- `createAsset(id)`: creates a fresh procedural asset instance from the catalog below. Add its `object` with `stage.add(asset.object)` so the stage owns cleanup.
- `catalog`: immutable asset IDs, labels and accuracy descriptions. Do not invent additional asset IDs or claim anatomical validation.

Stage API:

| Member | Purpose |
| --- | --- |
| `scene`, `camera`, `controls` | Three.js scene, perspective camera and OrbitControls. Pointer orbit is enabled; pan, wheel/pinch zoom, damping and autorotation are disabled. Use explicit zoom buttons to avoid trapping note scrolling. |
| `add(object)` | Add and track an Object3D; returns that object. Do not share disposable materials/geometry between independent stages. |
| `render()` | Schedule one redraw; coalesces calls and suppresses drawing when document/host is hidden. Call after changing objects. There is no perpetual render loop. |
| `setView(azimuth, elevation=0.25)` | Camera angles in radians around the target. Use with turn buttons as a drag alternative. |
| `zoom(factor)` | Scale camera distance, clamped to 3–18 units. Factors below 1 move closer. |
| `resetCamera()` | Restore initial camera and target. Reset learner state separately. |
| `pick(clientX, clientY)` | Closest visible mesh raycast result or null. Filter its object name against known selectable parts; ignore pointer drags and handle pointercancel. |
| `dispose()` | Idempotently cancel work, disconnect controls/observers, release tracked geometry/material/texture resources, dispose renderer, lose the context and remove canvas. Called automatically on pagehide. Also call when switching to 2D. |
| `stats()` | Draw count, disposed flag, backing dimensions, geometry/texture counts and last-render triangles for testing. |

For a moving simulation, use one `ui.animate()` loop to mutate objects and call `stage.render()`; stop it when settled, on switching to 2D, and on error. Manual controls and static initial rendering must still teach the concept with reduced motion. Do not use Three.js `setAnimationLoop`, custom perpetual timers, damping or autorotation that bypass lifecycle handling.

The base runtime also provides `ui.onDispose(cleanup)` (idempotent cleanup registration), `ui.onVisibility(callback)` (immediate and later visible/hidden notifications, returns unsubscribe), and `ui.visible`. These are additive v1 capabilities; feature-detect on older installations.

## Bundled asset catalog

### `heart-chambers-v1`

Original stylized four-chamber model, curved great-vessel tubes and translucent outer shells. NOT a scan-derived heart, validated anatomy, valve mechanism or physiological model.

- `{object, parts, setCutaway(boolean), setFilling(fraction)}`
- `parts`: `rightAtrium`, `rightVentricle`, `leftAtrium`, `leftVentricle` (cavity meshes), `shells`, `blood`, `vessels` (groups), `aorta`, `pulmonaryArtery` (meshes).
- `setCutaway(true)` hides outer shells, rather than performing anatomical dissection.
- `setFilling(0.15…1)` uniformly changes all cavity volumes using cube-root linear scaling. It does not compute filling pressures, valve events or a cardiac cycle. Parts' base scales are in `userData.baseScale` if a justified model controls chambers independently.

### `vessel-cutaway-v1`

Original cylindrical vessel-wall segment with an open side and a lumen cylinder. No fluid solver or tissue mechanics.

- `{object, parts: {wall,lumen}, setRadius(fraction)}`
- `setRadius(0.1…0.95)` changes the lumen radius relative to the wall, not automatically flow or resistance.

More detailed assets require an explicit future catalog addition with licensing/provenance, meaningful named parts, mesh/texture budgets and fallback testing. There is no arbitrary URL/model loader in this API. Do not pretend these starter shapes are photorealistic anatomy.

## Budgets and acceptance

Stage buffers are capped at 1.5× device-pixel ratio, 1.5 million pixels and 2048 pixels per dimension. Default lighting uses no shadow maps or external textures. Aim for one stage, ≤50,000 visible triangles and ≤80 draw calls in ordinary educational scenes; these are authoring budgets, not a security boundary. Do not add expensive transmission, postprocessing or huge textures without measuring on target devices. Retaining a hidden stage still retains GPU memory; dispose it when switching modes.

Test the real host document builder inside `sandbox="allow-scripts allow-presentation"`: zero engine requests for 2D, concurrent loading, interactive picking/keyboard controls, idle/offscreen draw counts, failed loading, unavailable WebGL, context loss, reduced motion, 280px layouts, Reset and repeated mount/dispose. Desktop software-rendered tests are not physical iOS/Android validation. Read and adapt `../assets/scene-3d.html` as the general lifecycle example, not a universal visual template. `../assets/heart-3d.html` additionally demonstrates optional catalog assets and picking.
