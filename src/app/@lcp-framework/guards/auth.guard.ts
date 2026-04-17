import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { LocalStorageService } from '../service/common/local-storage.service';

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

export const authGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  const localStorageService = inject(LocalStorageService);
  const token = getToken(localStorageService);
  return token ? true : router.createUrlTree(['/login']);
};
