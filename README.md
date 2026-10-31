# TropiVoxel Studio

An interactive urban design prototype for Singapore: compare neighbourhood layouts, load real Bishan context, edit individual buildings and explore concept-stage comfort, sun and wind estimates.

The repository contains the editable React/TypeScript source in **tropivoxel-sg/** and the standalone four-file frontend in **submission/**. GitHub Pages publishes **submission/** through the Publish TropiVoxel workflow. The public frontend uses manual weather and an embedded real OSM sample; live Google Weather/Solar and other OSM location requests require the local server.

Double-click **Start Studio.cmd** to launch the local English-language studio. The original **启动工作室.bat** calls the same launcher.

The launcher checks the runtime, starts the page and API, then opens http://127.0.0.1:3000/ . Keep its console window open. Startup errors are shown in the console and saved in **artifacts/startup.log**.

Compare parallel slab blocks, point towers and courtyard blocks on a shared 200 × 200 m site. Change storeys, spacing, individual-building orientation, void-deck porosity, canopy trees and patterned green cover. Editable blocks, references, JSON import/export and optional Google Weather/Solar connections are included.

See [tropivoxel-sg/README.md](tropivoxel-sg/README.md) for parameter definitions, model limits and development commands.

Google credentials stay in the ignored local .env.local. Local legacy experiments, generated archives, editor metadata and dependency directories are excluded from the published repository. The server reads GOOGLE_MAPS_API_KEY; never use a VITE_ prefix for a secret.

The latest update adds real OSM context, per-building editing and larger configurable new-building boxes. For the minimal English submission use **submission/**, which contains exactly index.html, styles.css, app.js and BRIEF.Md. The development folders remain separate. See the brief for optional live API limitations and validation.

## Development and verification

With Node.js 24 installed:

```sh
cd tropivoxel-sg
npm ci
npm run dev
```

Use `npm run typecheck`, `npm test` and `npm run build` to verify the source. Use `npm run build:submission` to regenerate the four-file site before committing a frontend update. Push to main to publish the updated submission directory automatically.

## Data and model scope

The Bishan sample is derived from OpenStreetMap and distributed under ODbL, with visible attribution and further notices in [BRIEF.Md](submission/BRIEF.Md). Building heights may be estimated. Thermal comfort uses a linear UTCI proxy and wind uses heuristic wakes; results support concept comparison and are not validated CFD or environmental predictions.
