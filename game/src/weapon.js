// The active weapon's view model and firing feel. All rules and ammo live in arsenal.js.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const MUZZLE_TIME = 0.06;
const WEAPON_SHAPES = {
  pistol: { size: [0.08, 0.09, 0.22], stock: false },
  rifle: { size: [0.09, 0.1, 0.42], stock: true },
  marksman: { size: [0.08, 0.11, 0.58], stock: true },
};

export function createWeapon(camera, arsenal) {
  const grip = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.7, metalness: 0.2 });
  const body = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.5, metalness: 0.35 });
  const model = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.42), body);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.4), grip);
  barrel.position.set(0, 0.025, -0.38);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.08, 0.22), grip);
  stock.position.set(0, -0.02, 0.3);
  model.add(receiver, barrel, stock);
  model.position.set(0.24, -0.2, -0.42);
  camera.add(model);

  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
  );
  flash.position.set(0.24, -0.18, -0.95);
  flash.visible = false;
  camera.add(flash);

  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 5);
  flashLight.position.set(0.24, -0.16, -0.6);
  camera.add(flashLight);

  let activeId = '';

  function rebuildModel(id) {
    const shape = WEAPON_SHAPES[id];
    receiver.scale.set(shape.size[0] / 0.09, shape.size[1] / 0.1, shape.size[2] / 0.42);
    barrel.scale.set(1, 1, shape.size[2] / 0.42);
    barrel.position.z = -0.19 - (shape.size[2] / 2);
    stock.visible = shape.stock;
    model.position.set(0.24, -0.2, -0.42);
  }

  function step(dt) {
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
    model.position.z = -0.42 + state.kick;
    model.rotation.x = state.kick * 2.2;
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
    flash.rotation.z = state.flash * 30;
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
