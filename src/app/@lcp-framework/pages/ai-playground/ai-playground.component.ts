import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuMapService } from '../../service/common/menu-map.service';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-ai-playground',
  standalone: true,
  imports: [CommonModule, CommonSharedModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ai-playground.component.html',
  styleUrl: './ai-playground.component.scss',
})
export class AiPlaygroundComponent implements OnInit {
  form: FormGroup;

  constructor(
    private router: Router,
    private translate: TranslateService,
    private commonService: MenuMapService,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      prompt: [null, Validators.required],
    });
  }

  ngOnInit(): void {}

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      console.log(this.form.value);
    } else {
      this.toastr.error('Please enter a prompt', 'Error');
    }
  }
}
