import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';

import '../mandelbrot-widget.js';

describe('MandelbrotWidget', () => {
  it('default color palette is "colorful"', async () => {
    const el = await fixture(html`<mandelbrot-widget></mandelbrot-widget>`);

    expect(el.palette).to.equal("colorful");
    
  });

  it('can override the palette via attribute', async () => {
    const el = await fixture(html`<mandelbrot-widget palette="blue"></mandelbrot-widget>`);

    expect(el.palette).to.equal('blue');
  });

  it('passes the a11y audit', async () => {
    const el = await fixture(html`<mandelbrot-widget></mandelbrot-widget>`);

    await expect(el).shadowDom.to.be.accessible();
  });
});
