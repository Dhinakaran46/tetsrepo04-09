import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { LocalStorageService } from '../service/common/local-storage.service';

export const loginGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  const localStorageService = inject(LocalStorageService);
  const token = localStorageService.getData('user_data') && JSON.parse(localStorageService.getData('user_data')).main.token;
  return token ? router.createUrlTree(['']) : true;
};
