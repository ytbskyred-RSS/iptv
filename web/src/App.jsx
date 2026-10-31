import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import playlistUrl from '../../tv_channels_categorisees.m3u?url';
import { buildCatalog, KINDS, normalize, parseM3U } from './lib/m3u';
import { LenisContext, useLenis } from './hooks/useLenis';
import { favKey, useFavorites } from './hooks/useFavorites';
import Hero from './components/Hero';
import Toolbar from './components/Toolbar';
import Grid from './components/Grid';
import PlayerModal from './components/PlayerModal';

export default function App() {
  const lenis = useLenis();
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);
  const [kind, setKind] = useState('live');
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState('');
  const [showAdult, setShowAdult] = useState(false);
  const [playing, setPlaying] = useState(null);
  const { favorites, toggle } = useFavorites();
  const catalogRef = useRef(null);
  const deferredQuery = useDeferredValue(query);

  const load = useCallback(text => {
    const entries = parseM3U(text);
    if (!entries.length) throw new Error('Aucune entrée #EXTINF trouvée dans ce fichier.');
    setCatalog(buildCatalog(entries));
    setCategory(null);
  }, []);

  useEffect(() => {
    fetch(playlistUrl)
      .then(r => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(load)
      .catch(err => setError(err.message));
  }, [load]);

  const onLoadFile = async file => {
    try {
      load(await file.text());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const tabs = useMemo(() => {
    if (!catalog) return [];
    const count = k => catalog.items.filter(i => i.kind === k).length;
    const list = ['live', 'movie', 'series']
      .map(k => ({ key: k, label: KINDS[k], count: count(k) }))
      .filter(t => t.count);
    if (showAdult && count('adult')) list.push({ key: 'adult', label: KINDS.adult, count: count('adult') });
    list.push({ key: 'fav', label: 'Favoris', count: favorites.size });
    return list;
  }, [catalog, showAdult, favorites.size]);

  useEffect(() => {
    if (kind === 'adult' && !showAdult) setKind('live');
  }, [kind, showAdult]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const q = normalize(deferredQuery.trim());
    return catalog.items.filter(i => {
      if (kind === 'fav') {
        if (!favorites.has(favKey(i))) return false;
        if (i.kind === 'adult' && !showAdult) return false;
      } else if (i.kind !== kind) return false;
      if (category && i.category !== category) return false;
      return !q || i.search.includes(q);
    });
  }, [catalog, kind, category, deferredQuery, favorites, showAdult]);

  const scrollToCatalog = () => lenis?.scrollTo(catalogRef.current, { offset: -8, duration: 1.2 });

  const changeKind = k => {
    setKind(k);
    setCategory(null);
    if (catalogRef.current && window.scrollY > catalogRef.current.offsetTop) scrollToCatalog();
  };

  const changeCategory = c => {
    setCategory(c);
    if (catalogRef.current && window.scrollY > catalogRef.current.offsetTop) scrollToCatalog();
  };

  if (!catalog) {
    return (
      <div className="boot">
        {error ? (
          <>
            <p>Impossible de charger la playlist : {error}</p>
            <label className="btn">
              Choisir un fichier M3U
              <input type="file" hidden accept=".m3u,.m3u8,text/plain" onChange={e => e.target.files?.[0] && onLoadFile(e.target.files[0])} />
            </label>
          </>
        ) : (
          <>
            <span className="spinner" aria-hidden="true" />
            <p>Chargement de la playlist…</p>
          </>
        )}
      </div>
    );
  }

  return (
    <LenisContext.Provider value={lenis}>
      <Hero stats={catalog.stats} onExplore={scrollToCatalog} />

      <main className="catalog" ref={catalogRef}>
        <Toolbar
          tabs={tabs}
          kind={kind}
          onKind={changeKind}
          query={query}
          onQuery={setQuery}
          categories={kind === 'fav' ? [] : catalog.categories[kind] || []}
          category={category}
          onCategory={changeCategory}
          showAdult={showAdult}
          onShowAdult={setShowAdult}
          onLoadFile={onLoadFile}
        />
        {error && <p className="notice">{error}</p>}
        <Grid
          items={filtered}
          resetKey={`${kind}|${category}|${deferredQuery}`}
          favorites={favorites}
          onOpen={setPlaying}
          onFav={toggle}
        />
      </main>

      <footer className="footer">
        Animations : GSAP · défilement : Lenis · composants : React Bits
      </footer>

      {playing && (
        <PlayerModal item={playing} siblings={filtered} onNavigate={setPlaying} onClose={() => setPlaying(null)} />
      )}
    </LenisContext.Provider>
  );
}
