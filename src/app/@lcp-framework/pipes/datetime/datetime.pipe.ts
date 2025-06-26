import { Pipe, PipeTransform } from '@angular/core';
import { TimezoneService } from '../../service/common/timezone.service';

@Pipe({
  name: 'datetime',
  standalone: true
})
export class DatetimePipe implements PipeTransform {
  constructor(private timezoneService: TimezoneService) {}

  transform(value: any, format?: string): string | null {
    if (!value) {
      return null;
    }

    // If a specific format is provided, use it
    if (format) {
      return this.timezoneService.transformDate(value, format);
    }

    // Otherwise use the configured datetime format
    return this.timezoneService.transformWithConfigFormat(value);
  }
} 