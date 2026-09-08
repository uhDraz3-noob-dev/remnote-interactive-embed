/* Interactive Embed runtime v1. Also usable inline in a standalone snippet. */
(function () {
  'use strict';
  if (window.InteractiveEmbed && window.InteractiveEmbed.version === 1) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cleanups = new Set();
  let hostVisible = true;
  const visibilityListeners = new Set();
  const engineUrl = window.__interactiveEmbed3DUrl;
  let enginePromise = null;
  let closed = false;
  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || !event.data || event.data.type !== 'interactive-embed-visibility-v1' || typeof event.data.visible !== 'boolean') return;
    if (hostVisible === event.data.visible) return;
    hostVisible = event.data.visible;
    visibilityListeners.forEach(function (sync) { sync(); });
  });
  function own(cleanup) {
    let disposed = false;
    const dispose = function () { if (disposed) return; disposed = true; cleanups.delete(dispose); cleanup(); };
    cleanups.add(dispose);
    return dispose;
  }
  function on(target, event, callback, options) {
    target.addEventListener(event, callback, options);
    return own(function () { target.removeEventListener(event, callback, options); });
  }
  function report(error) {
    const show = function () {
      let box = document.getElementById('ie-runtime-error');
      if (!box) {
        box = document.createElement('div');
        box.id = 'ie-runtime-error';
        box.setAttribute('role', 'alert');
        box.style.cssText = 'position:fixed;bottom:8px;left:8px;right:8px;z-index:2147483647;padding:12px;border:1px solid #c2410c;border-radius:8px;background:#fff7ed;color:#7c2d12;font:14px/1.4 system-ui;max-height:30vh;overflow:auto';
        document.body.appendChild(box);
      }
      box.textContent = 'This interactive encountered an error. Try Restart, or edit the code. ' + String(error && error.message || error).slice(0, 240);
    };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show, { once: true });
  }
  window.addEventListener('error', function (event) { if (event.message) report(event.message); });
  window.addEventListener('unhandledrejection', function (event) { report(event.reason || 'Unexpected error'); });
  window.addEventListener('pagehide', function () { closed = true; Array.from(cleanups).forEach(function (dispose) { dispose(); }); });

  function onVisibility(callback) {
    const sync = function () { callback(hostVisible && !document.hidden); };
    visibilityListeners.add(sync);
    document.addEventListener('visibilitychange', sync);
    const off = own(function () { visibilityListeners.delete(sync); document.removeEventListener('visibilitychange', sync); });
    sync(); return off;
  }

  // Optional packaged engine; never requested by ordinary 2D snippets.
  function load3D() {
    if (closed) return Promise.reject(new Error('This interactive has stopped.'));
    if (window.InteractiveEmbed3D && window.InteractiveEmbed3D.version === 1) return Promise.resolve(window.InteractiveEmbed3D);
    if (enginePromise) return enginePromise;
    if (typeof engineUrl !== 'string' || !/^https?:\/\//i.test(engineUrl)) return Promise.reject(new Error('3D requires Interactive Embed 0.3.0 or newer. Use the 2D view.'));
    enginePromise = new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      let settled = false, timer;
      function finish(error) {
        if (settled) return; settled = true; clearTimeout(timer);
        script.onload = script.onerror = null; dispose();
        if (error) reject(error); else resolve(window.InteractiveEmbed3D);
      }
      const dispose = own(function () { script.remove(); if (!settled) finish(new Error('3D loading was cancelled.')); });
      script.src = engineUrl; script.async = true;
      script.onload = function () { finish(window.InteractiveEmbed3D && window.InteractiveEmbed3D.version === 1 ? null : new Error('3D engine is unavailable.')); };
      script.onerror = function () { finish(new Error('Could not load the packaged 3D engine. Use the 2D view or restart.')); };
      timer = setTimeout(function () { finish(new Error('3D loading timed out. Use the 2D view or restart.')); }, 15000);
      document.head.appendChild(script);
    }).catch(function (error) { enginePromise = null; throw error; });
    return enginePromise;
  }

  function store(initial, render) {
    const copy = function (value) { return JSON.parse(JSON.stringify(value)); };
    let state = copy(initial);
    const notify = function () { render(copy(state)); };
    notify();
    return Object.freeze({
      get: function () { return copy(state); },
      set: function (patch) {
        const next = typeof patch === 'function' ? patch(copy(state)) : patch;
        state = Object.assign({}, state, copy(next)); notify();
      },
      reset: function () { state = copy(initial); notify(); }
    });
  }

  // Seconds, capped delta; resume cannot cause a large simulation jump.
  function animate(step) {
    let id = 0, previous = null, elapsed = 0, stopped = false;
    function frame(now) {
      if (stopped) return;
      if (previous !== null && now - previous < 1000 / 30) { id = requestAnimationFrame(frame); return; }
      const dt = previous === null ? 0 : Math.min((now - previous) / 1000, 0.05);
      previous = now; elapsed += dt;
      try { step(dt, elapsed); } catch (error) { dispose(); report(error); return; }
      if (!stopped) id = requestAnimationFrame(frame);
    }
    function sync() {
      cancelAnimationFrame(id); previous = null;
      if (!stopped && hostVisible && !document.hidden && !motion.matches) id = requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    visibilityListeners.add(sync);
    const dispose = own(function () {
      stopped = true; cancelAnimationFrame(id);
      document.removeEventListener('visibilitychange', sync); motion.removeEventListener('change', sync);
      visibilityListeners.delete(sync);
    });
    sync();
    return dispose;
  }

  // Reports local CSS-pixel coordinates. Authors provide keyboard alternatives.
  function drag(element, move) {
    let pointer = null;
    const previousTouchAction = element.style.touchAction;
    element.style.touchAction = 'none';
    function update(event) {
      const rect = element.getBoundingClientRect();
      move({ x: event.clientX - rect.left, y: event.clientY - rect.top,
        width: rect.width, height: rect.height, phase: event.type });
    }
    const listeners = [
      on(element, 'pointerdown', function (event) {
        if (pointer !== null || event.button !== 0) return;
        pointer = event.pointerId; element.setPointerCapture(pointer); update(event);
      }),
      on(element, 'pointermove', function (event) { if (event.pointerId === pointer) update(event); }),
      on(element, 'pointerup', function (event) {
        if (event.pointerId !== pointer) return;
        pointer = null; if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
        update(event);
      }),
      on(element, 'pointercancel', function () { pointer = null; }),
      on(element, 'lostpointercapture', function () { pointer = null; })
    ];
    return own(function () {
      listeners.forEach(function (dispose) { dispose(); });
      if (pointer !== null && element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
      pointer = null; element.style.touchAction = previousTouchAction;
    });
  }

  // Give the canvas a CSS height/aspect-ratio; draw in CSS pixels.
  function canvas(element, draw) {
    const context = element.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable on this device');
    let queued = 0, disposed = false;
    function paint() {
      queued = 0; if (disposed) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(rect.width * ratio), pixelHeight = Math.round(rect.height * ratio);
      if (element.width !== pixelWidth) element.width = pixelWidth;
      if (element.height !== pixelHeight) element.height = pixelHeight;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height); context.save();
      try { draw(context, rect.width, rect.height); } catch (error) { report(error); }
      finally { context.restore(); }
    }
    function redraw() { if (!disposed && !queued) queued = requestAnimationFrame(paint); }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(redraw) : null;
    if (observer) observer.observe(element);
    const off = on(window, 'resize', redraw);
    const dispose = own(function () { disposed = true; cancelAnimationFrame(queued); if (observer) observer.disconnect(); off(); });
    redraw();
    return Object.freeze({ redraw: redraw, dispose: dispose });
  }
  window.InteractiveEmbed = Object.freeze({
    version: 1, on: on, store: store, animate: animate, drag: drag, canvas: canvas,
    load3D: load3D, onDispose: own, onVisibility: onVisibility,
    get visible() { return hostVisible && !document.hidden; },
    clamp: function (value, min, max) { return Math.max(min, Math.min(max, value)); },
    get reducedMotion() { return motion.matches; }
  });
})();
