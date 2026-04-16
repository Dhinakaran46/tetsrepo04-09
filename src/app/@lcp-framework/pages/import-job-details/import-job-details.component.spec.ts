import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportJobDetailsComponent } from './import-job-details.component';

describe('ImportJobDetailsComponent', () => {
  let component: ImportJobDetailsComponent;
  let fixture: ComponentFixture<ImportJobDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [ImportJobDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ImportJobDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
