// Four enemy soldiers patrol fixed lane/connector routes, pause at waypoints, and seek cover
// when hit. Raycasts remain the only line-of-sight and hitscan test.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const HEALTH = 100;
const SPEED = 2.1;
const ARRIVE_DISTANCE = 0.28;
const BOT_EYE = 1.45;
const SHOT_RANGE = 38;
const DETECT_TIME = 0.34;
const LOS_INTERVAL = 0.12;
const FIRE_GAP = 0.92;
const MUZZLE_TIME = 0.06;
const FALL_TIME = 0.7;
const HOLD_MIN = 0.55;
const HOLD_EXTRA = 0.6;
const REACT_TIME = 0.24;
const COVER_HOLD = 1.9;
const COVER_STANDOFF = 1.05;
const COVER_MARGIN = 0.25;
const HEAD_DAMAGE = 100;
const BODY_DAMAGE = 34;
const SHOT_DAMAGE = 17;
const PLAYER_RADIUS = 0.42;

const SPAWNS = [
  [-8.8, -9.6],
  [-2.6, -10.2],
  [2.6, -10.2],
  [8.8, -9.6],
];

const ROUTES = [
  [
    [-9.2, -9.4], [-7.0, -6.2], [-7.4, 0.0], [-6.6, 3.8],
    [0.0, 4.4], [6.0, 2.2], [9.0, 0.0], [7.8, -3.2],
    [0.0, -1.6], [-3.0, 0.0], [-7.0, 3.0], [-9.2, -9.4],
  ],
  [
    [-6.0, -9.4], [-4.0, -5.8], [-3.6, 0.0], [-5.5, 3.4],
    [-1.5, 6.0], [2.0, 6.4], [6.5, 4.0], [7.0, -1.2],
    [3.0, -1.8], [0.0, 0.0], [-3.0, -2.4], [-6.0, -9.4],
  ],
  [
    [6.0, -9.4], [8.6, -5.4], [7.4, 0.0], [5.5, 3.4],
    [1.5, 6.0], [-2.0, 6.4], [-6.5, 4.0], [-7.0, -1.2],
    [-3.0, -1.8], [0.0, 0.0], [3.0, -2.4], [6.0, -9.4],
  ],
  [
    [9.2, -9.4], [7.0, -6.2], [7.4, 0.0], [6.6, 3.8],
    [0.0, 4.4], [-6.0, 2.2], [-9.0, 0.0], [-7.8, -3.2],
    [0.0, -1.6], [3.0, 0.0], [7.0, 3.0], [9.2, -9.4],
  ],
];

