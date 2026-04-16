import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExampleClientDatatableComponent } from './example-client-datatable.component';

describe('ExampleClientDatatableComponent', () => {
  let component: ExampleClientDatatableComponent;
  let fixture: ComponentFixture<ExampleClientDatatableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [ExampleClientDatatableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExampleClientDatatableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
