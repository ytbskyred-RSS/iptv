import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function Toolbar({
  tabs,
  kind,
  onKind,
  query,
  onQuery,
  categories,
  category,
  onCategory,
  showAdult,
  onShowAdult,
  onLoadFile
}) {
  const tabsRef = useRef(null);
  const pillRef = useRef(null);
  const chipsRef = useRef(null);

  // Pastille animée sous l'onglet actif.
  useLayoutEffect(() => {
    const active = tabsRef.current?.querySelector('[aria-selected="true"]');
    if (!active || !pillRef.current) return;
    gsap.to(pillRef.current, {
      x: active.offsetLeft,
      width: active.offsetWidth,
      duration: 0.45,
      ease: 'power3.out'
    });
  }, [kind, tabs.length]);

  useLayoutEffect(() => {
    const chips = chipsRef.current?.children;
    if (!chips?.length) return;
    gsap.fromTo(chips, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.015, ease: 'power2.out' });
  }, [kind]);

  return (
    <div className="toolbar">
      <div className="toolbar__row">
        <div className="tabs" role="tablist" ref={tabsRef}>
          <span className="tabs__pill" ref={pillRef} aria-hidden="true" />
          {tabs.map(t => (
            <button key={t.key} role="tab" aria-selected={kind === t.key} className="tabs__tab" onClick={() => onKind(t.key)}>
              {t.label}
              <span className="tabs__count">{t.count}</span>
            </button>
          ))}
        </div>

        <label className="search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Rechercher une chaîne, un film, une série…"
            value={query}
            onChange={e => onQuery(e.target.value)}
          />
        </label>

        <div className="toolbar__actions">
          <label className="switch">
            <input type="checkbox" checked={showAdult} onChange={e => onShowAdult(e.target.checked)} />
            <span>18+</span>
          </label>
          <label className="btn btn--ghost">
            Charger un M3U
            <input
              type="file"
              accept=".m3u,.m3u8,audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain"
              hidden
              onChange={e => e.target.files?.[0] && onLoadFile(e.target.files[0])}
            />
          </label>
        </div>
      </div>

      {categories.length > 1 && (
        <div className="chips" ref={chipsRef}>
          <button className="chip" aria-pressed={!category} onClick={() => onCategory(null)}>
            Tout
          </button>
          {categories.map(c => (
            <button key={c.name} className="chip" aria-pressed={category === c.name} onClick={() => onCategory(c.name)}>
              {c.name}
              <span className="chip__count">{c.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
