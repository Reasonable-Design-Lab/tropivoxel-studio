import { MODULE_DEFINITIONS, SimulationMetrics, VoxelInstance } from '../types/voxel';

export function calculateBCAEstateMetrics(
  voxels: VoxelInstance[],
  microclimate: SimulationMetrics['microclimate'],
  structural: SimulationMetrics['structural']
): Pick<SimulationMetrics, 'totalVoxels' | 'totalGFA' | 'residentialUnits' | 'sustainability' | 'costs'> {
  let unit2rm = 0;
  let unit3rm = 0;
  let unit4rm = 0;
  let unit5rm = 0;
  let skyGardenCount = 0;
  let solarCanopyCount = 0;
  let voidDeckCount = 0;
  let coreCount = 0;

  let totalGFA = 0;
  let ppvcSuperstructureSGD = 0;
  let skyGardenSGD = 0;
  let solarPVSGD = 0;
  let totalEmbodiedCarbonKg = 0;

  voxels.forEach((v) => {
    const def = MODULE_DEFINITIONS[v.moduleType];
    if (!def) return;

    totalGFA += def.areaM2;
    totalEmbodiedCarbonKg += def.areaM2 * def.carbonPerM2;

    switch (v.moduleType) {
      case 'unit_2rm':
        unit2rm++;
        ppvcSuperstructureSGD += def.areaM2 * def.costPerM2SGD;
        break;
      case 'unit_3rm':
        unit3rm++;
        ppvcSuperstructureSGD += def.areaM2 * def.costPerM2SGD;
        break;
      case 'unit_4rm':
        unit4rm++;
        ppvcSuperstructureSGD += def.areaM2 * def.costPerM2SGD;
        break;
      case 'unit_5rm':
        unit5rm++;
        ppvcSuperstructureSGD += def.areaM2 * def.costPerM2SGD;
        break;
      case 'sky_garden':
        skyGardenCount++;
        skyGardenSGD += def.areaM2 * def.costPerM2SGD;
        break;
      case 'solar_canopy':
        solarCanopyCount++;
        solarPVSGD += def.areaM2 * def.costPerM2SGD;
        break;
      case 'void_colonnade':
        voidDeckCount++;
        ppvcSuperstructureSGD += def.areaM2 * def.costPerM2SGD;
        break;
      case 'core_lift':
        coreCount++;
        ppvcSuperstructureSGD += def.areaM2 * def.costPerM2SGD;
        break;
    }
  });

  const totalUnits = unit2rm + unit3rm + unit4rm + unit5rm;
  const estResidents = Math.round(
    unit2rm * 1.5 + unit3rm * 2.8 + unit4rm * 3.6 + unit5rm * 4.4
  );

  // Substructure & Piling in Singapore soil condition (SGD ~350 / m2 GFA)
  const substructureSGD = Math.round(totalGFA * 350);

  // Architectural fenestration & Low-E glazing (~420 SGD/m2 facade)
  const glazingSGD = Math.round(totalUnits * 4800);

  // Cantilever structural surcharge for transfer plates & bracing
  const cantileverReinforcementSGD = structural.maxCantilever >= 2 ? structural.maxCantilever * 85000 : 0;

  const totalCostSGD =
    substructureSGD +
    ppvcSuperstructureSGD +
    skyGardenSGD +
    solarPVSGD +
    glazingSGD +
    cantileverReinforcementSGD;

  const costPerM2SGD = totalGFA > 0 ? Math.round(totalCostSGD / totalGFA) : 0;

  // Embodied carbon per m2
  const embodiedCarbonKgCO2eM2 =
    totalGFA > 0 ? Math.round(totalEmbodiedCarbonKg / totalGFA) : 0;

  // Green Plot Ratio (GnPR)
  // Site area is assumed to be 16x16 voxels * 13m2 = 3328 m2 parcel
  const siteAreaM2 = 3328;
  const greenLeafAreaM2 = skyGardenCount * 45 * 3.5; // Leaf Area Index multiplier for multi-tier tropical planting
  const gnpr = Math.round((greenLeafAreaM2 / siteAreaM2) * 10) / 10;

  // Rooftop Solar PV Generation (Singapore receives ~1580 kWh/m2/year solar insolation)
  const pvAreaM2 = solarCanopyCount * 30;
  const pvEnergyGenerationKWhYear = Math.round(pvAreaM2 * 0.18 * 1450 * 0.82); // efficiency & PR

  // BCA Green Mark 2021 Points Calculation (Max 100)
  // 1. Energy Efficiency & Low ETTV (Max 35 pts)
  let energyPts = 0;
  if (microclimate.ettvProxy <= 35) energyPts += 35;
  else if (microclimate.ettvProxy <= 40) energyPts += 28;
  else if (microclimate.ettvProxy <= 45) energyPts += 20;
  else if (microclimate.ettvProxy <= 50) energyPts += 12;
  else energyPts += 5;

  // Solar PV Bonus
  if (solarCanopyCount >= 4) energyPts = Math.min(35, energyPts + 6);

  // 2. Natural Ventilation & Porosity (Max 25 pts)
  let ventilationPts = 0;
  if (microclimate.voidDeckPorosityPct >= 40) ventilationPts += 15;
  else if (microclimate.voidDeckPorosityPct >= 20) ventilationPts += 10;
  else if (microclimate.voidDeckPorosityPct >= 10) ventilationPts += 5;

  if (microclimate.breezeVelocityMs >= 2.0 && microclimate.breezeVelocityMs <= 3.8) {
    ventilationPts += 10; // optimal comfortable breeze range
  } else if (microclimate.breezeVelocityMs > 0.8) {
    ventilationPts += 5;
  }

  // 3. Biophilic Greenery & Urban Heat Island (Max 25 pts)
  let greeneryPts = 0;
  if (gnpr >= 4.0) greeneryPts += 25; // BCA Green Mark GoldPlus/Platinum requirement
  else if (gnpr >= 3.0) greeneryPts += 18;
  else if (gnpr >= 2.0) greeneryPts += 12;
  else if (gnpr >= 1.0) greeneryPts += 6;

  // 4. Structural Efficiency & Embodied Carbon (Max 15 pts)
  let carbonPts = 0;
  if (embodiedCarbonKgCO2eM2 > 0 && embodiedCarbonKgCO2eM2 <= 700) carbonPts += 15;
  else if (embodiedCarbonKgCO2eM2 <= 800) carbonPts += 11;
  else if (embodiedCarbonKgCO2eM2 <= 900) carbonPts += 7;
  else carbonPts += 3;

  const totalPoints = Math.min(100, energyPts + ventilationPts + greeneryPts + carbonPts);

  let bcaGreenMarkTier: SimulationMetrics['sustainability']['bcaGreenMarkTier'] = 'Certified';
  if (totalPoints >= 90) bcaGreenMarkTier = 'Super Low Energy';
  else if (totalPoints >= 80) bcaGreenMarkTier = 'Platinum';
  else if (totalPoints >= 70) bcaGreenMarkTier = 'GoldPLUS';
  else if (totalPoints >= 60) bcaGreenMarkTier = 'Gold';

  return {
    totalVoxels: voxels.length,
    totalGFA: Math.round(totalGFA),
    residentialUnits: {
      unit2rm,
      unit3rm,
      unit4rm,
      unit5rm,
      totalUnits,
      estResidents,
    },
    sustainability: {
      gnpr,
      pvEnergyGenerationKWhYear,
      embodiedCarbonKgCO2eM2,
      bcaGreenMarkPoints: totalPoints,
      bcaGreenMarkTier,
    },
    costs: {
      substructureSGD,
      ppvcSuperstructureSGD: Math.round(ppvcSuperstructureSGD),
      skyGardenSGD: Math.round(skyGardenSGD),
      glazingSGD,
      solarPVSGD: Math.round(solarPVSGD),
      cantileverReinforcementSGD,
      totalSGD: Math.round(totalCostSGD),
      costPerM2SGD,
    },
  };
}
