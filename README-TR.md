TOP Punch Closure v0.19.11

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
The v0.19.5 filter changes needed no backend update. For v0.19.6 observation times, install backend v0.19.6 as well.

New in v0.19.6:
- Punch Item is the first and default search mode.
- Selected punch numbers and matching rows share distinct steady colours and numbered labels.
- Status, discipline and date widths adapt to the filtered contents.
- Closed Time (Observed) and Issued Time (First Seen) are additional filterable columns.
- Details move Discipline after Description and show Closed Date and Issued Date together.
- Observation times are stored in backend snapshots and displayed in Europe/Berlin time.
  They describe detection, not actual field work times. The first upgraded import is
  a baseline; historical records have no invented times. Future newly seen records
  and transitions to closed acquire timestamps. Reopening clears closure time.
Install BOTH v0.19.6 packages. No Power Automate action changes are needed.

New in v0.19.7:
Discipline colours replace per-search colours: Electric/I&C red, Mechanical blue,
Civil gray, with 50% alpha backgrounds. Unrecognised disciplines stay neutral.
Only the selected number text above the table pulses; table rows remain steady.
Reduced motion preference disables pulsing. Legend appears beside Punch Items.
Closed Time (Observed) is removed from the main table. Detail Closed Date & Time
shows the full observed timestamp; old records retain their source date with
Time unavailable instead of a fabricated time. Backend v0.19.6 remains required
for observation tracking; no new backend or Power Automate change is needed.

New in v0.19.8: row colour alpha is 7%; punch number badge backgrounds are 15%.
Text and borders remain clear; existing number animation is preserved.

New in v0.19.9: neutral white table, blue-gray number badges and searched labels; no coloured row stripe. Only upper chip backgrounds pulse with 8% discipline colour. Text and borders stay neutral. No backend change.

New in v0.19.10: Select cells, click the first cell then Shift-click the last in the same column. Copy selected or Ctrl+C copies only those values as one Excel column. Click Finish selecting to restore normal punch detail clicks. Filtering or refreshing data clears the selection.

New in v0.19.11: only the Punch Item No. cell receives 3% discipline colour fill. Neutral text and borders remain; cell selection overrides the fill.
