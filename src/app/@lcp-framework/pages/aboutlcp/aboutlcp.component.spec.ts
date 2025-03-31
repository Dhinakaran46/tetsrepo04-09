import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutlcpComponent } from './aboutlcp.component';

describe('AboutlcpComponent', () => {
  let component: AboutlcpComponent;
  let fixture: ComponentFixture<AboutlcpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutlcpComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AboutlcpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
