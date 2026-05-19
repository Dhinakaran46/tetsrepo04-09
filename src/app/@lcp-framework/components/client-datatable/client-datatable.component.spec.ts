import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { importProvidersFrom } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ClientDatatableComponent } from './client-datatable.component';

describe('ClientDatatableComponent', () => {
  let component: ClientDatatableComponent;
  let fixture: ComponentFixture<ClientDatatableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [ClientDatatableComponent],
      providers: [DatePipe, importProvidersFrom(TranslateModule.forRoot())],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientDatatableComponent);
    component = fixture.componentInstance;
    component.config = { columns: [] };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
