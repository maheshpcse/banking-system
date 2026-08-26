/** Title-case status / role labels for portal display */
export function formatStatusLabel(value: string | null | undefined, fallback = 'Pending'): string {
  const raw = String(value || fallback).trim();
  if (!raw) {
    return fallback;
  }
  return raw
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * CSS modifier for dual-axis pills (login vs banking).
 * e.g. pill--login-blocked, pill--banking-suspended
 */
export function statusPillClass(
  axis: 'login' | 'banking',
  status: string | null | undefined
): string {
  const raw = String(status || 'pending')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
  return `pill--${axis}-${raw || 'pending'}`;
}
