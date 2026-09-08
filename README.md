# Interactive Embed for RemNote

Turn any Rem into a home for an interactive explanation, mind map, simulation, game, or media player.

Repository: https://github.com/uhDraz3-noob-dev/remnote-interactive-embed

## How to use it

1. Click in any Rem and type `/Interactive Embed`.
2. A working example appears beneath the Rem.
3. Select **Edit**.
4. Paste an iframe or a self-contained HTML/CSS/JavaScript snippet.
5. Select **Save embed**, then **Run interactive**.

The code does not need to be a complete HTML page. The plugin automatically wraps ordinary embed code.

The built-in Interactive Embed v1 toolkit supports coordinated state/Reset, touch dragging, animation timing, and responsive Canvas rendering. SVG, CSS animations, and ordinary browser JavaScript are also available. Use **Restart** to reset the entire running frame and **Larger view** for an 800px-or-taller viewport. Uncaught script errors display inside the interactive.

Version 0.3.0 adds optional, genuine 3D through a separately bundled Three.js engine. It is requested only when a snippet calls `InteractiveEmbed.load3D()`, never for ordinary 2D embeds. The managed stage supports touch orbit, camera buttons, selection, on-demand drawing, capped resolution and graphics cleanup. Try [the general shape explorer](examples/scene-3d.html) at 680px; its 2D view remains useful when 3D is unavailable. Build custom geometry with the engine for any suitable learning objective. [The 3D contract](docs/interactive-3d-v1.md) also documents optional versioned heart/vessel starter assets; [the heart explorer](examples/heart-3d.html) demonstrates them at 800px. These are original procedural teaching models, not scan-quality or clinically validated anatomy. Three.js 0.185.1 is MIT-licensed; its license ships in the plugin.

Version 0.3.1 fixes 3D asset resolution: the widget uses RemNote's `plugin.rootURL`, not the address of the surrounding page or downloaded widget module. Existing snippets do not need to change. Reload the developer plugin or install the updated package before retrying 3D; publishing source files on GitHub alone does not update an installed package.

For performance, code is prepared only on Run. Toolkit animations run at up to 30 updates/second and pause when hidden or offscreen. Stop and Collapse remove the running frame. Arbitrary pasted code can bypass these helpers; the sandbox is not a CPU limit. Keep embeds small and run only the simulations you are using.

The [v1 authoring contract](docs/interactive-embed-v1.md) documents the toolkit. Try the [spring lab](examples/spring-lab.html) by pasting its code and setting the height to 620px. The companion skill is in [skills/remnote-interactive-builder](skills/remnote-interactive-builder/SKILL.md). It includes the shared base runtime for 2D portability; the optional 3D layer depends on the installed plugin asset. No Python installation or third-party CDN is needed. Each running 3D iframe still uses its own memory and graphics context; stop scenes you are not using. Availability of the installed asset offline depends on the host, not on this plugin alone.

## A useful ChatGPT prompt

> Create a self-contained interactive HTML embed that teaches [YOUR CONCEPT]. Include all HTML, CSS, and JavaScript in one snippet. Do not use Markdown code fences, external libraries, or separate files. Make it responsive and suitable for a 700-pixel-wide embedded note. Return only the embed code.

## Safety

Generated code runs only after you press **Run interactive**, inside a sandboxed iframe. It cannot access the surrounding RemNote page or this plugin's API. The plugin itself does not send your notes or embed code anywhere.

An embed can still contact an external service if the pasted code tells it to. Anything you type inside such an embed may be sent to that service. Use self-contained code when possible, inspect unfamiliar code, and never paste passwords, private keys, patient information, or other secrets into an embed.

## Device support

The interface is designed for narrow and touch screens. On narrow screens, action labels become icons and the editor stacks vertically. The manifest enables mobile loading. 3D requires WebGL2 and sufficient graphics resources; device/host restrictions may require the 2D fallback. Desktop sandbox tests do not establish compatibility on physical iPad, iPhone or Android devices.

## Local installation

Build the project, then install `PluginZip.zip` through RemNote's plugin settings using the option for a local or developer plugin.
