# TropiVoxel Studio

An editable neighbourhood microclimate experiment. The UI is entirely English.

## Start on Windows

Double-click **Start Studio.cmd** in the workspace root. The existing **启动工作室.bat** is a compatibility shortcut to the same launcher.

The launcher finds the installed Codex Node runtime first, otherwise Node on PATH. Supported runtimes are Node 20.19+, 22.12+, or 24+ LTS (not Node 21). It starts the local page and server API, checks readiness, then opens your default browser at http://127.0.0.1:3000/ .

**Keep the console window open.** Ctrl+C stops the studio. If startup fails, the console stays visible and diagnostics are written to **artifacts/startup.log**. A compatible studio already on port 3000 is reused; other applications on that port are never killed.

Startup self-test from the workspace root:

~~~powershell
cmd /c "Start Studio.cmd" --check
~~~

For development with a compatible Node runtime:

~~~powershell
cd tropivoxel-sg
npm install
npm run dev
~~~

Dependencies are already installed on this machine. A fresh checkout needs internet for installation.

## Layout typology

All three layouts use the same **200 × 200 m** site and **2 m** simulation grid. Dimensions below are exact metre-based rotated rectangles, shared by rendering and rasterisation.

| Typology | Geometry | Default organisation |
| --- | --- | --- |
| Parallel slab blocks | 6 × 52 × 14 m | Two columns, three rows |
| Point towers | 6 × 23 × 23 m | Two columns, three rows |
| Courtyard blocks | 4 × 64 × 15 m | One block on each side of a shared centre |

Every building is 6–30 storeys, **3 m per storey**; default 14 storeys = 42 m. Every layout or parameter change regenerates geometry and planting and recalculates shade, sky view, radiant temperature and wind. The selected date, hour and weather source stay unchanged. Manual scene edits are replaced when a layout control regenerates the scene.

### Parameters

- **Block spacing (32–58 m):** a layout generation parameter, not a uniform facade gap. For slabs and towers, north–south row centres are s apart; east–west column centres are 1.68s apart. For the courtyard, each building centre is s from the site centre, and opposing centres are 2s apart.
- **Block orientation (−90° to 90°):** rotates every footprint around its own centre. Building centre positions do not rotate around the site. The courtyard starts at 0°, 0°, 90°, 90° on its four sides. Square tower occupancy is unchanged by a 90° turn.
- **Void-deck porosity (0–80%):** uniform across all generated buildings; reduces the simplified model's wake obstruction.
- **Canopy trees (0–80 requested):** placed in a fixed candidate order, excluding buildings, crown clearance and the central paths. If candidates are exhausted, the actual placed count is lower. Locations are re-filtered when layout geometry changes, so equal tree counts do not mean identical locations across typologies.
- **Green ground cover (0–100% target):** threshold for a fixed planting pattern, excluding paths and building clearance. This is not a measured outdoor grass percentage. The sidebar reports the raster-measured percentage separately.

The default courtyard has four open corners. Tight spacing or rotations can make footprints overlap; the UI reports this and the model uses their combined footprint.

## Explore

1. Save a reference layout, then switch typology under the same weather.
2. Compare **Comfort**, **Sun / shade**, and **Wind**.
3. Use **Plan view** and **Inspect** to check paths, the courtyard centre and openings. Read UTCI proxy, sun transmission, wind, sky view factor and mean radiant temperature (Tmrt).
4. Change orientation in small increments; compare height and spacing before assuming that greater openness or more shade always improves comfort.
5. Adjust porosity, trees and green cover. The reference uses the same effective weather as the current design, but each design's own open-ground area.

The comparison is for concept design. A community-wide average can hide a hot courtyard centre or exposed walking route.

## Manual editing

The edit bar offers Building, Tree, Grass and Floor blocks plus Erase, Inspect, Undo and Redo.

- Horizontal editing grid: 4 × 4 m. Building block height: 3 m, up to 30 storeys.
- Click ground to place; click a roof to add supported building blocks.
- Erase removes a generated building, tree or ground tile; removing a building block removes the supported stack above it.
- Drag to orbit; scroll to zoom. Use Plan view for precise placement.
- B / T / G / F select materials; E erases; I inspects; 1–4 select layers.
- Ctrl+Z undoes; Ctrl+Shift+Z redoes.
- Scene geometry and layout configuration auto-save locally. The previous v1 browser save is left untouched.
- Import/export uses JSON v2 with validated geometry and manual weather values. Legacy v1 JSON imports are centred on the larger site and use the new 3 m storey height. API keys and forecast payloads are excluded.

## Weather and Google APIs

Open **Weather** for date, manual climate inputs and location. Time uses **Singapore UTC+8**.

The existing local key remains in the ignored **.env.local**, read only by the server. A fresh checkout can copy .env.example and set GOOGLE_MAPS_API_KEY. Enable the appropriate APIs and billing in Google Cloud. Restart after changing the key.

- **Weather:** fetches current conditions and 24 hourly forecasts. Temperature, humidity, cloud, reference wind speed and direction drive the local model. Google wind units are converted to m/s.
- Forecast data is used only within its actual hour interval. Hours outside the loaded forecast clearly use manual values. Changing a climate input switches to manual mode and keeps the other current climate values.
- **Solar:** queries existing-roof sunshine information near the coordinates. It does not calculate edited-scene shade. NOT_FOUND means no building data is available near the location, not necessarily an invalid key.
- External API calls happen only on button clicks. Forecast payloads remain in memory, not browser storage or exported scene files. Keys never enter frontend bundles.

