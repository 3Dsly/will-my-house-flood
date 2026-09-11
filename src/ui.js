// src/ui.js — DOM event wiring for the control panel and the About modal.
// main.js stays orchestration-only; this module owns every element lookup,
// listener and the modal's open/close behaviour.

const $ = (id) => document.getElementById(id);

const STATUS_LABEL = { underwater: "Underwater", atrisk: "At risk", safe: "Safe" };

export function initUI({ onSearch, onLocate, onRiseChange }) {
  const form = $("searchForm");
  const addressInput = $("addressInput");
  const searchBtn = $("searchBtn");
  const locateBtn = $("locateBtn");
  const statusLine = $("statusLine");
  const riseInput = $("riseInput");
  const riseOut = $("riseOut");
  const readout = $("readout");
  const aboutBtn = $("aboutBtn");
  const aboutPanel = $("aboutPanel");
  const aboutClose = $("aboutClose");
  const videoLink = $("videoLink");
  const presets = Array.from(
    document.querySelectorAll(".presets button[data-rise]")
  );

  const resultPanel = $("resultPanel");
  const heroWrap = $("heroWrap");
  const heroImg = $("heroImg");
  const heroBadgeValue = $("heroBadgeValue");
  const placeNameEl = $("placeName");
  const statusPill = $("statusPill");
  const statusPillText = $("statusPillText");
  const statElevation = $("statElevation");
  const statRise = $("statRise");
  const statDepth = $("statDepth");
  const statDepthEl = document.querySelector(".stat--depth");

  if (videoLink) videoLink.href = "https://youtu.be/Pc2LmfgvHQU";

  function syncPresets(rise) {
    for (const btn of presets) {
      btn.setAttribute(
        "aria-pressed",
        String(Number(btn.dataset.rise) === Number(rise))
      );
    }
  }

  function syncFill() {
    const min = Number(riseInput.min), max = Number(riseInput.max);
    const pct = ((Number(riseInput.value) - min) / (max - min)) * 100;
    riseInput.style.setProperty("--fill", `${pct}%`);
  }

  // --- Search / locate ---------------------------------------------------
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = addressInput.value.trim();
    if (!q) return; // empty input is ignored
    onSearch(q);
  });

  locateBtn.addEventListener("click", () => onLocate());

  // --- Rise slider + presets ------------------------------------------------
  riseInput.addEventListener("input", () => {
    const v = Number(riseInput.value);
    riseOut.textContent = String(v);
    syncPresets(v);
    syncFill();
    onRiseChange(v);
  });

  for (const btn of presets) {
    btn.addEventListener("click", () => {
      riseInput.value = btn.dataset.rise;
      riseInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  // --- About modal -------------------------------------------------------
  function onOutside(e) {
    if (e.target === aboutBtn || aboutPanel.contains(e.target)) return;
    closeAbout();
  }
  function onEsc(e) {
    if (e.key === "Escape") closeAbout();
  }
  function openAbout() {
    aboutPanel.hidden = false;
    document.addEventListener("click", onOutside, true);
    document.addEventListener("keydown", onEsc);
  }
  function closeAbout() {
    aboutPanel.hidden = true;
    document.removeEventListener("click", onOutside, true);
    document.removeEventListener("keydown", onEsc);
  }
  aboutBtn.addEventListener("click", openAbout);
  aboutClose.addEventListener("click", closeAbout);

  syncFill();

  return {
    focusAddress() { addressInput.focus(); },
    setStatus(text) {
      statusLine.textContent = text;
    },
    setBusy(busy) {
      searchBtn.disabled = !!busy;
      locateBtn.disabled = !!busy;
    },
    setRise(rise) {
      riseInput.value = String(rise);
      riseOut.textContent = String(rise);
      syncPresets(rise);
      syncFill();
    },
    // Transient one-line note ("Measuring elevation…", the empty-state
    // prompt, or the elevation-unavailable explanation).
    setNote(text) {
      readout.textContent = text;
    },
    // Structured result: hides/shows the stat row + status pill and updates
    // the plain-language note underneath. Does not touch the hero photo —
    // call setHero separately once per search.
    showResult(result) {
      if (!result.available) {
        resultPanel.hidden = true;
        readout.textContent = result.note;
        return;
      }
      resultPanel.hidden = false;
      placeNameEl.textContent = result.placeName;
      statusPill.dataset.status = result.status;
      statusPillText.textContent = STATUS_LABEL[result.status];
      statElevation.textContent = `${result.elevationM} m`;
      statRise.textContent = `${result.riseM} m`;
      statDepth.textContent = `${result.depthM} m`;
      statDepthEl.dataset.status = result.status;
      heroBadgeValue.textContent = String(result.riseM);
      readout.textContent = result.note;
    },
    hideResult() {
      resultPanel.hidden = true;
      heroWrap.hidden = true;
    },
    // A snapshot of the current 3D view (the same scene, just captured as
    // a still) shown as the result panel's hero image. Pass null to hide it.
    setHero(dataUrl) {
      if (!dataUrl) { heroWrap.hidden = true; return; }
      heroImg.src = dataUrl;
      heroWrap.hidden = false;
    }
  };
}
