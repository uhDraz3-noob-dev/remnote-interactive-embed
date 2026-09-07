# Interactive Embed for RemNote

Turn any Rem into a home for an interactive explanation, mind map, simulation, game, or media player.

Repository: https://github.com/uhDraz3-noob-dev/remnote-interactive-embed

## How to use it

1. Click in any Rem and type `/Interactive Embed`.
2. A working example appears beneath the Rem.
3. Select **Edit embed**.
4. Paste an iframe or a self-contained HTML/CSS/JavaScript snippet.
5. Select **Save and preview**.

The code does not need to be a complete HTML page. The plugin automatically wraps ordinary embed code.

## A useful ChatGPT prompt

> Create a self-contained interactive HTML embed that teaches [YOUR CONCEPT]. Include all HTML, CSS, and JavaScript in one snippet. Do not use Markdown code fences, external libraries, or separate files. Make it responsive and suitable for a 700-pixel-wide embedded note. Return only the embed code.

## Safety

Generated code runs in a sandboxed iframe. It can display interactive content but cannot access the surrounding RemNote page or this plugin's API. Avoid pasting passwords, private keys, or other secrets into generated embeds.

## Local installation

Build the project, then install `PluginZip.zip` through RemNote's plugin settings using the option for a local or developer plugin.
