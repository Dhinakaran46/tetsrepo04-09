import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientDatatableComponent } from './client-datatable.component';

describe('ClientDatatableComponent', () => {
  let component: ClientDatatableComponent;
  let fixture: ComponentFixture<ClientDatatableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [ClientDatatableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ClientDatatableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
