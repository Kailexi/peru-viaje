
(function () {
  "use strict";

  // The order chapters appear in, top to bottom. An id here must match
  // a <template data-section="id"> in index.html (or a render() fn a
  // section registered).
  const SECTION_ORDER = [
    "hero",
    "meetTraveller",
    "notesMarquee",
    "photosBefore",
    "photosDuring"
  ];

  // id -> { tracked, trackLabelKey, init(sectionEl), render() }
  const registry = {};

  function register(id, config) {
    registry[id] = Object.assign(
      { tracked: false, trackLabelKey: null, init: null, render: null },
      registry[id] || {},
      config || {}
    );
  }

  function mountSection(id, root) {
    const cfg = registry[id] || {};
    let el = null;
    if (typeof cfg.render === "function") {
      el = cfg.render();
    } else {
      const tpl = document.querySelector('template[data-section="' + id + '"]');
      if (tpl && tpl.content.firstElementChild) {
        el = tpl.content.firstElementChild.cloneNode(true);
      }
    }
    if (!el) return null;
    el.dataset.sectionId = id;
    root.appendChild(el);
    return { id, el, cfg };
  }

  let hasLoaded = false;
  function loadSections() {
    const root = document.getElementById("appRoot");
    if (!root || hasLoaded) return; // guard against a double DOMContentLoaded
    hasLoaded = true;
    root.innerHTML = "";

    const mounted = [];
    SECTION_ORDER.forEach(function (id) {
      const m = mountSection(id, root);
      if (m) mounted.push(m);
    });

    // Now that the real section DOM exists, translate it.
    if (typeof applyLanguage === "function" && typeof getCurrentLang === "function") {
      applyLanguage(getCurrentLang());
    }

    // Boot each section's own behaviour.
    mounted.forEach(function (m) {
      if (typeof m.cfg.init === "function") {
        try {
          m.cfg.init(m.el);
        } catch (err) {
          console.error('Sección "' + m.id + '" falló al iniciar:', err);
        }
      }
    });

    initReveal(root);
    buildScrollProgress(
      mounted.filter(function (m) {
        return m.cfg.tracked;
      })
    );

    document.dispatchEvent(new CustomEvent("sectionsloaded", { detail: { mounted: mounted } }));
  }


  function buildScrollProgress(trackedSections) {
    const nav = document.getElementById("scrollProgress");
    if (!nav || trackedSections.length === 0) return;

    nav.innerHTML = "";
    const dots = trackedSections.map(function (m, i) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "progress-dot";
      const labelKey = m.cfg.trackLabelKey;
      const label =
        labelKey && typeof t === "function" ? t(labelKey) : String(i + 1);
      dot.setAttribute("aria-label", label);
      dot.setAttribute("title", label);
      if (labelKey) dot.dataset.i18nAria = labelKey;
      dot.addEventListener("click", function () {
        m.el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      nav.appendChild(dot);
      return { dot: dot, el: m.el };
    });
    nav.hidden = false;

    function setActive(activeEl) {
      dots.forEach(function (d) {
        d.dot.classList.toggle("is-filled", d.el === activeEl);
      });
    }

    if ("IntersectionObserver" in window) {
      // The section whose middle is nearest the viewport middle wins.
      let ratios = new Map();
      const obs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
          });
          let best = null;
          let bestRatio = 0;
          dots.forEach(function (d) {
            const r = ratios.get(d.el) || 0;
            if (r > bestRatio) {
              bestRatio = r;
              best = d.el;
            }
          });
          if (best) setActive(best);
        },
        { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-35% 0px -35% 0px" }
      );
      dots.forEach(function (d) {
        obs.observe(d.el);
      });
    } else {
      setActive(dots[0].el);
    }
  }


  function initReveal(root) {
    const els = (root || document).querySelectorAll(".reveal");
    if (els.length && "IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      els.forEach(function (el) {
        obs.observe(el);
      });
    } else {
      els.forEach(function (el) {
        el.classList.add("is-visible");
      });
    }
  }


  function connectTrail(container, itemSelector) {
    if (!container) return function () {};

    let svg = container.querySelector(":scope > .trail-lines");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "trail-lines");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("preserveAspectRatio", "none");
      container.insertBefore(svg, container.firstChild);
    }

    function draw() {
      const items = Array.prototype.slice.call(
        container.querySelectorAll(itemSelector)
      );
      const cRect = container.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + cRect.width + " " + cRect.height);
      svg.setAttribute("width", cRect.width);
      svg.setAttribute("height", cRect.height);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      for (let i = 0; i < items.length - 1; i++) {
        const a = items[i].getBoundingClientRect();
        const b = items[i + 1].getBoundingClientRect();
        // From the bottom-centre of card i to the top-centre of card i+1,
        // relative to the container's own coordinate space.
        const x1 = a.left + a.width / 2 - cRect.left;
        const y1 = a.bottom - cRect.top;
        const x2 = b.left + b.width / 2 - cRect.left;
        const y2 = b.top - cRect.top;
        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        // A gentle curve so the trail feels hand-drawn, not ruler-straight.
        const midY = (y1 + y2) / 2;
        line.setAttribute(
          "d",
          "M " + x1 + " " + y1 + " C " + x1 + " " + midY + ", " + x2 + " " + midY + ", " + x2 + " " + y2
        );
        line.setAttribute("class", "trail-line");
        svg.appendChild(line);
      }
    }

    draw();
    // Redraw after images finish loading (they change card heights).
    container.querySelectorAll("img").forEach(function (img) {
      if (!img.complete) img.addEventListener("load", draw, { once: true });
    });
    let raf = null;
    const onResize = function () {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", onResize);
    return draw; // caller can force a redraw
  }

  // Public surface used by app.js.
  window.SiteSections = {
    register: register,
    order: SECTION_ORDER,
    connectTrail: connectTrail
  };

  // Re-translate the progress-dot aria labels on language change.
  document.addEventListener("langchange", function () {
    document
      .querySelectorAll("#scrollProgress .progress-dot[data-i18n-aria]")
      .forEach(function (dot) {
        if (typeof t === "function") {
          const label = t(dot.dataset.i18nAria);
          dot.setAttribute("aria-label", label);
          dot.setAttribute("title", label);
        }
      });
  });

  document.addEventListener("DOMContentLoaded", loadSections);
})();
