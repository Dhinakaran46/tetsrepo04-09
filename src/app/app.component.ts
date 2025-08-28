import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { ThemeService } from './@lcp-framework/service/common/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'LCP';

  constructor(private router: Router, private themeService: ThemeService) {
    window.addEventListener('storage', (event) => {
      if (event.key === 'logout') {
        // Optionally clear tokens or user data here if needed
        this.router.navigate(['/login']);
      }
      if (event.key === 'login') {
        this.router.navigate(['/dashboard']);
      }
    });

    this.themeService.applyThemeFromLocalStorage();
  }
}
