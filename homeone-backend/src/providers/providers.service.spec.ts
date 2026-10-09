import { BadRequestException } from '@nestjs/common';
import { defaultWorkingHours, validateWorkingHours } from './providers.service';
import type { WorkingHourDto } from './dto/register-provider.dto';

const hour = (dayOfWeek: number, startTime: string, endTime: string): WorkingHourDto => ({
  dayOfWeek,
  startTime,
  endTime,
});

describe('providers.service working hours', () => {
  describe('validateWorkingHours', () => {
    it('accepts a valid set', () => {
      expect(() =>
        validateWorkingHours([hour(1, '09:00', '18:00'), hour(2, '10:00', '16:00')]),
      ).not.toThrow();
    });

    it('rejects an empty list', () => {
      expect(() => validateWorkingHours([])).toThrow(BadRequestException);
    });

    it('rejects an end time that is not later than the start time', () => {
      expect(() => validateWorkingHours([hour(1, '18:00', '09:00')])).toThrow(BadRequestException);
    });

    it('rejects equal start and end times', () => {
      expect(() => validateWorkingHours([hour(1, '09:00', '09:00')])).toThrow(BadRequestException);
    });

    it('rejects the same day listed twice', () => {
      expect(() =>
        validateWorkingHours([hour(1, '09:00', '12:00'), hour(1, '13:00', '17:00')]),
      ).toThrow(BadRequestException);
    });
  });

  describe('defaultWorkingHours', () => {
    it('covers Monday to Saturday', () => {
      const hours = defaultWorkingHours();
      expect(hours.map((h) => h.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(() => validateWorkingHours(hours)).not.toThrow();
    });
  });
});
