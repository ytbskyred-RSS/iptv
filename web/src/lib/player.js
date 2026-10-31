// Lecture d'un flux dans un <video> : MPEG-TS (mpegts.js), HLS (hls.js) ou natif.
// Plusieurs variantes sont essayées l'une après l'autre jusqu'à ce qu'une démarre.

const TIMEOUT = 15000;

export const proxied = url => `/stream?url=${encodeURIComponent(url)}`;

const pageIsHttps = () => typeof location !== 'undefined' && location.protocol === 'https:';

// Xtream Codes : http://host/user/pass/id -> http://host/live/user/pass/id.m3u8
const toHls = url => {
  const m = url.match(/^(https?:\/\/[^/]+)\/(?!live\/)([^/]+)\/([^/]+)\/(\d+)$/);
  return m ? `${m[1]}/live/${m[2]}/${m[3]}/${m[4]}.m3u8` : `${url}.m3u8`;
};

export function variantsFor(entry) {
  const { url, kind } = entry;
  const viaProxyFirst = list => list.flatMap(v => [{ ...v, src: proxied(v.src), proxy: true }, v]);
  const directFirst = list =>
    list.flatMap(v =>
      pageIsHttps() && v.src.startsWith('http:')
        ? [{ ...v, src: proxied(v.src), proxy: true }]
        : [v, { ...v, src: proxied(v.src), proxy: true }]
    );

  if (kind === 'live' || kind === 'adult') {
    if (/\.m3u8(\?|$)/i.test(url)) return viaProxyFirst([{ type: 'hls', src: url }]);
    return viaProxyFirst([
      { type: 'mpegts', src: url },
      { type: 'hls', src: toHls(url) }
    ]);
  }
  if (url.endsWith('.')) {
    return directFirst([
      { type: 'native', src: `${url}mp4` },
      { type: 'native', src: `${url}mkv` }
    ]);
  }
  return directFirst([{ type: 'native', src: url }]);
}

function waitForPlayback(video, signal) {
  return new Promise((resolve, reject) => {
    const done = fn => arg => {
      clearTimeout(timer);
      video.removeEventListener('playing', onOk);
      video.removeEventListener('loadeddata', onOk);
      video.removeEventListener('error', onErr);
      signal.removeEventListener('abort', onAbort);
      fn(arg);
    };
    const onOk = done(resolve);
    const onErr = done(() => reject(new Error(video.error?.message || 'Erreur média')));
    const onAbort = done(() => reject(new DOMException('aborted', 'AbortError')));
    const timer = setTimeout(done(() => reject(new Error('Délai dépassé'))), TIMEOUT);
    video.addEventListener('playing', onOk);
    video.addEventListener('loadeddata', onOk);
    video.addEventListener('error', onErr);
    signal.addEventListener('abort', onAbort);
  });
}

async function tryVariant(video, variant, signal, setTeardown) {
  if (variant.type === 'mpegts') {
    const { default: mpegts } = await import('mpegts.js');
    if (!mpegts.isSupported()) throw new Error('MPEG-TS non supporté');
    const player = mpegts.createPlayer(
      { type: 'mpegts', isLive: true, url: new URL(variant.src, location.href).href },
      { enableStashBuffer: false, liveBufferLatencyChasing: true, lazyLoad: false }
    );
    setTeardown(() => {
      player.pause();
      player.unload();
      player.detachMediaElement();
      player.destroy();
    });
    const failed = new Promise((_, reject) =>
      player.on(mpegts.Events.ERROR, (type, detail) => reject(new Error(`${type}: ${detail}`)))
    );
    player.attachMediaElement(video);
    player.load();
    video.play().catch(() => {});
    return Promise.race([waitForPlayback(video, signal), failed]);
  }

  if (variant.type === 'hls') {
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = variant.src;
      setTeardown(() => video.removeAttribute('src'));
    } else {
      const { default: Hls } = await import('hls.js');
      if (!Hls.isSupported()) throw new Error('HLS non supporté');
      const hls = new Hls({ lowLatencyMode: true });
      setTeardown(() => hls.destroy());
      const failed = new Promise((_, reject) =>
        hls.on(Hls.Events.ERROR, (_e, data) => data.fatal && reject(new Error(data.details)))
      );
      hls.loadSource(variant.src);
      hls.attachMedia(video);
      video.play().catch(() => {});
      return Promise.race([waitForPlayback(video, signal), failed]);
    }
  } else {
    video.src = variant.src;
    setTeardown(() => {
      video.removeAttribute('src');
      video.load();
    });
  }
  video.play().catch(() => {});
  return waitForPlayback(video, signal);
}

/**
 * Démarre la lecture de `entry` dans `video`. Retourne une fonction d'arrêt.
 * onStatus({ state: 'loading' | 'playing' | 'error', variant?, message? })
 */
export function playEntry(video, entry, onStatus) {
  const controller = new AbortController();
  let teardown = null;
  const clear = () => {
    try {
      teardown?.();
    } catch {
      /* déjà détruit */
    }
    teardown = null;
  };

  (async () => {
    const variants = variantsFor(entry);
    const errors = [];
    for (const variant of variants) {
      if (controller.signal.aborted) return;
      onStatus({ state: 'loading', variant });
      try {
        await tryVariant(video, variant, controller.signal, fn => (teardown = fn));
        if (controller.signal.aborted) return;
        onStatus({ state: 'playing', variant });
        return;
      } catch (err) {
        clear();
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        errors.push(`${variant.type}${variant.proxy ? ' (proxy)' : ''} : ${err.message}`);
      }
    }
    onStatus({ state: 'error', message: errors.join('\n') || 'Aucune source lisible' });
  })();

  return () => {
    controller.abort();
    clear();
  };
}
