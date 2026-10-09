import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface WorkingHourShape {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
}

/**
 * Validates the working-hours array in a single decorator so an invalid range
 * is rejected by the ValidationPipe, before the provider row is looked up or
 * any table is written.
 */
@ValidatorConstraint({ name: 'validWorkingHours', async: false })
export class WorkingHoursConstraint implements ValidatorConstraintInterface {
  validate(hours: WorkingHourShape[]): boolean {
    if (!Array.isArray(hours) || hours.length === 0) {
      return false;
    }

    const seen = new Set<number>();
    for (const hour of hours) {
      if (typeof hour?.dayOfWeek !== 'number') {
        return false;
      }
      if (!TIME_REGEX.test(hour.startTime ?? '') || !TIME_REGEX.test(hour.endTime ?? '')) {
        return false;
      }
      if ((hour.startTime ?? '') >= (hour.endTime ?? '')) {
        return false;
      }
      if (seen.has(hour.dayOfWeek)) {
        return false;
      }
      seen.add(hour.dayOfWeek);
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const value = args.value as WorkingHourShape[] | null;
    if (!Array.isArray(value) || value.length === 0) {
      return 'At least one working day must be provided.';
    }

    for (const hour of value) {
      const startTime = hour?.startTime ?? '';
      const endTime = hour?.endTime ?? '';
      if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
        return 'Times must use 24-hour HH:mm format.';
      }
      if (startTime >= endTime) {
        return `End time (${endTime}) must be later than start time (${startTime}).`;
      }
    }

    const days = value.map((h) => h?.dayOfWeek);
    const duplicate = days.find((day, index) => days.indexOf(day) !== index);
    if (duplicate !== undefined) {
      return `Day ${duplicate} is listed more than once.`;
    }

    return 'Working hours are invalid.';
  }
}

export function ValidWorkingHours(validationOptions?: ValidationOptions) {
  return function decorate(object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: WorkingHoursConstraint,
    });
  };
}