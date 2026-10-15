import type { ModuleId } from './store/progressStore';

/**
 * 「はこはこランド」のモジュール一覧。
 * 単元「14. 直方体と立方体」（小4・東京書籍 新しい算数4下）で身につける知識・技能・考え方を段階的に網羅する。
 *
 * レベルID ＝ 学習の記録の名前（skillId）。学級ポータルのカタログの skill_id と同じ文字列にする。
 * 前にモジュール名を足したり、名前を変えたりしない（変えたらカタログを作り直す）。
 */
export interface LevelMeta {
  id: string;
  label: string;
  desc: string;
}

export interface ModuleMeta {
  id: ModuleId;
  title: string;
  description: string;
  /** lucide-react のアイコン名 */
  icon: string;
  /** Tailwind の色トークン（カードのアクセント） */
  accent: string;
  accentBorder: string;
  status: 'ready' | 'soon';
  levels: LevelMeta[];
}

export const MODULES: ModuleMeta[] = [
  {
    id: 'kousei',
    title: '面・辺・頂点',
    description: '直方体と 立方体の 形を しらべよう',
    icon: 'Box',
    accent: 'cyan',
    accentBorder: 'hover:border-cyan-400',
    status: 'ready',
    levels: [
      { id: 'kousei-sort', label: '① 直方体？ 立方体？', desc: '面の 形で 見分けよう' },
      { id: 'kousei-cube', label: '② 立方体の 面・辺・頂点', desc: '面の 形と 数を 数えよう' },
      { id: 'kousei-cuboid', label: '③ 直方体の 面と 辺', desc: '同じ 形の 面・等しい 辺' },
      { id: 'kousei-higo', label: '④ ひごと ねん土玉', desc: '辺と 頂点で 形を 作る' },
      { id: 'kousei-paper', label: '⑤ あつ紙で 箱を 作る', desc: 'どの 面を 何まい？' },
    ],
  },
  {
    id: 'heiko',
    title: '平行と 垂直',
    description: '面と 面・辺と 辺・面と 辺の かんけい',
    icon: 'Layers',
    accent: 'blue',
    accentBorder: 'hover:border-blue-400',
    status: 'ready',
    levels: [
      { id: 'heiko-face', label: '① 面と 面', desc: '平行な 面・垂直な 面' },
      { id: 'heiko-edge', label: '② 辺と 辺の 平行', desc: '平行な 辺を 全部 さがそう' },
      { id: 'heiko-edgeperp', label: '③ 辺と 辺の 垂直', desc: '直角に 交わる 辺' },
      { id: 'heiko-faceedge', label: '④ 面と 辺', desc: '面に 垂直な 辺・平行な 辺' },
    ],
  },
  {
    id: 'tenkai',
    title: '展開図',
    description: 'マスを ぬって 展開図を かこう',
    icon: 'Scissors',
    accent: 'amber',
    accentBorder: 'hover:border-amber-400',
    status: 'ready',
    levels: [
      { id: 'tenkai-cubeok', label: '① 立方体に なる？', desc: '組み立てを 考えよう' },
      { id: 'tenkai-cube', label: '② 立方体の 展開図を かく', desc: 'たりない 面を 足そう' },
      { id: 'tenkai-cuboid', label: '③ 直方体の 展開図を かく', desc: '辺の 長さを そろえて' },
      { id: 'tenkai-face', label: '④ 平行な 面・垂直な 面', desc: '組み立てると 向かい合う 面は？' },
      { id: 'tenkai-point', label: '⑤ 重なる 点', desc: '組み立てると どの 点と 重なる？' },
      { id: 'tenkai-edge', label: '⑥ 重なる 辺', desc: '組み立てると どの 辺と 重なる？' },
    ],
  },
  {
    id: 'mitori',
    title: '見取図',
    description: '見えない 辺は 点線で かこう',
    icon: 'Eye',
    accent: 'emerald',
    accentBorder: 'hover:border-emerald-400',
    status: 'ready',
    levels: [
      { id: 'mitori-count', label: '① 見取図を 読む', desc: '見える 辺・見えない 辺' },
      { id: 'mitori-hidden', label: '② 見えない 辺を 点線に', desc: 'タップして 点線に しよう' },
      { id: 'mitori-draw', label: '③ 見取図の 続きを かく', desc: '点を むすんで 辺を かこう' },
    ],
  },
  {
    id: 'ichi',
    title: '位置の 表し方',
    description: '横・たて・高さで 位置を 表そう',
    icon: 'MapPin',
    accent: 'violet',
    accentBorder: 'hover:border-violet-400',
    status: 'ready',
    levels: [
      { id: 'ichi-read', label: '① 点の 位置を 表す', desc: '（横 ○cm、たて ○cm）' },
      { id: 'ichi-plot', label: '② 点を かく', desc: '位置から 点を かこう' },
      { id: 'ichi-space', label: '③ 空間の 位置', desc: '（横・たて・高さ）で 表そう' },
    ],
  },
  {
    id: 'katsuyo',
    title: 'いかそう',
    description: 'プレゼントの 箱に リボンを かけよう',
    icon: 'Gift',
    accent: 'teal',
    accentBorder: 'hover:border-teal-400',
    status: 'ready',
    levels: [
      { id: 'katsuyo-ribbon', label: '① リボンの 長さ', desc: '何cm あれば いい？' },
      { id: 'katsuyo-ribbonnet', label: '② リボンの 線を 展開図に', desc: '真ん中を 通る 直線' },
    ],
  },
  {
    id: 'error',
    title: 'エラーハンター',
    description: 'Aさんの まちがいを 見つけて なおそう',
    icon: 'Search',
    accent: 'rose',
    accentBorder: 'hover:border-rose-400',
    status: 'ready',
    levels: [
      { id: 'eh-edges', label: '① 見えて いる ものだけ 数えた', desc: '見えない 辺や 頂点も ある' },
      { id: 'eh-face', label: '② 同じ形の 面を 1つと した', desc: '向かい合う 面も 同じ 形' },
      { id: 'eh-hidden', label: '③ 見えない 辺を 実線で かいた', desc: '見取図の 約束' },
      { id: 'eh-net', label: '④ 6つ つながれば 展開図？', desc: '組み立てて たしかめよう' },
      { id: 'eh-overlap', label: '⑤ となりの 点が 重なる？', desc: '重なる 点の さがし方' },
      { id: 'eh-parallel', label: '⑥ 平行な 辺を 1本だけ', desc: 'はなれた 辺も 平行' },
      { id: 'eh-perp', label: '⑦ 交わらない 辺を 垂直に', desc: '垂直は 交わる 辺' },
      { id: 'eh-ichi', label: '⑧ 横と たてを 逆に した', desc: '横が 先、たてが あと' },
    ],
  },
];

export const ALL_LEVEL_IDS: string[] = MODULES.flatMap((m) => m.levels.map((l) => l.id));

export function levelMeta(id: string): LevelMeta | undefined {
  for (const m of MODULES) {
    const l = m.levels.find((x) => x.id === id);
    if (l) return l;
  }
  return undefined;
}
