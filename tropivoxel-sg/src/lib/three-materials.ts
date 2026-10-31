import * as THREE from 'three';
import { ModuleType, ViewMode } from '../types/voxel';

/**
 * Creates procedural high-resolution canvas textures for realistic Singapore architectural visualization.
 */
export function createProceduralTextures(renderer: THREE.WebGLRenderer) {
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  // 1. Residential Facade Texture (Precast concrete panels + recessed low-e windows + tropical sun louvers)
  const facadeCanvas = document.createElement('canvas');
  facadeCanvas.width = 512;
  facadeCanvas.height = 512;
  const fCtx = facadeCanvas.getContext('2d')!;
  
  // Base off-white/light warm gray HDB concrete finish
  fCtx.fillStyle = '#f1f5f9';
  fCtx.fillRect(0, 0, 512, 512);

  // Subtle precast panel joints
  fCtx.strokeStyle = '#cbd5e1';
  fCtx.lineWidth = 3;
  fCtx.strokeRect(6, 6, 500, 500);

  // Recessed window frame
  fCtx.fillStyle = '#334155'; // Dark powder-coated aluminium frame
  fCtx.fillRect(60, 60, 392, 392);
  fCtx.fillStyle = '#0f172a';
  fCtx.fillRect(72, 72, 368, 368);

  // Glazing tint (high-performance tropical double glazing with slight cyan-sky reflection)
  const glassGrad = fCtx.createLinearGradient(72, 72, 440, 440);
  glassGrad.addColorStop(0, '#1e293b');
  glassGrad.addColorStop(0.4, '#38bdf8');
  glassGrad.addColorStop(1, '#0284c7');
  fCtx.fillStyle = glassGrad;
  fCtx.globalAlpha = 0.85;
  fCtx.fillRect(76, 76, 360, 360);
  fCtx.globalAlpha = 1.0;

  // Horizontal sun shading louvers (Singapore passive tropical design)
  fCtx.fillStyle = '#e2e8f0';
  for (let y = 110; y < 400; y += 65) {
    fCtx.fillRect(80, y, 352, 12);
    fCtx.fillStyle = '#94a3b8';
    fCtx.fillRect(80, y + 12, 352, 4); // drop shadow under louver
    fCtx.fillStyle = '#e2e8f0';
  }

  const facadeTexture = new THREE.CanvasTexture(facadeCanvas);
  facadeTexture.colorSpace = THREE.SRGBColorSpace;
  facadeTexture.anisotropy = maxAnisotropy;

  // 2. Void Colonnade Breezeway Texture (Ground level open pilotis pillars)
  const voidCanvas = document.createElement('canvas');
  voidCanvas.width = 512;
  voidCanvas.height = 512;
  const vCtx = voidCanvas.getContext('2d')!;
  vCtx.fillStyle = '#e2e8f0';
  vCtx.fillRect(0, 0, 512, 512);

  // Pillar posts on the corners with open air in the middle
  vCtx.fillStyle = '#94a3b8';
  vCtx.fillRect(20, 20, 100, 472);
  vCtx.fillRect(392, 20, 100, 472);
  // Ceiling slab and floor paving
  vCtx.fillStyle = '#cbd5e1';
  vCtx.fillRect(0, 0, 512, 36);
  vCtx.fillRect(0, 476, 512, 36);
  // Singapore void deck tiled breezeway pattern
  vCtx.strokeStyle = '#94a3b8';
  vCtx.lineWidth = 2;
  for (let x = 120; x < 390; x += 40) {
    vCtx.beginPath();
    vCtx.moveTo(x, 476);
    vCtx.lineTo(x, 512);
    vCtx.stroke();
  }

  const voidTexture = new THREE.CanvasTexture(voidCanvas);
  voidTexture.colorSpace = THREE.SRGBColorSpace;
  voidTexture.anisotropy = maxAnisotropy;

  // 3. Sky Garden & Tropical Greenery Texture
  const greenCanvas = document.createElement('canvas');
  greenCanvas.width = 512;
  greenCanvas.height = 512;
  const gCtx = greenCanvas.getContext('2d')!;

  // Timber decking base
  gCtx.fillStyle = '#b45309';
  gCtx.fillRect(0, 0, 512, 512);
  gCtx.strokeStyle = '#78350f';
  gCtx.lineWidth = 4;
  for (let x = 0; x < 512; x += 32) {
    gCtx.strokeRect(x, 0, 32, 512);
  }

  // Lush tropical foliage leaves (ferns, monstera, tropical hedges)
  const greens = ['#059669', '#10b981', '#34d399', '#047857', '#065f46', '#6ee7b7'];
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const r = 8 + Math.random() * 22;
    gCtx.fillStyle = greens[Math.floor(Math.random() * greens.length)];
    gCtx.beginPath();
    gCtx.ellipse(rx, ry, r, r * 0.65, Math.random() * Math.PI, 0, Math.PI * 2);
    gCtx.fill();
  }

  const greenTexture = new THREE.CanvasTexture(greenCanvas);
  greenTexture.colorSpace = THREE.SRGBColorSpace;
  greenTexture.anisotropy = maxAnisotropy;

  // 4. Shear Core & Lift Shaft Texture (Fair-faced architectural concrete)
  const coreCanvas = document.createElement('canvas');
  coreCanvas.width = 512;
  coreCanvas.height = 512;
  const cCtx = coreCanvas.getContext('2d')!;
  cCtx.fillStyle = '#64748b';
  cCtx.fillRect(0, 0, 512, 512);

  // Formwork tie-rod holes and grooves
  cCtx.strokeStyle = '#475569';
  cCtx.lineWidth = 4;
  cCtx.strokeRect(0, 0, 512, 256);
  cCtx.strokeRect(0, 256, 512, 256);
  cCtx.fillStyle = '#334155';
  [40, 472].forEach((cx) => {
    [40, 216, 296, 472].forEach((cy) => {
      cCtx.beginPath();
      cCtx.arc(cx, cy, 6, 0, Math.PI * 2);
      cCtx.fill();
    });
  });

  const coreTexture = new THREE.CanvasTexture(coreCanvas);
  coreTexture.colorSpace = THREE.SRGBColorSpace;
  coreTexture.anisotropy = maxAnisotropy;

  // 5. Solar PV Canopy Texture (Bifacial monocrystalline solar cells)
  const pvCanvas = document.createElement('canvas');
  pvCanvas.width = 512;
  pvCanvas.height = 512;
  const pCtx = pvCanvas.getContext('2d')!;
  pCtx.fillStyle = '#0f172a';
  pCtx.fillRect(0, 0, 512, 512);

  // 4x4 Grid of dark blue PV silicon wafers
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const px = 20 + col * 120;
      const py = 20 + row * 120;
      pCtx.fillStyle = '#1e3a8a';
      pCtx.fillRect(px, py, 112, 112);

      // Fine silver busbars
      pCtx.strokeStyle = '#93c5fd';
      pCtx.lineWidth = 1;
      for (let bx = px + 10; bx < px + 110; bx += 18) {
        pCtx.beginPath();
        pCtx.moveTo(bx, py);
        pCtx.lineTo(bx, py + 112);
        pCtx.stroke();
      }
    }
  }

  const pvTexture = new THREE.CanvasTexture(pvCanvas);
  pvTexture.colorSpace = THREE.SRGBColorSpace;
  pvTexture.anisotropy = maxAnisotropy;

  return {
    facadeTexture,
    voidTexture,
    greenTexture,
    coreTexture,
    pvTexture,
  };
}

