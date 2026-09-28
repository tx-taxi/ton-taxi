import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { nativeMempoolFeeColors, defaultMempoolFeeColors, contrastMempoolFeeColors, lightMempoolFeeColors } from '@app/app.constants';
import { StorageService } from '@app/services/storage.service';
import { StateService } from '@app/services/state.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  style: HTMLLinkElement | null = null;
  theme: string = 'default';
  themeState$: BehaviorSubject<{ theme: string; loading: boolean; }>;
  mempoolFeeColors: string[] = nativeMempoolFeeColors;
  initialLoad: boolean = true;
  private themeLoadVersion = 0;

  constructor(
    private storageService: StorageService,
    private stateService: StateService,
  ) {
    let theme = this.stateService.env.customize?.theme || this.storageService.getValue('theme-preference') || 'default';
    // theme preference must be a valid known public theme
    if (!this.stateService.env.customize?.theme && !['default', 'original'].includes(theme)) {
      theme = 'default';
      this.storageService.setValue('theme-preference', 'default');
    }
    this.clearAprilTheme();
    this.themeState$ = new BehaviorSubject({ theme, loading: false });
    this.apply(theme);
  }

  setTheme(theme: string): void {
    this.clearAprilTheme();
    this.apply(theme);
  }

  clearAprilTheme(): void {
    this.storageService.removeItem('april-theme');
    this.storageService.removeItem('april-theme-backup');
  }

  private apply(theme: string): void {
    const themeAlreadyApplied = theme === 'default' ? !this.style?.isConnected : this.style?.isConnected;
    if (this.theme === theme && themeAlreadyApplied) {
      return;
    }

    const loadVersion = ++this.themeLoadVersion;
    this.theme = theme;
    if (theme === 'default') {
      this.removeThemeStylesheet();
      if (!this.stateService.env.customize?.theme) {
        this.storageService.setValue('theme-preference', theme);
      }
      this.mempoolFeeColors = nativeMempoolFeeColors;
      this.themeState$.next({ theme, loading: false });
      return;
    }

    // Load theme stylesheet
    this.themeState$.next({ theme, loading: true });
    try {
      if (!this.style) {
        this.style = document.createElement('link');
        this.style.rel = 'stylesheet';
        if (this.initialLoad) {
          this.style.media = 'print'; // Prevent white flash and other CSS issues when using custom theme on initial app load in Safari
        }
        document.head.appendChild(this.style); // load the css now
      }
      const style = this.style;

      style.onload = () => {
        if (!this.isCurrentThemeLoad(theme, loadVersion, style)) {
          return;
        }
        if (this.initialLoad) {
          style.media = 'all';
          this.initialLoad = false;
        }
        this.mempoolFeeColors = this.getMempoolFeeColors(theme);
        this.themeState$.next({ theme, loading: false });
      };
      style.onerror = () => {
        if (this.isCurrentThemeLoad(theme, loadVersion, style)) {
          this.apply('default');
        }
      };
      style.href = this.getThemeFile(theme);

      if (!this.stateService.env.customize?.theme) {
        this.storageService.setValue('theme-preference', theme);
      }
    } catch (err) {
      console.log('failed to apply theme stylesheet: ', err);
      this.apply('default');
    }
  }

  private removeThemeStylesheet(): void {
    if (!this.style) {
      return;
    }

    // A cancelled request can emit after a user makes a new selection.
    // Disconnect handlers before removing the element, then guard callbacks too.
    this.style.onload = null;
    this.style.onerror = null;
    this.style.remove();
    this.style = null;
  }

  private isCurrentThemeLoad(theme: string, loadVersion: number, style: HTMLLinkElement): boolean {
    return this.theme === theme && this.themeLoadVersion === loadVersion && this.style === style;
  }

  private getThemeFile(theme: string): string {
    if (theme === 'original') {
      return '/resources/mempool-original.css?v=ton-shell-20260925-palette';
    }
    const themeFiles = (window as any).__env?.THEME_FILES;
    if (themeFiles?.[theme]) {
      return themeFiles[theme];
    }
    return `${theme}.css`;
  }

  private getMempoolFeeColors(theme: string): string[] {
    switch (theme) {
      case 'contrast':
      case 'bukele':
        return contrastMempoolFeeColors;
      case 'nymkappa':
        return lightMempoolFeeColors;
      default:
        return defaultMempoolFeeColors;
    }
  }

  private isAprilFirst(): boolean {
    const now = new Date();
    return now.getMonth() === 3 && now.getDate() === 1;
  }
}
