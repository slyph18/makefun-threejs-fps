// The active weapon's view model and firing feel. All rules and ammo live in arsenal.js.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const MUZZLE_TIME = 0.06;
const WEAPON_BASE_Z = {
  pistol: -0.34,
  rifle: -0.38,
  marksman: -0.45,
};

export function createWeapon(camera, arsenal, playerState) {
  const body = new THREE.MeshStandardMaterial({ color: new THREE.Color('#2c333b'), roughness: 0.38, metalness: 0.46 });
  const furniture = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3a4149'), roughness: 0.80, metalness: 0.08 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: new THREE.Color('#15181d'), roughness: 0.34, metalness: 0.68 });
  const model = new THREE.Group();
  function part(parent, width, height, depth, x, y, z, material, rotationX = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rotationX;
    parent.add(mesh);
    return mesh;
  }
  const pistol = new THREE.Group();
  part(pistol, 0.058, 0.084, 0.24, 0, 0, -0.02, body);
  part(pistol, 0.048, 0.050, 0.30, 0, 0.036, -0.04, darkMetal);
  part(pistol, 0.020, 0.020, 0.048, 0, 0.036, -0.21, darkMetal);
  part(pistol, 0.046, 0.155, 0.090, 0, -0.105, 0.085, furniture, 0.18);
  part(pistol, 0.052, 0.028, 0.090, 0, -0.024, 0.045, furniture);
  const rifle = new THREE.Group();
  part(rifle, 0.078, 0.110, 0.37, 0, 0, 0.04, body);
  part(rifle, 0.064, 0.080, 0.32, 0, -0.006, -0.36, furniture);
  part(rifle, 0.030, 0.030, 0.30, 0, 0.014, -0.64, darkMetal);
  part(rifle, 0.058, 0.215, 0.120, 0, -0.155, 0.025, darkMetal, 0.10);
  part(rifle, 0.066, 0.115, 0.26, 0, -0.006, 0.35, furniture);
  part(rifle, 0.052, 0.062, 0.170, 0, 0.088, -0.030, darkMetal);
  part(rifle, 0.086, 0.055, 0.110, 0, -0.042, -0.13, furniture);
  const marksman = new THREE.Group();
  part(marksman, 0.070, 0.096, 0.48, 0, 0, 0.06, body);
  part(marksman, 0.028, 0.028, 0.40, 0, 0.010, -0.54, darkMetal);
  part(marksman, 0.068, 0.090, 0.220, 0, 0.115, -0.010, darkMetal);
  part(marksman, 0.046, 0.185, 0.100, 0, -0.140, 0.020, darkMetal, 0.07);
  part(marksman, 0.080, 0.130, 0.30, 0, -0.010, 0.40, furniture);
  part(marksman, 0.090, 0.060, 0.130, 0, -0.038, -0.10, furniture);
  model.add(pistol, rifle, marksman);
  model.position.set(0.27, -0.28, WEAPON_BASE_Z.pistol);
  camera.add(model);

  const flashCanvas = document.createElement('canvas');
  flashCanvas.width = 128;
  flashCanvas.height = 128;
  const flashContext = flashCanvas.getContext('2d');
  const flashGradient = flashContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  flashGradient.addColorStop(0, 'rgba(255, 252, 224, 0.98)');
  flashGradient.addColorStop(0.35, 'rgba(255, 234, 160, 0.72)');
  flashGradient.addColorStop(1, 'rgba(255, 234, 160, 0)');
  flashContext.fillStyle = flashGradient;
  flashContext.fillRect(0, 0, 128, 128);
  const flashTexture = new THREE.CanvasTexture(flashCanvas);
  flashTexture.colorSpace = THREE.SRGBColorSpace;
  const flash = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: flashTexture, transparent: true, depthWrite: false }),
  );
  flash.scale.setScalar(0.36);
  flash.position.set(0.24, -0.18, -0.95);
  flash.visible = false;
  camera.add(flash);

  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.tracer), 0, 5);
  flashLight.position.set(0.24, -0.16, -0.6);
  camera.add(flashLight);

  let activeId = '';
  let activeBaseZ = WEAPON_BASE_Z.pistol;
  let swayTime = 0;

  function rebuildModel(id) {
    pistol.visible = id === 'pistol';
    rifle.visible = id === 'rifle';
    marksman.visible = id === 'marksman';
    activeBaseZ = WEAPON_BASE_Z[id];
    model.position.set(0.27, -0.28, activeBaseZ);
  }

  function step(dt, speed = playerState?.groundSpeed() ?? 0) {
    const state = arsenal.state;
    if (state.active !== activeId) {
      activeId = state.active;
      rebuildModel(activeId);
      flash.visible = false;
      flashLight.intensity = 0;
    }

    state.cooldown = Math.max(0, state.cooldown - dt);
    state.grenadeCooldown = Math.max(0, state.grenadeCooldown - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 14);
    const moveAmount = Math.min(1, speed / 5.2);
    const swayX = Math.sin(swayTime * 7.2) * 0.0075 * moveAmount;
    const swayY = Math.abs(Math.cos(swayTime * 7.2)) * 0.0052 * moveAmount;
    swayTime += dt;
    model.position.x = 0.24 + swayX;
    model.position.y = -0.25 + swayY;
    model.position.z = activeBaseZ + state.kick;
    model.rotation.x = state.kick * 2.2;
    model.rotation.y = Math.sin(swayTime * 3.6) * 0.018 * moveAmount;
    model.rotation.z = Math.sin(swayTime * 3.6) * 0.015 * moveAmount;
    if (state.reloadLeft > 0) {
      const reloadProgress = 1 - Math.min(1, state.reloadLeft / arsenal.current().reload);
      model.rotation.x = -0.55 * reloadProgress;
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      if (state.reloadLeft === 0) {
        const ammo = arsenal.currentAmmo();
        const need = arsenal.current().mag - ammo.mag;
        const take = Math.min(need, ammo.reserve);
        ammo.mag += take;
        ammo.reserve -= take;
      }
    }
    flash.visible = state.flash > 0;
    flash.material.rotation = state.flash * 30;
    flashLight.intensity = state.flash > 0 ? 18 : 0;
    state.flash = Math.max(0, state.flash - dt);
  }

  return {
    step,
    ready() {
      const ammo = arsenal.currentAmmo();
      const state = arsenal.state;
      return ammo.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0;
    },
    pullTrigger() {
      const state = arsenal.state;
      const weapon = arsenal.current();
      state.cooldown = weapon.fireGap;
      state.flash = MUZZLE_TIME;
      state.kick = weapon.fireGap > 0.5 ? 0.1 : 0.055;
    },
    takeRound() {
      const ammo = arsenal.currentAmmo();
      if (ammo.mag <= 0) return false;
      ammo.mag -= 1;
      return true;
    },
    reload() {
      const state = arsenal.state;
      const ammo = arsenal.currentAmmo();
      const weapon = arsenal.current();
      if (state.reloadLeft > 0 || ammo.mag === weapon.mag || ammo.reserve === 0) return;
      state.reloadLeft = weapon.reload;
      return true;
    },
    spread(speed) {
      const weapon = arsenal.current();
      return weapon.spreadStill + Math.min(1, speed / 5.2) * weapon.spreadMoving;
    },
    damage(part) {
      const weapon = arsenal.current();
      return part === 'head' ? weapon.damage * 2 : weapon.damage;
    },
  };
}
