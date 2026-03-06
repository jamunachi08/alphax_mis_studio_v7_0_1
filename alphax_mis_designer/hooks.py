app_name = "alphax_mis_designer"
app_title = "AlphaX MIS Studio"
app_publisher = "Neotec Integrated Solutions"
app_description = "Template-driven MIS reporting + BI endpoints + dashboard UI (ERPNext v15)"
app_email = "support@neotec.example"
app_license = "MIT"

doctype_js = {
    "MIS Report Template": "public/js/mis_report_template.js"
}

app_include_css = ["/assets/alphax_mis_designer/css/alphax_mis_studio.css",
    "/assets/alphax_mis_designer/css/alphax_mis_tour.css",
    "/assets/alphax_mis_designer/css/alphax_mis_builder.css",
    "/assets/alphax_mis_designer/css/alphax_mis_board.css",
    "/assets/alphax_mis_designer/css/alphax_mis_canvas.css",
    "/assets/alphax_mis_designer/css/alphax_mis_dashboard.css"
]

app_include_js = [
    "/assets/alphax_mis_designer/js/alphax_mis_help.js",
    "/assets/alphax_mis_designer/css/alphax_mis_canvas_designer.css",
    "/assets/alphax_mis_designer/css/alphax_mis_print.css",
    "/assets/alphax_mis_designer/css/alphax_mis_canvas_v62.css"
]

doctype_js.update({'MIS Visual Template': 'public/js/mis_visual_template.js'})
