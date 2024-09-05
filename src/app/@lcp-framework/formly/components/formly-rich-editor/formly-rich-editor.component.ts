import { Component, ElementRef, ViewChild } from '@angular/core';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'app-formly-rich-editor',
  templateUrl: './formly-rich-editor.component.html',
  styleUrl: './formly-rich-editor.component.scss',
})
export class FormlyRichEditorComponent extends FieldType<FieldTypeConfig> {
  @ViewChild('quillEditor', { static: false }) quillEditor!: ElementRef;
  @ViewChild('htmlEditor', { static: false }) htmlEditor!: ElementRef;

  isHtmlMode = false;
  // htmlContent = this.formControl.value;
  editorOptions = {
    theme: 'vs-dark',
    language: 'html',
    automaticLayout: true,
    minimap: { enabled: false }, // Disable the minimap
    scrollbar: {
      vertical: 'hidden', // Hide vertical scrollbar
      horizontal: 'auto', // Hide horizontal scrollbar
    },
    overviewRulerLanes: 0, // Disable the overview ruler on the right side
    lineNumbers: 'on', // Show line numbers
    wordWrap: 'on', // Enable word wrap
    wordWrapColumn: 80, // Optional: Set a specific column width for wrapping
  };
  modules = {
    toolbar: [
      ['bold', 'italic', 'underline'], // toggled buttons
      ['blockquote', 'code-block'],

      [{ header: 1 }, { header: 2 }], // custom button values
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ script: 'sub' }, { script: 'super' }], // superscript/subscript
      [{ indent: '-1' }, { indent: '+1' }], // outdent/indent
      [{ direction: 'rtl' }], // text direction

      [{ size: ['small', false, 'large', 'huge'] }], // custom dropdown
      [{ header: [1, 2, 3, 4, 5, 6, false] }],

      [{ color: [] }, { background: [] }], // dropdown with defaults from theme
      [{ font: [] }],
      [{ align: [] }],

      ['clean'], // remove formatting button

      ['link'], // link and image, video
    ],
  };

  toggleHtmlEdit() {
    this.isHtmlMode = !this.isHtmlMode;
  }
}
