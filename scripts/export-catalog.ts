/**
 * 学級ポータル用のカタログを書き出す（npm run catalog）。
 * 出力を learning-app-kit の src/catalog/rippoutai.ts に置く（kit の CATALOGS への登録も要る）。
 * answer_kind は段の答え方から決める（1種類だけ＝その種類、まざる＝steps）。
 * 誤概念は docs/DESIGN.md の「誤概念」の表と同じもの。
 */
import { buildCatalog, renderCatalogModule } from './gen-catalog.lib';
import { MODULES, ALL_LEVEL_IDS } from '../src/constants';
import { generate } from '../src/lib/problems';

function kindOf(id: string): string {
  const kinds = new Set(generate(id).steps.map((s) => s.kind));
  return kinds.size > 1 ? 'steps' : [...kinds][0]!;
}

const catalog = buildCatalog({
  appId: 'rippoutai',
  title: '直方体と立方体',
  subject: '算数',
  grade: 4,
  url: 'https://syo4-tyokuhoutaitorippoutai.vercel.app',
  moduleLevels: Object.fromEntries(MODULES.map((m) => [m.id, m.levels])),
  moduleTitles: Object.fromEntries(MODULES.map((m) => [m.id, m.title])),
  allSkillIds: ALL_LEVEL_IDS,
  generate: (id) => ({ answer: { kind: kindOf(id) } }),
});

catalog.misconceptions = [
  { code: '誤概念①', label: '見取図で 見えて いる 面・辺・頂点だけを 数える', skills: ['kousei-cube', 'kousei-higo', 'mitori-count', 'eh-edges'] },
  { code: '誤概念②', label: '直方体の 向かい合う 面が 同じ形だと 気づかない（同じ形の面を1つと数える）', skills: ['kousei-cuboid', 'kousei-paper', 'eh-face'] },
  { code: '誤概念③', label: '見取図で 見えない 辺を 実線で かく／点線に しない', skills: ['mitori-hidden', 'mitori-draw', 'eh-hidden'] },
  { code: '誤概念④', label: '正方形が 6つ つながれば 立方体の 展開図に なると思う', skills: ['tenkai-cubeok', 'tenkai-cube', 'eh-net'] },
  { code: '誤概念⑤', label: '組み立てたとき 重なる 点を、同じ辺の となりの点と 思う', skills: ['tenkai-point', 'tenkai-edge', 'eh-overlap'] },
  { code: '誤概念⑥', label: '平行な 辺を 同じ面の上だけで さがす（はなれた辺を見落とす）', skills: ['heiko-edge', 'heiko-faceedge', 'eh-parallel'] },
  { code: '誤概念⑦', label: '交わらない（ねじれの位置の）辺を 垂直と 思う', skills: ['heiko-edgeperp', 'eh-perp'] },
  { code: '誤概念⑧', label: '位置の表し方で 横と たての 順を 逆に する', skills: ['ichi-read', 'ichi-plot', 'ichi-space', 'eh-ichi'] },
];


process.stdout.write(renderCatalogModule(catalog));
