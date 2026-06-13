"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const trips_service_1 = require("./trips/trips.service");
async function main() {
    const prisma = new client_1.PrismaClient();
    const tripsService = new trips_service_1.TripsService(prisma);
    console.log('=== VERIFYING UPDATE REFLECT IN INVOICE ===');
    const invoice = await prisma.invoice.findFirst({
        where: {
            customer: {
                name: 'Dream Resorts India',
            },
        },
        include: {
            items: {
                include: {
                    trip: {
                        include: {
                            dutySlip: true,
                        },
                    },
                },
            },
        },
    });
    if (!invoice) {
        console.error('Invoice for Dream Resorts India not found');
        return;
    }
    console.log('Invoice Found:', {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: Number(invoice.totalAmount),
        subtotal: Number(invoice.subtotal),
        toll: Number(invoice.toll),
    });
    const targetItem = invoice.items.find(item => item.trip.dutySlip.dutySlipNumber === 'DS-20260613-8122');
    if (!targetItem) {
        console.error('Target duty slip DS-20260613-8122 not found in this invoice');
        return;
    }
    const targetTrip = targetItem.trip;
    console.log('Target Trip for DS-20260613-8122:', {
        tripId: targetTrip.id,
        baseFare: Number(targetTrip.baseFareCharged),
        toll: Number(targetTrip.toll),
        endKm: Number(targetTrip.endKm),
    });
    console.log('\n--- Simulating updating Closed Duty Slip DS-20260613-8122 (Toll -> 500, EndKM -> 10050) ---');
    await tripsService.closeTrip({
        dutySlipId: targetTrip.dutySlipId,
        endKm: 10050,
        toll: 500,
    });
    const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: {
            items: {
                include: {
                    trip: true,
                },
            },
        },
    });
    console.log('\nRecalculated Invoice details:');
    console.log({
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoiceNumber,
        totalAmount: Number(updatedInvoice.totalAmount),
        subtotal: Number(updatedInvoice.subtotal),
        toll: Number(updatedInvoice.toll),
    });
    const updatedTrip = updatedInvoice.items.find(item => item.trip.id === targetTrip.id).trip;
    console.log('Recalculated Trip details:', {
        tripId: updatedTrip.id,
        baseFare: Number(updatedTrip.baseFareCharged),
        toll: Number(updatedTrip.toll),
        endKm: Number(updatedTrip.endKm),
        totalKm: Number(updatedTrip.totalKm),
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=test-update-duty-slip.js.map