import { html, css, LitElement } from "lit";

export class MandelbrotWidget extends LitElement {
  // The CSS
  static styles = css`
    :host {
      font-family: sans-serif;
    }

    .canvas-container {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      min-width: 250px;
      max-width: var(--canvas-width, 1000px);
      margin: 0 auto;
      width: 100%;
      border-radius: 1em;
      aspect-ratio: 3/2;
    }

    .canvas-container:fullscreen {
      background-color: hsl(0, 0%, 15%) !important;
    }

    .canvas-container:fullscreen canvas {
      width: calc((3 / 2) * 100vh);
    }

    canvas {
      width: 100%;
      background-color: rgba(0, 0, 0, 0.05);
    }

    canvas.panning {
      cursor: all-scroll;
    }

    .canvas-container .contextmenu {
      position: absolute;
      visibility: hidden;
      overflow-wrap: break-word;
      max-width: 150px;
    }

    .canvas-container .contextmenu.show {
      visibility: visible;
    }

    .contextmenu button {
      all: unset;
      background: rgba(155, 155, 155, 0.5);
      font-size: 0.85rem;
      color: white;
      padding: 0.5em 1em;
      border-radius: 0.5em;
      cursor: pointer;
    }

    .contextmenu button:hover {
      background: rgba(155, 155, 155, 0.8) !important;
    }

    .canvas-controls {
      color: rgba(255, 255, 255, 0.6);
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
      position: absolute;
      padding-block: 4px;
      padding-inline: 8px;
      font-size: 150%;
      bottom: 0;
      right: 0;
      border-radius: 6px;
    }
    .canvas-controls * {
      cursor: pointer;
    }

    .canvas-controls *:hover {
      color: rgba(255, 255, 255, 0.8);
    }

    .canvas-controls:hover {
      background: linear-gradient(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.1));
    }
  `;

  // The props and state
  static properties = {
    julia: { type: Boolean },
    random: { type: Boolean },
    width: { type: Number },
    iterations: { type: Number },
    palette: { type: String },
    REAL_RANGE: { state: true },
    IMAG_RANGE: { state: true },
    ZOOM_FACTOR: { state: true },
    TASKS: { state: true },
    zoomBackImages: { state: true },
    zoomImagesUrls: { state: true },
    mandel: { state: true },
    juliaPoint: { state: true },
    random: { state: true },
    isDown: { state: true },
    startX: { state: true },
    startY: { state: true },
    canvas: { state: true },
    ctx: { state: true },
    workers: { state: true },
    colors: { state: true },
  };

  /** Element creation */
  constructor() {
    super();

    // Props
    this.julia = true;
    this.random = true;
    this.iterations = 100;
    this.palette = "colorful";

    // State props
    this.REAL_RANGE = [-2, 1];
    this.IMAG_RANGE = [1, -1];
    this.ZOOM_FACTOR = 0.8;
    this.TASKS = [];
    this.zoomBackImages = [];
    this.zoomImagesUrls = [];
    this.mandel = true;
    this.juliaPoint = { re: 0, im: 0 };
    this.random = this.random == true;
    this.isDown = false;
    this.startX, this.startY, this.canvas, this.ctx, this.workers, this.colors;
  }

