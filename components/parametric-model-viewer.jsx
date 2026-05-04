"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const colorMap = {
  Grafite: "#2d3436",
  Areia: "#c8b89c",
  Terracota: "#b76147",
  "Cinza nevoa": "#aab2ae",
  "Verde mineral": "#6f8578"
};

export function canRenderParametricModel(format) {
  return format?.drawingType === "tube-round";
}

export function ParametricModelViewer({ format, values, color }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const modelColor = colorMap[color] || colorMap.Grafite;
  const dimensions = useMemo(() => getTubeRoundDimensions(values), [values]);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 1000);
    camera.position.set(58, 42, 68);

    const modelGroup = new THREE.Group();
    modelGroup.rotation.x = -0.12;
    scene.add(modelGroup);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xc8d2cf, 2.2);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(32, 48, 36);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd7f2ee, 1.1);
    fillLight.position.set(-42, 18, -28);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(84, 14, 0x9faca7, 0xd5ddda);
    grid.position.y = -0.1;
    grid.material.opacity = 0.38;
    grid.material.transparent = true;
    scene.add(grid);

    const axes = buildReferenceAxes();
    scene.add(axes);

    const state = {
      dragging: false,
      lastX: 0,
      lastY: 0,
      yaw: -0.72,
      pitch: 0.42,
      distance: 98,
      frame: 0
    };

    function resize() {
      const rect = host.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(340, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function updateCamera() {
      const pitch = Math.max(-0.12, Math.min(1.12, state.pitch));
      const x = Math.sin(state.yaw) * Math.cos(pitch) * state.distance;
      const y = Math.sin(pitch) * state.distance;
      const z = Math.cos(state.yaw) * Math.cos(pitch) * state.distance;
      camera.position.set(x, y, z);
      camera.lookAt(0, dimensions.totalHeight / 2, 0);
    }

    function animate() {
      state.frame = window.requestAnimationFrame(animate);
      updateCamera();
      renderer.render(scene, camera);
    }

    function pointerDown(event) {
      state.dragging = true;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      host.setPointerCapture?.(event.pointerId);
    }

    function pointerMove(event) {
      if (!state.dragging) {
        return;
      }

      const dx = event.clientX - state.lastX;
      const dy = event.clientY - state.lastY;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.yaw -= dx * 0.008;
      state.pitch -= dy * 0.006;
    }

    function pointerUp(event) {
      state.dragging = false;
      host.releasePointerCapture?.(event.pointerId);
    }

    function wheel(event) {
      event.preventDefault();
      state.distance = Math.max(54, Math.min(142, state.distance + event.deltaY * 0.045));
    }

    sceneRef.current = { scene, modelGroup, renderer, camera, resize };
    host.addEventListener("pointerdown", pointerDown);
    host.addEventListener("pointermove", pointerMove);
    host.addEventListener("pointerup", pointerUp);
    host.addEventListener("pointercancel", pointerUp);
    host.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("resize", resize);
    resize();
    animate();

    return () => {
      window.cancelAnimationFrame(state.frame);
      window.removeEventListener("resize", resize);
      host.removeEventListener("pointerdown", pointerDown);
      host.removeEventListener("pointermove", pointerMove);
      host.removeEventListener("pointerup", pointerUp);
      host.removeEventListener("pointercancel", pointerUp);
      host.removeEventListener("wheel", wheel);
      renderer.dispose();
      disposeGroup(modelGroup);
      scene.remove(modelGroup);
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, [dimensions.totalHeight]);

  useEffect(() => {
    const current = sceneRef.current;

    if (!current) {
      return;
    }

    disposeGroup(current.modelGroup);
    current.modelGroup.clear();
    current.modelGroup.add(buildTubeRoundModel(dimensions, modelColor));
    current.resize();
  }, [dimensions, modelColor]);

  if (!canRenderParametricModel(format)) {
    return (
      <div className="model-empty">
        <strong>3D em preparacao</strong>
        <span>Este formato ainda usa apenas a vista cotada.</span>
      </div>
    );
  }

  return (
    <div className="model-viewer-shell">
      <div className="model-stage" ref={hostRef} aria-label={`Modelo 3D de ${format.name}`} role="img" />
      <div className="model-readout" aria-label="Medidas do modelo">
        <span>D interno <strong>{dimensions.innerDiameter} mm</strong></span>
        <span>D base <strong>{dimensions.baseDiameter} mm</strong></span>
        <span>Insercao <strong>{dimensions.insertionDepth} mm</strong></span>
        <span>Apoio <strong>{dimensions.supportHeight} mm</strong></span>
      </div>
    </div>
  );
}

function buildTubeRoundModel(dimensions, modelColor) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: modelColor,
    roughness: 0.78,
    metalness: 0.02
  });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x181c1d, transparent: true, opacity: 0.22 });
  const geometry = buildTubeRoundGeometry(dimensions);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 22), edgeMaterial);
  group.add(edges);

  const plane = new THREE.Mesh(
    new THREE.CircleGeometry(dimensions.baseDiameter * 0.72, 96),
    new THREE.MeshBasicMaterial({ color: 0x007a70, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.08;
  group.add(plane);

  const baseRing = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(circlePoints(dimensions.baseDiameter / 2, 128)),
    new THREE.LineBasicMaterial({ color: 0x007a70, transparent: true, opacity: 0.5 })
  );
  baseRing.rotation.x = Math.PI / 2;
  group.add(baseRing);

  return group;
}

function buildTubeRoundGeometry({ innerDiameter, baseDiameter, insertionDepth, supportHeight }) {
  const innerRadius = innerDiameter / 2;
  const baseRadius = Math.max(baseDiameter / 2, innerRadius + 1.5);
  const fitAllowance = -0.2;
  const plugRadius = Math.max(1, innerRadius + fitAllowance);
  const topChamfer = Math.min(0.9, insertionDepth * 0.14);
  const bottomChamfer = Math.min(0.8, supportHeight * 0.16);
  const shoulderRadius = Math.min(1.2, supportHeight * 0.22);
  const baseTopY = supportHeight;
  const topY = supportHeight + insertionDepth;

  const points = [
    new THREE.Vector2(Math.max(0.5, baseRadius - bottomChamfer), 0),
    new THREE.Vector2(baseRadius, bottomChamfer),
    new THREE.Vector2(baseRadius, Math.max(bottomChamfer, supportHeight - shoulderRadius)),
    new THREE.Vector2(Math.max(plugRadius + 1.2, baseRadius - shoulderRadius * 1.6), baseTopY),
    new THREE.Vector2(plugRadius + 0.55, baseTopY + shoulderRadius),
    new THREE.Vector2(plugRadius + 0.35, Math.max(baseTopY + shoulderRadius, topY - topChamfer)),
    new THREE.Vector2(Math.max(0.8, plugRadius - topChamfer), topY),
    new THREE.Vector2(0, topY),
    new THREE.Vector2(0, 0)
  ];

  const geometry = new THREE.LatheGeometry(points, 96);
  geometry.computeVertexNormals();
  geometry.center();
  geometry.translate(0, (supportHeight + insertionDepth) / 2, 0);
  return geometry;
}

function buildReferenceAxes() {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: 0x2c6b9a, transparent: true, opacity: 0.55 });
  const points = [
    new THREE.Vector3(-42, 0, 0),
    new THREE.Vector3(42, 0, 0),
    new THREE.Vector3(0, 0, -42),
    new THREE.Vector3(0, 0, 42)
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  group.add(new THREE.LineSegments(geometry, material));
  return group;
}

function circlePoints(radius, segments) {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  });
}

function getTubeRoundDimensions(values) {
  return {
    innerDiameter: roundMetric(values.diametroInterno, 22),
    baseDiameter: roundMetric(values.diametroBase, 28),
    insertionDepth: roundMetric(values.profundidadeInsercao, 18),
    supportHeight: roundMetric(values.alturaApoio, 8),
    totalHeight: roundMetric(Number(values.profundidadeInsercao || 18) + Number(values.alturaApoio || 8), 26)
  };
}

function roundMetric(value, fallback) {
  const numericValue = Number(value ?? fallback);
  return Math.round((Number.isFinite(numericValue) ? numericValue : fallback) * 10) / 10;
}

function disposeGroup(group) {
  group.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
    }

    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
}
