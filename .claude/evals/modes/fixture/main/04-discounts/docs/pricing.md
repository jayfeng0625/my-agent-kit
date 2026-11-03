# Pricing rules

For each invoice line:

1. gross = qty x unit price
2. discount = gross x discountPct / 100, rounded half-up to the cent
3. taxable = gross - discount
4. tax = taxable x the region's rate, rounded half-up to the cent
5. line total = taxable + tax

Invoice totals are the sums of the line values. Sales tax is always charged on the discounted amount.
