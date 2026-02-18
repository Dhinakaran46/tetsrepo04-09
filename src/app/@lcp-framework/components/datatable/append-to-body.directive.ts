import { Directive, ElementRef, AfterViewInit, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appAppendToBody]',
  standalone: true,
})
export class AppendToBodyDirective implements AfterViewInit, OnDestroy {
  private dropdownPanel: HTMLElement | null = null;
  private observer: MutationObserver | null = null;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngAfterViewInit() {
    // Listen for dropdown open events
    this.observer = new MutationObserver(() => {
      this.moveDropdownToBody();
    });
    this.observer.observe(this.el.nativeElement, { childList: true, subtree: true });
    // Initial move if already open
    setTimeout(() => this.moveDropdownToBody(), 0);
  }

  private moveDropdownToBody() {
    // Find the dropdown panel
    const panel = this.el.nativeElement.querySelector('.dropdown-list');
    if (panel && panel.parentNode !== document.body) {
      const rect = this.el.nativeElement.getBoundingClientRect();
      this.renderer.appendChild(document.body, panel);
      this.renderer.setStyle(panel, 'position', 'absolute');
      this.renderer.setStyle(panel, 'left', `${rect.left}px`);
      this.renderer.setStyle(panel, 'top', `${rect.bottom}px`);
      this.renderer.setStyle(panel, 'z-index', '3000');
      this.dropdownPanel = panel;
    }
    // Hide panel if dropdown is closed
    if (!this.el.nativeElement.classList.contains('show-dropdown')) {
      if (this.dropdownPanel) {
        this.renderer.setStyle(this.dropdownPanel, 'display', 'none');
      }
    } else {
      if (this.dropdownPanel) {
        this.renderer.setStyle(this.dropdownPanel, 'display', 'block');
      }
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.dropdownPanel && this.dropdownPanel.parentNode === document.body) {
      document.body.removeChild(this.dropdownPanel);
    }
  }
}
