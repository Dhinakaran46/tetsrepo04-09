import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutReadyService {
  private menuReady$ = new BehaviorSubject<boolean>(false);

  readonly menuReady = this.menuReady$.asObservable();

  markMenuReady(): void {
    this.menuReady$.next(true);
  }

  reset(): void {
    this.menuReady$.next(false);
  }
}
