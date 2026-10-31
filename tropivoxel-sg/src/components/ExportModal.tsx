import React from 'react';
import { SimulationMetrics, VoxelInstance, MODULE_DEFINITIONS } from '../types/voxel';
import {
  X,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Building2,
  TreePine,
  Sun,
  Wind,
  FileArchive,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: SimulationMetrics;
  voxels: VoxelInstance[];
  estateName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  metrics,
  voxels,
  estateName,
}) => {
  if (!isOpen) return null;

  const handleDownloadCSV = () => {
    // Generate CSV data of the building configuration & costs
    const rows = [
      ['TropiVoxel SG - Singapore HDB BTO Feasibility & Cost Report'],
      ['Estate Model', estateName],
      ['Date', new Date().toLocaleDateString('en-SG')],
      [''],
      ['EXECUTIVE SUMMARY'],
      ['Total Gross Floor Area (GFA m2)', metrics.totalGFA],
      ['Total Planned Units', metrics.residentialUnits.totalUnits],
      ['Estimated Residents', metrics.residentialUnits.estResidents],
      ['Total Estimated Budget (SGD)', metrics.costs.totalSGD],
      ['Unit Rate (SGD / m2 GFA)', metrics.costs.costPerM2SGD],
      ['Embodied Carbon (kg CO2e / m2 GFA)', metrics.sustainability.embodiedCarbonKgCO2eM2],
      ['BCA Green Mark 2021 Score', `${metrics.sustainability.bcaGreenMarkPoints} (${metrics.sustainability.bcaGreenMarkTier})`],
      [''],
      ['MICROCLIMATE & TROPICAL PERFORMANCE'],
      ['Envelope Thermal Transfer Value ETTV (W/m2)', metrics.microclimate.ettvProxy],
      ['Void Deck Porosity (%)', metrics.microclimate.voidDeckPorosityPct],
      ['Pedestrian Breezeway Velocity (m/s)', metrics.microclimate.breezeVelocityMs],
      ['Green Plot Ratio (GnPR)', metrics.sustainability.gnpr],
      ['Rooftop Solar PV Yield (kWh/year)', metrics.sustainability.pvEnergyGenerationKWhYear],
      [''],
      ['SINGAPORE TENDER BILL OF QUANTITIES (SGD)'],
      ['Substructure & Foundation Piling', metrics.costs.substructureSGD],
      ['PPVC Modular Superstructure', metrics.costs.ppvcSuperstructureSGD],
      ['Sky Terrace & Vertical Greenery', metrics.costs.skyGardenSGD],
      ['Low-E High Performance Glazing', metrics.costs.glazingSGD],
      ['Solar PV Pergola Canopy', metrics.costs.solarPVSGD],
      ['Cantilever Transfer Surcharge', metrics.costs.cantileverReinforcementSGD],
      ['Total Construction Budget', metrics.costs.totalSGD],
      [''],
      ['VOXEL INVENTORY'],
      ['Voxel ID', 'X', 'Y (Floor)', 'Z', 'Module Type', 'Area m2', 'Cost SGD', 'Cantilever Depth', 'Stable'],
      ...voxels.map((v) => {
        const def = MODULE_DEFINITIONS[v.moduleType];
        return [
          v.id,
          v.x,
          v.y + 1,
          v.z,
          def?.name ?? v.moduleType,
          def?.areaM2 ?? 0,
          (def?.areaM2 ?? 0) * (def?.costPerM2SGD ?? 0),
          v.cantileverDepth,
          v.isStable ? 'YES' : 'NO',
        ];
      }),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TropiVoxel_SG_${estateName.replace(/\s+/g, '_')}_BoQ.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              <span>Singapore Architectural & Tender BoQ Report</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Estate: {estateName} · BCA Green Mark 2021 & SG Tender Benchmarks
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-mono">
          {/* Executive Scorecard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Gross Floor Area</div>
              <div className="text-base font-bold text-white mt-1">
                {metrics.totalGFA.toLocaleString()} m²
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {metrics.residentialUnits.totalUnits} HDB Units
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Total Budget (SGD)</div>
              <div className="text-base font-bold text-amber-400 mt-1">
                S${(metrics.costs.totalSGD / 1000000).toFixed(2)}M
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                S${metrics.costs.costPerM2SGD}/m² GFA
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Green Mark Rating</div>
              <div className="text-base font-bold text-emerald-400 mt-1">
                {metrics.sustainability.bcaGreenMarkTier}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {metrics.sustainability.bcaGreenMarkPoints} / 100 Points
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Embodied Carbon</div>
              <div className="text-base font-bold text-sky-400 mt-1">
                {metrics.sustainability.embodiedCarbonKgCO2eM2} kg
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">CO₂e / m² GFA</div>
            </div>
          </div>

          {/* Tropical Microclimate Compliance Summary */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span>Tropical Microclimate & Thermal Performance</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">ETTV Envelope Thermal Value:</span>
                <span className="text-slate-200 font-bold">
                  {metrics.microclimate.ettvProxy} W/m² (Cap: &lt;50 W/m²)
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Ground Void Deck Porosity:</span>
                <span className="text-cyan-400 font-bold">
                  {metrics.microclimate.voidDeckPorosityPct}%
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Green Plot Ratio (GnPR):</span>
                <span className="text-emerald-400 font-bold">{metrics.sustainability.gnpr} : 1</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Solar PV Clean Generation:</span>
                <span className="text-amber-400 font-bold">
                  {metrics.sustainability.pvEnergyGenerationKWhYear.toLocaleString()} kWh/yr
                </span>
              </div>
            </div>
          </div>

          {/* Singapore Tender Bill of Quantities Table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-right">Quantity / Benchmark</th>
                  <th className="py-2.5 px-3 text-right">Amount (SGD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                <tr>
                  <td className="py-2 px-3 text-slate-300">Substructure Piling & Excavation</td>
                  <td className="py-2 px-3 text-right text-slate-400">{metrics.totalGFA} m² @ S$350/m²</td>
                  <td className="py-2 px-3 text-right text-slate-100 font-bold">
                    S${metrics.costs.substructureSGD.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-300">PPVC Modular Units (Reinforced Concrete)</td>
                  <td className="py-2 px-3 text-right text-slate-400">
                    {metrics.residentialUnits.totalUnits} Flat Modules
                  </td>
                  <td className="py-2 px-3 text-right text-slate-100 font-bold">
                    S${metrics.costs.ppvcSuperstructureSGD.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-300">Sky Terraces, Green Roofs & Irrigation</td>
                  <td className="py-2 px-3 text-right text-slate-400">Multi-tier tropical planting</td>
                  <td className="py-2 px-3 text-right text-slate-100 font-bold">
                    S${metrics.costs.skyGardenSGD.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-300">High-Performance Low-E Facade Glazing</td>
                  <td className="py-2 px-3 text-right text-slate-400">Acoustic & thermal louvered</td>
                  <td className="py-2 px-3 text-right text-slate-100 font-bold">
                    S${metrics.costs.glazingSGD.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-300">Rooftop Solar PV Pergolas</td>
                  <td className="py-2 px-3 text-right text-slate-400">Monocrystalline bifacial</td>
                  <td className="py-2 px-3 text-right text-slate-100 font-bold">
                    S${metrics.costs.solarPVSGD.toLocaleString()}
                  </td>
                </tr>
                {metrics.costs.cantileverReinforcementSGD > 0 && (
                  <tr>
                    <td className="py-2 px-3 text-amber-300">Cantilever Structural Outriggers & Transfer</td>
                    <td className="py-2 px-3 text-right text-amber-400">Special structural allowance</td>
                    <td className="py-2 px-3 text-right text-amber-300 font-bold">
                      S${metrics.costs.cantileverReinforcementSGD.toLocaleString()}
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-950 font-bold text-xs">
                  <td className="py-3 px-3 text-white">Total Construction Tender Estimate</td>
                  <td className="py-3 px-3 text-right text-slate-400">Net SGD</td>
                  <td className="py-3 px-3 text-right text-amber-400">
                    S${metrics.costs.totalSGD.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            * Calibrated against BCA Building & Construction Authority Singapore standards.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV BoQ</span>
            </button>
            <a
              href="/tropivoxel-sg-project.zip"
              download="tropivoxel-sg-project.zip"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md shadow-sky-500/20 transition-all cursor-pointer"
              title="Download entire application codebase and configuration as a ZIP archive"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Download Project (.ZIP)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
