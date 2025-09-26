import { Injectable } from '@angular/core';
import { BnNgIdleService } from 'bn-ng-idle';
import Swal from 'sweetalert2';
import { LocalStorageService } from './local-storage.service';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class IdleService {
  config: any = null;
  timeout: number = 480000;

  constructor(private bnIdle: BnNgIdleService, private router: Router, private localstore: LocalStorageService, public translate: TranslateService) {
    // Store the user data along with permissions and menu lists
    //this.config = JSON.parse(localStorage.getItem('config') || '{}');
    this.config = JSON.parse(this.localstore.getData('config') || '{}');
  }

  public startIdleWatcher(): void {
    if (this.config?.enable_idle_timeout === true || this.config?.enable_idle_timeout === 'true') {
      this.timeout = Number(this.config?.idle_timeout_in_minutes || '8') * 60;
      const observer = this.bnIdle.startWatching(this.timeout);

      

      observer.subscribe((isTimedOut: boolean) => {
      
        if (isTimedOut) {
      
          this.stopIdleTimer();
          this.localstore.logout();
          Swal.fire({
            icon: 'warning',
            title: 'Warning!',
            text: `${this.config?.idle_timeout_in_minutes} minute${Number(this.config?.idle_timeout_in_minutes) <= 1 ? '' : 's'} ${this.translate.instant(
              'you_have_been_idle'
            )}`,
            showCancelButton: false,
            padding: '2em',
          }).then(async (result) => {
            if (result.value) {
              // Redirect to the login page or refresh the token
              this.router.navigate(['/login']);
            }
          });
        }
      });
    }
  }

  public stopIdleTimer() {
    try {
     
      if (this.config?.enable_idle_timeout === true || this.config?.enable_idle_timeout === 'true') {
        // Check if bnIdle exists and is properly initialized
        if (!this.bnIdle) {
          console.error('BnNgIdleService is undefined!');
          return;
        }

        // Check if stopTimer function exists before calling it
        if (typeof this.bnIdle.stopTimer === 'function') {
          this.bnIdle.stopTimer();
          
        } else {
          console.warn('BnNgIdleService.stopTimer() is undefined.');
        }

        // Manually unsubscribe if idleSubscription exists and is active
        if (this.bnIdle['idleSubscription'] && !this.bnIdle['idleSubscription'].closed) {
          this.bnIdle['idleSubscription'].unsubscribe();
          
        } else {
          console.warn('No active idle subscription to unsubscribe.');
        }
      } else {
        console.warn('Idle timeout is disabled.');
      }
    } catch (error) {
      console.error('Error while stopping the idle timer:', error);
    }
  }
}
