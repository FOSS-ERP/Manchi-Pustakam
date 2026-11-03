
(function () {
	const MIN_BILL_FOR_DISCOUNT = 100;
	const get_sale_mode = () =>
		localStorage.getItem("pos_sale_mode") === "Exhibition" ? "Exhibition" : "Store";
	const page = frappe.pages["point-of-sale"];
	if (!page || page.__machi_pos_extended) return;
	page.__machi_pos_extended = true;

	const original = page.on_page_load;

	page.on_page_load = function (wrapper) {
		const context = this;

		frappe.require("point-of-sale.bundle.js", () => {
			const POS = erpnext.PointOfSale;

			// Display the discount in cart totals.
			if (!POS.ItemCart.__machi_discount_extended) {
				const ItemCart = POS.ItemCart;

				POS.ItemCart = class extends ItemCart {
					static __machi_discount_extended = true;

					make_cart_totals_section() {
						super.make_cart_totals_section();
						this.make_sale_mode_panel();

						this.$discount_amount = $(`
							<div style="display:flex;justify-content:space-between;
								align-items:center;margin-bottom:var(--margin-sm)">
								<span>${__("Discount")}</span>
								<span class="machi-discount-amount"></span>
							</div>
						`);

						this.$totals_section
							.find(".item-qty-total-container")
							.before(this.$discount_amount);
					}

					make_sale_mode_panel() {
						this.$sale_mode_panel = $(`
							<div class="machi-sale-mode-panel" style="padding:12px;background:#e3f2fd;border-radius:6px;margin-bottom:12px">
								<label>${__("POS Sale Mode")}
									<select class="form-control">
										<option value="Store">${__("Store Mode (10%)")}</option>
										<option value="Exhibition">${__("Exhibition Mode (0%)")}</option>
									</select>
								</label>
								<div>${__("Store discount applies only above ₹{0}.", [MIN_BILL_FOR_DISCOUNT])}</div>
							</div>
						`);
						const $pos_app = this.$component.closest(".point-of-sale-app");
						$pos_app.siblings(".machi-sale-mode-panel").remove();
						$pos_app.before(this.$sale_mode_panel);
						this.$sale_mode_panel.find("select").val(get_sale_mode()).on("change", (event) => {
							localStorage.setItem("pos_sale_mode", event.target.value);
							this.update_totals_section(this.events.get_frm());
							frappe.show_alert({
								message: __("Switched to {0} Mode", [get_sale_mode()]),
								indicator: "green",
							}, 3);
						});
					}

					apply_sale_mode_discount(frm) {
						if (!frm?.doc || frm.doc.docstatus !== 0 || this.machi_applying_discount) return;
						const doc = frm.doc;
						const total = (doc.items || []).reduce(
							(sum, item) => sum + flt(item.qty) * flt(item.rate), 0
						) || flt(doc.total);
						const discount = get_sale_mode() === "Store" && total > MIN_BILL_FOR_DISCOUNT ? 10 : 0;
						if (flt(doc.additional_discount_percentage) === discount) return;

						this.machi_applying_discount = true;
						let failed = false;
						Promise.resolve().then(() => frm.set_value("additional_discount_percentage", discount))
							.catch((error) => {
								failed = true;
								console.error("POS sale mode discount failed:", error);
							})
							.finally(() => {
								this.machi_applying_discount = false;
								if (!failed && this.events.get_frm() === frm) {
									this.hide_discount_control(flt(doc.additional_discount_percentage));
									this.update_totals_section(frm);
								}
							});
					}

					update_totals_section(frm) {
						frm = frm || this.events.get_frm();
						this.apply_sale_mode_discount(frm);
						this.$sale_mode_panel?.find("select").val(get_sale_mode());
						super.update_totals_section(frm);
						if (!this.$discount_amount) return;

						const doc = (frm || this.events.get_frm()).doc;

						this.$discount_amount
							.find(".machi-discount-amount")
							.text(
								format_currency(
									flt(doc.discount_amount),
									doc.currency
								)
							);
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
