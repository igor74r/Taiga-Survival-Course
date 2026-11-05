const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('GAME_TAIGA_IDLE/index.html', 'utf8');
const sw = fs.readFileSync('GAME_TAIGA_IDLE/sw.js', 'utf8');

// Static contract checks: these verify source structure, not runtime gameplay.
assert.ok(html.includes('fireMinutes:0'), 'new saves include a fire fuel timer');
assert.ok(html.includes('TaigaSave.normalize(stored,fresh,Date.now())'), 'loaded saves pass through the validator');
assert.ok(html.includes('src/services/save-service.js'), 'the save service is loaded before game startup');
assert.ok(html.includes("const recipes=[['Костяной нож"), 'recipe catalog is defined at app scope');
assert.ok(!html.includes("if(s.tab==='craft'){const recipes="), 'craft screen does not define a shadow recipe catalog');
assert.ok(html.includes('s.fireMinutes=180'), 'lighting a fire grants a finite fuel reserve');
assert.ok(html.includes("catch(e){saveWarning=true;console.warn('TAIGA: не удалось сохранить игру',e);return false}"), 'storage write failures are handled without throwing');
assert.ok(html.includes('Не удалось сохранить прогресс.'), 'the UI warns when saving is unavailable');
assert.ok(html.includes('s.fireMinutes=Math.max(0,(s.fireMinutes||0)-min)'), 'elapsed time consumes fire fuel');
assert.ok(html.includes('s.energy=clamp(s.energy-j[3])'), 'assigning a job consumes energy');
assert.ok(html.includes('function canExplore(p)'), 'map progression has a prerequisite check');
assert.ok(html.includes("base:()=>s.base>0"), 'the outpost requires an upgraded shelter');
assert.ok(html.includes("hut:()=>s.known.includes('hut')"), 'the old road requires the outpost');
assert.ok(html.includes("road:()=>s.known.includes('road')"), 'the marsh requires the old road');

// Crafting UI and execution must use the same recipe catalog.
assert.equal((html.match(/const recipes=/g) || []).length, 1, 'there is exactly one recipe catalog');
assert.ok(html.includes("['Факел',{branch:2,wood:1},{torch:1},'torch']"), 'torch recipe grants a torch item');
assert.ok(html.includes('let r=recipes[i]'), 'crafting execution reads the shared recipe catalog');
assert.ok(!html.includes("{fire:1}"), 'crafting must not grant the fire timer as an inventory item');

// Fire action must validate and consume the cost before changing fire state.
assert.ok(html.includes("if(a==='fire'){if(s.fire>0||!spend({branch:2,wood:1}))return;s.fire=1;"),
  'fire action aborts when already lit or when resources are insufficient');

// Service worker must not clear unrelated origin caches or return HTML for failed asset requests.
assert.ok(sw.includes('key.startsWith(CACHE_PREFIX)'), 'cache cleanup is limited to TAIGA caches');
assert.ok(sw.includes('request.mode === "navigate"'), 'app-shell fallback is navigation-only');
assert.ok(sw.includes('status: 503'), 'failed non-navigation requests return a service-unavailable response');

console.log('TAIGA static gameplay contract checks passed.');
