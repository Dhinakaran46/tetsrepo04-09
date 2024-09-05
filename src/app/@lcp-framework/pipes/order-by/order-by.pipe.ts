import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderBy',
  standalone: true,
})
export class OrderByPipe implements PipeTransform {
  transform(value: any[], key: string): any[] {
    if (!value || !key) {
      return value;
    }
    return value.sort((a, b) => a[key] - b[key]);
  }
}
