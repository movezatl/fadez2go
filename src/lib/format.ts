const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export function sessionTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${day.format(d)} · ${time.format(d)}`;
}

export function clockTime(iso: string) {
  return time.format(new Date(iso));
}

export function ago(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return day.format(new Date(iso));
}

export function timeLeft(iso: string, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  if (h >= 1) return `${h}h left`;
  return `${Math.max(1, Math.floor(ms / 60000))}m left`;
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? '?').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function firstName(name: string | null | undefined) {
  return (name ?? 'They').trim().split(/\s+/)[0];
}
