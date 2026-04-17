import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { importProvidersFrom } from '@angular/core';
import { provideToastr } from 'ngx-toastr';
import { provideStore } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { ExampleClientDatatableComponent } from './example-client-datatable.component';

describe('ExampleClientDatatableComponent', () => {
  let component: ExampleClientDatatableComponent;
  let fixture: ComponentFixture<ExampleClientDatatableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [ExampleClientDatatableComponent],
      providers: [
        DatePipe,
        provideToastr(),
        provideStore({}),
        importProvidersFrom(TranslateModule.forRoot()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExampleClientDatatableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
