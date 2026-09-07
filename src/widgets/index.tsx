import { declareIndexPlugin, type ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import '../index.css';
import { CODE_SLOT, HEIGHT_SLOT, INTERACTIVE_EMBED_POWERUP, TITLE_SLOT } from '../constants';

const SAMPLE_EMBED = `
<div class="card">
  <h2>Cardiac Output</h2>
  <p>Move the sliders to see how the variables work together.</p>

  <label>Heart rate: <strong id="hrValue">70</strong> beats/min</label>
  <input id="hr" type="range" min="40" max="180" value="70">

  <label>Stroke volume: <strong id="svValue">70</strong> mL/beat</label>
  <input id="sv" type="range" min="30" max="140" value="70">

  <div class="result"><span id="output">4.9</span> L/min</div>
</div>

<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 18px; font-family: system-ui, sans-serif; background: #f4f7fb; color: #172033; }
  .card { max-width: 680px; margin: auto; padding: 22px; background: white; border: 1px solid #dce4ef; border-radius: 16px; box-shadow: 0 8px 24px rgba(24, 40, 72, .08); }
  h2 { margin: 0 0 6px; color: #2856a3; }
  p { margin: 0 0 20px; color: #5b6678; }
  label { display: block; margin-top: 16px; }
  input { width: 100%; accent-color: #4f7bd9; }
  .result { margin-top: 22px; padding: 16px; text-align: center; border-radius: 12px; background: #eaf1ff; color: #1c4e9a; font-size: 28px; font-weight: 700; }
</style>

<script>
  const hr = document.getElementById('hr');
  const sv = document.getElementById('sv');
  const update = () => {
    document.getElementById('hrValue').textContent = hr.value;
    document.getElementById('svValue').textContent = sv.value;
    document.getElementById('output').textContent = ((hr.value * sv.value) / 1000).toFixed(1);
  };
  hr.addEventListener('input', update);
  sv.addEventListener('input', update);
  update();
</script>`.trim();

async function onActivate(plugin: ReactRNPlugin) {
  await plugin.app.registerPowerup({
    name: 'Interactive Embed',
    code: INTERACTIVE_EMBED_POWERUP,
    description: 'An interactive HTML, CSS, and JavaScript embed.',
    options: {
      slots: [
        {
          code: CODE_SLOT,
          name: 'Embed code',
          hidden: true,
          onlyProgrammaticModifying: true,
        },
        {
          code: HEIGHT_SLOT,
          name: 'Embed height',
          hidden: true,
          onlyProgrammaticModifying: true,
        },
        {
          code: TITLE_SLOT,
          name: 'Display title',
          hidden: true,
          onlyProgrammaticModifying: true,
        },
      ],
    },
  });

  await plugin.app.registerWidget('interactive_embed', WidgetLocation.UnderRemEditor, {
    dimensions: { height: 'auto', width: '100%' },
    powerupFilter: INTERACTIVE_EMBED_POWERUP,
  });

  await plugin.app.registerCommand({
    id: 'add-interactive-embed',
    name: 'Interactive Embed',
    description: 'Add a pasteable interactive embed beneath this Rem.',
    keywords: 'html css javascript iframe widget mind map simulation',
    quickCode: 'interactive',
    action: async () => {
      const rem = await plugin.focus.getFocusedRem();
      if (!rem) {
        await plugin.app.toast('Click in a Rem first, then try /Interactive Embed again.');
        return;
      }

      await rem.addPowerup(INTERACTIVE_EMBED_POWERUP);
      const existingCode = await rem.getPowerupProperty(INTERACTIVE_EMBED_POWERUP, CODE_SLOT);
      if (!existingCode) {
        await rem.setPowerupProperty(INTERACTIVE_EMBED_POWERUP, CODE_SLOT, [SAMPLE_EMBED]);
        await rem.setPowerupProperty(INTERACTIVE_EMBED_POWERUP, HEIGHT_SLOT, ['420']);
      }

      await plugin.app.toast('Interactive embed added beneath this Rem.');
    },
  });
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
