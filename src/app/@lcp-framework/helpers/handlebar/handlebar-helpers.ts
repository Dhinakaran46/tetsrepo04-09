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

  Handlebars.registerHelper('hbp_isArray', function (value) {
    if (typeof value === 'object' && value !== null) {
      // Check if it is an array-like object (with numeric keys)
      return Object.keys(value).some((key) => !isNaN(Number(key))); // This checks if keys are numeric (e.g., "0", "1", etc.)
    }
    // Otherwise, return false indicating it's not an array
    return Array.isArray(value);
  });

  Handlebars.registerHelper('hbp_ifCond', function (v1: any, operator: string, v2: any, options: any) {
    const context = options.data.root; // Explicitly use the root context

    switch (operator) {
      case '==':
        return v1 == v2 ? options.fn(context) : options.inverse(context);
      case '===':
        return v1 === v2 ? options.fn(context) : options.inverse(context);
      case '!=':
        return v1 != v2 ? options.fn(context) : options.inverse(context);
      case '!==':
        return v1 !== v2 ? options.fn(context) : options.inverse(context);
      case '<':
        return v1 < v2 ? options.fn(context) : options.inverse(context);
      case '<=':
        return v1 <= v2 ? options.fn(context) : options.inverse(context);
      case '>':
        return v1 > v2 ? options.fn(context) : options.inverse(context);
      case '>=':
        return v1 >= v2 ? options.fn(context) : options.inverse(context);
      default:
        return options.inverse(context);
    }
  });
}
