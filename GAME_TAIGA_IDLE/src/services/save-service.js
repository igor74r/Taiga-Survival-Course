(function (root) {
  "use strict";

  const VERSION = 2;
  const NUMERIC_RANGES = {
    day: [1, 1000000], hour: [0, 23],
    hp: [0, 100], hunger: [0, 100], thirst: [0, 100],
    energy: [0, 100], warmth: [0, 100], morale: [0, 100],
    wood: [0, 999999], branch: [0, 999999], stone: [0, 999999],
    berry: [0, 999999], mushroom: [0, 999999], water: [0, 999999],
    fish: [0, 999999], metal: [0, 999999], cloth: [0, 999999],
    food: [0, 999999], knife: [0, 999999], base: [0, 1],
    fire: [0, 1], fireMinutes: [0, 180], torch: [0, 999999],
    story: [0, 1000000]
  };
  const TABS = new Set(["camp", "work", "craft", "map", "bag"]);
  const LOCATIONS = new Set(["camp", "river", "forest", "hut", "road", "marsh"]);
  const RESOURCES = new Set(Object.keys(NUMERIC_RANGES).filter(k =>
    !["day", "hour", "hp", "hunger", "thirst", "energy", "warmth", "morale", "base", "fire", "fireMinutes", "story"].includes(k)
  ));
  const JOBS = new Set([
    "Собирать ветки", "Рубить сухостой", "Собирать ягоды",
    "Искать камень", "Набирать воду", "Проверить ручей"
  ]);

  function finite(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalize(raw, freshState, now) {
    const base = freshState();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ...base, version: VERSION, last: now };
    }

    // v1 is the original prototype format. Its fields are migrated into v2.
    const sourceVersion = Number.isInteger(raw.version) ? raw.version : 1;
    if (sourceVersion < 1 || sourceVersion > VERSION) {
      return { ...base, version: VERSION, last: now };
    }

    const state = { ...base };
    for (const [key, range] of Object.entries(NUMERIC_RANGES)) {
      const fallback = base[key] ?? 0;
      const value = finite(raw[key], fallback);
      state[key] = Math.max(range[0], Math.min(range[1], value));
    }

    state.version = VERSION;
    state.last = finite(raw.last, now);
    if (state.last < 0 || state.last > now + 5 * 60 * 1000) state.last = now;
    state.fire = state.fireMinutes > 0 ? 1 : 0;

    state.known = Array.isArray(raw.known)
      ? [...new Set(raw.known.filter(x => LOCATIONS.has(x)))].slice(0, LOCATIONS.size)
      : base.known;
    if (!state.known.includes("camp")) state.known.unshift("camp");

    state.jobs = Array.isArray(raw.jobs) ? raw.jobs.slice(0, 2).flatMap(job => {
      if (!job || typeof job !== "object" || !JOBS.has(job.name)) return [];
      const left = Math.max(0, Math.min(24 * 60, finite(job.left, 0)));
      if (left <= 0) return [];
      const reward = {};
      if (job.reward && typeof job.reward === "object" && !Array.isArray(job.reward)) {
        for (const [key, value] of Object.entries(job.reward)) {
          if (RESOURCES.has(key)) reward[key] = Math.max(0, Math.min(999, finite(value, 0)));
        }
      }
      if (!Object.keys(reward).length) return [];
      return [{ name: job.name, left, reward, paid: false }];
    }) : [];

    state.crafted = Array.isArray(raw.crafted)
      ? raw.crafted.filter(x => typeof x === "string").slice(0, 100)
      : [];
    state.log = Array.isArray(raw.log)
      ? raw.log.filter(x => typeof x === "string").slice(0, 18).map(x => x.slice(0, 240))
      : base.log;
    state.tab = TABS.has(raw.tab) ? raw.tab : "camp";
    state.day = Math.floor(state.day);
    state.hour = Math.floor(state.hour);
    return state;
  }

  root.TaigaSave = Object.freeze({ VERSION, normalize });
  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.TaigaSave;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
