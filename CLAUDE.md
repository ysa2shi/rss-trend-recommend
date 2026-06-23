# AI Trend Recommender Instructions

## Objective

Read a daily Markdown report under `trend`, evaluate each listed article with AI, and generate an output Markdown that keeps the same structure as the input while filling AI evaluation fields.

## Input and Output

- Input file: `YYYYMMDD.md` under `trend` (default location: `trend/YYYY/MM/YYYYMMDD.md`)
- Output file: `YYYYMMDD-ai-recommend.md` in the same directory as the input file

## AI Evaluation Function

- For each article, assign `score` (0-3), `category`, and `memo`.
- Evaluate `score` by technical relevance.
- `category` must be one of: `backend`, `frontend`, `infra`, `ai`, `architecture`, `devtools`, `other`.
- `memo` must be a concise Japanese summary in 2-3 sentences.
- Convert `score` to visual interest marks for output:
  - `3` -> `★★★`
  - `2` -> `★★`
  - `1` -> `★`
  - `0` -> `-`

## Required Output Style

- The output Markdown must keep the same section layout as the input Markdown.
- Keep headings, source sections, table structure, and entry order unchanged.
- In each "注目トピック" table, fill only these columns:
  - `興味度`: write visual marks (`★★★`, `★★`, `★`, `-`)
  - `カテゴリ`: write one allowed category
  - `メモ`: write a Japanese memo (2-3 sentences)
- Preserve all other existing columns as-is.
- Some source tables may omit metric columns when source values are empty; do not re-add omitted metric columns.

## Interest-based Organization, Filtering, and Categorization

- If user interest criteria are provided, prioritize them first.
- If not provided, prioritize `ai`, `backend`, `frontend`, `infra`, `architecture`, and `devtools`.
- Use `score >= 2` as the recommended threshold.
- `score <= 1` should remain in the table, but clearly reflect low relevance via score/category/memo.

## Step By Step

1. Select the target date. Use the user-specified date if provided; otherwise use the latest available `YYYYMMDD.md`.
2. Read the target file (`trend/.../YYYYMMDD.md`) and extract articles from each section's "全エントリー" list.
3. Remove duplicate URLs, then evaluate each article:
   - `score` (0-3):
     - 3: Directly relevant to core software engineering topics (AI, backend, frontend, infra, architecture, devtools)
     - 2: Indirectly relevant to tech trends or engineering culture
     - 1: General tech news
     - 0: Not relevant
   - `category`: one of `backend`, `frontend`, `infra`, `ai`, `architecture`, `devtools`, `other`
   - `memo`: Japanese summary in 2-3 sentences
4. Apply interest-based filtering:
   - Use explicit user interests first when available.
   - Otherwise, prioritize `ai`, `backend`, `frontend`, `infra`, `architecture`, `devtools`.
   - Reflect filtering intent through the `興味度` score (recommended: `>= 2`).
5. Generate output Markdown by copying the input format and writing AI results into `興味度`, `カテゴリ`, and `メモ` columns (`興味度` must use stars, not numeric values).
6. Save the final file as `YYYYMMDD-ai-recommend.md`.

## Output Markdown Format

Use the same format as the input file.

- Do not convert to a different summary layout (for example, no "Top Picks" only format).
- Update table rows directly so that the output remains easy to diff against the input.

Example of one updated row:

```md
| [Some Article](https://example.com) | 120 users | ★★★ | ai | LLMエージェント開発の実装知見が具体的に示されています。実運用で再現しやすい手順があり、優先度が高いです。 |
```

## Language Rules

- Write this instruction document in English.
- Generate the output Markdown content in Japanese.
- `memo` must always be Japanese (2-3 sentences).

## Execution Rules

- Do not add articles that are not present in the input file.
- Do not alter title or URL content except minimal normalization.
- Use only allowed `category` values.
- Do not delete existing sections or tables from the input format.
