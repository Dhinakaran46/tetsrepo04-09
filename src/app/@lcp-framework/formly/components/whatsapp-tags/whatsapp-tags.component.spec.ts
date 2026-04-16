import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhatsappTagsComponent } from './whatsapp-tags.component';

describe('WhatsappTagsComponent', () => {
  let component: WhatsappTagsComponent;
  let fixture: ComponentFixture<WhatsappTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [WhatsappTagsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WhatsappTagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
