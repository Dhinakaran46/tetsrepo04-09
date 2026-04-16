import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiBaseUrlComponent } from './api-base-url.component';

describe('ApiBaseUrlComponent', () => {
  let component: ApiBaseUrlComponent;
  let fixture: ComponentFixture<ApiBaseUrlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [ApiBaseUrlComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ApiBaseUrlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
