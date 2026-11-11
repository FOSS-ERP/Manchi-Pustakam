app_name = "machi_coutomizations"
app_title = "Machi Coutomizations"
app_publisher = "Sathwik Guduguntla"
app_description = "Customizations for Machi"
app_email = "sathwik.guduguntla@fosserp.com"
app_license = "mit"

# required_apps = ["erpnext"]

page_js = {
    "point-of-sale": "public/js/pos_discount.js"
}
# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "machi_coutomizations",
# 		"logo": "/assets/machi_coutomizations/logo.png",
# 		"title": "Machi Coutomizations",
# 		"route": "/machi_coutomizations",
# 		"has_permission": "machi_coutomizations.api.permission.has_app_permission",
# 	}
# ]

# The dock, the rail down the left of the desk, is a document rather than a hook. Author it in
# Manage Dock on a developer-mode site and press Export to App, and it is written to
# `machi_coutomizations/dock/machi_coutomizations/machi_coutomizations.json` for git to carry. An app that ships none has no
# rail: its sidebar gets a switcher in the header instead.
#
# A companion app, one that extends a host app rather than standing on its own, says so with
# `mount_on` on that same record, and its entries are appended to the host's rail. Mounting keeps
# the companion off the apps screen, so it takes precedence over any add_to_apps_screen above.

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/machi_coutomizations/css/machi_coutomizations.css"
# app_include_js = "/assets/machi_coutomizations/js/machi_coutomizations.js"

# include js, css files in header of web template
# web_include_css = "/assets/machi_coutomizations/css/machi_coutomizations.css"
# web_include_js = "/assets/machi_coutomizations/js/machi_coutomizations.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "machi_coutomizations/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_kanban_js = {"doctype" : "public/js/doctype_kanban.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "machi_coutomizations/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "machi_coutomizations.utils.jinja_methods",
# 	"filters": "machi_coutomizations.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "machi_coutomizations.install.before_install"
# after_install = "machi_coutomizations.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "machi_coutomizations.uninstall.before_uninstall"
# after_uninstall = "machi_coutomizations.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "machi_coutomizations.utils.before_app_install"
# after_app_install = "machi_coutomizations.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "machi_coutomizations.utils.before_app_uninstall"
# after_app_uninstall = "machi_coutomizations.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "machi_coutomizations.build.after_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "machi_coutomizations.notifications.get_notification_config"

# Awesome Bar
# -----------
# Extra search results: list of dicts with label, description, route, index.
# route: ["List", "ToDo"], "/desk/docs/some/page", or "https://example.com"
# awesomebar_search = ["machi_coutomizations.search.awesomebar_results"]

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"machi_coutomizations.tasks.all"
# 	],
# 	"daily": [
# 		"machi_coutomizations.tasks.daily"
# 	],
# 	"hourly": [
# 		"machi_coutomizations.tasks.hourly"
# 	],
# 	"weekly": [
# 		"machi_coutomizations.tasks.weekly"
# 	],
# 	"monthly": [
# 		"machi_coutomizations.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "machi_coutomizations.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "machi_coutomizations.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "machi_coutomizations.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "machi_coutomizations.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["machi_coutomizations.utils.before_request"]
# after_request = ["machi_coutomizations.utils.after_request"]

# Job Events
# ----------
# before_job = ["machi_coutomizations.utils.before_job"]
# after_job = ["machi_coutomizations.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"machi_coutomizations.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []


# Permit zero stock valuation only on POS invoice transaction rows.
doc_events = {
    "POS Invoice": {
        "before_validate": "machi_coutomizations.pos_discount.prepare_pos_items",
    }
}


extend_doctype_class = {
    "POS Invoice": ["machi_coutomizations.pos_rounding.POSRoundingMixin"],
}