  /** Connected to the page  */
  connectedCallback() {
    super.connectedCallback();

    /* Generate a random color array */
    this.colors = this.colorPalette();

    /* Workers */
    let workerCount = navigator.hardwareConcurrency;
    this.workers = new Array(workerCount);
    for (let i = 0; i < workerCount; ++i) {
      var blobURL = URL.createObjectURL(
        new Blob(
          [
            "(",
            function () {
              // Global vars for worker state management
              let WIDTH,
                HEIGHT,
                REAL_RANGE,
                IMAG_RANGE,
                REAL_RANGE_LEN,
                IMAG_RANGE_LEN,
                MAX_ITERATION_COUNT;

              /* Message eventlistener */
              self.addEventListener("message", function (messageEvent) {
                // Setup
                const {
                  w,
                  h,
                  realSet,
                  imagSet,
                  isSettingUp,
                  mandel,
                  point,
                  iterationCount,
                } = messageEvent.data;
                MAX_ITERATION_COUNT = iterationCount;
                REAL_RANGE = [realSet[0], realSet[1]];
                IMAG_RANGE = [imagSet[0], imagSet[1]];
                REAL_RANGE_LEN = REAL_RANGE[1] - REAL_RANGE[0];
                IMAG_RANGE_LEN = IMAG_RANGE[1] - IMAG_RANGE[0];
                WIDTH = w;
                HEIGHT = h;
                // Here we calculate the mandelbrot
                if (!isSettingUp) {
                  // Get the column
                  const { col } = messageEvent.data;
                  // Here we store the calculated sets
                  const theSets = [];
                  // Loop over the rows and calculate the mandelbrot
                  for (let row = 0; row < HEIGHT; row++) {
                    theSets[row] = mandel
                      ? mandelbrot(complexNumber(col, row))
                      : julia(complexNumber(col, row), point);
                  }
                  // Report back the calculated result
                  //console.log("Worker " + self.name + "calculated " + col);
                  self.postMessage({ name: self.name, col, theSets });
                }
              });

              /**
               * Generate a complex number from the canvas coordinates
               * @param {number} x
               * @param {number} y
               * @returns Mathjs Complex number
               */
              function complexNumber(x, y) {
                x = REAL_RANGE[0] + (x / WIDTH) * REAL_RANGE_LEN;
                y = IMAG_RANGE[0] + (y / HEIGHT) * IMAG_RANGE_LEN;
                return { re: x, im: y };
              }

              /**
               * Check if the mandelbrot function diverges
               * @param {Object} c - Complex number
               */
              function mandelbrot(c) {
                // Define complex number z
                let z = { re: 0, im: 0 };
                let zSquared,
                  d,
                  n = 0;

                // Loop
                do {
                  // z^2
                  zSquared = {
                    re: Math.pow(z.re, 2) - Math.pow(z.im, 2),
                    im: 2 * z.re * z.im,
                  };
                  // z = z^2 + c
                  z = {
                    re: zSquared.re + c.re,
                    im: zSquared.im + c.im,
                  };
                  // Cabs of z
                  d = Math.sqrt(Math.pow(z.re, 2) + Math.pow(z.im, 2));
                  n += 1;
                } while (d <= 2 && n < MAX_ITERATION_COUNT);

                return { iterations: n, in: d <= 2 };
              }

              function julia(z, c) {
                // Define complex number c
                let zSquared,
                  d,
                  n = 0;

                // Loop
                do {
                  // z^2
                  zSquared = {
                    re: Math.pow(z.re, 2) - Math.pow(z.im, 2),
                    im: 2 * z.re * z.im,
                  };
                  // z = z^2 + c
                  z = {
                    re: zSquared.re + c.re,
                    im: zSquared.im + c.im,
                  };
                  // Cabs of z
                  d = Math.sqrt(Math.pow(z.re, 2) + Math.pow(z.im, 2));
                  n += 1;
                } while (d <= 2 && n < MAX_ITERATION_COUNT);

                return { iterations: n, in: d <= 2 };
              }
            }.toString(),

            ")()",
          ],
          { type: "application/javascript" }
        )
      );

      this.workers[i] = new Worker(blobURL, { name: i });
    }
    //console.log("WORKERS", this.workers);
  }

