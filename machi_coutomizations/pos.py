import frappe
from frappe import _
from frappe.utils import flt
from frappe.utils.nestedset import get_root_of

from erpnext.selling.page.point_of_sale.point_of_sale import (
	get_items,
	search_for_serial_or_batch_or_barcode_number,
)


def prepare_pos_items(doc, method=None):
	"""Allow POS invoice rows to be posted with zero stock valuation."""
	if doc.doctype != "POS Invoice":
		return

	for item in doc.get("items") or []:
		item.allow_zero_valuation_rate = 1


def _fail(title, message):
	return {"ok": False, "title": title, "message": message}


@frappe.whitelist()
def scan_barcode(barcode, pos_profile):
	barcode = (barcode or "").strip()
	if not barcode:
		return _fail(_("Barcode Missing"), _("No barcode received."))

	scanned = search_for_serial_or_batch_or_barcode_number(barcode) or {}
	item_code = scanned.get("item_code")

	if not item_code or not scanned.get("barcode"):
		return _fail(
			_("Barcode Not Found"),
			_("No item found for barcode {0}").format(barcode),
		)

	price_list = frappe.db.get_value("POS Profile", pos_profile, "selling_price_list")

	result = get_items(
		start=0,
		page_length=20,
		price_list=price_list,
		item_group=get_root_of("Item Group"),
		pos_profile=pos_profile,
		search_term=barcode,
	)

	scanned_uom = scanned.get("uom")
	item = next(
		(
			row
			for row in (result or {}).get("items", [])
			if row.get("item_code") == item_code
			and (not scanned_uom or row.get("uom") == scanned_uom)
		),
		None,
	)

	if not item:
		return _fail(
			_("Item Not Available"),
			_("The scanned item is not available in this POS profile."),
		)

	rate = flt(item.get("price_list_rate"))
	if not rate:
		return _fail(
			_("Price Not Set"),
			_("Price is not set for item {0} in the selected selling price list.").format(item_code),
		)

	return {
		"ok": True,
		"item_code": item["item_code"],
		"rate": rate,
		"uom": item.get("uom") or scanned_uom or item.get("stock_uom"),
		"stock_uom": item.get("stock_uom"),
		"batch_no": item.get("batch_no") or None,
	}
