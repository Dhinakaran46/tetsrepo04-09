import { Component, EventEmitter, Input, Output } from '@angular/core';
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
import { registerHandlebarsHelpers } from '../../helpers/handlebar/handlebar-helpers';
import { slideDownUp } from '../../shared/animations';
import { IconArrowLeftComponent } from '../../shared/icon/icon-arrow-left';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-static-page',
  standalone: true,
  imports: [CommonSharedModule, SafeHtmlPipe, IconArrowLeftComponent],
  templateUrl: './static-page.component.html',
  styleUrl: './static-page.component.scss',
  animations: [slideDownUp],
})
export class StaticPageComponent {
  currentAccordion: string = 'home';
  currentTab: string = 'home';

  pageContent: string = '';
  store$: Observable<any>;
  unique_id!: string | null;
  entity_name!: string;
  entity_type!: string | null;
  query_information!: string | null;
  static_page_content: string = '';

  @Input() uuid!: string | null;
  @Input() entityName!: string;
  @Input() isModal: boolean = false;
  @Output() closeModal = new EventEmitter<void>();

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private store: Store<any>,
    public location: Location,
    public translate: TranslateService,
    private titleService: Title
  ) {
    this.store$ = this.store.pipe(select('index'));
    this.initStore();

    registerHandlebarsHelpers(this.translate);
  }

  setTab(tab: string) {
    this.currentTab = tab;
    this.loadData();
  }
  setAccordion(index: any) {
    this.currentAccordion = index;
    this.loadData();
  }
  attachEventListeners() {
    const tabLinks = document.querySelectorAll('a[data-tab]');

    tabLinks.forEach((tabLink) => {
      const tabName = tabLink.getAttribute('data-tab');
      if (tabName) {
        tabLink.addEventListener('click', () => this.setTab(tabName));
      }
    });

    const buttons = document.querySelectorAll('button[data-accordion]');
    buttons.forEach((buttonLink) => {
      const buttonName = buttonLink.getAttribute('data-accordion');
      if (buttonName) {
        buttonLink.addEventListener('click', () => this.setAccordion(buttonName));
      }
    });
  }

  ngOnInit() {
    if (!this.uuid) {
      this.route.paramMap.subscribe((params) => {
        this.unique_id = params.get('id') || params.get('uuid');
      });
    }
    if (this.uuid) {
      this.unique_id = this.uuid;
    }

    if (!this.entityName) {
      this.route.data.subscribe((data) => {
        const pageInfo = data['pageInfo'];
        this.entity_name = pageInfo.fullEntity;
        const translateTitle = this.translate.instant(this.entity_name);
        this.titleService.setTitle(translateTitle);
        this.entity_type = pageInfo.action_slug;
      });
    }
    if (this.entityName) {
      this.entity_name = this.entityName;
      const translateTitle = this.translate.instant(this.entity_name);
      this.titleService.setTitle(translateTitle);
    }

    console.log(this.entity_name);
    console.log(this.unique_id);
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
          console.log(response.data.records);
          this.query_information = response.data.records[0].query_information;
          this.static_page_content = response.data.records[0].static_page_content;

          if (this.query_information) {
            this.loadDefaultData();
          } else {
            //this.pageContent = this.static_page_content;
            this.pageContent = this.compileStaticContent(this.static_page_content, {
              currentTab: this.currentTab,
              currentAccordion: this.currentAccordion,
            });

            setTimeout(() => {
              this.attachEventListeners();
            }, 0);
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
            this.pageContent = this.compileStaticContent(this.static_page_content, {
              result_data: response.data.records[0],
              currentTab: this.currentTab,
              currentAccordion: this.currentAccordion,
            });
          } else {
            this.pageContent = this.compileStaticContent(this.static_page_content, {
              result_data: response.data.records,
              currentTab: this.currentTab,
              currentAccordion: this.currentAccordion,
            });
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

  // Helper function to replace <render-html> tags with inner HTML content
  replaceRenderHtmlTags(html: string): string {
    // Create a temporary DOM element to parse HTML string safely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Find all <render-html> elements inside tempDiv
    const renderHtmlElems = tempDiv.querySelectorAll('render-html');

    renderHtmlElems.forEach((elem) => {
      // Replace <render-html> node with its innerHTML content
      const parent = elem.parentNode;
      if (parent) {
        // Insert a new span element with innerHTML of <render-html>
        const fragment = document.createRange().createContextualFragment(elem.innerHTML);
        parent.replaceChild(fragment, elem);
      }
    });

    return tempDiv.innerHTML;
  }

  compileStaticContent(staticContent: string, data: any): string {
    // Escape HTML in code blocks
    staticContent = staticContent.replace(/<code class="xml">([\s\S]*?)<\/code>/g, (match, p1) => {
      return `<code class="xml">${this.escapeHtml(p1)}</code>`;
    });
    // Pretty-print JSON if data contains JSON fields
    const formattedData = this.prettifyJsonFields(data);

    // Compile the static content using Handlebars
    const compiledTemplate = Handlebars.compile(staticContent);
    let rendered = compiledTemplate(formattedData);
    rendered = this.escapeRenderIntoHtml(rendered);

    // Replace all <render-html>...</render-html> tags with their inner HTML content unescaped
    rendered = this.replaceRenderHtmlTags(rendered);
    return rendered;
  }

  escapeRenderIntoHtml(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#123;/g, '{')
      .replace(/&#125;/g, '}');
  }

  // Utility function to prettify JSON fields in the data object
  prettifyJsonFields(data: any): any {
    const formattedData = { ...data.result_data };

    for (const key in formattedData) {
      if (formattedData.hasOwnProperty(key)) {
        const value = formattedData[key];

        // Check if the field value is a JSON string or JSON object

        if (this.isValidJson(value)) {
          // If it's JSON, pretty-print it with 2-space indentation
          formattedData[key] = JSON.stringify(JSON.parse(value), null, 2);
        }
      }
    }

    data.result_data = formattedData;
    return data;
  }

  // Helper function to check if a string contains valid JSON
  isValidJson(value: string): boolean {
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
  }

  escapeHtml(html: string): string {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/{/g, '&#123;')
      .replace(/}/g, '&#125;');
    //.replace(/\//g, '&#47;');
  }

  replaceUniqueId(jsonObject: any, uniqueIdPlaceholder: string, uniqueIdValue: string): any {
    // Create a regular expression that matches the exact placeholder string
    const placeholderRegex = new RegExp(uniqueIdPlaceholder.replace(/\$/g, '\\$'), 'g');

    // Base case: if the jsonObject is a string, replace the placeholder with the value
    if (typeof jsonObject === 'string') {
      const replacedString = jsonObject.replace(placeholderRegex, uniqueIdValue);

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
