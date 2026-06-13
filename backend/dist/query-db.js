"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const dutySlips = await prisma.dutySlip.findMany({
        include: {
            booking: {
                include: {
                    customer: true,
                },
            },
            trip: true,
        },
    });
    console.log('=== DUTY SLIPS ===');
    for (const ds of dutySlips) {
        console.log({
            id: ds.id,
            number: ds.dutySlipNumber,
            status: ds.status,
            hasBooking: !!ds.booking,
            bookingNumber: ds.booking?.bookingNumber,
            customerId: ds.booking?.customerId,
            customerName: ds.booking?.customer?.name,
            clientType: ds.booking?.customer?.clientType,
            hasTrip: !!ds.trip,
            tripId: ds.trip?.id,
        });
    }
    const trips = await prisma.trip.findMany({
        include: {
            dutySlip: true,
            booking: {
                include: {
                    customer: true,
                },
            },
        },
    });
    console.log('\n=== TRIPS ===');
    for (const t of trips) {
        console.log({
            id: t.id,
            dutySlipNumber: t.dutySlip?.dutySlipNumber,
            dutySlipStatus: t.dutySlip?.status,
            customerName: t.booking?.customer?.name,
            invoiceItemsCount: await prisma.invoiceItem.count({ where: { tripId: t.id } }),
        });
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=query-db.js.map