# \<mandelbrot-widget>

[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/mandelbrot-widget)

This is a webcomponent that displays an interactive widget of the mandelbrot set. The set can be zoomed and one can pan the canvas. You can also switch to the julia set at a given point on the canvas. This webcomponent can be customized using some attributes like the width, the color palette and the number of iterations for the mandelbrot plotting algorithm. The calculation is done using webworkers.

![image](./assets/mandelbrot1.png)

This webcomponent follows the [open-wc](https://github.com/open-wc/open-wc) recommendation.

## Installation

```bash
npm i mandelbrot-widget
```

## Usage

```html
<script type="module">
  import "mandelbrot-widget/mandelbrot-widget.js";
</script>

<mandelbrot-widget></mandelbrot-widget>
```

You can supply a number of attributes to this webcomponent to control the layout and features:

- `width` The max width of the component (defaults to `1000px`)
- `julia` Flag for the additional display of the julia set when clicking on the canvas (defaults to `true`)
- `palette` Color palette to display the set (options are `grayscale`, `blue` and `colorful`)
- `iterations` Number of iterations that the plotting algorithm uses to determine if it converges or diverges (defaults to `100`)
- `random` CControl the order of plotting (The set is plotted columnwise; if you provide `false` this will be sequentially from left to right, otherwise the columns will be drwan on the canvas in random order)

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
