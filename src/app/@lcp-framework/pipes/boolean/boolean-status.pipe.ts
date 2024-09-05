import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'booleanStatus',
  standalone: true,
})
export class BooleanStatusPipe implements PipeTransform {
  transform(value: any): any {
    if (typeof value === 'boolean') {
      return value ? 'Active' : 'Inactive';
    }
    return value;
  }
}
