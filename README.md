# \<mandelbrot-widget>

This webcomponent follows the [open-wc](https://github.com/open-wc/open-wc) recommendation.
This is a webcomponent that display an interactive widget of the mandelbrot set. The set can be zoomed and one can pan the canvas. You can also switch to the julia set at a given point on the canvas. This webcomponent can be customized using some attributes like the width, the color palette and the number of iterations for the mandelbrot plotting algorithm. The calculation is done using webworkers.

## Installation

```bash
npm i mandelbrot-widget
```

## Usage

```html
<script type="module">
  import 'mandelbrot-widget/mandelbrot-widget.js';
</script>

<mandelbrot-widget></mandelbrot-widget>
```

## Testing with Web Test Runner

To execute a single test run:

```bash
npm run test
```

To run the tests in interactive watch mode run:

```bash
npm run test:watch
```


## Tooling configs

For most of the tools, the configuration is in the `package.json` to minimize the amount of files in your project.

If you customize the configuration a lot, you can consider moving them to individual files.

## Local Demo with `web-dev-server`

```bash
npm start
```

To run a local development server that serves the basic demo located in `demo/index.html`
