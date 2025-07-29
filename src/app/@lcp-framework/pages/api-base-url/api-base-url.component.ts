import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-api-base-url',
  standalone: true,
  templateUrl: './api-base-url.component.html',
  styleUrl: './api-base-url.component.scss',
  imports: [CommonModule, FormsModule],
})
export class ApiBaseUrlComponent {
  apiUrl = '';
  testing = false;
  testPassed = false;
  message = '';
  error = '';

  constructor(private http: HttpClient, private router: Router) {}

  testApiUrl() {
    this.testing = true;
    this.message = '';
    this.error = '';
    this.testPassed = false;

    this.http.post(`${this.apiUrl}/api/common/language-content`, {
      company_id: 1,
      language_id: 1,
    }).subscribe({
      next: () => {
        this.message = 'API URL is valid!';
        this.testPassed = true;
      },
      error: () => {
        this.error = 'API test failed. Please check your URL.';
        this.testPassed = false;
        this.testing = false;
      },
      complete: () => {
        this.testing = false;
      }
    });
  }

  saveApiUrl() {
    if (!this.testPassed) return;

    localStorage.setItem('lcp_api_base_url', this.apiUrl);
    this.router.navigate(['/login']).then(() => {
      window.location.reload();
    });
  }
}