  /** The first update  */
  firstUpdated() {

    /* Setup the canvas for plotting */
    this.canvas = this.renderRoot.querySelector("#mandelbrot-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = this.canvas.offsetWidth / 1;
    this.canvas.height = this.canvas.width * (2 / 3);
    this.resizeableCanvas();

    /* Image */
    this.ctx.createImageData(1, this.canvas.height);

    /* Start everything */
    this.init(this.workers);

    /* SWITCH BETWEEN MANDEL AND JULIA */
    /*....................................*/

    const switchSetBtn = this.shadowRoot.querySelector(".contextmenu button");
    switchSetBtn.addEventListener("click", (e) => {
      this.mandel = !this.mandel;
      e.target.closest(".contextmenu").classList.remove("show");
      // Redraw the canvas
      this.startWorking(this.workers);
    });

    this.canvas.addEventListener("contextmenu", (e) => {
      // We do not want the default behaviour here
      e.preventDefault();
      e.stopPropagation();

      if (!this.julia || this.julia == false) return;

      // Set the start coords
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.juliaPoint.re = this.getRelativePoint(
        x,
        this.canvas.width,
        this.REAL_RANGE
      );
      this.juliaPoint.im = this.getRelativePoint(
        y,
        this.canvas.height,
        this.IMAG_RANGE
      );

      switchSetBtn.innerHTML = `Switch to ${
        this.mandel ? "Julia" : "Mandelbrot"
      } set ${
        this.mandel
          ? `at point z = ${this.getRelativePoint(
              x,
              this.canvas.width,
              this.REAL_RANGE
            ).toFixed(1)} ${
              this.getRelativePoint(y, this.canvas.height, this.IMAG_RANGE) < 0
                ? this.getRelativePoint(
                    y,
                    this.canvas.height,
                    this.IMAG_RANGE
                  ).toFixed(1)
                : "+ " +
                  this.getRelativePoint(
                    y,
                    this.canvas.height,
                    this.IMAG_RANGE
                  ).toFixed(1)
            }&nbsp;i`
          : ""
      }`;

      const menu = this.shadowRoot.querySelector(".contextmenu");
      menu.classList.add("show");
      menu.style.left = `${
        rect.right < e.clientX + menu.offsetWidth
          ? x - 15 - menu.offsetWidth
          : x + 15
      }px`;
      menu.style.top = `${
        rect.top + rect.height < e.clientY + menu.offsetHeight
          ? y - 15 - menu.offsetHeight
          : y + 15
      }px`;
    });

    /*....................................*/

    /* CONTROLS */
    /*....................................*/

    this.shadowRoot
      .querySelector(".canvas-controls")
      .addEventListener("click", (e) => {
        const rangeLenReal = Math.abs(this.REAL_RANGE[1] - this.REAL_RANGE[0]);
        const rangeLenImag = Math.abs(this.IMAG_RANGE[1] - this.IMAG_RANGE[0]);
        switch (e.target.className) {
          case "plus":
            zoomin: {
              // Zoom
              const zoom = this.ZOOM_FACTOR;

              // Get relative point coord bounds
              const boundsReal = [
                this.getRelativePoint(
                  this.canvas.width / 2 - (this.canvas.width * zoom) / 2,
                  this.canvas.width,
                  this.REAL_RANGE
                ),
                this.getRelativePoint(
                  this.canvas.width / 2 + (this.canvas.width * zoom) / 2,
                  this.canvas.width,
                  this.REAL_RANGE
                ),
              ];
              const boundsImag = [
                this.getRelativePoint(
                  this.canvas.height / 2 - (this.canvas.height * zoom) / 2,
                  this.canvas.height,
                  this.IMAG_RANGE
                ),
                this.getRelativePoint(
                  this.canvas.height / 2 + (this.canvas.height * zoom) / 2,
                  this.canvas.height,
                  this.IMAG_RANGE
                ),
              ];

              this.REAL_RANGE = boundsReal;
              this.IMAG_RANGE = boundsImag;

              this.zoomBackImages.push(
                this.ctx.getImageData(
                  0,
                  0,
                  this.canvas.width,
                  this.canvas.height
                )
              );

              // Save canvas as image and put it on
              const dataUrl = this.canvas.toDataURL("image/png");
              var img = new Image();
              img.addEventListener("load", () => {
                // Draw image with some magic fomula to zoom and
                // also be placed so that it makes sense with the zooming point position
                this.ctx.drawImage(
                  img,
                  -(this.canvas.width / zoom - this.canvas.width) / 2,
                  -(this.canvas.height / zoom - this.canvas.height) / 2,
                  this.canvas.width / zoom,
                  this.canvas.height / zoom
                );
                this.zoomImagesUrls.push(this.canvas.toDataURL("image/png"));
              });
              img.src = dataUrl;
            }

            break;
          case "center":
            this.REAL_RANGE = [-2, 1];
            this.IMAG_RANGE = [1, -1];
            break;
          case "minus":
            zoomout: {
              // Zoom
              const zoom = 1 / this.ZOOM_FACTOR;

              // Get relative point coord bounds
              const boundsReal = [
                this.getRelativePoint(
                  this.canvas.width / 2 - (this.width * zoom) / 2,
                  this.canvas.width,
                  this.REAL_RANGE
                ),
                this.getRelativePoint(
                  this.canvas.width / 2 + (this.width * zoom) / 2,
                  this.canvas.width,
                  this.REAL_RANGE
                ),
              ];
              const boundsImag = [
                this.getRelativePoint(
                  this.canvas.height / 2 - (this.canvas.height * zoom) / 2,
                  this.canvas.height,
                  this.IMAG_RANGE
                ),
                this.getRelativePoint(
                  this.canvas.height / 2 + (this.canvas.height * zoom) / 2,
                  this.canvas.height,
                  this.IMAG_RANGE
                ),
              ];

              this.REAL_RANGE = boundsReal;
              this.IMAG_RANGE = boundsImag;
            }

            break;
          case "larr":
            this.REAL_RANGE[0] -= 0.05 * rangeLenReal;
            this.REAL_RANGE[1] -= 0.05 * rangeLenReal;
            break;
          case "uarr":
            this.IMAG_RANGE[0] += 0.05 * rangeLenImag;
            this.IMAG_RANGE[1] += 0.05 * rangeLenImag;
            break;
          case "darr":
            this.IMAG_RANGE[0] -= 0.05 * rangeLenImag;
            this.IMAG_RANGE[1] -= 0.05 * rangeLenImag;
            break;
          case "rarr":
            this.REAL_RANGE[0] += 0.05 * rangeLenReal;
            this.REAL_RANGE[1] += 0.05 * rangeLenReal;
            break;
          case "download":
            let link = document.createElement("a");
            link.download = this.mandel ? "mandelbrot.png" : "julia.png";
            link.href = this.canvas.toDataURL();
            link.click();
            break;
          case "fullscreen":
            this.toggleFullScreen(e.target.closest(".canvas-container"));
            return;
          default:
            return;
        }
        this.startWorking(this.workers);
      });

    /*....................................*/

    /* PANNING */
    /*....................................*/

    /* Start panning */
    this.canvas.addEventListener("mousedown", (e) => {
      this.shadowRoot.querySelector(".contextmenu").classList.remove("show");
      // We do not want the standard behaviour here
      e.preventDefault();
      e.stopPropagation();
      // Set the start coords
      this.startX = e.screenX - this.canvas.offsetLeft;
      this.startY = e.screenY - this.canvas.offsetTop;
      // Mouse is down and canvas is now in panning mode
      this.isDown = true;
      if (e.ctrlKey) this.canvas.classList.add("panning");
    });

    /* Stop panning */
    this.canvas.addEventListener("mouseup", (e) => {
      // We do not want the standard behaviour here
      e.preventDefault();
      e.stopPropagation();
      // Mouse is up and canvas is not in panning mode
      this.isDown = false;
      this.canvas.classList.remove("panning");
    });

    /* Stop panning also when mouse out */
    this.canvas.addEventListener("mouseout", (e) => {
      // We do not want the standard behaviour here
      e.preventDefault();
      e.stopPropagation();
      // Mouse is out and canvas is not in panning mode
      this.isDown = false;
      this.canvas.classList.remove("panning");
    });

    /* Pan the mandelbrot */
    this.canvas.addEventListener("mousemove", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Guard
      if (!this.isDown || !e.ctrlKey) return;

      // Calculate the coords on the canvas and the deltas
      const distXLeft = e.screenX - this.canvas.offsetLeft;
      const distYTop = e.screenY - this.canvas.offsetTop;
      let dx = distXLeft - this.startX;
      let dy = distYTop - this.startY;

      // Change the global position vars
      this.startX = distXLeft;
      this.startY = distYTop;

      // Save canvas as image and put it on
      const dataUrl = this.canvas.toDataURL("image/png");
      var img = new Image();
      img.addEventListener("load", () => {
        this.ctx.drawImage(img, dx, dy);
      });
      img.src = dataUrl;

      // Get relative point coord bounds
      const boundsReal = [
        this.getRelativePoint(-dx, this.canvas.width, this.REAL_RANGE),
        this.getRelativePoint(
          this.canvas.width - dx,
          this.canvas.width,
          this.REAL_RANGE
        ),
      ];

      const boundsImag = [
        this.getRelativePoint(-dy, this.canvas.height, this.IMAG_RANGE),
        this.getRelativePoint(
          this.canvas.height - dy,
          this.canvas.height,
          this.IMAG_RANGE
        ),
      ];

      // New range after panning
      this.REAL_RANGE = boundsReal;
      this.IMAG_RANGE = boundsImag;

      // Lets work
      this.startWorking(this.workers);
    });

    /*....................................*/

    /* ZOOMING */
    /*....................................*/

    /* Zoom in on canvas */
    this.canvas.addEventListener("wheel", (e) => {
      this.shadowRoot.querySelector(".contextmenu").classList.remove("show");

      // We do not want the standard behaviour here
      e.preventDefault();
      e.stopPropagation();

      if (!e.ctrlKey) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Zoom
      const zoom = e.wheelDelta > 0 ? this.ZOOM_FACTOR : 1 / this.ZOOM_FACTOR;

      // Mouse coordinate distances
      const distXLeft = x * zoom;
      const distXRight = (this.canvas.width - x) * zoom;
      const distYTop = y * zoom;
      const distYBot = (this.canvas.height - y) * zoom;

      // Get relative point coord bounds
      const boundsReal = [
        this.getRelativePoint(
          x - distXLeft,
          this.canvas.width,
          this.REAL_RANGE
        ),
        this.getRelativePoint(
          x + distXRight,
          this.canvas.width,
          this.REAL_RANGE
        ),
      ];

      const boundsImag = [
        this.getRelativePoint(
          y - distYTop,
          this.canvas.height,
          this.IMAG_RANGE
        ),
        this.getRelativePoint(
          y + distYBot,
          this.canvas.height,
          this.IMAG_RANGE
        ),
      ];

      // Mouse coords plus minus zoom width on canvas
      this.REAL_RANGE = boundsReal;

      // Click coords plus minus zoom height on canvas
      this.IMAG_RANGE = boundsImag;

      // Zoom in
      if (e.wheelDelta > 0) {
        this.zoomBackImages.push(
          this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        );

        // Save canvas as image and put it on
        const dataUrl = this.canvas.toDataURL("image/png");
        var img = new Image();
        img.addEventListener("load", () => {
          // Draw image with some magic fomula to zoom and
          // also be placed so that it makes sense with the zooming point position
          this.ctx.drawImage(
            img,
            ((((distXLeft * 2) / this.canvas.width) * (1 / zoom)) / 2) *
              (this.canvas.width * (1 / zoom) - this.canvas.width) *
              -1,
            ((((distYTop * 2) / this.canvas.height) * (1 / zoom)) / 2) *
              (this.canvas.height * (1 / zoom) - this.canvas.height) *
              -1,
            this.canvas.width / zoom,
            this.canvas.height / zoom
          );
          this.zoomImagesUrls.push(this.canvas.toDataURL("image/png"));
        });
        img.src = dataUrl;
        // Zoom out
      } else {
        // Noting to do here so far; this could be tricky
      }
      this.startWorking(this.workers);
    });

    /*....................................*/
  }

