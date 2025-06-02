import { Component, OnInit } from '@angular/core';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import * as monaco from 'monaco-editor';

@Component({
  selector: 'app-formly-vs-code',
  templateUrl: './formly-vs-code.component.html',
  styleUrls: ['./formly-vs-code.component.scss'],
})
export class FormlyVsCodeComponent extends FieldType<FieldTypeConfig> implements OnInit {
  editorOptions!: monaco.editor.IStandaloneEditorConstructionOptions;
  private editorInstance!: monaco.editor.IStandaloneCodeEditor;

  ngOnInit() {
    this.editorOptions = {
      theme: 'vs-dark',
      language: 'json',
      automaticLayout: true,
      formatOnType: true,
      formatOnPaste: true,
      insertSpaces: true,
      tabSize: 2,
    };

    // Listen for form control value changes
    this.formControl.valueChanges.subscribe((value) => {
      if (this.editorInstance) {
        const editorValue = this.editorInstance.getValue();
        const formattedValue = this.prettyJSON(value);

        // Only update the editor if the values are different
        if (editorValue !== formattedValue) {
          this.editorInstance.setValue(formattedValue);
        }
      }
    });
  }

  onEditorInit(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editorInstance = editor;

    // Set initial value
    const value = this.formControl?.value;
    const formatted = this.prettyJSON(value);
    this.editorInstance.setValue(formatted);

    // Update formControl only if editor content has changed
    this.editorInstance.onDidChangeModelContent(() => {
      const currentValue = this.editorInstance.getValue();
      if (this.formControl.value !== currentValue) {
        this.formControl.setValue(currentValue, { emitEvent: false }); // prevents valueChanges loop
      }
    });
  }

  prettyJSON(data: any): string {
    try {
      return typeof data === 'string' ? JSON.stringify(JSON.parse(data), null, 2) : JSON.stringify(data, null, 2);
    } catch (e) {
      return data;
    }
  }
}
