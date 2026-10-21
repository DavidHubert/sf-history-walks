/* Pure helpers, shared by the app and the tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HW = factory();
})(typeof self !== "undefined" ? self : this, function () {
  var M_LAT = 110574; // metres per degree of latitude near San Francisco
  var M_LON = 88000;  // metres per degree of longitude near San Francisco

  function dist(a, b) {
    return Math.hypot((b.lon - a.lon) * M_LON, (b.lat - a.lat) * M_LAT);
  }
  function fmtDist(d) {
    if (d < 950) return Math.max(10, Math.round(d / 10) * 10) + " m";
    return (d / 1000).toFixed(1) + " km";
  }
  function walkMin(d) {
    return Math.max(1, Math.round(d / 80));
  }
  function withDistance(stories, me) {
    return stories
      .map(function (s) { return Object.assign({}, s, { d: dist(me, s) }); })
      .sort(function (a, b) { return a.d - b.d; });
  }
  function split(list, radius) {
    return {
      inside: list.filter(function (s) { return s.d <= radius; }),
      outside: list.filter(function (s) { return s.d > radius; })
    };
  }
  return { dist: dist, fmtDist: fmtDist, walkMin: walkMin, withDistance: withDistance, split: split };
});
