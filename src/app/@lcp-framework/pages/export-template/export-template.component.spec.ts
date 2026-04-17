import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { provideStore } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { ExportTemplateComponent } from './export-template.component';

describe('ExportTemplateComponent', () => {
  let component: ExportTemplateComponent;
  let fixture: ComponentFixture<ExportTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [ExportTemplateComponent],
      providers: [
        DatePipe,
        provideRouter([]),
        provideToastr(),
        provideStore({}),
        importProvidersFrom(TranslateModule.forRoot()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
