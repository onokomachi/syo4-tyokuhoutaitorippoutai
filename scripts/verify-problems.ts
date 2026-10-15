/**
 * 問題ジェネレーターの機械検査（npm run verify）。型チェックやブラウザ確認では見つからない
 * 「まれな乱数で壊れる」「正答を入れても誤答診断が反応する」「正しい作図が×になる」を止める。
 *
 *  0. 形の計算そのものの検査: 6マスの形（35種類）のうち立方体の展開図は 11種類 /
 *     立方体の展開図を組み立てると、まわりの14本の辺が 2本ずつ 7組 重なる
 *  1. 全項目 × N回 作って、1回も例外にならない
 *  2. 数: 正答で誤答診断が null / 整数 / 5文字以内 / ヒント3段 / 1段めが答えを言わない
 *  3. 選択式: 正解の位置が範囲内 / 重複なし / wrong の並び / 正解の位置だけ null
 *  4. 全部えらぶ: 正解の組が○になる・正解の組で診断が反応しない
 *  4b. 辺を組み立てる答え（edges）: 正解の辺の名前を並べかえても・リストの順番を入れかえても○／辺を1本ぬく・余分な辺を足す・
 *      べつの辺にずらすと×／正解の組で誤答診断が反応しない／足場（えらぶ形）が正しい／toPickForm でボス戦用の形にもどる
 *  5. 作図: 正しい答え（展開図のマス・見取図の線・点・点線の辺）を入れると○になる。方眼からはみ出さない
 *  6. 出題のバリエーションが 20通り以上（画面に出る図まで含めて数える）
 *  7. 選択式の正解が1つの位置に かたよらない
 */
import { GENERATORS, generate, toPickForm } from '../src/lib/problems';
import type { Question, Step } from '../src/lib/question';
import { MODULES } from '../src/constants';
import { TEST_STEPS, OMOTE_MAX, URA_MAX } from '../src/lib/testConfig';
import { EXTRA_SKILLS } from '../src/lib/trialConfig';
import { gradeMulti, gradeEdges, gradePaint, gradeSketch, gradeDash, gradePoint } from '../src/lib/grade';
import { randomHexomino, shapeId, isCubeNet, randomNet, boundaryPoints, cellsOf } from '../src/lib/solid';

let failures = 0;
const fail = (id: string, msg: string) => {
  failures++;
  if (failures <= 40) console.error(`✗ ${id}: ${msg}`);
};

const MIN_VARIETY = 20;
/** 展開図の作図は、続きのかき方を全部数えるので重い。回数を減らす */
const trialsOf = (id: string) => (id === 'tenkai-cube' || id === 'tenkai-cuboid' ? 400 : 2000);

/* ---- 0. 形の計算そのもの ---- */
{
  const shapes = new Map<string, boolean>();
  for (let i = 0; i < 40000 && shapes.size < 35; i++) {
    const c = randomHexomino();
    const k = shapeId(c);
    if (!shapes.has(k)) shapes.set(k, isCubeNet(c));
  }
  const nets = [...shapes.values()].filter(Boolean).length;
  if (shapes.size !== 35) fail('solid', `6マスの形が ${shapes.size} 種類（35のはず）`);
  if (nets !== 11) fail('solid', `立方体の展開図が ${nets} 種類（11のはず）`);
  for (let i = 0; i < 500; i++) {
    const bp = boundaryPoints(randomNet([1, 1, 1]));
    if (bp.points.length !== 14) fail('solid', `展開図のまわりの点が ${bp.points.length}`);
    const cnt = new Map<string, number>();
    bp.edges.forEach((e) => cnt.set(e.edge, (cnt.get(e.edge) ?? 0) + 1));
    if (cnt.size !== 7 || [...cnt.values()].some((v) => v !== 2)) fail('solid', '重なる辺が 2本ずつ7組 になっていない');
    if (new Set(bp.points.map((p) => p.corner)).size !== 8) fail('solid', '頂点が8つに ならない');
  }
}

function signature(q: Question): string {
  return `${q.text}#${JSON.stringify(q.figure ?? '')}#${JSON.stringify(q.steps)}`;
}

