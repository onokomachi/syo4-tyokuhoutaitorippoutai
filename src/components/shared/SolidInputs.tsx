/**
 * 作図・選択の答え方の部品（紙にかく代わりに、タップして答える）。
 *
 *  - NetPaint    … 展開図の続き。方眼のマスをタップ（なぞる）して面をぬる
 *  - SketchBoard … 見取図の続き・リボンの線。格子点を2つタップして線をひく（実線／点線）
 *  - DashBoard   … 見取図の見えない辺を、タップして点線にする
 *  - PointPicker … 平面の点。格子点をタップして点をかく
 *  - MultiPicker … 「全部書きましょう」。あてはまるものを全部えらぶ
 *
 * どれも「図と、かく場所」を同じ1枚にまとめる（別々にすると見くらべながら作図できない）。
 * 採点はしない（QuestionRound がする）。まちがえても かいたものは消さず、直して出し直せる。
 */
import React, { useEffect, useRef, useState } from 'react';
import { Undo2, Eraser, Check } from 'lucide-react';
import type { MultiStep, PaintStep, SketchStep, DashStep, PointStep } from '../../lib/question';
import { cellsOf, EDGES, edgeName, type Seg, type Pt, type VName } from '../../lib/solid';
import { NetSvgBody, GridLines, PlaneSvg, cuboidGeometry } from './Figure';

const SubmitButton: React.FC<{ enabled: boolean; onClick: () => void; label?: string }> = ({ enabled, onClick, label = 'これで できた！' }) => (
  <button
    onClick={onClick}
    disabled={!enabled}
    data-testid="submit-draw"
    className={`w-full py-4 rounded-2xl text-xl font-black shadow-lg transition-all ${enabled ? 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95' : 'bg-surface-3 text-faint'}`}
  >
    {label}
  </button>
);

const ToolButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode; active?: boolean; testid?: string }> = ({ onClick, disabled, children, active, testid }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    data-testid={testid}
    className={`px-3 py-2.5 rounded-2xl border-2 font-black text-sm flex items-center gap-1.5 disabled:opacity-40 transition ${active ? 'bg-brand text-on-brand border-brand' : 'bg-surface border-line text-muted'}`}
  >
    {children}
  </button>
);

/* ================================================================== */
/* 全部えらぶ                                                             */
/* ================================================================== */

export const MultiPicker: React.FC<{ step: MultiStep; locked: boolean; onSubmit: (picked: number[]) => void }> = ({ step, locked, onSubmit }) => {
  const [picked, setPicked] = useState<number[]>([]);
  const toggle = (i: number) => {
    if (locked) return;
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  };
  const cols = step.options.length > 6 ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2';
  return (
    <div className="space-y-3">
      <div className={`grid gap-2 ${cols}`} data-testid="multi-options">
        {step.options.map((o, i) => {
          const on = picked.includes(i);
          return (
            <button key={i} onClick={() => toggle(i)} data-testid={`multi-${i}`}
              className={`px-3 py-3 rounded-2xl border-2 font-black text-lg transition active:scale-[0.97] flex items-center justify-center gap-1 ${on ? 'bg-sky-100 border-sky-500 text-sky-800' : 'bg-surface border-line text-content'}`}>
              {on && <Check size={18} />}{o}
            </button>
          );
        })}
      </div>
      <p className="text-xs font-bold text-muted text-center">あてはまるものを ぜんぶ えらんでから「こたえる」</p>
      {!locked && <SubmitButton enabled={picked.length > 0} onClick={() => onSubmit([...picked].sort((a, b) => a - b))} label="こたえる" />}
    </div>
  );
};

/* ================================================================== */
/* 展開図の続き（マスをぬる）                                               */
/* ================================================================== */

