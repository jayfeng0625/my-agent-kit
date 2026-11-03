# INV-7: Printed tax disagrees with the ERP export

Status: done

Finance reports that 1 invoice in 40 fails reconciliation by a few cents. The ERP stores tax per line, rounded per line. Our invoice rounds tax once on the subtotal, so the two disagree when lines have fractional-cent tax.

Acceptance: invoice tax equals the sum of per-line tax, each line rounded half-up to the cent.
