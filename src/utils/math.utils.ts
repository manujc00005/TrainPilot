export function metersToKm(meters: number): number {
  return meters / 1000;
}

export function secondsToHours(seconds: number): number {
  return seconds / 3600;
}

export function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

export function speedToSecsPerKm(speedMs: number): number {
  if (speedMs <= 0) return 0;
  return 1000 / speedMs;
}

export function formatPace(secsPerKm: number): string {
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')}/km`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

// Adjust pace for temperature (Daniels' formula approximation)
// ~1% slower per 5°C above 15°C
export function temperaturePaceAdjustment(tempCelsius: number): number {
  if (tempCelsius <= 15) return 1.0;
  return 1 + ((tempCelsius - 15) / 5) * 0.01;
}

export function round(value: number, decimals = 2): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
