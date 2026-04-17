import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { GridApiService } from '../../service/common/grid.service';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';

import { AuditLogManagementComponent } from './audit-log-management.component';

describe('AuditLogManagementComponent', () => {
  let component: AuditLogManagementComponent;
  let fixture: ComponentFixture<AuditLogManagementComponent>;

  beforeEach(async () => {
    const gridApiServiceStub = {
      getAllTables: vi.fn().mockReturnValue(of({ data: [] })),
      getAllList: vi.fn().mockReturnValue(of({ status: true, data: { records: [] } })),
      executeTransaction: vi.fn().mockReturnValue(of({ status: true })),
    };

    const toastrStub = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    };

    const translateStub = {
      instant: vi.fn().mockImplementation((key: string) => key),
    };

    const titleStub = {
      setTitle: vi.fn(),
    };

    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      imports: [AuditLogManagementComponent],
      providers: [
        { provide: GridApiService, useValue: gridApiServiceStub },
        { provide: ToastrService, useValue: toastrStub },
        { provide: TranslateService, useValue: translateStub },
        { provide: Title, useValue: titleStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
