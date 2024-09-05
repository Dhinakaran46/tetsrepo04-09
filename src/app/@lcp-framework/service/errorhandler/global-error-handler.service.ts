// global-error-handler.service.ts
import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorHandlerService implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    const router = this.injector.get(Router);

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

    // Navigate to the error page or perform any other necessary actions
    router.navigate(['/error']);

    // Log the error to the console
    console.error('It happens:', error);
  }
}
