import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonSharedModule } from '../../../shared/common/common.module';
import { animate, style, transition, trigger } from '@angular/animations';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-tree-view-item',
  standalone: true,
  imports: [CommonSharedModule, TranslateModule],
  templateUrl: './tree-view-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
  animations: [
    trigger('slideDownUp', [
      transition(':enter', [style({ height: 0, opacity: 0 }), animate('200ms ease-out', style({ height: '*', opacity: 1 }))]),
      transition(':leave', [style({ height: '*', opacity: 1 }), animate('200ms ease-in', style({ height: 0, opacity: 0 }))]),
    ]),
  ],
})
export class TreeViewItemComponent {
  @Input() item: any;
  @Input() treeview: string[] = [];
  @Input() permissions: any = {};
  @Input() selectedNodeUuid: string | null = null;

  @Output() selectNode = new EventEmitter<any>();
  @Output() deleteNode = new EventEmitter<any>();
  @Output() addChild = new EventEmitter<any>();

  constructor(private cdr: ChangeDetectorRef) {}

  toggleTreeview(id: any) {
    const idStr = id.toString();
    if (this.treeview.includes(idStr)) {
      const index = this.treeview.indexOf(idStr);
      this.treeview.splice(index, 1);
    } else {
      this.treeview.push(idStr);
    }
    this.cdr.markForCheck();
  }

  isExpanded(id: any): boolean {
    return this.treeview.includes(id.toString());
  }

  onSelect(item: any) {
    this.selectNode.emit(item);
  }

  onDelete(event: MouseEvent, item: any) {
    event.stopPropagation();
    this.deleteNode.emit(item);
  }

  onAddChild(event: MouseEvent, item: any) {
    event.stopPropagation();
    this.addChild.emit(item);
  }

  getSortedChildren(children: any[]): any[] {
    if (!children) return [];
    return children.sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
  }
}
