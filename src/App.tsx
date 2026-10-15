/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hub } from './components/Hub';
import { ModuleScreen } from './components/modules/ModuleScreen';
import { MockTestModule } from './components/modules/MockTestModule';
import { TrialModule } from './components/modules/TrialModule';
import { BossBattleModule } from './components/modules/BossBattleModule';
import { LogView } from './components/LogView';
import { DebugUnlock } from './components/DebugUnlock';
import { ModuleId, skillToModuleId } from './store/progressStore';
import { MODULES } from './constants';
import { useApplySettings } from './lib/useApplySettings';
import { useSettingsStore } from './store/settingsStore';
import { MatrixRain } from './components/ui/MatrixRain';
import { AuroraRain } from './components/ui/AuroraRain';
import { SakuraRain } from './components/ui/SakuraRain';
import { InfernoRain } from './components/ui/InfernoRain';
import { TenkuuRain } from './components/ui/TenkuuRain';

type View = { kind: 'HUB' } | { kind: 'LOG' } | { kind: 'TEST' } | { kind: 'TRIAL' } | { kind: 'BOSS' } | { kind: 'MODULE'; id: ModuleId; level?: string };

export default function App() {
  const [view, setView] = useState<View>({ kind: 'HUB' });
  const theme = useSettingsStore((s) => s.theme);
  useApplySettings();

  const goHub = () => setView({ kind: 'HUB' });

  const renderModule = (id: ModuleId, level?: string) => {
    const module = MODULES.find((m) => m.id === id) ?? MODULES[0]!;
    // 結果の「れんしゅうする」から来たら、その項目のレベルを開く
    return <ModuleScreen key={`${module.id}-${level ?? ''}`} module={module} startLevel={level} onExit={goHub} />;
  };

  /** 「れんしゅうする」: 記録の名前（skillId）から、モジュールとレベルを開く */
  const practice = (skillId: string) => {
    const id = skillToModuleId(skillId);
    if (id && id !== 'mock-test' && id !== 'boss-battle') setView({ kind: 'MODULE', id, level: skillId });
  };

  return (
    <div className="w-full h-screen overflow-hidden select-none bg-bg">
      {/* テーマ別の動く背景（各コンポーネントが自分のテーマ以外では何も描画しない） */}
      <MatrixRain />
      <AuroraRain />
      <SakuraRain />
      <InfernoRain />
      <TenkuuRain />

      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="wait">
          {view.kind === 'HUB' && (
            <motion.div key="hub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
              <Hub
                onSelectModule={(id) => setView({ kind: 'MODULE', id })}
                onOpenLog={() => setView({ kind: 'LOG' })}
                onStartTest={() => setView({ kind: 'TEST' })}
                onStartTrial={() => setView({ kind: 'TRIAL' })}
                onStartBoss={() => setView({ kind: 'BOSS' })}
              />
            </motion.div>
          )}

          {view.kind === 'TEST' && (
            <motion.div key="test" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
              {/* テストのあと、まちがえた項目の練習へ直接飛べるようにする */}
              <MockTestModule onExit={goHub} onPractice={practice} />
            </motion.div>
          )}
          {view.kind === 'TRIAL' && (
            <motion.div key="trial" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
              {/* テストのあと、まちがえた項目の練習へ直接飛べるようにする */}
              <TrialModule onExit={goHub} onPractice={practice} />
            </motion.div>
          )}

          {view.kind === 'BOSS' && (
            <motion.div key="boss" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
              <BossBattleModule onExit={goHub} />
            </motion.div>
          )}

          {view.kind === 'MODULE' && (
            <motion.div key={`module-${view.id}-${view.level ?? ''}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
              {renderModule(view.id, view.level)}
            </motion.div>
          )}

          {view.kind === 'LOG' && (
            <motion.div key="log" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full h-full">
              <LogView onBack={goHub} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 背景のドット装飾（ライトテーマのみ。ダーク=レイン / クリーム=和紙テクスチャと干渉させない） */}
      {theme === 'light' && (
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1] overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(#1e293b 1.5px, transparent 1.5px)`, backgroundSize: '40px 40px' }} />
        </div>
      )}

      {/* 画面左下のクレジット表記（ごく小さく。3回タップで隠しコマンド） */}
      <DebugUnlock />
    </div>
  );
}
