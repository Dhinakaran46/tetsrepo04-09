import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterEntityModuleComponent } from './master-entity-module.component';

describe('MasterEntityModuleComponent', () => {
  let component: MasterEntityModuleComponent;
  let fixture: ComponentFixture<MasterEntityModuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterEntityModuleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MasterEntityModuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
