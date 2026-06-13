"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        const tenants = await prisma.tenant.findMany();
        console.log("=== TENANTS ===");
        console.log(JSON.stringify(tenants.map(t => ({ id: t.id, name: t.name })), null, 2));
        const customers = await prisma.customer.findMany();
        console.log("\n=== CUSTOMERS ===");
        console.log(JSON.stringify(customers.map(c => ({ id: c.id, name: c.name, tenantId: c.tenantId, clientType: c.clientType, status: c.status })), null, 2));
        const bookings = await prisma.booking.findMany({
            include: { customer: true }
        });
        console.log("\n=== BOOKINGS ===");
        console.log(JSON.stringify(bookings.map(b => ({ id: b.id, bookingNumber: b.bookingNumber, customerId: b.customerId, customerName: b.customer?.name, tenantId: b.tenantId, status: b.status })), null, 2));
        const dutySlips = await prisma.dutySlip.findMany({
            include: { booking: { include: { customer: true } } }
        });
        console.log("\n=== DUTY SLIPS ===");
        console.log(JSON.stringify(dutySlips.map(d => ({ id: d.id, dutySlipNumber: d.dutySlipNumber, status: d.status, tenantId: d.tenantId, bookingId: d.bookingId, customerName: d.booking?.customer?.name })), null, 2));
        const trips = await prisma.trip.findMany({
            include: {
                booking: { include: { customer: true } },
                dutySlip: true,
                invoiceItems: true
            }
        });
        console.log("\n=== TRIPS ===");
        console.log(JSON.stringify(trips.map(t => ({ id: t.id, dutySlipNumber: t.dutySlip?.dutySlipNumber, customerName: t.booking?.customer?.name, customerId: t.booking?.customerId, tenantId: t.tenantId, invoiceItemsCount: t.invoiceItems.length })), null, 2));
    }
    catch (err) {
        console.error(err);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=db_query.js.map