import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, AfterViewInit, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CommonSharedModule } from '../../shared/common/common.module';


type QuickDateRange = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'thisYear' | 'defaultDate';

export interface DateRange {
  fromDate: Date | null;
  toDate: Date | null;
}

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CommonSharedModule],
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.scss']
})
export class DateRangePickerComponent implements AfterViewInit, OnChanges {
  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() submitted = new EventEmitter<void>();
  private _dateRange: DateRange = {
    fromDate: new Date(1950, 0, 1),
    toDate: new Date(2050, 0, 1)
  };
  
  @Input() 
  get dateRange(): DateRange {
    return this._dateRange;
  }
  
  set dateRange(value: DateRange) {
    if (value) {
      this._dateRange = {
        fromDate: value.fromDate ? new Date(value.fromDate) : null,
        toDate: value.toDate ? new Date(value.toDate) : null
      };
      
      if (this._pendingDateRange) {
        this._pendingDateRange = { ...this._dateRange };
      }
      
      this.updateQuickRangeSelection();
      if (this.fromDateInput?.nativeElement && this.toDateInput?.nativeElement) {
        this.updateInputFields();
      }
    }
  }
  @ViewChild('fromDateInput') fromDateInput!: ElementRef<HTMLInputElement>;
  @ViewChild('toDateInput') toDateInput!: ElementRef<HTMLInputElement>;

  private _pendingDateRange: DateRange;
  
  maxDate: string;
  minToDate: string = '';
  selectedQuickRange: QuickDateRange = 'defaultDate';

  constructor(
    private translate: TranslateService,
  ) {
    // Set max date to 2050-01-01
    this.maxDate = '2050-01-01';
    
    // Initialize with default range (1950-01-01 to 2050-01-01)
    this._pendingDateRange = {
      fromDate: this.dateRange.fromDate ? new Date(this.dateRange.fromDate) : new Date(1950, 0, 1),
      toDate: this.dateRange.toDate ? new Date(this.dateRange.toDate) : new Date(2050, 0, 1)
    };
    
    this.selectedQuickRange = 'defaultDate';
  }

  get pendingDateRange(): DateRange {
    return this._pendingDateRange;
  }

