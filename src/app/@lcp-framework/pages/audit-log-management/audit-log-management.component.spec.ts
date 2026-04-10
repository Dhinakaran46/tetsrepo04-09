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
      getAllTables: jasmine.createSpy('getAllTables').and.returnValue(of({ data: [] })),
      getAllList: jasmine.createSpy('getAllList').and.returnValue(of({ status: true, data: { records: [] } })),
      executeTransaction: jasmine.createSpy('executeTransaction').and.returnValue(of({ status: true })),
    };

    const toastrStub = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
      warning: jasmine.createSpy('warning'),
    };

    const translateStub = {
      instant: jasmine.createSpy('instant').and.callFake((key: string) => key),
    };

    const titleStub = {
      setTitle: jasmine.createSpy('setTitle'),
    };

    await TestBed.configureTestingModule({
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
