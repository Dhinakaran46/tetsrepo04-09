import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn } from '@angular/common/http';
import { HttpErrorInterceptor } from './http-error.interceptor';

describe('HttpErrorInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) => TestBed.runInInjectionContext(() => HttpErrorInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({ teardown: { destroyAfterEach: true } });
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });
});
