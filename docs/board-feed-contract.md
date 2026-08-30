# Board feed contract

Every sub-site at isui.ren may push a content feed for the Bahnhof
board to index and display. The feed is a JSON file placed at
`deploy/<slug>/posts.json` by the sub-site's own CI pipeline.

## Format

Top-level array of items:

```json
[
  {
    "title": "Hello, Quartz",
    "url": "/Blog/hello",
    "desc": "Optional one-line teaser or subtitle"
  }
]
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | yes | Display title of the item. Appears in the NACH column. |
| `url` | string | yes | Relative URL from the site root, e.g. `/Blog/hello`. The board prepends the correct host. |
| `desc` | string | no | One-line teaser or subtitle. If present, appears in the BEMERKUNG column on the board. Omit for sites that have no description. |

### Constraints

- The file must be valid JSON and serve with `Content-Type: application/json`.
- `title` must be present and non-empty for every item.
- `url` must be a path starting with `/` (site-root-relative). The board
  constructs the full URL from the origin.
- `desc` is purely advisory. The board is free to truncate, elide, or
  ignore it depending on layout constraints.
- The array may be empty (`[]`). The board treats an empty feed as "no
  content to display" — it does not hide the destination itself.

## Discovery

The board discovers the feed at **runtime** (not build time), because
the feed contents change with every sub-site deploy. The board fetches
`/<slug>/posts.json` for each known destination once and caches the
result per session.

Build-time discovery (the `destinations.generated.ts` mechanism) tells
the board which slugs exist. The feed is an additional layer on top:
it populates the search index and the BEMERKUNG column.

## Example: Blog

The Blog repo's CI pipeline (`Blog/.github/workflows/deploy.yml`):

1. Build its Quartz output → `deploy/Blog/`
2. Run `scripts/gen-posts.mjs` which reads the built HTML and writes
   `deploy/Blog/posts.json`
3. The Bahnhof board, at runtime, fetches `/Blog/posts.json` and indexes
   the items

## Versioning

This is v1 of the contract. Additions to the item schema are backward
compatible: a board that understands v1 must ignore unknown fields.
Removals or renames require a new contract version.