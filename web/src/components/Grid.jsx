import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { favKey } from '../hooks/useFavorites';

const PAGE = 60;

const initials = name =>
  name
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

const Card = memo(function Card({ item, isFav, onOpen, onFav }) {
  const [broken, setBroken] = useState(!item.logo);
  const poster = item.kind === 'movie' || item.kind === 'series';
  const ref = useRef(null);

  // Léger effet de profondeur suivant le pointeur.
  const onMove = e => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(ref.current, { rotateY: x * 8, rotateX: -y * 8, duration: 0.4, ease: 'power2.out' });
  };
  const onLeave = () => gsap.to(ref.current, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });

  return (
    <article
      ref={ref}
      className={`card card--${poster ? 'poster' : 'logo'}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <button className="card__hit" onClick={() => onOpen(item)} aria-label={`Lire ${item.name}`}>
        <div className="card__media">
          {broken ? (
            <span className="card__initials">{initials(item.name)}</span>
          ) : (
            <img src={item.logo} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
          )}
          <span className="card__play" aria-hidden="true">▶</span>
        </div>
        <div className="card__body">
          <h3 className="card__title">{item.name}</h3>
          <p className="card__meta">
            {item.country && <span className="badge">{item.country}</span>}
            {item.episodes ? `${item.episodes.length} épisode${item.episodes.length > 1 ? 's' : ''}` : item.category}
          </p>
        </div>
      </button>
      <button
        className="card__fav"
        aria-pressed={isFav}
        aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        onClick={() => onFav(item)}
      >
        {isFav ? '★' : '☆'}
      </button>
    </article>
  );
});

export default function Grid({ items, resetKey, favorites, onOpen, onFav }) {
  const [page, setPage] = useState({ key: resetKey, count: PAGE });
  const gridRef = useRef(null);
  const sentinelRef = useRef(null);
  const shown = useRef({ grid: null, count: 0 });

  // Nouveau filtre : on repart de la première page (pendant le rendu, pas après).
  if (page.key !== resetKey) setPage({ key: resetKey, count: PAGE });
  const count = page.key === resetKey ? page.count : PAGE;

  // Pagination infinie : on ajoute une page quand la sentinelle approche.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) =>
        entry.isIntersecting && setPage(p => ({ ...p, count: Math.min(p.count + PAGE, items.length) })),
      { rootMargin: '800px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [items.length, count]);

  // Apparition en cascade des cartes nouvellement rendues.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (shown.current.grid !== grid) shown.current = { grid, count: 0 };
    const cards = [...grid.children];
    const fresh = cards.slice(shown.current.count);
    shown.current.count = cards.length;
    if (!fresh.length) return;
    gsap.fromTo(
      fresh,
      { y: 36, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out', stagger: { each: 0.018, from: 'start' }, overwrite: true }
    );
  }, [count, resetKey]);

  const visible = items.slice(0, count);

  if (!items.length) {
    return <p className="empty">Aucun résultat. Essayez une autre recherche ou catégorie.</p>;
  }

  return (
    <>
      <div className="grid" ref={gridRef} key={resetKey}>
        {visible.map(item => (
          <Card key={item.id} item={item} isFav={favorites.has(favKey(item))} onOpen={onOpen} onFav={onFav} />
        ))}
      </div>
      {count < items.length && (
        <div ref={sentinelRef} className="sentinel">
          {items.length - count} de plus…
        </div>
      )}
    </>
  );
}
