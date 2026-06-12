// src/app/helpers/handlebars-helpers.ts
import { TranslateService } from '@ngx-translate/core';
import * as Handlebars from 'handlebars';

// Export a function to register helpers
export function registerHandlebarsHelpers(translate: TranslateService) {
  // Increment helper
  Handlebars.registerHelper('hbp_inc', function (value) {
    return parseInt(value) + 1;
  });

  // Truncate helper
  Handlebars.registerHelper('hbp_truncate', (text: string, maxLength: number) => {
    if (text && text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  });

  // Translation helper using TranslateService
  Handlebars.registerHelper('hbp_translate', (key: string) => {
    return translate.instant(key); // Fetch translation from ngx-translate
  });

  Handlebars.registerHelper('hbp_translate_dynamic', function (key: any) {
    if (key === null || key === undefined) return '';

    // 🔴 IMPORTANT: normalize runtime values
    const normalizedKey = typeof key === 'string' ? key : key?.toString ? key.toString() : String(key);

    const translated = translate.instant(normalizedKey);

    // fallback if translation not found
    return translated !== normalizedKey ? translated : normalizedKey;
  });

  // Limit helper
  Handlebars.registerHelper('hbp_limit', function (items: any[], limit: number) {
    if (Array.isArray(items)) {
      return items.slice(0, limit);
    }
    return [];
  });

  Handlebars.registerHelper('hbp_eq', function (arg1, arg2) {
    return arg1 === arg2;
  });

  Handlebars.registerHelper('hbp_math', function (v1: any, operator: string, v2: any) {
    const a = Number(v1);
    const b = Number(v2);
    switch (operator) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      case '%': return b !== 0 ? a % b : 0;
      default:  return 0;
    }
  });

  Handlebars.registerHelper('hbp_isArray', function (value) {
    if (typeof value === 'object' && value !== null) {
      // Check if it is an array-like object (with numeric keys)
      return Object.keys(value).some((key) => !isNaN(Number(key))); // This checks if keys are numeric (e.g., "0", "1", etc.)
    }
    // Otherwise, return false indicating it's not an array
    return Array.isArray(value);
  });

  Handlebars.registerHelper('hbp_ifCond', function (this: any, v1: any, operator: string, v2: any, options: any) {
    // Coerce both sides to the same type for numeric comparisons
    const n1 = Number(v1);
    const n2 = Number(v2);
    const bothNumeric = !isNaN(n1) && !isNaN(n2);
    const a = bothNumeric ? n1 : v1;
    const b = bothNumeric ? n2 : v2;

    let result = false;
    switch (operator) {
      case '==':  result = a == b; break;
      case '===': result = a === b; break;
      case '!=':  result = a != b; break;
      case '!==': result = a !== b; break;
      case '<':   result = a < b;  break;
      case '<=':  result = a <= b; break;
      case '>':   result = a > b;  break;
      case '>=':  result = a >= b; break;
    }
    return result ? options.fn(this) : options.inverse(this);
  });
}