  /** Render our component */
  render() {
    return html`
    <style>
    :host {
      --canvas-width: ${this.width}px;
    }
    </style>
    <div class="canvas-container">
      <canvas id="mandelbrot-canvas"></canvas>
      <div class="canvas-controls">
        <span class="plus" title="Zoom in">+</span>
        <span class="center" title="Center">&#9678;</span>
        <span class="minus" title="Zoom out">&minus;</span>
        <span class="larr" title="Move left">&larr;</span>
        <span class="uarr" title="Move up">&uarr;</span>
        <span class="darr" title="Move down">&darr;</span>
        <span class="rarr" title="Move right">&rarr;</span>
        <span class="download" title="Download image">&#10515;</span>
        <span class="fullscreen" title="Fullscreen">&#9974;</span>
      </div>
      <div class="contextmenu">
        <button>Switch z</button>
      </div>
    </div>
    `;
  }

  /**
   * Setup everything
   */
  init(workers) {
    /* Worker */
    workers[0].postMessage({
      w: this.canvas.width,
      h: this.canvas.height,
      realSet: this.REAL_RANGE,
      imagSet: this.IMAG_RANGE,
      isSettingUp: true,
      mandel: this.mandel,
      point: this.juliaPoint,
      iterationCount: this.iterations || 100,
    });

    workers.forEach((worker) => {
      // Invoke draw function on worker message event
      worker.addEventListener("message", (messageEvent) => {
        this.draw(messageEvent.data);
      });
    });
    this.startWorking(workers);
  }

