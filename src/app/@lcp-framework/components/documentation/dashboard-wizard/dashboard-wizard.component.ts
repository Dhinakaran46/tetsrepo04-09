import { Component } from '@angular/core';
import { Highlight } from 'ngx-highlightjs';
import { HighlightLineNumbers } from 'ngx-highlightjs/line-numbers';

@Component({
  selector: 'app-dashboard-wizard',
  standalone: true,
  imports: [Highlight, HighlightLineNumbers],
  templateUrl: './dashboard-wizard.component.html',
  styleUrl: './dashboard-wizard.component.scss',
})
export class DashboardWizardComponent {
  staticpagecontent = `<div class=\"panel bg-gradient-to-r from-fuchsia-500 to-fuchsia-400\">\r\n                <div class=\"flex justify-between\">\r\n                    <div class=\"text-md font-semibold ltr:mr-1 rtl:ml-1\">Error Logs</div>\r\n                   \r\n                </div>\r\n                <div class=\"mt-5 flex items-center\">\r\n                    <div class=\"text-3xl font-bold ltr:mr-3 rtl:ml-3\">{{count}}</div>\r\n                    <div class=\"badge bg-white/30\">- 0.35%</div>\r\n                </div>\r\n                <div class=\"mt-5 flex items-center font-semibold\">\r\n                    <icon-eye class=\"shrink-0 ltr:mr-2 rtl:ml-2\" />\r\n                    Static Information\r\n                </div>\r\n            </div>`;
}
