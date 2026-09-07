---
name: remnote-interactive-builder
description: Turn a concept from the current conversation or user-supplied material into a single self-contained HTML/CSS/JavaScript learning interactive made to paste into Interactive Embed for RemNote. Use for interactive explanations, simulations, mind maps, process explorers, or paste-ready RemNote embed code; do not use for ordinary prose explanations or standalone websites.
---

# RemNote Interactive Builder

Create one focused, paste-ready learning interaction from the concept the user has supplied or that was just explained in the conversation. If the concept and intended learner are already clear, proceed without asking the user to restate them.

## Shape the interaction

Identify the central learning objective and the few relationships, decisions, stages, or misconceptions the learner should actively explore. Prefer depth on one idea over a miniature textbook page. Preserve genuine uncertainty in the source material instead of inventing precision.

Choose the interaction that best exposes the concept's structure. When the choice is not obvious or the user requests alternatives, read [interaction-patterns.md](references/interaction-patterns.md).

Include:

- a concise title and one-sentence instruction;
- a meaningful action by the learner, not merely animated decoration;
- immediate visual or explanatory feedback;
- a Reset control when the interaction has state;
- a compact takeaway that connects the interaction back to the concept.

## Build for Interactive Embed

Use the Interactive Embed v1 contract. Read [runtime-contract.md](references/runtime-contract.md) before generating code that uses the toolkit. Reuse the exact [interactive.runtime.js](assets/interactive.runtime.js) source in an inline script before the application script so the result stays self-contained and also works in older plugin versions. Do not recreate, shorten, or modify the runtime per concept. The current plugin injects the same runtime automatically; the guard prevents double installation.

Mark the single root `data-interactive-embed="1"`. Build a plain JSON state model and a render function. Use `InteractiveEmbed.store` for coordinated controls and Reset, `animate` for simulations, `drag` for pointer capture, and `canvas` for responsive 2D rendering when those helpers fit. Use native SVG and CSS for crisp diagrams and visual design. These are building blocks, not a fixed page design: choose layout, color, typography, and meaningful interactions for the concept.

For complex requests, support linked views, scenario presets, progressive disclosure, zoom controls, prediction/feedback, and manual stepping where they help explain the same objective. Do not impose a two-pattern maximum when the user requests a richer tool. Read [spring-lab.html](assets/spring-lab.html) as a runnable example when using animation or Canvas; replace its concept and interface rather than always making a spring simulator.

Return one self-contained HTML fragment with its `<style>` and `<script>` included. A complete HTML page is unnecessary. The result must work when pasted into the RemNote Interactive Embed plugin's editor.

Use a unique short prefix for every class and element ID so the snippet cannot collide with other content. Scope all CSS beneath one root container. Wrap JavaScript in an IIFE, query only inside that root, and attach behavior with `addEventListener`.

Keep the snippet fully offline:

- no external libraries, fonts, images, analytics, network calls, or CDNs;
- no `eval`, `new Function`, modules, imports, popups, alerts, form submission, or page navigation;
- no cookies, `localStorage`, or assumptions about access to the parent RemNote page;
- inline SVG is preferred for diagrams; Canvas supports animated simulations; optional WebGL requires a useful 2D/text fallback and Web Audio requires a user gesture and silent fallback;
- do not place secrets, personal data, or hidden tracking in the code.

Use broadly supported HTML, CSS, and browser JavaScript. Avoid experimental APIs and desktop-only input behavior.

## Design for every RemNote device

The usable width may range from roughly 280px on a phone to more than 1000px on desktop.

- Use fluid widths, wrapping layouts, and `minmax()` grids; never require horizontal page scrolling.
- Make primary touch targets at least 44px high and do not depend on hover.
- Keep text inputs at 16px or larger so iOS does not zoom unexpectedly.
- Support touch, mouse, and keyboard input using native controls where possible.
- Include visible focus styles, semantic labels, sufficient contrast, and reduced-motion handling.
- Make SVG diagrams responsive with a `viewBox`; do not encode a fixed screen width.
- Keep the default screen understandable before the learner interacts.

Put a harmless comment at the top in this exact form so the user knows what height to set in the plugin:

```html
<!-- Recommended embed height: 560px -->
```

Choose 420–480px for a compact comparison or calculator, 520–620px for a map or process explorer, and at most 800px for a genuinely complex interaction.

## Keep RemNote responsive

Prefer event-driven updates. Use at most one `InteractiveEmbed.animate` loop per interactive; it caps simulation callbacks at 30fps and pauses when hidden, reduced motion is requested, or the current host reports the frame is offscreen. Do not add independent perpetual timers, CSS animation loops, or requestAnimationFrame loops that bypass this lifecycle. Draw static diagrams without an animation loop. Stop the loop when a simulation settles; start it again on meaningful input.

Keep the plain JSON store small; keep large numeric buffers outside it. Update existing DOM/SVG nodes instead of rebuilding the whole view every frame. Use bounded graphs, particles, iterations, and sample histories; choose conservative defaults (e.g. 100 moving objects, 300 plotted samples) and simplify when phone-sized. Avoid per-frame layout measurement, large embedded image/audio/video data, and per-frame screen-reader announcements. Aim below 100KB total code including runtime for ordinary tools; report unusually large output and reduce assets before delivering. Never persist animation frames or high-frequency state to RemNote: interactive state is transient, and saved code is the only content stored by this workflow. Test idle and running behavior; do not promise zero impact on the whole knowledge base.

## Response contract

Give the user one `html` fenced code block containing the complete paste-ready snippet. After it, add only one short sentence telling them to copy the code into **Edit → Embed code**, set the height shown in the first comment, save, and press **Run interactive**. Do not provide setup instructions, implementation commentary, or separate files unless requested.

Before responding, check that the initial state renders without errors, every control changes something meaningful, Reset restores the initial state, text remains readable at phone width, and the snippet does not rely on capabilities blocked by the plugin sandbox.

For a complex interactive, test the final combined code inside an iframe with `sandbox="allow-scripts allow-presentation"` when browser testing is available. Check linked controls, reset after several changes, pointer cancellation, keyboard alternatives, narrow width, reduced motion, and console errors. Use an initial static draw and Step control so reduced motion still teaches the concept. Canvas must have a CSS height or aspect-ratio; avoid `100vh` and unbounded canvas resolutions. No loops or generated physics should block the main thread. If a test cannot be run, say so briefly and do not claim validation or that code will work every time. Standardization reduces failures; it cannot prove arbitrary generated code correct.
