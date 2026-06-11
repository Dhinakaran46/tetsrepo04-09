import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { GridApiService } from '../../../service/common/grid.service';
import { FormControl } from '@angular/forms';
import { LocalStorageService } from '../../../service/common/local-storage.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-formly-field-tree-select',
  templateUrl: './formly-field-tree-select.component.html',
  styleUrls: ['./formly-field-tree-select.component.scss'],
})
export class FormlyFieldTreeSelectComponent extends FieldType implements OnInit {
  flatData: any[] = [];
  treeData: any[] = [];
  filteredTreeData: any[] = [];
  selectedLabel: string = '';
  isOpen = false;
  searchQuery: string = '';
  expandedNodeIds: Set<any> = new Set<any>();
  policyData: any = null;
  user_info: any = null;
  unique_id: any;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private gridApiService: GridApiService,
    private localStorageService: LocalStorageService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    super();
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      const uuid = params.get('uuid');
      const value = id || uuid;
      this.unique_id = value;
    });
    this.user_info = JSON.parse(this.localStorageService.getData('user_data') || '{}');
    if (this.user_info.main?.policies) {
      this.policyData = this.user_info.main?.policies || null;
    }
    this.initOptions();
    this.initOnchanges(this);

    // Watch control value changes to update selected node label
    this.formControl.valueChanges.subscribe(() => {
      this.updateSelectedLabel();
    });

    // Update selected label reactively when language changes
    this.translate.onLangChange.subscribe(() => {
      this.updateSelectedLabel();
    });
  }

  initOnchanges(context: any) {
    const refreshKeys: string[] = Array.isArray(this.props['refresh']) ? this.props['refresh'] : [this.props['refresh']];

    if (refreshKeys.length) {
      refreshKeys.forEach((refreshKey) => {
        if (refreshKey) {
          try {
            // Safely evaluate the expression passed in 'refresh' key
            const getControlFunction = new Function('context', `with(context) { return ${refreshKey.replace(/this\./g, 'context.')}; }`);

            // Evaluate 'refresh' field string in the context of the current class
            const parentFormControl = getControlFunction(this) as FormControl | undefined;

            if (parentFormControl) {
              parentFormControl.valueChanges?.subscribe((newValue) => {
                this.initOptions(); // Refresh options when any value changes
              });
            }
          } catch (error) {
            console.error(`Error evaluating 'refresh' field string for '${refreshKey}':`, error);
          }
        }
      });
    }
  }

  initOptions() {
    const tableName = this.props['table'] || this.props['primary_table'];
    const valueColumn = this.props['valueColumn'];
    const labelColumn = this.props['labelColumn'];
    const parentIdColumn = this.props['parentIdColumn'] || 'parent_id';
    const uuidColumn = this.props['uuidColumn'] ? this.props['uuidColumn'] : `${tableName}.uuid`;
    const additionalColumns = this.props['additionalColumns'] ? this.props['additionalColumns'] : [];

    if (tableName && labelColumn && valueColumn) {
      const updatedSearchAll = this.props['search_all']
        ? JSON.parse(JSON.stringify(this.props['search_all']))
        : [
            {
              value: '1',
              operator: '=',
              column_name: 'status_id',
            },
          ];

      const search_all = this.evaluateDynamicValues(updatedSearchAll, this);

      const search_any = this.props['search_any']
        ? this.evaluateDynamicValues(JSON.parse(JSON.stringify(this.props['search_any'])), this)
        : [];
      const having_conditions = this.props['having_conditions']
        ? this.evaluateDynamicValues(JSON.parse(JSON.stringify(this.props['having_conditions'])), this)
        : [];
      const having_any_conditions = this.props['having_any_conditions'] ?? this.props['having_any']
        ? this.evaluateDynamicValues(
            JSON.parse(JSON.stringify(this.props['having_any_conditions'] ?? this.props['having_any'])),
            this
          )
        : [];

      const limit_range = this.props['limit_range'] ? this.props['limit_range'] : 1000;
      const sort_columns = this.props['sort_columns'] ? this.props['sort_columns'] : [[labelColumn, 'asc']];
      const includes = this.props['includes'] ? this.props['includes'] : [];

      // Build payload — omit optional arrays when empty so the schema's additionalProperties
      // check never sees unexpected keys and empty arrays don't add noise to the request.
      const payload: any = {
        company_id: 1,
        search_all,
        limit_range,
        print_query: true,
        start_index: 0,
        sort_columns,
        primary_table: tableName,
        select_columns: [
          [valueColumn, 'value'],
          [labelColumn, 'label'],
          [parentIdColumn, parentIdColumn],
          [uuidColumn, 'uuid'],
          ...additionalColumns,
        ],
      };

      if (search_any.length)           payload['search_any']            = search_any;
      if (having_conditions.length)    payload['having_conditions']     = having_conditions;
      if (having_any_conditions.length) payload['having_any_conditions'] = having_any_conditions;
      if (includes.length)             payload['includes']              = includes;

      let listParams = this.localStorageService.replaceUniqueId(
        this.localStorageService.formatPayloadWithPolicyConditions(
          payload,
          this.policyData,
          (this.field as any)?.attached_policies || []
        ),
        '$session_user_id',
        this.user_info.main.id
      );

      listParams = this.localStorageService.replaceUniqueId(listParams, '$unique_id', this.unique_id || '');

      this.gridApiService.getAllList(listParams).subscribe({
        next: (response: any) => {
          if (response.status && response.data?.records?.length > 0) {
            this.flatData = response.data.records.map((record: any) => ({
              ...record,
              value: record[valueColumn] || record['value'],
              label: record[labelColumn] || record['label'],
              uuid: record['uuid'] || record['uuid'],
            }));
            this.treeData = this.buildHierarchy(this.flatData);
            this.filteredTreeData = this.treeData;
            this.updateSelectedLabel();
          } else {
            this.flatData = [];
            this.treeData = [];
            this.filteredTreeData = [];
            this.selectedLabel = '';
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error fetching tree options:', err);
          this.flatData = [];
          this.treeData = [];
          this.filteredTreeData = [];
          this.selectedLabel = '';
          this.cdr.markForCheck();
        }
      });
    }
  }

  buildHierarchy(flat: any[]): any[] {
    const map: any = {};
    const roots: any[] = [];
    const parentIdColumn = this.props['parentIdColumn'] || 'parent_id';

    flat.forEach((item) => {
      map[item.value] = { ...item, children: [] };
    });

    flat.forEach((item) => {
      const parentIdVal = item[parentIdColumn];
      if (parentIdVal && map[parentIdVal]) {
        map[parentIdVal].children.push(map[item.value]);
      } else {
        roots.push(map[item.value]);
      }
    });

    return roots;
  }

  /**
   * Builds the full ancestor path for a given node value.
   * Example: for node "t3" whose parent is "t2" whose parent is "t1",
   * returns "t1 > t2 > t3".
   */
  getAncestorPath(value: any): string {
    const parentIdColumn = this.props['parentIdColumn'] || 'parent_id';
    const nodeMap: any = {};
    this.flatData.forEach(d => nodeMap[d.value] = d);

    const parts: string[] = [];
    let current = nodeMap[value];
    const visited = new Set<any>();

    while (current && !visited.has(current.value)) {
      visited.add(current.value);
      parts.unshift(this.translate.instant(current.label));
      const parentId = current[parentIdColumn];
      current = parentId != null ? nodeMap[parentId] : null;
    }

    return parts.join(' > ');
  }

  updateSelectedLabel() {
    const val = this.formControl?.value;
    if (val !== null && val !== undefined && val !== '') {
      const match = this.flatData.find(d => d.value === val);
      this.selectedLabel = match ? this.getAncestorPath(val) : this.translate.instant(String(val));
    } else {
      this.selectedLabel = '';
    }
    this.cdr.markForCheck();
  }

  selectNode(node: any) {
    if (this.props.disabled) return;
    this.formControl.setValue(node.value);
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  clearSelection() {
    if (this.props.disabled) return;
    this.formControl.setValue(null);
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  isNodeSelected(node: any): boolean {
    return this.formControl?.value === node.value;
  }

  isNodeMatched(node: any): boolean {
    if (!this.searchQuery || this.searchQuery.trim() === '') return false;
    const query = this.searchQuery.toLowerCase().trim();
    return node.label && String(node.label).toLowerCase().includes(query);
  }

  getHighlightedText(text: string): string {
    const translated = this.translate.instant(text || '');
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      return translated;
    }
    const query = this.searchQuery.trim();
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return translated.replace(regex, `<mark class="bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white rounded-sm px-0.5">$1</mark>`);
  }

  isNodeExpanded(node: any): boolean {
    return this.expandedNodeIds.has(node.value);
  }

  toggleNodeExpand(node: any) {
    if (this.expandedNodeIds.has(node.value)) {
      this.expandedNodeIds.delete(node.value);
    } else {
      this.expandedNodeIds.add(node.value);
    }
  }

  applyDropdownFilter() {
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      this.filteredTreeData = this.treeData;
      this.cdr.markForCheck();
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    const expanded = new Set<any>();

    const filterRecursive = (nodes: any[]): any[] => {
      const result: any[] = [];
      for (const node of nodes) {
        const matchesSelf = node.label && String(node.label).toLowerCase().includes(query);
        const filteredChildren = filterRecursive(node.children || []);

        if (matchesSelf || filteredChildren.length > 0) {
          if (filteredChildren.length > 0) {
            expanded.add(node.value);
          }
          result.push({
            ...node,
            children: filteredChildren
          });
        }
      }
      return result;
    };

    this.filteredTreeData = filterRecursive(this.treeData);
    expanded.forEach(id => this.expandedNodeIds.add(id));
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const element = event.target as HTMLElement;
    if (!element.closest('.tree-select-container')) {
      this.isOpen = false;
      this.cdr.markForCheck();
    }
  }

  // Cast formControl to FormControl explicitly
  override get formControl(): FormControl {
    return this.form.get(this.field.key as string) as FormControl;
  }

  evaluateDynamicValues(search_all: any[], context: any): any[] {
    return search_all.map((item) => {
      if (typeof item.value === 'string' && item.value.startsWith('this.')) {
        try {
          const dynamicValue = new Function(
            'context',
            `with(context) { try { return ${item.value.replace(/this\./g, 'context.')}; } catch (e) { return null; } }`
          );
          const evaluatedValue = dynamicValue(context);

          if (evaluatedValue !== undefined) {
            item.value = evaluatedValue;
          } else {
            item.value = null;
          }
        } catch (error) {
          console.error(`Error evaluating value: ${item.value}`, error);
        }
      }
      return item;
    });
  }

  getAddEditForm(): string | null {
    if ((this.field as any).modal && (this.field as any).modal.entityName) {
      return (this.field as any).modal.entityName;
    }
    return (this.field as any).entityName || null;
  }

  getModalConfig(): any {
    return (this.field as any).modal || null;
  }

  getFieldKey(): string | undefined {
    if (this.field.key === undefined || this.field.key === null) {
      return undefined;
    }
    return String(this.field.key);
  }

  openNestedFormModal(entityName: string, fieldKey?: string) {
    if (!entityName || entityName.trim() === '') {
      console.warn('No entity name provided for nested form modal');
      return;
    }
    this.isOpen = false; // Close the dropdown when opening the modal!
    const componentInstance = this.options?.formState?.componentInstance;
    if (componentInstance && typeof componentInstance.openNestedFormModal === 'function') {
      const modalCfg = this.getModalConfig();
      componentInstance.openNestedFormModal(entityName, fieldKey, modalCfg, null, 'popup_add');
    }
  }
}
