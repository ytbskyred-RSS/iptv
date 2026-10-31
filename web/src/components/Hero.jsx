import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import Aurora from './reactbits/Aurora';
import SplitText from './reactbits/SplitText';
import CountUp from './reactbits/CountUp';
import SpotlightCard from './reactbits/SpotlightCard';

const STATS = [
  { key: 'live', label: 'Chaînes en direct' },
  { key: 'movie', label: 'Films' },
  { key: 'series', label: 'Séries' },
  { key: 'episodes', label: 'Épisodes' }
];

export default function Hero({ stats, onExplore }) {
  const root = useRef(null);

  // Parallaxe : le contenu monte et s'estompe, l'aurore se dissipe au scroll.
  useGSAP(
    () => {
      const scrub = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.hero__content', { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: scrub });
      gsap.to('.hero__aurora', { opacity: 0.15, scale: 1.15, ease: 'none', scrollTrigger: scrub });
      gsap.from('.hero__stat', { y: 40, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.6 });
      gsap.from('.hero__cta', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.9 });
    },
    { scope: root }
  );

  return (
    <header ref={root} className="hero">
      <div className="hero__aurora">
        <Aurora colorStops={['#3A29FF', '#FF94B4', '#FF3232']} amplitude={1.1} blend={0.55} speed={0.6} />
      </div>
      <div className="hero__content">
        <p className="hero__eyebrow">Votre playlist, en grand</p>
        <SplitText
          text="IPTV Lounge"
          tag="h1"
          className="hero__title"
          effect="blur"
          splitType="chars"
          delay={45}
          trigger="load"
          hoverEffect="wave"
        />
        <p className="hero__lead">
          Direct, films et séries de votre fichier M3U, réunis dans une interface fluide.
        </p>
        <div className="hero__stats">
          {STATS.map(s => (
            <SpotlightCard key={s.key} className="hero__stat" spotlightColor="#ff94b4" intensity={0.2} borderGlow={0.8}>
              <CountUp to={stats[s.key] || 0} separator=" " duration={1.6} className="hero__stat-value" />
              <span className="hero__stat-label">{s.label}</span>
            </SpotlightCard>
          ))}
        </div>
        <button className="hero__cta" onClick={onExplore}>
          Explorer le catalogue
          <span aria-hidden="true">↓</span>
        </button>
      </div>
    </header>
  );
}
