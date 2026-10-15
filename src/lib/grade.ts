/**
 * 作図・選択の答えの採点（純粋関数）。正しければ note は null。
 * まちがいには、よくある まちがいに合わせた ひとことを返す（答えは言わない）。
 */
import type { MultiStep, PaintStep, SketchStep, DashStep, PointStep } from './question';
import { cellsOf, cellKey, piecesOf, stripStyle, hiddenEdges, edgeName, type Seg, type Pt } from './solid';

export interface Graded { ok: boolean; note: string | null }

const OK: Graded = { ok: true, note: null };

export function gradeMulti(s: MultiStep, picked: number[]): Graded {
  const ok = picked.length === s.correct.length && picked.every((x) => s.correct.includes(x));
  if (ok) return OK;
  const custom = s.diagnose?.(picked);
  if (custom) return { ok: false, note: custom };
  const extra = picked.filter((x) => !s.correct.includes(x)).length;
  const lack = s.correct.filter((x) => !picked.includes(x)).length;
  if (extra === 0 && lack > 0) return { ok: false, note: `えらんだものは あっているよ。でも まだ あるよ（ぜんぶで ${s.correct.length}つ）。` };
  if (lack === 0) return { ok: false, note: 'あてはまらないものが まじって いるよ。1つずつ たしかめよう。' };
  return { ok: false, note: null };
}

export function gradePaint(s: PaintStep, painted: string[]): Graded {
  const all = new Set([...cellsOf(s.given), ...painted]);
  if (s.answers.includes(cellKey(all))) return OK;
  const need = s.answers[0] ? s.answers[0].split(';').length - cellsOf(s.given).size : 0;
  if (painted.length !== need) {
    return { ok: false, note: `たりない 面は あと ${s.missing}つ。それぞれの 面の たて・横の 長さを、となりの 面と 合わせて 考えよう。` };
  }
  return { ok: false, note: '組み立てると、重なる 面や すきまが できるよ。どの面と どの面が 向かい合うか 考えよう。' };
}

/** かいた線から、もうかいてある線と同じものは のぞく（なぞってしまっても まちがいにしない） */
export function gradeSketch(s: SketchStep, segs: Seg[]): Graded {
  const givenPlain = new Set([...piecesOf(s.given)].map(stripStyle));
  const drawn = new Set([...piecesOf(segs)].filter((k) => !givenPlain.has(stripStyle(k))));
  const want = piecesOf(s.expected);
  const same = drawn.size === want.size && [...want].every((k) => drawn.has(k));
  if (same) return OK;
  const drawnPlain = new Set([...drawn].map(stripStyle));
  const wantPlain = new Set([...want].map(stripStyle));
  const samePlain = drawnPlain.size === wantPlain.size && [...wantPlain].every((k) => drawnPlain.has(k));
  if (samePlain) return { ok: false, note: '線の場所は あっているよ。見えない辺は 点線、見える辺は 実線で かこう。' };
  const extra = [...drawnPlain].some((k) => !wantPlain.has(k));
  const lack = [...wantPlain].some((k) => !drawnPlain.has(k));
  if (extra && !lack) return { ok: false, note: 'よけいな 線が あるよ。「1本もどす」で 消してみよう。' };
  if (!extra && lack) return { ok: false, note: 'まだ ひいていない 線が あるよ。平行な 辺は 同じ向き・同じ長さに なるよ。' };
  return { ok: false, note: '平行な 辺は、方眼の 同じ向き・同じ長さで かくよ。もう一度 たしかめよう。' };
}

export function gradeDash(s: DashStep, edges: string[]): Graded {
  const want = new Set(s.answer);
  const ok = edges.length === want.size && edges.every((e) => want.has(e));
  if (ok) return OK;
  if (edges.length < want.size && edges.every((e) => want.has(e))) return { ok: false, note: `見えない 辺は ぜんぶで ${want.size}本 あるよ。` };
  return { ok: false, note: '手前の 面に かくれて 見えない 辺だけを 点線に するよ。かくれた 頂点に 集まる 辺を さがそう。' };
}

export function gradePoint(s: PointStep, p: Pt): Graded {
  if (p.x === s.answer.x && p.y === s.answer.y) return OK;
  const custom = s.diagnose?.(p);
  return { ok: false, note: custom ?? null };
}

/** 見えない辺（見取図）の名前 */
export const hiddenEdgeNames = (view: 'right' | 'left'): string[] => hiddenEdges(view).map(edgeName);