/**
 * Material map for all voxel types
 */
export function createVoxelMaterials(textures: ReturnType<typeof createProceduralTextures>) {
  return {
    void_colonnade: new THREE.MeshStandardMaterial({
      map: textures.voidTexture,
      roughness: 0.65,
      metalness: 0.1,
    }),
    unit_2rm: new THREE.MeshStandardMaterial({
      map: textures.facadeTexture,
      color: 0xecfdf5,
      roughness: 0.35,
      metalness: 0.15,
    }),
    unit_3rm: new THREE.MeshStandardMaterial({
      map: textures.facadeTexture,
      color: 0xf0fdf4,
      roughness: 0.35,
      metalness: 0.15,
    }),
    unit_4rm: new THREE.MeshStandardMaterial({
      map: textures.facadeTexture,
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.15,
    }),
    unit_5rm: new THREE.MeshStandardMaterial({
      map: textures.facadeTexture,
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.15,
    }),
    sky_garden: new THREE.MeshStandardMaterial({
      map: textures.greenTexture,
      roughness: 0.85,
      metalness: 0.05,
    }),
    core_lift: new THREE.MeshStandardMaterial({
      map: textures.coreTexture,
      roughness: 0.7,
      metalness: 0.2,
    }),
    solar_canopy: new THREE.MeshStandardMaterial({
      map: textures.pvTexture,
      roughness: 0.2,
      metalness: 0.6,
    }),
  };
}

