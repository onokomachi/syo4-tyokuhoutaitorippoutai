/**
 * 練習モジュールの共通画面。レベルをえらぶ → 1問ずつ解く。「おまかせモード」は
 * 習熟度に合わせて、レベルが自動で上がる（learning-app-kit の適応難易度）。
 *
 * どのモジュールも、問題の作り方（lib/problems.ts）と解く画面（QuestionRound）は共通。
 * モジュールごとに変わるのは、レベルの一覧（constants.ts の MODULES）だけ。
 */
import React, { useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { AppShell } from '../shared/AppShell';
import { AdaptiveBar } from '../shared/AdaptiveBar';
import { QuestionRound } from '../shared/QuestionRound';
import { SetupScreen, LevelCard } from '../ui/primitives';
import type { ModuleMeta } from '../../constants';
import { generate } from '../../lib/problems';
import { useProgressStore } from '../../store/progressStore';
import { useAdaptive } from '../../lib/useAdaptive';

interface Props {
  module: ModuleMeta;
  onExit: () => void;
  /** 開くレベル（結果やふくしゅうから飛んできたとき） */
  startLevel?: string;
}

export const ModuleScreen: React.FC<Props> = ({ module, onExit, startLevel }) => {
  const [mode, setMode] = useState<'setup' | 'level' | 'auto'>(startLevel ? 'level' : 'setup');
  const [level, setLevel] = useState<string>(startLevel ?? module.levels[0]!.id);
  const [round, setRound] = useState(0);
  const getMasteryStreak = useProgressStore((s) => s.getMasteryStreak);
  const getTodaySkillCount = useProgressStore((s) => s.getTodaySkillCount);
  const levelIds = useMemo(() => module.levels.map((l) => l.id), [module]);
  // 記録の名前（skillId）はレベルIDそのもの。toSkillId は渡さない
  const adaptive = useAdaptive<string>(levelIds);

  const activeLevel = mode === 'auto' ? adaptive.level : level;
  const question = useMemo(() => (mode === 'setup' ? null : generate(activeLevel)), [mode, activeLevel, round]);

  if (mode === 'setup' || !question) {
    return (
      <SetupScreen title={module.title} subtitle={module.description} onBack={onExit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {module.levels.map((l) => (
            <LevelCard
              key={l.id}
              label={l.label}
              desc={l.desc}
              mastery={getMasteryStreak(l.id)}
              todayCount={getTodaySkillCount(l.id)}
              accentBorder={module.accentBorder}
              onClick={() => { setLevel(l.id); setRound((r) => r + 1); setMode('level'); }}
            />
          ))}
        </div>
        <button
          onClick={() => { setRound((r) => r + 1); setMode('auto'); }}
          className="w-full p-5 rounded-3xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-black text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <Wand2 size={22} /> おまかせモード（じどうで レベルアップ）
        </button>
      </SetupScreen>
    );
  }

  const meta = module.levels.find((l) => l.id === activeLevel);
  return (
    <AppShell title={module.title} subtitle={meta?.label} onBack={() => setMode('setup')}>
      <div className="flex flex-col h-full">
        {mode === 'auto' && (
          <AdaptiveBar index={adaptive.index} total={adaptive.total} leveledUp={adaptive.leveledUp} onClearLevelUp={adaptive.clearLevelUp} />
        )}
        <div className="flex-1 min-h-0">
          <QuestionRound
            key={`${activeLevel}-${round}`}
            question={question}
            onNext={() => setRound((r) => r + 1)}
            onResult={mode === 'auto' ? adaptive.onResult : undefined}
          />
        </div>
      </div>
    </AppShell>
  );
};
