// example-client-datatable.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientDatatableComponent, TableConfig } from '../../components/client-datatable/client-datatable.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-example-client-datatable',
  standalone: true,
  imports: [CommonModule, ClientDatatableComponent],
  templateUrl: './example-client-datatable.component.html',
})
export class ExampleClientDatatableComponent implements OnInit {
  // Sample data with different types of values
  tableData = [
    {
      id: 1,
      code: 'ITEM-001',
      name: 'Laptop',
      category: 'Electronics',
      price: 1299.99,
      stock: 50,
      status: 'In Stock',
      lastUpdated: '2024-02-15',
    },
    {
      id: 2,
      code: 'ITEM-002',
      name: 'Desk Chair',
      category: 'Furniture',
      price: 299.99,
      stock: 30,
      status: 'Low Stock',
      lastUpdated: '2024-02-16',
    },
    {
      id: 3,
      code: 'ITEM-003',
      name: 'Coffee Maker',
      category: 'Appliances',
      price: 89.99,
      stock: 0,
      status: 'Out of Stock',
      lastUpdated: '2024-02-17',
    },
    {
      id: 4,
      code: 'ITEM-004',
      name: 'Monitor',
      category: 'Electronics',
      price: 499.99,
      stock: 25,
      status: 'In Stock',
      lastUpdated: '2024-02-18',
    },
    {
      id: 5,
      code: 'ITEM-005',
      name: 'Keyboard',
      category: 'Electronics',
      price: 129.99,
      stock: 15,
      status: 'Low Stock',
      lastUpdated: '2024-02-19',
    },
    {
      id: 6,
      code: 'ITEM-0011',
      name: 'Laptop',
      category: 'Electronics',
      price: 1299.99,
      stock: 50,
      status: 'In Stock',
      lastUpdated: '2024-02-15',
    },
    {
      id: 7,
      code: 'ITEM-0012',
      name: 'Desk Chair',
      category: 'Furniture',
      price: 299.99,
      stock: 30,
      status: 'Low Stock',
      lastUpdated: '2024-02-16',
    },
    {
      id: 8,
      code: 'ITEM-0013',
      name: 'Coffee Maker',
      category: 'Appliances',
      price: 89.99,
      stock: 0,
      status: 'Out of Stock',
      lastUpdated: '2024-02-17',
    },
    {
      id: 9,
      code: 'ITEM-0014',
      name: 'Monitor',
      category: 'Electronics',
      price: 499.99,
      stock: 25,
      status: 'In Stock',
      lastUpdated: '2024-02-18',
    },
    {
      id: 10,
      code: 'ITEM-0015',
      name: 'Keyboard',
      category: 'Electronics',
      price: 129.99,
      stock: 15,
      status: 'Low Stock',
      lastUpdated: '2024-02-19',
    },
  ];

  // Table configuration
  tableConfig: TableConfig = {
    columns: [
      {
        key: 'code',
        label: 'Item Code',
        sortable: true,
      },
      {
        key: 'name',
        label: 'Name',
        sortable: true,
      },
      {
        key: 'category',
        label: 'Category',
        sortable: true,
      },
      {
        key: 'price',
        label: 'Price',
        sortable: true,
      },
      {
        key: 'stock',
        label: 'Stock',
        sortable: true,
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
      },
      {
        key: 'lastUpdated',
        label: 'Last Updated',
        sortable: true,
      },
      {
        key: 'actions',
        label: 'Actions',
        type: 'button',
        actions: [
          {
            icon: 'fa-solid fa-edit',
            onClick: (item: any) => this.editItem(item),
            class: 'btn btn-outline-primary mr-2',
            tooltip: 'Edit Item',
          },
          {
            icon: 'fa-solid fa-trash',
            onClick: (item: any) => this.deleteItem(item),
            class: 'btn btn-outline-danger',
            tooltip: 'Delete Item',
          },
        ],
      },
    ],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
  };

  constructor(private toastr: ToastrService) {}

  ngOnInit(): void {}

  // Event Handlers
  onDataChange(data: any[]): void {
    console.log('Data changed:', data);
  }

  onSortChange(sort: { column: string; direction: 'asc' | 'desc' }): void {
    console.log('Sort changed:', sort);
    this.tableData.sort((a: any, b: any) => {
      const aVal = a[sort.column];
      const bVal = b[sort.column];

      if (sort.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  onPageChange(page: number): void {
    console.log('Page changed:', page);
  }

  onPageSizeChange(pageSize: number): void {
    console.log('Page size changed:', pageSize);
  }

  onSearch(searchTerm: any): void {
    console.log('Search term:', searchTerm.value);
  }

  // Action Handlers
  editItem(item: any): void {
    this.toastr.info(`Editing item: ${item.code}`);
    console.log('Edit item:', item);
  }

  deleteItem(item: any): void {
    this.toastr.warning(`Deleting item: ${item.code}`);
    console.log('Delete item:', item);
  }
}
