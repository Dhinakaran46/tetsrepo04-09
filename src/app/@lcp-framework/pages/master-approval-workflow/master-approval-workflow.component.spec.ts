import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { provideStore } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { MasterApprovalWorkflowComponent } from './master-approval-workflow.component';

describe('MasterApprovalWorkflowComponent', () => {
  let component: MasterApprovalWorkflowComponent;
  let fixture: ComponentFixture<MasterApprovalWorkflowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [MasterApprovalWorkflowComponent],
      providers: [provideRouter([]), provideToastr(), provideStore({}), importProvidersFrom(TranslateModule.forRoot())],
    }).compileComponents();

    fixture = TestBed.createComponent(MasterApprovalWorkflowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
