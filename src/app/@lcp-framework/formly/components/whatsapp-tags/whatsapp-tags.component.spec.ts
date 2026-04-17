import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, FormControl } from '@angular/forms';
import { WhatsappTagsComponent } from './whatsapp-tags.component';

describe('WhatsappTagsComponent', () => {
  let component: WhatsappTagsComponent;
  let fixture: ComponentFixture<WhatsappTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [WhatsappTagsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsappTagsComponent);
    component = fixture.componentInstance;
    // FieldType.form is read-only; use defineProperty to set it for testing
    const mockForm = new FormGroup({
      test: new FormControl(null),
      whatsapp_template_process_id: new FormControl(null),
    });
    Object.defineProperty(component, 'form', { value: mockForm, writable: true });
    component.field = { key: 'test', props: {} } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
