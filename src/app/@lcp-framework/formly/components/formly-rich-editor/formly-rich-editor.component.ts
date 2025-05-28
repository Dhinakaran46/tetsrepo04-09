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
  preview = false;
  // htmlContent = this.formControl.value;
  editorOptions = {
    language: 'json', // Enable JSON syntax highlighting
    theme: 'vs-dark', // or 'vs', 'hc-black'
    automaticLayout: true, // Auto-resize with container
    minimap: { enabled: false }, // Disable minimap for simplicity
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on', // or 'off'
    folding: true, // Enable code folding
    lineDecorationsWidth: 10,
    overviewRulerBorder: false,
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    // JSON-specific features
    formatOnPaste: true,
    formatOnType: true,
    suggest: {
      showWords: false, // Disable word suggestions (focus on JSON keys)
    },
    // Validation & Hover
    hover: { enabled: true },
    validate: true, // Enable JSON validation
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

  showPreview() {
    this.preview = true;
  }

  hidePreview() {
    this.preview = false;
  }
}
