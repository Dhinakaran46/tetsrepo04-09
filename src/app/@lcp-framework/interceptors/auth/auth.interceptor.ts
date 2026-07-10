import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { LocalStorageService } from '../../service/common/local-storage.service';

function getToken(localStorageService: LocalStorageService): string | null {
  try {
    const userDataRaw = localStorageService.getData('user_data');
    if (!userDataRaw) {
      return null;
    }

    const parsed = JSON.parse(userDataRaw);
    return parsed?.main?.token ?? null;
  } catch {
    return null;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const localStorageService = inject(LocalStorageService);
  const token = getToken(localStorageService);
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(clonedRequest);
  }
  return next(req);
};
