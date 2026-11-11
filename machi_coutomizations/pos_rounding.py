"""Use whole-unit truncation for POS invoice payable totals."""

from math import trunc

from frappe.utils import flt
from erpnext.controllers.taxes_and_totals import calculate_taxes_and_totals


class POSTaxesAndTotals(calculate_taxes_and_totals):
    def set_rounded_total(self):
        self.doc.disable_rounded_total = 0
        self.doc.rounded_total = trunc(flt(self.doc.grand_total))
        self.doc.rounding_adjustment = flt(
            self.doc.rounded_total - flt(self.doc.grand_total),
            self.doc.precision("rounding_adjustment"),
        )
        self._set_in_company_currency(
            self.doc, ["rounding_adjustment", "rounded_total"]
        )


class POSRoundingMixin:
    def calculate_taxes_and_totals(self):
        POSTaxesAndTotals(self)
        self.calculate_commission()
        self.calculate_contribution()