function checkStep(id: string, s: Step, stepNo: number) {
  const tag = `step${stepNo + 1}(${s.label})`;
  if (s.hints.length !== 3) fail(id, `${tag}: ヒントが3段ではない (${s.hints.length})`);
  switch (s.kind) {
    case 'num': {
      if (!Number.isInteger(s.answer) || s.answer < 0) fail(id, `${tag}: 答えが 0以上の整数でない ${s.answer}`);
      if (String(s.answer).length > 5) fail(id, `${tag}: 答え ${s.answer} が入力欄に入らない`);
      if (s.diagnose && s.diagnose(s.answer) !== null) fail(id, `${tag}: 正答 ${s.answer} で誤答診断が反応する`);
      const a = String(s.answer);
      if (a.length >= 2 && s.hints[0]?.includes(a) && !s.hints[0].includes(`${a}cm の`)) fail(id, `${tag}: 1段めのヒントが答え ${a} を言っている`);
      break;
    }
    case 'choice': {
      if (s.correct < 0 || s.correct >= s.choices.length) fail(id, `${tag}: 正解の位置が範囲外`);
      if (new Set(s.choices).size !== s.choices.length) fail(id, `${tag}: 選択肢に重複 ${s.choices.join(' / ')}`);
      if (s.wrong) {
        if (s.wrong.length !== s.choices.length) fail(id, `${tag}: wrong と choices の並びがちがう`);
        s.wrong.forEach((w, i) => {
          if (i === s.correct && w !== null) fail(id, `${tag}: 正解の位置に助言がある`);
          if (i !== s.correct && !w) fail(id, `${tag}: まちがいの選択肢 ${i} に助言がない`);
        });
      }
      break;
    }
    case 'multi': {
      if (s.correct.length === 0) fail(id, `${tag}: 正解が無い`);
      if (s.correct.some((i) => i < 0 || i >= s.options.length)) fail(id, `${tag}: 正解の位置が範囲外 ${s.correct.join(',')}`);
      if (new Set(s.options).size !== s.options.length) fail(id, `${tag}: 選択肢に重複`);
      if (!gradeMulti(s, [...s.correct]).ok) fail(id, `${tag}: 正解の組が○にならない`);
      if (s.diagnose && s.diagnose([...s.correct]) !== null) fail(id, `${tag}: 正解の組で診断が反応する`);
      break;
    }
    case 'edges': {
      const L = new Set(s.letters);
      if (L.size !== s.letters.length) fail(id, `${tag}: 頂点の文字に重複`);
      if (s.correct.length === 0) fail(id, `${tag}: 正解の辺が無い`);
      const canon = (n: string) => [...n].sort().join('');
      for (const e of [...s.edges, ...s.correct]) if (e.length !== 2 || ![...e].every((c) => L.has(c))) fail(id, `${tag}: 辺 ${e} が図の文字でできていない`);
      if (new Set(s.edges).size !== s.edges.length) fail(id, `${tag}: 辺の一覧に重複`);
      for (const c of s.correct) if (!s.edges.includes(canon(c))) fail(id, `${tag}: 正解 ${c} が辺の一覧に無い`);
      // 正解: 名前を逆から書く・リストの順番を入れかえる・全部の書き方で○
      const rev = s.correct.map((c) => [...c].reverse().join(''));
      if (!gradeEdges(s, [...s.correct]).ok) fail(id, `${tag}: 正解の組が○にならない`);
      if (!gradeEdges(s, rev).ok) fail(id, `${tag}: 頂点の順番を逆に書いた正解が○にならない`);
      if (!gradeEdges(s, [...s.correct].reverse()).ok) fail(id, `${tag}: リストの順番を変えた正解が○にならない`);
      if (!gradeEdges(s, [...rev, ...s.correct]).ok) fail(id, `${tag}: 同じ辺を2回入れた正解が○にならない`);
      if (s.diagnose && s.diagnose([...s.correct].map(canon).sort()) !== null) fail(id, `${tag}: 正解の組で診断が反応する`);
      // まちがい: 1本ぬく・余分に足す・べつの辺にずらす・何も入れない は×
      if (s.correct.length > 1 && gradeEdges(s, s.correct.slice(1)).ok) fail(id, `${tag}: 1本たりなくても○になる`);
      const others = s.edges.filter((e) => !s.correct.map(canon).includes(e));
      for (const o of others) {
        if (gradeEdges(s, [...s.correct, o]).ok) fail(id, `${tag}: 余分な辺 ${o} を足しても○になる`);
        if (gradeEdges(s, [o]).ok) fail(id, `${tag}: まちがいの辺 ${o} だけで○になる`);
        if (gradeEdges(s, [...s.correct.slice(1), o]).ok) fail(id, `${tag}: 1本を ${o} にずらしても○になる`);
      }
      if (gradeEdges(s, []).ok) fail(id, `${tag}: 何も入れずに○になる`);
      // 足場: いまの「えらぶ」形が正しい
      checkStep(id, s.scaffold, stepNo);
      if (s.scaffold.kind === 'multi') {
        const want = s.scaffold.correct.map((i) => (s.scaffold as { options: string[] }).options[i]!.replace('辺', '')).map(canon).sort();
        if (want.join() !== [...s.correct].map(canon).sort().join()) fail(id, `${tag}: 足場の正解と組み立ての正解がちがう`);
      } else if (s.scaffold.kind === 'choice') {
        const want = canon(s.scaffold.choices[s.scaffold.correct]!.replace('辺', ''));
        if (s.correct.length !== 1 || want !== canon(s.correct[0]!)) fail(id, `${tag}: 足場の正解と組み立ての正解がちがう`);
      }
      break;
    }
    case 'paint': {
      if (s.answers.length === 0) { fail(id, `${tag}: 正しい続きが1つも無い`); break; }
      const given = cellsOf(s.given);
      const total = 2 * (s.dims[0] * s.dims[1] + s.dims[0] * s.dims[2] + s.dims[1] * s.dims[2]);
      for (const ans of s.answers) {
        const cells = ans.split(';');
        if (cells.length !== total) fail(id, `${tag}: 答えのマスの数 ${cells.length}（${total} のはず）`);
        if (cells.some((c) => { const [x, y] = c.split(',').map(Number) as [number, number]; return x < 0 || y < 0 || x >= s.gw || y >= s.gh; })) fail(id, `${tag}: 答えが方眼からはみ出す`);
        const painted = cells.filter((c) => !given.has(c));
        if (!gradePaint(s, painted).ok) fail(id, `${tag}: 正しい続きが○にならない`);
      }
      if (gradePaint(s, []).ok) fail(id, `${tag}: 何もぬらずに○になる`);
      break;
    }
    case 'sketch': {
      if (s.expected.length === 0) fail(id, `${tag}: ひく線が無い`);
      const pts = [...s.expected, ...s.given].flatMap((g) => [g.a, g.b]);
      if (pts.some((p) => p.x < 0 || p.y < 0 || p.x > s.gw || p.y > s.gh || !Number.isInteger(p.x) || !Number.isInteger(p.y))) fail(id, `${tag}: 線が格子点に乗っていない／方眼からはみ出す`);
      if (!gradeSketch(s, s.expected).ok) fail(id, `${tag}: 正しい線が○にならない`);
      // 逆向き・2回に分けてかいても○
      const split = s.expected.flatMap((g) => {
        const dx = g.b.x - g.a.x, dy = g.b.y - g.a.y;
        if (Math.abs(dx) % 2 || Math.abs(dy) % 2 || (dx === 0 && dy === 0)) return [{ ...g, a: g.b, b: g.a }];
        const m = { x: g.a.x + dx / 2, y: g.a.y + dy / 2 };
        return [{ ...g, a: g.a, b: m }, { ...g, a: g.b, b: m }];
      });
      if (!gradeSketch(s, split).ok) fail(id, `${tag}: 分けてかいた正しい線が○にならない`);
      if (s.useDashed && s.expected.some((g) => g.dashed) && gradeSketch(s, s.expected.map((g) => ({ ...g, dashed: false }))).ok) fail(id, `${tag}: 点線を実線でかいても○になる`);
      break;
    }
    case 'dash': {
      if (s.answer.length !== 3) fail(id, `${tag}: 見えない辺が ${s.answer.length} 本`);
      if (!gradeDash(s, [...s.answer]).ok) fail(id, `${tag}: 正しい答えが○にならない`);
      break;
    }
    case 'point': {
      if (s.answer.x < 0 || s.answer.y < 0 || s.answer.x > s.w || s.answer.y > s.h) fail(id, `${tag}: 答えの点が方眼の外`);
      if (!gradePoint(s, s.answer).ok) fail(id, `${tag}: 正しい点が○にならない`);
      if (s.diagnose && s.diagnose(s.answer) !== null) fail(id, `${tag}: 正しい点で診断が反応する`);
      if (s.points.some((p) => p.x === s.answer.x && p.y === s.answer.y)) fail(id, `${tag}: 答えの点に ほかの点が ある`);
      break;
    }
  }
}

