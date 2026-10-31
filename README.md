# iptv

Playlist `tv_channels_categorisees.m3u` + **IPTV Lounge**, une interface web (dossier `web/`) pour la parcourir et la lire.

## IPTV Lounge

- **React + Vite**
- **[GSAP](https://github.com/greensock/GSAP)** : parallaxe du hero (ScrollTrigger), apparition en cascade des cartes, onglets animés, ouverture du lecteur.
- **[Lenis](https://github.com/darkroomengineering/lenis)** : défilement fluide, synchronisé avec le ticker GSAP / ScrollTrigger.
- **[React Bits](https://github.com/DavidHDev/react-bits)** : `Aurora`, `SplitText`, `CountUp`, `SpotlightCard` (copiés dans `web/src/components/reactbits/`, licence incluse).

Fonctionnalités : onglets Direct / Films / Séries / Favoris, catégories, recherche (insensible aux accents), séries regroupées par saison et épisode, favoris en local, chargement d'un autre fichier M3U, catégorie adulte masquée par défaut (interrupteur 18+).

### Lancer

```bash
cd web
npm install
npm run dev      # http://localhost:5173
```

`npm run build && npm run preview` pour la version de production.

### Lecture

- Direct : MPEG-TS via `mpegts.js`, puis HLS (`/live/…m3u8`) via `hls.js`.
- Films / séries : lecture native (`.mp4`, puis `.mkv` pour les URL sans extension).
- Le serveur Vite (`dev` et `preview`) expose un petit proxy `/stream?url=…` qui contourne l'absence d'en-têtes CORS des serveurs IPTV. Sans ce proxy (hébergement statique, HTTPS), beaucoup de flux seront bloqués par le navigateur : utilisez alors « Copier l'URL » et ouvrez le flux dans VLC / mpv.
- Les conteneurs MKV et certains codecs (HEVC, AC3) ne sont pas lisibles par tous les navigateurs.
