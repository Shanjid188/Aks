
/**
 * Frontend RBAC helpers — mirrors server/src/lib/permissions.ts.
 *
 * The logged-in admin's permission list comes from the login / me response.
 * These helpers drive the sidebar, page guards and action buttons (UX only —
 * the backend enforces every permission for real).
 */

export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionModule {
  module: string;
  label: string;
  icon: string;
  permissions: PermissionDef[];
}

export const PERMISSION_CATALOG: PermissionModule[] = [
  { module: "dashboard", label: "Dashboard", icon: "home", permissions: [ { key: "dashboard.view", label: "View Dashboard" }, { key: "dashboard.analytics", label: "View Analytics" } ] },
  { module: "pos", label: "POS", icon: "shopping-cart", permissions: [ { key: "pos.view", label: "View POS" }, { key: "pos.sale", label: "Create POS Sale" }, { key: "pos.hold", label: "Hold / Resume Sale" }, { key: "pos.print", label: "Print Receipt" } ] },
  { module: "orders", label: "Orders", icon: "package", permissions: [ { key: "orders.view", label: "View Orders" }, { key: "orders.details", label: "View Details" }, { key: "orders.create", label: "Create Order" }, { key: "orders.edit", label: "Edit Order" }, { key: "orders.status", label: "Change Status" }, { key: "orders.cancel", label: "Cancel Order" }, { key: "orders.delete", label: "Delete Order" }, { key: "orders.payment", label: "Update Payment" }, { key: "orders.print", label: "Print Invoice" }, { key: "orders.export", label: "Export Orders" } ] },
  { module: "products", label: "Products", icon: "shirt", permissions: [ { key: "products.view", label: "View Products" }, { key: "products.create", label: "Create Product" }, { key: "products.edit", label: "Edit Product" }, { key: "products.delete", label: "Delete Product" }, { key: "products.upload", label: "Upload Images" }, { key: "products.export", label: "Export Products" } ] },
  { module: "inventory", label: "Inventory", icon: "boxes", permissions: [ { key: "inventory.view", label: "View Inventory" }, { key: "inventory.adjust_stock", label: "Adjust Stock" }, { key: "inventory.export", label: "Export Inventory" } ] },
  { module: "customers", label: "Customers", icon: "users", permissions: [ { key: "customers.view", label: "View Customers" }, { key: "customers.details", label: "View Details" }, { key: "customers.edit", label: "Edit Customer" }, { key: "customers.export", label: "Export Customers" } ] },
  { module: "suppliers", label: "Suppliers", icon: "truck", permissions: [ { key: "suppliers.view", label: "View Suppliers" }, { key: "suppliers.create", label: "Create Supplier" }, { key: "suppliers.edit", label: "Edit Supplier" }, { key: "suppliers.delete", label: "Delete Supplier" } ] },
  { module: "purchases", label: "Purchases", icon: "receipt", permissions: [ { key: "purchases.view", label: "View Purchases" }, { key: "purchases.create", label: "Create Purchase" }, { key: "purchases.edit", label: "Edit Purchase" }, { key: "purchases.receive", label: "Receive Purchase" }, { key: "purchases.print", label: "Print Purchase" } ] },
  { module: "expenses", label: "Expenses", icon: "wallet", permissions: [ { key: "expenses.view", label: "View Expenses" }, { key: "expenses.create", label: "Create Expense" }, { key: "expenses.edit", label: "Edit Expense" }, { key: "expenses.delete", label: "Delete Expense" } ] },
  { module: "coupons", label: "Coupons", icon: "ticket", permissions: [ { key: "coupons.view", label: "View Coupons" }, { key: "coupons.create", label: "Create Coupon" }, { key: "coupons.edit", label: "Edit Coupon" }, { key: "coupons.delete", label: "Delete Coupon" } ] },
  { module: "reviews", label: "Reviews", icon: "star", permissions: [ { key: "reviews.view", label: "View Reviews" }, { key: "reviews.moderate", label: "Moderate Reviews" } ] },
  { module: "promotions", label: "Promotions", icon: "megaphone", permissions: [ { key: "promotions.view", label: "View Promotions" }, { key: "promotions.create", label: "Create Promotion" }, { key: "promotions.edit", label: "Edit Promotion" }, { key: "promotions.delete", label: "Delete Promotion" } ] },
  { module: "slides", label: "Hero Slides", icon: "image", permissions: [ { key: "slides.view", label: "View Slides" }, { key: "slides.create", label: "Create Slide" }, { key: "slides.edit", label: "Edit Slide" }, { key: "slides.delete", label: "Delete Slide" } ] },
  { module: "storefront", label: "Storefront", icon: "store", permissions: [ { key: "storefront.view", label: "View Settings" }, { key: "storefront.edit", label: "Edit Settings" } ] },
  { module: "invoices", label: "Invoices", icon: "file-text", permissions: [ { key: "invoices.view", label: "View Invoices" }, { key: "invoices.print", label: "Print Invoice" }, { key: "invoices.export", label: "Export Invoices" } ] },
  { module: "packaging", label: "Packaging", icon: "box", permissions: [ { key: "packaging.view", label: "View Packaging" }, { key: "packaging.print", label: "Print Slip" }, { key: "packaging.pack", label: "Mark Packed" } ] },
  { module: "reports", label: "Reports", icon: "bar-chart", permissions: [ { key: "reports.view", label: "View Reports" }, { key: "reports.export", label: "Export Reports" } ] },
  { module: "refunds", label: "Returns & Refunds", icon: "rotate-ccw", permissions: [ { key: "refunds.view", label: "View Returns" }, { key: "refunds.create", label: "Create Return" }, { key: "refunds.approve", label: "Approve / Reject" }, { key: "refunds.refund", label: "Process Refund" } ] },
  { module: "shipping", label: "Shipping & Delivery", icon: "truck", permissions: [ { key: "shipping.view", label: "View Shipping" }, { key: "shipping.update", label: "Update Status" } ] },
  { module: "admins", label: "Admin Users", icon: "user-cog", permissions: [ { key: "admins.view", label: "View Admins" }, { key: "admins.create", label: "Create Admin" }, { key: "admins.edit", label: "Edit Admin" }, { key: "admins.disable", label: "Disable Admin" }, { key: "admins.delete", label: "Delete Admin" } ] },
  { module: "roles", label: "Roles & Permissions", icon: "shield-check", permissions: [ { key: "roles.view", label: "View Roles" }, { key: "roles.create", label: "Create Role" }, { key: "roles.edit", label: "Edit Role" }, { key: "roles.delete", label: "Delete Role" }, { key: "roles.permissions", label: "Manage Permissions" } ] },
  { module: "settings", label: "Settings", icon: "settings", permissions: [ { key: "settings.view", label: "View Settings" }, { key: "settings.edit", label: "Edit Settings" }, { key: "settings.manage", label: "Manage Settings" } ] },
  { module: "activity_logs", label: "Activity Logs", icon: "list", permissions: [ { key: "activity_logs.view", label: "View Logs" }, { key: "activity_logs.export", label: "Export Logs" } ] },
];

