import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonSharedModule } from '../../shared/common/common.module';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CommonSharedModule],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
})
export class AutocompleteComponent implements OnInit, OnChanges {
  @Input() value!: string | number;
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() items: { id: number | string; name: string }[] = [];
  @Input() fieldName: string = '';
  dispLabel: string | null = null;
  @Input() width: string | null = null;

  @Output() itemSelected: EventEmitter<any> = new EventEmitter();
  filteredItems: { id: number | string; name: string }[] = [];
  showDropdown: boolean = false;

  constructor() {}

  ngOnInit() {
    // Ensure the control is a FormControl
    if (this.value) {
    }
  }

  ngOnChanges() {
    this.filteredItems = this.items;
    if (this.value) {
      this.items.forEach((each: { id: number | string; name: string }) => {
        if (each.id === this.value) {
          this.dispLabel = each.name;
        }
      });
    } else {
      this.dispLabel = null;
    }
  }

  showDropdowndisp() {
    this.showDropdown = true;
  }

  filterItems(event: any) {
    const term = event.target.value ?? '';
    const searchTerm = term.toLowerCase();
    this.filteredItems = this.items.filter((item) => item.name.toLowerCase().includes(searchTerm));
    this.showDropdown = this.filteredItems.length > 0;
  }

  selectItem(item: any) {
    this.value = item.id;
    this.dispLabel = item.name;
    this.itemSelected.emit(item);
    this.showDropdown = false;
  }

  hideDropdown() {
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }
}
