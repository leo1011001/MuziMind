import { useEffect, useRef, useState } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  baseOpacity: number;
  opacity: number;
  opacityDir: number;
  opacitySpeed: number;
  scalePhase: number;
  scaleSpeed: number;
  vx: number;
  vy: number;
  color: string;
}

// Dark mode colors (light/warm tones)
const DARK_STAR_COLORS = [
  'rgba(255, 255, 240,',   // warm white
  'rgba(255, 248, 200,',   // light yellow
  'rgba(220, 210, 255,',   // lavender
  'rgba(200, 230, 255,',   // ice blue
  'rgba(255, 230, 180,',   // soft gold
];

// Light mode colors (dark/muted tones for visibility)
const LIGHT_STAR_COLORS = [
  'rgba(60, 50, 80,',      // dark purple
  'rgba(80, 70, 100,',     // muted violet
  'rgba(50, 60, 90,',      // dark blue-gray
  'rgba(70, 60, 80,',      // dusty purple
  'rgba(90, 80, 110,',     // soft charcoal purple
];

function makeStars(count: number, w: number, h: number, isLight: boolean): Star[] {
  const colors = isLight ? LIGHT_STAR_COLORS : DARK_STAR_COLORS;
  return Array.from({ length: count }, () => {
    const baseOpacity = isLight ? (0.12 + Math.random() * 0.35) : (0.15 + Math.random() * 0.55);
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.8 + Math.random() * 2.2,
      baseOpacity,
      opacity: baseOpacity,
      opacityDir: Math.random() > 0.5 ? 1 : -1,
      opacitySpeed: 0.003 + Math.random() * 0.008,
      scalePhase: Math.random() * Math.PI * 2,
      scaleSpeed: 0.004 + Math.random() * 0.006,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  });
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [isLightMode, setIsLightMode] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'light';
  });

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'data-theme') {
          const newTheme = document.documentElement.getAttribute('data-theme');
          setIsLightMode(newTheme === 'light');
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use screen dimensions as the backing buffer size so iOS toolbar
    // show/hide (which changes window.innerHeight) never triggers a
    // star rebuild and never causes a visual "jump" during scroll.
    let w = window.innerWidth;
    // screen.height is the physical screen — doesn't change with toolbar.
    const screenH = (window.screen?.height ?? window.innerHeight) * (window.devicePixelRatio || 1);
    // Use the larger of the two so all scroll positions are covered.
    let h = Math.max(window.innerHeight, screenH / (window.devicePixelRatio || 1));

    canvas.width = w;
    canvas.height = h;

    // Fewer stars on mobile — keeps GPU pressure low on phones.
    const isMobile = w < 768;
    const density = isMobile ? 14000 : 8000;
    const count = Math.floor((w * h) / density);
    starsRef.current = makeStars(count, w, h, isLightMode);

    const handleResize = () => {
      const newW = window.innerWidth;
      // Only rebuild when the width actually changes — height changes are just
      // the iOS Safari toolbar appearing/disappearing during scroll; ignore them.
      if (Math.abs(newW - w) < 2) return;
      w = newW;
      h = Math.max(window.innerHeight, (window.screen?.height ?? window.innerHeight));
      canvas.width = w;
      canvas.height = h;
      starsRef.current = makeStars(Math.floor((w * h) / density), w, h, isLightMode);
    };
    window.addEventListener('resize', handleResize);

    // Delta-time animation: multiply every per-frame movement by elapsed
    // milliseconds so stars drift at a constant real-world speed regardless
    // of how many times per second rAF fires (important on iOS during scroll).
    const TARGET_MS = 1000 / 60; // target one 60fps frame

    const draw = (timestamp: number) => {
      const delta = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / TARGET_MS, 3) : 1;
      lastTimeRef.current = timestamp;

      ctx.clearRect(0, 0, w, h);

      for (const star of starsRef.current) {
        // Breathing opacity — scaled to delta so it's time-consistent
        star.opacity += star.opacityDir * star.opacitySpeed * delta;
        if (star.opacity >= star.baseOpacity + 0.35 || star.opacity <= star.baseOpacity - 0.35) {
          star.opacityDir *= -1;
        }
        star.opacity = Math.max(0, Math.min(1, star.opacity));

        // Breathing scale
        star.scalePhase += star.scaleSpeed * delta;
        const breathScale = 1 + 0.5 * Math.abs(Math.sin(star.scalePhase));

        // Drift — delta-time keeps speed identical at 30fps or 120fps
        star.x += star.vx * delta;
        star.y += star.vy * delta;
        if (star.x < -10) star.x = w + 10;
        if (star.x > w + 10) star.x = -10;
        if (star.y < -10) star.y = h + 10;
        if (star.y > h + 10) star.y = -10;

        // Outer soft glow
        const glowR = star.r * (3 + breathScale * 2.5);
        const grd = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR);
        grd.addColorStop(0, `${star.color}${(star.opacity * 0.6).toFixed(3)})`);
        grd.addColorStop(1, `${star.color}0)`);
        ctx.beginPath();
        ctx.arc(star.x, star.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core bright dot
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `${star.color}${star.opacity.toFixed(3)})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isLightMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        // Force GPU compositing layer so the canvas isn't repainted during
        // momentum scroll on iOS — prevents the "stars flying" visual.
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform',
      }}
    />
  );
}
