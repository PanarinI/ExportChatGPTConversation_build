# Changelog

All notable user-facing changes to the extension, newest first. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/); dates are YYYY-MM-DD.
Entries for 1.1.1 and earlier were reconstructed after the fact from git
history and working notes.

## [1.2.2] — 2026-10-08
### Fixed
- **Formulas print the way ChatGPT shows them.** Powers, fractions, roots,
  sums, integrals and matrices used to fall apart into a line in the PDF
  ("x2" instead of x²). Each formula is now rebuilt from its own source and
  drawn as real math.

## [1.2.1] — 2026-10-08
### Added
- **Every source of a grouped citation.** Where ChatGPT shows a citation as one
  chip with "+1" ("PubMed Central +1"), the PDF used to keep only the first
  source. Now it lists them all, each as its own link ("matplotlib.org · NumPy").
- **Contents and bookmarks in "AI answers only".** That mode used to have
  neither, because the contents were made of the questions it leaves out. Now
  each answer gets an entry — its first heading, or its first sentence — that
  links to it, and the same list shows as bookmarks in the PDF viewer.

### Fixed
- **No more stray boxes in the text.** Links to files a code run once made
  ("download it here") printed as a button with a broken icon, "code citation"
  chips as empty boxes, and an image edit left a small empty bubble next to the
  question. Now the link is plain text and the empty pieces are gone.
- **No more empty PDF when Export is pressed too early.** Pressed while the
  chat was still opening, the export made a file with only the title. Now it
  waits for the chat to appear, and if it does not, says so.
- **Interactive graphs are no longer exported half-loaded.** ChatGPT draws its
  live graph a few seconds after the answer; an export made in that time
  printed a page-wide loading spinner. The export now waits for the graph.

## [1.2.0] — 2026-10-08
### Added
- **One progress card from the click to the file.** It says what is happening
  at each step — loading older messages, reading them, adding and compressing
  images, creating the PDF with a running clock — so a long export never sits
  in silence. On long chats it adds a short fact about how ChatGPT loads them,
  and it tells you when you may switch tabs: not while messages are being read
  (a hidden tab pauses the export), yes once the PDF is being created.
- **ChatGPT is yours again while the PDF is created.** From "Compressing
  images" on, the screen is no longer dimmed and the card stays under the
  button: you can read, scroll or open another chat, and the file still downloads.
  Only closing or reloading the tab stops it.

### Fixed
- **Generated pictures no longer go missing.** A picture in an answer that had
  not finished loading on the page when you exported — for example because you
  switched tabs — was left out of the PDF, with an empty space in its place; a
  second export in the same tab lost the same pictures again until the page was
  reloaded. Now every picture of an answer reaches the PDF, and exporting leaves
  the chat page as it was. Pictures are also fetched four at a time, with more
  time each and one retry.
- **Charts drawn by code are no longer lost.** ChatGPT shows the answer's text
  first and draws its chart about a second later; on long chats the export
  sometimes moved on before the chart arrived. It now waits for it.
- **ChatGPT's interactive graphs print cleanly.** The graph is kept; its buttons
  (copy, expand, zoom, "Add more", "Leave feedback") and the function input
  boxes no longer appear in the PDF, and the half page of empty space under the
  graph is gone.
- **A second click on Export no longer makes a second file.** While "Select to
  export" was still preparing the PDF, the Export button came back on after a
  second, and clicking it again started another export and downloaded the
  selection twice. Now one export runs at a time, whichever kind it is; if
  preparing a selection fails, an error says so instead of a spinner that never
  stops.
- **Chats with generated pictures are sent at half the size.** Each picture
  taken out of ChatGPT's frame was also kept, hidden, in the frame, so it was
  sent and compressed twice. Now it goes once: on a chat with 40 pictures the
  upload is about half as heavy and "Compressing images" takes half the time.
- **Questions with an uploaded picture keep their text.** When the picture was
  a large PNG (for example a downloaded DALL·E image uploaded again), the PDF
  showed the picture and dropped the question written under it, while the table
  of contents still listed it.
