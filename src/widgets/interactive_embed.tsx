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
import '../style.css';
import '../index.css';

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
    * { box-sizing: border-box; }
    html, body { width: 100%; min-height: 100%; }
    body { margin: 0; overflow: auto; -webkit-text-size-adjust: 100%; }
    img, svg, canvas, video, iframe { max-width: 100%; }
    button, input, select, textarea { font: inherit; }
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
  const [isRunning, setIsRunning] = useState(false);
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
    setIsRunning(false);
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
    setIsRunning(false);
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
        <div className="interactive-embed-brand">
          <span className="interactive-embed-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M8.4 6.8 3.8 12l4.6 5.2M15.6 6.8l4.6 5.2-4.6 5.2M13.8 4.8l-3.6 14.4" />
            </svg>
          </span>
          <div className="interactive-embed-heading">
            <strong>Interactive Embed</strong>
            <span className="interactive-embed-subtitle">
              {isEditing ? 'Editing code' : isRunning ? 'Running' : 'Ready'}
            </span>
          </div>
          {status && (
            <span className="interactive-embed-status" role="status" aria-live="polite">
              {status}
            </span>
          )}
        </div>

        <div className="interactive-embed-actions">
          {!isEditing && isRunning && (
            <button
              className="interactive-embed-button interactive-embed-button--quiet"
              type="button"
              onClick={() => setIsRunning(false)}
              aria-label="Stop interactive"
              title="Stop interactive"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="7" y="7" width="10" height="10" rx="1.5" />
              </svg>
              <span>Stop</span>
            </button>
          )}

          <button
            className="interactive-embed-button"
            type="button"
            onClick={() => (isEditing ? cancel() : setIsEditing(true))}
            aria-label={isEditing ? 'Cancel editing' : 'Edit embed'}
            title={isEditing ? 'Cancel editing' : 'Edit embed'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {isEditing ? (
                <path d="m7 7 10 10M17 7 7 17" />
              ) : (
                <path d="m14.7 5.3 4 4M4.5 19.5l4.8-1 9.4-9.4a1.4 1.4 0 0 0 0-2l-1.8-1.8a1.4 1.4 0 0 0-2 0L5.5 14.7l-1 4.8Z" />
              )}
            </svg>
            <span>{isEditing ? 'Cancel' : 'Edit'}</span>
          </button>

          {!isEditing && (
            <button
              className="interactive-embed-icon-button"
              type="button"
              onClick={() => setIsCollapsed((value) => !value)}
              aria-label={isCollapsed ? 'Expand interactive embed' : 'Collapse interactive embed'}
              aria-expanded={!isCollapsed}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              <svg
                className={isCollapsed ? 'interactive-embed-chevron is-collapsed' : 'interactive-embed-chevron'}
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {isEditing ? (
        <div className="interactive-embed-editor">
          <div className="interactive-embed-field-heading">
            <label htmlFor={`embed-code-${context?.remId || 'loading'}`}>Embed code</label>
            <span>HTML, CSS and JavaScript in one snippet</span>
          </div>
          <textarea
            id={`embed-code-${context?.remId || 'loading'}`}
            value={draftCode}
            onChange={(event) => setDraftCode(event.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="Paste your interactive code here…"
            aria-describedby="interactive-embed-help"
          />
          <div className="interactive-embed-save-row">
            <label className="interactive-embed-height-field">
              <span>Display height</span>
              <span className="interactive-embed-height-input">
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_HEIGHT}
                  max={MAX_HEIGHT}
                  step={20}
                  value={draftHeight}
                  onChange={(event) => setDraftHeight(normalizeHeight(event.target.value))}
                />
                <span>px</span>
              </span>
            </label>
            <button className="interactive-embed-primary" type="button" onClick={save}>
              Save embed
            </button>
          </div>
          <p id="interactive-embed-help" className="interactive-embed-help">
            Paste a self-contained snippet. For your safety, it will wait for you to press Run.
          </p>
        </div>
      ) : !isCollapsed && !isRunning ? (
        <div className="interactive-embed-launcher">
          <span className="interactive-embed-launch-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="m9 7 8 5-8 5V7Z" />
            </svg>
          </span>
          <div className="interactive-embed-launch-copy">
            <strong>{savedCode ? 'Ready to explore' : 'Add your first interactive'}</strong>
            <span>
              {savedCode
                ? 'The interactive runs only when you choose.'
                : 'Paste the code created by ChatGPT to get started.'}
            </span>
          </div>
          {savedCode ? (
            <button
              className="interactive-embed-primary interactive-embed-run"
              type="button"
              onClick={() => setIsRunning(true)}
            >
              Run interactive
            </button>
          ) : (
            <button
              className="interactive-embed-primary interactive-embed-run"
              type="button"
              onClick={() => setIsEditing(true)}
            >
              Add code
            </button>
          )}
        </div>
      ) : !isCollapsed ? (
        <iframe
          className="interactive-embed-frame"
          title="Interactive RemNote embed"
          srcDoc={previewDocument}
          style={{ height: `${savedHeight}px` }}
          sandbox="allow-scripts allow-presentation"
          allow="fullscreen; picture-in-picture"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : null}
    </section>
  );
}

renderWidget(InteractiveEmbed);
