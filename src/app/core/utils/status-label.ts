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
