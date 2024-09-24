import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { InstallationComponent } from '../../components/documentation/installation/installation.component';
import { GettingStartedComponent } from '../../components/documentation/getting-started/getting-started.component';
import { MasterEntityModuleComponent } from '../../components/documentation/master-entity-module/master-entity-module.component';

import { PageBuilderComponent } from '../../components/documentation/page-builder/page-builder.component';
import { DashboardWizardComponent } from '../../components/documentation/dashboard-wizard/dashboard-wizard.component';
import { RouterModule } from '@angular/router';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    InstallationComponent,
    GettingStartedComponent,
    MasterEntityModuleComponent,
    PageBuilderComponent,
    DashboardWizardComponent,
  ],
  templateUrl: './documentation.component.html',
  styleUrl: './documentation.component.scss',
})
export class DocumentationComponent {
  currentSection: string = 'getting-started';
  config: any;
  user_info: any;
  apiUrl = environment.apiUrl;

  constructor(private localstore: LocalStorageService) {}

  ngOnInit() {
    this.user_info = JSON.parse(this.localstore.getData('user_data'));
    this.config = JSON.parse(this.localstore.getData('config'));
  }
}
