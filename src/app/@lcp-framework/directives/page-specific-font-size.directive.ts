import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';
import { Store } from '@ngrx/store';

@Directive({
  selector: '[appDynamicFontSize]',
  standalone: true,
})
export class DynamicFontSizeDirective implements OnInit {
  @Input() appDynamicFontSize: 'body' | 'heading' | 'subtitle' | 'headerlogo' | 'title' = 'body';

  private fontSizeClasses = {
    body: {
      large: 'text-base',
      medium: 'text-sm',
      small: 'text-xs',
    },
    heading: {
      large: 'text-2xl',
      medium: 'text-xl',
      small: 'text-lg',
    },
    subtitle: {
      large: 'text-lg',
      medium: 'text-base',
      small: 'text-sm',
    },
    title: {
      large: 'text-xl',
      medium: 'text-lg',
      small: 'text-base',
    },

    headerlogo: {
      large: 'w-10',
      medium: 'w-8',
      small: 'w-7',
    },
  };

  constructor(private el: ElementRef, private renderer: Renderer2, private store: Store<any>) {}

  ngOnInit() {
    this.store
      .select((state) => state.index.fontsize)
      .subscribe((fontsize) => {
        this.updateFontSize(fontsize);
      });
  }

  private updateFontSize(fontsize: string) {
    const classSet: any = this.fontSizeClasses[this.appDynamicFontSize];
    const newClass = classSet[fontsize] || classSet.medium;

    // Remove all possible classes
    Object.values(this.fontSizeClasses).forEach((classSet) => {
      Object.values(classSet).forEach((className) => {
        this.renderer.removeClass(this.el.nativeElement, className);
      });
    });

    // Add the new class
    this.renderer.addClass(this.el.nativeElement, newClass);
  }
}
