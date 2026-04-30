import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { importProvidersFrom } from '@angular/core';
import { provideToastr } from 'ngx-toastr';
import { provideStore } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { WhatsappTemplateAssignmentComponent } from './whatsapp-template-assignment.component';

describe('WhatsappTemplateAssignmentComponent', () => {
  let component: WhatsappTemplateAssignmentComponent;
  let fixture: ComponentFixture<WhatsappTemplateAssignmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [WhatsappTemplateAssignmentComponent],
      providers: [
        DatePipe,
        provideToastr(),
        provideStore({}),
        importProvidersFrom(TranslateModule.forRoot()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsappTemplateAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
