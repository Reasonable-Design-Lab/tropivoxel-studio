import { ModuleType, VoxelInstance } from '../types/voxel';

export interface EstatePreset {
  id: string;
  name: string;
  location: string;
  description: string;
  voxels: Omit<VoxelInstance, 'cantileverDepth' | 'compressionStress' | 'solarExposure' | 'windExposure' | 'isStable'>[];
}

export const PRESETS: EstatePreset[] = [
  {
    id: 'punggol_waterway',
    name: 'Punggol Waterway Slab',
    location: 'Punggol Northshore Eco-District',
    description: 'Linear 10-storey North-South oriented block with open void deck breezeways, 4th floor sky garden, and rooftop solar array.',
    voxels: (() => {
      const list: EstatePreset['voxels'] = [];
      let idCounter = 1;

      // Base footprint: x from 4 to 11, z from 6 to 9 (oriented North-South along Z)
      // Level 0: Void deck breezeway with columns and central core
      for (let x = 4; x <= 11; x++) {
        for (let z = 6; z <= 9; z++) {
          const isCore = (x === 7 || x === 8) && (z === 7 || z === 8);
          const isPerimeterCol = (x === 4 || x === 11 || x === 7 || x === 8) && (z === 6 || z === 9);
          if (isCore) {
            list.push({ id: `v_${idCounter++}`, x, y: 0, z, moduleType: 'core_lift' });
          } else if (isPerimeterCol) {
            list.push({ id: `v_${idCounter++}`, x, y: 0, z, moduleType: 'void_colonnade' });
          }
        }
      }

      // Levels 1, 2, 3: Residential PPVC units
      for (let y = 1; y <= 3; y++) {
        for (let x = 4; x <= 11; x++) {
          for (let z = 6; z <= 9; z++) {
            const isCore = (x === 7 || x === 8) && (z === 7 || z === 8);
            if (isCore) {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'core_lift' });
            } else if (x <= 6) {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'unit_4rm' });
            } else {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'unit_5rm' });
            }
          }
        }
      }

      // Level 4: Sky Terrace & Community Greenery Deck
      for (let x = 4; x <= 11; x++) {
        for (let z = 6; z <= 9; z++) {
          const isCore = (x === 7 || x === 8) && (z === 7 || z === 8);
          if (isCore) {
            list.push({ id: `v_${idCounter++}`, x, y: 4, z, moduleType: 'core_lift' });
          } else if (x >= 5 && x <= 10 && z >= 7 && z <= 8) {
            list.push({ id: `v_${idCounter++}`, x, y: 4, z, moduleType: 'sky_garden' });
          } else {
            list.push({ id: `v_${idCounter++}`, x, y: 4, z, moduleType: 'unit_3rm' });
          }
        }
      }

      // Levels 5, 6, 7: Residential PPVC units
      for (let y = 5; y <= 7; y++) {
        for (let x = 4; x <= 11; x++) {
          for (let z = 6; z <= 9; z++) {
            const isCore = (x === 7 || x === 8) && (z === 7 || z === 8);
            if (isCore) {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'core_lift' });
            } else if (x <= 5 || x >= 10) {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'unit_3rm' });
            } else {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'unit_4rm' });
            }
          }
        }
      }

      // Level 8: Rooftop Solar PV Canopy & Sky Garden
      for (let x = 5; x <= 10; x++) {
        for (let z = 6; z <= 9; z++) {
          const isPV = x === 6 || x === 7 || x === 8 || x === 9;
          list.push({
            id: `v_${idCounter++}`,
            x,
            y: 8,
            z,
            moduleType: isPV ? 'solar_canopy' : 'sky_garden',
          });
        }
      }

      return list;
    })(),
  },
  {
    id: 'tengah_biophilic',
    name: 'Tengah Biophilic Point Block',
    location: 'Tengah Forest Town Garden District',
    description: 'Stepped high-rise point block with multi-tiered cantilevered sky parks, central breeze funnel, and continuous vertical greenery.',
    voxels: (() => {
      const list: EstatePreset['voxels'] = [];
      let idCounter = 1;

      // Level 0: Void deck & entrance colonnade
      for (let x = 5; x <= 10; x++) {
        for (let z = 5; z <= 10; z++) {
          const isCore = (x === 7 || x === 8) && (z === 7 || z === 8);
          const isCol = (x === 5 || x === 10) && (z === 5 || z === 10);
          if (isCore) {
            list.push({ id: `v_${idCounter++}`, x, y: 0, z, moduleType: 'core_lift' });
          } else if (isCol || (x === 7 && z === 5) || (x === 8 && z === 10)) {
            list.push({ id: `v_${idCounter++}`, x, y: 0, z, moduleType: 'void_colonnade' });
          }
        }
      }

      // Level 1-3: Broad lower tower
      for (let y = 1; y <= 3; y++) {
        for (let x = 5; x <= 10; x++) {
          for (let z = 5; z <= 10; z++) {
            const isCore = (x === 7 || x === 8) && (z === 7 || z === 8);
            if (isCore) {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'core_lift' });
            } else if ((x === 5 || x === 10) && (z === 5 || z === 10) && y === 2) {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'sky_garden' });
            } else {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'unit_4rm' });
            }
          }
        }
      }

      // Level 4: Setback step with wrap-around sky garden
      for (let x = 6; x <= 9; x++) {
        for (let z = 6; z <= 9; z++) {
          const isCore = (x === 7 || x === 8) && (z === 7 || z === 8);
          list.push({
            id: `v_${idCounter++}`,
            x,
            y: 4,
            z,
            moduleType: isCore ? 'core_lift' : 'sky_garden',
          });
        }
      }

      // Level 5-8: Upper slender tower
      for (let y = 5; y <= 8; y++) {
        for (let x = 6; x <= 9; x++) {
          for (let z = 6; z <= 9; z++) {
            const isCore = (x === 7 || x === 8) && (z === 7 || z === 8);
            if (isCore) {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'core_lift' });
            } else {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'unit_3rm' });
            }
          }
        }
      }

      // Level 9: Rooftop solar crown
      for (let x = 6; x <= 9; x++) {
        for (let z = 6; z <= 9; z++) {
          list.push({ id: `v_${idCounter++}`, x, y: 9, z, moduleType: 'solar_canopy' });
        }
      }

      return list;
    })(),
  },
  {
    id: 'bidadari_courtyard',
    name: 'Bidadari Breezeway Cluster',
    location: 'Bidadari Park Estate',
    description: 'L-shaped tropical cluster creating a sheltered wind canyon that draws in Northeast monsoon breezes toward void deck communal spaces.',
    voxels: (() => {
      const list: EstatePreset['voxels'] = [];
      let idCounter = 1;

      // L-shape footprint: wing 1 along X (x: 3..12, z: 4..6), wing 2 along Z (x: 3..5, z: 7..12)
      // Level 0: Void colonnades
      for (let x = 3; x <= 12; x++) {
        for (let z = 4; z <= 6; z++) {
          const isCore = (x === 4 || x === 9) && z === 5;
          const isCol = (x % 2 === 0);
          if (isCore) list.push({ id: `v_${idCounter++}`, x, y: 0, z, moduleType: 'core_lift' });
          else if (isCol) list.push({ id: `v_${idCounter++}`, x, y: 0, z, moduleType: 'void_colonnade' });
        }
      }
      for (let x = 3; x <= 5; x++) {
        for (let z = 7; z <= 12; z++) {
          const isCol = (z % 2 === 0);
          if (isCol) list.push({ id: `v_${idCounter++}`, x, y: 0, z, moduleType: 'void_colonnade' });
        }
      }

      // Levels 1 to 5: Residential units
      for (let y = 1; y <= 5; y++) {
        for (let x = 3; x <= 12; x++) {
          for (let z = 4; z <= 6; z++) {
            const isCore = (x === 4 || x === 9) && z === 5;
            if (isCore) {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'core_lift' });
            } else if (y === 3 && (x === 6 || x === 7)) {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'sky_garden' });
            } else {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'unit_4rm' });
            }
          }
        }
        for (let x = 3; x <= 5; x++) {
          for (let z = 7; z <= 12; z++) {
            if (y === 4 && (z === 9 || z === 10)) {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'sky_garden' });
            } else {
              list.push({ id: `v_${idCounter++}`, x, y, z, moduleType: 'unit_3rm' });
            }
          }
        }
      }

      // Level 6: Solar roof
      for (let x = 4; x <= 11; x++) {
        list.push({ id: `v_${idCounter++}`, x, y: 6, z: 5, moduleType: 'solar_canopy' });
      }
      for (let z = 7; z <= 11; z++) {
        list.push({ id: `v_${idCounter++}`, x: 4, y: 6, z, moduleType: 'solar_canopy' });
      }

      return list;
    })(),
  },
  {
    id: 'empty_parcel',
    name: 'Blank Estate Plot',
    location: 'Custom Singapore Parcel (16×16)',
    description: 'Empty tropical ground site with 16×16 coordinate grid, road perimeter, and prevailing monsoon wind indicators ready for custom design.',
    voxels: [],
  },
];
