import { useEffect, useRef, memo, CSSProperties } from 'react';
import { createRenderGate, prefersReducedMotion } from '../utils/renderGate';

const TWO_PI = Math.PI * 2;
const SETTLE_EPSILON = 0.05;
const SPEED_SAMPLE_MS = 20;

interface DotFieldProps {
  dotRadius?: number;
  dotSpacing?: number;
  cursorRadius?: number;
  cursorForce?: number;
  bulgeOnly?: boolean;
  bulgeStrength?: number;
  glowRadius?: number;
  sparkle?: boolean;
  waveAmplitude?: number;
  gradientFrom?: string;
  gradientTo?: string;
  style?: CSSProperties;
  className?: string;
}

const DotField = memo<DotFieldProps>(
  ({
    dotRadius = 1.5,
    dotSpacing = 14,
    cursorRadius = 500,
    cursorForce = 0.1,
    bulgeOnly = true,
    bulgeStrength = 67,
    glowRadius = 160,
    sparkle = false,
    waveAmplitude = 0,
    gradientFrom = 'rgba(124, 58, 237, 0.55)',
    gradientTo = 'rgba(180, 151, 207, 0.35)',
    style,
    className,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const glowRef = useRef<SVGCircleElement>(null);
    const dotsRef = useRef<Array<{ ax: number; ay: number; sx: number; sy: number; vx: number; vy: number; x: number; y: number }>>([]);
    const mouseRef = useRef({ x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 });
    const rafRef = useRef<number | null>(null);
    const sizeRef = useRef({ w: 0, h: 0, offsetX: 0, offsetY: 0 });
    const glowOpacity = useRef(0);
    const engagement = useRef(0);
    const propsRef = useRef<DotFieldProps>({});
    propsRef.current = {
      dotRadius,
      dotSpacing,
      cursorRadius,
      cursorForce,
      bulgeOnly,
      bulgeStrength,
      sparkle,
      waveAmplitude,
      gradientFrom,
      gradientTo,
    };
    const rebuildRef = useRef<(() => void) | null>(null);
    const refreshRef = useRef<(() => void) | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      const glowEl = glowRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const reduceMotion = prefersReducedMotion();
      let resizeTimer: ReturnType<typeof setTimeout>;
      let gradient: CanvasGradient | null = null;

      function resize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(doResize, 100);
      }

      function doResize() {
        if (!canvas || !canvas.parentElement) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

        sizeRef.current = {
          w,
          h,
          offsetX: rect.left + window.scrollX,
          offsetY: rect.top + window.scrollY,
        };

        gradient = null;
        buildDots(w, h);
        wake();
      }

      function buildDots(w: number, h: number) {
        const p = propsRef.current;
        const step = p.dotRadius! + p.dotSpacing!;
        const cols = Math.floor(w / step);
        const rows = Math.floor(h / step);
        const padX = (w % step) / 2;
        const padY = (h % step) / 2;
        const dots: Array<{ ax: number; ay: number; sx: number; sy: number; vx: number; vy: number; x: number; y: number }> = new Array(rows * cols);
        let idx = 0;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const ax = padX + col * step + step / 2;
            const ay = padY + row * step + step / 2;
            dots[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
          }
        }
        dotsRef.current = dots;
      }

      function onMouseMove(e: MouseEvent) {
        const target = e.target as Element | null;
        if (target && target.closest('.ln-navbar')) return;
        const s = sizeRef.current;
        mouseRef.current.x = e.pageX - s.offsetX;
        mouseRef.current.y = e.pageY - s.offsetY;
        wake();
      }

      function updateMouseSpeed() {
        const m = mouseRef.current;
        const dx = m.prevX - m.x;
        const dy = m.prevY - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        m.speed += (dist - m.speed) * 0.5;
        if (m.speed < 0.001) m.speed = 0;
        m.prevX = m.x;
        m.prevY = m.y;
      }

      let frameCount = 0;
      let gateOpen = false;
      let settled = false;
      let speedAccumulator = 0;
      let lastTime = 0;

      function start() {
        if (rafRef.current != null) return;
        lastTime = performance.now();
        speedAccumulator = SPEED_SAMPLE_MS;
        rafRef.current = requestAnimationFrame(tick);
      }

      function wake() {
        settled = false;
        if (!gateOpen) return;
        start();
      }

      function stop() {
        if (rafRef.current == null) return;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      function tick(now: number) {
        rafRef.current = requestAnimationFrame(tick);

        frameCount++;
        const dots = dotsRef.current;
        const m = mouseRef.current;
        const { w, h } = sizeRef.current;
        const p = propsRef.current;
        const len = dots.length;
        const t = frameCount * 0.02;

        speedAccumulator += Math.min(Math.max(now - lastTime, 0), 100);
        lastTime = now;
        while (speedAccumulator >= SPEED_SAMPLE_MS) {
          speedAccumulator -= SPEED_SAMPLE_MS;
          updateMouseSpeed();
        }

        const targetEngagement = reduceMotion ? 0 : Math.min(m.speed / 5, 1);
        engagement.current += (targetEngagement - engagement.current) * 0.06;
        if (engagement.current < 0.001) engagement.current = 0;
        const eng = engagement.current;

        glowOpacity.current += (eng - glowOpacity.current) * 0.08;
        if (glowOpacity.current < 0.001) glowOpacity.current = 0;

        if (glowEl) {
          glowEl.setAttribute('cx', String(m.x));
          glowEl.setAttribute('cy', String(m.y));
          glowEl.style.opacity = String(glowOpacity.current);
        }

        ctx!.clearRect(0, 0, w, h);

        if (!gradient) {
          gradient = ctx!.createLinearGradient(0, 0, w, h);
          gradient.addColorStop(0, p.gradientFrom!);
          gradient.addColorStop(1, p.gradientTo!);
        }
        ctx!.fillStyle = gradient;

        const cr = p.cursorRadius!;
        const crSq = cr * cr;
        const rad = p.dotRadius! / 2;
        const isBulge = p.bulgeOnly;
        const hasWave = !reduceMotion && (p.waveAmplitude ?? 0) > 0;
        const hasSparkle = !reduceMotion && !!p.sparkle;
        let atRest = !hasWave && !hasSparkle && eng === 0 && glowOpacity.current === 0;

        ctx!.beginPath();

        for (let i =  0; i < len; i++) {
          const d = dots[i];
          const dx = m.x - d.ax;
          const dy = m.y - d.ay;
          const distSq = dx * dx + dy * dy;

          if (distSq < crSq && eng > 0.01) {
            const dist = Math.sqrt(distSq) || 1;
            const nx = dx / dist;
            const ny = dy / dist;
            if (isBulge) {
              const falloff = 1 - dist / cr;
              const push = falloff * falloff * p.bulgeStrength! * eng;
              d.sx += (d.ax - nx * push - d.sx) * 0.15;
              d.sy += (d.ay - ny * push - d.sy) * 0.15;
            } else {
              const move = (500 / dist) * (m.speed * p.cursorForce!);
              d.vx -= nx * move;
              d.vy -= ny * move;
            }
          } else if (isBulge) {
            d.sx += (d.ax - d.sx) * 0.1;
            d.sy += (d.ay - d.sy) * 0.1;
          }

          if (!isBulge) {
            d.vx *= 0.9;
            d.vy *= 0.9;
            d.x = d.ax + d.vx;
            d.y = d.ay + d.vy;
            d.sx += (d.x - d.sx) * 0.1;
            d.sy += (d.y - d.sy) * 0.1;
          }

          if (
            atRest &&
            (Math.abs(d.sx - d.ax) > SETTLE_EPSILON || Math.abs(d.sy - d.ay) > SETTLE_EPSILON)
          ) {
            atRest = false;
          }

          let drawX = d.sx;
          let drawY = d.sy;
          if (hasWave) {
            drawY += Math.sin(d.ax * 0.03 + t) * (p.waveAmplitude ?? 0);
            drawX += Math.cos(d.ay * 0.03 + t * 0.7) * (p.waveAmplitude ?? 0) * 0.5;
          }

          if (hasSparkle) {
            const hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
            if (hash % 100 < 3) {
              ctx!.moveTo(drawX + rad * 1.8, drawY);
              ctx!.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
            } else {
              ctx!.moveTo(drawX + rad, drawY);
              ctx!.arc(drawX, drawY, rad, 0, TWO_PI);
            }
          } else {
            ctx!.moveTo(drawX + rad, drawY);
            ctx!.arc(drawX, drawY, rad, 0, TWO_PI);
          }
        }

        ctx!.fill();

        if (atRest) {
          settled = true;
          stop();
        }
      }

      doResize();
      window.addEventListener('resize', resize);
      if (!reduceMotion) window.addEventListener('mousemove', onMouseMove, { passive: true });

      const disposeGate = createRenderGate(canvas, {
        onStart: () => {
          gateOpen = true;
          if (settled) return;
          start();
        },
        onStop: () => {
          gateOpen = false;
          stop();
        },
      });

      rebuildRef.current = () => {
        const { w, h } = sizeRef.current;
        if (w > 0 && h > 0) buildDots(w, h);
        gradient = null;
        wake();
      };

      refreshRef.current = () => {
        gradient = null;
        wake();
      };

      return () => {
        disposeGate();
        stop();
        rebuildRef.current = null;
        refreshRef.current = null;
        clearTimeout(resizeTimer);
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', onMouseMove);
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      rebuildRef.current?.();
    }, [dotRadius, dotSpacing]);

    useEffect(() => {
      refreshRef.current?.();
    }, [gradientFrom, gradientTo, cursorRadius, cursorForce, bulgeOnly, bulgeStrength, sparkle, waveAmplitude]);

    return (
      <div
        className={className}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          ...style,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        />
        <svg
          ref={svgRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <radialGradient id="dot-field-glow">
              <stop offset="0%" stopColor="#080808" />
              <stop offset="100%" stopColor="#08080800" />
            </radialGradient>
          </defs>
          <circle
            ref={glowRef}
            cx="-9999"
            cy="-9999"
            r={glowRadius}
            fill="url(#dot-field-glow)"
            style={{ opacity: 0, willChange: 'opacity' }}
          />
        </svg>
      </div>
    );
  },
);

DotField.displayName = 'DotField';

export default DotField;
