import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { provideStore } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { BarcodePrintingComponent } from './barcode-printing.component';

describe('BarcodePrintingComponent', () => {
  let component: BarcodePrintingComponent;
  let fixture: ComponentFixture<BarcodePrintingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [BarcodePrintingComponent],
      providers: [
        DatePipe,
        provideRouter([]),
        provideToastr(),
        provideStore({}),
        importProvidersFrom(TranslateModule.forRoot()),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { pageInfo: { fullEntity: 'barcode-printing' } } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BarcodePrintingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
