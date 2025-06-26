import { Pipe, PipeTransform } from '@angular/core';
import { TimezoneService } from '../../service/common/timezone.service';

@Pipe({
  name: 'date',
  standalone: true
})
export class DatePipe implements PipeTransform {
  constructor(private timezoneService: TimezoneService) {}

  transform(value: any, format?: string): string | null {
    if (!value) {
      return null;
    }

    // If a specific format is provided, use it
    if (format) {
      return this.timezoneService.transformDate(value, format);
    }

    // Otherwise use date-only format
    return this.timezoneService.transformDateOnly(value);
  }
} 