// json-validator.directive.ts
import { Directive, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';

export type JsonType = 'any' | 'object' | 'array' | 'arrayOfObjects' | 'arrayOfStrings' | 'string';
export type SimplifiedSchema = Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>;

export interface JsonValidatorOptions {
  type: JsonType;
  required?: boolean;
  schema?: any | SimplifiedSchema; // JSON Schema object for advanced validation
  minItems?: number; // For arrays
  maxItems?: number; // For arrays
  uniqueItems?: boolean; // For arrays
}

@Directive({
  selector: '[appJsonValidator]',
  standalone: true,
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: JsonValidatorDirective,
      multi: true,
    },
  ],
})
export class JsonValidatorDirective implements Validator, OnChanges {
  @Input('appJsonValidator') options: JsonType | JsonValidatorOptions = 'any';

  private validatorOptions: JsonValidatorOptions = { type: 'any' };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      this.updateOptions();
    }
  }

  private updateOptions(): void {
    if (typeof this.options === 'string') {
      this.validatorOptions = { type: this.options };
    } else {
      this.validatorOptions = { ...this.options };
    }
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    // Check if empty
    if (!value || value.trim() === '') {
      if (this.validatorOptions.required) {
        return { required: true };
      }
      return null; // Empty is allowed if not required
    }

    // Parse JSON
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(value.trim());
    } catch (e: any) {
      return {
        invalidJson: {
          message: 'Invalid JSON syntax',
          error: e.message,
        },
      };
    }

    // Validate type
    if (this.validatorOptions.schema) {
      return this.validateType(parsedValue);
      // return this.validateSchema(parsedValue);
    } else {
      return this.validateType(parsedValue);
    }
  }

  private validateType(parsedValue: any): ValidationErrors | null {
    const { type = 'any' } = this.validatorOptions;

    switch (type) {
      case 'object':
        return this.validateObject(parsedValue);
      case 'array':
        return this.validateArray(parsedValue);
      case 'arrayOfObjects':
        return this.validateArrayOfObjects(parsedValue);
      case 'arrayOfStrings':
        return this.validateArrayOfStrings(parsedValue);
      case 'string':
        return this.validateString(parsedValue);
      case 'any':
      default:
        return null; // Any valid JSON is acceptable
    }
  }

  private validateObject(value: any): ValidationErrors | null {
    if (value === null || typeof value !== 'object') {
      return { invalidJsonType: { expected: 'object', actual: typeof value } };
    }

    if (Array.isArray(value)) {
      return { invalidJsonType: { expected: 'object', actual: 'array' } };
    }

    return null;
  }

  private validateArray(value: any): ValidationErrors | null {
    if (!Array.isArray(value)) {
      return { invalidJsonType: { expected: 'array', actual: typeof value } };
    }

    // Check array constraints
    const { minItems, maxItems } = this.validatorOptions;

    if (minItems !== undefined && value.length < minItems) {
      return {
        invalidArrayLength: {
          min: minItems,
          actual: value.length,
          message: `Array must contain at least ${minItems} items`,
        },
      };
    }

    if (maxItems !== undefined && value.length > maxItems) {
      return {
        invalidArrayLength: {
          max: maxItems,
          actual: value.length,
          message: `Array must contain at most ${maxItems} items`,
        },
      };
    }

    return null;
  }

  private validateArrayOfObjects(value: any): ValidationErrors | null {
    const arrayError = this.validateArray(value);
    if (arrayError) return arrayError;

    for (let i = 0; i < value.length; i++) {
      if (typeof value[i] !== 'object' || value[i] === null || Array.isArray(value[i])) {
        return {
          invalidArrayItemType: {
            index: i,
            expected: 'object',
            actual: typeof value[i],
            message: `Item at index ${i} must be an object`,
          },
        };
      }
    }

    return null;
  }

  private validateArrayOfStrings(value: any): ValidationErrors | null {
    const arrayError = this.validateArray(value);
    if (arrayError) return arrayError;

    for (let i = 0; i < value.length; i++) {
      if (typeof value[i] !== 'string') {
        return {
          invalidArrayItemType: {
            index: i,
            expected: 'string',
            actual: typeof value[i],
            message: `Item at index ${i} must be a string`,
          },
        };
      }
    }

    // Check unique items
    if (this.validatorOptions.uniqueItems) {
      const uniqueValues = new Set(value);
      if (uniqueValues.size !== value.length) {
        return {
          duplicateItems: {
            message: 'Array contains duplicate values',
          },
        };
      }
    }

    return null;
  }

  private validateString(value: any): ValidationErrors | null {
    if (typeof value !== 'string') {
      return { invalidJsonType: { expected: 'string', actual: typeof value } };
    }
    return null;
  }

  private validateSchema(parsedValue: any): ValidationErrors | null {
    const schema = this.validatorOptions.schema;

    // Check if it's a simplified schema
    if (this.isSimplifiedSchema(schema)) {
      return this.validateSimplifiedSchema(parsedValue, schema);
    }

    // Otherwise, it's a full JSON Schema - use AJV or similar
    return this.validateJsonSchema(parsedValue, schema);
  }

  private isSimplifiedSchema(schema: any): schema is SimplifiedSchema {
    // Check if schema is a simple key-type mapping
    if (typeof schema !== 'object' || schema === null) return false;

    const values: any = Object.values(schema);
    const validTypes: string[] = ['string', 'number', 'boolean', 'object', 'array'];

    return values.every((value: any) => validTypes.includes(value));
  }

  private validateSimplifiedSchema(value: any, schema: SimplifiedSchema): ValidationErrors | null {
    if (!Array.isArray(value)) {
      return { invalidType: 'Expected array for simplified schema validation' };
    }

    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const itemError = this.validateSimplifiedSchemaItem(item, schema, i);
      if (itemError) return itemError;
    }

    return null;
  }

  private validateSimplifiedSchemaItem(item: any, schema: SimplifiedSchema, index: number): ValidationErrors | null {
    // Check if item is an object
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return {
        invalidSchemaItem: {
          index,
          message: `Item at index ${index} must be an object`,
          actual: Array.isArray(item) ? 'array' : typeof item,
        },
      };
    }

    // Check all required properties exist and have correct types
    for (const [key, expectedType] of Object.entries(schema)) {
      if (!(key in item)) {
        return {
          missingProperty: {
            index,
            property: key,
            message: `Item at index ${index} is missing property '${key}'`,
          },
        };
      }

      const actualValue = item[key];
      const actualType = typeof actualValue;
      const isArray = Array.isArray(actualValue);

      let typeMatches = false;
      switch (expectedType) {
        case 'string':
          typeMatches = actualType === 'string';
          break;
        case 'number':
          typeMatches = actualType === 'number' && !isNaN(actualValue);
          break;
        case 'boolean':
          typeMatches = actualType === 'boolean';
          break;
        case 'object':
          typeMatches = actualType === 'object' && !isArray && actualValue !== null;
          break;
        case 'array':
          typeMatches = isArray;
          break;
      }

      if (!typeMatches) {
        return {
          invalidPropertyType: {
            index,
            property: key,
            expected: expectedType,
            actual: isArray ? 'array' : actualType,
            message: `Property '${key}' at index ${index} must be ${expectedType}, got ${isArray ? 'array' : actualType}`,
          },
        };
      }
    }

    return null;
  }

  // For full JSON Schema validation (requires AJV or similar)
  private validateJsonSchema(value: any, schema: any): ValidationErrors | null {
    // You would integrate AJV or another JSON Schema validator here
    console.warn('Full JSON Schema validation requires AJV implementation');
    return null;
  }
}
