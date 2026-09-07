import {
  AppEvents,
  renderWidget,
  useAPIEventListener,
  usePlugin,
  useRunAsync,
  WidgetLocation,
} from '@remnote/plugin-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CODE_SLOT, HEIGHT_SLOT, INTERACTIVE_EMBED_POWERUP } from '../constants';

const DEFAULT_HEIGHT = 420;
const MIN_HEIGHT = 180;
const MAX_HEIGHT = 1200;

function normalizeHeight(value: string | number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_HEIGHT;
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(parsed)));
}

function makeDocument(embedCode: string): string {
  if (/^\s*(<!doctype\s+html|<html[\s>])/i.test(embedCode)) {
    return embedCode;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body { width: 100%; min-height: 100%; }
    body { margin: 0; overflow: auto; }
  </style>
</head>
<body>
${embedCode}
</body>
</html>`;
}

export function InteractiveEmbed() {
  const plugin = usePlugin();
  const context = useRunAsync(
    () => plugin.widget.getWidgetContext<WidgetLocation.UnderRemEditor>(),
    []
  );
  const [savedCode, setSavedCode] = useState('');
  const [draftCode, setDraftCode] = useState('');
  const [savedHeight, setSavedHeight] = useState(DEFAULT_HEIGHT);
  const [draftHeight, setDraftHeight] = useState(DEFAULT_HEIGHT);
  const [isEditing, setIsEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [status, setStatus] = useState('');

  const loadEmbed = useCallback(async () => {
    if (!context?.remId) return;
    const rem = await plugin.rem.findOne(context.remId);
    if (!rem) return;

    const [code, height] = await Promise.all([
      rem.getPowerupProperty(INTERACTIVE_EMBED_POWERUP, CODE_SLOT),
      rem.getPowerupProperty(INTERACTIVE_EMBED_POWERUP, HEIGHT_SLOT),
    ]);

    const nextCode = code || '';
    const nextHeight = normalizeHeight(height || DEFAULT_HEIGHT);
    setSavedCode(nextCode);
    setDraftCode(nextCode);
    setSavedHeight(nextHeight);
    setDraftHeight(nextHeight);
  }, [context?.remId, plugin]);

  useEffect(() => {
    loadEmbed();
  }, [loadEmbed]);

  useAPIEventListener(AppEvents.RemChanged, context?.remId, () => {
    loadEmbed();
  });

  const previewDocument = useMemo(() => makeDocument(savedCode), [savedCode]);

  const save = async () => {
    if (!context?.remId) return;
    const rem = await plugin.rem.findOne(context.remId);
    if (!rem) return;

    const cleanHeight = normalizeHeight(draftHeight);
    await Promise.all([
      rem.setPowerupProperty(INTERACTIVE_EMBED_POWERUP, CODE_SLOT, [draftCode]),
      rem.setPowerupProperty(INTERACTIVE_EMBED_POWERUP, HEIGHT_SLOT, [String(cleanHeight)]),
    ]);

    setSavedCode(draftCode);
    setSavedHeight(cleanHeight);
    setDraftHeight(cleanHeight);
    setIsEditing(false);
    setStatus('Saved');
    window.setTimeout(() => setStatus(''), 1600);
  };

  const cancel = () => {
    setDraftCode(savedCode);
    setDraftHeight(savedHeight);
    setIsEditing(false);
    setStatus('');
  };

  return (
    <section className="interactive-embed-shell">
      <header className="interactive-embed-toolbar">
        <div className="interactive-embed-title">
          <span className="interactive-embed-dot" aria-hidden="true" />
          Interactive Embed
          {status && <span className="interactive-embed-status">{status}</span>}
        </div>
        <div className="interactive-embed-actions">
          {!isEditing && (
            <button type="button" onClick={() => setIsCollapsed((value) => !value)}>
              {isCollapsed ? 'Show' : 'Collapse'}
            </button>
          )}
          <button type="button" onClick={() => (isEditing ? cancel() : setIsEditing(true))}>
            {isEditing ? 'Cancel' : 'Edit embed'}
          </button>
        </div>
      </header>

      {isEditing ? (
        <div className="interactive-embed-editor">
          <label htmlFor={`embed-code-${context?.remId || 'loading'}`}>
            Paste your embed code
          </label>
          <textarea
            id={`embed-code-${context?.remId || 'loading'}`}
            value={draftCode}
            onChange={(event) => setDraftCode(event.target.value)}
            spellCheck={false}
            placeholder="Paste <iframe> code or HTML/CSS/JavaScript here…"
          />
          <div className="interactive-embed-save-row">
            <label>
              Height
              <input
                type="number"
                min={MIN_HEIGHT}
                max={MAX_HEIGHT}
                step={20}
                value={draftHeight}
                onChange={(event) => setDraftHeight(normalizeHeight(event.target.value))}
              />
              px
            </label>
            <button className="interactive-embed-primary" type="button" onClick={save}>
              Save and preview
            </button>
          </div>
          <p className="interactive-embed-help">
            You can paste an iframe or a snippet containing HTML, style, and script tags. No full page is
            required.
          </p>
        </div>
      ) : !isCollapsed ? (
        <iframe
          className="interactive-embed-frame"
          title="Interactive RemNote embed"
          srcDoc={previewDocument}
          style={{ height: `${savedHeight}px` }}
          sandbox="allow-scripts allow-forms allow-modals allow-popups allow-presentation"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="no-referrer"
        />
      ) : null}
    </section>
  );
}

renderWidget(InteractiveEmbed);
