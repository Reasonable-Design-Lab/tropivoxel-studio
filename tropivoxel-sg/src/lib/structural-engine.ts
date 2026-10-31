import { MODULE_DEFINITIONS, VoxelInstance } from '../types/voxel';

export interface StructuralAnalysisResult {
  updatedVoxels: VoxelInstance[];
  totalWeightTonnes: number;
  maxCantilever: number;
  unsupportedVoxelsCount: number;
  overallIntegrityScore: number; // 0 to 100
  isStructureCompliant: boolean;
  warnings: string[];
}

export function analyzeStructuralIntegrity(voxels: VoxelInstance[]): StructuralAnalysisResult {
  if (voxels.length === 0) {
    return {
      updatedVoxels: [],
      totalWeightTonnes: 0,
      maxCantilever: 0,
      unsupportedVoxelsCount: 0,
      overallIntegrityScore: 100,
      isStructureCompliant: true,
      warnings: [],
    };
  }

  // Create fast lookup map
  const voxelMap = new Map<string, VoxelInstance>();
  voxels.forEach((v) => {
    voxelMap.set(`${v.x},${v.y},${v.z}`, { ...v });
  });

  // Step 1: Identify all grounded column stacks (voxels supported all the way to y=0)
  const groundedKeys = new Set<string>();

  // Any voxel at y=0 is grounded
  voxels.forEach((v) => {
    if (v.y === 0) {
      groundedKeys.add(`${v.x},0,${v.z}`);
    }
  });

  // Propagate vertical grounding upward: if (x, y-1, z) is grounded and (x, y, z) exists, then (x, y, z) is vertically grounded
  const maxY = Math.max(...voxels.map((v) => v.y), 0);
  for (let y = 1; y <= maxY; y++) {
    voxels.forEach((v) => {
      if (v.y === y && groundedKeys.has(`${v.x},${y - 1},${v.z}`)) {
        groundedKeys.add(`${v.x},${y},${v.z}`);
      }
    });
  }

  // Step 2: For voxels not vertically grounded, calculate horizontal cantilever distance
  // from the nearest vertically grounded voxel at the same height or immediate connection
  const cantileverDistMap = new Map<string, number>();

  voxels.forEach((v) => {
    const key = `${v.x},${v.y},${v.z}`;
    if (groundedKeys.has(key)) {
      cantileverDistMap.set(key, 0);
    } else {
      cantileverDistMap.set(key, 999);
    }
  });

  // Breadth-First-Search horizontal propagation on each level
  for (let pass = 0; pass < 6; pass++) {
    voxels.forEach((v) => {
      const key = `${v.x},${v.y},${v.z}`;
      let currentDist = cantileverDistMap.get(key) ?? 999;

      const neighbors = [
        `${v.x - 1},${v.y},${v.z}`,
        `${v.x + 1},${v.y},${v.z}`,
        `${v.x},${v.y},${v.z - 1}`,
        `${v.x},${v.y},${v.z + 1}`,
      ];

      neighbors.forEach((nKey) => {
        if (cantileverDistMap.has(nKey)) {
          const neighborDist = cantileverDistMap.get(nKey)!;
          if (neighborDist + 1 < currentDist) {
            currentDist = neighborDist + 1;
            cantileverDistMap.set(key, currentDist);
          }
        }
      });
    });
  }

  // Step 3: Compute downward compression load and stress
  // Load accumulates down each vertical column
  const columnLoad = new Map<string, number>(); // 'x,z' -> total tonnes
  let totalWeightTonnes = 0;

  voxels.forEach((v) => {
    const def = MODULE_DEFINITIONS[v.moduleType];
    const weight = def ? def.weightTonnes : 15;
    totalWeightTonnes += weight;
    const colKey = `${v.x},${v.z}`;
    columnLoad.set(colKey, (columnLoad.get(colKey) ?? 0) + weight);
  });

  let maxCantilever = 0;
  let unsupportedCount = 0;
  const warnings: string[] = [];

  const updatedVoxels: VoxelInstance[] = voxels.map((v) => {
    const key = `${v.x},${v.y},${v.z}`;
    const rawCantilever = cantileverDistMap.get(key) ?? 999;
    const cantilever = rawCantilever >= 999 ? 5 : rawCantilever;

    if (cantilever > maxCantilever) {
      maxCantilever = cantilever;
    }

    const isDirectlyGrounded = groundedKeys.has(key);
    const isStable = cantilever <= 2; // In Singapore PPVC, 1 module overhang is safe, 2 modules requires heavy transfer, >2 is unsafe

    if (!isStable) {
      unsupportedCount++;
    }

    const colKey = `${v.x},${v.z}`;
    const totalColWeight = columnLoad.get(colKey) ?? 15;
    
    // Core lift columns have higher carrying capacity (up to 800 tonnes)
    const isCore = v.moduleType === 'core_lift';
    const maxSafeLoad = isCore ? 850 : 450;
    const compressionStress = Math.min(1.0, totalColWeight / maxSafeLoad);

    return {
      ...v,
      cantileverDepth: cantilever,
      compressionStress: Math.round(compressionStress * 100) / 100,
      isStable,
    };
  });

  if (maxCantilever >= 3) {
    warnings.push(`Excessive cantilever detected (${maxCantilever} modules). Precast PPVC cannot span >2 modules without external truss bracing.`);
  }

  if (unsupportedCount > 0) {
    warnings.push(`${unsupportedCount} floating or ungrounded modular units require structural column path to ground foundation.`);
  }

  // Check building height / slender aspect ratio
  const maxX = Math.max(...voxels.map((v) => v.x), 0);
  const minX = Math.min(...voxels.map((v) => v.x), 0);
  const maxZ = Math.max(...voxels.map((v) => v.z), 0);
  const minZ = Math.min(...voxels.map((v) => v.z), 0);
  const footprintWidth = Math.max(1, maxX - minX + 1);
  const footprintDepth = Math.max(1, maxZ - minZ + 1);
  const baseDim = Math.min(footprintWidth, footprintDepth);
  const heightInVoxels = maxY + 1;
  const aspectRatio = heightInVoxels / baseDim;

  if (aspectRatio > 4.5) {
    warnings.push(`Slenderness ratio is ${aspectRatio.toFixed(1)}:1. Consider widening tower footprint or adding core shear walls to resist Singapore tropical wind gusts.`);
  }

  // Score 0 to 100
  let score = 100;
  score -= unsupportedCount * 12;
  if (maxCantilever === 2) score -= 8;
  if (maxCantilever >= 3) score -= 25;
  if (aspectRatio > 4.5) score -= 10;
  const overallIntegrityScore = Math.max(0, Math.min(100, Math.round(score)));
  const isStructureCompliant = overallIntegrityScore >= 70 && unsupportedCount === 0;

  return {
    updatedVoxels,
    totalWeightTonnes: Math.round(totalWeightTonnes),
    maxCantilever,
    unsupportedVoxelsCount: unsupportedCount,
    overallIntegrityScore,
    isStructureCompliant,
    warnings,
  };
}
