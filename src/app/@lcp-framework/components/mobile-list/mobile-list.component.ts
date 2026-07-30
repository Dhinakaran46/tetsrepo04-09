import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';

// Mobile-friendly "List" renderer for grid_builder_module entities, chosen at
// runtime (by master-list.component.ts) instead of the desktop DataTableComponent
// when an entity's entity_configurations.mobile_view_type === 'list'. It consumes
// the exact same headercolumns[]/items[] contract DataTableComponent already
// interprets, so no backend or grid-fetch changes are required - only the leaf
// rendering differs. Card/Table/Kanban mobile view types are out of scope for
// this proof-of-concept pass; anything other than 'list' keeps using DataTableComponent.
@Component({
  selector: 'app-mobile-list',
  standalone: true,
  imports: [CommonSharedModule],
  templateUrl: './mobile-list.component.html',
  styleUrl: './mobile-list.component.scss',
})
export class MobileListComponent {
  @Input() masterInfo: any = {};
  @Input() headercolumns: any[] = [];
  @Input() items: any[] = [];
  @Input() totalItems: number = 0;
  @Input() currentPage: number = 1;
  @Input() resultsPerPage: any = 10;
  @Input() loading: boolean = false;

  @Output() pageChange = new EventEmitter<{ page: number; start_index: number; skipFetch?: boolean; source?: string }>();
  @Output() edit = new EventEmitter<any>();
  @Output() view = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();
  @Output() linkComponentClick = new EventEmitter<{ col: any; item: any }>();

  // Pseudo-columns injected by master-list.component.ts (S.No / Action) carry no
  // real row data and must be excluded from the card's field list.
  private readonly nonDataColumns = ['table_column_sno', 'table_column_action'];

  get dataColumns(): any[] {
    return (this.headercolumns || []).filter((col) => !this.nonDataColumns.includes(col?.header));
  }

  get primaryColumn(): any {
    return this.dataColumns[0];
  }

  get secondaryColumns(): any[] {
    return this.dataColumns.slice(1, 4);
  }

  get hasNextPage(): boolean {
    return this.currentPage * this.resultsPerPage < this.totalItems;
  }

  fieldValue(item: any, col: any): any {
    return col ? item?.[col.header] : null;
  }

  fieldTypeId(col: any): number {
    const value = Number(col?.field_type_id);
    return Number.isInteger(value) && value > 0 ? value : 3;
  }

  enumLabel(col: any, rawValue: any): string {
    const enumValues = col?.enum_values;
    if (!enumValues || rawValue == null) return rawValue;
    // Only handle the simple {value: [{id/value, label}, ...]} and plain-array shapes here -
    // the full policy/attached-config enum resolution in DataTableComponent is out of scope
    // for this list-view proof of concept.
    const list = Array.isArray(enumValues) ? enumValues : Array.isArray(enumValues?.value) ? enumValues.value : null;
    if (!list) return rawValue;
    const match = list.find((entry: any) => String(entry?.value ?? entry?.id) === String(rawValue));
    return match?.label ?? rawValue;
  }

  isLinked(col: any): boolean {
    return !!col?.link_type && col.link_type !== 'none';
  }

  onCardClick(item: any): void {
    if (this.masterInfo?.permissions?.details) {
      this.view.emit(item);
    }
  }

  onColumnLinkClick(col: any, item: any, event: MouseEvent): void {
    event.stopPropagation();
    this.linkComponentClick.emit({ col, item });
  }

  onEdit(item: any, event: MouseEvent): void {
    event.stopPropagation();
    this.edit.emit(item);
  }

  onView(item: any, event: MouseEvent): void {
    event.stopPropagation();
    this.view.emit(item);
  }

  onDelete(item: any, event: MouseEvent): void {
    event.stopPropagation();
    this.delete.emit(item);
  }

  loadMore(): void {
    const page = this.currentPage + 1;
    this.pageChange.emit({ page, start_index: (page - 1) * this.resultsPerPage });
  }
}
