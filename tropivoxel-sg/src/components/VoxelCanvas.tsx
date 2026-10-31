import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  MODULE_DEFINITIONS,
  ModuleType,
  MonsoonRegime,
  ToolMode,
  ViewMode,
  VoxelInstance,
} from '../types/voxel';
import { calculateSingaporeSun, getMonsoonProfile } from '../lib/singapore-climate';
import {
  createProceduralTextures,
  createVoxelMaterials,
  getSimulationColor,
} from '../lib/three-materials';

interface VoxelCanvasProps {
  voxels: VoxelInstance[];
  selectedModule: ModuleType;
  toolMode: ToolMode;
  viewMode: ViewMode;
  timeOfDayHours: number;
  monsoonRegime: MonsoonRegime;
  onAddVoxel: (voxel: Omit<VoxelInstance, 'cantileverDepth' | 'compressionStress' | 'solarExposure' | 'windExposure' | 'isStable'>) => void;
  onRemoveVoxel: (id: string) => void;
  onExtrudeVoxel: (id: string) => void;
  onSelectVoxelForInspect: (voxel: VoxelInstance | null) => void;
}

const VOXEL_SIZE = 1.0; // 1 unit in Three.js = 3.6m PPVC module width
const GRID_SIZE = 16; // 16x16 grid

