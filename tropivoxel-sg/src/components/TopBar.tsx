import React from 'react';
import { MonsoonRegime, ViewMode } from '../types/voxel';
import { PRESETS } from '../lib/presets';
import { calculateSingaporeSun, getMonsoonProfile } from '../lib/singapore-climate';
import {
  Sun,
  Wind,
  Layers,
  FileSpreadsheet,
  RotateCcw,
  Undo2,
  Compass,
  FileArchive,
} from 'lucide-react';

interface TopBarProps {
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  timeOfDayHours: number;
  onChangeTimeOfDay: (hours: number) => void;
  monsoonRegime: MonsoonRegime;
  onToggleMonsoon: () => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onUndo: () => void;
  canUndo: boolean;
  onReset: () => void;
  onOpenExportModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePresetId,
  onSelectPreset,
  timeOfDayHours,
  onChangeTimeOfDay,
  monsoonRegime,
  onToggleMonsoon,
  viewMode,
  onChangeViewMode,
  onUndo,
  canUndo,
  onReset,
  onOpenExportModal,
}) => {
  const sun = calculateSingaporeSun(timeOfDayHours);
  const monsoon = getMonsoonProfile(monsoonRegime);

  // Format decimal hour to 24-hr time (e.g. 14.5 -> 14:30)
  const hourInt = Math.floor(timeOfDayHours);
  const minutes = Math.round((timeOfDayHours - hourInt) * 60);
  const formattedTime = `${hourInt.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} SGT`;

  return (
    <header className="h-16 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between gap-6 shrink-0 z-20 text-slate-200">
      {/* Zone 1: Brand Wordmark (One element, strictly conforming to Top Bar contract) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-sky-500/20">
            TV
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-white whitespace-nowrap">
              TropiVoxel SG
            </span>
            <span className="text-[10px] text-slate-400 whitespace-nowrap">
              HDB BTO Microclimate Studio
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Navigation & Simulation Parameters */}
      <div className="hidden lg:flex items-center gap-5">
        {/* Estate Presets Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider">
            Estate Preset
          </span>
          <select
            value={activePresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="bg-slate-900 text-xs text-sky-300 font-medium rounded-md px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Singapore Daylight & Sun Position Slider */}
        <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-slate-200">{formattedTime}</span>
          </div>
          <input
            type="range"
            min={7.0}
            max={19.0}
            step={0.25}
            value={timeOfDayHours}
            onChange={(e) => onChangeTimeOfDay(parseFloat(e.target.value))}
            className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            title="Slide diurnal solar time (07:00 to 19:00 SGT)"
          />
          <span className="text-[11px] font-mono text-slate-400">
            {sun.elevationDeg}° Alt · {sun.azimuthDeg}° Az
          </span>
        </div>

        {/* Monsoon Regime Toggle */}
        <button
          onClick={onToggleMonsoon}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/90 rounded-lg border border-slate-700/60 transition-colors text-xs text-slate-300 hover:text-white"
          title="Click to toggle Singapore monsoon season"
        >
          <Wind className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium">{monsoon.name}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-cyan-300">
            {monsoon.avgSpeedMs} m/s
          </span>
        </button>

        {/* View Mode Segmented Selector */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs">
          <button
            onClick={() => onChangeViewMode('realistic')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              viewMode === 'realistic' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Realistic
          </button>
          <button
            onClick={() => onChangeViewMode('solar_heat')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              viewMode === 'solar_heat' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Solar Insolation
          </button>
          <button
            onClick={() => onChangeViewMode('wind_flow')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              viewMode === 'wind_flow' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Wind Porosity
          </button>
          <button
            onClick={() => onChangeViewMode('structural_stress')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              viewMode === 'structural_stress' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Structural Stress
          </button>
        </div>
      </div>

      {/* Zone 3: Actions & Primary CTA */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-lg border border-slate-700 transition-colors ${
            canUndo ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 border-slate-800 cursor-not-allowed'
          }`}
          title="Undo last change"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onReset}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
          title="Reset to blank site"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Download Project Source ZIP */}
        <a
          href="/tropivoxel-sg-project.zip"
          download="tropivoxel-sg-project.zip"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          title="Download complete source code and assets as a ZIP archive"
        >
          <FileArchive className="w-4 h-4 text-sky-400" />
          <span>ZIP</span>
        </a>

        {/* Primary CTA: Export Analysis & Cost BoQ */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 rounded-lg shadow-sm shadow-emerald-500/20 transition-all whitespace-nowrap"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export BCA BoQ</span>
        </button>
      </div>
    </header>
  );
};
