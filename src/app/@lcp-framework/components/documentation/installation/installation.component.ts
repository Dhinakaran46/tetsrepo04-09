import { Component } from '@angular/core';
import { slideDownUp } from '../../../shared/animations';
import { IconCaretDownComponent } from '../../../shared/icon/icon-caret-down';
import { IconFolderComponent } from '../../../shared/icon/icon-folder';
import { IconTxtFileComponent } from '../../../shared/icon/icon-txt-file';
import { Highlight } from 'ngx-highlightjs';
import { HighlightLineNumbers } from 'ngx-highlightjs/line-numbers';

@Component({
  selector: 'app-installation',
  standalone: true,
  imports: [IconCaretDownComponent, IconFolderComponent, IconTxtFileComponent, Highlight, HighlightLineNumbers],
  templateUrl: './installation.component.html',
  styleUrl: './installation.component.scss',
  animations: [slideDownUp],
})
export class InstallationComponent {
  codeArr: any = [];
  toggleCode = (name: string) => {
    if (this.codeArr.includes(name)) {
      this.codeArr = this.codeArr.filter((d: string) => d != name);
    } else {
      this.codeArr.push(name);
    }
  };
  constructor() {}

  ngOnInit() {
    let ele = document.querySelectorAll('.treeview1 button.active') || [];
    if (ele.length > 0) {
      ele.forEach((d: any) => {
        d.click();
      });
    }
  }

  treeview1: any = ['images', 'html'];
  treeview2: any = ['parent-node'];

  toggleTreeview1(name: string) {
    if (this.treeview1.includes(name)) {
      this.treeview1 = this.treeview1.filter((d: string) => d !== name);
    } else {
      this.treeview1.push(name);
    }
  }

  toggleTreeview2(name: string) {
    if (this.treeview2.includes(name)) {
      this.treeview2 = this.treeview2.filter((d: string) => d !== name);
    } else {
      this.treeview2.push(name);
    }
  }
}
