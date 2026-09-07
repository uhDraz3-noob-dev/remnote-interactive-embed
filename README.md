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

## A useful ChatGPT prompt

> Create a self-contained interactive HTML embed that teaches [YOUR CONCEPT]. Include all HTML, CSS, and JavaScript in one snippet. Do not use Markdown code fences, external libraries, or separate files. Make it responsive and suitable for a 700-pixel-wide embedded note. Return only the embed code.

## Safety

Generated code runs only after you press **Run interactive**, inside a sandboxed iframe. It cannot access the surrounding RemNote page or this plugin's API. The plugin itself does not send your notes or embed code anywhere.

An embed can still contact an external service if the pasted code tells it to. Anything you type inside such an embed may be sent to that service. Use self-contained code when possible, inspect unfamiliar code, and never paste passwords, private keys, patient information, or other secrets into an embed.

## Device support

The interface is responsive and touch-friendly for current RemNote desktop, iPad, iPhone, and Android apps. On narrow screens, action labels become icons and the editor stacks vertically. The manifest enables mobile loading, and the embed uses no desktop-only APIs.

## Local installation

Build the project, then install `PluginZip.zip` through RemNote's plugin settings using the option for a local or developer plugin.
