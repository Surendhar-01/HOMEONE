import { BadRequestException } from '@nestjs/common';

const YYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

/** Parses an ISO date and confirms the calendar date is real (rejects 2024-02-31). */
export function parseIsoDate(value: string, fieldName = 'date'): Date {
  if (!value) {
    throw new BadRequestException(`${fieldName} is required.`);
  }

  const dateOnly = value.length === 10 ? value : value.slice(0, 10);
  if (!YYYYMMDD.test(dateOnly)) {
    throw new BadRequestException(`${fieldName} must be an ISO date (YYYY-MM-DD).`);
  }

  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${fieldName} is not a valid date.`);
  }

  if (parsed.toISOString().slice(0, 10) !== dateOnly) {
    throw new BadRequestException(`${fieldName} is not a valid calendar date.`);
  }

  return parsed;
}

export function assertSameDay(a: Date, b: Date): void {
  if (
    a.getUTCFullYear() !== b.getUTCFullYear() ||
    a.getUTCMonth() !== b.getUTCMonth() ||
    a.getUTCDate() !== b.getUTCDate()
  ) {
    throw new BadRequestException('All dates must fall on the same day (UTC).');
  }
}