export const NetPaint: React.FC<{ step: PaintStep; onSubmit: (cells: string[]) => void }> = ({ step, onSubmit }) => {
  const [painted, setPainted] = useState<string[]>([]);
  const dragging = useRef<null | 'add' | 'remove'>(null);
  const given = cellsOf(step.given);
  const sw = Math.max(step.gw, step.gh) / 150;
  // 指やマウスを方眼の外ではなしても、なぞりを終わらせる
  useEffect(() => {
    const stop = () => { dragging.current = null; };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => { window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); };
  }, []);

  const apply = (k: string, mode: 'add' | 'remove') => {
    if (given.has(k)) return;
    setPainted((p) => (mode === 'add' ? (p.includes(k) ? p : [...p, k]) : p.filter((x) => x !== k)));
  };
  const down = (k: string) => {
    if (given.has(k)) return;
    const mode = painted.includes(k) ? 'remove' : 'add';
    dragging.current = mode;
    apply(k, mode);
  };

  const cells: { x: number; y: number; k: string }[] = [];
  for (let x = 0; x < step.gw; x++) for (let y = 0; y < step.gh; y++) cells.push({ x, y, k: `${x},${y}` });

  return (
    <div className="space-y-3">
      <div className="bg-surface border border-line rounded-[28px] p-3">
        <svg viewBox={`-0.4 -0.4 ${step.gw + 0.8} ${step.gh + 0.8}`} className="w-full block" style={{ touchAction: 'none' }}
          onPointerUp={() => { dragging.current = null; }} onPointerLeave={() => { dragging.current = null; }} data-testid="net-paint">
          <GridLines w={step.gw} h={step.gh} sw={sw * 1.6} />
          <NetSvgBody rects={step.given} sw={sw * 3} />
          {painted.map((k) => {
            const [x, y] = k.split(',').map(Number) as [number, number];
            return <rect key={`p${k}`} x={x + 0.04} y={y + 0.04} width={0.92} height={0.92} rx={0.08} fill="#f59e0b" fillOpacity={0.55} stroke="#d97706" strokeWidth={sw * 1.5} />;
          })}
          {cells.map((c) => (
            <rect key={c.k} x={c.x} y={c.y} width={1} height={1} fill="transparent" style={{ cursor: given.has(c.k) ? 'default' : 'pointer' }}
              data-testid={`cell-${c.x}-${c.y}`}
              onPointerDown={(e) => {
                // 指でなぞったとき、となりのマスにも pointerenter が届くように capture を外す
                try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch { /* capture が無いときは何もしない */ }
                down(c.k);
              }}
              onPointerEnter={() => { if (dragging.current) apply(c.k, dragging.current); }} />
          ))}
        </svg>
        <div className="text-xs font-bold text-muted text-right mt-1">方眼の 1マスは {step.unitLabel}</div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-muted flex-1">マスを タップ（なぞる）して、たりない 面を ぬろう（あと {step.missing}面）。もう一度 タップで 消える。</p>
        <ToolButton onClick={() => setPainted([])} disabled={painted.length === 0}><Eraser size={16} /> ぜんぶ消す</ToolButton>
      </div>
      <SubmitButton enabled={painted.length > 0} onClick={() => onSubmit(painted)} />
    </div>
  );
};

/* ================================================================== */
/* 線をひく（見取図の続き・リボン）                                          */
/* ================================================================== */

