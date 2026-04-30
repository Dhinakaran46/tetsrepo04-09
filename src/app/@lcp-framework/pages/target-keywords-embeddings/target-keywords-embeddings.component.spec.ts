import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { provideStore } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { TargetKeywordsEmbeddingsComponent } from './target-keywords-embeddings.component';

describe('TargetKeywordsEmbeddingsComponent', () => {
  let component: TargetKeywordsEmbeddingsComponent;
  let fixture: ComponentFixture<TargetKeywordsEmbeddingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [TargetKeywordsEmbeddingsComponent],
      providers: [
        DatePipe,
        provideRouter([]),
        provideToastr(),
        provideStore({}),
        importProvidersFrom(TranslateModule.forRoot()),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { pageInfo: { fullEntity: 'target-keywords-embeddings' } } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TargetKeywordsEmbeddingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
