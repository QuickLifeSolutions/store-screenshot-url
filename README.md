## What does Website Screenshot Generator do?

Website Screenshot Generator captures PNG images of web pages from a list of URLs. Use it to document landing pages, collect visual QA evidence, or archive a set of pages with a consistent viewport.

## What website screenshot data can you extract?

Each successful capture saves a PNG in the run's key-value store and adds a dataset row with these fields.

- `url` is the final page URL after redirects.
- `screenshotUrl` is the hosted URL of the PNG record. Access depends on the run's storage permissions. In local runs the field is null.
- `screenshotKey` identifies the PNG in the run's key-value store.

## How to use Website Screenshot Generator

1. Add URLs to the **List of URLs** field. For API calls, pass `urls` as URL strings or objects with a `url` field. The legacy single `url` input is also supported.
2. Set the viewport and choose full-page or viewport-only capture. Full-page capture is enabled by default.
3. Run the Actor. Open the dataset to inspect the metadata, then use the screenshot link or the key-value store to retrieve the PNG.

### Example input

```json
{
  "urls": [{"url": "https://example.com/"}],
  "waitUntil": "load",
  "viewportWidth": 1280,
  "viewportHeight": 720,
  "fullPage": false
}
```

### Example dataset row

```json
{
  "url": "https://example.com/",
  "screenshotUrl": "https://bytewells.com/api/v2/key-value-stores/STORE_ID/records/screenshot-EXAMPLE?disableRedirect=true",
  "screenshotKey": "screenshot-EXAMPLE"
}
```

### Capture options

- `viewportWidth` supports 100 to 3,840 pixels. `viewportHeight` supports 100 to 4,320 pixels. The default viewport is 1,280 × 1,080.
- `waitUntil` supports `load`, `domcontentloaded`, `networkidle2`, and `networkidle0`. Use `delay` for extra rendering time in milliseconds.
- `scrollToBottom` can help trigger lazy-loaded content. Set `delayAfterScrolling` or enable `waitUntilNetworkIdleAfterScroll` with a timeout.
- `selectorsToHide` accepts CSS selectors such as `#cookie-banner, .newsletter-popup`.

### Exports and limitations

Export the dataset as JSON or CSV for URL and screenshot metadata. Download PNG files separately from key-value storage. Bytewells serves the images as binary downloads. Use a `.png` extension when saving them. The Actor captures what its browser can reach and render. Login walls, blocking, and dynamic content can change the result. Repeated URLs may be deduplicated. A batch can return fewer rows when pages fail, so compare the dataset with the input and check the run log.
