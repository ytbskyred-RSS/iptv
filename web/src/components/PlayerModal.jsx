import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import SpotlightCard from './reactbits/SpotlightCard';
import { playEntry } from '../lib/player';
import { useLenisInstance } from '../hooks/useLenis';

const STATUS_TEXT = {
  loading: 'Connexion au flux…',
  playing: '',
  error: 'Impossible de lire ce flux dans le navigateur.'
};

export default function PlayerModal({ item, siblings, onNavigate, onClose }) {
  const lenis = useLenisInstance();
  const root = useRef(null);
  const videoRef = useRef(null);
  const listRef = useRef(null);
  const [status, setStatus] = useState({ state: 'loading' });
  const [copied, setCopied] = useState(false);

  const episodes = item.episodes || null;
  const seasons = useMemo(
    () => (episodes ? [...new Set(episodes.map(e => e.season))] : []),
    [episodes]
  );
  const [season, setSeason] = useState(seasons[0] ?? 0);
  const [episodeId, setEpisodeId] = useState(episodes?.[0]?.id ?? null);
  const current = episodes ? episodes.find(e => e.id === episodeId) || episodes[0] : item;

  useEffect(() => {
    setSeason(seasons[0] ?? 0);
    setEpisodeId(episodes?.[0]?.id ?? null);
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Le défilement de la page est gelé tant que le lecteur est ouvert.
  useEffect(() => {
    lenis?.stop();
    document.documentElement.classList.add('is-modal');
    return () => {
      lenis?.start();
      document.documentElement.classList.remove('is-modal');
    };
  }, [lenis]);

  useGSAP(
    () => {
      gsap.from('.modal__backdrop', { opacity: 0, duration: 0.35 });
      gsap.from('.modal__panel', { y: 60, scale: 0.94, opacity: 0, duration: 0.6, ease: 'expo.out' });
    },
    { scope: root }
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current) return undefined;
    setStatus({ state: 'loading' });
    return playEntry(video, current, setStatus);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    gsap.to(root.current.querySelector('.modal__panel'), { y: 40, opacity: 0, scale: 0.96, duration: 0.25, ease: 'power2.in' });
    gsap.to(root.current.querySelector('.modal__backdrop'), { opacity: 0, duration: 0.3, onComplete: onClose });
  };

  const index = siblings.findIndex(s => s.id === item.id);
  const step = delta => {
    if (index < 0 || !siblings.length) return;
    onNavigate(siblings[(index + delta + siblings.length) % siblings.length]);
  };

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') close();
      if (!episodes && e.target.tagName !== 'INPUT') {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') step(1);
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') step(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useGSAP(
    () => {
      if (!listRef.current) return;
      gsap.from(listRef.current.children, { x: 20, opacity: 0, duration: 0.35, stagger: 0.02, ease: 'power2.out' });
    },
    { dependencies: [season], scope: listRef }
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('URL du flux :', current.url);
    }
  };

  const title = episodes
    ? `${item.name} — S${String(current.season).padStart(2, '0')} E${String(current.episode).padStart(2, '0')}`
    : item.name;

  return (
    <div className="modal" ref={root} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal__backdrop" onClick={close} />
      <SpotlightCard className={`modal__panel${episodes ? ' modal__panel--series' : ''}`} spotlightColor="#3A29FF" intensity={0.12}>
        <div className="modal__stage">
          <video ref={videoRef} controls playsInline autoPlay className="modal__video" />
          {status.state !== 'playing' && (
            <div className={`modal__status modal__status--${status.state}`}>
              {status.state === 'loading' && <span className="spinner" aria-hidden="true" />}
              <p>{STATUS_TEXT[status.state]}</p>
              {status.state === 'loading' && status.variant && (
                <small>
                  {status.variant.type.toUpperCase()}
                  {status.variant.proxy ? ' · via proxy local' : ' · direct'}
                </small>
              )}
              {status.state === 'error' && (
                <>
                  <small>Copiez l'URL pour l'ouvrir dans VLC, IINA ou mpv.</small>
                  <pre>{status.message}</pre>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal__bar">
          <div className="modal__info">
            <h2>{title}</h2>
            <p>
              {item.country && <span className="badge">{item.country}</span>}
              {item.category}
            </p>
          </div>
          <div className="modal__actions">
            {!episodes && siblings.length > 1 && (
              <>
                <button className="btn btn--ghost" onClick={() => step(-1)} aria-label="Précédent">←</button>
                <button className="btn btn--ghost" onClick={() => step(1)} aria-label="Suivant">→</button>
              </>
            )}
            <button className="btn btn--ghost" onClick={copy}>{copied ? 'Copiée ✓' : "Copier l'URL"}</button>
            <button className="btn" onClick={close}>Fermer</button>
          </div>
        </div>

        {episodes && (
          <aside className="episodes">
            {seasons.length > 1 && (
              <div className="episodes__seasons">
                {seasons.map(s => (
                  <button key={s} className="chip" aria-pressed={s === season} onClick={() => setSeason(s)}>
                    Saison {s}
                  </button>
                ))}
              </div>
            )}
            <ol className="episodes__list" ref={listRef} data-lenis-prevent>
              {episodes
                .filter(e => e.season === season)
                .map(e => (
                  <li key={e.id}>
                    <button aria-current={e.id === current.id} onClick={() => setEpisodeId(e.id)}>
                      <span className="episodes__num">E{String(e.episode).padStart(2, '0')}</span>
                      <span>{e.name.startsWith(item.name) ? e.name.slice(item.name.length).trim() || e.name : e.name}</span>
                    </button>
                  </li>
                ))}
            </ol>
          </aside>
        )}
      </SpotlightCard>
    </div>
  );
}
