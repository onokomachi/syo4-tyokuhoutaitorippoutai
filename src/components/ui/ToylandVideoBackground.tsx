/**
 * 「おもちゃの雲」テーマ専用の背景：ふわふわの雲の海に、積み木・アヒル・くま・メリーゴーラウンドが ただよう動画。
 * 動画は 480p・音声なし・約0.5MB（元は 720p・音声つき・4.4MB）。はじめと終わりを1秒かけて溶かして、くり返しの継ぎ目をなめらかにしてある。
 * その上に、動画の世界をふくらませる演出を canvas で重ねる：
 *   - ふわっと のぼる、まるいシャボンのような光の玉
 *   - ゆっくり またたく、4つの角の星のきらめき（点滅させない）
 * さらに、文字を読みやすくする暗幕（明るい動画なので、すこし ふかい 空色に落とす）を重ねる。
 * theme === 'inferno'（内部ID。バッジ75%で解放。表示名は「おもちゃの雲」）のときだけ描画し、それ以外のテーマでは動画を読み込みもしない。
 * 「視差効果を減らす」設定では静止画＋止まった演出、データセーバー／低速回線では静止画＋演出にする。
 */
import React, { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { BgMode, ThemeVideo, VideoSources, detectBgMode } from './ThemeVideo';
import { CanvasScene, makeGlow, useCanvasLayer } from './canvasLoop';
import { media } from '../../lib/media';

const VIDEO: VideoSources = {
  webm: media('/videos/rippoutai/theme/loop.webm'),
  mp4: media('/videos/rippoutai/theme/loop.mp4'),
  poster: media('/videos/rippoutai/theme/poster.jpg'),
  preferMp4: true,
};

/** 明るい雲の上でも文字が読めるように、空色に深く落とし、四隅をしぼる */
const GRADE_OVERLAY = [
  'radial-gradient(ellipse at 50% 42%, rgba(14,28,70,0.22) 16%, rgba(8,16,48,0.7) 100%)',
  'linear-gradient(to bottom, rgba(10,20,60,0.46) 0%, rgba(10,20,60,0.2) 40%, rgba(8,16,48,0.46) 100%)',
].join(', ');

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function drawStar4(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fill();
}

function createScene(): CanvasScene {
  const glow = makeGlow(64, '200,230,255');
  let bubbles: Array<{ x: number; y: number; r: number; vy: number; ph: number; sway: number }> = [];
  let stars: Array<{ x: number; y: number; r: number; ph: number; c: string }> = [];
  return {
    setup({ W, H }) {
      bubbles = Array.from({ length: Math.min(34, Math.floor((W * H) / 30000)) }, () => ({
        x: rand(0, W), y: rand(0, H), r: rand(5, 16), vy: rand(10, 30), ph: rand(0, 6.28), sway: rand(6, 18),
      }));
      stars = Array.from({ length: 22 }, () => ({
        x: rand(0, W), y: rand(0, H), r: rand(3, 8), ph: rand(0, 6.28), c: ['255,230,240', '210,235,255', '255,245,200'][Math.floor(Math.random() * 3)],
      }));
    },
    draw(ctx, { W, H }, t, dt) {
      const s = dt / 1000;
      ctx.globalCompositeOperation = 'lighter';
      for (const b of bubbles) {
        b.y -= b.vy * s;
        if (b.y < -30) { b.y = H + 30; b.x = rand(0, W); }
        const x = b.x + Math.sin(t * 0.0008 + b.ph) * b.sway;
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = 'rgba(210,235,255,0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
        const gs = b.r * 3.2;
        ctx.globalAlpha = 0.28;
        ctx.drawImage(glow, x - gs / 2, b.y - gs / 2, gs, gs);
        // 光のてり
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.16, 0, Math.PI * 2); ctx.fill();
      }
      for (const st of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * 0.0011 + st.ph);
        ctx.globalAlpha = 0.6 * tw;
        ctx.fillStyle = `rgba(${st.c},1)`;
        drawStar4(ctx, st.x, st.y, st.r * (0.7 + 0.5 * tw));
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}

export const ToylandVideoBackground: React.FC = () => {
  const theme = useSettingsStore((s) => s.theme);
  const active = theme === 'inferno';
  const [mode] = useState<BgMode>(detectBgMode);
  const canvasRef = useCanvasLayer(active, mode, createScene);
  if (!active) return null;
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0c1838]">
      <ThemeVideo src={VIDEO} mode={mode} />
      <div className="absolute inset-0" style={{ background: GRADE_OVERLAY }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
