"""Server hooks for POS invoices."""


def prepare_pos_items(doc, method=None):
    """Allow POS invoice rows to be posted with zero stock valuation."""
    if doc.doctype != "POS Invoice":
        return

    for item in doc.get("items") or []:
        item.allow_zero_valuation_rate = 1
