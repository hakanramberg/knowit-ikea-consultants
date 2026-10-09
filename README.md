# Knowit proposal for IKEA Range Operations

Static consultant presentation with 25 profiles, 25 portraits and 25 original CVs. The site includes availability, the requested competence filters, expert rate badges, individual CV downloads and a ZIP download of all CVs.

## GitHub Pages

Publish from the `main` branch and the repository root (`/`). The `.nojekyll` file allows the HTML, CSS, JavaScript and downloads to be served directly. All asset links are relative, so the site also works under a GitHub Pages project URL.

No build step or package installation is required.

## New profiles and CV downloads

Give each newly introduced consultant an `addedOn` value in `YYYY-MM-DD` format in both `consultants.json` and the consultant array in `consultants.js`. Use the actual addition date in Europe/Stockholm. For example: `"addedOn": "2026-10-09"`. Do not change this date when replacing an existing consultant's CV, and do not assign a new date to existing profiles.

The site automatically shows an **Added today** badge on that date, then the addition date on later days. A **New profiles** panel displays the most recent addition date and its consultant count. **View new profiles** filters to that batch; **Download new CVs** creates one ZIP containing every original CV from that batch, regardless of the current search or competence filter. The latest batch remains available on subsequent days until newer profiles are added. If no profiles have an addition date, the panel stays hidden.

Keep the original CV files, `cvBytes`, filenames, individual download payloads and the all-CV ZIP in sync when adding consultants. The new-CV ZIP is generated in the browser directly from the originals and supports the offline payloads as well. Missing or incomplete files produce an error instead of a partial ZIP. Existing availability sorting, expert rate badges and downloads are preserved.
