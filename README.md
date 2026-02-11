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

## AI評価について

- **AIによる評価機能は未実装**です。
- 実装できると、`AGENTS.md`（Markdown形式・内容は任意）を読み込み、ユーザーの興味に沿って記事を整理します。
- 具体的には、**興味のあるものを抽出・フィルタリング**し、**カテゴリを割り振る**処理が可能になります。

## 出力形式

`trend/YYYY/MM/YYYYMMDD.md`

例:

```
trend/2026/02/20260212.md
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
