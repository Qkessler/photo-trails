# PROTOTYPE — Photos on Trails UI Variants

**Question:** What should the map + photo viewer look like?

Three radically different layouts, switchable via `?variant=A|B|C` and arrow keys.

## Run

```
cd prototype && npm run dev
```

## Variants

| Key | Name | Description |
|-----|------|-------------|
| A | Full-bleed map | Map fills the entire screen. Activity info overlays the top. Photos appear as circular thumbnail markers directly on the route. Tap to open lightbox. |
| B | Split panel | Map on the left, scrollable photo list on the right sidebar. Map uses minimal dot markers. Sidebar shows timeline of photos with metadata. Click either to open lightbox. |
| C | Film strip | Map fills most of the screen. Dark horizontal filmstrip at the bottom with scrollable thumbnails. Hovering a thumbnail pans the map to that location. Title in a frosted-glass card. |

## What to look for

- Which layout makes the route-photo relationship most obvious?
- Does seeing thumbnails directly on the map (A) or in a list (B) or in a strip (C) feel more natural?
- How does the cluster badge (photos taken at the same spot) work in each layout?
- Do you want metadata (time, caption) visible without clicking?

## Verdict

_(Fill in after evaluating — which variant wins, or which pieces to steal from each.)_
