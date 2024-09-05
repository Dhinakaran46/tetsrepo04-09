import { Component } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { Location } from '@angular/common';

@Component({
  selector: 'app-job-page',
  standalone: true,
  imports: [CommonSharedModule],
  templateUrl: './job-page.component.html',
  styleUrl: './job-page.component.scss',
})
export class JobPageComponent {
  constructor(public location: Location) {}

  ngOnInit() {}
}
