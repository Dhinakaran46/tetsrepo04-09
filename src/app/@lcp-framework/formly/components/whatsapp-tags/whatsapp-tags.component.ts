import { Component, OnInit, Renderer2 } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { GridApiService } from '../../../service/common/grid.service';
import { ChangeDetectorRef } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-whatsapp-tags',
  standalone: true,
  imports: [],
  templateUrl: './whatsapp-tags.component.html',
  styleUrl: './whatsapp-tags.component.scss',
})
export class WhatsappTagsComponent extends FieldType implements OnInit {
  listDatas: any = [];
  fileNameControl: any;

  constructor(private gridApiService: GridApiService, private cdr: ChangeDetectorRef, private renderer: Renderer2) {
    super();
  }

  ngOnInit() {
    this.setData();
    this.fileNameControl = this.form.get('whatsapp_template_process_id') as FormControl;
    this.fileNameControl?.valueChanges.subscribe(() => {
      this.setData();
    });
  }

  setData() {
    const whatsapp_template_process_id = this.fileNameControl?.value;
    if (whatsapp_template_process_id) {
      const listParams = {
        company_id: 1,
        search_all: [
          {
            value: '1',
            operator: '=',
            column_name: 'status_id',
          },
          {
            value: whatsapp_template_process_id,
            operator: '=',
            column_name: 'whatsapp_template_process_tags_mapping.whatsapp_template_process_id',
          },
        ],
        limit_range: 1000,
        print_query: true,
        start_index: 0,
        sort_columns: [['whatsapp_template_tags.slug', 'asc']],
        primary_table: 'whatsapp_template_tags',
        select_columns: [
          ['whatsapp_template_tags.id', 'value'],
          ['whatsapp_template_tags.slug', 'label'],
        ],
        includes: [
          {
            table_name: 'whatsapp_template_process_tags_mapping',
            join_type: 'INNER',
            join_condition: 'whatsapp_template_tags.id = whatsapp_template_process_tags_mapping.whatsapp_template_tag_id',
          },
        ],
      };

      this.gridApiService.getAllList(listParams).subscribe((response) => {
        if (response.status && response.code === 200) {
          this.listDatas = response.data.records;
          this.cdr.detectChanges(); // Trigger change detection manually
        }
      });
    }
  }

  copyContent(content: string) {
    const textarea = this.renderer.createElement('textarea');
    this.renderer.setStyle(textarea, 'position', 'fixed');
    this.renderer.setStyle(textarea, 'opacity', '0');
    textarea.value = content;
    this.renderer.appendChild(document.body, textarea);
    textarea.select();
    document.execCommand('copy');
    this.renderer.removeChild(document.body, textarea);
  }

  override get formControl(): FormControl {
    return this.form.get(this.field.key as string) as FormControl;
  }
}
