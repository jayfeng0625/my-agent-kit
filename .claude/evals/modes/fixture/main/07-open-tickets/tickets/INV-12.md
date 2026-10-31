# INV-12: CSV export of invoice lines

Status: open

Accounting imports invoice lines into a spreadsheet. Add a `--csv` flag: `node src/cli.js --csv <invoice.json>` prints the invoice's lines as CSV on stdout, in place of the report.

- First row is the header `sku,description,qty,unit_price,discount,tax,line_total`.
- One row per invoice line, in invoice order. No totals row.
- Money columns are plain decimals with two places and no currency sign: `12.50`, `0.07`.
- A field that contains a comma, a double quote or a newline is wrapped in double quotes, with each double quote inside it doubled (RFC 4180). Other fields are not quoted.
- Rows end with `\n`.

Example, for `examples/basic.json`:

```
sku,description,qty,unit_price,discount,tax,line_total
PEN-01,"Gel pen, black",12,1.15,0.00,1.00,14.80
PAD-07,Legal pad,3,4.99,0.00,1.09,16.06
INK-22,Ink cartridge,1,23.50,0.00,1.70,25.20
```
