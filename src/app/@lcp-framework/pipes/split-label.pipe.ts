import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'splitLabel'
})
export class SplitLabelPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return value.split('___').join('<br>');
  }
} 