## Model limits

The environmental engine was adapted from the original Cooler Estates Studio.

- Sun: date/location solar position and ground-grid rays through exact building footprints. A 10 m idealised tree crown transmits 25% of direct sun. Sun exposure is instantaneous transmission, not daily or annual sun hours. Night-time shade coverage is undefined.
- Radiation: simplified direct, diffuse, reflected and longwave balance using surface type, sky view and local vegetation cooling.
- Comfort: the original linear **UTCI proxy**, not the standard UTCI polynomial.
- Wind: height-dependent wakes, porosity, canopy resistance and gap acceleration, not CFD. Reference wind is treated as 10 m wind; displayed wind is an estimate at pedestrian level.
- Statistics exclude building footprints, including porous ground floors. The open-ground denominator changes with geometry. Empty samples display unavailable values.

## Validation

~~~powershell
npm run typecheck
npm test
npm run build
~~~

Production: npm run build, then npm start. Both the static app and same-origin API are required; publishing dist alone does not provide Google API endpoints.

Tests cover exact typology dimensions, heights, fixed centres, 90° tower symmetry, planting rules, parameter extremes, shading, sky visibility, radiation, porosity/wind, JSON validation, weather-hour matching, API key isolation and units.

## Key files

- src/lib/layout-typology.ts — deterministic geometry and planting.
- src/lib/environment-engine.ts — metre-based rasterisation and environment model.
- src/components/StudioCanvas.tsx — rendering, instanced terrain, editing and heatmaps.
- src/App.tsx — design controls, weather, references and shared scene state.
- src/lib/scene-io.ts — scene and environment validation.
- scripts/launch.mjs — readiness checks, browser launch and startup logging.
- server/api.mjs — Google Weather / Solar proxy.
- legacy/ — preserved v1 app, styles and original source archive.

## Update: context and individual building editing

The **Site context** dialog can load the bundled real Bishan sample offline or query a Singapore location through the local API. The private Equator index was inaccessible from this account; this build independently downloads public OpenStreetMap geometry and does not claim to reuse the private index or its full UTCI model.

The bundled sample contains 117 source building ways around 1.3506 N, 103.8488 E, downloaded on 31 Oct 2026. The analysis area remains 200 × 200 m. Buildings centred inside are editable; outside buildings are read-only and still affect shade, sky visibility and heuristic wind. Mapped grass, parks, water and rivers are displayed where available. Missing land cover stays neutral. Water is excluded from pedestrian metrics even if its visual layer is hidden. Contributor identifiers and unrelated road geometry are omitted from context payloads.

Use **Select building (V)**, click a building, or choose one from the **Building** sidebar. Change name, position, height/storeys, orientation or porosity for just that building. Rectangular buildings also expose length and depth. Mapped polygons retain their outline. The selection is highlighted; selection and visibility controls do not change the physical model. Numeric inputs commit on Enter or blur, with Undo/Redo for scene edits.

New buildings now default to **16 × 16 × 18 m** (6 storeys), with adjustable footprint and storeys before placement. Click open ground to place a full individually editable building. Clicking an existing building in this mode selects it. The legacy 4 m voxel API remains for old imported scenes; manual new-building placement now uses full architectural volumes.

The new v3 scene format retains context geometry and building provenance. Local v2 saves remain untouched and can be migrated on first load. Project files up to 5 MB are accepted. Mapped heights can come from height tags, levels × 3 m, or a stated 15 m assumption. Editing a mapped height converts it into a design input.

### Four-file submission

From this directory run `npm run build:submission` with a supported Node version. The result is the sibling **submission/** directory containing exactly:

- index.html — HTML entry, application root, resource links and no-script fallback.
- styles.css — layout, colours, responsive sizing and state styles.
- app.js — readable bundled JavaScript, runtime dependencies and embedded Bishan data.
- BRIEF.Md — goal, decisions, scope, operation, tests and data licensing.

The static submission requires no package installation or external JavaScript CDN. The full local server remains necessary for other live OSM context locations and Google Weather/Solar, keeping credentials out of the four-file frontend. The offline sample, manual weather and local calculations work without that server. A simple local HTTP server can be used if the browser restricts file URLs.

The new source modules are src/lib/building-editor.ts, src/lib/context-data.ts, src/lib/geometry.ts, src/components/BuildingEditor.tsx and server/context-api.mjs. The existing launchers continue to run the full project. This round's local browser controls are disabled in Work settings, so visual and full interaction QA is not claimed for this update.

### Final submission refinements

- Individual building moves and names preserve the original height provenance until height/storeys are explicitly edited.
- Building placement uses the same fitted geometry for the ghost preview and the committed box; a red preview indicates a footprint conflict. Duplication also checks read-only context buildings.
- Manual climate inputs are saved alongside the scene. Undo/redo restores the corresponding scene/environment snapshot.
- The four-file build explicitly identifies offline mode and avoids requesting backend configuration when no backend is packaged.
- The bundled Bishan conversion retains 116 usable buildings: 5 editable and 111 fixed surroundings. It contains 2 park and 5 grass features, with no mapped water in this particular sample.
- Final numerical/API/geometry suite: 41 tests passed. No new browser UI pass is claimed because local browser control remains disabled in Work settings.
