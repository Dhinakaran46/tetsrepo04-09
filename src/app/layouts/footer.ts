import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
    selector: 'footer',
    standalone:true,
    imports:[CommonModule],
    templateUrl: './footer.html',
    encapsulation: ViewEncapsulation.Emulated
})
export class FooterComponent {
    currYear: number = new Date().getFullYear();
    constructor() {}
    ngOnInit() {}
}