export const VoxelCanvas: React.FC<VoxelCanvasProps> = ({
  voxels,
  selectedModule,
  toolMode,
  viewMode,
  timeOfDayHours,
  monsoonRegime,
  onAddVoxel,
  onRemoveVoxel,
  onExtrudeVoxel,
  onSelectVoxelForInspect,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References to keep mutable Three.js objects stable across React renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const texturesRef = useRef<ReturnType<typeof createProceduralTextures> | null>(null);
  const materialsRef = useRef<ReturnType<typeof createVoxelMaterials> | null>(null);

  // Voxel meshes group
  const voxelGroupRef = useRef<THREE.Group | null>(null);
  const ghostMeshRef = useRef<THREE.Mesh | null>(null);
  const windParticlesRef = useRef<THREE.Points | null>(null);
  const windGeoRef = useRef<THREE.BufferGeometry | null>(null);

  // Interaction state
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; z: number } | null>(null);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front' | 'sun'>('iso');

  // Ground plane ref for raycasting
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const voxelMeshesMapRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Safe WebGL detection
  const isSoftwareGl = useRef(
    (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })()
  ).current;

  // Sync Sun position with Singapore time of day
  useEffect(() => {
    if (!sunLightRef.current || !sceneRef.current) return;
    const sun = calculateSingaporeSun(timeOfDayHours);

    // Convert azimuth and elevation to 3D Cartesian coordinates
    const phi = (90 - sun.elevationDeg) * (Math.PI / 180);
    const theta = (sun.azimuthDeg + 90) * (Math.PI / 180);

    const radius = 45;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = Math.max(1, radius * Math.cos(phi));
    const z = radius * Math.sin(phi) * Math.sin(theta);

    sunLightRef.current.position.set(x, y, z);
    sunLightRef.current.intensity =
      sun.elevationDeg > 2 ? Math.min(2.8, (sun.directRadiationWm2 / 300) * 1.5) : 0.05;

    // Warm tropical color at sunrise/sunset, bright daylight at noon
    if (sun.elevationDeg < 15) {
      sunLightRef.current.color.setHex(0xfba24f); // Golden amber
    } else if (sun.elevationDeg < 35) {
      sunLightRef.current.color.setHex(0xffedd5); // Soft morning warm
    } else {
      sunLightRef.current.color.setHex(0xffffff); // Pure bright tropical sunlight
    }
  }, [timeOfDayHours]);

  // Main Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a); // Deep modern blueprint slate
    scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
    camera.position.set(18, 16, 26);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Environment Lighting
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting rig
    const hemisphereLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.7);
    scene.add(hemisphereLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(20, 35, 15);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = isSoftwareGl ? 512 : 2048;
    sunLight.shadow.mapSize.height = isSoftwareGl ? 512 : 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 100;
    const d = 16;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Soft fill light
    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.4);
    fillLight.position.set(-20, 15, -20);
    scene.add(fillLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 3, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera dipping below ground
    controls.minDistance = 6;
    controls.maxDistance = 65;
    controlsRef.current = controls;

    // Procedural Textures & Materials
    const textures = createProceduralTextures(renderer);
    texturesRef.current = textures;
    materialsRef.current = createVoxelMaterials(textures);

    // Voxel Group
    const voxelGroup = new THREE.Group();
    scene.add(voxelGroup);
    voxelGroupRef.current = voxelGroup;

    // 1. Ground Plane (Singapore Estate site with coordinate grid & parklands)
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = !isSoftwareGl;
    scene.add(ground);
    groundMeshRef.current = ground;

    // Build parcel boundary (16x16 voxels centered at origin)
    const parcelGeo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const parcelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const parcel = new THREE.Mesh(parcelGeo, parcelMat);
    parcel.rotation.x = -Math.PI / 2;
    parcel.position.y = 0.01;
    parcel.receiveShadow = !isSoftwareGl;
    scene.add(parcel);

    // Architectural Grid Overlay
    const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0x38bdf8, 0x334155);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // Add perimeter road & tropical park trees around site
    const perimeterTreesGroup = new THREE.Group();
    const treeTrunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const foliageGeo = new THREE.DodecahedronGeometry(0.8, 1);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.85 });

    // Plant tropical rain trees and palms around perimeter
    const treePositions = [
      [-10, 0, -10], [-10, 0, -5], [-10, 0, 5], [-10, 0, 10],
      [10, 0, -10], [10, 0, -5], [10, 0, 5], [10, 0, 10],
      [-5, 0, -10], [5, 0, -10], [-5, 0, 10], [5, 0, 10]
    ];
    treePositions.forEach(([tx, ty, tz]) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
      trunk.position.y = 0.6;
      trunk.castShadow = !isSoftwareGl;
      tree.add(trunk);
      const canopy = new THREE.Mesh(foliageGeo, foliageMat);
      canopy.position.y = 1.6;
      canopy.scale.set(1.2, 0.9, 1.2);
      canopy.castShadow = !isSoftwareGl;
      tree.add(canopy);
      tree.position.set(tx, ty, tz);
      perimeterTreesGroup.add(tree);
    });
    scene.add(perimeterTreesGroup);

    // Ghost Preview Mesh for Interactive Placement
    const ghostGeo = new THREE.BoxGeometry(VOXEL_SIZE * 0.98, VOXEL_SIZE * 0.98, VOXEL_SIZE * 0.98);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      wireframe: false,
    });
    const ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
    ghostMesh.visible = false;
    scene.add(ghostMesh);
    ghostMeshRef.current = ghostMesh;

    // Wind Streamline Particles
    const particleCount = 450;
    const windPositions = new Float32Array(particleCount * 3);
    const windGeo = new THREE.BufferGeometry();
    for (let i = 0; i < particleCount; i++) {
      windPositions[i * 3] = (Math.random() - 0.5) * 28;
      windPositions[i * 3 + 1] = Math.random() * 12 + 0.5;
      windPositions[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    windGeo.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));
    windGeoRef.current = windGeo;

    const windMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.22,
      transparent: true,
      opacity: 0.65,
    });
    const windParticles = new THREE.Points(windGeo, windMat);
    scene.add(windParticles);
    windParticlesRef.current = windParticles;

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      controls.update();

      // Animate Wind Streamlines based on current monsoon
      if (windGeoRef.current && windParticlesRef.current) {
        const monsoon = getMonsoonProfile(monsoonRegime);
        const positions = windGeoRef.current.attributes.position.array as Float32Array;
        const speed = monsoon.avgSpeedMs * 1.8 * delta;

        for (let i = 0; i < particleCount; i++) {
          positions[i * 3] += monsoon.vector[0] * speed;
          positions[i * 3 + 2] += monsoon.vector[2] * speed;

          // Wrap around boundary
          if (Math.abs(positions[i * 3]) > 16) {
            positions[i * 3] = -monsoon.vector[0] * 16 + (Math.random() - 0.5) * 4;
          }
          if (Math.abs(positions[i * 3 + 2]) > 16) {
            positions[i * 3 + 2] = -monsoon.vector[2] * 16 + (Math.random() - 0.5) * 4;
          }
        }
        windGeoRef.current.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Voxels in 3D scene when voxels array, materials, or viewMode changes
  useEffect(() => {
    if (!voxelGroupRef.current || !materialsRef.current) return;
    const group = voxelGroupRef.current;

    // Clear old meshes
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    voxelMeshesMapRef.current.clear();

    const boxGeo = new THREE.BoxGeometry(VOXEL_SIZE * 0.98, VOXEL_SIZE * 0.98, VOXEL_SIZE * 0.98);

    voxels.forEach((v) => {
      let material: THREE.Material;

      if (viewMode === 'realistic') {
        material = materialsRef.current![v.moduleType];
      } else {
        // Simulation heatmap mode (Solar, Wind, Structural)
        const simColor = getSimulationColor(viewMode, v);
        material = new THREE.MeshStandardMaterial({
          color: simColor,
          roughness: 0.4,
          metalness: 0.1,
        });
      }

      const mesh = new THREE.Mesh(boxGeo, material);
      // Three.js grid centered: 16x16 grid maps coordinates (0..15) to (-7.5 .. +7.5)
      const posX = v.x - GRID_SIZE / 2 + 0.5;
      const posY = v.y * VOXEL_SIZE + VOXEL_SIZE / 2;
      const posZ = v.z - GRID_SIZE / 2 + 0.5;

      mesh.position.set(posX, posY, posZ);
      mesh.castShadow = !isSoftwareGl;
      mesh.receiveShadow = !isSoftwareGl;
      mesh.userData = { voxelId: v.id, voxel: v };

      group.add(mesh);
      voxelMeshesMapRef.current.set(v.id, mesh);
    });
  }, [voxels, viewMode, isSoftwareGl]);

  // Raycasting helper for hover and clicking
  const getRaycastIntersection = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!mountRef.current || !cameraRef.current || !groundMeshRef.current || !voxelGroupRef.current) {
        return null;
      }
      const rect = mountRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check voxels first, then ground
      const voxelIntersects = raycaster.intersectObjects(voxelGroupRef.current.children, false);
      if (voxelIntersects.length > 0) {
        const hit = voxelIntersects[0];
        const voxel = hit.object.userData.voxel as VoxelInstance;
        const normal = hit.face?.normal ?? new THREE.Vector3(0, 1, 0);

        return {
          type: 'voxel' as const,
          voxel,
          hitMesh: hit.object as THREE.Mesh,
          normal,
          point: hit.point,
        };
      }

      // Check ground plane
      const groundIntersects = raycaster.intersectObject(groundMeshRef.current, false);
      if (groundIntersects.length > 0) {
        const hit = groundIntersects[0];
        // Convert world position back to voxel coordinate (0..15)
        const gridX = Math.floor(hit.point.x + GRID_SIZE / 2);
        const gridZ = Math.floor(hit.point.z + GRID_SIZE / 2);
        if (gridX >= 0 && gridX < GRID_SIZE && gridZ >= 0 && gridZ < GRID_SIZE) {
          return {
            type: 'ground' as const,
            gridX,
            gridY: 0,
            gridZ,
            point: hit.point,
          };
        }
      }

      return null;
    },
    []
  );

  // Mouse move handler (ghost positioning & coordinate tracking)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const hit = getRaycastIntersection(e);
      if (!hit || !ghostMeshRef.current) {
        if (ghostMeshRef.current) ghostMeshRef.current.visible = false;
        setHoverCoord(null);
        return;
      }

      let targetX = 0;
      let targetY = 0;
      let targetZ = 0;

      if (hit.type === 'ground') {
        targetX = hit.gridX;
        targetY = 0;
        targetZ = hit.gridZ;
      } else if (hit.type === 'voxel') {
        if (toolMode === 'erase' || toolMode === 'inspect') {
          targetX = hit.voxel.x;
          targetY = hit.voxel.y;
          targetZ = hit.voxel.z;
        } else {
          // Stacking on top or adjacent to existing voxel based on face normal
          targetX = hit.voxel.x + Math.round(hit.normal.x);
          targetY = hit.voxel.y + Math.round(hit.normal.y);
          targetZ = hit.voxel.z + Math.round(hit.normal.z);
        }
      }

      // Clamp to build volume
      if (targetX >= 0 && targetX < GRID_SIZE && targetZ >= 0 && targetZ < GRID_SIZE && targetY >= 0 && targetY < 24) {
        setHoverCoord({ x: targetX, y: targetY, z: targetZ });
        const worldX = targetX - GRID_SIZE / 2 + 0.5;
        const worldY = targetY * VOXEL_SIZE + VOXEL_SIZE / 2;
        const worldZ = targetZ - GRID_SIZE / 2 + 0.5;

        ghostMeshRef.current.position.set(worldX, worldY, worldZ);
        ghostMeshRef.current.visible = true;

        // Change ghost preview color based on active tool
        const ghostMat = ghostMeshRef.current.material as THREE.MeshBasicMaterial;
        if (toolMode === 'erase') {
          ghostMat.color.setHex(0xef4444); // Red for erase
          ghostMat.opacity = 0.6;
        } else if (toolMode === 'inspect') {
          ghostMat.color.setHex(0x10b981); // Emerald for inspect
          ghostMat.opacity = 0.5;
        } else {
          ghostMat.color.setHex(0x38bdf8); // Cyan for placement
          ghostMat.opacity = 0.45;
        }
      } else {
        ghostMeshRef.current.visible = false;
        setHoverCoord(null);
      }
    },
    [getRaycastIntersection, toolMode]
  );

  // Click handler (placing, erasing, extruding, or inspecting)
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Ignore if user was dragging camera with right click
      if (e.button !== 0) return;

      const hit = getRaycastIntersection(e);
      if (!hit) return;

      if (toolMode === 'erase') {
        if (hit.type === 'voxel') {
          onRemoveVoxel(hit.voxel.id);
        }
      } else if (toolMode === 'extrude') {
        if (hit.type === 'voxel') {
          onExtrudeVoxel(hit.voxel.id);
        }
      } else if (toolMode === 'inspect') {
        if (hit.type === 'voxel') {
          onSelectVoxelForInspect(hit.voxel);
        } else {
          onSelectVoxelForInspect(null);
        }
      } else {
        // 'place' mode
        let tx = 0;
        let ty = 0;
        let tz = 0;

        if (hit.type === 'ground') {
          tx = hit.gridX;
          ty = 0;
          tz = hit.gridZ;
        } else if (hit.type === 'voxel') {
          tx = hit.voxel.x + Math.round(hit.normal.x);
          ty = hit.voxel.y + Math.round(hit.normal.y);
          tz = hit.voxel.z + Math.round(hit.normal.z);
        }

        if (tx >= 0 && tx < GRID_SIZE && tz >= 0 && tz < GRID_SIZE && ty >= 0 && ty < 24) {
          // Check if voxel already exists at this spot
          const alreadyExists = voxels.some((v) => v.x === tx && v.y === ty && v.z === tz);
          if (!alreadyExists) {
            onAddVoxel({
              id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              x: tx,
              y: ty,
              z: tz,
              moduleType: selectedModule,
            });
          }
        }
      }
    },
    [getRaycastIntersection, toolMode, voxels, selectedModule, onAddVoxel, onRemoveVoxel, onExtrudeVoxel, onSelectVoxelForInspect]
  );

  // Drag over handler for HTML5 drag-and-drop from bottom module dock
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const moduleType = e.dataTransfer.getData('application/tropivoxel-module') as ModuleType;
      if (!moduleType || !MODULE_DEFINITIONS[moduleType]) return;

      const hit = getRaycastIntersection(e as unknown as React.MouseEvent<HTMLDivElement>);
      if (!hit) return;

      let tx = 0;
      let ty = 0;
      let tz = 0;

      if (hit.type === 'ground') {
        tx = hit.gridX;
        ty = 0;
        tz = hit.gridZ;
      } else if (hit.type === 'voxel') {
        tx = hit.voxel.x + Math.round(hit.normal.x);
        ty = hit.voxel.y + Math.round(hit.normal.y);
        tz = hit.voxel.z + Math.round(hit.normal.z);
      }

      if (tx >= 0 && tx < GRID_SIZE && tz >= 0 && tz < GRID_SIZE && ty >= 0 && ty < 24) {
        const alreadyExists = voxels.some((v) => v.x === tx && v.y === ty && v.z === tz);
        if (!alreadyExists) {
          onAddVoxel({
            id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            x: tx,
            y: ty,
            z: tz,
            moduleType,
          });
        }
      }
    },
    [getRaycastIntersection, voxels, onAddVoxel]
  );

  // Camera Presets
  const applyCameraPreset = (preset: 'iso' | 'top' | 'front' | 'sun') => {
    if (!cameraRef.current || !controlsRef.current) return;
    setCameraPreset(preset);

    if (preset === 'iso') {
      cameraRef.current.position.set(18, 16, 26);
      controlsRef.current.target.set(0, 3, 0);
    } else if (preset === 'top') {
      cameraRef.current.position.set(0, 38, 0.1);
      controlsRef.current.target.set(0, 0, 0);
    } else if (preset === 'front') {
      // South elevation (looking North)
      cameraRef.current.position.set(0, 6, 32);
      controlsRef.current.target.set(0, 5, 0);
    } else if (preset === 'sun') {
      // West afternoon facade inspection view
      cameraRef.current.position.set(-28, 12, 0);
      controlsRef.current.target.set(0, 4, 0);
    }
    controlsRef.current.update();
  };

  return (
    <div
      ref={mountRef}
      className="w-full h-full relative cursor-crosshair overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 3D Viewport Minimal Camera Angle Switcher (Top Left HUD) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 p-1 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/60 shadow-lg text-xs text-slate-300">
        <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">View</span>
        <button
          onClick={() => applyCameraPreset('iso')}
          className={`px-2.5 py-1 rounded font-medium transition-colors ${
            cameraPreset === 'iso' ? 'bg-sky-500 text-white shadow-sm' : 'hover:text-white hover:bg-slate-800'
          }`}
        >
          Perspective
        </button>
        <button
          onClick={() => applyCameraPreset('top')}
          className={`px-2.5 py-1 rounded font-medium transition-colors ${
            cameraPreset === 'top' ? 'bg-sky-500 text-white shadow-sm' : 'hover:text-white hover:bg-slate-800'
          }`}
        >
          Plan (Top)
        </button>
        <button
          onClick={() => applyCameraPreset('front')}
          className={`px-2.5 py-1 rounded font-medium transition-colors ${
            cameraPreset === 'front' ? 'bg-sky-500 text-white shadow-sm' : 'hover:text-white hover:bg-slate-800'
          }`}
        >
          North-South
        </button>
        <button
          onClick={() => applyCameraPreset('sun')}
          className={`px-2.5 py-1 rounded font-medium transition-colors ${
            cameraPreset === 'sun' ? 'bg-sky-500 text-white shadow-sm' : 'hover:text-white hover:bg-slate-800'
          }`}
        >
          West Facade
        </button>
      </div>

      {/* Real-time Cursor Coordinate Pill (Bottom Left) */}
      <div className="absolute bottom-24 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-md text-xs font-mono text-slate-300">
        <span className="text-slate-400">GRID</span>
        <span>
          {hoverCoord ? `X:${hoverCoord.x}  Y:${hoverCoord.y} (L${hoverCoord.y + 1})  Z:${hoverCoord.z}` : 'HOVER ESTATE GRID'}
        </span>
        <span className="text-slate-500">·</span>
        <span className="text-sky-400 font-medium uppercase">{toolMode}</span>
      </div>

      {/* Compass Orientation Indicator (Bottom Right) */}
      <div className="absolute bottom-24 right-4 z-10 flex items-center gap-3 px-3 py-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-md text-xs text-slate-300">
        <div className="flex items-center gap-1 font-mono">
          <span className="text-red-400 font-bold">N</span>
          <span className="text-slate-500">0°</span>
        </div>
        <div className="flex items-center gap-1 font-mono">
          <span className="text-amber-400 font-bold">W</span>
          <span className="text-slate-500">270° (Harsh Sun)</span>
        </div>
      </div>
    </div>
  );
};
