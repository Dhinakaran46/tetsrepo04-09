import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { provideStore } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { MasterEntityComponent } from './master-entity.component';

describe('MasterEntityComponent', () => {
  let component: MasterEntityComponent;
  let fixture: ComponentFixture<MasterEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [MasterEntityComponent],
      providers: [
        provideRouter([]),
        provideToastr(),
        provideStore({}),
        importProvidersFrom(TranslateModule.forRoot()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MasterEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
