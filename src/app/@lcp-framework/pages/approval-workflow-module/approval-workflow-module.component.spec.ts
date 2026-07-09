import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApprovalWorkflowModuleComponent } from './approval-workflow-module.component';

describe('ApprovalWorkflowModuleComponent', () => {
  let component: ApprovalWorkflowModuleComponent;
  let fixture: ComponentFixture<ApprovalWorkflowModuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalWorkflowModuleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ApprovalWorkflowModuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
