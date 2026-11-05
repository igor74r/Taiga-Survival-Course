const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('GAME_TAIGA_IDLE/index.html', 'utf8');
assert.ok(html.includes('fireMinutes:0'), 'new saves include a fire fuel timer');
assert.ok(html.includes('s.fireMinutes=180'), 'lighting a fire grants a finite fuel reserve');
assert.ok(html.includes('s.fireMinutes=Math.max(0,(s.fireMinutes||0)-min)'), 'elapsed time consumes fire fuel');
assert.ok(html.includes('s.energy=clamp(s.energy-j[3])'), 'assigning a job consumes energy');
assert.ok(html.includes('function canExplore(p)'), 'map progression has a prerequisite check');
assert.ok(html.includes("base:()=>s.base>0"), 'the outpost requires an upgraded shelter');
assert.ok(html.includes("hut:()=>s.known.includes('hut')"), 'the old road requires the outpost');
assert.ok(html.includes("road:()=>s.known.includes('road')"), 'the marsh requires the old road');
assert.ok(html.includes("{torch:1}"), 'the torch recipe creates a torch item, not a permanent fire');
console.log('TAIGA gameplay contract checks passed.');
