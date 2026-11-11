HAZEL GROVE BEER MENU
=====================

Files
  taproom-screen.html   Full-screen TV menu (site colors, green logo bottom right).
                        Re-reads the Google Sheet every 2 minutes; text auto-sizes to fit.
  print-menu.html       Print preview (white page, brand red #E2493E) + Print button.
                        Choose Letter / Legal / Half Letter and edit the date line.
  menu-data.js          Google Sheet settings + shared loader. EDIT SHEET_ID HERE.
  beer-menu-template.csv  Starter data — import into a new Google Sheet.
  assets/               Logos copied from "Hazel Grove Logo Files".

Connect the Google Sheet
  1. Google Sheets > File > Import > upload beer-menu-template.csv (or type the headers):
       Tap Number | Name | Style | Category | ABV | Tap Price | 4 Pack Price
  2. Name the tab "Menu" (or change SHEET_TAB in menu-data.js).
  3. Share > General access > "Anyone with the link" > Viewer.
  4. Copy the ID from the sheet URL:  docs.google.com/spreadsheets/d/<THIS PART>/edit
     and paste it into SHEET_ID in menu-data.js.
  Only beers with a Tap Number are shown (in tap order). Clear the tap number to take one off.
  Categories appear in the order they first show up in the sheet.

Running it
  Double-clicking the HTML files works in Chrome/Edge. For the taproom TV, open
  taproom-screen.html in a browser and press F11 for full screen.
  If the Wi-Fi drops, the screen keeps showing the last menu it loaded.

Fonts: the brand fonts (Alkaline, Triplex Sans) and the website's script font are
licensed fonts, so free Google Fonts stand-ins are used: Yellowtail (script),
Oswald (beer names), Almarai (body text, same as the website).
