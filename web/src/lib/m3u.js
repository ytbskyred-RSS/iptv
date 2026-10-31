// Analyse d'une playlist M3U étendue (#EXTINF) et regroupement par type.

const ATTR_RE = /([\w-]+)="([^"]*)"/g;
const COUNTRY_RE = /^([A-Z]{2,3})\s*[:|]\s*/;
const EPISODE_RE = /\s+S(\d{1,2})\s*E(\d{1,3})\s*$/i;

export const KINDS = {
  live: 'Direct',
  movie: 'Films',
  series: 'Séries',
  adult: 'Adultes'
};

const kindOf = (group, url) => {
  if (/adulte|adult|xxx/i.test(group)) return 'adult';
  if (/\/series\//.test(url) || /^s[ée]ries/i.test(group)) return 'series';
  if (/\/movie\//.test(url) || /^films?/i.test(group)) return 'movie';
  return 'live';
};

// "Portugal | Généralistes" -> "Généralistes", "Films | Filmes 2024" -> "Filmes 2024"
const shortGroup = group => {
  const parts = group.split('|').map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return group || 'Divers';
  return parts[0] === 'Portugal' ? `Portugal · ${parts.slice(1).join(' ')}` : parts.slice(1).join(' ');
};

export const normalize = s =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let pending = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      const attrs = {};
      for (const m of line.matchAll(ATTR_RE)) attrs[m[1]] = m[2];
      const comma = line.indexOf(',', line.lastIndexOf('"') + 1);
      const title = (comma >= 0 ? line.slice(comma + 1) : attrs['tvg-name'] || '').trim();
      pending = { attrs, title };
    } else if (!line.startsWith('#') && pending) {
      const group = pending.attrs['group-title'] || '';
      const country = pending.title.match(COUNTRY_RE)?.[1] ?? null;
      const name = pending.title.replace(COUNTRY_RE, '') || pending.title;
      entries.push({
        id: `e${entries.length}`,
        name,
        country,
        logo: pending.attrs['tvg-logo'] || '',
        tvgId: pending.attrs['tvg-id'] || '',
        group,
        category: shortGroup(group),
        kind: kindOf(group, line),
        url: line
      });
      pending = null;
    }
  }
  return entries;
}

// Les épisodes ("Show S01 E03") sont regroupés en une fiche par série.
export function buildCatalog(entries) {
  const items = [];
  const shows = new Map();

  for (const e of entries) {
    if (e.kind !== 'series') {
      items.push({ ...e, search: normalize(`${e.name} ${e.category}`) });
      continue;
    }
    const m = e.name.match(EPISODE_RE);
    const title = m ? e.name.replace(EPISODE_RE, '').trim() : e.name;
    const key = `${e.group}::${title}`;
    let show = shows.get(key);
    if (!show) {
      show = {
        id: `s${shows.size}`,
        name: title,
        logo: e.logo,
        group: e.group,
        category: e.category,
        kind: 'series',
        country: e.country,
        episodes: [],
        search: normalize(`${title} ${e.category}`)
      };
      shows.set(key, show);
      items.push(show);
    }
    show.episodes.push({
      ...e,
      season: m ? Number(m[1]) : 0,
      episode: m ? Number(m[2]) : show.episodes.length + 1
    });
  }

  for (const show of shows.values()) {
    show.episodes.sort((a, b) => a.season - b.season || a.episode - b.episode);
  }

  const categories = {};
  for (const item of items) {
    const list = (categories[item.kind] ||= new Map());
    list.set(item.category, (list.get(item.category) || 0) + 1);
  }

  return {
    items,
    categories: Object.fromEntries(
      Object.entries(categories).map(([k, m]) => [k, [...m.entries()].map(([name, count]) => ({ name, count }))])
    ),
    stats: {
      live: items.filter(i => i.kind === 'live').length,
      movie: items.filter(i => i.kind === 'movie').length,
      series: shows.size,
      episodes: entries.filter(e => e.kind === 'series').length
    }
  };
}