export const SketchBoard: React.FC<{ step: SketchStep; onSubmit: (segs: Seg[]) => void }> = ({ step, onSubmit }) => {
  const [segs, setSegs] = useState<Seg[]>([]);
  const [start, setStart] = useState<Pt | null>(null);
  const [dashed, setDashed] = useState(false);
  const sw = Math.max(step.gw, step.gh) / 140;

  const tap = (p: Pt) => {
    if (!start) { setStart(p); return; }
    if (start.x === p.x && start.y === p.y) { setStart(null); return; }
    setSegs((s) => [...s, { a: start, b: p, dashed: step.useDashed && dashed }]);
    setStart(null);
  };

  const dots: Pt[] = [];
  for (let x = 0; x <= step.gw; x++) for (let y = 0; y <= step.gh; y++) dots.push({ x, y });
  const line = (s: Seg, color: string, w: number, key: string) => (
    <line key={key} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} stroke={color} strokeWidth={w} strokeLinecap="round"
      strokeDasharray={s.dashed ? `${w * 1.4} ${w * 1.6}` : undefined} />
  );

  return (
    <div className="space-y-3">
      <div className="bg-surface border border-line rounded-[28px] p-3">
        <svg viewBox={`-0.8 -0.8 ${step.gw + 1.6} ${step.gh + 1.6}`} className="w-full block" style={{ touchAction: 'manipulation' }} data-testid="sketch-board">
          <GridLines w={step.gw} h={step.gh} sw={sw} />
          {step.given.map((s, i) => line(s, 'var(--c-content)', sw * 2.4, `g${i}`))}
          {segs.map((s, i) => line(s, '#f43f5e', sw * 2.6, `u${i}`))}
          {step.marks?.map((m) => (
            <text key={m.label} x={m.x + 0.25} y={m.y - 0.2} fontSize={0.6} fontWeight={900} fill="var(--c-muted)">{m.label}</text>
          ))}
          {start && <circle cx={start.x} cy={start.y} r={sw * 5} fill="#f43f5e" />}
          {dots.map((p) => (
            <g key={`${p.x},${p.y}`}>
              <circle cx={p.x} cy={p.y} r={sw * 1.3} fill="var(--c-faint)" opacity={0.6} />
              <circle cx={p.x} cy={p.y} r={0.45} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => tap(p)}
                role="button" aria-label={`よこ ${p.x}、たて ${p.y} の 点`} data-testid={`gp-${p.x}-${p.y}`} />
            </g>
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {step.useDashed && (
          <>
            <ToolButton onClick={() => setDashed(false)} active={!dashed} testid="mode-solid">━ 実線</ToolButton>
            <ToolButton onClick={() => setDashed(true)} active={dashed} testid="mode-dashed">┅ 点線</ToolButton>
          </>
        )}
        <span className="flex-1" />
        <ToolButton onClick={() => setSegs((s) => s.slice(0, -1))} disabled={segs.length === 0}><Undo2 size={16} /> 1本もどす</ToolButton>
        <ToolButton onClick={() => { setSegs([]); setStart(null); }} disabled={segs.length === 0}><Eraser size={16} /> ぜんぶ消す</ToolButton>
      </div>
      <p className="text-sm font-bold text-muted">点を 2つ タップすると、そのあいだに 線が ひける。{step.useDashed ? '見えない辺は「点線」に きりかえて ひこう。' : ''}</p>
      <SubmitButton enabled={segs.length > 0} onClick={() => onSubmit(segs)} />
    </div>
  );
};

/* ================================================================== */
/* 見えない辺を点線に                                                      */
/* ================================================================== */

export const DashBoard: React.FC<{ step: DashStep; onSubmit: (edges: string[]) => void }> = ({ step, onSubmit }) => {
  const [dashedSet, setDashed] = useState<string[]>([]);
  const geo = cuboidGeometry(step.dims, step.view);
  const { P } = geo;
  const sw = 0.12;
  const toggle = (n: string) => setDashed((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n]));
  return (
    <div className="space-y-3">
      <div className="bg-surface border border-line rounded-[28px] p-3">
        <svg viewBox={geo.viewBox} className="w-full max-w-sm mx-auto block" style={{ touchAction: 'manipulation' }} data-testid="dash-board">
          {EDGES.map((e) => {
            const n = edgeName(e);
            const on = dashedSet.includes(n);
            return (
              <g key={n}>
                <line x1={P[e[0]].x} y1={P[e[0]].y} x2={P[e[1]].x} y2={P[e[1]].y} stroke={on ? '#f43f5e' : 'var(--c-content)'} strokeWidth={sw}
                  strokeDasharray={on ? `${sw * 3} ${sw * 3}` : undefined} strokeLinecap="round" />
                <line x1={P[e[0]].x} y1={P[e[0]].y} x2={P[e[1]].x} y2={P[e[1]].y} stroke="transparent" strokeWidth={0.9}
                  style={{ cursor: 'pointer' }} onClick={() => toggle(n)} data-testid={`edge-${n}`} />
              </g>
            );
          })}
          {(Object.keys(P) as VName[]).map((v) => <circle key={v} cx={P[v].x} cy={P[v].y} r={0.12} fill="var(--c-content)" />)}
        </svg>
      </div>
      <p className="text-sm font-bold text-muted">辺を タップすると 点線に なる（もう一度で もとにもどる）。</p>
      <SubmitButton enabled={dashedSet.length > 0} onClick={() => onSubmit(dashedSet)} />
    </div>
  );
};

/* ================================================================== */
/* 点をかく                                                               */
/* ================================================================== */

export const PointPicker: React.FC<{ step: PointStep; onSubmit: (p: Pt) => void }> = ({ step, onSubmit }) => {
  const [picked, setPicked] = useState<Pt | null>(null);
  return (
    <div className="space-y-3">
      <div className="bg-surface border border-line rounded-[28px] p-3">
        <PlaneSvg w={step.w} h={step.h} points={step.points} onTap={(x, y) => setPicked({ x, y })} picked={picked} pickedLabel={step.answerLabel} />
      </div>
      <p className="text-sm font-bold text-muted">点を かく ところを タップしよう（タップしなおすと うごく）。</p>
      <SubmitButton enabled={!!picked} onClick={() => picked && onSubmit(picked)} />
    </div>
  );
};
