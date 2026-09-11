// src/ui.js — DOM event wiring for the control panel and the About modal.
// main.js stays orchestration-only; this module owns every element lookup,
// listener and the modal's open/close behaviour.

const $ = (id) => document.getElementById(id);

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

  if (videoLink) videoLink.href = "https://youtu.be/Pc2LmfgvHQU";

  function syncPresets(rise) {
    for (const btn of presets) {
      btn.setAttribute(
        "aria-pressed",
        String(Number(btn.dataset.rise) === Number(rise))
      );
    }
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

  return {
    focusAddress() { addressInput.focus(); },
    setReadout(text) {
      readout.textContent = text;
    },
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
    }
  };
}
