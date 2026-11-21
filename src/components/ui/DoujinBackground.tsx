/**
 * 「童神（どうじん）」テーマ専用の背景：ボス戦にも登場する、ピンクのうさぎ服の巨大な男の子（童神）そのものを背景にする。
 * 童神が くまのぬいぐるみを ふりまきながら わらう 待機動画（ボス戦の待機動画と同じ）を最背面で無音ループし、
 * その上に、動画の世界をなぞった演出を canvas で重ねる：
 *   - ゆっくり落ちてくる、くるくる回る色とりどりの星の紙ふぶき
 *   - 童神の ほうから 広がる「ぽんっ」という光の輪（6秒ごと。ゆっくり広がって消える）
 *   - まわりを漂う、金のきらめき
 * theme === 'tenkuu'（内部ID。バッジ100%で解放。表示名は「童神」）のときだけ描画し、それ以外のテーマでは動画を読み込みもしない。
 * 動画はボス戦の待機動画と同じファイルなので、どちらかで一度読めばもう一方はキャッシュから出る。
 * 「視差効果を減らす」設定では静止画＋止まった演出、データセーバー／低速回線では静止画＋演出にする。
 * 光過敏への配慮（WCAG 2.3.1）：点滅させない。光の輪は ゆっくり広がって消えるだけ。
 */
import React, { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { BgMode, ThemeVideo, VideoSources, detectBgMode } from './ThemeVideo';
import { CanvasScene, makeGlow, useCanvasLayer } from './canvasLoop';
import { media } from '../../lib/media';

export const DOUJIN_VIDEO: VideoSources = {
  webm: media('/videos/rippoutai/boss/idle.webm'),
  mp4: media('/videos/rippoutai/boss/idle.mp4'),
  poster: media('/videos/rippoutai/boss/idle-poster.jpg'),
  preferMp4: true,
};

/** 夕やけの明るい動画の上でも文字が読めるように暗く落とし、四隅をしぼる（中央の童神は やや明るく残す） */
const GRADE_OVERLAY = [
  'radial-gradient(ellipse at 50% 44%, rgba(40,12,30,0.22) 18%, rgba(24,6,20,0.80) 100%)',
  'linear-gradient(to bottom, rgba(30,8,26,0.52) 0%, rgba(30,8,26,0.26) 38%, rgba(24,6,20,0.50) 100%)',
].join(', ');

const COLORS = ['255,150,190', '255,215,120', '150,215,255', '190,160,255', '150,235,200'];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Confetti { x: number; y: number; vy: number; vx: number; r: number; rot: number; vr: number; ph: number; c: string }

function drawStar5(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function createScene(): CanvasScene {
  const glow = makeGlow(64, '255,215,130', 'rgba(255,250,225,1)');
  let confetti: Confetti[] = [];
  let glints: Array<{ x: number; y: number; r: number; ph: number }> = [];
  const spawn = (W: number, H: number, anywhere: boolean): Confetti => ({
    x: rand(0, W), y: anywhere ? rand(0, H) : -20, vy: rand(14, 40), vx: rand(-8, 8),
    r: rand(5, 11), rot: rand(0, 6.28), vr: rand(-1.4, 1.4), ph: rand(0, 6.28), c: COLORS[Math.floor(Math.random() * COLORS.length)],
  });
  return {
    setup({ W, H }) {
      confetti = Array.from({ length: Math.min(46, Math.floor((W * H) / 22000)) }, () => spawn(W, H, true));
      glints = Array.from({ length: 24 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(8, 22), ph: rand(0, 6.28) }));
    },
    draw(ctx, { W, H }, t, dt) {
      const s = dt / 1000;
      const cx = W * 0.5, cy = H * 0.46;
      ctx.globalCompositeOperation = 'lighter';
      // ぽんっ：6秒ごとに中心から広がる光の輪（2本）
      const period = 6000;
      for (const delay of [0, 220]) {
        const p = (((t - delay) % period) + period) % period / period;
        if (p < 0.85) {
          const q = p / 0.85;
          ctx.globalAlpha = 0.2 * (1 - q) * (delay ? 0.6 : 1);
          ctx.strokeStyle = 'rgba(255,200,225,1)';
          ctx.lineWidth = 2 + 7 * (1 - q);
          ctx.beginPath(); ctx.arc(cx, cy, 30 + q * Math.max(W, H) * 0.55, 0, Math.PI * 2); ctx.stroke();
        }
      }
      // 金のきらめき
      for (const g of glints) {
        const tw = 0.5 + 0.5 * Math.sin(t * 0.0012 + g.ph);
        const sz = g.r * (1 + 0.5 * tw);
        ctx.globalAlpha = 0.32 * tw;
        ctx.drawImage(glow, g.x - sz, g.y - sz, sz * 2, sz * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      // 星の紙ふぶき
      for (const f of confetti) {
        f.y += f.vy * s; f.x += (f.vx + Math.sin(t * 0.0009 + f.ph) * 10) * s; f.rot += f.vr * s;
        if (f.y > H + 20) Object.assign(f, spawn(W, H, false));
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        // くるくる回って ぺらっと 薄くなる（紙のよう）
        ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(t * 0.002 + f.ph)));
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = `rgba(${f.c},1)`;
        drawStar5(ctx, f.r);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };
}

export const DoujinBackground: React.FC = () => {
  const theme = useSettingsStore((s) => s.theme);
  const active = theme === 'tenkuu';
  const [mode] = useState<BgMode>(detectBgMode);
  const canvasRef = useCanvasLayer(active, mode, createScene);
  if (!active) return null;
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#24101e]">
      <ThemeVideo src={DOUJIN_VIDEO} mode={mode} />
      <div className="absolute inset-0" style={{ background: GRADE_OVERLAY }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
