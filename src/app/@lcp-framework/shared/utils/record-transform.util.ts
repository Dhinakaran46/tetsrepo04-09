import { TimezoneService } from '../../service/common/timezone.service';
import { TranslateService } from '@ngx-translate/core';

export function filterAndTransformData(
  headers: any[],
  records: any[],
  timezoneService: TimezoneService,
  translate: TranslateService,
  getStatusTranslation: (status: string) => string,
  getProcessStatusTranslation: (status: string) => string
): any[] {
  const filteredHeaders = headers.filter((header) => header.header !== 'id' && header.header !== 'uuid');
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)?$/;

  return records.map((record) => {
    const transformedRecord: any = {};
    filteredHeaders.forEach((header) => {
      const translationKey = `${header.header}`;
      const translatedHeader = translate.instant(translationKey);
      const value = record[header.header];

      if (header.field_type_id == '5') {
        transformedRecord[translatedHeader] = timezoneService.transformDateOnly(value);
      } else if (header.field_type_id == '7') {
        transformedRecord[translatedHeader] = timezoneService.transformDateTime(value);
      } else if (header.header == 'status') {
        transformedRecord[translatedHeader] = getStatusTranslation(value);
      } else if (header.header == 'process_status') {
        transformedRecord[translatedHeader] = getProcessStatusTranslation(value);
      } else if (timezoneService.isDate(value) || (typeof value === 'string' && isoDateRegex.test(value))) {
        transformedRecord[translatedHeader] = timezoneService.transformDateTime(value);
      } else {
        transformedRecord[translatedHeader] = value;
      }
    });
    return transformedRecord;
  });
} 