# starchart13 proof dashboard builder

A browser tool that matches each planet on a 13-sign chart wheel to a real
sky photo taken at the same moment, then exports the result as a PNG or shares
it as an interactive page.

Open `index.html` in any modern browser. There is no build step and nothing to install.

## Quick start

1. Click **Try a sample chart first** in the sidebar. It loads a practice wheel
   and four sky photos so you can see every step.
2. Work through the numbered steps in the sidebar, top to bottom. The banner above
   the wheel always tells you what to do next.

| Step | What you do |
| --- | --- |
| 1. Upload your chart wheel | Name the chart and choose the wheel image. |
| 2. Enter the planet list | Type or paste one planet per line, or upload a screenshot of the list to read it automatically. |
| 3. Add a sky photo for each planet | Upload the planet's sky screenshot, press **Draw box on wheel**, then drag a box around the planet's symbol on the wheel. |
| 4. Point the arrows and lock them | Open a planet, drag the arrow onto the planet on the wheel and then on the sky photo, and press **Lock**. |
| 5. Export or share (optional) | Export a PNG, preview the narrated walkthrough, save the chart to this browser, or open the interactive view. |
| Advanced: AI voice (optional) | Add an ElevenLabs key to replace the device voice with a more natural one. |

## Your data

- Wheel, screenshots, and the planet list stay in your browser. They are never uploaded anywhere.
- **Save to library** stores charts in this browser's local storage only. Clearing site data removes them.
- The **planet-list OCR** runs in your browser using tesseract.js, loaded from jsDelivr.
- If you add an **ElevenLabs** key, the narration text is sent to ElevenLabs to generate the voice.
  The key is saved only in this browser. Use **Forget saved key** to remove it.
- The page loads fonts from Google Fonts.

## Project layout

```
index.html          Page structure (the sidebar steps and the main stage)
css/styles.css      All styling
js/ui.js            Toast messages and the step tracker
js/core.js          Shared state, planet-list OCR
js/chart-library.js Saving, loading, and the interactive viewer
js/wheel-regions.js Wheel upload, drawing boxes, drag-to-pin arrows
js/gallery.js       Planet gallery, comparison view, thumbnails
js/export.js        PNG export
js/narration.js     Walkthrough timeline, narration text, and drawing
js/preview.js       Live preview, device voices, ElevenLabs controls
js/sample.js        Generates the practice chart
```

Scripts load in the order listed in `index.html`. Each file shares global state
with the others, so keep that order.

## Troubleshooting

- **OCR reads the list badly.** Crop the screenshot to just the planet rows, then retry, or type the list.
- **Save fails with a storage message.** Browser storage is full. Use fewer or smaller photos, or export a PNG instead.
- **Preview has no voice.** Some devices have no English voices. Add an ElevenLabs key under Advanced.
