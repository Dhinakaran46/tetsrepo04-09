import { Component, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { CommonSharedModule } from '../@lcp-framework/shared/common/common.module';

@Component({
  selector: 'setting',
  standalone: true,
  imports: [CommonSharedModule],
  templateUrl: './theme-customizer.html',
  encapsulation: ViewEncapsulation.Emulated,
})
export class ThemeCustomizerComponent {
  store: any;
  showCustomizer = false;
  constructor(public storeData: Store<any>, public router: Router) {
    this.initStore();
  }
  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  reloadRoute() {
    window.location.reload();
    this.showCustomizer = true;
  }
}