const levelIds = MODULES.flatMap((m) => m.levels.map((l) => l.id));
for (const id of levelIds) if (!GENERATORS[id]) fail(id, 'constants のレベルに ジェネレーターがない');
for (const id of Object.keys(GENERATORS)) if (!levelIds.includes(id)) fail(id, 'ジェネレーターに constants のレベルがない');

// 本番テスト＋テストに出ない項目（無限だけ）で、全レベルが実力の階段のどちらかに出る
const inTest = new Set(TEST_STEPS.filter((t) => t.points > 0).map((t) => t.skillId));
for (const id of levelIds) {
  const t = inTest.has(id), e = EXTRA_SKILLS.includes(id);
  if (!t && !e) fail(id, '本番テストにも EXTRA_SKILLS にも無い（実力の階段に出ない）');
  if (t && e) fail(id, '本番テストと EXTRA_SKILLS の両方にある');
}
for (const id of EXTRA_SKILLS) if (!levelIds.includes(id)) fail(id, 'EXTRA_SKILLS にあるがレベルに無い');
if (OMOTE_MAX !== 100 || URA_MAX !== 50) fail('test', `配点が 表${OMOTE_MAX}/裏${URA_MAX}（100/50のはず）`);
for (const t of TEST_STEPS) {
  if (!GENERATORS[t.skillId]) fail(t.skillId, '本番テストの設問にジェネレーターが無い');
  for (let i = 0; i < 200; i++) {
    let q: Question;
    try { q = t.gen(); } catch (e) { fail(`test${t.daimon}${t.sub ?? ''}`, `例外: ${(e as Error).message}`); break; }
    if (q.skillId !== t.skillId) fail(`test${t.daimon}${t.sub ?? ''}`, `skillId が ${q.skillId}（${t.skillId} のはず）`);
    q.steps.forEach((s, k) => checkStep(`test${t.daimon}${t.sub ?? ''}`, s, k));
  }
}

