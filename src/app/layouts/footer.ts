import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'footer',
  standalone: true,
  imports: [],
  templateUrl: './footer.html',
  encapsulation: ViewEncapsulation.Emulated,
})
export class FooterComponent {
  currYear: number = new Date().getFullYear();
  constructor() {}
  ngOnInit() {}
}
