/* Case study content manifests.

   "document" is a single tall Figma export sliced into strips. It has to be
   sliced: the full export is 2030x32768, and iOS Safari refuses to decode
   images much past ~17 megapixels, so one image would simply fail to appear
   on a phone. Strips also let the browser lazy-load and decode only what is
   near the viewport.

   "frames" is the alternative shape - a list of discrete images, each its own
   figure with an optional caption. */
window.CASE_FRAMES = {
  "presentations-ai": {
    type: "document",
    dir: "case/presentations-ai/",
    prefix: "slice-",
    ext: "webp",
    count: 16,
    width: 2030,
    sliceHeight: 2048,
    alt: "Presentations.ai case study"
  }
};
