/**
 * 「つみきの空」テーマ専用の背景（プログラムで描く。動画なし）。
 * 直方体と立方体の単元にあわせた世界：ゆめいろの夕ぞらに、やわらかな雲が流れ、
 * 立方体と直方体の「つみき」が ゆっくり回りながら ふわふわ のぼっていく。
 *   - 空：紺 → すみれ → ももいろ → 夕やけの 4段のグラデーション、またたく星、光る三日月
 *   - 雲：3そうの雲の帯（奥ほど小さく・うすく・ゆっくり）。下絵を1回だけ別 canvas に描き、毎フレームは貼ってずらすだけ
 *   - つみき：立方体・直方体を 3D で回す（面ごとに陰影・ふちの白い線・面の中のへこみ）。奥のものほど小さく・うすく・ゆっくり。
 *     パステルの6色。画面の上までのぼると、下から またあらわれる
 *   - 光：まわりを漂う星のきらめきと、やわらかな光の玉
 * theme === 'sakura'（内部ID。バッジ50%で解放。表示名は「つみきの空」）のときだけ描画する。
 * 軽さ：下絵は大きさが変わったときだけ描き、約30fps。つみきは 14こ・1こ 最大3面。
 * 「視差効果を減らす」設定では止めた1枚だけ、データセーバー／低速回線でもそのまま動かす（動画ではないので軽い）。
 * 光過敏への配慮（WCAG 2.3.1）：点滅させない。星のまたたきも ゆっくりで、明るさの変化は小さい。
 */
