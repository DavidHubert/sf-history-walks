(function () {
  "use strict";
  var HW = window.HW;
  var KIND = { lost_building: "Lost building", layers: "Layers of a corner", event: "Event" };
  var PRESETS = [
    { label: "Haight & Stanyan", lat: 37.7693, lon: -122.4530 },
    { label: "Haight & Ashbury", lat: 37.7700, lon: -122.4466 },
    { label: "Carl & Cole", lat: 37.7655, lon: -122.4497 },
    { label: "Irving & 9th Ave", lat: 37.7641, lon: -122.4660 },
    { label: "Lake & 14th Ave", lat: 37.7867, lon: -122.4708 }
  ];
  var RADII = [250, 500, 1000];
  var NEAR_M = 80; // distance that triggers the "you are near" banner

  var state = {
    stories: [],
    me: { lat: PRESETS[0].lat, lon: PRESETS[0].lon, acc: null, source: "demo", label: PRESETS[0].label },
    demo: { lat: PRESETS[0].lat, lon: PRESETS[0].lon, label: PRESETS[0].label },
    radius: 500,
    selected: null,
    watchId: null,
    follow: true,
    notified: {},
    toastTimer: null
  };

  function $(s) { return document.querySelector(s); }
  function el(tag, props, kids) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (k === "text") e.textContent = v;
      else if (k === "class") e.className = v;
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  /* ---------- map ---------- */
  var map = L.map("map", { zoomControl: false, tap: true }).setView([state.me.lat, state.me.lon], 16);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  // OpenStreetMap's own tiles: no key, fine for personal use. Switch provider before wider sharing.
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
  var storyLayer = L.layerGroup().addTo(map);
  var radiusCircle = L.circle([state.me.lat, state.me.lon], { radius: state.radius, color: "#1B6A73", weight: 1.5, dashArray: "5 5", fillOpacity: 0.04, interactive: false }).addTo(map);
  var accCircle = L.circle([state.me.lat, state.me.lon], { radius: 0, color: "#1B6A73", weight: 1, fillOpacity: 0.08, interactive: false }).addTo(map);
  var meMarker = L.marker([state.me.lat, state.me.lon], {
    icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
    interactive: false, keyboard: false, zIndexOffset: 1000
  }).addTo(map);

  function frame() {
    var dLat = state.radius / 110574, dLon = state.radius / 88000;
    map.fitBounds([[state.me.lat - dLat, state.me.lon - dLon], [state.me.lat + dLat, state.me.lon + dLon]], { padding: [12, 12], animate: true });
  }

  map.on("click", function (e) {
    if (state.me.source !== "demo") return;
    setMe({ lat: e.latlng.lat, lon: e.latlng.lng, source: "demo", label: "your spot" }, false);
  });
  map.on("dragstart", function () {
    if (state.me.source === "gps") { state.follow = false; $("#recenter").hidden = false; }
  });
  $("#recenter").addEventListener("click", function () {
    state.follow = true;
    $("#recenter").hidden = true;
    map.panTo([state.me.lat, state.me.lon]);
  });

  /* ---------- state changes ---------- */
  function setStatus(t) { $("#status").textContent = t; }

  function setMe(p, reframe) {
    state.me = { lat: p.lat, lon: p.lon, acc: p.acc || null, source: p.source, label: p.label || state.me.label };
    if (p.source === "demo") state.demo = { lat: p.lat, lon: p.lon, label: state.me.label };
    meMarker.setLatLng([p.lat, p.lon]);
    radiusCircle.setLatLng([p.lat, p.lon]).setRadius(state.radius);
    accCircle.setLatLng([p.lat, p.lon]).setRadius(p.acc && p.acc < 200 ? p.acc : 0);
    if (p.source === "demo") setStatus("Simulated: " + state.me.label);
    // hide an old "you are near" banner once you have moved away from that story
    var tb = $("#toast");
    if (!tb.hidden && state.toastId) {
      var ts = state.stories.filter(function (s) { return s.id === state.toastId; })[0];
      if (ts && HW.dist(state.me, ts) > NEAR_M * 1.5) tb.hidden = true;
    }
    if (reframe) frame();
    render();
    checkNear();
  }

  function setRadius(r) {
    state.radius = r;
    radiusCircle.setRadius(r);
    frame();
    render();
  }

  function select(id, scroll) {
    state.selected = id;
    render();
    if (scroll) {
      var c = document.getElementById("card-" + id);
      if (c) c.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }

  /* ---------- proximity banner ---------- */
  function checkNear() {
    var list = HW.withDistance(state.stories, state.me);
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s.d <= NEAR_M && !state.notified[s.id]) {
        state.notified[s.id] = true;
        showToast(s);
        break;
      }
    }
  }
  function showToast(s) {
    var t = $("#toast");
    state.toastId = s.id;
    t.replaceChildren(
      el("span", { text: "You are near: " + s.title }),
      el("button", { type: "button", text: "Read", onclick: function () { t.hidden = true; select(s.id, true); } })
    );
    t.hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { t.hidden = true; }, 9000);
  }

  /* ---------- GPS ---------- */
  function startGps() {
    if (!("geolocation" in navigator)) { setStatus("This browser has no location access"); return; }
    setStatus("Locating...");
    $("#locate").textContent = "Stop location";
    $("#demo").hidden = true;
    state.watchId = navigator.geolocation.watchPosition(onFix, onErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 25000 });
  }
  function stopGps() {
    if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
    $("#locate").textContent = "Use my location";
    $("#demo").hidden = false;
    $("#recenter").hidden = true;
    setMe({ lat: state.demo.lat, lon: state.demo.lon, source: "demo", label: state.demo.label }, true);
    renderControls();
  }
  function onFix(pos) {
    var c = pos.coords;
    var first = state.me.source !== "gps";
    setMe({ lat: c.latitude, lon: c.longitude, acc: c.accuracy, source: "gps", label: "you" }, false);
    setStatus("GPS, within " + Math.round(c.accuracy) + " m");
    if (first) { state.follow = true; frame(); }
    else if (state.follow) map.panTo([c.latitude, c.longitude], { animate: true });
  }
  function onErr(e) {
    var msg = { 1: "Location is blocked. Allow it for this site in your browser settings, or use a pretend spot.", 2: "Your position is not available right now.", 3: "Location timed out. Trying again." }[e.code] || "Location error.";
    setStatus(msg);
    if (e.code === 1) {
      if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
      $("#locate").textContent = "Use my location";
      $("#demo").hidden = false;
    }
  }
  $("#locate").addEventListener("click", function () {
    if (state.watchId === null) startGps(); else stopGps();
  });

  /* ---------- render ---------- */
  function renderControls() {
    $("#presets").replaceChildren.apply($("#presets"), PRESETS.map(function (p) {
      return el("button", {
        class: "chip", type: "button", text: p.label,
        "aria-pressed": String(state.me.source === "demo" && state.me.label === p.label),
        onclick: function () { setMe({ lat: p.lat, lon: p.lon, source: "demo", label: p.label }, true); renderControls(); }
      });
    }));
    $("#radii").replaceChildren.apply($("#radii"), RADII.map(function (r) {
      return el("button", {
        class: "chip", type: "button", text: r < 1000 ? r + " m" : "1 km",
        "aria-pressed": String(state.radius === r),
        onclick: function () { setRadius(r); renderControls(); }
      });
    }));
  }

  function photoFig(ph) {
    var box = el("div", { class: "photo" });
    box.appendChild(el("div", { class: "frame" }));
    box.appendChild(el("div", { class: "yr", text: ph.date }));
    var placeholder = el("div", { class: "ph" }, [
      el("b", { text: "Old photo" }),
      el("span", { text: ph.caption }),
      el("a", { href: ph.page_url, target: "_blank", rel: "noopener noreferrer", text: "See it at the source" })
    ]);
    box.appendChild(placeholder);
    var cfg = window.HW_CONFIG || {};
    var photosOff = cfg.showPhotos === false || new URLSearchParams(location.search).get("photos") === "off";
    if (ph.image_url && !photosOff) {
      var img = new Image();
      img.alt = ph.caption;
      img.referrerPolicy = "no-referrer";
      img.decoding = "async";
      img.onload = function () { placeholder.hidden = true; box.classList.add("loaded"); box.appendChild(img); };
      img.src = ph.image_url;
    }
    return el("figure", { class: "fig" }, [
      box,
      el("div", { class: "cap", text: ph.caption }),
      el("div", { class: "credit", text: "Photo: " + ph.credit })
    ]);
  }
  function noPhotoFig() {
    var box = el("div", { class: "photo" }, [
      el("div", { class: "frame" }),
      el("div", { class: "ph" }, [
        el("b", { text: "No photo matched yet" }),
        el("span", { text: "The pipeline will look for one in OpenSFHistory, SF Public Library and UCSF." }),
        el("a", { href: "https://www.opensfhistory.org/NeighborhoodPhotos/", target: "_blank", rel: "noopener noreferrer", text: "Browse OpenSFHistory" })
      ])
    ]);
    return el("figure", { class: "fig" }, [box]);
  }

  function card(s, num) {
    var photos = (s.photos && s.photos.length) ? s.photos.map(photoFig) : [noPhotoFig()];
    var src = s.source;
    var by = [src.author, src.publisher].filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join(", ");
    var title = (num ? num + ". " : "") + s.title;
    return el("article", { class: "card", id: "card-" + s.id, "data-selected": String(state.selected === s.id) }, [
      el("div", { class: "photos" }, photos),
      photos.length > 1 ? el("div", { class: "swipe", text: "Swipe for " + photos.length + " photos" }) : null,
      el("div", { class: "body" }, [
        el("div", { class: "row" }, [
          el("span", { class: "badge", text: KIND[s.kind] || "Story" }),
          el("span", { class: "meta", text: s.period + " · " + HW.fmtDist(s.d) + " · " + HW.walkMin(s.d) + " min walk" })
        ]),
        el("h3", { text: title }),
        el("p", { class: "teaser", text: s.teaser }),
        el("a", { class: "read", href: src.url, target: "_blank", rel: "noopener noreferrer", text: "Read the full story" }),
        el("p", { class: "source", text: src.title + (by ? ", " + by : "") + (src.date ? " (" + src.date + ")" : "") }),
        el("div", { class: "actions" }, [
          el("button", { class: "go", type: "button", text: "Show on map", onclick: function () { state.selected = s.id; map.setView([s.lat, s.lon], Math.max(map.getZoom(), 17)); render(); } }),
          el("a", { class: "go", target: "_blank", rel: "noopener noreferrer", href: "https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=" + s.lat + "," + s.lon, text: "Walk there" })
        ])
      ])
    ]);
  }

  function render() {
    var list = HW.withDistance(state.stories, state.me);
    var parts = HW.split(list, state.radius);
    var inside = parts.inside, outside = parts.outside;
    var rLabel = state.radius < 1000 ? state.radius + " m" : "1 km";

    // map pins
    storyLayer.clearLayers();
    list.forEach(function (s) {
      var idx = inside.indexOf(s);
      var far = idx === -1;
      var sel = state.selected === s.id;
      var html = '<div class="pinm' + (far ? " far" : "") + (sel ? " sel" : "") + '">' + (far ? "" : idx + 1) + "</div>";
      var size = far ? 28 : 28;
      L.marker([s.lat, s.lon], {
        icon: L.divIcon({ className: "", html: html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
        title: s.title, keyboard: true, bubblingMouseEvents: false
      }).on("click", function () { select(s.id, true); }).addTo(storyLayer);
    });

    $("#here-title").textContent = state.me.source === "gps" ? "Near you" : "Near " + state.me.label;
    $("#here-count").textContent = inside.length + (inside.length === 1 ? " story" : " stories") + " within " + rLabel;

    var cards = $("#cards");
    if (inside.length) {
      cards.replaceChildren.apply(cards, inside.map(function (s, i) { return card(s, i + 1); }));
    } else {
      var shown = list.slice(0, 3);
      var note = el("div", { class: "empty" }, [
        el("p", { text: "Nothing in the prototype within " + rLabel + " of here." }),
        el("p", { text: "The nearest stories are below." })
      ]);
      cards.replaceChildren.apply(cards, [note].concat(shown.map(function (s) { return card(s, 0); })));
    }

    var more = $("#more");
    if (inside.length && outside.length) {
      var wider = RADII.filter(function (r) { return r > state.radius; })[0];
      more.replaceChildren.apply(more, [
        document.createTextNode(outside.length + " more further away."),
        wider ? el("button", { class: "go", type: "button", text: "Widen to " + (wider < 1000 ? wider + " m" : "1 km"), onclick: function () { setRadius(wider); renderControls(); } }) : null
      ].filter(Boolean));
    } else {
      more.replaceChildren();
    }
  }

  /* ---------- start ---------- */
  renderControls();
  frame();
  fetch("data/stories.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (d) {
      state.stories = (d.stories || []).filter(function (s) { return (s.status || "published") === "published"; });
      render();
    })
    .catch(function (e) {
      $("#cards").replaceChildren(el("div", { class: "empty" }, [el("p", { text: "Could not load the stories (" + e.message + ")." })]));
    });
  setStatus("Simulated: " + state.me.label);

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
