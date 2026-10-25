// client/src/test/utils.test.js
import { describe, it, expect } from 'vitest';
import { formatCountdown, formatDuration, formatDate } from '../utils/formatDate';
import { cn } from '../utils/cn';

describe('Frontend Utility Functions', () => {
  describe('formatCountdown', () => {
    it('should format 0 or negative seconds as 00:00', () => {
      expect(formatCountdown(0)).toBe('00:00');
      expect(formatCountdown(-10)).toBe('00:00');
    });

    it('should format seconds into MM:SS format', () => {
      expect(formatCountdown(65)).toBe('01:05');
      expect(formatCountdown(59)).toBe('00:59');
      expect(formatCountdown(600)).toBe('10:00');
    });

    it('should format durations over 1 hour into HH:MM:SS format', () => {
      expect(formatCountdown(3665)).toBe('01:01:05');
      expect(formatCountdown(7200)).toBe('02:00:00');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes to readable string', () => {
      expect(formatDuration(45)).toBe('45 min');
      expect(formatDuration(60)).toBe('1 hr');
      expect(formatDuration(90)).toBe('1 hr 30 min');
      expect(formatDuration(120)).toBe('2 hr');
      expect(formatDuration(0)).toBe('—');
      expect(formatDuration(null)).toBe('—');
    });
  });

  describe('cn (Classnames utility)', () => {
    it('should combine and filter class names properly', () => {
      expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
      expect(cn('btn', false && 'hidden', null, undefined, 'active')).toBe('btn active');
    });
  });
});
