import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { animate, style, transition, trigger } from '@angular/animations';
import { FormBuilder, FormGroup, ReactiveFormsModule, AbstractControl, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { CommonSharedModule } from '../../shared/common/common.module';
import { ToastrService } from 'ngx-toastr';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { DataTableComponent } from '../../components/datatable/datatable.component';

import { MenuMapService } from '../../service/common/menu-map.service';
import { LoaderComponent } from '../../components/loader/loader.component';
import { SearchPipe } from '../../pipes/search.pipe';
import { GridApiService } from '../../service/common/grid.service';
import Swal from 'sweetalert2';
import { LanguageService } from '../../service/common/language.service';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { OpenaiService } from '../../service/common/openai.service';

interface Language {
  description: string | null;
  language_id: number;
  language_name: string;
  name_in_english: string;
}

interface Item {
  key1: string;
  language_content: Language[];
  target_keywords_embeddings?: any;
  is_target_keyword_updated?: number;
}

@Component({
  selector: 'app-target-keywords-embeddings',
  standalone: true,
  imports: [LoaderComponent, CommonSharedModule, DataTableComponent, ReactiveFormsModule, SearchPipe],
  templateUrl: './target-keywords-embeddings.component.html',
  styleUrl: './target-keywords-embeddings.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class TargetKeywordsEmbeddingsComponent implements OnInit {
  store: any;
  userId: any;
  companyId: any;
  loading = false;

  allItems: Item[] = [];
  filteredItems: Item[] = [];
  languages: Language[] = [];
  totalPages: number = 0;
  currentPage: number = 1;
  pageSize: number = 10;
  searchQuery: string = '';
  langMapForm: FormGroup;
  langMapAddForm: FormGroup;
  filteredControls: AbstractControl[] = [];
  keys: string[] = ['key1'];
  initialValues: any[] = []; // To store initial values
  totalItems: number = 0;

  isMenuOpen = false;

  update_json_schema: any = {
    // it will be removed
    action: ['hard_delete', 'insert'],
    table: ['route_keywords_embeddings', 'route_keywords_embeddings'],
    table_mapping: ['table1', 'table2'],
    data: {
      table2: [],
    },
    conditions: {
      table1: [],
    },
  };

  delete_json_schema: any = {
    // it will be removed
    action: ['hard_delete'],
    table: ['route_keywords_embeddings'],
    table_mapping: ['table1'],
    conditions: {
      table1: [],
    },
  };

  title_key: string = 'language_content';
  languageCode: any;
  masterInfo: any;

  constructor(
    public router: Router,
    private formBuilder: FormBuilder,
    private commonService: MenuMapService,
    private toastr: ToastrService,
    private localStorageService: LocalStorageService,
    public storeData: Store<any>,
    private gridApiService: GridApiService,
    private route: ActivatedRoute,
    private languageService: LanguageService,
    private translate: TranslateService,
    private titleService: Title,
    private openaiService: OpenaiService
  ) {
    this.langMapForm = this.formBuilder.group({
      items: this.formBuilder.array([]),
    });

    this.langMapAddForm = this.formBuilder.group({
      items: this.formBuilder.array([]),
    });
    this.initStore();
  }

  ngOnInit() {
    this.title_key = this.route.snapshot.data['pageInfo'].fullEntity;
    const translateTitle = this.translate.instant(this.title_key);
    this.titleService.setTitle(translateTitle);
    const userData = this.localStorageService.getData('user_data');
    if (userData) {
      const parsedData = JSON.parse(userData);
      this.userId = parsedData.main?.id;
      this.companyId = parsedData.main?.company_id;
    }

    const pageInfo = this.route.snapshot.data['pageInfo'] || '';
    if (pageInfo) {
      this.masterInfo = pageInfo;
    }

    this.languageCode = this.languageService.getSavedLanguageCode();
    if (this.languageService.checkReloadFlag()) {
    } else {
    }

    const languageId = this.languageService.getLanguageId(this.languageCode);
    this.languageService.fetchLanguageData(this.companyId, languageId);

    this.fetchData();
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) this.addNewItemFormArray(true);
  }

  fetchData() {
    this.loading = true;
    const procedureParams = { proc_name: 'get_key_menu_target', params: { company_id: this.companyId } };

    this.commonService.procedureCall(procedureParams).subscribe({
      next: (response: { code: number; status: boolean; data: { result: Item[] }[]; message: string }) => {
        if (response.code === 200 && response.status) {
          this.allItems = response.data?.[0]?.result || [];
          this.languages = this.extractLanguages(this.allItems);
          this.populateFormArray(this.allItems);
          this.storeInitialValues();
        } else {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      error: (error) => {
        console.error('Error fetching data:', error);
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  extractLanguages(items: Item[]): Language[] {
    const languageSet = new Set<string>();
    for (let index = 0; index < items.length; index++) {
      if (index === 1) break;
      items[index].language_content.forEach((lang) => {
        languageSet.add(JSON.stringify(lang));
      });
    }
    return Array.from(languageSet).map((lang) => JSON.parse(lang));
  }

  get formItems() {
    return this.langMapForm.get('items') as FormArray;
  }

  get getAddFormItems() {
    let itemsArray = this.langMapAddForm.get('items') as FormArray;
    return itemsArray ? itemsArray.controls : [];
  }

  getItemControls(): AbstractControl[] {
    const itemsArray = this.langMapForm.get('items') as FormArray;
    return itemsArray ? itemsArray.controls : [];
  }

  populateFormArray(data: any) {
    const itemsArray = this.langMapForm.get('items') as FormArray;
    itemsArray.clear();

    data.forEach((item: Item, rowIndex: number) => {
      if (item && item.language_content) {
        const group = this.formBuilder.group({
          isShow: true,
          key1: [item.key1],
        });

        item.language_content.forEach((lang: Language) => {
          const uniqueControlName = this.generateControlName(lang.language_id);
          (group as FormGroup).addControl(uniqueControlName, this.formBuilder.control(lang.description || ''));
        });

        itemsArray.push(group);
      }

      if (data.length - 1 === rowIndex) {
        setTimeout(() => {
          this.updateFilteredControls();
        }, 500);
      }
    });
  }

  addNewItemFormArray(isFirstTime: boolean) {
    const itemsArray = this.langMapAddForm.get('items') as FormArray;
    if (isFirstTime) itemsArray.clear();

    const group = this.formBuilder.group({
      isShow: true,
      key1: ['', [Validators.required]],
    });

    this.languages.forEach((lang: Language) => {
      const uniqueControlName = this.generateControlName(lang.language_id);
      (group as FormGroup).addControl(uniqueControlName, this.formBuilder.control(lang.description || ''));
    });

    itemsArray.push(group);
  }

  updateFilteredControls() {
    const controls = this.getItemControls();
    controls.forEach((control) => {
      const matches = this.keys.some((key) => {
        const controlValue = control.get(key)?.value;
        return controlValue != null && controlValue.toString().toLowerCase().includes(this.searchQuery.toLowerCase());
      });
      control.get('isShow')?.setValue(matches);
    });

    this.filteredControls = controls.filter((control) => control.get('isShow')?.value);
    this.totalItems = this.filteredControls.length;
    this.totalPages = this.calculateTotalPages();

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.filteredControls.forEach((control, index) => {
      const isVisible = index >= startIndex && index < endIndex;
      control.get('isShow')?.setValue(isVisible);
    });
  }

  onInputChange(event: Event, control: any): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value;

    // Manually update the form control value
    control.setValue(value, { emitEvent: false });
  }

  onSearch() {
    this.currentPage = 1;
    this.updateFilteredControls();
  }

  generateControlName(languageId: number): string {
    return `${languageId}_description`;
  }

  getControlNames(group: AbstractControl): string[] {
    return Object.keys((group as FormGroup).controls).filter((key) => key !== 'key1' && key !== 'isShow');
  }

  getControlNames1(group: AbstractControl): string[] {
    return Object.keys((group as FormGroup).controls).filter((key) => key !== 'isShow');
  }

  removeItem(index: number) {
    this.getAddFormItems.splice(index, 1);
  }

  async generateVector(keyName: string) {
    // Get the form group for this key
    const itemsArray = this.langMapForm.get('items') as FormArray;
    const targetGroup = itemsArray.controls.find((control) => control.get('key1')?.value === keyName);

    if (!targetGroup) {
      console.error('Target group not found for key:', keyName);
      return;
    }

    // Construct payload array for each language
    const payload = [];
    const controlNames = this.getControlNames(targetGroup);

    for (const controlName of controlNames) {
      const languageId = controlName.split('_')[0];
      const keywords = targetGroup.get(controlName)?.value;

      if (keywords && keywords.trim()) {
        // Determine language code based on language_id
        const languageCode = languageId === '1' ? 'en-GB' : 'ar-QA';

        payload.push({
          target: keyName,
          keywords: keywords,
          language_code: languageCode,
        });
      }
    }

    if (payload.length === 0) {
      console.warn('No keywords found to generate vectors for');
      return;
    }

    this.openaiService.generateMenuEmbeddings(payload).subscribe({
      next: (response) => {
        const key = 'vector_generation_success';
        const successMessage = this.translate.instant(key);
        this.toastr.success(successMessage);
      },
      error: (error) => {
        console.error('Error generating vector:', error);
        const key = 'vector_generation_error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage);
      },
    });
  }

  async removeItem1(keyName: string) {
    let removableItems: string[] = [];

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
      removableItems.push(keyName);

      if (removableItems.length > 0) {
        this.deleteRecords(removableItems);
      }
    }
  }

  deleteRecords(postData: any) {
    const removable_items = postData.map((item: any) => ({
      target: item,
    }));

    this.delete_json_schema.conditions['table1'] = removable_items;

    this.gridApiService.executeRecords(this.delete_json_schema).subscribe(
      (response: any) => {
        if (response.status && response.code === 200) {
          const key = 'record_deleted_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          setTimeout(() => {
            location.reload();
          }, 500);
        } else {
          const key = 'record_failed_deleted';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error: any) => {
        const key = 'record_failed_deleted';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  getActualIndex(index: number): number {
    return index;
  }

  storeInitialValues() {
    this.initialValues = this.langMapForm.value.items.map((item: any) => ({ ...item }));
  }

  onSubmit() {
    const itemsArray = this.langMapForm.get('items') as FormArray;
    const changedData = itemsArray.controls
      .map((control: AbstractControl, index: number) => {
        const initialValue = this.initialValues[index];
        const currentValue = control.value;
        const changedControls = this.getControlNames(control).filter((controlName) => {
          return initialValue[controlName] !== currentValue[controlName];
        });

        if (changedControls.length > 0) {
          return changedControls.map((controlName: string) => {
            return {
              language_id: controlName.split('_')[0],
              key: control.get('key1')?.value,
              value: control.get(controlName)?.value,
            };
          });
        }

        return [];
      })
      .flat()
      .filter((item) => item);

    // Implement your save logic here
    if (changedData.length > 0) {
      this.saveRecords(changedData);
    }
  }

  prepareNewRecords() {
    const itemsArray = this.langMapAddForm.get('items') as FormArray;
    const changedData = itemsArray.controls
      .map((control: AbstractControl, index: number) => {
        const changedControls = this.getControlNames(control);

        if (changedControls.length > 0) {
          return changedControls.map((controlName: string) => {
            return {
              language_id: controlName.split('_')[0],
              key: control.get('key1')?.value,
              value: control.get(controlName)?.value,
            };
          });
        }

        return [];
      })
      .flat()
      .filter((item) => item);

    // Implement your save logic here
    if (changedData.length > 0) {
      this.saveRecords(changedData);
    }
  }

  saveRecords(postData: any) {
    const removable_items = postData.map((item: any) => ({
      language_id: item.language_id,
      target: item.key,
    }));

    const insertable_items = postData.map((item: any) => ({
      language_id: item.language_id,
      target: item.key,
      target_keywords: item.value,
      is_target_keyword_updated: 1,
    }));

    this.update_json_schema.conditions['table1'] = removable_items;
    this.update_json_schema.data['table2'] = insertable_items;

    this.gridApiService.executeRecords(this.update_json_schema).subscribe(
      (response: any) => {
        if (response.status && response.code === 200) {
          const key = 'record_updated_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          this.isMenuOpen = false;
          this.languageService.serviceChangeLanguage(this.companyId, this.languageCode.toLowerCase());
          this.fetchData();

          // setTimeout(() => {
          //   location.reload();
          // }, 500);
        } else {
          const key = 'record_failed_updated';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error: any) => {
        const key = 'record_failed_inserted';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  /* Pagination - Start */

  goToPage(page: number | string) {
    if (typeof page === 'number' && page !== this.currentPage) {
      this.currentPage = page;
      this.updateFilteredControls();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateFilteredControls();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateFilteredControls();
    }
  }

  getDisplayedItemCount(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  getPageNumbers(): (number | string)[] {
    const totalPages = this.calculateTotalPages();
    const currentPage = this.currentPage;
    const pageNumbers: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);

      if (currentPage > 3) {
        pageNumbers.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }

      if (currentPage < totalPages - 2) {
        pageNumbers.push('...');
      }

      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  }

  handleEllipsisClick(index: number) {
    const pageNumbers = this.getPageNumbers();
    if (index === 1) {
      // Clicked on the first ellipsis
      this.goToPage(Math.floor((1 + this.currentPage) / 2));
    } else if (index === pageNumbers.length - 2) {
      // Clicked on the last ellipsis
      this.goToPage(Math.floor((this.totalPages + this.currentPage) / 2));
    }
  }

  onResultsPerPageChange() {
    this.currentPage = 1;
    this.pageSize = 50;
    this.updateFilteredControls();
  }

  calculateTotalPages() {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);

    return this.totalPages;
  }

  // Methods to determine embedding status
  getItemFromGroup(group: AbstractControl): Item | undefined {
    const keyValue = group.get('key1')?.value;
    return this.allItems.find((item) => item.key1 === keyValue);
  }

  getEmbeddingStatus(item: any): string {
    if (!item) {
      return 'unknown';
    }
    if (!item.target_keywords_embeddings) {
      return 'not-embedded';
    }
    if (item.is_target_keyword_updated === 1) {
      return 'pending';
    }
    return 'embedded';
  }

  getEmbeddingIcon(item: Item | undefined): string {
    if (!item) {
      return 'fa-solid fa-question text-gray-500';
    }
    const status = this.getEmbeddingStatus(item);
    switch (status) {
      case 'not-embedded':
        return 'fa-solid fa-triangle-exclamation text-red-500';
      case 'pending':
        return 'fa-solid fa-clock text-yellow-500';
      case 'embedded':
        return 'fa-solid fa-check-circle text-green-500';
      default:
        return 'fa-solid fa-question text-gray-500';
    }
  }

  getEmbeddingHoverText(item: Item | undefined): string {
    if (!item) {
      return 'Unknown Status';
    }
    const status = this.getEmbeddingStatus(item);
    switch (status) {
      case 'not-embedded':
        return 'Not Embedded';
      case 'pending':
        return 'Yet To Be Updated';
      case 'embedded':
        return 'Embedded';
      default:
        return 'Unknown Status';
    }
  }
}
