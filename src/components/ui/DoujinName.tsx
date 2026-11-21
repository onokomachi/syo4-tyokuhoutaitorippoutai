/**
 * 「童神（どうじん）」の名前。「童」は小学校で習わない漢字なので、ふりがなをつける。
 * 背景テーマの名前とボス戦のボスの名前で共通に使う。文字だけが要る所（aria-label など）は DOUJIN_TEXT を使う。
 */
import React from 'react';

export const DOUJIN_TEXT = '童神（どうじん）';

export const DoujinName: React.FC = () => (
  <span className="inline-block whitespace-nowrap"><ruby>童<rt className="text-[0.5em] font-bold tracking-normal">どう</rt></ruby>神</span>
);
