# はこはこランド（小4 算数「直方体と立方体」）（syo4-tyokuhoutaitorippoutai）

学級ポータルの一部。種類: **math**／app_id: `rippoutai`。単元: 東京書籍 新しい算数4下「14. 直方体と立方体」。
設計の根拠（紙のテストとの対応表・紙との差・正解の出し方）は `docs/DESIGN.md`。

## このアプリだけのこと
- 問題は `src/lib/problems.ts`（31項目のジェネレーター）で作り、**練習・本番テスト・実力の階段・ボス戦のすべてが `QuestionRound` で解く**。
  答え方は問題の `steps` に並べる（num／choice／multi＝全部えらぶ／paint＝展開図のマスをぬる／sketch＝格子点を結んで線／dash＝見えない辺を点線に／point＝点をかく）。
  採点は `src/lib/grade.ts`。新しい項目は ①`constants.ts` の MODULES にレベルを足す ②`problems.ts` の `GENERATORS` に登録
  ③`testConfig.ts`（テストに出すなら）か `trialConfig.ts` の `EXTRA_SKILLS` に足す。
- **展開図・見取図の正解は `src/lib/solid.ts` で計算する（手で書いた対応表を使わない）。** 展開図は面＋つながりの木として持ち、
  箱を転がすのと同じ計算（`step`）で組み立てる。重なる点・辺・向かい合う面、展開図の続きの正しいぬり方（`completions`）はここから出す。
- `npm run verify`（`scripts/verify-problems.ts`）が、形の計算そのもの（6マスの形35種のうち展開図11種）・正しい作図が○になること・
  正答で誤答診断が反応しないこと・ヒント3段・各レベル20通り以上・配点（表100／裏50）を止める。
- **記録の名前（skillId）＝レベルID。** `kousei-*` `heiko-*` `tenkai-*` `mitori-*` `ichi-*` `katsuyo-*` `eh-*`（＋ `mock-*` `boss-*`）。名前を変えたら学級ポータルのカタログも作り直す。
- 本番テストは紙のテスト（新学社 4年東 下巻）と同じ大問・配点。答えを1つ入れる問題は「2回まちがえたら×で次へ」、複数ステップは「わからない」で降りる。
- 学級ポータルへの登録（kit のカタログ `rippoutai`・`apps` の1行・Vercel の環境変数）はまだ。カタログは
  `npm run catalog > ../learning-app-kit/src/catalog/rippoutai.ts` で作る（誤概念は `scripts/export-catalog.ts` に手で書く）。
- 共通ファイル（`useAdaptive.ts` など）はここで直さない。

## 確かめ方
- `npm run check`（学級ポータルのルール点検・型チェック・問題の機械検査・ビルド）
- 共通ファイルを kit の版にそろえる: `npx learning-app-kit-platform fix`
- 画面の確認は `VITE_E2E=1 npm run dev` で開くと、いま出している問題が `window.__rippoutaiQ` に出る（自動テスト用。本番ビルドには入らない）。
  作図の部品には `data-testid`（`cell-x-y` `gp-x-y` `edge-AB` `pt-x-y` `multi-i` `submit-draw`）が付いている。

<!-- platform:begin（learning-app-kit が配る。手で書きかえない。直すときは kit の platform/CLAUDE.common.md） -->
## 学級ポータル共通のルール（learning-app-kit が配る。ここは手で書きかえない）

このリポジトリは、複数のアプリがつながった1つの仕組み（学級ポータル）の一部です。
1つのアプリだけを見て直すと、ほかのアプリ・先生用画面（PRISM）・データベースとずれます。

- **構成**: `learning-app-kit`（共通部品・記録の送信・カタログ・実力の階段）／単元アプリ（算数・国語）／
  `class-portal-teacher`（PRISM・先生用）／`class-portal-kids`（子ども用ハブ）／Supabase `gakkyu-portal`／
  `onokomachi-master-DB`（知識集）。
- **始めと終わり**: 作業の前に kb スキルで関係する知見を引く。直したこと・分かったことは最後に kb save で残す。
- **共通ファイルは、このリポジトリで直さない。** どれが共通ファイルかは `npm run platform` が教える。
  直すときは learning-app-kit の `platform/families/<種類>/files/` を直して kit の版を上げ、
  各アプリで kit を上げてから `npx learning-app-kit-platform fix` で配る（1つのアプリだけ直すと、直しが届かない）。
- **記録の名前（skillId）はカタログの skill_id と同じ文字列にする。** レベルIDがすでに `compare-basic` なら、
  前に何かを足さない。問題・レベルを足したり名前を変えたりしたら、カタログを作り直して kit に入れる（portal-connect スキル）。
- **送る記録の形・データベースの表・PRISM の画面に関わる変更**は、関係するリポジトリを全部つないだセッションで行う。
  単体のセッションで気づいたら、直さずに PR とユーザーへの報告に「全体セッションで直すこと」として書く。
- **kit はコミットのSHAで固定している。** 上げるときは `npx learning-app-kit-platform update` → `npm run check`。
- **新しいアプリは、作りはじめに `npx learning-app-kit-platform init <種類>`**（math / kokugo / portal / standalone）。
  CLAUDE.md・共通ファイル・CI・build 前の点検がそろう。そのあと CLAUDE.md の上の段にアプリだけのことを書く。
- 子どもの氏名は扱わない（出席番号だけ）。APIキー・トークン・パスワードはファイルにも知識集にも書かない。
- **終わる前に `npm run check` を通す**（このルールの点検 `npm run platform` も入っている）。
- PR の本文に「ほかのアプリ・PRISM・データベースへの影響」を1行書く（無ければ「なし」）。
- 毎週月曜の朝、各アプリの CI が kit を最新に上げ、`npm run check` が通れば main に自動で反映する（Vercel が本番に出す。持ち主の操作は要らない）。
  失敗のメールが来たら（kit の変更でアプリが通らない／CI の設定が変わる更新）、全体セッションで直す。
  kit の変更は、全アプリに月曜の朝いっせいに届く。kit の PR では「ほかのアプリへの影響」を必ず書く。
- Vercel の build の前にもこの点検が走る（`prebuild`）。ずれたままでは本番に出ない。
<!-- platform:end -->
