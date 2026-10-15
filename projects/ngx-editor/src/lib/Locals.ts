import { isDevMode } from '@angular/core';
import { Observable, isObservable, of } from 'rxjs';
import { en } from 'ngx-editor-rtl-ltr-edition/locales';

// the English strings live in the `en` locale, so that there is one source for them
export const defaults: Record<string, string | Observable<string>> = { ...en.locals };

export type LocalsKeys = keyof typeof defaults;

// keys already reported, so that change detection does not repeat the warning
const reportedKeys = new Set<string>();

class Locals {
  locals = defaults;

  constructor(newLocals: Partial<Record<LocalsKeys, string | Observable<string>>> = {}) {
    this.locals = { ...defaults, ...newLocals };
  }

  get = (key: string): Observable<string> => {
    const value = this.locals[key];
    if (value) {
      return isObservable(value) ? value : of(value);
    }

    // a key without an English string shows an empty title and label in every language;
    // no key at all (a menu item before its name input is set) is not reported
    if (isDevMode() && typeof key === 'string' && key && !(key in this.locals) && !reportedKeys.has(key)) {
      reportedKeys.add(key);
      // eslint-disable-next-line no-console
      console.warn(`ngx-editor: no string for the locale key "${key}"`);
    }

    return of('');
  };
}

export default Locals;
