import { Component } from '@angular/core';
import { Highlight } from 'ngx-highlightjs';
import { HighlightLineNumbers } from 'ngx-highlightjs/line-numbers';

@Component({
  selector: 'app-page-builder',
  standalone: true,
  imports: [Highlight, HighlightLineNumbers],
  templateUrl: './page-builder.component.html',
  styleUrl: './page-builder.component.scss',
})
export class PageBuilderComponent {
  staticpagecontent = ` <div class=\"panel\">\r\n                <div class=\"mb-5 text-lg font-bold\">Recent Users</div>\r\n                <div class=\"table-responsive\">\r\n                    <table>\r\n                        <thead>\r\n                            <tr>\r\n                                <th>Email</th>\r\n                                <th>First Name</th>\r\n                                <th>Last Name</th>\r\n                                <th>Role</th>\r\n                                <th class=\"text-center ltr:rounded-r-md rtl:rounded-l-md\">STATUS</th>\r\n                            </tr>\r\n                        </thead>\r\n                        <tbody>\r\n                           {{#each data_list}}\r\n          <tr>\r\n            <td class=\"font-semibold\">{{email}}</td>\r\n            <td class=\"whitespace-nowrap\">{{first_name}}</td>\r\n            <td class=\"whitespace-nowrap\">{{last_name}}</td>\r\n            <td>{{role}}</td>\r\n            <td class=\"text-center\">\r\n                <span class=\"badge rounded-full {{#if status_id }} bg-success/20 text-success{{else}} bg-danger/20 text-danger{{/if}}  hover:top-0\">{{#if status_id }}Active{{else}}Inactive{{/if}}</span>\r\n            </td>\r\n        </tr>\r\n        {{/each}}\r\n                        </tbody>\r\n                    </table>\r\n                </div>\r\n            </div>`;
}