/**
 * Returns color mapping for simulation overlay modes:
 * - Solar heat gain (Blue = cool shaded, Yellow = moderate, Red = intense direct solar thermal load)
 * - Wind velocity (Cyan = high breeze, Blue = moderate, Dull Gray/Purple = stagnant dead pocket)
 * - Structural stress (Emerald = grounded/safe, Amber = moderate cantilever, Red = unsupported/critical)
 */
export function getSimulationColor(
  viewMode: ViewMode,
  voxel: {
    moduleType: ModuleType;
    solarExposure?: number;
    windExposure?: number;
    cantileverDepth?: number;
    compressionStress?: number;
    isStable?: boolean;
    y: number;
  }
): THREE.Color {
  if (viewMode === 'solar_heat') {
    // Top levels and West facades receive high solar irradiance (~500 - 900 W/m2)
    const exposure = voxel.solarExposure ?? (voxel.y * 35 + 250);
    const normalized = Math.min(1.0, Math.max(0.0, exposure / 800));

    // Greenery reflects and cools
    if (voxel.moduleType === 'sky_garden') {
      return new THREE.Color(0x10b981); // Biophilic cool
    }
    if (voxel.moduleType === 'solar_canopy') {
      return new THREE.Color(0x38bdf8); // Shaded PV
    }

    // Gradient from cool blue (#38bdf8) to warning amber (#f59e0b) to hot red (#ef4444)
    if (normalized < 0.4) {
      return new THREE.Color().lerpColors(
        new THREE.Color(0x38bdf8),
        new THREE.Color(0xfacc15),
        normalized / 0.4
      );
    } else {
      return new THREE.Color().lerpColors(
        new THREE.Color(0xfacc15),
        new THREE.Color(0xef4444),
        (normalized - 0.4) / 0.6
      );
    }
  }

  if (viewMode === 'wind_flow') {
    if (voxel.moduleType === 'void_colonnade') {
      return new THREE.Color(0x06b6d4); // Super high breezeway porosity (Cyan)
    }
    if (voxel.moduleType === 'sky_garden') {
      return new THREE.Color(0x2dd4bf); // Aerated green terrace
    }
    // High floors have higher wind, ground without void deck is stagnant
    const windSpeed = voxel.windExposure ?? (voxel.y * 0.35 + 1.2);
    const normalized = Math.min(1.0, Math.max(0.0, windSpeed / 4.8));

    return new THREE.Color().lerpColors(
      new THREE.Color(0x475569), // stagnant slate
      new THREE.Color(0x38bdf8), // breezy cyan
      normalized
    );
  }

  if (viewMode === 'structural_stress') {
    const cantilever = voxel.cantileverDepth ?? 0;
    const isStable = voxel.isStable ?? true;

    if (!isStable || cantilever >= 3) {
      return new THREE.Color(0xef4444); // Critical failure (Red)
    }
    if (cantilever === 2) {
      return new THREE.Color(0xf97316); // High cantilever moment (Orange)
    }
    if (cantilever === 1) {
      return new THREE.Color(0xeab308); // Moderate overhang (Yellow)
    }

    // Directly grounded column: color code based on compression stress
    const stress = voxel.compressionStress ?? 0.3;
    if (stress > 0.8) {
      return new THREE.Color(0xf59e0b);
    }
    return new THREE.Color(0x10b981); // Solid safe support (Emerald)
  }

  // Realistic fallback handled by materials map
  return new THREE.Color(0xffffff);
}
