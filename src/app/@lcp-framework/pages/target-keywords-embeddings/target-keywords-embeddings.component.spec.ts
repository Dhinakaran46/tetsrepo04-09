import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TargetKeywordsEmbeddingsComponent } from './target-keywords-embeddings.component';

describe('TargetKeywordsEmbeddingsComponent', () => {
  let component: TargetKeywordsEmbeddingsComponent;
  let fixture: ComponentFixture<TargetKeywordsEmbeddingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [TargetKeywordsEmbeddingsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TargetKeywordsEmbeddingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
