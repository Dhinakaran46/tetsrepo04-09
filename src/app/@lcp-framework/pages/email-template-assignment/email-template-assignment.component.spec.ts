import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailTemplateAssignmentComponent } from './email-template-assignment.component';

describe('EmailTemplateAssignmentComponent', () => {
  let component: EmailTemplateAssignmentComponent;
  let fixture: ComponentFixture<EmailTemplateAssignmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [EmailTemplateAssignmentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmailTemplateAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
