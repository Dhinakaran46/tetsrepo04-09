import { Pipe, PipeTransform } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Pipe({
  name: 'orderByControl',
  standalone: true,
})
export class OrderByControlPipe implements PipeTransform {
  transform(array: FormGroup[], field: string): FormGroup[] {
    if (!Array.isArray(array)) {
      return array;
    }
    return array.sort((a: FormGroup, b: FormGroup) => {
      const aValue = a.get(field)?.value;
      const bValue = b.get(field)?.value;
      if (aValue < bValue) {
        return -1;
      }
      if (aValue > bValue) {
        return 1;
      }
      return 0;
    });
  }
}
