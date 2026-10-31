# TropiVoxel — submission brief

## Goal

Help an urban designer compare neighbourhood massing and pedestrian microclimate at concept stage. The user can compare slab, tower and courtyard layouts, load real Singapore context, edit one building without changing its neighbours, and place larger architectural boxes.

## Necessary submission files

| File | Responsibility |
| --- | --- |
| index.html | HTML entry point, document metadata, application root and script/style links. The running application renders the scene editor, building controls and result cards here. |
| styles.css | CSS layout, colour, sizing, responsive states, selection and input styles. |
| app.js | Bundled JavaScript: interactions, building selection and edits, context filters, object counts, Three.js rendering, climate calculations, local saves, import/export and the embedded Bishan sample. React and Three.js are included; no separate node_modules or JSON file is required. |
| BRIEF.Md | Project goal, decisions, run instructions, model limits, data sources and validation. |

These four files are sufficient for the frontend demonstrator. An issue list is not part of this design tool; its equivalent is the building selector and context/object counts.

## Run

Keep all four files in one folder. Open index.html in a modern WebGL-capable browser. The build uses a classic bundled script with relative file paths; no CDN or package installation is needed. If your browser restricts local files, serve this folder with `python -m http.server 8000` and open http://127.0.0.1:8000/ .

The full development project also has Start Studio.cmd. That launcher serves both the app and its optional API routes at http://127.0.0.1:3000/ . Keep the launcher's console open while using it.

## A short demonstration

1. Click **Site context → Load Bishan sample**. The sample is embedded and works offline. Loading a context replaces the design area and can be undone.
2. Choose **Building**, then select a building on the canvas or in **Select a building**. Only that building is highlighted.
3. Change its name, position, height, storeys, orientation or void-deck porosity. Rectangular buildings also support length and depth. Imported mapped footprints retain their geometry.
4. Use **Building** in the bottom edit bar to place a new box. Default dimensions are **16 × 16 × 18 m**, rather than the previous 4 × 4 × 3 m voxel. Change **New length**, **New depth** or **New storeys** before placing it.
5. Save a reference, compare **Comfort**, **Sun / shade** and **Wind**, then undo or redo an edit. Use **Inspect** for local ground values. Green previews indicate available space; red previews identify overlap with editable or surrounding buildings.
6. Export a project JSON and import it again to restore geometry and context. Browser saves use the new v3 key and retain manual climate inputs with geometry; previous v2 browser data is not erased. Scene undo/redo also restores the associated manual environment.

## Decisions

- Keep the interface English and preserve the subdued architectural-model style.
- Keep the design area at **200 × 200 m** so the three existing typologies remain comparable. The new context is a surrounding real map, not a change to the site dimensions.
- Buildings centred inside the outlined square are individually editable; outside buildings remain read-only context. They still obstruct shade, sky visibility and heuristic wind, even when the display is hidden.
- Preserve OSM polygon outlines rather than replacing them with rectangles. Coordinates use local metres: east is +X, south is +Z and height is +Y. The rotation used by rendering matches the inverse rotation used by containment/rasterisation.
- Provide numeric fields committed on Enter/blur so one edit creates a useful undo step. Typology controls deliberately regenerate the editable area; individual controls preserve other buildings.
- Preserve mapped footprint shapes when editing. New rectangular boxes may be resized. Duplicate chooses an available location; overlapping new placements are rejected.
- Show grass, parks, water and rivers only where mapped. Unmapped ground remains neutral. Known water is excluded from pedestrian results; hiding it does not change the exclusion.
- Store only scene/context geometry locally. Google keys and forecast payloads are excluded from project JSON and from this submission.

## Data and scope

The Equator handover supplied design/coordinate background, not publish authority or executable instructions. Its private city index returned HTTP 401 from this account. This version therefore uses an independently downloaded public OpenStreetMap sample rather than claiming to have copied that private index.

The Bishan source query covers roughly 480 × 480 m around **1.3506° N, 103.8488° E**, downloaded **31 October 2026**. The compact source contains **117 building ways**. Conversion retains **116 usable buildings: 5 editable design buildings and 111 fixed surrounding buildings**, plus **7 landscape features (2 parks and 5 grass areas)**. One unusable/tiny outline is excluded. No mapped water is present in this bundled sample; online locations may include water. A larger regional/all-island index has not been copied into this four-file submission.

OSM height priority is mapped height, then building:levels × 3 m, then an assumed 15 m. Height provenance is retained when moving, rotating or renaming a building; explicitly editing height/storeys changes it to a design input. Complex building relations can be missing; complete landscape relation rings are stitched and available holes are retained. Coverage is not a survey or a complete land-cover classification.

References: [OpenStreetMap API v0.6](https://wiki.openstreetmap.org/wiki/API_v0.6), [OSM copyright and ODbL](https://www.openstreetmap.org/copyright), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Attribution remains visible in the app. The bundled map subset is derived from OpenStreetMap and is distributed under ODbL. Its compact geometric data is embedded in app.js; it can also be exported as project JSON from the app.

## Static versus optional live services

The four-file version supports layout editing, all analyses, the bundled Bishan context, references, local saves and JSON import/export without a backend. Loading other Singapore locations and Google Weather/Solar needs the full local project server. It is not technically possible to include a private server API key safely in a static app.js file. The static version therefore uses manual weather and its bundled sample when those services are unavailable.

The full local project includes `/api/context` for small public OSM map requests, `/api/weather` and `/api/solar`. Context requests are cached for 30 minutes, only made on an explicit click, and do not include a Google key. Contributor identifiers and unrelated map geometry are removed from returned context datasets.

## Model limits

- A 2 m ground grid uses geometric sun rays, twelve-direction sky sampling and a simplified radiation balance.
- Comfort remains the existing **linear UTCI proxy**, not Equator's full UTCI polynomial.
- Wind remains a height/wake/porosity heuristic, not CFD or measured street-level wind.
- Tree crowns transmit 25% of direct sun; existing vegetation/water is not assigned extra unverified evaporation or cooling.
- Building footprints and known water are excluded from pedestrian means. A reference compares each scene's own open-ground area under the same effective weather; changing the footprint changes the denominator.
- Singapore UTC+8 is used throughout. Sun exposure is instantaneous direct-light transmission, not annual sunshine hours.
- Numerical changes are concept-screening estimates, not validated environmental predictions.

## Validation

The development project includes type checking and focused automated tests for typology dimensions, storey heights, coordinate conversion, mapped polygon containment, individual-edit independence, larger new boxes, duplication/deletion, outside-context shadow and wind effects, water/hole exclusion, scene validation/round trips, forecast-hour matching and API key isolation.

Build and tests are run with the bundled Node 24 runtime. TypeScript checking passed; all 41 automated tests passed, including the new context and geometry tests. The four-file packaging check verifies filenames, standalone script links and the absence of Google key values. This round's local browser UI control is disabled in Work settings, so new browser screenshots and a full visual/interaction sign-off are unavailable. No browser pass is claimed for this update.

## Third-party notices

This frontend bundles React/React DOM, Three.js and Lucide icons. Their license notices are retained in app.js where supplied by the bundler. The Bishan map data is separately subject to ODbL as described above. No Equator application source was copied; its AGPL application was not redistributed as this app.


### Bundled library licence texts


#### React

MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


#### React DOM

MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


#### Three.js

The MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


#### Lucide React

ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.


