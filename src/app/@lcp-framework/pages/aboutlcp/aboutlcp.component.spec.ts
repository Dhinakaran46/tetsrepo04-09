import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';
import { AboutlcpComponent } from './aboutlcp.component';

describe('AboutlcpComponent', () => {
  let component: AboutlcpComponent;
  let fixture: ComponentFixture<AboutlcpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [AboutlcpComponent],
      providers: [
        provideRouter([]),
        provideToastr(),
        importProvidersFrom(TranslateModule.forRoot()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutlcpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
