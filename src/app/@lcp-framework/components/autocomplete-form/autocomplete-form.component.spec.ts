import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AutocompleteFormComponent } from './autocomplete-form.component';

describe('AutocompleteFormComponent', () => {
  let component: AutocompleteFormComponent;
  let fixture: ComponentFixture<AutocompleteFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [AutocompleteFormComponent],
      providers: [importProvidersFrom(TranslateModule.forRoot())],
    }).compileComponents();

    fixture = TestBed.createComponent(AutocompleteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
