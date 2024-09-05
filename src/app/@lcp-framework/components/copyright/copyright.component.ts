import { Component } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonSharedModule } from '../../shared/common/common.module';

@Component({
  selector: 'app-copyright',
  standalone: true,
  imports: [CommonSharedModule],
  templateUrl: './copyright.component.html',
  styleUrl: './copyright.component.scss'
})
export class CopyrightComponent {

  currYear: number = new Date().getFullYear();

  constructor(
    public translate: TranslateService
  ) {
  }
}
