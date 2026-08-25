(function () {
  "use strict";

  var REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DURATION = 1400;

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function orbMarkup() {
    return (
      '<div class="abjak-orb" aria-hidden="true">' +
        '<div class="abjak-orb__bloom"></div>' +
        '<div class="abjak-orb__sphere">' +
          '<span class="abjak-orb__disc"></span>' +
          '<span class="abjak-orb__eclipse"></span>' +
          '<span class="abjak-orb__warm"></span>' +
          '<span class="abjak-orb__cool"></span>' +
          '<span class="abjak-orb__spec"></span>' +
        "</div>" +
      "</div>"
    );
  }

  function ensureAtmosphere() {
    if (document.querySelector(".abjak-atmosphere")) return;
    var el = document.createElement("div");
    el.className = "abjak-atmosphere";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="abjak-aurora abjak-aurora--a"></div>' +
      '<div class="abjak-aurora abjak-aurora--b"></div>' +
      '<div class="abjak-aurora abjak-aurora--c"></div>' +
      '<div class="abjak-grain"></div>';
    document.body.insertBefore(el, document.body.firstChild);
  }

  function reviveOrb() {
    if (document.querySelector(".abjak-orb")) return;
    var dead = document.querySelector(".framer-td4esz-container");
    if (dead) {
      dead.classList.add("abjak-orb-host");
      dead.setAttribute("aria-hidden", "true");
      dead.innerHTML = orbMarkup();
      return;
    }
    var hero = document.querySelector('[data-framer-name="Hero"]');
    var main = document.getElementById("main") || document.body;
    if (!hero && !main) return;
    var host = document.createElement("div");
    host.className = "abjak-hero-orb-host";
    host.setAttribute("aria-hidden", "true");
    host.innerHTML = orbMarkup();
    if (hero && hero.parentNode) {
      hero.parentNode.insertBefore(host, hero);
    } else {
      main.insertBefore(host, main.firstChild);
    }
  }

  function countUp(numEl, target, suffix) {
    var start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / DURATION);
      var v = Math.round(easeOut(t) * target);
      numEl.textContent = String(v);
      if (t < 1) requestAnimationFrame(frame);
      else numEl.textContent = String(target);
    }
    numEl.textContent = "0";
    requestAnimationFrame(frame);
  }

  function initStats() {
    var cards = document.querySelectorAll('[data-framer-name="Stats"]');
    if (!cards.length) return;

    var io = !REDUCE && "IntersectionObserver" in window
      ? new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var card = entry.target;
            io.unobserve(card);
            runCard(card, true);
          });
        }, { threshold: 0.35 })
      : null;

    cards.forEach(function (card) {
      prepareCard(card);
      if (REDUCE) {
        runCard(card, false);
      } else if (io) {
        var num = card.querySelector(".abjak-stat-num");
        if (num) num.textContent = "0";
        io.observe(card);
      } else {
        runCard(card, true);
      }
    });
  }

  function captionOf(card) {
    var p = card.querySelector('[data-framer-name="Description"] p, .framer-1yj27b3 p, p.framer-text');
    return (p && p.textContent) || "";
  }

  function targetFor(card) {
    var existing = card.querySelector("[data-target]");
    if (existing) {
      return {
        value: parseFloat(existing.getAttribute("data-target")) || 0,
        suffix: existing.getAttribute("data-suffix") || "",
        bar: parseFloat(existing.getAttribute("data-bar")) || 100
      };
    }
    var cap = captionOf(card);
    if (/Cut manual work/i.test(cap)) return { value: 90, suffix: "%", bar: 90 };
    if (/Boosted data visibility/i.test(cap)) return { value: 4, suffix: "x", bar: 100 };
    if (/Decreased processing time/i.test(cap)) return { value: 70, suffix: "%", bar: 70 };
    if (/Reduced cycle times/i.test(cap)) return { value: 20, suffix: "x", bar: 100 };
    return null;
  }

  function prepareCard(card) {
    var t = targetFor(card);
    if (!t) return;
    var holder = card.querySelector(".framer-1uszeqd-container") || card;
    var wrap = holder.querySelector("span[style], .abjak-stat");
    if (wrap && !wrap.classList.contains("abjak-stat")) {
      wrap.classList.add("abjak-stat");
      wrap.setAttribute("data-target", String(t.value));
      wrap.setAttribute("data-suffix", t.suffix);
      wrap.setAttribute("data-bar", String(t.bar));
    }
    var num = holder.querySelector(".abjak-stat-num");
    if (!num) {
      var inner = holder.querySelector("span span") || holder.querySelector("span");
      if (inner) {
        inner.classList.add("abjak-stat-num");
        num = inner;
      }
    }
    if (num) num.textContent = String(t.value);
    if (!card.querySelector(".abjak-stat-bar")) {
      var bar = document.createElement("div");
      bar.className = "abjak-stat-bar";
      bar.setAttribute("aria-hidden", "true");
      bar.style.setProperty("--abjak-fill", t.bar + "%");
      bar.innerHTML = "<i></i>";
      var desc = card.querySelector('[data-framer-name="Description"]');
      if (desc && desc.parentNode === card) card.appendChild(bar);
      else card.appendChild(bar);
    } else {
      card.querySelector(".abjak-stat-bar").style.setProperty("--abjak-fill", t.bar + "%");
    }
  }

  function runCard(card, animate) {
    var t = targetFor(card);
    if (!t) return;
    var num = card.querySelector(".abjak-stat-num");
    var bar = card.querySelector(".abjak-stat-bar");
    if (num) {
      if (animate && !REDUCE) countUp(num, t.value, t.suffix);
      else num.textContent = String(t.value);
    }
    if (bar) {
      if (animate && !REDUCE) {
        requestAnimationFrame(function () { bar.classList.add("is-on"); });
      } else {
        bar.classList.add("is-on");
      }
    }
  }

  function boot() {
    ensureAtmosphere();
    reviveOrb();
    initStats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
