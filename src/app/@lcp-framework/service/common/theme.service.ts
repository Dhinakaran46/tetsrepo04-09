import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';

interface ThemeData {
  id: number;
  uuid: string;
  name: string;
  description: string;
  status_id: number;
  theme_line_items: {
    accent_color: string;
    accent_secondary_color: string;
    accent_secondary_tone_color: string;
    accent_tone_color: string;
    sidebar_bg_color: string;
    sidebar_heading_color: string;
    sidebar_text_color: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private cssVarMap: Record<string, string | string[]> = {
    accent_color: ['--app-button-bg-color', '--app-sidebar-hover-color', '--app-form-base-component-color'],
    accent_tone_color: ['--app-header-bg-color', '--app-button-hover-color', '--app-header-color'],
    accent_secondary_color: ['--app-table-header-color', '--app-pagination-button-bg-color'],
    accent_secondary_tone_color: ['--app-table-header-action-color'],
    sidebar_bg_color: ['--app-sidebar-bg-color'],
    sidebar_heading_color: ['--app-sidebar-heading-color'],
    sidebar_text_color: ['--app-sidebar-text-color', '--app-header-text-color', '--app-button-text-color'],
  };

  constructor(private scopedStorage: LocalStorageService) {
    window.addEventListener('storage', (event) => {
      if (event.key === 'theme_info') {
        this.applyThemeFromLocalStorage();
      }
    });
  }

  applyThemeFromLocalStorage(): void {
    const theme = this.readThemeFromStorage();

    if (!theme?.theme_line_items) {
      // console.warn('No valid theme found in storage, resetting to defaults');
      this.resetCssVariablesToDefaults();
      return;
    }

    const attributes = this.extractAttributes(theme.theme_line_items);
    this.applyCssVariables(attributes);
  }

  private applyCssVariables(pairs: Array<{ key: string; value: string }>): void {
    const root = document.documentElement;
    const body = document.body;

    for (const { key, value } of pairs) {
      const normalized = key.toLowerCase();
      const varNames = this.cssVarMap[normalized];

      if (varNames) {
        const vars = Array.isArray(varNames) ? varNames : [varNames];
        for (const varName of vars) {
          root.style.setProperty(varName, value);
        }
      }

      if (normalized === 'text_color') {
        body.style.color = value;
      }
      if (normalized === 'background_color' || normalized === 'bg_color' || normalized === 'sidebar_background_color') {
        body.style.backgroundColor = value;
      }
    }
  }

  private resetCssVariablesToDefaults(): void {
    const root = document.documentElement;
    const body = document.body;

    const allVars = Object.values(this.cssVarMap).flatMap((v) => (Array.isArray(v) ? v : [v]));

    const uniqueVars = new Set(allVars);
    uniqueVars.forEach((varName) => root.style.removeProperty(varName));

    body.style.removeProperty('color');
    body.style.removeProperty('background-color');
  }

  private readThemeFromStorage(): ThemeData | null {
    const key = 'theme_info';

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.theme_line_items ? parsed : null;
      }
    } catch (e) {
      console.warn(`Failed to parse ${key}:`, e);
    }

    try {
      const scoped = this.scopedStorage.getData(key);
      if (scoped && scoped !== 'null') {
        return JSON.parse(scoped as string);
      }
    } catch (e) {
      console.warn(`Failed to parse scoped ${key}:`, e);
    }
    return null;
  }

  private extractAttributes(themeItems: Record<string, string>): Array<{ key: string; value: string }> {
    return Object.entries(themeItems)
      .filter(([_, value]) => typeof value === 'string')
      .map(([key, value]) => ({ key, value }));
  }
}
