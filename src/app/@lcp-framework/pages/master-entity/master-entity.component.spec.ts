import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterEntityComponent } from './master-entity.component';

describe('MasterEntityComponent', () => {
  let component: MasterEntityComponent;
  let fixture: ComponentFixture<MasterEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterEntityComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MasterEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
