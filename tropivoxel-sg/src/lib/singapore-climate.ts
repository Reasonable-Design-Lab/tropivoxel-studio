import { MonsoonRegime, VoxelInstance } from '../types/voxel';

// Singapore Geographic Coordinates
export const SG_LATITUDE = 1.3521; // 1.35° N
export const SG_LONGITUDE = 103.8198; // 103.82° E

export interface SunPosition {
  azimuthDeg: number; // 0 = North, 90 = East, 180 = South, 270 = West
  elevationDeg: number; // 0 = Horizon, 90 = Zenith
  directRadiationWm2: number;
  diffuseRadiationWm2: number;
}

/**
 * Calculates solar azimuth and elevation in Singapore at local time (07:00 to 19:00 SGT)
 * Singapore is 1.35° N of the equator, with roughly equal 12-hour day lengths year-round.
 */
export function calculateSingaporeSun(timeOfDayHours: number): SunPosition {
  // Normalize time 7.0 to 19.0 (7 AM to 7 PM)
  const clampedTime = Math.max(6.5, Math.min(19.0, timeOfDayHours));
  
  // Solar noon is approximately 13:05 SGT (due to UTC+8 time zone convention)
  const solarNoon = 13.08;
  const hourAngleDeg = (clampedTime - solarNoon) * 15; // 15 degrees per hour
  const hourAngleRad = (hourAngleDeg * Math.PI) / 180;
  
  // Equator approximation (declination varies slightly between -23.5 and +23.5, take representative tropical equinox ~5 deg)
  const declinationRad = (5.0 * Math.PI) / 180;
  const latRad = (SG_LATITUDE * Math.PI) / 180;

  // Elevation: sin(alpha) = sin(lat)*sin(dec) + cos(lat)*cos(dec)*cos(h)
  const sinAlpha =
    Math.sin(latRad) * Math.sin(declinationRad) +
    Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const elevationRad = Math.asin(Math.max(-0.1, Math.min(1.0, sinAlpha)));
  const elevationDeg = Math.max(0, (elevationRad * 180) / Math.PI);

  // Azimuth: cos(az) = (sin(dec) - sin(lat)*sin(alpha)) / (cos(lat)*cos(alpha))
  const cosAlpha = Math.cos(elevationRad);
  let azimuthDeg = 180;
  if (cosAlpha > 0.001) {
    const cosAz =
      (Math.sin(declinationRad) - Math.sin(latRad) * Math.sin(elevationRad)) /
      (Math.cos(latRad) * cosAlpha);
    const clampedCosAz = Math.max(-1, Math.min(1, cosAz));
    const azRad = Math.acos(clampedCosAz);
    azimuthDeg = (azRad * 180) / Math.PI;

    // Morning is East (azimuth < 180), Afternoon is West (azimuth > 180)
    if (hourAngleDeg > 0) {
      azimuthDeg = 360 - azimuthDeg;
    }
  }

  // Peak direct normal irradiance in Singapore reaches ~920 W/m2 under clear tropical skies
  const airMass = elevationDeg > 1 ? 1 / Math.sin(elevationRad) : 10;
  const directRadiationWm2 = elevationDeg > 2 ? Math.max(0, 920 * Math.pow(0.75, Math.min(airMass, 6))) : 0;
  const diffuseRadiationWm2 = elevationDeg > 2 ? Math.max(20, 140 * Math.sin(elevationRad)) : 0;

  return {
    azimuthDeg: Math.round(azimuthDeg * 10) / 10,
    elevationDeg: Math.round(elevationDeg * 10) / 10,
    directRadiationWm2: Math.round(directRadiationWm2),
    diffuseRadiationWm2: Math.round(diffuseRadiationWm2),
  };
}

export interface MonsoonCharacteristics {
  regime: MonsoonRegime;
  name: string;
  seasonMonths: string;
  windHeadingDeg: number; // degrees from North (direction wind blows toward or originates from)
  originBearingDeg: number; // where wind comes from
  avgSpeedMs: number;
  gustSpeedMs: number;
  vector: [number, number, number]; // Normalized wind direction vector in ThreeJS coordinates (x, y, z)
}

export function getMonsoonProfile(regime: MonsoonRegime): MonsoonCharacteristics {
  if (regime === 'northeast') {
    // Northeast monsoon: prevailing winds blow FROM the Northeast (approx 40 deg) TOWARD the Southwest (220 deg)
    const angleRad = (220 * Math.PI) / 180;
    return {
      regime: 'northeast',
      name: 'Northeast Monsoon',
      seasonMonths: 'December – March',
      windHeadingDeg: 220,
      originBearingDeg: 40,
      avgSpeedMs: 4.8,
      gustSpeedMs: 8.5,
      vector: [Math.sin(angleRad), 0, Math.cos(angleRad)],
    };
  } else {
    // Southwest monsoon: prevailing winds blow FROM the Southwest (approx 215 deg) TOWARD the Northeast (35 deg)
    const angleRad = (35 * Math.PI) / 180;
    return {
      regime: 'southwest',
      name: 'Southwest Monsoon',
      seasonMonths: 'June – September',
      windHeadingDeg: 35,
      originBearingDeg: 215,
      avgSpeedMs: 3.9,
      gustSpeedMs: 7.2,
      vector: [Math.sin(angleRad), 0, Math.cos(angleRad)],
    };
  }
}

