export const GRID = 50;
export const BLOCK_METERS = 4;
export const STOREY_METERS = 3;
export const SITE_METERS = 200;
export const MAX_STOREYS = 30;
export const CELL = 2;
export const RESOLUTION = GRID * BLOCK_METERS / CELL;
export type BlockKind = 'building' | 'tree' | 'grass' | 'floor';
export type Layer = 'design' | 'utci' | 'sun' | 'wind';
export type Tool = 'place' | 'erase' | 'inspect' | 'select';
export type Point2 = [number,number];
export interface Block {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: BlockKind;
  porosity?: number;
  crownRadius?: number;
}
export type Typology = 'slab' | 'tower' | 'courtyard';
export interface LayoutConfig {
  typology: Typology;
  storeys: number;
  spacing: number;
  orientation: number;
  porosity: number;
  trees: number;
  greenCover: number;
}
export interface Building {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation: number;
  storeys: number;
  height: number;
  porosity: number;
  name?: string;
  footprint?: Point2[];
  editable?: boolean;
  heightSource?: 'osm_height' | 'estimated_levels' | 'assumed' | 'design';
}
export interface LandFeature {
  id:string;
  kind:'grass'|'park'|'water'|'river';
  points:Point2[];
  holes?:Point2[][];
  type:'polygon'|'line';
  width?:number;
}
export interface SiteContext {
  name:string;
  latitude:number;
  longitude:number;
  fetchedAt:string;
  dataDate?:string;
  source:'OpenStreetMap';
  landscapeStatus:'available'|'unavailable';
  buildings:Building[];
  landcover:LandFeature[];
  note?:string;
}
export interface BuildingDraft {
  width:number;
  depth:number;
  storeys:number;
  rotation:number;
  porosity:number;
}
export const DEFAULT_BUILDING:BuildingDraft={width:16,depth:16,storeys:6,rotation:0,porosity:0};
export interface SiteScene {
  config: LayoutConfig;
  buildings: Building[];
  blocks: Block[];
  edited?: boolean;
  context?:SiteContext;
}
export const DEFAULT_LAYOUT: LayoutConfig = {
  typology:'slab',storeys:14,spacing:44,orientation:0,porosity:.25,trees:32,greenCover:40,
};
export interface Climate {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
}
export interface Environment extends Climate {
  date: string;
  hour: number;
  latitude: number;
  longitude: number;
}
export interface WeatherHour extends Climate {
  time: string;
}
export interface WeatherData {
  source: string;
  fetchedAt: string;
  hours: WeatherHour[];
  current: WeatherHour;
}
export const DEFAULT_ENV: Environment = {
  date: '2026-10-31', hour: 14, latitude: 1.3521, longitude: 103.8198,
  temperature: 31.5, humidity: 75, windSpeed: 2.6, windDirection: 45, cloudCover: 0.25,
};
export const BLOCK_INFO = {
  building: { name: 'Building', color: '#f3e6df', key: 'B' },
  tree: { name: 'Tree', color: '#79ab9a', key: 'T' },
  grass: { name: 'Grass', color: '#b6c6a0', key: 'G' },
  floor: { name: 'Floor', color: '#d8bca7', key: 'F' },
} as const;
