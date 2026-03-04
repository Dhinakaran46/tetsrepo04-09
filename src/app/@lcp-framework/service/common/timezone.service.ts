import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LocalStorageService } from './local-storage.service';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class TimezoneService {
  private defaultTimezone = 'UTC';
  //private defaultDateTimeFormat = 'yyyy-MM-dd HH:mm:ss';
  private defaultDateTimeFormat = 'yyyy-MM-dd HH:mm';
  private config: any = null;

  constructor(private datePipe: DatePipe, private localStorageService: LocalStorageService) {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const configData = this.localStorageService.getData('config');
      if (configData) {
        this.config = JSON.parse(configData);
      }
    } catch (error) {
      console.warn('Error loading config for timezone service:', error);
    }
  }

  /**
   * Get the display timezone from config
   */
  getDisplayTimezone(): string {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config?.display_timezone || this.defaultTimezone;
  }

  /**
   * Get the display datetime format from config
   */
  getDisplayDateTimeFormat(): string {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config?.display_datetime_format || this.defaultDateTimeFormat;
  }

  /**
   * Transform a date to the configured display timezone with custom format using Luxon
   */
  /*transformDate(date: any, format?: string): string | null {
    if (!date) {
      return null;
    }
    const displayTimezone = this.getDisplayTimezone();
    const displayFormat = format || this.getDisplayDateTimeFormat();
    try {
      // Always parse as UTC
      let dt: DateTime;
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Date only, treat as UTC midnight
        dt = DateTime.fromISO(date + 'T00:00:00', { zone: 'utc' });
      } else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(date)) {
        dt = DateTime.fromISO(date.replace(' ', 'T'), { zone: 'utc' });
      } else if (typeof date === 'string' && date.endsWith('Z')) {
        dt = DateTime.fromISO(date, { zone: 'utc' });
      } else if (typeof date === 'string') {
        // Try parse as ISO, fallback to JS Date
        dt = DateTime.fromISO(date, { zone: 'utc' });
        if (!dt.isValid) {
          dt = DateTime.fromJSDate(new Date(date), { zone: 'utc' });
        }
      } else if (date instanceof Date) {
        dt = DateTime.fromJSDate(date, { zone: 'utc' });
      } else {
        return null;
      }
      if (!dt.isValid) return null;
      // Convert to target timezone
      const zoned = dt.setZone(displayTimezone);
      // Format using Luxon's tokens
      return zoned.toFormat(this.mapFormat(displayFormat));
    } catch (error) {
      console.warn('Error transforming date with timezone:', error);
      return null;
    }
  }*/

  transformDateForDT(date: any, format?: string): string | null {
    if (!date) {
      return null;
    }

    const displayTimezone = this.getDisplayTimezone();
    const displayFormat = format || this.getDisplayDateTimeFormat();

    try {
      // If the input is a date-only string (e.g., '2025-06-25'), set time to 00:00:00
      let dateObj: Date;
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        dateObj = new Date(date + 'T00:00:00');
      } else {
        dateObj = date instanceof Date ? date : new Date(date);
      }
      // If the date is invalid, return null
      if (isNaN(dateObj.getTime())) {
        return null;
      }
      // For UTC timezone, use the standard date pipe
      if (displayTimezone === 'UTC') {
        return this.datePipe.transform(dateObj, displayFormat, 'UTC');
      }
      // For other timezones, we need to convert the date
      // This is a simplified approach - in a production environment,
      // you might want to use a library like date-fns-tz or moment-timezone
      return this.datePipe.transform(dateObj, displayFormat, displayTimezone);
    } catch (error) {
      console.warn('Error transforming date with timezone:', error);
      // Fallback to standard date pipe
      return this.datePipe.transform(date, displayFormat);
    }
  }
  transformDate(date: any, format?: string): string | null {
    if (!date) {
      return null;
    }
    const displayTimezone = this.getDisplayTimezone();
    const displayFormat = this.getDisplayDateTimeFormat() || format || this.defaultDateTimeFormat;

    try {
      // Always parse as UTC
      let dt: DateTime;
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Date only, treat as UTC midnight
        dt = DateTime.fromISO(date + 'T00:00:00', { zone: 'utc' });
      } else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(date)) {
        dt = DateTime.fromISO(date.replace(' ', 'T'), { zone: 'utc' });
      } else if (typeof date === 'string' && date.endsWith('Z')) {
        dt = DateTime.fromISO(date, { zone: 'utc' });
      } else if (typeof date === 'string') {
        // Try parse as ISO, fallback to JS Date
        dt = DateTime.fromISO(date, { zone: 'utc' });
        if (!dt.isValid) {
          dt = DateTime.fromJSDate(new Date(date), { zone: 'utc' });
        }
      } else if (date instanceof Date) {
        dt = DateTime.fromJSDate(date, { zone: 'utc' });
      } else {
        return null;
      }
      if (!dt.isValid) return null;
      // Convert to target timezone
      const zoned = dt.setZone(displayTimezone);
      // Format using Luxon's tokens
      return zoned.toFormat(this.mapFormat(displayFormat));
    } catch (error) {
      console.warn('Error transforming date with timezone:', error);
      return null;
    }
  }

  /**
   * Map Angular date format to Luxon format (basic support)
   */
  private mapFormat(format: string): string {
    // Angular and Luxon are mostly compatible for yyyy-MM-dd HH:mm:ss
    // Add more mappings if you use other tokens
    return format
      .replace(/a/g, 'a') // AM/PM
      .replace(/Z/g, 'ZZ'); // Timezone offset
  }

  /**
   * Transform a date to date-only format in the configured timezone
   */
  transformDateOnly(date: any): string | null {
    return this.transformDateForDT(date, 'yyyy-MM-dd');
  }

  /**
   * Transform a date to datetime format using the configured display_datetime_format
   */
  transformDateTime(date: any): string | null {
    //return this.transformDate(date, 'yyyy-MM-dd HH:mm:ss');
    return this.transformDate(date, 'yyyy-MM-dd HH:mm');
  }

  /**
   * Convert datetime entered in display timezone (e.g. datetime-local input)
   * to UTC format for backend filters.
   * transformDisplayDateTimeToUTC(date: any, outputFormat: string = 'yyyy-MM-dd HH:mm:ss'): string | null {
   */
  transformDisplayDateTimeToUTC(date: any, outputFormat: string = 'yyyy-MM-dd HH:mm'): string | null {
    if (!date) {
      return null;
    }

    const displayTimezone = this.getDisplayTimezone();
    try {
      let dt: DateTime;

      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(date)) {
        dt = DateTime.fromISO(date, { zone: displayTimezone });
      } else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(date)) {
        dt = DateTime.fromISO(date.replace(' ', 'T'), { zone: displayTimezone });
      } else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        dt = DateTime.fromISO(date + 'T00:00:00', { zone: displayTimezone });
      } else if (typeof date === 'string') {
        dt = DateTime.fromISO(date, { setZone: true });
        if (!dt.isValid) {
          dt = DateTime.fromJSDate(new Date(date), { zone: displayTimezone });
        }
      } else if (date instanceof Date) {
        dt = DateTime.fromJSDate(date);
      } else {
        return null;
      }

      if (!dt.isValid) {
        return null;
      }

      return dt.setZone('utc').toFormat(this.mapFormat(outputFormat));
    } catch (error) {
      console.warn('Error converting display datetime to UTC:', error);
      return null;
    }
  }

  /**
   * Transform a date to time-only format in the configured timezone
   */
  transformTimeOnly(date: any): string | null {
    //return this.transformDateForDT(date, 'HH:mm:ss');
    return this.transformDateForDT(date, 'HH:mm');
  }

  /**
   * Transform a date using the configured display_datetime_format
   */
  transformWithConfigFormat(date: any): string | null {
    return this.transformDate(date, this.getDisplayDateTimeFormat());
  }

  /**
   * Get current timezone offset string (e.g., "+05:30", "-08:00")
   */
  getTimezoneOffset(): string {
    const displayTimezone = this.getDisplayTimezone();
    try {
      const now = DateTime.utc().setZone(displayTimezone);
      return now.toFormat('ZZ'); // e.g. +05:30
    } catch (error) {
      console.warn('Error getting timezone offset:', error);
      return '+00:00';
    }
  }

  /**
   * Check if a value is a valid date
   */
  isDate(value: any): boolean {
    if (!value) {
      return false;
    }
    try {
      let dt: DateTime;
      if (typeof value === 'string') {
        dt = DateTime.fromISO(value, { zone: 'utc' });
        if (!dt.isValid) {
          dt = DateTime.fromJSDate(new Date(value), { zone: 'utc' });
        }
      } else if (value instanceof Date) {
        dt = DateTime.fromJSDate(value, { zone: 'utc' });
      } else {
        return false;
      }
      return dt.isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Reload config (useful when config changes)
   */
  reloadConfig() {
    this.loadConfig();
  }

  /**
   * Get both timezone and datetime format configuration
   */
  getConfig() {
    return {
      timezone: this.getDisplayTimezone(),
      datetimeFormat: this.getDisplayDateTimeFormat(),
    };
  }
}
