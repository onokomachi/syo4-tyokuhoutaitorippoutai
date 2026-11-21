/**
 * テーマ背景の canvas を動かす共通のしくみ（2026-11-21）。
 * - 大きさが変わったとき（と最初）に setup を呼ぶ。重い下絵（雲・光の玉など）はここで別 canvas に1回だけ描く。
 * - 毎フレーム（約30fps）は draw で、下絵を貼る・動かすだけにする（学校の端末でも軽く）。
 * - devicePixelRatio は 1.5 まで。タブが裏に回るとブラウザが止める。
 * - 「視差効果を減らす」設定（mode === 'still'）では 1 回だけ描いて止める。
 */
import { useEffect, useRef } from 'react';
import type { BgMode } from './ThemeVideo';

export interface CanvasEnv { W: number; H: number; dpr: number }

export interface CanvasScene {
  setup: (env: CanvasEnv) => void;
  /** t＝経過ms（still のときは 0 のまま）、dt＝前のコマからのms（最大100） */
  draw: (ctx: CanvasRenderingContext2D, env: CanvasEnv, t: number, dt: number) => void;
}

export const FRAME_MS = 33;

/** 別 canvas（下絵用）を作る */
export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.ceil(w));
  c.height = Math.max(2, Math.ceil(h));
  return [c, c.getContext('2d')];
}

/** やわらかい光の玉（中心が明るく、まわりへ消える）。加算合成で貼ると光になる */
export function makeGlow(size: number, rgb: string, core = 'rgba(255,255,255,1)'): HTMLCanvasElement {
  const [c, x] = makeCanvas(size, size);
  if (x) {
    const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, core);
    g.addColorStop(0.25, `rgba(${rgb},0.7)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
  }
  return c;
}

export function useCanvasLayer(active: boolean, mode: BgMode, makeScene: () => CanvasScene) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const scene = makeScene();
    const env: CanvasEnv = { W: 0, H: 0, dpr: 1 };
    const still = mode === 'still';
    let raf = 0, last = 0, prev = 0;

    const render = (t: number, dt: number) => {
      ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
      ctx.clearRect(0, 0, env.W, env.H);
      scene.draw(ctx, env, still ? 0 : t, dt);
    };
    const resize = () => {
      env.dpr = Math.min(1.5, window.devicePixelRatio || 1);
      env.W = window.innerWidth;
      env.H = window.innerHeight;
      canvas.width = Math.ceil(env.W * env.dpr);
      canvas.height = Math.ceil(env.H * env.dpr);
      scene.setup(env);
      render(last, FRAME_MS);
    };
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < FRAME_MS) return;
      const dt = Math.min(100, last ? t - last : FRAME_MS);
      last = t;
      prev = t;
      render(t, dt);
    };

    resize();
    window.addEventListener('resize', resize);
    if (!still) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      void prev;
    };
    // makeScene は各背景ファイルのモジュール内の関数（変わらない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, mode]);
  return ref;
}