  /**
   * Start working
   */
  startWorking(workers) {
    let width = this.canvas.width;
    // Go over the columns and add tasks for the workers to calculate
    for (let col = 0; col < width; col++) this.TASKS[col] = col;
    workers.forEach((worker, index) => {
      // Start with the first task
      worker.postMessage({
        w: this.canvas.width,
        h: this.canvas.height,
        realSet: this.REAL_RANGE,
        imagSet: this.IMAG_RANGE,
        isSettingUp: false,
        mandel: this.mandel,
        point: this.juliaPoint,
        iterationCount: this.iterations || 100,
        col: this.random
          ? this.TASKS.splice(
              Math.floor(Math.random() * this.TASKS.length),
              1
            )[0]
          : this.TASKS.shift(),
      });
    });
  }

  /**
   * Draw the mandelbrot to the canvas
   * @param {any} resp
   */
  draw(resp) {
    // Get the response
    const { name, col, theSets } = resp;

    // Image for the canvas
    const image = this.ctx.createImageData(1, this.canvas.height);

    // Keeping the worker busy whilke we have tasks
    if (this.TASKS.length > 0) {
      this.workers[name].postMessage({
        w: this.canvas.width,
        h: this.canvas.height,
        realSet: this.REAL_RANGE,
        imagSet: this.IMAG_RANGE,
        isSettingUp: false, // now we work
        mandel: this.mandel,
        point: this.juliaPoint,
        iterationCount: this.iterations || 100,
        col: this.random
          ? this.TASKS.splice(
              Math.floor(Math.random() * this.TASKS.length),
              1
            )[0]
          : this.TASKS.shift(),
      });
    } else {
      // Nothing to do here
    }

    /* Loop over the canvas and set the colors */
    for (let i = 0; i < this.canvas.height * 4; i++) {
      const mb = theSets[Math.floor(i / 4)];
      // Iterate through every pixel
      if (i % 4 == 0) {
        // Modify pixel data
        image.data[i + 0] =
          this.colors[mb.in ? 0 : mb.iterations % this.colors.length][0]; // R value
        image.data[i + 1] =
          this.colors[mb.in ? 0 : mb.iterations % this.colors.length][1]; // G value
        image.data[i + 2] =
          this.colors[mb.in ? 0 : mb.iterations % this.colors.length][2]; // B value
        image.data[i + 3] = 255; // A value
      }
    }
    this.ctx.putImageData(image, col, 0);
  }