  ngAfterViewInit(): void {
    this.updateInputFields();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dateRange']) {
      this._pendingDateRange = { 
        fromDate: this.dateRange.fromDate ? new Date(this.dateRange.fromDate) : null,
        toDate: this.dateRange.toDate ? new Date(this.dateRange.toDate) : null
      };
      this.updateInputFields();
      this.updateQuickRangeSelection();
    }
  }

  public onFromDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const date = input.value ? this.parseDateFromInput(input.value) : null;
    
    if (date) {
      const startOfDay = this.getStartOfDay(date);
      this._pendingDateRange.fromDate = startOfDay;
      this.minToDate = this.formatDateForInput(startOfDay);
      
      // If toDate is before fromDate, update it
      if (this._pendingDateRange.toDate && this._pendingDateRange.toDate < startOfDay) {
        this._pendingDateRange.toDate = new Date(startOfDay);
        if (this.toDateInput?.nativeElement) {
          this.toDateInput.nativeElement.value = this.formatDateForInput(startOfDay);
        }
      }
    } else {
      this._pendingDateRange.fromDate = null;
      this.minToDate = '';
    }
    
    this.updateQuickRangeSelection();
  }
  
  public onToDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const date = input.value ? this.parseDateFromInput(input.value) : null;
    
    if (date) {
      this._pendingDateRange.toDate = this.getEndOfDay(date);
    } else {
      this._pendingDateRange.toDate = null;
    }
    
    this.updateQuickRangeSelection();
  }
  
  private updateQuickRangeSelection(): void {
    // If dates match a quick range, select it, otherwise use 'defaultDate'
    this.selectedQuickRange = this.detectQuickRange() || 'defaultDate';
  }
  
  private detectQuickRange(): QuickDateRange | null {
    if (!this._pendingDateRange.fromDate || !this._pendingDateRange.toDate) {
      return null;
    }
    
    const today = this.getStartOfDay(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check for exact matches with quick ranges
    if (this.isSameDay(this._pendingDateRange.fromDate, today) && 
        this.isSameDay(this._pendingDateRange.toDate, today)) {
      return 'today';
    }
    
    if (this.isSameDay(this._pendingDateRange.fromDate, yesterday) && 
        this.isSameDay(this._pendingDateRange.toDate, yesterday)) {
      return 'yesterday';
    }
    
    // Check for this week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    if (this.isSameDay(this._pendingDateRange.fromDate, startOfWeek) && 
        this.isSameDay(this._pendingDateRange.toDate, today)) {
      return 'thisWeek';
    }
    
    // Check for last week
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekStart.getDate() - 6);
    if (this.isSameDay(this._pendingDateRange.fromDate, lastWeekStart) && 
        this.isSameDay(this._pendingDateRange.toDate, lastWeekEnd)) {
      return 'lastWeek';
    }
    
    // Check for this month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    if (this.isSameDay(this._pendingDateRange.fromDate, startOfMonth) && 
        this.isSameDay(this._pendingDateRange.toDate, today)) {
      return 'thisMonth';
    }
    
    // Check for last month
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    if (this.isSameDay(this._pendingDateRange.fromDate, lastMonthStart) && 
        this.isSameDay(this._pendingDateRange.toDate, lastMonthEnd)) {
      return 'lastMonth';
    }
    
    // Check for last 3 months
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    if (this.isSameDay(this._pendingDateRange.fromDate, threeMonthsAgo) && 
        this.isSameDay(this._pendingDateRange.toDate, today)) {
      return 'last3Months';
    }
    
    // Check for last 6 months
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    if (this.isSameDay(this._pendingDateRange.fromDate, sixMonthsAgo) && 
        this.isSameDay(this._pendingDateRange.toDate, today)) {
      return 'last6Months';
    }
    
    // Check for this year
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    if (this.isSameDay(this._pendingDateRange.fromDate, startOfYear) && 
        this.isSameDay(this._pendingDateRange.toDate, today)) {
      return 'thisYear';
    }
    
    // Check for default date range (1950-01-01 to 2050-01-01)
    const defaultStart = new Date(1950, 0, 1);
    const defaultEnd = new Date(2050, 0, 1);
    
    if (this.isSameDay(this._pendingDateRange.fromDate, defaultStart) && 
        this.isSameDay(this._pendingDateRange.toDate, defaultEnd)) {
      return 'defaultDate';
    }
    
    // Default to null if no quick range matches
    return null;
  }
  
  private isSameDay(date1: Date | null, date2: Date | null): boolean {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
  
  public onQuickDateSelect(option: QuickDateRange): void {
    if (!option) return;
    
    const today = this.getStartOfDay(new Date());
    const newRange: DateRange = { fromDate: null, toDate: null };
    
    try {
      switch (option) {
        case 'today':
          newRange.fromDate = this.getStartOfDay(today);
          newRange.toDate = this.getEndOfDay(today);
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          newRange.fromDate = this.getStartOfDay(yesterday);
          newRange.toDate = this.getEndOfDay(yesterday);
          break;
        case 'thisWeek':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          newRange.fromDate = this.getStartOfDay(startOfWeek);
          newRange.toDate = this.getEndOfDay(today);
          break;
        case 'lastWeek':
          const lastWeekEnd = new Date(today);
          lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
          const lastWeekStart = new Date(lastWeekEnd);
          lastWeekStart.setDate(lastWeekStart.getDate() - 6);
          newRange.fromDate = this.getStartOfDay(lastWeekStart);
          newRange.toDate = this.getEndOfDay(lastWeekEnd);
          break;
        case 'thisMonth':
          newRange.fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
          newRange.toDate = this.getEndOfDay(today);
          break;
        case 'lastMonth':
          const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          newRange.fromDate = this.getStartOfDay(firstDayLastMonth);
          newRange.toDate = this.getEndOfDay(lastDayLastMonth);
          break;
        case 'last3Months':
          newRange.toDate = this.getEndOfDay(today);
          const threeMonthsAgo = new Date(today);
          threeMonthsAgo.setMonth(today.getMonth() - 2);
          threeMonthsAgo.setDate(1);
          newRange.fromDate = this.getStartOfDay(threeMonthsAgo);
          break;
        case 'last6Months':
          newRange.toDate = this.getEndOfDay(today);
          const sixMonthsAgo = new Date(today);
          sixMonthsAgo.setMonth(today.getMonth() - 5);
          sixMonthsAgo.setDate(1);
          newRange.fromDate = this.getStartOfDay(sixMonthsAgo);
          break;
        case 'thisYear':
          newRange.fromDate = new Date(today.getFullYear(), 0, 1);
          newRange.toDate = this.getEndOfDay(today);
          break;
        case 'defaultDate':
          newRange.fromDate = new Date(1950, 0, 2); 
          newRange.toDate = new Date(2050, 0, 2); 
          break;
      }
      
      this._pendingDateRange = { 
        fromDate: newRange.fromDate ? new Date(newRange.fromDate.getTime()) : null,
        toDate: newRange.toDate ? new Date(newRange.toDate.getTime()) : null
      };
      
      this.selectedQuickRange = option;
      this.updateInputFields();
    } catch (error) {
      console.error('Error setting quick date range:', error);
    }
  }
  
  public onSubmit(): void {
    if (this._pendingDateRange.fromDate && this._pendingDateRange.toDate) {
      // Create new date objects to avoid reference issues
      const fromDate = new Date(this._pendingDateRange.fromDate.getTime());
      const toDate = new Date(this._pendingDateRange.toDate.getTime());
      
      this._dateRange = { 
        fromDate: fromDate,
        toDate: toDate
      };
      
      this.dateRangeChange.emit({
        fromDate: new Date(fromDate.getTime()),
        toDate: new Date(toDate.getTime())
      });
      this.submitted.emit();
    }
  }
  
  public clearQuickRange(): void {
    try {
      // Clear the date fields
      this._pendingDateRange = { 
        fromDate: null,
        toDate: null
      };
      
      this.selectedQuickRange = 'defaultDate';
      this.minToDate = ''; // Reset the min date for toDate input
      this.updateInputFields();
    } catch (error) {
      console.error('Error clearing quick range:', error);
    }
  }
  
  // Date utility methods
  public getStartOfDay(date: Date): Date {
    const d = new Date(date);
    // d.setHours(0, 0, 0, 0);
    return d;
  }

  public getEndOfDay(date: Date): Date {
    const d = new Date(date);
    // d.setHours(23, 59, 59, 999);
    return d;
  }

  public formatDateForInput(date: Date | null): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDateFromInput(dateString: string): Date | null {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private updateInputFields(): void {
    if (this.fromDateInput?.nativeElement) {
      const fromDate = this._pendingDateRange.fromDate;
      this.fromDateInput.nativeElement.value = fromDate ? this.formatDateForInput(fromDate) : '';
      if (fromDate) {
        this.minToDate = this.formatDateForInput(fromDate);
      }
    }
    
    if (this.toDateInput?.nativeElement) {
      this.toDateInput.nativeElement.value = this._pendingDateRange.toDate 
        ? this.formatDateForInput(this._pendingDateRange.toDate) 
        : '';
      this.toDateInput.nativeElement.min = this.minToDate;
      this.toDateInput.nativeElement.disabled = !this._pendingDateRange.fromDate;
    }
  }
}
