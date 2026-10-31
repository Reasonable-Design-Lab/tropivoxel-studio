import React, { useState } from 'react';
import {
  MODULE_DEFINITIONS,
  ModuleCategory,
  ModuleType,
  ToolMode,
} from '../types/voxel';
import {
  ChevronDown,
  ChevronUp,
  PlusCircle,
  ArrowUpToLine,
  Trash2,
  HelpCircle,
  GripHorizontal,
  Home,
  Sprout,
  SunMedium,
  Building2,
  Wind,
} from 'lucide-react';

interface PPVCModuleDockProps {
  selectedModule: ModuleType;
  onSelectModule: (module: ModuleType) => void;
  toolMode: ToolMode;
  onSelectToolMode: (mode: ToolMode) => void;
}

export const PPVCModuleDock: React.FC<PPVCModuleDockProps> = ({
  selectedModule,
  onSelectModule,
  toolMode,
  onSelectToolMode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ModuleCategory | 'all'>('all');

  const categories: { id: ModuleCategory | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Modules', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'ground', label: 'Void Breezeways', icon: <Wind className="w-3.5 h-3.5" /> },
    { id: 'residential', label: 'PPVC Apartments', icon: <Home className="w-3.5 h-3.5" /> },
    { id: 'greenery', label: 'Sky Terraces', icon: <Sprout className="w-3.5 h-3.5" /> },
    { id: 'core', label: 'Core & Solar', icon: <SunMedium className="w-3.5 h-3.5" /> },
  ];

  const filteredModules = Object.values(MODULE_DEFINITIONS).filter((m) =>
    activeCategory === 'all' ? true : m.category === activeCategory
  );

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
      }`}
      style={{ maxWidth: 'min(980px, 94vw)', width: '100%' }}
    >
      {/* Collapse Toggle Handle */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-4 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold uppercase tracking-wider rounded-t-lg border-t border-x border-slate-700/80 backdrop-blur-md shadow-lg transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show PPVC Library</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Hide Dock</span>
            </>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Dock Container */}
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-3 shadow-2xl flex flex-col gap-2.5">
        {/* Top Control Strip: Tool Selector & Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2">
          {/* Tool Modes */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => onSelectToolMode('place')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                toolMode === 'place'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Click or drag module to place"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Place</span>
            </button>
            <button
              onClick={() => onSelectToolMode('extrude')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                toolMode === 'extrude'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Click existing block to stack upward"
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
              <span>Extrude</span>
            </button>
            <button
              onClick={() => onSelectToolMode('erase')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                toolMode === 'erase'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Click module to delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Erase</span>
            </button>
            <button
              onClick={() => onSelectToolMode('inspect')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                toolMode === 'inspect'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Inspect structural load & microclimate metrics"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Inspect</span>
            </button>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.icon}
                <span className="hidden sm:inline">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modules Horizontal Carousel Cards */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
          {filteredModules.map((m) => {
            const isSelected = selectedModule === m.type;
            return (
              <div
                key={m.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/tropivoxel-module', m.type);
                  e.dataTransfer.effectAllowed = 'copy';
                  onSelectModule(m.type);
                  if (toolMode !== 'place') onSelectToolMode('place');
                }}
                onClick={() => {
                  onSelectModule(m.type);
                  if (toolMode !== 'place') onSelectToolMode('place');
                }}
                className={`flex-shrink-0 w-44 p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing text-left group ${
                  isSelected
                    ? 'bg-slate-800/90 border-sky-500 shadow-md shadow-sky-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {/* Header: Color Swatch + Drag Handle */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-black/20"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      {m.category}
                    </span>
                  </div>
                  <GripHorizontal className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                </div>

                {/* Module Title */}
                <h4 className="text-xs font-bold text-slate-100 truncate mb-1" title={m.name}>
                  {m.name}
                </h4>

                {/* Key Spec */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{m.areaM2} m² GFA</span>
                  <span className="text-slate-300 font-semibold">S${m.costPerM2SGD}/m²</span>
                </div>

                {/* Secondary Spec (Porosity or Carbon) */}
                <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Porosity: {Math.round(m.windPorosity * 100)}%</span>
                  <span>{m.weightTonnes}T</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
