import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhatsappTemplateAssignmentComponent } from './whatsapp-template-assignment.component';

describe('WhatsappTemplateAssignmentComponent', () => {
  let component: WhatsappTemplateAssignmentComponent;
  let fixture: ComponentFixture<WhatsappTemplateAssignmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsappTemplateAssignmentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WhatsappTemplateAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
