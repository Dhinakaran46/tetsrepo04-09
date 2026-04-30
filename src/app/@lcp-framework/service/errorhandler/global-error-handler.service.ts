// global-error-handler.service.ts
import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorHandlerService implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    // NG0100 is a development-mode change detection warning, not a runtime error — skip alerting
    if (error?.message?.includes('NG0100') || error?.code === -100) {
      console.warn('NG0100 ExpressionChangedAfterItHasBeenCheckedError (dev mode only):', error.message);
      return;
    }

    if (error instanceof HttpErrorResponse) {
      // Server or connection error happened
      console.error('An HTTP error occurred:', error.message);
      if (!navigator.onLine) {
        // Handle offline error
        alert('No Internet Connection');
      } else {
        // Handle Http Error (error.status === 403, 404...)
        alert(`Backend returned code ${error.status}, body was: ${error.message}`);
      }
    } else {
      // Handle Client Error (Angular Error, ReferenceError...)
      console.error('An error occurred:', error.message);
      alert('An unexpected error occurred. Please try again.');
    }

    // Log the error to the console
    console.error('It happens:', error);
  }
}
