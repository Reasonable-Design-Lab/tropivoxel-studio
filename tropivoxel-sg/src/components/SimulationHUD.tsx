import React, { useState } from 'react';
import {
  MODULE_DEFINITIONS,
  SimulationMetrics,
  VoxelInstance,
} from '../types/voxel';
import {
  ShieldAlert,
  ShieldCheck,
  Sun,
  Wind,
  Layers,
  CircleDollarSign,
  TreePine,
  ChevronRight,
  ChevronLeft,
  Info,
  Building,
  Sparkles,
} from 'lucide-react';

interface SimulationHUDProps {
  metrics: SimulationMetrics;
  inspectedVoxel: VoxelInstance | null;
  onClearInspect: () => void;
  structuralWarnings: string[];
}

export const SimulationHUD: React.FC<SimulationHUDProps> = ({
  metrics,
  inspectedVoxel,
  onClearInspect,
  structuralWarnings,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'climate' | 'structure' | 'costs' | 'units'>('climate');

  // Green Mark tier badge styling
  const getTierColor = (tier: SimulationMetrics['sustainability']['bcaGreenMarkTier']) => {
    switch (tier) {
      case 'Super Low Energy':
        return 'text-emerald-400 bg-emerald-950/80 border-emerald-500/50';
      case 'Platinum':
        return 'text-cyan-400 bg-cyan-950/80 border-cyan-500/50';
      case 'GoldPLUS':
        return 'text-amber-400 bg-amber-950/80 border-amber-500/50';
      case 'Gold':
        return 'text-yellow-400 bg-yellow-950/80 border-yellow-500/50';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-4 z-20 flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700/80 backdrop-blur-md shadow-xl transition-all"
      >
        <ChevronLeft className="w-4 h-4 text-sky-400" />
        <span>Estate Telemetry</span>
      </button>
    );
  }

  return (
    <aside className="fixed top-20 right-4 z-20 w-84 sm:w-96 max-h-[calc(100vh-140px)] flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-slate-200">
      {/* HUD Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              BCA Green Mark 2021
            </span>
          </div>
          <div
            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getTierColor(
              metrics.sustainability.bcaGreenMarkTier
            )}`}
          >
            {metrics.sustainability.bcaGreenMarkTier} · {metrics.sustainability.bcaGreenMarkPoints} pts
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          title="Minimize HUD"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Estate KPIs Strip */}
      <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950/40 border-b border-slate-800/80 text-center font-mono">
        <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">GFA Area</div>
          <div className="text-xs font-bold text-sky-400">{metrics.totalGFA.toLocaleString()} m²</div>
        </div>
        <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">HDB Flats</div>
          <div className="text-xs font-bold text-emerald-400">{metrics.residentialUnits.totalUnits} Units</div>
        </div>
        <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Est. Budget</div>
          <div className="text-xs font-bold text-amber-400">
            S${(metrics.costs.totalSGD / 1000000).toFixed(2)}M
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950/30 text-xs">
        <button
          onClick={() => setActiveTab('climate')}
          className={`flex-1 py-2 text-center font-medium transition-colors border-b-2 ${
            activeTab === 'climate'
              ? 'border-sky-500 text-sky-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Microclimate
        </button>
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex-1 py-2 text-center font-medium transition-colors border-b-2 ${
            activeTab === 'structure'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Structure
        </button>
        <button
          onClick={() => setActiveTab('costs')}
          className={`flex-1 py-2 text-center font-medium transition-colors border-b-2 ${
            activeTab === 'costs'
              ? 'border-amber-500 text-amber-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Costs & BoQ
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`flex-1 py-2 text-center font-medium transition-colors border-b-2 ${
            activeTab === 'units'
              ? 'border-indigo-500 text-indigo-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Units
        </button>
      </div>

      {/* Scrollable Tab Content */}
      <div className="p-3.5 overflow-y-auto space-y-3.5 text-xs">
        {/* TAB 1: MICROCLIMATE & TROPICAL COMFORT */}
        {activeTab === 'climate' && (
          <div className="space-y-3">
            {/* ETTV Envelope Heat Transfer */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Envelope Thermal Value (ETTV)</span>
                </span>
                <span className="font-mono font-bold text-amber-400">
                  {metrics.microclimate.ettvProxy} W/m²
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    metrics.microclimate.ettvProxy <= 40
                      ? 'bg-emerald-500'
                      : metrics.microclimate.ettvProxy <= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.microclimate.ettvProxy / 60) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>Green Mark Target: &lt; 38 W/m²</span>
                <span>BCA Cap: 50 W/m²</span>
              </div>
            </div>

            {/* West Facade Solar Insolation Warning */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-300">
                <span>West Facade Afternoon Gain</span>
                <span className="font-mono text-orange-400 font-semibold">
                  +{metrics.microclimate.westFacadeHeatPenaltyWm2} W/m²
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Singapore afternoon tropical sun strikes west-facing bedrooms. Align blocks North-South or add sky terraces to shade facades.
              </p>
            </div>

            {/* Void Deck Breezeway & Wind Porosity */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Void Deck Porosity</span>
                </span>
                <span className="font-mono font-bold text-cyan-400">
                  {metrics.microclimate.voidDeckPorosityPct}%
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Ground Pedestrian Breeze</span>
                <span className="font-mono text-slate-200">
                  {metrics.microclimate.breezeVelocityMs} m/s
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Open ground colonnades prevent oppressive tropical heat traps at estate plazas.
              </div>
            </div>

            {/* Biophilic Cooling & GnPR */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Green Plot Ratio (GnPR)</span>
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {metrics.sustainability.gnpr} : 1
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px] mt-1">
                <span>Microclimate UHI Temp Drop</span>
                <span className="font-mono text-emerald-300">
                  -{metrics.microclimate.skyTerraceCoolingReductionDegC}°C
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STRUCTURAL INTEGRITY */}
        {activeTab === 'structure' && (
          <div className="space-y-3">
            {/* Structural Compliance Status Banner */}
            <div
              className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${
                metrics.structural.isStructureCompliant
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}
            >
              {metrics.structural.isStructureCompliant ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-bold text-xs">
                  {metrics.structural.isStructureCompliant
                    ? 'Structural Gravity Paths Verified'
                    : 'Structural Support Warning'}
                </div>
                <div className="text-[11px] opacity-80">
                  Integrity Rating: {metrics.structural.overallIntegrityScore} / 100
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Dead Weight</span>
                <span className="text-slate-200">{metrics.structural.totalWeightTonnes.toLocaleString()} Tonnes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Cantilever Span</span>
                <span
                  className={
                    metrics.structural.maxCantilever >= 2 ? 'text-amber-400 font-bold' : 'text-slate-200'
                  }
                >
                  {metrics.structural.maxCantilever} modules (
                  {(metrics.structural.maxCantilever * 3.6).toFixed(1)}m)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ungrounded Voxels</span>
                <span
                  className={
                    metrics.structural.unsupportedVoxelsCount > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'
                  }
                >
                  {metrics.structural.unsupportedVoxelsCount}
                </span>
              </div>
            </div>

            {/* Warnings list */}
            {structuralWarnings.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-amber-400 uppercase">
                  Engineering Notes ({structuralWarnings.length})
                </div>
                {structuralWarnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-amber-950/30 border border-amber-800/50 text-[11px] text-amber-200"
                  >
                    {w}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 rounded bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300">
                All precast modular columns bear directly on foundation piling without excessive cantilever moments.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SINGAPORE COSTS & EMBODIED CARBON */}
        {activeTab === 'costs' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-slate-300 font-semibold">Tender Estimate (SGD)</span>
                <span className="font-mono text-base font-bold text-amber-400">
                  S${metrics.costs.totalSGD.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                <span>Unit Rate</span>
                <span>S${metrics.costs.costPerM2SGD.toLocaleString()} / m² GFA</span>
              </div>
            </div>

            {/* BoQ Breakdown */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 font-mono text-[11px]">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                Bill of Quantities (Singapore Tender)
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Substructure Piling</span>
                <span>S${(metrics.costs.substructureSGD / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PPVC Superstructure</span>
                <span>S${(metrics.costs.ppvcSuperstructureSGD / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sky Terrace Landscaping</span>
                <span>S${(metrics.costs.skyGardenSGD / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Low-E Facade Glazing</span>
                <span>S${(metrics.costs.glazingSGD / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Solar PV Pergolas</span>
                <span>S${(metrics.costs.solarPVSGD / 1000).toFixed(0)}k</span>
              </div>
              {metrics.costs.cantileverReinforcementSGD > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Cantilever Transfer Surcharge</span>
                  <span>+S${(metrics.costs.cantileverReinforcementSGD / 1000).toFixed(0)}k</span>
                </div>
              )}
            </div>

            {/* Embodied Carbon Indicator */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300 font-semibold">Embodied Carbon (A1–A5)</span>
                <span className="font-mono font-bold text-sky-400">
                  {metrics.sustainability.embodiedCarbonKgCO2eM2} kg CO₂e/m²
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Singapore BCA Green Mark Platinum benchmark: &lt; 750 kg CO₂e/m² GFA.
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RESIDENTIAL UNIT BREAKDOWN */}
        {activeTab === 'units' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">
                HDB Housing Estate Composition
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
                    <span className="text-slate-300">2-Room Flexi (36 m²)</span>
                  </span>
                  <span className="text-slate-100 font-bold">{metrics.residentialUnits.unit2rm}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                    <span className="text-slate-300">3-Room (68 m²)</span>
                  </span>
                  <span className="text-slate-100 font-bold">{metrics.residentialUnits.unit3rm}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                    <span className="text-slate-300">4-Room Standard (93 m²)</span>
                  </span>
                  <span className="text-slate-100 font-bold">{metrics.residentialUnits.unit4rm}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                    <span className="text-slate-300">5-Room Executive (113 m²)</span>
                  </span>
                  <span className="text-slate-100 font-bold">{metrics.residentialUnits.unit5rm}</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between text-slate-300">
                <span>Total Flats Planned</span>
                <span className="font-mono font-bold text-sky-400">{metrics.residentialUnits.totalUnits} Units</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px] mt-1 font-mono">
                <span>Estimated Estate Population</span>
                <span>~{metrics.residentialUnits.estResidents} Residents</span>
              </div>
            </div>
          </div>
        )}

        {/* Inspected Voxel Card if active */}
        {inspectedVoxel && (
          <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-500/40 space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between text-sky-300 font-bold">
              <span>SELECTED VOXEL</span>
              <button
                onClick={onClearInspect}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            <div className="text-slate-200">
              {MODULE_DEFINITIONS[inspectedVoxel.moduleType]?.name ?? inspectedVoxel.moduleType}
            </div>
            <div className="text-slate-400">
              Pos: X:{inspectedVoxel.x} · Y:{inspectedVoxel.y} (Level {inspectedVoxel.y + 1}) · Z:{inspectedVoxel.z}
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cantilever Overhang:</span>
              <span className={inspectedVoxel.cantileverDepth >= 2 ? 'text-amber-400' : 'text-emerald-400'}>
                {inspectedVoxel.cantileverDepth} modules
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Compression Stress:</span>
              <span>{(inspectedVoxel.compressionStress * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
