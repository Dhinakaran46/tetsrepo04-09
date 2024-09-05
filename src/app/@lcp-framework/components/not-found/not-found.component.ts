import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

@Component({
  standalone: true,
  templateUrl: './not-found.component.html',
})
export class NotFoundComponent {
  store: any;
  constructor(public router: Router, public storeData: Store<any>) {
    this.initStore();
  }
  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }
}
