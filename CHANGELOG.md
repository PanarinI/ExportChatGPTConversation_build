# Changelog

All notable user-facing changes to the extension, newest first. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/); dates are YYYY-MM-DD.
Entries for 1.1.1 and earlier were reconstructed after the fact from git
history and working notes.

## [1.1.3] — 2026-07-20
### Fixed
- Long conversations were exported truncated. ChatGPT changed how it virtualizes
  the thread: off-screen turns are now removed from the page instead of being
  kept as empty placeholders. The exporter read the absence of placeholders as
  "everything is already rendered", skipped the scroll-through entirely, and
  saved only the turns that happened to be on screen — cutting at the same point
  on every retry. It now scrolls whenever the chat is taller than the viewport,
  and rebuilds the full conversation in order instead of only filling in blanks.
- Heavy exports: images are downscaled (max 1600 px long side) and opaque ones
  re-encoded as JPEG before sending — image-heavy chats no longer produce huge
  payloads that fail with a 503 (measured: 24.1 MB → 2.7 MB on a multi-image
  chat). Images with transparency stay PNG; a re-encoded image is only used
  when it is actually smaller than the original.
- Exported files could all end up with the same generic name ("New chat"). The
  chat name was read from its sidebar link, which the same ChatGPT redesign
  moved out of reach, leaving only the browser tab title — and that lags behind
  on a freshly named chat. The name is now looked up more robustly, generic
  placeholders are rejected, and as a last resort the file is named after your
  first message, so two exports are never indistinguishable.
### Added
- New "Everything" entry in the Export menu, lit when active. Exporting your
  prompts together with the AI's answers was always the default, but the menu
  named only the narrower "AI answers only" mode, so it was not obvious what
  the plain Export button did. Behavior is unchanged; the default now has a name.
- Export overlay now asks to keep the tab open and in the foreground (Chrome
  throttles background tabs, which could interrupt the capture).
### Changed
- Analytics: a failed export now sends one anonymous `export_failed` event with
  a coarse reason (too-large / network / other), alongside the existing
  success event. No chat content, prompts, titles, or personal data are
  included — it only lets us see how often exports fail and why.

## [1.1.2] — 2026-07-13
### Fixed
- Usage analytics: the stable client id + dev-build suppression (written
  2026-06-27) had never actually shipped — the 1.1.1 package was built from a
  stale `background.js`. No user-facing behavior change.
### Build
- Promo assets (`html_pdf_converter/`) excluded from the package
  (141 MB → ~240 KB).

## [1.1.1] — 2026-06-28 (approx.)
### Changed
- PDF conversion moved from the PDFCrowd API to a self-hosted Gotenberg behind
  HTTPS (`export-gpt.duckdns.org`). New permissions: image-CDN hosts (to inline
  auth-protected images), analytics host.
- Settings moved into the in-page modal; the standalone options page removed.
- Internal rename to a single `gptpdf` prefix (legacy `pdfcrowd`/`pcr` removed).
### Added
- Two anonymous usage events (export completed / selective export used).
- Friendly error messages (e.g. "chat is too large" instead of a raw 503).

## [1.0.5–1.0.6] — 2026-06 (reconstructed)
- Star rating + feedback form, export themes, table of contents, welcome page;
  assorted DALL-E and selective-export fixes.

## [1.0] — origin
- Forked base: export a ChatGPT conversation to PDF via the PDFCrowd API.
