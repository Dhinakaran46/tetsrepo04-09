import { Component } from '@angular/core';
import { SafeHtmlPipe } from '../../pipes/safehtml/safe-html.pipe';
import * as Handlebars from 'handlebars';
import { CommonSharedModule } from '../../shared/common/common.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Store, select } from '@ngrx/store';
import { GridApiService } from '../../service/common/grid.service';
import { Observable } from 'rxjs';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

// Define a Handlebars helper for adding 1 to the index
Handlebars.registerHelper('inc', function (value) {
  return parseInt(value) + 1;
});
Handlebars.registerHelper('truncate', (text: string, maxLength: number) => {
  if (text && text.length > maxLength) {
    return text.substring(0, maxLength) + '...';
  }
  return text;
});

@Component({
  selector: 'app-static-page',
  standalone: true,
  imports: [CommonSharedModule, SafeHtmlPipe],
  templateUrl: './static-page.component.html',
  styleUrl: './static-page.component.scss',
})
export class StaticPageComponent {
  pageContent: string = '';
  store$: Observable<any>;
  unique_id!: string | null;
  entity_name!: string;
  entity_type!: string | null;
  query_information!: string | null;
  static_page_content: string = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private store: Store<any>,
    public location: Location,
    public translate: TranslateService
  ) {
    this.store$ = this.store.pipe(select('index'));
    this.initStore();

    Handlebars.registerHelper('translate', (key: string) => {
      // Use the TranslateService to get the translation for the given key
      return this.translate.instant(key);
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.unique_id = params.get('id') || params.get('uuid');
    });

    this.route.data.subscribe((data) => {
      const pageInfo = data['pageInfo'];
      this.entity_name = pageInfo.fullEntity;
      this.entity_type = pageInfo.action_slug;
      console.log('Route data:', this.entity_name, this.entity_type, this.unique_id);
    });

    this.initStore();
    this.loadData();
  }

  private initStore() {
    this.store$.subscribe((store) => {
      // Handle store changes
    });
  }

  private loadData() {
    const listParams = {
      company_id: 1,
      print_query: false,
      primary_table: 'master_entities',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['master_entities.id', 'desc']],
      select_columns: [['master_entities.*']],
      search_all: [
        { column_name: 'master_entities.entity_name', operator: '=', value: this.entity_name },
        { column_name: 'master_entities.entity_type', operator: '=', value: 'static_page_builder_module' },
        { column_name: 'master_entities.status_id', operator: '=', value: '1' },
      ],
    };

    this.gridApiService.getAllList(listParams).subscribe(
      (response) => {
        if (response.status && response.data?.records?.length > 0) {
          this.query_information = response.data.records[0].query_information;
          this.static_page_content = response.data.records[0].static_page_content;
          if (this.query_information) {
            this.loadDefaultData();
          } else {
            this.pageContent = this.static_page_content;
          }
        } else {
          this.toastr.error('Invalid entity details given1.');
          this.router.navigate(['/dashboard']);
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.router.navigate(['/dashboard']);
      }
    );
  }

  private loadDefaultData() {
    if (this.unique_id) {
      this.query_information = this.replaceUniqueId(this.query_information, '$unique_id', this.unique_id);
    }
    this.gridApiService.getAllList(this.query_information).subscribe(
      (response) => {
        if (response.status && response.data?.records?.length > 0) {
          if (response.data?.records?.length === 1) {
            this.pageContent = this.compileStaticContent(this.static_page_content, { result_data: response.data.records[0] });
          } else {
            this.pageContent = this.compileStaticContent(this.static_page_content, { result_data: response.data.records });
          }
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.router.navigate(['/dashboard']);
      }
    );
  }

  compileStaticContent(staticContent: string, data: any): string {
    const compiledTemplate = Handlebars.compile(staticContent);
    console.log('compiled Data', data);
    return compiledTemplate(data);
  }

  replaceUniqueId(jsonObject: any, uniqueIdPlaceholder: string, uniqueIdValue: string): any {
    // Create a regular expression that matches the exact placeholder string
    const placeholderRegex = new RegExp(uniqueIdPlaceholder.replace(/\$/g, '\\$'), 'g');

    // Base case: if the jsonObject is a string, replace the placeholder with the value
    if (typeof jsonObject === 'string') {
      const replacedString = jsonObject.replace(placeholderRegex, uniqueIdValue);
      console.log('Replaced:', jsonObject, 'with:', replacedString);
      return replacedString;
    }

    // Recursive case: if the jsonObject is an array, process each element
    if (Array.isArray(jsonObject)) {
      return jsonObject.map((item) => this.replaceUniqueId(item, uniqueIdPlaceholder, uniqueIdValue));
    }

    // Recursive case: if the jsonObject is an object, process each key-value pair
    if (typeof jsonObject === 'object' && jsonObject !== null) {
      const newObject: any = {};
      for (const key in jsonObject) {
        if (jsonObject.hasOwnProperty(key)) {
          newObject[key] = this.replaceUniqueId(jsonObject[key], uniqueIdPlaceholder, uniqueIdValue);
        }
      }
      return newObject;
    }

    // If it's neither a string, array, or object, return it as is
    return jsonObject;
  }
}
