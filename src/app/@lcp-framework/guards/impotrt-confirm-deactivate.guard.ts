// confirm-deactivate.guard.ts
import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';

export interface ImportConfirmDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ImportConfirmDeactivateGuard implements CanDeactivate<ImportConfirmDeactivate> {
  canDeactivate(component: ImportConfirmDeactivate): Observable<boolean> | Promise<boolean> | boolean {
    return component.canDeactivate ? component.canDeactivate() : true;
  }
}
