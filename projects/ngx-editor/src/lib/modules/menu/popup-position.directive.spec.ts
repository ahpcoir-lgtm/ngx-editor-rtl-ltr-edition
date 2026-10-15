import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PopupPositionDirective } from './popup-position.directive';

@Component({
  imports: [PopupPositionDirective],
  template: `
    <div dir="rtl">
      <button type="button">
        <div class="popup" style="position: absolute; right: 0; width: max-content" ngxPopupPosition>menu</div>
      </button>
    </div>
  `,
})
class HostComponent {}

describe('PopupPositionDirective', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('dir', 'rtl');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('dir');
  });

  // in RTL an `inset-inline-start` is `right`; together with `left` and a fixed width the browser drops `left`
  it('should clear `right` when it positions the popup, so that `left` is used in RTL', async () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZonelessChangeDetection()],
    });

    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();

    const popup = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.popup');
    if (!popup) {
      throw new Error('no popup');
    }

    await vi.waitFor(() => {
      expect(popup.style.position).toBe('fixed');
    });

    expect(popup.style.left).toMatch(/px$/);
    expect(popup.style.right).toBe('auto');
    expect(getComputedStyle(popup).right).toBe('auto');

    fixture.destroy();
  });
});
