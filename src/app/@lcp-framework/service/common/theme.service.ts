import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';

type ThemeInfo = {
  themes?: {
    name?: string;
    status_id?: number | string;
    description?: string;
    reference_images?: string;
    theme_attributes?: Array<{ attribute?: string; value?: string }>;
  };
  theme_attributes?: Array<{ attribute?: string; value?: string }>;
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private cssVarMap: Record<string, string> = {
    'text color': '--app-text-color',
    text_color: '--app-text-color',
    'text-color': '--app-text-color',
    'background color': '--app-bg-color',
    background_color: '--app-bg-color',
    'background-color': '--app-bg-color',
    'bg color': '--app-bg-color',
    bg_color: '--app-bg-color',
    'bg-color': '--app-bg-color',
    'hover color': '--app-hover-color',
    hover_color: '--app-hover-color',
    'hover-color': '--app-hover-color',
    'primary color': '--app-primary-color',
    primary_color: '--app-primary-color',
    'primary-color': '--app-primary-color',
    'secondary color': '--app-secondary-color',
    secondary_color: '--app-secondary-color',
    'secondary-color': '--app-secondary-color',
  };

  constructor(private scopedStorage: LocalStorageService) {
    // Re-apply when storage changes
    window.addEventListener('storage', (event) => {
      if (!event.key) return;
      if (this.isThemeKey(event.key)) {
        this.applyThemeFromLocalStorage();
      }
    });
  }

  applyThemeFromLocalStorage(): void {
    const theme = this.readThemeFromStorage();
    // based on status 1 => apply, 2  do not apply
    const statusRaw: any = theme && (theme as any).themes && (theme as any).themes.status_id;
    const status = typeof statusRaw === 'string' ? parseInt(statusRaw, 10) : Number(statusRaw);
    if (!theme || isNaN(status) || status !== 1) {
      this.resetCssVariablesToDefaults();
      return;
    }

    const attributes = this.extractAttributes(theme);
    this.applyCssVariables(attributes);
  }

  private isThemeKey(key: string): boolean {
    if (key.includes('theme_info')) return true;
    return false;
  }

  private readThemeFromStorage(): ThemeInfo | null {
    try {
      const unscoped = localStorage.getItem('theme_info');
      if (unscoped) {
        return JSON.parse(unscoped);
      }
    } catch {}
    try {
      const legacy = localStorage.getItem('theme_infp');
      if (legacy) {
        return JSON.parse(legacy);
      }
    } catch {}
    try {
      const scoped = this.scopedStorage.getData('theme_info');
      if (scoped) {
        return JSON.parse(scoped as string);
      }
    } catch {}
    return null;
  }

  private extractAttributes(theme: ThemeInfo | null): Array<{ key: string; value: string }> {
    const list: Array<{ key: string; value: string }> = [];
    if (!theme) return list;

    const nested = theme.themes?.theme_attributes;
    const flat = theme.theme_attributes;
    const source = Array.isArray(nested) ? nested : Array.isArray(flat) ? flat : [];

    for (const item of source) {
      if (!item) continue;
      const key = (item.attribute || '').toString().trim();
      const value = (item.value || '').toString().trim();
      if (!key || !value) continue;
      list.push({ key, value });
    }
    return list;
  }

  private applyCssVariables(pairs: Array<{ key: string; value: string }>): void {
    const root = document.documentElement;
    const body = document.body;

    let textColor: string | null = null;
    let bgColor: string | null = null;
    let hoverColor: string | null = null;

    for (const { key, value } of pairs) {
      const normalized = key.toLowerCase();
      const varName = this.cssVarMap[normalized] || this.cssVarMap[normalized.replace(/\s+/g, ' ')];
      if (varName) {
        root.style.setProperty(varName, value);
      }

      if (!textColor && /text[_\s-]?color/i.test(key)) textColor = value;
      if (!bgColor && /(background|bg)[_\s-]?color/i.test(key)) bgColor = value;
      if (!hoverColor && /hover[_\s-]?color/i.test(key)) hoverColor = value;
    }

    // Apply base body styles for broad effect
    if (textColor) {
      body.style.color = textColor;
    }
    if (bgColor) {
      body.style.backgroundColor = bgColor;
    }

    if (hoverColor) {
      root.style.setProperty('--app-hover-color', hoverColor);
    }
  }

  private resetCssVariablesToDefaults(): void {
    const root = document.documentElement;
    const body = document.body;

    const uniqueVars = new Set(Object.values(this.cssVarMap));
    uniqueVars.forEach((varName) => root.style.removeProperty(varName));

    body.style.removeProperty('color');
    body.style.removeProperty('background-color');
  }
}
