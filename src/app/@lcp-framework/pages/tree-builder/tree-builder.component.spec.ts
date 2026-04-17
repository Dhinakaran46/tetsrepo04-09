import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { provideStore } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { TreeBuilderComponent } from './tree-builder.component';

describe('TreeBuilderComponent', () => {
  let component: TreeBuilderComponent;
  let fixture: ComponentFixture<TreeBuilderComponent>;

  beforeEach(async () => {
    // Seed localStorage so the component doesn't crash on null config
    localStorage.setItem('config', JSON.stringify({ grid_enable_associated_records_deletion: false }));

    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [TreeBuilderComponent],
      providers: [
        DatePipe,
        provideRouter([]),
        provideToastr(),
        provideStore({}),
        importProvidersFrom(TranslateModule.forRoot()),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { pageInfo: { fullEntity: 'tree-builder', grid_enable_associated_records_deletion: false } } },
            data: of({ pageInfo: { fullEntity: 'tree-builder', grid_enable_associated_records_deletion: false } }),
            paramMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreeBuilderComponent);
    component = fixture.componentInstance;
    // Skip detectChanges — component has async ngAfterContentInit that requires backend data
  });

  afterEach(() => {
    localStorage.removeItem('config');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
