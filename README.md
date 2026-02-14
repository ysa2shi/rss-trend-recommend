# rss-trend-recommend

技術系の複数ソースから記事を収集し、日次のトレンドレポート（Markdown）を自動生成するプロジェクトです。GitHub Actionsで完全自動運用します。

## 目的

- 技術トレンドの継続的な収集
- 発信用ネタの発掘
- エンジニアリング動向の把握

## アーキテクチャ

```
GitHub Actions（1日1回 / JST 09:00）
        ↓
Node.js (TypeScript)
        ↓
RSS収集・整形
        ↓
trend/YYYY/MM/YYYYMMDD.md 生成
        ↓
PR生成 → Auto-merge
```

## 主な機能

- RSS自動取得（`feeds.yaml` による管理）
- Markdownレポート生成（全記事出力）
- GitHub Actionsによる自動実行とPR作成
- RSS取得のキャッシュとリトライ対応
- 失敗しても最終的にレポートが生成されるフェイルオープン設計

## AI評価運用について

- AI評価は、リポジトリ直下の `AGENTS.md` をAIエージェントに読み込ませて実行します。
- 入力は `trend/YYYY/MM/YYYYMMDD.md`、出力は同じディレクトリの `YYYYMMDD-ai-recommend.md` です。
- 出力は入力Markdownのフォーマットを維持し、`注目トピック` テーブルの `興味度 | カテゴリ | メモ` をAI評価で埋めます（興味度は `★★★ / ★★ / ★ / -`）。
- 生成時に値が全件 `-` になるメトリクス列（例: いいね数 / ストック数 / スコア / ポイント / 投票数 / コメント数）は列ごと省略します。
- AI評価の出力Markdownは日本語で生成します（`memo` も日本語）。

## 出力形式

- 元レポート: `trend/YYYY/MM/YYYYMMDD.md`
- AIレコメンド: `trend/YYYY/MM/YYYYMMDD-ai-recommend.md`

例:

```
trend/2026/02/20260212.md
trend/2026/02/20260212-ai-recommend.md
```

## AIエージェント実行手順（Step by Step）

1. 日次レポートを生成する（または対象日の `trend/YYYY/MM/YYYYMMDD.md` があることを確認する）。
2. AIエージェントに、このリポジトリの `AGENTS.md` を読み込ませる。
3. 下記テンプレートをコピーし、対象日のパスに置き換えて送信する。
4. 生成された `trend/YYYY/MM/YYYYMMDD-ai-recommend.md` が入力と同じ構造で、`興味度 | カテゴリ | メモ` が埋まっていることを確認する。
5. 問題なければコミットして運用に反映する。

## コピペ用AIプロンプトテンプレート

対象日: `YYYYMMDD` の部分は実行対象の日付に置き換えてください。

```md
このリポジトリの AGENTS.md の指示に厳密に従って、以下を step by step で実行してください。

対象日: `YYYYMMDD`
入力ファイル: trend/YYYY/MM/YYYYMMDD.md
出力ファイル: trend/YYYY/MM/YYYYMMDD-ai-recommend.md
興味条件（任意）: ai, backend, frontend, infra, architecture, devtools

手順:
1. 入力ファイルを読み込む。
2. 入力Markdownの見出し・セクション・テーブル構造をそのまま維持する。
3. 各「注目トピック」テーブル行について、`興味度 | カテゴリ | メモ` を埋める。
4. `興味度` は score（0-3）を `★★★ / ★★ / ★ / -` に変換して記載し、`カテゴリ` は許可カテゴリから選び、`メモ` は日本語2-3文で記載する。
5. タイトル、URL、既存列（存在する場合のブクマ数/いいね数/スコア等）は変更しない。
6. 出力Markdownを日本語で作成し、`trend/YYYY/MM/YYYYMMDD-ai-recommend.md` に保存する。
7. 最後に、出力ファイルパスだけ報告する。
```

## 対象ソース

### 🇯🇵 日本系

- はてブIT
- Zenn
- Qiita
- TechFeed（カテゴリ複数）

### 🌍 海外

- Hacker News
- Reddit r/programming

## 使い方（ローカル実行）

```bash
npm install
FETCH_FEEDS=1 npm run start
```

## 環境変数

- `HIGHLIGHT_LIMIT`: 注目トピックの表示件数（既定 `10`）
- `FETCH_FEEDS`: RSS取得を有効化するスイッチ（`1`で有効。`0`/未指定で無効）
- `FEED_LIMIT`: 各RSSから取得する件数（既定 `10`）
- `FEED_CACHE_MAX_AGE_MINUTES`: RSS取得キャッシュの保持時間（分）

## GitHub Actions

- 1日1回、JST 09:00に実行
- 生成結果はPRとして作成され、Auto-mergeされる

---

個人向けのトレンド収集AIエージェントとして、低コスト・サーバーレスで運用できることを重視しています。
