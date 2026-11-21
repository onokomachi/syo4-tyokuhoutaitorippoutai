/**
 * バッジ獲得率に応じて解放される「特別なデザイン（テーマ）」の定義。
 * つみき・おもちゃの世界観（2026-11-21）：25%→極光／50%→つみきの空／75%→おもちゃの雲／100%→童神（どうじん）。
 * ノーマル（light）とマトリックス（dark）は最初から使える。
 * テーマの内部ID（light/dark/aurora/sakura/inferno/tenkuu）は保存データに入っているので変えない。
 * 表示名と見た目だけを入れかえた: sakura＝つみきの空（プログラムで描く背景）、inferno＝おもちゃの雲（動画の背景）、tenkuu＝童神（ボス戦の動画の背景）。
 * ボス戦は inferno（おもちゃの雲）の解放で挑戦できる。
 */
import { Theme } from '../store/settingsStore';

export interface ThemeUnlock {
  /** バッジ獲得率がこの値以上で解放（0..1）。未指定＝最初から解放。 */
  ratio?: number;
  /** 解放条件の表示（例: 'バッジ 50%'）。 */
  label?: string;
}

export const THEME_UNLOCK: Record<Theme, ThemeUnlock> = {
  light: {},
  dark: {},
  aurora: { ratio: 0.25, label: 'バッジ 25%' },
  sakura: { ratio: 0.5, label: 'バッジ 50%' },
  inferno: { ratio: 0.75, label: 'バッジ 75%' },
  tenkuu: { ratio: 1.0, label: 'バッジ 100%' },
};

/** そのテーマが現在の獲得率で解放されているか。 */
export function isThemeUnlocked(theme: Theme, ratio: number): boolean {
  const req = THEME_UNLOCK[theme]?.ratio;
  if (req == null) return true;
  // 浮動小数の誤差を吸収して 100% 到達を確実に判定する
  return ratio >= req - 1e-9;
}
