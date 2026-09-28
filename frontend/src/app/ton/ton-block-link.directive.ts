import { Directive, ElementRef, HostBinding, HostListener, Input } from '@angular/core';
import { Router } from '@angular/router';
import { tonBlockUrl } from './chain-selection';
import { navigateTonBlock } from './block-navigation';

@Directive({ selector: '[tonBlockLink]', standalone: true })
export class TonBlockLinkDirective {
  @Input() tonBlockLink: unknown;
  @Input() tonBlockState: unknown;
  @HostBinding('attr.href') get href(): string | null { return tonBlockUrl(this.tonBlockLink, undefined, typeof window === 'undefined' ? '' : window.location.pathname); }

  constructor(private router: Router, private element: ElementRef) {}

  @HostListener('click', ['$event']) onClick(event: MouseEvent): void {
    if (!this.href || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      || this.element.nativeElement.target === '_blank' || this.element.nativeElement.hasAttribute('download')) return;
    event.preventDefault();
    navigateTonBlock(this.router, this.tonBlockLink, this.tonBlockState);
  }
}