  /** Attach a resize observer to make the canvas responsive */
  resizeableCanvas() {
    // We start with no tasks again
    this.TASKS = [];
    // The observer
    const observer = new ResizeObserver(
      // Throttle the observer
      throttle((entries) => {
        entries.forEach((entry) => {
          // Save canvas as image and put it on
          const dataUrl = this.canvas.toDataURL("image/png");
          var img = new Image();
          img.addEventListener("load", () => {
            this.ctx.drawImage(
              img,
              0,
              0,
              this.canvas.width,
              this.canvas.height
            );
          });
          img.src = dataUrl;

          // New width and height
          this.canvas.width = entry.target.offsetWidth / 1;
          this.canvas.height = this.canvas.width * (2 / 3);

          // Start working again
          this.startWorking(this.workers);
        });
      }, 250)
    );

    // Start observing
    observer.observe(this.canvas);

    /**
     * Throttle Wrapper for a function
     * @param {*} cb
     * @param {*} delay
     * @returns
     */
    function throttle(cb, delay) {
      let shouldWait = false;

      return (...args) => {
        if (shouldWait) return;

        cb(...args);
        shouldWait = true;
        setTimeout(() => {
          shouldWait = false;
        }, delay);
      };
    }
  }

  /**
   * Get the relative point coordinates on the canvas
   * @param {number} pixel
   * @param {number} length
   * @param {Array} range
   * @returns Point coordinate
   */
  getRelativePoint(pixel, length, range) {
    return range[0] + (pixel / length) * (range[1] - range[0]);
  }

