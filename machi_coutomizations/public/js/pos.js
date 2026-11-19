(function () {
	const MIN_BILL_FOR_DISCOUNT = 100;
	const page = frappe.pages["point-of-sale"];
	if (!page || page.__machi_pos_extended) return;
	page.__machi_pos_extended = true;

	const original = page.on_page_load;

	page.on_page_load = function (wrapper) {
		const context = this;

		frappe.require("point-of-sale.bundle.js", () => {
			const POS = erpnext.PointOfSale;

			// Discard decimals from manually entered rates: 1.075 becomes 1.
			if (!POS.ItemDetails.__machi_integer_rate_extended) {
				const ItemDetails = POS.ItemDetails;

				POS.ItemDetails = class extends ItemDetails {
					static __machi_integer_rate_extended = true;

					constructor(options) {
						const events = options.events;
						super({
							...options,
							events: {
								...events,
								form_updated(item, fieldname, value) {
									if (fieldname === "rate") {
										value = Math.trunc(flt(value));
									}
									return events.form_updated.call(events, item, fieldname, value);
								},
							},
						});
					}
				};
			}

			// Hide Net Total and show Total Cost before the bill discount.
			if (!POS.ItemCart.__machi_discount_extended) {
				const ItemCart = POS.ItemCart;

				POS.ItemCart = class extends ItemCart {
					static __machi_discount_extended = true;

					make_cart_totals_section() {
						super.make_cart_totals_section();

						this.discount_edits = new WeakMap();
						this.$sale_mode = $(`
							<label>
								${__("POS Sale Mode")}
								<select class="form-control input-xs">
									<option value="Store">${__("Store (10%)")}</option>
									<option value="Exhibition">${__("Exhibition (0%)")}</option>
								</select>
							</label>
						`).insertBefore(this.$add_discount_elem);
						this.$sale_mode.find("select")
							.val(localStorage.getItem("pos_sale_mode") === "Exhibition" ? "Exhibition" : "Store")
							.on("change", (event) => {
								const frm = this.events.get_frm();
								localStorage.setItem("pos_sale_mode", event.target.value);
								this.discount_edits.set(frm.doc, { field: "mode" });
								this.update_totals_section(frm);
								this.hide_discount_control(this.get_discount_percentage(frm.doc));
							});

						this.$total_cost = $(`
							<div class="machi-total-cost-row"
								style="display:flex;justify-content:space-between;
								align-items:center;margin-bottom:var(--margin-sm)">
								<span>${__("Total Cost")}</span>
								<span class="machi-total-cost-amount"></span>
							</div>
						`);

						this.$discount_amount = $(`
							<div class="machi-discount-row"
								style="display:flex;justify-content:space-between;
								align-items:center;margin-bottom:var(--margin-sm)">
								<span>${__("Discount")}</span>
								<span class="machi-discount-amount"></span>
							</div>
						`);

						this.arrange_custom_totals();
					}

					arrange_custom_totals() {
						const $net_total = this.$totals_section
							.find(".net-total-container")
							.first();

						$net_total.hide();

						if (this.$total_cost && this.$discount_amount) {
							this.$total_cost.insertAfter($net_total);
							this.$discount_amount.insertAfter(this.$total_cost);
						}
					}

					update_totals_section(frm) {
						frm = frm || this.events.get_frm();
						this.update_bill_discount(frm);
						super.update_totals_section(frm);

						this.arrange_custom_totals();

						const doc = frm.doc;

						// Total cost of all boxes before the bill discount.
						const total_cost = (doc.items || []).reduce(
							(total, item) =>
								total + flt(item.qty) * flt(item.rate),
							0
						);

						if (this.$total_cost) {
							this.$total_cost
								.find(".machi-total-cost-amount")
								.text(
									format_currency(
										total_cost,
										doc.currency
									)
								);
						}

						if (this.$discount_amount) {
							this.$discount_amount
								.find(".machi-discount-amount")
								.text(
									format_currency(
										flt(doc.discount_amount),
										doc.currency
									)
								);
						}
					}

					get_discount_base(doc) {
						const field = doc.apply_discount_on === "Grand Total" ? "grand_total" : "net_total";
						return flt(doc[field]) + flt(doc.discount_amount);
					}

					get_discount_percentage(doc) {
						const base = this.get_discount_base(doc);
						return flt(doc.additional_discount_percentage) ||
							(base > 0 ? 100 * flt(doc.discount_amount) / base : 0);
					}

					update_bill_discount(frm) {
						const doc = frm.doc;
						if (doc.doctype !== "POS Invoice" || doc.docstatus || doc.is_return ||
							!frm.cscript?.calculate_taxes_and_totals || this.updating_bill_discount) return;

						const allowed = flt(doc.total) > MIN_BILL_FOR_DISCOUNT;
						const edit = this.discount_edits.get(doc);
						if (!edit && !frm.is_new()) return;
						const default_percent = this.$sale_mode.find("select").val() === "Store" ? 10 : 0;
						const amount = allowed && edit?.field === "amount"
							? Math.min(edit.value, Math.max(0, this.get_discount_base(doc)))
							: 0;
						const percent = allowed && edit?.field !== "amount"
							? edit?.value ?? default_percent
							: 0;

						if (flt(doc.additional_discount_percentage) === percent &&
							(percent || flt(doc.discount_amount) === amount)) return;

						this.updating_bill_discount = true;
						try {
							doc.apply_discount_on ||= "Net Total";
							doc.additional_discount_percentage = percent;
							doc.discount_amount = amount;
							frm.dirty();
							frm.cscript.calculate_taxes_and_totals();
						} finally {
							this.updating_bill_discount = false;
						}
					}

					show_discount_control() {
						const frm = this.events.get_frm();
						const doc = frm.doc;
						if (doc.doctype !== "POS Invoice" || doc.docstatus || doc.is_return) {
							return super.show_discount_control();
						}

						const $editor = $(`
							<div class="d-flex" style="gap:8px">
								<label>${__("Discount %")}
									<input type="number" min="0" max="100" step="any" class="form-control input-xs">
								</label>
								<label>${__("Discount (₹)")}
									<input type="number" min="0" step="0.01" class="form-control input-xs">
								</label>
							</div>
						`);
						const [$percent, $amount] = $editor.find("input").toArray().map((input) => $(input));
						const refresh = () => {
							$percent.val(flt(this.get_discount_percentage(doc), 6));
							$amount.val(flt(doc.discount_amount));
						};
						const apply = (field, input) => {
							if (this.events.get_frm().doc !== doc) return;
							if (flt(doc.total) <= MIN_BILL_FOR_DISCOUNT) {
								frappe.msgprint(__("Discount is available only on bills above ₹{0}.", [MIN_BILL_FOR_DISCOUNT]));
								refresh();
								return;
							}
							const value = flt(input.value);
							const max = field === "percent" ? 100 : this.get_discount_base(doc);
							if (value < 0 || value > max) {
								frappe.msgprint(__("Enter a discount between 0 and {0}.", [max]));
								refresh();
								return;
							}
							this.discount_edits.set(doc, {
								field,
								value: field === "amount" ? flt(value, precision("discount_amount", doc)) : value,
							});
							this.update_totals_section(frm);
							refresh();
						};
						$percent.on("change", (event) => apply("percent", event.target));
						$amount.on("change", (event) => apply("amount", event.target));
						$editor.on("click", (event) => event.stopPropagation());
						$editor.on("keydown", "input", (event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								event.stopPropagation();
								event.target.blur();
							}
						});
						this.$add_discount_elem.empty().append($editor);
						refresh();
						$percent.trigger("focus");
					}
				};
			}

			// Add the barcode scanner field.
			if (!POS.ItemSelector.__machi_barcode_extended) {
				const ItemSelector = POS.ItemSelector;

				POS.ItemSelector = class extends ItemSelector {
					static __machi_barcode_extended = true;

					prepare_dom() {
						super.prepare_dom();

						const $section = $(`
							<div class="machi-barcode-section"
								style="padding:16px;flex:0 0 auto">
							</div>
						`);

						this.$items_container.before($section);

						this.barcode_field = frappe.ui.form.make_control({
							parent: $section,
							df: {
								fieldname: "machi_scan_barcode",
								fieldtype: "Data",
								label: __("Scan Barcode"),
								placeholder: __("Scan barcode and press Enter"),
							},
							render_input: true,
						});

						const $input = this.barcode_field.$input;

						$input.attr("autocomplete", "off");
						$input.css("padding-right", "40px");

						const $input_wrapper = $input.parent();
						$input_wrapper.css("position", "relative");

						const $camera = $(`
							<button type="button" class="btn btn-default btn-xs"
								style="position:absolute;right:6px;top:50%;
									transform:translateY(-50%);z-index:2">
								${frappe.utils.icon("scan", "sm")}
							</button>
						`);

						$camera.attr({
							title: __("Scan with camera"),
							"aria-label": __("Scan with camera"),
						});

						$input_wrapper.append($camera);

						// Prevent duplicate processing by the global scanner.
						$input.on(
							"keydown.machi keypress.machi keyup.machi",
							(event) => {
								event.stopImmediatePropagation();

								if (
									event.type === "keydown" &&
									event.key === "Enter"
								) {
									event.preventDefault();

									if (!event.repeat) {
										this.machi_scan_barcode($input.val());
									}
								}
							}
						);

						$camera.on("click", () => this.machi_open_camera_scanner());

						this.machi_scan_queue = Promise.resolve();
					}

					machi_open_camera_scanner() {
						if (this.machi_camera_scanner?.dialog.is_visible) return;

						const Scanner = frappe.ui.Scanner;
						const has_native_toggle = typeof Scanner.prototype.render_keep_open_toggle === "function";
						const storage_key = "scanner_keep_open";
						let last_scan;
						const options = {
							dialog: true,
							allow_keep_open: true,
							multiple: !has_native_toggle && localStorage.getItem(storage_key) === "1",
							on_scan: (data) => {
								const barcode = (typeof data === "string" ? data : data?.decodedText)?.trim();
								if (!barcode) return;

								if (!has_native_toggle && options.multiple) {
									const now = Date.now();
									const repeated = last_scan?.barcode === barcode && now - last_scan.at < 2000;
									last_scan = { barcode, at: now };
									if (repeated) return;
								}

								this.machi_scan_barcode(barcode);
							},
						};

						const scanner = new Scanner(options);
						this.machi_camera_scanner = scanner;
						scanner.dialog.$wrapper.one("hidden.bs.modal", () => {
							if (this.machi_camera_scanner !== scanner) return;
							this.machi_camera_scanner = null;
							if (this.$component.is(":visible")) this.barcode_field.set_focus();
						});

						if (!has_native_toggle) {
							const $preview = scanner.dialog.get_field("scan_area").$wrapper;
							$preview.css({ borderRadius: "var(--border-radius-lg, 8px)", overflow: "hidden" });
							const $toggle = $(`
								<label class="d-flex align-items-center mt-3" style="gap: 8px">
									<input type="checkbox">
									<span>${__("Keep scanner open after scan")}</span>
								</label>
							`).insertAfter($preview);
							$toggle.find("input").prop("checked", options.multiple).on("change", (event) => {
								options.multiple = event.target.checked;
								localStorage.setItem(storage_key, options.multiple ? "1" : "0");
							});
						}
					}

					machi_scan_barcode(value) {
						const barcode = String(value || "").trim();
						if (!barcode) return;

						this.barcode_field.set_value("");

						this.machi_scan_queue = (
							this.machi_scan_queue || Promise.resolve()
						)
							.then(async () => {
								const { message: scanned } = await frappe.call({
									method:
										"erpnext.selling.page.point_of_sale.point_of_sale." +
										"search_for_serial_or_batch_or_barcode_number",
									args: {
										search_value: barcode,
									},
								});

								if (!scanned?.item_code || !scanned.barcode) {
									frappe.msgprint({
										title: __("Barcode Not Found"),
										message: __(
											"No item found for barcode {0}",
											[barcode]
										),
										indicator: "orange",
									});
									return;
								}

								// Fetch the selling price through the POS lookup.
								const { message } = await this.get_items({
									search_term: barcode,
								});

								const item = (message?.items || []).find(
									(row) =>
										row.item_code === scanned.item_code &&
										(!scanned.uom || row.uom === scanned.uom)
								);

								if (!item) {
									frappe.msgprint({
										title: __("Item Not Available"),
										message: __(
											"The scanned item is not available in this POS profile."
										),
										indicator: "orange",
									});
									return;
								}

								if (!flt(item.price_list_rate)) {
									frappe.msgprint({
										title: __("Price Not Set"),
										message: __(
											"Price is not set for item {0} in the selected selling price list.",
											[item.item_code]
										),
										indicator: "orange",
									});
									return;
								}

								await this.events.item_selected({
									field: "qty",
									value: "+1",
									item: {
										item_code: item.item_code,
										rate: flt(item.price_list_rate),
										uom:
											item.uom ||
											scanned.uom ||
											item.stock_uom,
										stock_uom: item.stock_uom,
										batch_no: item.batch_no || undefined,
									},
								});
							})
							.catch((error) => {
								console.error("POS barcode scan failed:", error);

								frappe.msgprint(
									__(
										"Could not add the scanned item. Check the error and scan again."
									)
								);
							})
							.finally(() => {
								if (!this.machi_camera_scanner?.dialog.is_visible && this.$component.is(":visible")) {
									this.barcode_field.set_focus();
								}
							});
					}
				};
			}

			original.call(context, wrapper);
		});
	};
})();
