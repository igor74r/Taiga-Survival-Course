const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const TaigaSave = require('../GAME_TAIGA_IDLE/src/services/save-service.js');

const html = fs.readFileSync('GAME_TAIGA_IDLE/index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, 'game has one inline runtime script');

function boot(seed) {
  const storage = new Map([['taiga_idle_save_v1', JSON.stringify(seed)]]);
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '' });
      return elements.get(id);
    },
    querySelectorAll() { return []; },
    addEventListener() {}
  };
  const context = {
    document, navigator: {}, location: { protocol: 'file:' },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, value); }
    },
    TaigaSave, console, Date, Math, JSON, Object, Array, Number, String,
    setInterval() {}, confirm() { return false; }
  };
  context.window = context;
  vm.runInNewContext(scripts[0][1], context, { filename: 'taiga-inline-game.js' });
  return { context, readSave: () => JSON.parse(storage.get('taiga_idle_save_v1')) };
}

const base = {
  version: 2, day: 1, hour: 7, last: Date.now(),
  hp: 100, hunger: 80, thirst: 80, energy: 90, warmth: 80, morale: 70,
  wood: 2, branch: 4, stone: 1, berry: 2, mushroom: 0, water: 2,
  fish: 0, metal: 0, cloth: 0, food: 1, knife: 0, base: 0,
  fire: 0, fireMinutes: 0, torch: 0, jobs: [], crafted: [],
  known: ['camp', 'river', 'forest'], log: [], tab: 'camp', story: 0
};

const crafting = boot(base);
crafting.context.craft(3);
const afterCraft = crafting.readSave();
assert.equal(afterCraft.torch, 1, 'torch recipe grants one torch');
assert.equal(afterCraft.branch, 2, 'torch recipe consumes two branches');
assert.equal(afterCraft.wood, 1, 'torch recipe consumes one wood');

const noFuel = boot({ ...base, branch: 0, wood: 0 });
noFuel.context.act('fire');
const afterFailedFire = noFuel.readSave();
assert.equal(afterFailedFire.fire, 0, 'fire stays off when resources are missing');
assert.equal(afterFailedFire.fireMinutes, 0, 'failed fire action grants no fuel');

const enoughFuel = boot({ ...base, branch: 2, wood: 1 });
enoughFuel.context.act('fire');
const afterFire = enoughFuel.readSave();
assert.equal(afterFire.fire, 1, 'fire lights when resources are available');
assert.equal(afterFire.fireMinutes, 180, 'fire receives its three-hour fuel reserve');
assert.equal(afterFire.branch, 0);
assert.equal(afterFire.wood, 0);

console.log('TAIGA runtime crafting and camp-action tests passed.');
