"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolePermissions = exports.Permission = void 0;
var Permission;
(function (Permission) {
    Permission["MANAGE_TENANTS"] = "MANAGE_TENANTS";
    Permission["MANAGE_USERS"] = "MANAGE_USERS";
    Permission["CUSTOMER_CRUD"] = "CUSTOMER_CRUD";
    Permission["CUSTOMER_VIEW"] = "CUSTOMER_VIEW";
    Permission["DRIVER_CRUD"] = "DRIVER_CRUD";
    Permission["DRIVER_VIEW"] = "DRIVER_VIEW";
    Permission["VEHICLE_CRUD"] = "VEHICLE_CRUD";
    Permission["VEHICLE_VIEW"] = "VEHICLE_VIEW";
    Permission["CREATE_BOOKING"] = "CREATE_BOOKING";
    Permission["ASSIGN_RESOURCES"] = "ASSIGN_RESOURCES";
    Permission["GENERATE_DUTY_SLIP"] = "GENERATE_DUTY_SLIP";
    Permission["CLOSE_TRIP"] = "CLOSE_TRIP";
    Permission["INVOICE_CRUD"] = "INVOICE_CRUD";
    Permission["RECORD_PAYMENT"] = "RECORD_PAYMENT";
    Permission["FINANCIAL_REPORTS"] = "FINANCIAL_REPORTS";
    Permission["OPERATIONS_REPORTS"] = "OPERATIONS_REPORTS";
})(Permission || (exports.Permission = Permission = {}));
exports.RolePermissions = {
    SUPER_ADMIN: Object.values(Permission),
    OPERATOR_ADMIN: [
        Permission.MANAGE_USERS,
        Permission.CUSTOMER_CRUD,
        Permission.CUSTOMER_VIEW,
        Permission.DRIVER_CRUD,
        Permission.DRIVER_VIEW,
        Permission.VEHICLE_CRUD,
        Permission.VEHICLE_VIEW,
        Permission.CREATE_BOOKING,
        Permission.ASSIGN_RESOURCES,
        Permission.GENERATE_DUTY_SLIP,
        Permission.CLOSE_TRIP,
        Permission.INVOICE_CRUD,
        Permission.RECORD_PAYMENT,
        Permission.FINANCIAL_REPORTS,
        Permission.OPERATIONS_REPORTS,
    ],
    DISPATCHER: [
        Permission.CUSTOMER_VIEW,
        Permission.DRIVER_CRUD,
        Permission.DRIVER_VIEW,
        Permission.VEHICLE_CRUD,
        Permission.VEHICLE_VIEW,
        Permission.CREATE_BOOKING,
        Permission.ASSIGN_RESOURCES,
        Permission.GENERATE_DUTY_SLIP,
        Permission.CLOSE_TRIP,
        Permission.OPERATIONS_REPORTS,
    ],
    BILLING_EXECUTIVE: [
        Permission.CUSTOMER_VIEW,
        Permission.DRIVER_VIEW,
        Permission.VEHICLE_VIEW,
        Permission.CLOSE_TRIP,
        Permission.INVOICE_CRUD,
        Permission.RECORD_PAYMENT,
        Permission.FINANCIAL_REPORTS,
    ],
};
//# sourceMappingURL=permissions.js.map