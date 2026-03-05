frappe.pages['alphax-mis-builder'].on_page_load = function(wrapper){
  // v7 Builder alias (skeleton): route to current designer for now.
  frappe.set_route('alphax-mis-canvas-designer');
};
