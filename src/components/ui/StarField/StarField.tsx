import { useEffect, useRef } from 'react';

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

const STAR_COLORS = [
  'rgba(255, 255, 240,',   // warm white
  'rgba(255, 248, 200,',   // light yellow
  'rgba(220, 210, 255,',   // lavender
  'rgba(200, 230, 255,',   // ice blue
  'rgba(255, 230, 180,',   // soft gold
];

function makeStars(count: number, w: number, h: number): Star[] {
  return Array.from({ length: count }, () => {
    const baseOpacity = 0.15 + Math.random() * 0.55;
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
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    };
  });
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const count = Math.floor((w * h) / 8000);
    starsRef.current = makeStars(count, w, h);

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      starsRef.current = makeStars(Math.floor((w * h) / 8000), w, h);
    };
    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (const star of starsRef.current) {
        // Breathing: opacity pulses between baseOpacity ± 0.35
        star.opacity += star.opacityDir * star.opacitySpeed;
        if (star.opacity >= star.baseOpacity + 0.35 || star.opacity <= star.baseOpacity - 0.35) {
          star.opacityDir *= -1;
        }
        star.opacity = Math.max(0, Math.min(1, star.opacity));

        // Breathing scale: inner→outer glow grows and shrinks
        star.scalePhase += star.scaleSpeed;
        const breathScale = 1 + 0.5 * Math.abs(Math.sin(star.scalePhase));

        // Slow float drift
        star.x += star.vx;
        star.y += star.vy;
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

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
      }}
    />
  );
}
