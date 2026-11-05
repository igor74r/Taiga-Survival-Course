const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync('GAME_TAIGA_IDLE/index.html', 'utf8');
const match = html.match(/<script>([\\s\\S]*?)<\\/script>/);
assert.ok(match, 'inline game script exists');

function boot(seed = {}) {
  const store = new Map();
  if (Object.keys(seed).length) store.set('taiga_idle_save_v1', JSON.stringify(seed));
  const elements = new Map();
  const tabs = ['camp', 'work', 'craft', 'map', 'bag'].map(tab => ({
    dataset: { tab },
    classList: { toggle() {} },
    addEventListener() {}
  }));
  let minuteTick = () => {};
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '' });
      return elements.get(id);
    },
    querySelectorAll(selector) {
      return selector === '[data-tab]' ? tabs : [];
    },
    addEventListener() {}
  };
  const context = {
    document,
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); }
    },
    navigator: {},
    location: { protocol: 'file:' },
    confirm: () => false,
    setInterval(fn) { minuteTick = fn; return 1; },
    console
  };
  context.window = context;
  vm.runInNewContext(match[1], context, { timeout: 2000 });
  context.manualSave();
  return {
    context,
    tick(minutes = 1) { for (let i = 0; i < minutes; i++) minuteTick(); },
    state() { return JSON.parse(store.get('taiga_idle_save_v1')); }
  };
}

{
  const game = boot();
  game.context.act('fire');
  assert.equal(game.state().fireMinutes, 180, 'campfire starts with a three-hour burn time');
  game.tick(180);
  assert.equal(game.state().fireMinutes, 0, 'campfire fuel expires');
  assert.equal(game.state().fire, 0, 'expired campfire is no longer active');
}

{
  const game = boot();
  const before = game.state();
  game.context.startJob(0);
  assert.equal(game.state().energy, before.energy - 2, 'assigning a gathering job consumes energy');
  game.tick(19);
  assert.equal(game.state().branch, before.branch + 3, 'completed job pays its configured reward');
  assert.equal(game.state().jobs.length, 0, 'completed job leaves the active queue');
}

{
  const blocked = boot({ base: 0, energy: 100, known: ['camp', 'river', 'forest'] });
  blocked.context.explore(3);
  assert.equal(blocked.state().known.includes('hut'), false, 'outpost stays locked before shelter upgrade');

  const unlocked = boot({ base: 1, energy: 100, known: ['camp', 'river', 'forest'] });
  unlocked.context.explore(3);
  assert.equal(unlocked.state().known.includes('hut'), true, 'shelter upgrade unlocks the outpost');
  unlocked.context.explore(4);
  assert.equal(unlocked.state().known.includes('road'), true, 'outpost unlocks the old road');
}

console.log('TAIGA smoke tests passed: fire timer, idle work costs/rewards, exploration progression.');
