TOP Punch Closure v0.19.5

Frontend: replace the deployed frontend files with this ZIP's contents and hard-refresh once.
The current background photographs and existing Tag/Drawing/Pipeline functionality are preserved.

Punch view:
- All items available; virtual scrolling bounds the visible DOM.
- Separate status and closed date. Dates display e.g. 01 June 2026.
- Date filters accept 14-09-2026, 14/09/2026, 14 Sept 2026 and full month names.
- Discipline filter and all business columns available with horizontal scrolling.
- Punch details list the selected item and other rows sharing a KKS tag in Location/Description.
  Shared-tag links use complete process/equipment KKS tags, not arbitrary word matches.
- Source / Match column removed. Details can be filtered by discipline.
- Browser IndexedDB holds the last successful snapshot (not cookies).
- The first load downloads the full dataset. Refreshes happen every five minutes and on returning
  to the tab. Backend v0.19.4 supports unchanged responses and changed/added/deleted rows only.
- Backend v0.19.3 remains compatible but still downloads full snapshots.

Install the accompanying backend delta ZIP to enable incremental transfer.
No changes to the working Power Automate flow, its key, POST URL or binary Body are needed.
Closed means date + green. Date without green: Row is not green. Green without date:
There is no closed date. Neither: Open. Unverifiable colour: Row colour not verified.
Unknown date input is preserved rather than invented.

New in v0.19.5:
Type a column filter and press Tab or Enter to keep it as a chip. Add another
value to match either choice (A OR B). Different columns combine with AND.
Remove a chip with its x button; Backspace in an empty field removes the last chip.
An empty field + Tab moves focus normally. Date filters also support multiple chips.
Category matching is exact and case-insensitive. Other text columns retain contains matching.
The bottom summary counts all filtered rows: listed, Closed, Open, Require review.
Review includes inconsistent date/colour and unverified colour, never silently counted as Open.
This release needs no additional backend or Power Automate change. Backend v0.19.4
from the previous release is still needed for incremental data transfer.
