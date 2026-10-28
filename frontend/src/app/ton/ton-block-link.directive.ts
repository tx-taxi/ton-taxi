import { Directive, ElementRef, HostBinding, HostListener, Input, Inject, InjectionToken } from '@angular/core';
import { Router } from '@angular/router';
import { tonBlockUrl } from './chain-selection';
import { navigateTonBlock } from './block-navigation';

export const TON_HUB_MODE = new InjectionToken<boolean>('TON_HUB_MODE', { providedIn: 'root', factory: () => false });

@Directive({ selector: '[tonBlockLink]', standalone: true })
export class TonBlockLinkDirective {
  @Input() tonBlockLink: unknown;
  @Input() tonBlockState: unknown;
  @HostBinding('attr.href') get href(): string | null { return tonBlockUrl(this.tonBlockLink, undefined, this.hubMode || typeof window === 'undefined' ? '' : window.location.pathname); }

  constructor(private router: Router, private element: ElementRef, @Inject(TON_HUB_MODE) private hubMode: boolean) {}

  @HostListener('click', ['$event']) onClick(event: MouseEvent): void {
    if (!this.href || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      || this.element.nativeElement.target === '_blank' || this.element.nativeElement.hasAttribute('download')) return;
    event.preventDefault();
    navigateTonBlock(this.router, this.tonBlockLink, this.tonBlockState, this.hubMode);
  }
}
