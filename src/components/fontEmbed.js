/**
 * Builds a self-contained @font-face CSS string with base64-encoded font data.
 * Uses the server-side /api/font-proxy to fetch the Google Fonts CSS (bypassing
 * the cross-origin cssRules restriction), then fetches each woff2 file directly
 * (fonts.gstatic.com allows CORS) and embeds it as a data URI.
 *
 * The result is cached so subsequent export calls are instant.
 */

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?' +
  'family=Cormorant+SC:wght@300;400;500;600;700' +
  '&family=Inter:wght@400;500;600;700;800;900' +
  '&family=Playfair+Display:wght@400;500;600;700;800;900' +
  '&family=Oswald:wght@400;500;600;700' +
  '&family=Bebas+Neue' +
  '&family=Montserrat:wght@400;500;600;700;800;900' +
  '&family=Lora:wght@400;500;600;700' +
  '&family=Raleway:wght@400;500;600;700;800;900' +
  '&family=Poppins:wght@400;500;600;700;800;900' +
  '&family=DM+Serif+Display' +
  '&family=Space+Grotesk:wght@400;500;600;700' +
  '&display=swap';

let cachedFontEmbedCSS = null;
let pendingPromise = null;

export async function getEmbedFontCSS() {
  if (cachedFontEmbedCSS) return cachedFontEmbedCSS;
  if (pendingPromise) return pendingPromise;

  pendingPromise = (async () => {
    try {
      // 1. Fetch font CSS through our proxy (avoids cross-origin cssRules error)
      const proxyUrl = `/api/font-proxy?url=${encodeURIComponent(GOOGLE_FONTS_URL)}`;
      const cssRes = await fetch(proxyUrl);
      const css = await cssRes.text();

      // 2. Extract all unique font file URLs (woff2 on gstatic.com)
      const matches = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)];
      const uniqueUrls = [...new Set(matches.map((m) => m[1]))];

      // 3. Fetch each font binary and convert to base64 data URI
      const fontDataMap = {};
      await Promise.all(
        uniqueUrls.map(async (fontUrl) => {
          const res = await fetch(fontUrl);
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          bytes.forEach((b) => (binary += String.fromCharCode(b)));
          fontDataMap[fontUrl] = `data:font/woff2;base64,${btoa(binary)}`;
        })
      );

      // 4. Replace all URL references with embedded data URIs
      let embeddedCss = css;
      for (const [url, dataUri] of Object.entries(fontDataMap)) {
        embeddedCss = embeddedCss.replaceAll(`url(${url})`, `url(${dataUri})`);
      }

      cachedFontEmbedCSS = embeddedCss;
      return embeddedCss;
    } catch (err) {
      console.warn('Font embed failed, export will use system fonts:', err);
      return '';
    } finally {
      pendingPromise = null;
    }
  })();

  return pendingPromise;
}
