// The map: two attack lanes linked by a central connector, with crate cover, a marked
// bombsite and two stepped platforms. Every box is a collider and a surface a bullet stops on.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const materials = {};
  const surfaceColors = {
    floor: PALETTE.canvas,
    wall: PALETTE.surface,
    divider: PALETTE.hairline,
    crate: PALETTE.surface,
    ramp: PALETTE.hairline,
  };
  for (const [name, color] of Object.entries(surfaceColors)) {
    const surfaceColor = new THREE.Color(color);
    if (name === 'crate') surfaceColor.offsetHSL(0, -0.04, 0.05);
    if (name === 'ramp') surfaceColor.offsetHSL(0, -0.04, -0.04);
    materials[name] = new THREE.MeshStandardMaterial({
      color: surfaceColor,
      roughness: name === 'floor' ? 0.94 : 0.82,
      metalness: 0.03,
    });
  }
  for (const name of ['accent', 'ink', 'muted']) {
    materials[name] = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE[name]),
      roughness: name === 'accent' || name === 'ink' ? 0.55 : 0.82,
      metalness: 0.03,
    });
  }

  const colliders = [];
  const shootables = [];

  function box(width, height, depth, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials[material]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    return mesh;
  }

  // A 24 x 24 m room, 4.6 m walls, open to the sky so one directional light reaches every corner.
  box(24.4, 0.4, 24.4, 0, -0.2, 0, 'floor');
  box(0.4, 4.6, 24.4, -12.2, 2.3, 0, 'wall');
  box(0.4, 4.6, 24.4, 12.2, 2.3, 0, 'wall');
  box(24.4, 4.6, 0.4, 0, 2.3, -12.2, 'wall');
  box(24.4, 4.6, 0.4, 0, 2.3, 12.2, 'wall');

  // Lane dividers and central connector cover. The gaps leave both lanes and the connector clear.
  box(0.5, 2.8, 7.0, -4.7, 1.4, -5.0, 'divider');
  box(0.5, 2.8, 7.0, 4.7, 1.4, -5.0, 'divider');
  box(0.5, 2.8, 6.0, -4.7, 1.4, 6.0, 'divider');
  box(0.5, 2.8, 6.0, 4.7, 1.4, 6.0, 'divider');
  box(3.0, 2.6, 0.5, 0, 1.3, -3.2, 'divider');
  box(3.0, 2.6, 0.5, 0, 1.3, 3.2, 'divider');

  // Crates and corner cover: low enough to fight from, tall enough to break line of sight.
  box(1.7, 1.1, 1.7, -7.0, 0.55, -1.0, 'crate');
  box(1.7, 1.1, 1.7, 7.0, 0.55, -1.0, 'crate');
  box(1.5, 1.0, 1.5, -7.9, 0.5, -9.2, 'crate');
  box(1.5, 1.0, 1.5, 8.8, 0.5, -8.2, 'crate');
  box(1.7, 1.1, 1.7, -1.5, 0.55, -5.6, 'crate');
  box(1.7, 1.1, 1.7, 1.5, 0.55, 5.6, 'crate');
  box(1.5, 1.0, 1.5, -6.2, 0.5, 8.4, 'crate');
  box(1.5, 1.0, 1.5, 6.2, 0.5, 8.4, 'crate');
  box(1.8, 0.75, 1.8, -3.5, 0.375, 1.0, 'crate');
  box(1.8, 0.75, 1.8, 3.5, 0.375, -1.0, 'crate');

  // Two elevated firing positions. Ramps are stacks of shallow boxes, and the player's
  // step-up movement lets its box collision climb them cleanly without teleporting.
  const elevatedPlatforms = [
    { x: -9.0, z: 7.0, rampDirection: -1 },
    { x: 9.0, z: -7.0, rampDirection: 1 },
  ];
  for (const platform of elevatedPlatforms) {
      box(5.2, 0.9, 4.2, platform.x, 0.45, platform.z, 'ramp');
    for (let step = 0; step < 4; step += 1) {
      const height = 0.28 + step * 0.22;
      const z = platform.z + platform.rampDirection * (2.1 + 0.55 + step * 0.62);
      box(3.4, height, 0.62, platform.x, height / 2, z, 'ramp');
    }
  }

  // Painted bombsite: a bounded floor wash, double ring and corner ticks in the accent hue.
  const bombsiteX = -7.6;
  const bombsiteZ = -6.2;
  const bombsiteRadius = 3.4;
  function paintedMesh(geometry, opacity, x, z, y = 0.03) {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(PALETTE.accent),
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
    paintedMesh(new THREE.CircleGeometry(bombsiteRadius - 0.25, 48), 0.14, bombsiteX, bombsiteZ);
    paintedMesh(new THREE.RingGeometry(bombsiteRadius - 0.28, bombsiteRadius - 0.04, 48), 0.85, bombsiteX, bombsiteZ);
    paintedMesh(new THREE.RingGeometry(0.75, 1.0, 32), 0.52, bombsiteX, bombsiteZ, 0.035);
  for (let angle = 0; angle < 4; angle += 1) {
    const theta = angle * Math.PI / 2 + Math.PI / 4;
    paintedMesh(
      new THREE.PlaneGeometry(0.85, 0.18),
      0.5,
      bombsiteX + Math.cos(theta) * (bombsiteRadius - 0.65),
      bombsiteZ + Math.sin(theta) * (bombsiteRadius - 0.65),
      0.04,
    );
  }

  // A subtle, shared grid overlay keeps the floor readable without competing with cover shadows.
  const gridSize = 1.5;
  const gridHalf = 11.25;
  const gridPositions = [];
  for (let value = -gridHalf; value <= gridHalf + 0.001; value += gridSize) {
    gridPositions.push(-gridHalf, 0.02, value, gridHalf, 0.02, value);
    gridPositions.push(value, 0.02, -gridHalf, value, 0.02, gridHalf);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
  const grid = new THREE.LineSegments(
    gridGeometry,
    new THREE.LineBasicMaterial({
      color: new THREE.Color(PALETTE.hairline),
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
  );
  grid.renderOrder = 1;
  group.add(grid);

  // Light: even ambient base, a sky/ground gradient, and one soft-shadowing warm key.
  const ambient = new THREE.AmbientLight(new THREE.Color(PALETTE.ink), 0.45);
  scene.add(ambient);

  const sky = new THREE.HemisphereLight(new THREE.Color(PALETTE.surface), new THREE.Color(PALETTE.canvas), 1.0);
  scene.add(sky);

  const key = new THREE.DirectionalLight(new THREE.Color(PALETTE.ink), 2.7);
  key.position.set(9, 14, 7);
  key.target.position.set(0, 0, -3);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -16;
  key.shadow.camera.right = 16;
  key.shadow.camera.top = 16;
  key.shadow.camera.bottom = -16;
  key.shadow.camera.far = 48;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.03;
  scene.add(key, key.target);

  return {
    colliders,
    shootables,
    group,
    cover: [
      [-7.0, -1.0], [7.0, -1.0], [-7.9, -9.2], [8.8, -8.2],
      [-1.5, -5.6], [1.5, 5.6], [-6.2, 8.4], [6.2, 8.4],
      [-3.5, 1.0], [3.5, -1.0],
    ],
  };
}
