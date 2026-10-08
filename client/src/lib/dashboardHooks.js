import { useEffect, useRef, useState } from "react";

// Date.now(), refreshed every `everyMs`. One of these at the top of the page drives every countdown chip.
export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 0 -> target over `duration` ms, ONCE (the first time a value arrives). Later changes jump straight to the new value, so a
// refresh never replays the animation. Under reduced motion the value is just the target. null while there is no target.
export function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  const played = useRef(false);

  useEffect(() => {
    if (target == null) return;
    if (played.current || prefersReducedMotion()) {
      setValue(target);
      played.current = true;
      return;
    }
    let frame;
    const start = performance.now();
    const tick = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      setValue(Math.round(target * (1 - (1 - progress) ** 3))); // ease-out cubic
      if (progress < 1) frame = requestAnimationFrame(tick);
      else played.current = true; // marked at the END, so React's dev double-run of effects still animates
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return target == null ? null : value;
}

// The rendered width of an element, kept current. Charts are drawn at this width instead of being scaled, so their text stays
// the same size on a phone.
export function useElementWidth(fallback = 600) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