import React, { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { BgMode, detectBgMode } from './ThemeVideo';
import { CanvasEnv, CanvasScene, makeCanvas, makeGlow, useCanvasLayer } from './canvasLoop';

const PALETTE: Array<[number, number, number]> = [
  [255, 143, 177], // ももいろ
  [127, 229, 197], // みどり
  [142, 201, 255], // そらいろ
  [255, 226, 122], // レモン
  [195, 160, 255], // すみれ
  [255, 157, 122], // サーモン
];

interface Block {
  x: number; y: number; z: number;       // z: 0（手前）〜 1（奥）
  a: number; b: number; c: number;       // 半分の大きさ（px。手前基準）
  rx: number; ry: number; rz: number;
  vx: number; vy: number; vz: number;    // 回る速さ（rad/s）
  rise: number;                          // のぼる速さ（px/s）
  phase: number;
  color: [number, number, number];
}

interface Cloud { x: number; y: number; r: number; tone: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** ゆれる雲の帯を1枚つくる（幅 w の2まいぶんをつなげて、左へずらして使う） */
function makeCloudStrip(w: number, h: number, tone: [number, number, number], density: number, scale: number): HTMLCanvasElement {
  const [c, x] = makeCanvas(w, h);
  if (!x) return c;
  const puffs: Cloud[] = [];
  const n = Math.round((w / 140) * density);
  for (let i = 0; i < n; i++) {
    const px = (i / n) * w + rand(-30, 30);
    const base = h * 0.62 + rand(-h * 0.12, h * 0.12);
    const r = rand(46, 110) * scale;
    puffs.push({ x: px, y: base, r, tone: Math.random() });
    // 上にもりあがる小さな雲
    puffs.push({ x: px + rand(-r * 0.4, r * 0.4), y: base - r * rand(0.35, 0.6), r: r * rand(0.55, 0.85), tone: Math.random() });
  }
  const draw = (px: number, py: number, r: number, t: number) => {
    const g = x.createRadialGradient(px, py - r * 0.2, r * 0.1, px, py, r);
    const lift = 0.6 + 0.4 * t;
    const col = tone.map((v) => Math.round(Math.min(255, v * lift + 40 * (1 - lift)))).join(',');
    g.addColorStop(0, `rgba(${col},0.55)`);
    g.addColorStop(0.55, `rgba(${col},0.28)`);
    g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  };
  for (const p of puffs) {
    draw(p.x, p.y, p.r, p.tone);
    // 左右をはみだした分は反対がわにも描く（つなぎ目なし）
    if (p.x - p.r < 0) draw(p.x + w, p.y, p.r, p.tone);
    if (p.x + p.r > w) draw(p.x - w, p.y, p.r, p.tone);
  }
  return c;
}

/** 三日月（やわらかく光る）。三日月を先に切りぬいてから、光のもやを うしろ側（destination-over）に敷く */
function makeMoon(R: number): HTMLCanvasElement {
  const S = Math.ceil(R * 4);
  const [c, x] = makeCanvas(S, S);
  if (!x) return c;
  const body = x.createLinearGradient(S / 2 - R, S / 2 - R, S / 2 + R, S / 2 + R);
  body.addColorStop(0, '#fff7da');
  body.addColorStop(1, '#ffd9a0');
  x.fillStyle = body;
  x.beginPath(); x.arc(S / 2, S / 2, R, 0, Math.PI * 2); x.fill();
  x.globalCompositeOperation = 'destination-out';
  x.beginPath(); x.arc(S / 2 + R * 0.5, S / 2 - R * 0.28, R * 0.86, 0, Math.PI * 2); x.fill();
  x.globalCompositeOperation = 'destination-over';
  const g = x.createRadialGradient(S / 2, S / 2, R * 0.5, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,240,200,0.42)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return c;
}

/** 4つの角の星（きらめき） */
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
  let strips: Array<{ img: HTMLCanvasElement; y: number; speed: number; alpha: number }> = [];
  let blocks: Block[] = [];
  let stars: Array<{ x: number; y: number; r: number; ph: number; big: boolean }> = [];
  let sparkles: Array<{ x: number; y: number; r: number; ph: number; vy: number; c: string }> = [];
  let orbs: Array<{ x: number; y: number; r: number; vx: number; vy: number; ph: number; rgb: string }> = [];
  let moon: HTMLCanvasElement | null = null;
  let moonR = 0;
  const glowPink = makeGlow(64, '255,170,215');
  const glowWhite = makeGlow(64, '255,240,255');

  const spawnBlock = (env: CanvasEnv, anywhere: boolean): Block => {
    const z = Math.random();                 // 0=手前 1=奥
    const base = Math.min(env.W, env.H) * rand(0.045, 0.085);
    const kind = Math.random();
    // 立方体（a=b=c）と、のびた直方体（どれか1辺が 1.6〜2.4倍）
    let a = base, b = base, c = base;
    if (kind > 0.45) {
      const long = rand(1.6, 2.4);
      const axis = Math.floor(Math.random() * 3);
      if (axis === 0) a *= long; else if (axis === 1) b *= long; else c *= long;
    }
    return {
      x: rand(0, env.W),
      y: anywhere ? rand(0, env.H) : env.H + base * 3,
      z, a, b, c,
      rx: rand(0, Math.PI * 2), ry: rand(0, Math.PI * 2), rz: rand(0, Math.PI * 2),
      vx: rand(-0.35, 0.35), vy: rand(-0.5, 0.5), vz: rand(-0.25, 0.25),
      rise: rand(8, 22) * (1 - z * 0.55),
      phase: Math.random() * Math.PI * 2,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    };
  };

  const drawBlock = (ctx: CanvasRenderingContext2D, bl: Block, t: number) => {
    const depth = 1 - bl.z * 0.55;           // 奥ほど小さい
    const bob = Math.sin(t * 0.0012 + bl.phase) * 6 * depth;
    const cx = bl.x + Math.sin(t * 0.0007 + bl.phase) * 14 * depth;
    const cy = bl.y + bob;
    const half = [bl.a * depth, bl.b * depth, bl.c * depth];
    // 回転行列（Y→X→Z）
    const sy = Math.sin(bl.ry), cyy = Math.cos(bl.ry);
    const sx = Math.sin(bl.rx), cxx = Math.cos(bl.rx);
    const sz = Math.sin(bl.rz), czz = Math.cos(bl.rz);
    const rot = (px: number, py: number, pz: number): [number, number, number] => {
      let x1 = px * cyy + pz * sy, z1 = -px * sy + pz * cyy, y1 = py;
      const y2 = y1 * cxx - z1 * sx, z2 = y1 * sx + z1 * cxx;
      const x3 = x1 * czz - y2 * sz, y3 = x1 * sz + y2 * czz;
      return [x3, y3, z2];
    };
    const F = 620;                           // 遠近の強さ
    const proj = (p: [number, number, number]): [number, number] => {
      const s = F / (F + p[2]);
      return [cx + p[0] * s, cy + p[1] * s];
    };
    const [r, g, bch] = bl.color;
    // 光の来る向き（左上・手前）
    const L: [number, number, number] = [-0.4, -0.7, -0.6];
    const faces: Array<{ n: [number, number, number]; pts: Array<[number, number]>; z: number; ctr: [number, number] }> = [];
    for (let axis = 0; axis < 3; axis++) {
      for (const sign of [-1, 1]) {
        const u = (axis + 1) % 3, v = (axis + 2) % 3;
        const corner = (su: number, sv: number): [number, number, number] => {
          const q = [0, 0, 0];
          q[axis] = sign * half[axis]; q[u] = su * half[u]; q[v] = sv * half[v];
          return rot(q[0], q[1], q[2]);
        };
        const nv = [0, 0, 0]; nv[axis] = sign;
        const n = rot(nv[0], nv[1], nv[2]);
        if (n[2] >= 0) continue;             // 奥を向いた面は描かない
        const cs = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
        const zz = cs.reduce((acc, p) => acc + p[2], 0) / 4;
        faces.push({ n, pts: cs.map(proj), z: zz, ctr: proj(rot(nv[0] * half[axis], nv[1] * half[axis], nv[2] * half[axis])) });
      }
    }
    faces.sort((p, q) => q.z - p.z);
    const a = 0.5 + 0.45 * depth;            // 奥ほどうすい
    for (const f of faces) {
      const lit = Math.max(0, -(f.n[0] * L[0] + f.n[1] * L[1] + f.n[2] * L[2]));
      const k = 0.7 + 0.3 * lit;
      ctx.fillStyle = `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(bch * k)},${a})`;
      ctx.beginPath();
      f.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath(); ctx.fill();
      // 面の中の へこみ（ふちを0.62倍にした四角）
      ctx.fillStyle = `rgba(255,255,255,${0.16 * a})`;
      ctx.beginPath();
      f.pts.forEach((p, i) => {
        const px = f.ctr[0] + (p[0] - f.ctr[0]) * 0.62, py = f.ctr[1] + (p[1] - f.ctr[1]) * 0.62;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.32 * a})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      f.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath(); ctx.stroke();
    }
  };

  return {
    setup(env) {
      const { W, H } = env;
      strips = [
        { img: makeCloudStrip(Math.ceil(W * 1.2), Math.ceil(H * 0.4), [120, 100, 190], 1.0, 0.8), y: H * 0.34, speed: 3, alpha: 0.9 },
        { img: makeCloudStrip(Math.ceil(W * 1.2), Math.ceil(H * 0.45), [215, 140, 200], 1.0, 1.0), y: H * 0.52, speed: 6, alpha: 0.85 },
        { img: makeCloudStrip(Math.ceil(W * 1.2), Math.ceil(H * 0.5), [255, 190, 170], 1.1, 1.25), y: H * 0.7, speed: 11, alpha: 0.8 },
      ];
      blocks = Array.from({ length: 14 }, () => spawnBlock(env, true)).sort((p, q) => q.z - p.z);
      stars = Array.from({ length: Math.min(90, Math.floor((W * H) / 14000)) }, () => ({
        x: rand(0, W), y: rand(0, H * 0.55), r: rand(0.6, 1.8), ph: rand(0, 6.28), big: Math.random() < 0.08,
      }));
      sparkles = Array.from({ length: 26 }, () => ({
        x: rand(0, W), y: rand(0, H), r: rand(3, 8), ph: rand(0, 6.28), vy: rand(4, 14),
        c: ['255,200,230', '200,225,255', '255,240,190'][Math.floor(Math.random() * 3)],
      }));
      orbs = Array.from({ length: 7 }, () => ({
        x: rand(0, W), y: rand(0, H), r: rand(60, 150), vx: rand(-6, 6), vy: rand(-4, 4), ph: rand(0, 6.28),
        rgb: ['255,150,200', '170,150,255', '255,200,150', '140,200,255'][Math.floor(Math.random() * 4)],
      }));
      moonR = Math.min(W, H) * 0.075;
      moon = makeMoon(moonR);
    },
    draw(ctx, env, t, dt) {
      const { W, H } = env;
      const s = dt / 1000;
      // 空
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#120c33');
      sky.addColorStop(0.4, '#2a1a5e');
      sky.addColorStop(0.72, '#7a3a86');
      sky.addColorStop(1, '#d1798c');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      // 星
      ctx.globalCompositeOperation = 'lighter';
      for (const st of stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * 0.0009 + st.ph);
        ctx.globalAlpha = 0.7 * tw;
        if (st.big) { ctx.fillStyle = 'rgba(255,245,220,1)'; drawStar4(ctx, st.x, st.y, 5 + 2 * tw); }
        else { const sz = st.r * 5; ctx.drawImage(glowWhite, st.x - sz / 2, st.y - sz / 2, sz, sz); }
      }
      // 光の玉（ボケ）
      for (const o of orbs) {
        o.x += o.vx * s; o.y += o.vy * s;
        if (o.x < -o.r) o.x = W + o.r; else if (o.x > W + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = H + o.r; else if (o.y > H + o.r) o.y = -o.r;
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        const al = 0.11 + 0.05 * Math.sin(t * 0.0005 + o.ph);
        g.addColorStop(0, `rgba(${o.rgb},${al})`); g.addColorStop(1, `rgba(${o.rgb},0)`);
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // 月
      if (moon) {
        const mx = W * 0.82, my = H * 0.2 + Math.sin(t * 0.0004) * 5;
        ctx.globalAlpha = 0.95;
        ctx.drawImage(moon, mx - moon.width / 2, my - moon.height / 2);
        ctx.globalAlpha = 1;
      }

      // 雲（奥の帯 → 手前の帯）。つみきは 雲の あいだを のぼっていくので、帯の間に 奥・手前の つみきを はさむ
      const drawStrip = (st: (typeof strips)[number]) => {
        const w = st.img.width;
        const off = ((t / 1000) * st.speed) % w;
        ctx.globalAlpha = st.alpha;
        for (let x = -off; x < W; x += w) ctx.drawImage(st.img, x, st.y - st.img.height / 2);
        ctx.globalAlpha = 1;
      };
      drawStrip(strips[0]);

      // つみき（奥 → 手前）。z が 0.5 より奥は 雲の奥側、手前は 雲の手前側
      const far = blocks.filter((b) => b.z >= 0.5);
      const near = blocks.filter((b) => b.z < 0.5);
      const stepBlock = (b: Block) => {
        b.rx += b.vx * s; b.ry += b.vy * s; b.rz += b.vz * s;
        b.y -= b.rise * s;
        if (b.y < -b.a * 4) Object.assign(b, spawnBlock(env, false));
      };
      for (const b of far) { stepBlock(b); drawBlock(ctx, b, t); }
      drawStrip(strips[1]);
      for (const b of near) { stepBlock(b); drawBlock(ctx, b, t); }
      drawStrip(strips[2]);

      // きらめき（上へ ふわっと）
      ctx.globalCompositeOperation = 'lighter';
      for (const sp of sparkles) {
        sp.y -= sp.vy * s;
        if (sp.y < -20) { sp.y = H + 20; sp.x = rand(0, W); }
        const tw = 0.5 + 0.5 * Math.sin(t * 0.0013 + sp.ph);
        ctx.globalAlpha = 0.55 * tw;
        ctx.fillStyle = `rgba(${sp.c},1)`;
        drawStar4(ctx, sp.x, sp.y, sp.r * (0.7 + 0.5 * tw));
        const gs = sp.r * 5;
        ctx.globalAlpha = 0.22 * tw;
        ctx.drawImage(glowPink, sp.x - gs / 2, sp.y - gs / 2, gs, gs);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}

export const ToyBlocksBackground: React.FC = () => {
  const theme = useSettingsStore((s) => s.theme);
  const active = theme === 'sakura';
  const [mode] = useState<BgMode>(detectBgMode);
  const canvasRef = useCanvasLayer(active, mode, createScene);
  if (!active) return null;
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#150e33]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* 文字を読みやすくする暗幕（中央はうすく、四隅と下をこく） */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 42%, rgba(14,8,40,0.08) 20%, rgba(10,5,30,0.5) 100%)' }} />
    </div>
  );
};
