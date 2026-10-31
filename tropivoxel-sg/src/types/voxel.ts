export type ModuleCategory = 'ground' | 'residential' | 'greenery' | 'core';

export type ModuleType =
  | 'void_colonnade'
  | 'unit_2rm'
  | 'unit_3rm'
  | 'unit_4rm'
  | 'unit_5rm'
  | 'sky_garden'
  | 'core_lift'
  | 'solar_canopy';

export type ToolMode = 'place' | 'extrude' | 'erase' | 'inspect';

export type ViewMode = 'realistic' | 'solar_heat' | 'wind_flow' | 'structural_stress';

export type MonsoonRegime = 'northeast' | 'southwest';

export interface ModuleDefinition {
  type: ModuleType;
  name: string;
  category: ModuleCategory;
  description: string;
  // Dimensions in voxels (width x, height y, depth z)
  size: [number, number, number];
  areaM2: number; // Approximate floor area in m2
  costPerM2SGD: number; // Cost in SGD per m2
  carbonPerM2: number; // kg CO2e / m2 embodied carbon
  weightTonnes: number; // Structural dead weight per module
  windPorosity: number; // 0.0 (solid wall) to 0.95 (open void breezeway)
  color: string;
  accentColor: string;
}

export interface VoxelInstance {
  id: string;
  x: number; // 0 to 15
  y: number; // 0 to 23 (levels, 1 voxel = 3.0m)
  z: number; // 0 to 15
  moduleType: ModuleType;
  // Computed simulation properties
  cantileverDepth: number; // 0 = supported directly from below, 1 = 1-voxel overhang, >2 = critical warning
  compressionStress: number; // 0.0 to 1.0 ratio
  solarExposure: number; // Watts / m2 absorbed
  windExposure: number; // Relative wind speed m/s
  isStable: boolean;
}

export interface SimulationMetrics {
  totalVoxels: number;
  totalGFA: number; // m2 Gross Floor Area
  residentialUnits: {
    unit2rm: number;
    unit3rm: number;
    unit4rm: number;
    unit5rm: number;
    totalUnits: number;
    estResidents: number;
  };
  structural: {
    totalWeightTonnes: number;
    maxCantilever: number;
    unsupportedVoxelsCount: number;
    overallIntegrityScore: number; // 0 to 100
    isStructureCompliant: boolean;
  };
  microclimate: {
    sunAzimuthDeg: number;
    sunElevationDeg: number;
    avgSolarRadiationWm2: number;
    westFacadeHeatPenaltyWm2: number;
    ettvProxy: number; // Envelope Thermal Transfer Value in W/m2 (BCA standard < 50 W/m2)
    voidDeckPorosityPct: number; // Void breezeway %
    breezeVelocityMs: number; // Effective pedestrian wind speed in m/s
    skyTerraceCoolingReductionDegC: number; // Urban heat island buffer
  };
  sustainability: {
    gnpr: number; // Green Plot Ratio (target >= 4.0 for BCA Green Mark Platinum)
    pvEnergyGenerationKWhYear: number;
    embodiedCarbonKgCO2eM2: number; // Singapore benchmark ~850 kg CO2e/m2
    bcaGreenMarkPoints: number; // 0 to 100
    bcaGreenMarkTier: 'Certified' | 'Gold' | 'GoldPLUS' | 'Platinum' | 'Super Low Energy';
  };
  costs: {
    substructureSGD: number;
    ppvcSuperstructureSGD: number;
    skyGardenSGD: number;
    glazingSGD: number;
    solarPVSGD: number;
    cantileverReinforcementSGD: number;
    totalSGD: number;
    costPerM2SGD: number;
  };
}

export const MODULE_DEFINITIONS: Record<ModuleType, ModuleDefinition> = {
  void_colonnade: {
    type: 'void_colonnade',
    name: 'Void Deck Breezeway',
    category: 'ground',
    description: 'Ground level open colonnade for pedestrian cross-breeze and communal gathering',
    size: [1, 1, 1],
    areaM2: 13,
    costPerM2SGD: 950,
    carbonPerM2: 480,
    weightTonnes: 6.5,
    windPorosity: 0.88,
    color: '#94a3b8',
    accentColor: '#cbd5e1',
  },
  unit_2rm: {
    type: 'unit_2rm',
    name: '2-Room Flexi PPVC',
    category: 'residential',
    description: 'Modular precast apartment module for singles & elderly (36 m² / 1 voxel block)',
    size: [1, 1, 1],
    areaM2: 36,
    costPerM2SGD: 2950,
    carbonPerM2: 780,
    weightTonnes: 14.0,
    windPorosity: 0.12,
    color: '#38bdf8',
    accentColor: '#0284c7',
  },
  unit_3rm: {
    type: 'unit_3rm',
    name: '3-Room PPVC Unit',
    category: 'residential',
    description: 'Compact 2-bedroom family module with low-e glazed windows (68 m² / 2 stacked voxels)',
    size: [1, 1, 1],
    areaM2: 68,
    costPerM2SGD: 2850,
    carbonPerM2: 760,
    weightTonnes: 18.0,
    windPorosity: 0.10,
    color: '#60a5fa',
    accentColor: '#2563eb',
  },
  unit_4rm: {
    type: 'unit_4rm',
    name: '4-Room Standard PPVC',
    category: 'residential',
    description: 'Core Singapore HDB 3-bedroom flat module with recessed breezeway balconies (93 m²)',
    size: [1, 1, 1],
    areaM2: 93,
    costPerM2SGD: 2750,
    carbonPerM2: 740,
    weightTonnes: 22.0,
    windPorosity: 0.10,
    color: '#818cf8',
    accentColor: '#4f46e5',
  },
  unit_5rm: {
    type: 'unit_5rm',
    name: '5-Room Executive PPVC',
    category: 'residential',
    description: 'Spacious 3-bedroom + study flat with dual aspect natural cross-ventilation (113 m²)',
    size: [1, 1, 1],
    areaM2: 113,
    costPerM2SGD: 2700,
    carbonPerM2: 720,
    weightTonnes: 26.0,
    windPorosity: 0.08,
    color: '#a78bfa',
    accentColor: '#7c3aed',
  },
  sky_garden: {
    type: 'sky_garden',
    name: 'Sky Terrace & Garden',
    category: 'greenery',
    description: 'Landscaped communal sky deck with native tropical flora, shading trees, and urban cooling',
    size: [1, 1, 1],
    areaM2: 45,
    costPerM2SGD: 2200,
    carbonPerM2: 320,
    weightTonnes: 15.0,
    windPorosity: 0.65,
    color: '#10b981',
    accentColor: '#059669',
  },
  core_lift: {
    type: 'core_lift',
    name: 'Shear Wall & Lift Core',
    category: 'core',
    description: 'High-stiffness reinforced concrete elevator shaft, escape staircases, and MEP riser services',
    size: [1, 1, 1],
    areaM2: 25,
    costPerM2SGD: 3400,
    carbonPerM2: 920,
    weightTonnes: 32.0,
    windPorosity: 0.02,
    color: '#64748b',
    accentColor: '#334155',
  },
  solar_canopy: {
    type: 'solar_canopy',
    name: 'Rooftop Solar PV Pergola',
    category: 'core',
    description: 'Bifacial monocrystalline photovoltaic canopy providing rooftop shading and clean power',
    size: [1, 1, 1],
    areaM2: 30,
    costPerM2SGD: 1600,
    carbonPerM2: 280,
    weightTonnes: 5.0,
    windPorosity: 0.40,
    color: '#eab308',
    accentColor: '#ca8a04',
  },
};
