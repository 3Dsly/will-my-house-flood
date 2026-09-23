// International foot: exactly 0.3048 metres. Convert before rounding.
const number = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
export const feet = metres => number.format(metres / 0.3048);
export const distance = metres => `${number.format(metres)} m (${feet(metres)} ft)`;
export function updateRiseLabel(value) {
  document.getElementById('riseOut').textContent = number.format(value);
  document.getElementById('riseFeet').textContent = `${feet(value)} ft`;
  document.getElementById('riseInput').setAttribute('aria-valuetext', distance(value));
}