// 本番テストの辺を答える問い（大問3③④・8②）は組み立てる形（edges）で出る。ボス戦用の形にはえらぶ形が出る
for (const [d, sub] of [[3, '③'], [3, '④'], [8, '②']] as [number, string][]) {
  const t = TEST_STEPS.find((x) => x.daimon === d && x.sub === sub);
  if (!t) { fail('test', `大問${d}${sub} が無い`); continue; }
  for (let i = 0; i < 100; i++) {
    const q = t.gen();
    if (q.steps.length !== 1 || q.steps[0]!.kind !== 'edges') { fail(`test${d}${sub}`, '組み立てる形（edges）になっていない'); break; }
    if (toPickForm(q).steps[0]!.kind === 'edges') { fail(`test${d}${sub}`, 'ボス戦用の形にもどらない'); break; }
  }
}

const table: string[] = [];
for (const id of Object.keys(GENERATORS)) {
  const seen = new Set<string>();
  const pos = new Map<number, number>();
  let choiceN = 0;
  const N = trialsOf(id);
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    let q: Question;
    try { q = generate(id); } catch (e) { fail(id, `例外: ${(e as Error).message}`); break; }
    if (q.skillId !== id) fail(id, `skillId が ${q.skillId}`);
    if (!q.text || !q.summary || !q.q || !q.a || !q.title) fail(id, '文字が空');
    if (q.steps.length < 1) fail(id, 'ステップが無い');
    q.steps.forEach((s, k) => checkStep(id, s, k));
    for (const st of q.steps) {
      if (st.kind !== 'edges') continue;
      const f = q.figure;
      if (f?.type === 'cuboid' && !f.letters) fail(id, '辺を答える問いなのに、図に頂点の文字が出ていない');
      if (f?.type === 'net' && JSON.stringify(f.points?.map((p) => p.label)) !== JSON.stringify(st.letters)) fail(id, '展開図の点の文字と、組み立てる文字がちがう');
    }
    if (toPickForm(q).steps.some((st) => st.kind === 'edges')) fail(id, 'toPickForm のあとに edges が残る');
    seen.add(signature(q));
    for (const s of q.steps) if (s.kind === 'choice' && s.choices.length > 2) { choiceN++; pos.set(s.correct, (pos.get(s.correct) ?? 0) + 1); }
  }
  if (seen.size < MIN_VARIETY) fail(id, `バリエーションが ${seen.size} 通り（${MIN_VARIETY}通り未満）`);
  if (choiceN > 300) {
    const worst = Math.max(...pos.values());
    if (worst / choiceN > 0.45) fail(id, `正解の位置が かたよっている (${Math.round((100 * worst) / choiceN)}%)`);
  }
  table.push(`${id.padEnd(18)} ${String(seen.size).padStart(5)} 通り  ${((Date.now() - t0) / N).toFixed(1)}ms/問`);
}

console.log(table.join('\n'));
if (failures > 0) {
  console.error(`\n${failures} 件の問題があります`);
  process.exit(1);
}
console.log(`\n✓ ${Object.keys(GENERATORS).length} 項目: 問題なし`);
