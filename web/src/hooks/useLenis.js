import { createContext, useContext, useEffect, useState } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const LenisContext = createContext(null);
export const useLenisInstance = () => useContext(LenisContext);

// Lenis piloté par le ticker GSAP pour que ScrollTrigger reste synchronisé.
export function useLenis() {
  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const instance = new Lenis({ autoRaf: false, lerp: reduce ? 1 : 0.1, wheelMultiplier: 1 });
    const raf = time => instance.raf(time * 1000);

    instance.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);

    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return lenis;
}