/**
 * Calculates building facade exposure and microclimate performance.
 */
export function evaluateEstateMicroclimate(
  voxels: VoxelInstance[],
  sun: SunPosition,
  monsoon: MonsoonCharacteristics
) {
  if (voxels.length === 0) {
    return {
      avgSolarRadiationWm2: 0,
      westFacadeHeatPenaltyWm2: 0,
      ettvProxy: 32.0,
      voidDeckPorosityPct: 0,
      breezeVelocityMs: monsoon.avgSpeedMs,
      skyTerraceCoolingReductionDegC: 0,
    };
  }

  // Find ground level void voxels vs total footprint
  const groundVoxels = voxels.filter((v) => v.y === 0);
  const voidDeckVoxels = groundVoxels.filter((v) => v.moduleType === 'void_colonnade');
  const voidDeckPorosityPct =
    groundVoxels.length > 0 ? (voidDeckVoxels.length / groundVoxels.length) * 100 : 0;

  // Sky gardens count
  const skyGardens = voxels.filter((v) => v.moduleType === 'sky_garden');
  const skyTerraceCoolingReductionDegC = Math.min(2.8, skyGardens.length * 0.25);

  // Facade orientations
  // In our voxel coordinate system:
  // +Z is South, -Z is North
  // +X is East, -X is West
  let westFacingExposed = 0;
  let eastFacingExposed = 0;
  let northSouthFacingExposed = 0;
  let roofExposed = 0;

  const voxelSet = new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`));

  voxels.forEach((v) => {
    // Check if -X (West) face is open to exterior
    if (!voxelSet.has(`${v.x - 1},${v.y},${v.z}`)) westFacingExposed++;
    // Check if +X (East) face is open to exterior
    if (!voxelSet.has(`${v.x + 1},${v.y},${v.z}`)) eastFacingExposed++;
    // Check North (-Z) and South (+Z)
    if (!voxelSet.has(`${v.x},${v.y},${v.z - 1}`)) northSouthFacingExposed++;
    if (!voxelSet.has(`${v.x},${v.y},${v.z + 1}`)) northSouthFacingExposed++;
    // Check Roof (+Y)
    if (!voxelSet.has(`${v.x},${v.y + 1},${v.z}`)) roofExposed++;
  });

  // Afternoon harsh sun (13:00 to 18:00) hits West faces heavily
  const isAfternoon = sun.azimuthDeg > 180 && sun.azimuthDeg < 330;
  const afternoonFactor = isAfternoon ? 1.6 : 0.6;
  const westFacadeHeatPenaltyWm2 =
    westFacingExposed > 0
      ? Math.round((westFacingExposed / voxels.length) * sun.directRadiationWm2 * afternoonFactor)
      : 0;

  // Envelope Thermal Transfer Value (ETTV) proxy:
  // Singapore BCA baseline ETTV is capped at 50 W/m2 for energy compliance.
  // Oriented North-South with sky gardens lowers ETTV down to ~34-38 W/m2.
  // Heavy unshaded West facades raise ETTV towards 55+ W/m2.
  const westRatio = (westFacingExposed + 1) / (northSouthFacingExposed + westFacingExposed + eastFacingExposed + 1);
  const baseETTV = 38.0;
  const westPenalty = westRatio * 18.0;
  const greenBenefit = Math.min(6.5, skyGardens.length * 0.4);
  const solarRoofBenefit = voxels.filter((v) => v.moduleType === 'solar_canopy').length * 0.2;
  const ettvProxy = Math.max(28.0, Math.min(62.0, baseETTV + westPenalty - greenBenefit - solarRoofBenefit));

  // Pedestrian breeze velocity at void deck level:
  // Singapore average ambient wind is 3.5 - 4.5 m/s.
  // Open void deck allows venturi breeze of 2.2 - 3.4 m/s (ideal comfort range).
  // Blocked ground level drops wind to < 0.6 m/s (stifling tropical stagnation).
  const windPorosityFactor = voidDeckPorosityPct > 40 ? 0.75 : voidDeckPorosityPct > 15 ? 0.45 : 0.18;
  const breezeVelocityMs = Math.round((monsoon.avgSpeedMs * windPorosityFactor) * 10) / 10;

  const avgSolarRadiationWm2 = Math.round(
    sun.directRadiationWm2 * (roofExposed * 0.9 + westFacingExposed * (isAfternoon ? 0.8 : 0.3) + eastFacingExposed * (!isAfternoon ? 0.8 : 0.3) + northSouthFacingExposed * 0.35) /
      Math.max(1, roofExposed + westFacingExposed + eastFacingExposed + northSouthFacingExposed)
  );

  return {
    avgSolarRadiationWm2,
    westFacadeHeatPenaltyWm2,
    ettvProxy: Math.round(ettvProxy * 10) / 10,
    voidDeckPorosityPct: Math.round(voidDeckPorosityPct),
    breezeVelocityMs,
    skyTerraceCoolingReductionDegC: Math.round(skyTerraceCoolingReductionDegC * 10) / 10,
  };
}
