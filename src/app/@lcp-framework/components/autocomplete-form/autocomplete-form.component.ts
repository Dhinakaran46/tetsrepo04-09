import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonSharedModule } from '../../shared/common/common.module';

@Component({
  selector: 'app-autocomplete-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CommonSharedModule],
  templateUrl: './autocomplete-form.component.html',
  styleUrl: './autocomplete-form.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AutocompleteFormComponent),
      multi: true,
    },
  ],
})
export class AutocompleteFormComponent implements ControlValueAccessor, OnChanges {
  @Input() value!: string | number;
  @Input() label: string = '';
  @Input() items: { id: number | string; name: string }[] = [];
  @Input() fieldName!: string;
  @Input() placeholder: string = '';
  @Input() hidelabel: boolean = false;
  dispLabel: string | null = null;
  @Input() width: string | null = null;
  @Input() required: boolean = false;

  @Output() itemSelected: EventEmitter<any> = new EventEmitter();
  filteredItems: { id: number | string; name: string }[] = [];
  showDropdown: boolean = false;
  private innerValue: any = null;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    this.filteredItems = this.items;
  }

  // Callbacks
  onChange = (value: any) => {};
  onTouched = () => {};

  // This is called when Angular sets a value (ex: setValue(null))
  writeValue(value: any): void {
    this.innerValue = value;

    if (value) {
      const selectedItem = this.items.find((item) => item.id === value);
      this.dispLabel = selectedItem ? selectedItem.name : null;
    } else {
      this.dispLabel = null;
    }
  }

  // This is called when form is touched
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  // This is called when form value is changed
  registerOnChange(fn: any): void {
    this.onChange = fn;
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
