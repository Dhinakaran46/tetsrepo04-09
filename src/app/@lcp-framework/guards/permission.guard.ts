import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, UrlTree } from '@angular/router';

export function permissionGuard(route: ActivatedRouteSnapshot): boolean | UrlTree {
  const router = inject(Router);

  return route.data['defaultPermission'] ? true : router.createUrlTree(['/access-denied']);
}

export const permissionGuardFactory =
  () =>
  (route: ActivatedRouteSnapshot): boolean | UrlTree => {
    return permissionGuard(route);
  };
