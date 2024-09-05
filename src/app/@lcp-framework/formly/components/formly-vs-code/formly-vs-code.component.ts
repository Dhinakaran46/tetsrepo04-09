import { Component, OnInit } from '@angular/core';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'app-formly-vs-code',
  templateUrl: './formly-vs-code.component.html',
  styleUrl: './formly-vs-code.component.scss',
})
export class FormlyVsCodeComponent extends FieldType<FieldTypeConfig> implements OnInit {
  editorOptions: any;

  ngOnInit() {
    this.editorOptions = {
      theme: this.props['theme'] || 'vs-dark',
      language: this.to['language'] || 'html',
      automaticLayout: true,
      minimap: { enabled: false }, // Disable the minimap
      scrollbar: {
        vertical: 'hidden', // Hide vertical scrollbar
        horizontal: 'auto', // Hide horizontal scrollbar
      },
      overviewRulerLanes: 0, // Disable the overview ruler on the right side
      lineNumbers: this.props['lineNumbers'] || 'on', // Show line numbers
      wordWrap: this.props['wordWrap'] || 'on', // Enable word wrap
      wordWrapColumn: 80, // Optional: Set a specific column width for wrapping
    };
  }
}
