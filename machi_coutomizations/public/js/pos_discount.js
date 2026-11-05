(function () {
	const page = frappe.pages["point-of-sale"];
	if (!page || page.__machi_pos_extended) return;
	page.__machi_pos_extended = true;

	const original = page.on_page_load;

	page.on_page_load = function (wrapper) {
		const context = this;

		frappe.require("point-of-sale.bundle.js", () => {
			const POS = erpnext.PointOfSale;

			// Hide Net Total and show Total Cost before the bill discount.
			if (!POS.ItemCart.__machi_discount_extended) {
				const ItemCart = POS.ItemCart;

				POS.ItemCart = class extends ItemCart {
					static __machi_discount_extended = true;

					make_cart_totals_section() {
						super.make_cart_totals_section();

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

						$camera.on("click", () => {
							new frappe.ui.Scanner({
								dialog: true,
								multiple: false,
								on_scan: (data) => {
									const barcode =
										typeof data === "string"
											? data
											: data.decodedText;

									if (barcode) {
										this.machi_scan_barcode(barcode);
									}
								},
							});
						});

						this.machi_scan_queue = Promise.resolve();
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
								if (this.$component.is(":visible")) {
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