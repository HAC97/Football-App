import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no <dialog> behavior: mimic open/close and the `close` event the app relies on.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

// jsdom has no layout, and DayStrip scrolls its strip.
if (typeof Element !== 'undefined') Element.prototype.scrollTo = () => {};

afterEach(() => cleanup());
