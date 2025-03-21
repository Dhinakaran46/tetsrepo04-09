import { Component, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { CommonSharedModule } from '../@lcp-framework/shared/common/common.module';
import { LocalStorageService } from '../@lcp-framework/service/common/local-storage.service';

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
  versionInfo: any = null;
  constructor(public storeData: Store<any>, public router: Router, private localStore: LocalStorageService) {
    this.initStore();
    this.versionInfo = JSON.parse(this.localStore.getData('version_info'));
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