- **Long chats are read in one pass.** On ChatGPT's classic page the
  extension now follows the page's own list of messages from the first to the
  last. Before, it crawled up to the start of the chat and back down again —
  about 11 minutes on a 500-message chat — and could then walk the whole chat
  twice more, looking for a message that did not exist. Now it takes a couple
  of minutes at most, every message is accounted for, and they come out in the
  order of the chat. If you switch to another tab, collecting pauses and goes
  on when you come back, instead of losing messages.

## [1.1.11] — 2026-10-04
### Added
- **Page numbers** at the bottom of every page ("3 / 12"), on by default and
  switchable in Settings. A single long page has none.
- **Dark pages get margins on every page.** The dark theme used to have its
  spacing only at the very start and end of the document, so from the second
  page on the text ran right up to the top edge; it now has the same margins
  as the light theme, with the whole sheet dark.
- **Bookmarks.** With the table of contents on, the PDF also gets bookmarks in
  the viewer's side panel — one per question, with the headings of each answer
  nested under it.

### Changed
- **A clean header for new users.** The export date and the link to the chat
  are now off by default; anyone can turn them on in Settings. "Reset to
  defaults" now lands on exactly what a new user starts with — before, the two
  disagreed. Settings people already have are left as they are.
- **"Include model name" is gone.** It showed the model currently selected at
  the top of ChatGPT, not the model that wrote the answers.
- **Settings, tidied.** "Style" is now "Question color" and sits next to the
  color theme; "Creation date" is "Export date", because that is what it is;
  "Single page" moved below the page settings, and page breaks and page numbers
  step aside while it is on.
- **A rating of 1–3 stars now opens a short "What went wrong?" page** (one
  field and a Send button) instead of a Google Form. The answer goes to the
  same place as before, so nothing is lost.

### Fixed
- **ChatGPT's date lines no longer reach the PDF.** The new ChatGPT page puts a
  date line ("Wed, Sep 9 at 2:57") into the conversation; it showed up above
  the first question of the PDF.
- **"Select to export" ignored the paper settings.** It always made a portrait
  A4 page; it now uses your paper size, orientation and single-page choice.
- **"Select to export" is back on ChatGPT's new layout.** 1.1.9 brought the
  export back to the redesigned page (the one with the Chat / Work switch) but
  hid "Select to export" there, because it could not yet find the messages on
  that page. It now picks blocks there as on the old page: a question is one
  block, an answer splits into its paragraphs, code blocks, lists and pictures,
  and "Select all" works as well. Whatever is picked is laid out in the order
  of the conversation, however far apart it was scrolled.
- **Picked blocks no longer look unpicked after scrolling back.** ChatGPT keeps
  only part of a long chat on the page and re-draws the rest as you scroll.
  A message you had ticked came back with empty boxes: it was still going into
  the PDF, but the page said otherwise, and an empty box could not be unticked.
  The ticks now come back with the message.
- **Pictures in "Select to export" from messages you had scrolled past** are
  now embedded in the PDF, the way the full export always did it, instead of
  going out as links the PDF could not open.
- **"Select all": unticking a picture could also cut a paragraph** of the same
  answer (and the other way round) when the two happened to sit at the same
  place in their lists. They are now told apart.
- **Turned-off settings no longer come back on after an update.** Since 1.1.2
  every update of the extension switched the table of contents, the creation
  date and the source link back on for anyone who had turned them off. An
  update now only fills in settings that did not exist yet.

## [1.1.9] — 2026-09-26
### Fixed
- **The extension stopped working on ChatGPT's new layout.** Since around
  21 September ChatGPT has been moving accounts, one by one, to a redesigned
  page (the one with the Chat / Work switch). On it the Export button stayed
  dimmed on an open conversation and said "Open a conversation first", so
  nothing could be exported. The extension now reads both the old and the new
  page: it recognises the open chat, climbs the new thread (which scrolls from
  the bottom up) to the first message, and lays each question and its answer
  out in the PDF exactly as before — same cleanup, table of contents,
  "AI answers only" and page breaks.
- **Generated images could be missing from the PDF.** Pictures that ChatGPT
  serves as temporary in-page links (`blob:`), which the new layout does for
  generated images, are now embedded in the file instead of turning into a
  broken-image mark.

### Changed
- On the new layout, "Select to export" is hidden from the menu for now; it
  returns once it has learned that page. The old layout keeps it as before.

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
