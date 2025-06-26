import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class TimezoneService {
  private defaultTimezone = 'UTC';
  private defaultDateTimeFormat = 'yyyy-MM-dd HH:mm:ss';
  private config: any = null;

  constructor(
    private datePipe: DatePipe,
    private localStorageService: LocalStorageService
  ) {
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
   * Transform a date to the configured display timezone with custom format
   */
  transformDate(date: any, format?: string): string | null {
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

  /**
   * Transform a date to date-only format in the configured timezone
   */
  transformDateOnly(date: any): string | null {
    return this.transformDate(date, 'yyyy-MM-dd');
  }

  /**
   * Transform a date to datetime format using the configured display_datetime_format
   */
  transformDateTime(date: any): string | null {
    return this.transformDate(date, this.getDisplayDateTimeFormat());
  }

  /**
   * Transform a date to time-only format in the configured timezone
   */
  transformTimeOnly(date: any): string | null {
    return this.transformDate(date, 'HH:mm:ss');
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
    
    if (displayTimezone === 'UTC') {
      return '+00:00';
    }

    try {
      // This is a simplified approach - in production, you might want to use a proper timezone library
      const now = new Date();
      const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const offset = (now.getTime() - utc.getTime()) / (1000 * 60 * 60);
      const sign = offset >= 0 ? '+' : '-';
      const hours = Math.abs(Math.floor(offset));
      const minutes = Math.abs(Math.floor((offset % 1) * 60));
      
      return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
      const date = new Date(value);
      return !isNaN(date.getTime());
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
      datetimeFormat: this.getDisplayDateTimeFormat()
    };
  }
} 