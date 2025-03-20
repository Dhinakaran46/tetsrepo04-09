import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { LocalStorageService } from '../../service/common/local-storage.service';
import Swal from 'sweetalert2';
import { IdleService } from '../../service/common/idle.service';
import { TranslateService } from '@ngx-translate/core';

export const HttpErrorInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const router = inject(Router);
  const localstore = inject(LocalStorageService);
  const bnIdle = inject(IdleService);
  const translate = inject(TranslateService);

  return next(req).pipe(
    // Tap into the response to fetch the data
    tap({
      next: (event: any) => {
        if (event?.body?.code === 401 && event?.body?.message === 'Authorization token expired') {
          Swal.fire({
            icon: 'warning',
            title: 'Warning!',
            text: translate.instant('session_expired_redirection'),
            showCancelButton: false,
            padding: '2em',
          }).then(async (result) => {
            if (result.value) {
              // Redirect to the login page or refresh the token
              bnIdle.stopIdleTimer();
              localstore.logout();
              router.navigate(['/login']);
            }
          });
        }
      },
      error: (error: any) => {
        console.error('Error occurred:', error);
        return throwError(() => new Error(`Error Code: ${error.status}\nMessage: ${error.message}`));
      },
    }),
    catchError((error: HttpErrorResponse) => {
      let errorMessage = '';
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
      console.error(errorMessage);
      return throwError(() => new Error(errorMessage));
    })
  );
};
