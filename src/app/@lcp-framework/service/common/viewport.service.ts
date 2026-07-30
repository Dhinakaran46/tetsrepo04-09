import { Injectable } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Capacitor } from '@capacitor/core';
import { Observable, map, startWith } from 'rxjs';

// A phone-sized viewport, matched against Tailwind's own `md` breakpoint (768px)
// so this stays consistent with the rest of the app's responsive classes.
const MOBILE_BREAKPOINT = '(max-width: 767px)';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  constructor(private breakpointObserver: BreakpointObserver) {}

  // True when running inside the native Capacitor shell (Android/iOS app),
  // regardless of physical screen size - a tablet-sized native build should
  // still get the mobile renderer set up for it.
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  // Synchronous current-state check: native shell, or a phone-sized browser viewport.
  // Use this for one-off imperative checks (e.g. inside an existing subscribe callback).
  isMobileView(): boolean {
    return this.isNativePlatform() || this.breakpointObserver.isMatched(MOBILE_BREAKPOINT);
  }

  // Reactive stream for components that need to respond to viewport/orientation
  // changes while already mounted (e.g. a tablet rotated mid-session).
  mobileViewChanges(): Observable<boolean> {
    if (this.isNativePlatform()) {
      return new Observable<boolean>((subscriber) => {
        subscriber.next(true);
      });
    }
    return this.breakpointObserver.observe(MOBILE_BREAKPOINT).pipe(
      map((state) => state.matches),
      startWith(this.breakpointObserver.isMatched(MOBILE_BREAKPOINT)),
    );
  }
}
