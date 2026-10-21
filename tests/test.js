// Run: node tests/test.js   (from the sf-history-walks folder)
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const HW = require("../app/lib.js");
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../app/data/stories.json"), "utf8"));

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok   " + name); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); }
}

// helpers
check("distance: Haight & Stanyan to Haight & Ashbury is about 580 m", () => {
  const d = HW.dist({ lat: 37.7693, lon: -122.4530 }, { lat: 37.7700, lon: -122.4466 });
  assert(d > 500 && d < 650, "got " + d);
});
check("fmtDist rounds to 10 m under 950 m and uses km above", () => {
  assert.strictEqual(HW.fmtDist(347), "350 m");
  assert.strictEqual(HW.fmtDist(3), "10 m");
  assert.strictEqual(HW.fmtDist(1240), "1.2 km");
});
check("walkMin is at least 1 and uses 80 m per minute", () => {
  assert.strictEqual(HW.walkMin(10), 1);
  assert.strictEqual(HW.walkMin(800), 10);
});
check("withDistance sorts nearest first; split respects radius", () => {
  const me = { lat: 37.7693, lon: -122.4530 };
  const list = HW.withDistance(data.stories, me);
  for (let i = 1; i < list.length; i++) assert(list[i - 1].d <= list[i].d);
  assert.strictEqual(list[0].id, "haight-street-grounds");
  const { inside, outside } = HW.split(list, 500);
  assert.strictEqual(inside.length + outside.length, list.length);
  assert(inside.every(s => s.d <= 500) && outside.every(s => s.d > 500));
});

// data
const required = ["id", "area", "title", "kind", "period", "lat", "lon", "teaser", "source", "photos"];
const ids = new Set();
data.stories.forEach(s => {
  check("data: " + s.id + " has required fields and sane values", () => {
    required.forEach(k => assert(k in s, "missing " + k));
    assert(!ids.has(s.id), "duplicate id");
    ids.add(s.id);
    assert(s.lat > 37.70 && s.lat < 37.82 && s.lon > -122.52 && s.lon < -122.40, "coordinates outside the city area");
    assert(["lost_building", "layers", "event"].includes(s.kind), "unknown kind " + s.kind);
    assert(["draft", "published"].includes(s.status), "status must be draft or published");
    const words = s.teaser.trim().split(/\s+/).length;
    assert(words >= 20 && words <= 60, "teaser has " + words + " words");
    assert(/^https:\/\//.test(s.source.url), "source url must be https");
    assert(s.source.title && s.source.publisher, "source title and publisher required");
    s.photos.forEach(p => {
      assert(p.caption && p.credit && p.date, "photo needs caption, date and credit");
      assert(/^https:\/\//.test(p.page_url), "photo page_url must be https");
      if (p.image_url) assert(/^https:\/\//.test(p.image_url), "image_url must be https");
    });
    assert(!/[—–]/.test(s.teaser + s.title), "no dashes used as connectors in copy");
  });
});

// scripts parse
check("app.js and sw.js parse", () => {
  new Function(fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8"));
  new Function(fs.readFileSync(path.join(__dirname, "../app/sw.js"), "utf8"));
});
check("manifest is valid JSON with icons that exist", () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, "../app/manifest.webmanifest"), "utf8"));
  m.icons.forEach(i => assert(fs.existsSync(path.join(__dirname, "../app", i.src)), i.src + " missing"));
});
check("service worker precache list files all exist", () => {
  const sw = fs.readFileSync(path.join(__dirname, "../app/sw.js"), "utf8");
  const list = JSON.parse(sw.match(/var SHELL = (\[[\s\S]*?\]);/)[1]);
  list.forEach(f => { if (f !== "./") assert(fs.existsSync(path.join(__dirname, "../app", f)), f + " missing"); });
});

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
