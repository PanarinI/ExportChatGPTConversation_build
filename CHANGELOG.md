# Changelog

All notable user-facing changes to the extension, newest first. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/); dates are YYYY-MM-DD.
Entries for 1.1.1 and earlier were reconstructed after the fact from git
history and working notes.

## [Unreleased]

## [1.1.8] — 2026-09-18
### Added
- **"Select to export" now has a Select all.** A row above the first block ticks
  every block at once, so you can take the whole conversation and then uncheck
  the few parts you don't want, instead of clicking your way through a hundred
  boxes. Asked for by a reviewer who wanted "the whole Q&A in the right order"
  and a "select all" for the blocks.
  With it on, the export is a normal full export with holes: it still climbs to
  the first message of the chat, keeps the messages in order and builds the
  table of contents — only the blocks you unchecked are missing. On a long chat
  that climb takes a while, and the page says how many messages it has loaded.

## [1.1.7] — 2026-08-27
### Fixed
- **Long conversations were exported from the middle, not from the beginning.**
  ChatGPT does not keep an old chat in the page: it holds a window of messages
  and fetches older ones from its server only as you scroll up. The exporter
  jumped to the top of that window — which in a long chat is somewhere in the
  middle — and read downwards from there, so the PDF began wherever the page
  happened to be loaded and quietly ended up 40–60 pages long however long the
  chat really was. It now climbs to the true first message, waiting for each
  older stretch to arrive, before it starts reading, and it says in the page
  how many messages it has loaded so far.
- **"Page breaks: after each answer" did nothing.** The setting was wired to the
  preview, which drew a dashed line between exchanges, and to a marker on the
  document — but the rule that actually breaks the page was never there. Every
  export came out with the same continuous flow whichever way the setting was
  left. It now does what it says: each of your prompts starts a fresh page, with
  the answer it replies to left on the previous one. The first prompt is not
  pushed down, so the file still opens on your first question.
- **"AI answers only" left a blank gap where each prompt had been.** Hiding a
  prompt hid the text but kept the frame it sat in, spacing and all, so the
  export came out with a hole between every pair of answers. The whole block is
  removed now. With page breaks switched on in this mode, each answer starts a
  fresh page — there is no prompt left to start one.
- **Your prompts were split across two pages.** A question that happened to fall
  near the bottom of a sheet was cut in half. Prompts now move to the next page
  whole, unless one is longer than a page.
- **Landscape now sets the conversation in two columns.** A landscape sheet is
  40% wider, and the text was simply run across all of it — around 137 characters
  a line, where the eye starts losing its place past 90. Two columns bring the
  line back to a comfortable length and give the wider sheet a reason to exist.
  Tables and code still use the full width. Landscape combined with Single page
  keeps the single long sheet and stays in one column. The preview in Settings
  shows the columns, so what you pick is what you get.
- **Messages could come out in the wrong order.** The export read the page in
  snapshots and stitched them together by their overlap. ChatGPT pulls the list
  back down when you touch its top, and a jump left a snapshot with nothing to
  attach to — those messages were appended at the end. The conversation was all
  there, in the wrong order, and where it started depended on where the chat
  happened to be scrolled when you pressed Export. Messages are now placed by
  their position relative to each other, which survives both the jumps and
  ChatGPT renumbering the conversation as older parts load.
### Changed
- **A short chat now takes a few seconds longer than before.** The export first
  checks whether there is an unloaded part above, and on a chat that has none
  that check is spent for nothing. It is the price of the fix above; the waiting
  is kept as short as the page allows, and the loading window now counts the
  messages it has read so you can see it working.
- **The wait is no longer capped at 90 seconds.** The old limit was a length
  limit in disguise: a chat that needed more scrolling than that was cut with no
  warning. The export now keeps going while it is still making progress and
  stops when nothing new arrives; Cancel is available the whole time.
- **Landscape combined with Single page produced a five-metre-wide sheet.** Single
  page works by making the sheet 200 inches tall so nothing is cut; the landscape
  option turns the sheet sideways — and it turned that 200 inches into the *width*.
  A single-page landscape export came out 200 in wide and 8.3 in tall, with the
  whole conversation squeezed into a strip. Landscape and Single page together now
  give what they should: a sheet as wide as a landscape page, running down as far
  as the conversation needs. Landscape on its own was never affected.

## [1.1.6] — 2026-08-22
### Added
- Page size now offers **Letter** (8.5 × 11 in) next to A4. Letter is the office
  standard in the US, Canada, Mexico and the Philippines, where an A4 export gets
  shrunk by the printer and re-broken across pages.
- On a fresh install the default page size follows the computer's time zone: Letter
  in Letter countries, A4 everywhere else. Your saved choice always wins over the
  default, so nothing changes for anyone who has already picked a size. The time zone
  is read on the device and never sent anywhere.
### Removed
- **A5 is gone.** It is half an A4 sheet — a notebook page, not an office one — and
  a chat exported onto it ran to twice the pages for no gain. Page size is now A4 or
  Letter. If you had A5 selected, your exports move to the size that fits your
  country; nothing else about them changes.

## [1.1.5] — 2026-08-10
### Changed
- The rating prompt now shows a "Not now" link next to the stars. It does exactly
  what clicking away from the prompt has always done — the Export button comes
  back and the prompt returns after your next export — but you no longer have to
  guess that a way out exists. Nothing about when the prompt appears has changed,
  and a rating still retires it for good.

## [1.1.4] — 2026-08-01
### Changed
- Export menu: the whole-conversation option is now labeled "Select all" (was
  "Everything"), so users who look for a "select all" find it instead of getting
  lost in "Select to export" — a 1–3★ review asked for exactly this.
- The PDF no longer prints a date and a source link at the top by default. Both
  were on out of the box and appeared as extension-added marks above the
  conversation; they are now off by default and can be re-enabled in Settings
  (Creation date / Source link).
### Fixed
- Uploaded images no longer vanish from the PDF (text-only export). ChatGPT wraps
  an uploaded picture in a labeled button ("Open image: …"), and the export cleanup
  removed every such button — deleting the image with it. Buttons that wrap a real
  image are now kept in both full and selective export, while citation/"Sources"
  buttons (favicons only) are still removed. Reported by a user with a reproducible
  single-image test chat.

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
