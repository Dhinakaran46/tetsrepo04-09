import { Component } from '@angular/core';
import { Highlight } from 'ngx-highlightjs';
import { HighlightLineNumbers } from 'ngx-highlightjs/line-numbers';

@Component({
  selector: 'app-master-entity-module',
  standalone: true,
  imports: [Highlight, HighlightLineNumbers],
  templateUrl: './master-entity-module.component.html',
  styleUrl: './master-entity-module.component.scss',
})
export class MasterEntityModuleComponent {}
