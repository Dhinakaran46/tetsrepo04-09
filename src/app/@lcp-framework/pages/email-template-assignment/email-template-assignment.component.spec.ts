import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { importProvidersFrom } from '@angular/core';
import { provideToastr } from 'ngx-toastr';
import { provideStore } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { EmailTemplateAssignmentComponent } from './email-template-assignment.component';

describe('EmailTemplateAssignmentComponent', () => {
  let component: EmailTemplateAssignmentComponent;
  let fixture: ComponentFixture<EmailTemplateAssignmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [EmailTemplateAssignmentComponent],
      providers: [
        DatePipe,
        provideToastr(),
        provideStore({}),
        importProvidersFrom(TranslateModule.forRoot()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailTemplateAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
