// json-validator.service.ts
import { Injectable } from '@angular/core';
import { JsonValidatorOptions } from '../../directives/json-validator.directive';

@Injectable({
  providedIn: 'root',
})
export class JsonValidatorService {
  /**
   * Format JSON with proper indentation
   */
  formatJson(value: string, indent = 2): string {
    if (!value || value.trim() === '') return value;

    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, indent);
    } catch (e) {
      return value; // Return original if invalid
    }
  }

  /**
   * Get validation error message
   */
  getErrorMessage(error: any): string {
    if (!error) return '';

    if (error.invalidJson) {
      return `Invalid JSON: ${error.invalidJson.error || error.invalidJson.message}`;
    }

    if (error.invalidJsonType) {
      return `Expected ${error.invalidJsonType.expected}, got ${error.invalidJsonType.actual}`;
    }

    if (error.invalidArrayLength) {
      return error.invalidArrayLength.message;
    }

    if (error.invalidArrayItemType) {
      return error.invalidArrayItemType.message;
    }

    if (error.duplicateItems) {
      return error.duplicateItems.message;
    }

    if (error.required) {
      return 'This field is required';
    }

    return 'Invalid value';
  }

  /**
   * Create validator options from string or object
   */
  createOptions(typeOrOptions: JsonValidatorOptions | string): JsonValidatorOptions {
    if (typeof typeOrOptions === 'string') {
      return { type: typeOrOptions as any };
    }
    return typeOrOptions;
  }
}
