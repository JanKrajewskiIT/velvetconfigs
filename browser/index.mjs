/** Installs update recovery without discarding unsaved work or automatically reloading. */
export const installPreloadRecovery = ({ onUpdateAvailable, canReload = () => true, onBlocked = () => {} }) => {
  const key = 'velvet:preload-reload';
  const reload = () => {
    if (!canReload()) {
      onBlocked();
      return false;
    }
    try {
      const previous = Number(sessionStorage.getItem(key));
      if (previous > 0 && Date.now() - previous < 30_000) {
        onBlocked();
        return false;
      }
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // A reload cannot be safely retried without its per-tab loop guard.
      onBlocked();
      return false;
    }
    window.location.reload();
    return true;
  };
  const listener = (event) => {
    event.preventDefault();
    onUpdateAvailable(reload);
  };
  window.addEventListener('vite:preloadError', listener);
  return () => window.removeEventListener('vite:preloadError', listener);
};

/** Emits bounded, structured diagnostics locally; no transport or application payloads are included. */
export const createBrowserDiagnostics = ({
  app,
  version,
  onReport = (report) => {
    window.dispatchEvent(new CustomEvent('velvet:diagnostic', { detail: report }));
  },
}) => {
  if (!/^[a-z0-9-]{1,40}$/u.test(app) || typeof version !== 'string' || version.length > 80) {
    throw new TypeError('Browser diagnostics require a bounded app name and version');
  }
  const reports = [];
  const emit = (data) => {
    const report = Object.freeze({ app, version, timestamp: Date.now(), ...data });
    reports.push(report);
    if (reports.length > 30) reports.shift();
    onReport(report);
  };
  return {
    reportError: (kind = 'render') => {
      if (!['render', 'bootstrap', 'chunk', 'storage', 'async'].includes(kind))
        throw new TypeError('Unknown diagnostic kind');
      emit({ type: 'error', kind });
    },
    reportMetric: ({ name, value, rating }) => {
      if (
        !['LCP', 'INP', 'CLS'].includes(name) ||
        !Number.isFinite(value) ||
        !['good', 'needs-improvement', 'poor'].includes(rating)
      )
        throw new TypeError('Invalid performance metric');
      emit({ type: 'metric', name, value, rating });
    },
    getReports: () => [...reports],
  };
};

/** Bridges payload-free UI failures to the application's own diagnostics. */
export const observeAsyncErrors = (onError) => {
  const listener = () => onError();
  window.addEventListener('velvet:async-error', listener);
  return () => window.removeEventListener('velvet:async-error', listener);
};

const vitalsByDocument = new WeakMap();

/** One collector per document; each application owns its subscription. */
export const observeWebVitals = async (onMetric) => {
  let state = vitalsByDocument.get(document);
  if (!state) {
    const subscribers = new Set();
    const ready = import('web-vitals').then(({ onCLS, onINP, onLCP }) => {
      const report = ({ name, value, rating }) => {
        for (const subscriber of subscribers) subscriber.notify({ name, value, rating });
      };
      onCLS(report);
      onINP(report);
      onLCP(report);
    });
    state = { subscribers, ready };
    vitalsByDocument.set(document, state);
  }
  const subscription = { notify: onMetric };
  state.subscribers.add(subscription);
  try {
    await state.ready;
  } catch (error) {
    state.subscribers.delete(subscription);
    if (vitalsByDocument.get(document) === state) vitalsByDocument.delete(document);
    throw error;
  }
  return () => {
    state.subscribers.delete(subscription);
  };
};