export const PERM = {
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_ANALYTICS: 'dashboard.analytics',
  POS_VIEW: 'pos.view',
  POS_SALE: 'pos.sale',
  POS_HOLD: 'pos.hold',
  POS_PRINT: 'pos.print',
  ORDERS_VIEW: 'orders.view',
  ORDERS_DETAILS: 'orders.details',
  ORDERS_CREATE: 'orders.create',
  ORDERS_EDIT: 'orders.edit',
  ORDERS_STATUS: 'orders.status',
  ORDERS_CANCEL: 'orders.cancel',
  ORDERS_DELETE: 'orders.delete',
  ORDERS_PAYMENT: 'orders.payment',
  ORDERS_PRINT: 'orders.print',
  ORDERS_EXPORT: 'orders.export',
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  PRODUCTS_UPLOAD: 'products.upload',
  PRODUCTS_EXPORT: 'products.export',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST_STOCK: 'inventory.adjust_stock',
  INVENTORY_EXPORT: 'inventory.export',
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_DETAILS: 'customers.details',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_EXPORT: 'customers.export',
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_EDIT: 'suppliers.edit',
  SUPPLIERS_DELETE: 'suppliers.delete',
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_EDIT: 'purchases.edit',
  PURCHASES_RECEIVE: 'purchases.receive',
  PURCHASES_PRINT: 'purchases.print',
  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_CREATE: 'expenses.create',
  EXPENSES_EDIT: 'expenses.edit',
  EXPENSES_DELETE: 'expenses.delete',
  COUPONS_VIEW: 'coupons.view',
  COUPONS_CREATE: 'coupons.create',
  COUPONS_EDIT: 'coupons.edit',
  COUPONS_DELETE: 'coupons.delete',
  REVIEWS_VIEW: 'reviews.view',
  REVIEWS_MODERATE: 'reviews.moderate',
  PROMOTIONS_VIEW: 'promotions.view',
  PROMOTIONS_CREATE: 'promotions.create',
  PROMOTIONS_EDIT: 'promotions.edit',
  PROMOTIONS_DELETE: 'promotions.delete',
  SLIDES_VIEW: 'slides.view',
  SLIDES_CREATE: 'slides.create',
  SLIDES_EDIT: 'slides.edit',
  SLIDES_DELETE: 'slides.delete',
  STOREFRONT_VIEW: 'storefront.view',
  STOREFRONT_EDIT: 'storefront.edit',
  INVOICES_VIEW: 'invoices.view',
  INVOICES_PRINT: 'invoices.print',
  INVOICES_EXPORT: 'invoices.export',
  PACKAGING_VIEW: 'packaging.view',
  PACKAGING_PRINT: 'packaging.print',
  PACKAGING_PACK: 'packaging.pack',
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  REFUNDS_VIEW: 'refunds.view',
  REFUNDS_CREATE: 'refunds.create',
  REFUNDS_APPROVE: 'refunds.approve',
  REFUNDS_REFUND: 'refunds.refund',
  SHIPPING_VIEW: 'shipping.view',
  SHIPPING_UPDATE: 'shipping.update',
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',
  ROLES_PERMISSIONS: 'roles.permissions',
  ADMINS_VIEW: 'admins.view',
  ADMINS_CREATE: 'admins.create',
  ADMINS_EDIT: 'admins.edit',
  ADMINS_DISABLE: 'admins.disable',
  ADMINS_DELETE: 'admins.delete',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_MANAGE: 'settings.manage',
  ACTIVITY_LOGS_VIEW: 'activity_logs.view',
  ACTIVITY_LOGS_EXPORT: 'activity_logs.export',
} as const;

/** True when the admin holds `permission` (Super Admin passes everything). */
export function hasPerm(
  admin: { isSuper?: boolean; permissions?: string[] } | null | undefined,
  permission: string
): boolean {
  if (!admin) return false;
  if (admin.isSuper) return true;
  return (admin.permissions ?? []).includes(permission);
}

/** True when the admin holds EVERY permission in the list. */
export function hasAllPerms(
  admin: { isSuper?: boolean; permissions?: string[] } | null | undefined,
  permissions: string[]
): boolean {
  return permissions.every((p) => hasPerm(admin, p));
}

