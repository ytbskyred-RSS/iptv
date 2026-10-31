import { useCallback, useState } from 'react';

const KEY = 'iptv:favorites';

const load = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
};

// Les favoris sont indexés par nom + catégorie, stables d'une playlist à l'autre.
export const favKey = item => `${item.category}::${item.name}`;

export function useFavorites() {
  const [favorites, setFavorites] = useState(load);

  const toggle = useCallback(item => {
    setFavorites(prev => {
      const next = new Set(prev);
      const key = favKey(item);
      next.has(key) ? next.delete(key) : next.add(key);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* stockage indisponible */
      }
      return next;
    });
  }, []);

  return { favorites, toggle };
}