  /**
   * Toggle fullscreen display
   * @param {*} element Element to display in fullscreen mode
   */
  toggleFullScreen(element) {
    if (!this.shadowRoot.fullscreenElement) {
      element.requestFullscreen();
    } else if (this.shadowRoot.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  /**
   * Generate a random color array
   * @returns Color array
   */
  colorPalette() {
    let palette, rgb1, rgb2, rgb3;
    const paletteAttr = this.palette;
    switch (paletteAttr) {
      case "grayscale":
        rgb1 = [211, 211, 211]; //lightgray
        rgb2 = [(rgb1[0] * 2) / 3, (rgb1[1] * 2) / 3, (rgb1[2] * 2) / 3];
        rgb3 = [rgb1[0] / 3, rgb1[1] / 3, rgb1[2] / 3];
        break;
      case "colorful":
        rgb1 = [165, 42, 42]; //brown
        rgb2 = [70, 130, 180]; //steelblue
        rgb3 = [152, 251, 152]; //palegreen
        break;
      case "blue":
        rgb1 = [30, 144, 255]; // dodgerblue
        rgb2 = [(rgb1[0] * 2) / 3, (rgb1[1] * 2) / 3, (rgb1[2] * 2) / 3];
        rgb3 = [rgb1[0] / 3, rgb1[1] / 3, rgb1[2] / 3];
        break;
      default:
        // Colorful default
        rgb1 = [165, 42, 42]; //brown
        rgb2 = [70, 130, 180]; //steelblue
        rgb3 = [152, 251, 152]; //palegreen
    }

    palette = [
      { r: rgb1[0], g: rgb1[1], b: rgb1[2] },
      { r: rgb2[0], g: rgb2[1], b: rgb2[2] },
      { r: rgb3[0], g: rgb3[1], b: rgb3[2] },
    ];

    /** Interpolate the colors */
    function interpolation(iteration) {
      let color1 = palette[Math.floor(iteration)];
      let color2 = palette[Math.floor(iteration) + 1];
      return linear_interpolate(color1, color2, iteration % 1);
    }

    /** Linear color interpolation */
    function linear_interpolate(color1, color2, ratio) {
      let r = Math.floor((color2.r - color1.r) * ratio + color1.r);
      let g = Math.floor((color2.g - color1.g) * ratio + color1.g);
      let b = Math.floor((color2.b - color1.b) * ratio + color1.b);
      return [r, g, b];
    }

    return new Array(16)
      .fill(0)
      .map((_, i) =>
        i === 0 ? [0, 0, 0] : interpolation((i / 16) * (palette.length - 1))
      );
  }
}
