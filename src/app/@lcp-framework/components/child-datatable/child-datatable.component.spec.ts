import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChildDatatableComponent } from './child-datatable.component';

describe('ChildDatatableComponent', () => {
  let component: ChildDatatableComponent;
  let fixture: ComponentFixture<ChildDatatableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChildDatatableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChildDatatableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
