import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { LocalStorageService } from '../service/common/local-storage.service';

function parseUserData(localStorageService: LocalStorageService): any {
  try {
    const raw = localStorageService.getData('user_data');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hasMultipleCompanies(userData: any): boolean {
  const companies = userData?.main?.companies || userData?.companies || [];
  return Array.isArray(companies) && companies.length > 1;
}

export const companySelectedGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  const localStorageService = inject(LocalStorageService);
  const userData = parseUserData(localStorageService);
  const selectionPending = localStorageService.getData('company_selection_pending') === 'true';
  const selectedCompanyId = Number(localStorageService.getData('selected_company_id') || 0);

  if ((selectionPending || (hasMultipleCompanies(userData) && !selectedCompanyId)) && userData?.main?.token) {
    return router.createUrlTree(['/select-company']);
  }

  return true;
};

export const companySelectionPageGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  const localStorageService = inject(LocalStorageService);
  const userData = parseUserData(localStorageService);
  const selectionPending = localStorageService.getData('company_selection_pending') === 'true';
  const selectedCompanyId = Number(localStorageService.getData('selected_company_id') || 0);

  if (selectionPending || (hasMultipleCompanies(userData) && !selectedCompanyId)) {
    return true;
  }

  return router.createUrlTree(['/']);
};
