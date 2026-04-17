import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { provideStore } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { UserConfigurationComponent } from './user-configuration.component';

describe('UserConfigurationComponent', () => {
  let component: UserConfigurationComponent;
  let fixture: ComponentFixture<UserConfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [UserConfigurationComponent],
      providers: [
        DatePipe,
        provideRouter([]),
        provideToastr(),
        provideStore({}),
        importProvidersFrom(TranslateModule.forRoot()),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { pageInfo: { fullEntity: 'user-configuration' } } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
