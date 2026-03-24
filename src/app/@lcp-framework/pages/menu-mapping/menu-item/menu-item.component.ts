import { Component, Input } from '@angular/core';
import { MenuService } from '../menu_service';
import { layoutIconModule } from '../../../shared/icon/module/layout-icon.module';
import { IconFolderComponent } from '../../../shared/icon/icon-folder';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonSharedModule } from '../../../shared/common/common.module';
import { MenuMapService } from '../../../service/common/menu-map.service';
import { LocalStorageService } from '../../../service/common/local-storage.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { MenuLoadService } from '../../../service/common/menu-load.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-menu-item',
  standalone: true,
  imports: [CommonSharedModule, layoutIconModule, IconFolderComponent],
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
    trigger('slideDownUp', [
      transition(':enter', [style({ height: 0, opacity: 0 }), animate('300ms', style({ height: '*', opacity: 1 }))]),
      transition(':leave', [style({ height: '*', opacity: 1 }), animate('300ms', style({ height: 0, opacity: 0 }))]),
    ]),
  ],
})
export class MenuItemComponent {
  @Input() item: any;
  @Input() treeview: string[] = [];

  userId: any;
  companyId: any;
  menu_id: any;

  constructor(
    private menuService: MenuService,
    private menuMapService: MenuMapService,
    private toastr: ToastrService,
    private localStorageService: LocalStorageService,
    private menuLoadService: MenuLoadService,
    private translate: TranslateService
  ) {
    this.menu_id = this.localStorageService.getData('menu_type');
    const userData = this.localStorageService.getData('user_data');
    if (userData) {
      const parsedData = JSON.parse(userData);
      this.userId = parsedData.main?.id;
      this.companyId = parsedData.main?.company_id;
    }
  }

  toggleTreeview(id: number) {
    if (this.treeview.includes(id.toString())) {
      this.treeview = this.treeview.filter((itemId) => itemId !== id.toString());
    } else {
      this.treeview = [...this.treeview, id.toString()];
    }
  }

  isExpanded(id: number): boolean {
    return this.treeview.includes(id.toString());
  }

  selectMenu(item: any) {
    this.menuService.selectMenu(item);
  }
  getSortedChildren(children: any[]): any[] {
    return children.slice().sort((a, b) => a.order_no - b.order_no);
  }

  formatOrderNumber(orderNo: number): string {
    return orderNo % 1 === 0 ? orderNo.toFixed(2) : orderNo.toFixed(2);
  }

  async remove(menuId: any) {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to delete this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
      });

      if (result.isConfirmed) {
        const collectedIds = new Set<number>();
        collectedIds.add(menuId);

        const fetchChildItems = async (parentId: number): Promise<void> => {
          const getParentId = {
            company_id: this.companyId,
            print_query: true,
            primary_table: 'menu_items',
            start_index: 0,
            limit_range: 100000,
            sort_columns: [['menu_items.order_no', 'asc']],
            search_all: [
              {
                column_name: 'menu_items.parent_id',
                value: parentId,
                operator: '=',
              },
              {
                column_name: 'menu_items.status_id',
                value: '1',
                operator: '=',
              },
            ],
            select_columns: [['menu_items.id']],
          };

          try {
            const response = await this.menuMapService.getCommonList(getParentId).toPromise();
            if (response.code === 200 && response.status) {
              const records = response.data.records;
              if (records.length > 0) {
                const childPromises = records.map(async (item: any) => {
                  collectedIds.add(item.id);
                  await fetchChildItems(item.id);
                });
                await Promise.all(childPromises); // Wait for all child fetches to complete
              }
            }
          } catch (error) {
            console.error('Error fetching child items:', error);
            throw error;
          }
        };

        await fetchChildItems(menuId); // Start with the initial menu ID
        await this.deleteItems(Array.from(collectedIds));
      }
    } catch (error) {
      console.error('Error during removal process:', error);
    }
  }

  async deleteItems(ids: number[]): Promise<void> {
    for (const id of ids) {
      const deleteEntityType = {
        data: {
          table1: [
            {
              status_id: 3,
              deleted_at: 'now()',
            },
          ],
        },
        table: ['menu_items'],
        action: ['update'],
        conditions: {
          table1: [
            {
              id: id,
            },
          ],
        },
        table_mapping: ['table1'],
      };

      await new Promise((resolve, reject) => {
        this.menuMapService.executeRecords(deleteEntityType).subscribe({
          next: (response: any) => {
            if (response.code === 200 && response.status) {
              console.warn(`Menu item with id ${id} deleted successfully.`);
            } else {
              console.error(`Failed to delete menu item with id ${id}.`);
            }
            resolve(null);
          },
          error: (error) => {
            console.error(`Error deleting menu item with id ${id}:`, error);
            reject(error);
          },
        });
      });
    }

    const key = 'record_deleted_successfully';
    const successMessage = this.translate.instant(key);
    this.toastr.success(successMessage);

    this.menuService.loadMenus(this.menu_id);
    this.menuLoadService.serviceMenus(this.companyId);
  }
}