export function createBots(scene, random) {
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.6, metalness: 0.05 });
  const headMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.45, metalness: 0.1 });
  const limbMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.82 });
  const torsoGeometry = new THREE.BoxGeometry(0.52, 0.78, 0.3);
  const headGeometry = new THREE.SphereGeometry(0.155, 16, 12);
  const legGeometry = new THREE.BoxGeometry(0.14, 0.72, 0.16);
  const armGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.12);
  const gunGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.44);
  const flashGeometry = new THREE.PlaneGeometry(0.18, 0.18);

  const items = [];
  const hitMeshes = [];
  const raycaster = new THREE.Raycaster();
  raycaster.far = SHOT_RANGE;
  const rayOrigin = new THREE.Vector3();
  const rayTarget = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();
  const shotDirection = new THREE.Vector3();
  const shotEndpoint = new THREE.Vector3();
  const muzzlePosition = new THREE.Vector3();
  const playerCenter = new THREE.Vector3();

  for (let index = 0; index < SPAWNS.length; index += 1) {
    const [spawnX, spawnZ] = SPAWNS[index];
    const group = new THREE.Group();
    group.position.set(spawnX, 0, spawnZ);

    const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
    torso.position.y = 1.0;
    torso.userData.part = 'torso';
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.53;
    head.userData.part = 'head';
    const leftLeg = new THREE.Mesh(legGeometry, limbMaterial);
    leftLeg.position.set(-0.16, 0.36, 0);
    const rightLeg = new THREE.Mesh(legGeometry, limbMaterial);
    rightLeg.position.set(0.16, 0.36, 0);
    const leftArm = new THREE.Mesh(armGeometry, limbMaterial);
    leftArm.position.set(-0.35, 1.0, 0);
    const rightArm = new THREE.Mesh(armGeometry, limbMaterial);
    rightArm.position.set(0.35, 1.0, -0.08);
    const gun = new THREE.Mesh(gunGeometry, limbMaterial);
    gun.position.set(0.2, 1.02, -0.28);
    const flash = new THREE.Mesh(
      flashGeometry,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
    );
    flash.position.set(0.2, 1.02, -0.54);
    flash.visible = false;
    group.add(torso, head, leftLeg, rightLeg, leftArm, rightArm, gun, flash);
    group.traverse((mesh) => {
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    scene.add(group);

    const item = {
      group,
      torso,
      head,
      leftLeg,
      rightLeg,
      flash,
      spawnX,
      spawnZ,
      route: ROUTES[index],
      routeIndex: 1,
      walkCycle: 0,
      losLeft: index * LOS_INTERVAL,
      detect: 0,
      fireIn: 0.8 + index * 0.24,
      muzzle: 0,
      reactLeft: 0,
      coverLeft: 0,
      holdLeft: 0,
      seekingCover: false,
      coverTargetX: spawnX,
      coverTargetZ: spawnZ,
      alertX: 0,
      alertZ: 0,
      health: HEALTH,
      alive: true,
      fall: 0,
    };
    torso.userData.bot = item;
    head.userData.bot = item;
    hitMeshes.push(torso, head);
    items.push(item);
  }

  function damage(mesh, amount, incomingX = 0, incomingZ = 0, cover = []) {
    const item = mesh.userData.bot;
    if (!item || !item.alive) return false;
    item.health -= amount;
    if (item.health > 0) {
      item.reactLeft = REACT_TIME;
      item.seekingCover = false;
      item.coverLeft = 0;
      item.alertX = incomingX;
      item.alertZ = incomingZ;

      let bestDistance = Number.POSITIVE_INFINITY;
      for (const [crateX, crateZ] of cover) {
        const towardCrateX = crateX - item.group.position.x;
        const towardCrateZ = crateZ - item.group.position.z;
        const crateDot = towardCrateX * incomingX + towardCrateZ * incomingZ;
        if (crateDot <= COVER_MARGIN) continue;
        const distance = towardCrateX * towardCrateX + towardCrateZ * towardCrateZ;
        if (distance >= bestDistance) continue;
        bestDistance = distance;
        item.coverTargetX = crateX - incomingX * COVER_STANDOFF;
        item.coverTargetZ = crateZ - incomingZ * COVER_STANDOFF;
      }
      if (Number.isFinite(bestDistance)) item.seekingCover = true;
      return false;
    }
    item.alive = false;
    item.fall = 0;
    item.flash.visible = false;
    item.muzzle = 0;
    return true;
  }

  function hasLineOfSight(item, playerState, shootables) {
    rayOrigin.set(item.group.position.x, BOT_EYE, item.group.position.z);
    rayTarget.set(
      playerState.position.x,
      playerState.position.y + playerState.height * 0.62,
      playerState.position.z,
    );
    rayDirection.subVectors(rayTarget, rayOrigin);
    const distance = rayDirection.length();
    if (distance > SHOT_RANGE) return false;
    rayDirection.divideScalar(distance || 1);
    raycaster.set(rayOrigin, rayDirection);
    const hits = raycaster.intersectObjects(shootables, false);
    return hits.length === 0 || hits[0].distance >= distance - 0.12;
  }

  function shootAtPlayer(item, playerState, shootables, onPlayerHit, effects) {
    rayOrigin.set(item.group.position.x, BOT_EYE, item.group.position.z);
    rayTarget.set(
      playerState.position.x,
      playerState.position.y + playerState.height * 0.62,
      playerState.position.z,
    );
    rayDirection.subVectors(rayTarget, rayOrigin);
    const distance = rayDirection.length();
    rayDirection.divideScalar(distance || 1);
    const movePenalty = 0.075;
    const distancePenalty = Math.min(1, distance / 26) * 0.075;
    const spread = 0.014 + movePenalty + distancePenalty;
    shotDirection.copy(rayDirection);
    shotDirection.x += (random() * 2 - 1) * spread;
    shotDirection.y += (random() * 2 - 1) * spread;
    shotDirection.z += (random() * 2 - 1) * spread;
    shotDirection.normalize();
    raycaster.set(rayOrigin, shotDirection);
    const hits = raycaster.intersectObjects(shootables, false);
    const wallDistance = hits.length > 0 ? hits[0].distance : Number.POSITIVE_INFINITY;
    playerCenter.set(
      playerState.position.x,
      playerState.position.y + playerState.height * 0.62,
      playerState.position.z,
    );
    if (
      raycaster.ray.distanceSqToPoint(playerCenter) <= PLAYER_RADIUS * PLAYER_RADIUS
      && distance <= wallDistance + 0.1
    ) onPlayerHit(SHOT_DAMAGE);
    if (hits.length > 0) shotEndpoint.copy(hits[0].point);
    else shotEndpoint.copy(rayOrigin).addScaledVector(shotDirection, SHOT_RANGE);
    muzzlePosition.set(0.2, 1.02, -0.54).applyMatrix4(item.group.matrixWorld);
    effects.addTracer(muzzlePosition, shotEndpoint, 'accent');
    effects.addPuff(shotEndpoint);
    item.muzzle = MUZZLE_TIME;
    item.flash.visible = true;
    item.fireIn = FIRE_GAP * (0.78 + random() * 0.45);
  }

  function step(dt, playerState, shootables, combatActive, onPlayerHit, cover, effects) {
    for (const item of items) {
      if (!item.alive) {
        item.fall = Math.min(1, item.fall + dt / FALL_TIME);
        item.group.rotation.x = -item.fall * 1.35;
        item.group.position.y = -item.fall * 0.08;
        continue;
      }

      let moveX = 0;
      let moveZ = 0;
      if (item.reactLeft > 0) {
        item.reactLeft -= dt;
        if (item.reactLeft <= 0 && item.seekingCover) {
          moveX = item.coverTargetX - item.group.position.x;
          moveZ = item.coverTargetZ - item.group.position.z;
        }
      } else if (item.seekingCover) {
        moveX = item.coverTargetX - item.group.position.x;
        moveZ = item.coverTargetZ - item.group.position.z;
        const moveDistance = Math.hypot(moveX, moveZ);
        if (moveDistance < ARRIVE_DISTANCE) {
          item.seekingCover = false;
          item.coverLeft = COVER_HOLD;
          moveX = 0;
          moveZ = 0;
        }
      } else if (item.coverLeft > 0) {
        item.coverLeft -= dt;
        moveX = item.alertX;
        moveZ = item.alertZ;
      } else {
        const target = item.route[item.routeIndex];
        moveX = target[0] - item.group.position.x;
        moveZ = target[1] - item.group.position.z;
        const targetDistance = Math.hypot(moveX, moveZ);
        if (targetDistance < ARRIVE_DISTANCE) {
          item.holdLeft = HOLD_MIN + random() * HOLD_EXTRA;
          moveX = 0;
          moveZ = 0;
        }
        if (item.holdLeft > 0) {
          item.holdLeft -= dt;
          if (item.holdLeft <= 0) {
            item.routeIndex = (item.routeIndex + 1) % item.route.length;
            const next = item.route[item.routeIndex];
            moveX = next[0] - item.group.position.x;
            moveZ = next[1] - item.group.position.z;
          } else {
            moveX = 0;
            moveZ = 0;
          }
        }
      }
      const moveDistance = Math.hypot(moveX, moveZ);
      if (item.seekingCover && moveDistance < ARRIVE_DISTANCE) {
        item.seekingCover = false;
        item.coverLeft = COVER_HOLD;
        moveX = 0;
        moveZ = 0;
      }
      if (moveDistance > 0.001) {
        const travel = Math.min(moveDistance, SPEED * dt);
        item.group.position.x += (moveX / moveDistance) * travel;
        item.group.position.z += (moveZ / moveDistance) * travel;
        item.group.position.y = 0;
        item.walkCycle += travel * 2.7;
      }
      item.leftLeg.rotation.x = Math.sin(item.walkCycle) * 0.55;
      item.rightLeg.rotation.x = -Math.sin(item.walkCycle) * 0.55;

      item.muzzle = Math.max(0, item.muzzle - dt);
      item.flash.visible = item.muzzle > 0;
      item.losLeft = Math.max(0, item.losLeft - dt);
      if (item.losLeft === 0) {
        item.losLeft = LOS_INTERVAL;
        const visible = combatActive && playerState.health > 0 && hasLineOfSight(item, playerState, shootables);
        item.detect = visible ? Math.min(DETECT_TIME, item.detect + LOS_INTERVAL) : 0;
      }

      let facingX;
      let facingZ;
      if (item.detect > 0) {
        facingX = playerState.position.x - item.group.position.x;
        facingZ = playerState.position.z - item.group.position.z;
        item.fireIn -= dt;
        if (item.detect >= DETECT_TIME && item.fireIn <= 0 && combatActive && playerState.health > 0) {
          shootAtPlayer(item, playerState, shootables, onPlayerHit, effects);
        }
      } else {
        facingX = moveX;
        facingZ = moveZ;
        item.fireIn = Math.max(item.fireIn, 0.18);
      }
      const facingLength = Math.hypot(facingX, facingZ);
      if (facingLength > 0.001) {
        item.group.rotation.y = Math.atan2(-facingX / facingLength, -facingZ / facingLength);
      }
      item.group.updateMatrixWorld(true);
    }
  }

  function reset() {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      item.group.position.set(item.spawnX, 0, item.spawnZ);
      item.group.rotation.set(0, 0, 0);
      item.routeIndex = 1;
      item.walkCycle = 0;
      item.leftLeg.rotation.set(0, 0, 0);
      item.rightLeg.rotation.set(0, 0, 0);
      item.losLeft = index * LOS_INTERVAL;
      item.detect = 0;
      item.fireIn = 0.8 + index * 0.24;
      item.muzzle = 0;
      item.flash.visible = false;
      item.health = HEALTH;
      item.alive = true;
      item.fall = 0;
      item.reactLeft = 0;
      item.coverLeft = 0;
      item.holdLeft = 0;
      item.seekingCover = false;
      item.coverTargetX = item.spawnX;
      item.coverTargetZ = item.spawnZ;
      item.alertX = 0;
      item.alertZ = 0;
      item.group.updateMatrixWorld(true);
    }
  }

  return {
    items,
    hitMeshes,
    damage,
    step,
    reset,
    remaining() {
      let count = 0;
      for (const item of items) if (item.alive) count += 1;
      return count;
    },
  };
}
