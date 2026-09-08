import {
  AppEvents,
  renderWidget,
  useAPIEventListener,
  usePlugin,
  useRunAsync,
  WidgetLocation,
} from '@remnote/plugin-sdk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CODE_SLOT, HEIGHT_SLOT, INTERACTIVE_EMBED_POWERUP, TITLE_SLOT } from '../constants';
import { getEngineUrl, makeDocument } from '../embed-document';
import '../style.css';
import '../index.css';

const DEFAULT_HEIGHT = 420;
const MIN_HEIGHT = 180;
const MAX_HEIGHT = 1200;
const DEFAULT_TITLE = 'Interactive Embed';
const MAX_TITLE_LENGTH = 80;

function normalizeHeight(value: string | number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_HEIGHT;
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(parsed)));
}

function normalizeTitle(value: string): string {
  return value.trim().slice(0, MAX_TITLE_LENGTH) || DEFAULT_TITLE;
}

export function InteractiveEmbed() {
  const plugin = usePlugin();
  const context = useRunAsync(
    () => plugin.widget.getWidgetContext<WidgetLocation.UnderRemEditor>(),
    []
  );
  const [savedCode, setSavedCode] = useState('');
  const [draftCode, setDraftCode] = useState('');
  const [savedTitle, setSavedTitle] = useState(DEFAULT_TITLE);
  const [draftTitle, setDraftTitle] = useState(DEFAULT_TITLE);
  const [savedHeight, setSavedHeight] = useState(DEFAULT_HEIGHT);
  const [draftHeight, setDraftHeight] = useState(DEFAULT_HEIGHT);
  const [isEditing, setIsEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [isLarge, setIsLarge] = useState(false);
  const [runId, setRunId] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const visibleRef = useRef(true);
  const notifyVisibility = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'interactive-embed-visibility-v1', visible: visibleRef.current }, '*');
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      notifyVisibility();
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [isRunning, isCollapsed, isEditing, runId, notifyVisibility]);

  const loadEmbed = useCallback(async () => {
    if (!context?.remId) return;
    const rem = await plugin.rem.findOne(context.remId);
    if (!rem) return;

    const [code, height, title] = await Promise.all([
      rem.getPowerupProperty(INTERACTIVE_EMBED_POWERUP, CODE_SLOT),
      rem.getPowerupProperty(INTERACTIVE_EMBED_POWERUP, HEIGHT_SLOT),
      rem.getPowerupProperty(INTERACTIVE_EMBED_POWERUP, TITLE_SLOT),
    ]);

    const nextCode = code || '';
    const nextHeight = normalizeHeight(height || DEFAULT_HEIGHT);
    const nextTitle = normalizeTitle(title || DEFAULT_TITLE);
    setSavedCode(nextCode);
    setDraftCode(nextCode);
    setSavedTitle(nextTitle);
    setDraftTitle(nextTitle);
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

  const engineUrl = getEngineUrl(plugin.rootURL);
  const previewDocument = useMemo(
    () => isRunning && !isCollapsed && !isEditing ? makeDocument(savedCode, engineUrl) : '',
    [savedCode, isRunning, isCollapsed, isEditing, engineUrl]
  );

  const save = async () => {
    if (!context?.remId) return;
    const rem = await plugin.rem.findOne(context.remId);
    if (!rem) return;

    const cleanHeight = normalizeHeight(draftHeight);
    const cleanTitle = normalizeTitle(draftTitle);
    await Promise.all([
      rem.setPowerupProperty(INTERACTIVE_EMBED_POWERUP, CODE_SLOT, [draftCode]),
      rem.setPowerupProperty(INTERACTIVE_EMBED_POWERUP, HEIGHT_SLOT, [String(cleanHeight)]),
      rem.setPowerupProperty(INTERACTIVE_EMBED_POWERUP, TITLE_SLOT, [cleanTitle]),
    ]);

    setSavedCode(draftCode);
    setSavedTitle(cleanTitle);
    setDraftTitle(cleanTitle);
    setSavedHeight(cleanHeight);
    setDraftHeight(cleanHeight);
    setIsEditing(false);
    setIsRunning(false);
    setStatus('Saved');
    window.setTimeout(() => setStatus(''), 1600);
  };

  const cancel = () => {
    setDraftCode(savedCode);
    setDraftTitle(savedTitle);
    setDraftHeight(savedHeight);
    setIsEditing(false);
    setStatus('');
  };

  return (
    <div className="interactive-embed-stage">
      <section className="interactive-embed-shell">
      <header className="interactive-embed-toolbar">
        <div className="interactive-embed-brand">
          <span className="interactive-embed-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M8.4 6.8 3.8 12l4.6 5.2M15.6 6.8l4.6 5.2-4.6 5.2M13.8 4.8l-3.6 14.4" />
            </svg>
          </span>
          <div className="interactive-embed-heading">
            <strong title={savedTitle}>{savedTitle}</strong>
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
          {!isEditing && isRunning && !isCollapsed && (
            <>
              <button className="interactive-embed-icon-button" type="button"
                aria-label="Restart interactive" title="Restart interactive"
                onClick={() => setRunId((value) => value + 1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></svg>
              </button>
              <button className="interactive-embed-icon-button" type="button"
                aria-label={isLarge ? 'Restore display height' : 'Larger view'} title={isLarge ? 'Restore display height' : 'Larger view'}
                aria-pressed={isLarge} onClick={() => setIsLarge((value) => !value)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></svg>
              </button>
            </>
          )}
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
          <label className="interactive-embed-title-field" htmlFor={`embed-title-${context?.remId || 'loading'}`}>
            <span>Display title</span>
            <input
              id={`embed-title-${context?.remId || 'loading'}`}
              type="text"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              placeholder={DEFAULT_TITLE}
            />
          </label>
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
            Paste your interactive code, save, then press Run. Diagrams, simulations, and optional plugin-backed 3D are supported. 3D snippets should include a lightweight fallback.
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
          ref={frameRef}
          onLoad={notifyVisibility}
          key={runId}
          className="interactive-embed-frame"
          title="Interactive RemNote embed"
          srcDoc={previewDocument}
          style={{ height: `${isLarge ? Math.max(savedHeight, 800) : savedHeight}px` }}
          sandbox="allow-scripts allow-presentation"
          allow="fullscreen; picture-in-picture"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : null}
      </section>
    </div>
  );
}

renderWidget(InteractiveEmbed);
