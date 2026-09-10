// src/geolocate.js
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("geolocation-unavailable"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED ? "geolocation-denied" : "geolocation-failed")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });
}
