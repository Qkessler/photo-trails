# Photos on Trails

## Glossary

- **Activity** — a single hike or run, represented by one GPX file. The atomic unit of the system.
- **Route** — the GPS path recorded during an Activity, parsed from the GPX file as a sequence of (lat, lng, timestamp) trackpoints.
- **Placed Photo** — a photo that has been assigned a position on the Route, either via its own GPS coordinates or timestamp interpolation.
- **Photo Cluster** — a group of Placed Photos within a short time window (e.g., 30 seconds). Displayed as a single marker with a count badge. Produced by the Clusterer, not the Matcher.
- **Hero Photo** — the user-selected representative photo for a Cluster, shown on the map marker. Defaults to the first photo in the cluster.
- **Unplaced Photo** — a photo that has neither GPS coordinates nor a timestamp that can be correlated to the Route. Excluded from the map unless manually pinned.
- **Edge Photo** — a photo taken within the buffer window (±10 minutes) outside the Route's time range. Snapped to the nearest route endpoint.
- **Filmstrip** — a dark horizontal strip at the bottom of the map showing photo thumbnails in chronological order. Hover highlights the corresponding map marker; click opens a lightbox.
- **Lightbox** — full-screen overlay showing a display-resolution photo. Triggered by clicking any photo representation (filmstrip thumbnail or map marker).
- **Shared View** — a self-contained static page (HTML + photos + route data) that renders the Activity map. Read-only, hostable on any static site.
- **Editor View** — the local web app interface. Same rendering as Shared View plus editing controls (deselect photos, pick hero, etc.). Used to curate before publishing.
