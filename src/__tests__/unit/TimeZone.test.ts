import {
  isValidTimeZone,
  zonedParts,
  offsetMinutes,
  formatOffset,
  wallClockToInstant,
  isNearDstTransition,
  parseIso,
  isoWallClock,
} from '../../utils/TimeZone';
import { DateFormatter } from '../../utils/DateFormatter';

// Every expectation here is a fixed instant read in a fixed zone, so the suite is
// independent of the host timezone by construction.
describe('TimeZone', () => {
  describe('isValidTimeZone', () => {
    it('accepts IANA names and rejects everything else', () => {
      expect(isValidTimeZone('UTC')).toBe(true);
      expect(isValidTimeZone('Europe/Berlin')).toBe(true);
      expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
      expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
      expect(isValidTimeZone('')).toBe(false);
      expect(isValidTimeZone('constructor')).toBe(false);
    });
  });

  describe('offsetMinutes', () => {
    it('knows whole, half and quarter hour offsets', () => {
      const t = new Date('2026-01-15T12:00:00Z');
      expect(offsetMinutes(t, 'UTC')).toBe(0);
      expect(offsetMinutes(t, 'Asia/Kolkata')).toBe(330);
      expect(offsetMinutes(t, 'Asia/Kathmandu')).toBe(345);
      expect(offsetMinutes(t, 'America/St_Johns')).toBe(-210);
    });

    it('changes with the calendar -- Berlin is +01:00 in winter and +02:00 in summer', () => {
      expect(offsetMinutes(new Date('2026-01-15T12:00:00Z'), 'Europe/Berlin')).toBe(60);
      expect(offsetMinutes(new Date('2026-07-15T12:00:00Z'), 'Europe/Berlin')).toBe(120);
    });

    it('is exact at the instant of a DST change', () => {
      // EU spring forward 2026: 2026-03-29 01:00:00Z. One second before is +01:00, at it +02:00.
      expect(offsetMinutes(new Date('2026-03-29T00:59:59Z'), 'Europe/Berlin')).toBe(60);
      expect(offsetMinutes(new Date('2026-03-29T01:00:00Z'), 'Europe/Berlin')).toBe(120);
    });
  });

  describe('zonedParts', () => {
    it('reads the wall clock in the zone, including across a date line', () => {
      const t = new Date('2026-06-30T23:30:00Z');
      expect(zonedParts(t, 'Pacific/Auckland')).toMatchObject({ month: 7, day: 1, hour: 11, minute: 30 });
      expect(zonedParts(t, 'America/Los_Angeles')).toMatchObject({ month: 6, day: 30, hour: 16, minute: 30 });
    });

    it('renders midnight as 00, never 24', () => {
      const t = new Date('2026-01-01T00:00:00Z');
      expect(zonedParts(t, 'UTC').hour).toBe(0);
    });
  });

  describe('formatOffset', () => {
    it('formats extended and basic forms and the Z special case', () => {
      expect(formatOffset(120)).toBe('+02:00');
      expect(formatOffset(-330)).toBe('-05:30');
      expect(formatOffset(0)).toBe('+00:00');
      expect(formatOffset(0, { zeroAsZ: true })).toBe('Z');
      expect(formatOffset(345, { extended: false })).toBe('+0545');
    });
  });

  describe('wallClockToInstant', () => {
    it('resolves an ordinary wall-clock time in a zone', () => {
      const p = { year: 2026, month: 1, day: 15, hour: 9, minute: 0, second: 0, millisecond: 0 };
      expect(wallClockToInstant(p, 'Asia/Tokyo').toISOString()).toBe('2026-01-15T00:00:00.000Z');
    });

    it('resolves a time that never exists (spring-forward gap) to after the gap', () => {
      // 02:30 on 2026-03-29 does not exist in Berlin: clocks jump 02:00 -> 03:00.
      const p = { year: 2026, month: 3, day: 29, hour: 2, minute: 30, second: 0, millisecond: 0 };
      const instant = wallClockToInstant(p, 'Europe/Berlin');
      expect(instant.toISOString()).toBe('2026-03-29T01:30:00.000Z'); // 03:30 +02:00
    });

    it('resolves an ambiguous time (autumn repeat) deterministically', () => {
      // 02:30 on 2026-10-25 happens twice in Berlin (+02:00 then +01:00).
      const p = { year: 2026, month: 10, day: 25, hour: 2, minute: 30, second: 0, millisecond: 0 };
      const instant = wallClockToInstant(p, 'Europe/Berlin');
      expect(['2026-10-25T00:30:00.000Z', '2026-10-25T01:30:00.000Z']).toContain(instant.toISOString());
    });
  });

  describe('isNearDstTransition', () => {
    it('flags the hour around a changeover and nothing else', () => {
      expect(isNearDstTransition(new Date('2026-03-29T00:30:00Z'), 'Europe/Berlin')).toBe(true);
      expect(isNearDstTransition(new Date('2026-03-29T01:30:00Z'), 'Europe/Berlin')).toBe(true);
      expect(isNearDstTransition(new Date('2026-03-29T12:00:00Z'), 'Europe/Berlin')).toBe(false);
      expect(isNearDstTransition(new Date('2026-03-29T00:30:00Z'), 'Asia/Tokyo')).toBe(false);
    });
  });

  describe('parseIso / isoWallClock', () => {
    it('detects whether the input pins an instant', () => {
      expect(parseIso('2026-03-29T01:30:00Z').hasOffset).toBe(true);
      expect(parseIso('2026-03-29T01:30:00+01:00').hasOffset).toBe(true);
      expect(parseIso('2026-03-29T01:30:00').hasOffset).toBe(false);
      expect(() => parseIso('yesterday')).toThrow(/Cannot parse/);
    });

    it('reads wall-clock fields literally', () => {
      expect(isoWallClock('2026-03-29T01:30:00.5')).toMatchObject({ hour: 1, minute: 30, millisecond: 500 });
      expect(isoWallClock('2026-03-29')).toMatchObject({ hour: 0, minute: 0 });
    });
  });

  describe('DateFormatter with an explicit zone', () => {
    const t = new Date('2026-07-15T12:34:56.789Z');

    it('renders the same instant differently per zone, with the right offset', () => {
      expect(DateFormatter.format(t, 'YYYY-MM-DDTHH:mm:ss.SSSZ', 'UTC')).toBe('2026-07-15T12:34:56.789Z');
      expect(DateFormatter.format(t, 'YYYY-MM-DDTHH:mm:ss.SSSZ', 'Europe/Berlin')).toBe('2026-07-15T14:34:56.789+02:00');
      expect(DateFormatter.format(t, 'YYYY-MM-DDTHH:mm:ss.SSSZ', 'Asia/Kolkata')).toBe('2026-07-15T18:04:56.789+05:30');
      expect(DateFormatter.format(t, 'YYYY-MM-DD HH:mm ZZ', 'America/New_York')).toBe('2026-07-15 08:34 -0400');
    });

    it('every zoned rendering round-trips to the same instant', () => {
      for (const zone of ['UTC', 'Europe/Berlin', 'Asia/Kolkata', 'Pacific/Chatham', 'America/St_Johns']) {
        const s = DateFormatter.format(t, 'YYYY-MM-DDTHH:mm:ss.SSSZ', zone);
        expect(new Date(s).getTime()).toBe(t.getTime());
      }
    });
  });
});
