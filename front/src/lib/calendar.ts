/** Minimal iCalendar (.ics) export so learners can add a live session to Google / Outlook / Apple. */
export interface CalendarEventInput {
  uid: string;
  title: string;
  description?: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm (Dakar time = UTC) */
  time: string;
  /** "1h30", "90 min", "2h"... defaults to 1 hour. */
  duration?: string | null;
  url?: string | null;
}

function minutesFromDuration(value: string | null | undefined) {
  const text = String(value ?? '').toLowerCase();
  const hours = Number(text.match(/(\d+)\s*h/)?.[1] ?? 0);
  const minutes = Number(text.match(/(\d+)\s*(?:min|m\b)/)?.[1] ?? text.match(/h\s*(\d{1,2})/)?.[1] ?? 0);
  return hours * 60 + minutes || 60;
}

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (char) => `\\${char}`);

export function buildIcs(event: CalendarEventInput) {
  const start = new Date(`${event.date}T${(event.time || '00:00').slice(0, 5)}:00Z`);
  const end = new Date(start.getTime() + minutesFromDuration(event.duration) * 60_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//C2P//Classes virtuelles//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.uid}@c2p.sn`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    event.description ? `DESCRIPTION:${escape(event.description)}` : null,
    event.url ? `URL:${event.url}` : null,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(event.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export function downloadIcs(filename: string, event: CalendarEventInput) {
  const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
