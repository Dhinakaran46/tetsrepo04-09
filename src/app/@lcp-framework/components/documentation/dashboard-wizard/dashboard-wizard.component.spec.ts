import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardWizardComponent } from './dashboard-wizard.component';

describe('DashboardWizardComponent', () => {
  let component: DashboardWizardComponent;
  let fixture: ComponentFixture<DashboardWizardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardWizardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DashboardWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
