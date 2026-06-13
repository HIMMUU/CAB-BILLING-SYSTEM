"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        console.log('--- STARTING DIRECT FLOW TEST ---');
        const customer = await prisma.customer.findFirst({
            where: { name: 'Acme Corp' }
        });
        const driver = await prisma.driver.findFirst({
            where: { status: 'AVAILABLE' }
        }) || await prisma.driver.findFirst();
        const vehicle = await prisma.vehicle.findFirst({
            where: { status: 'AVAILABLE' }
        }) || await prisma.vehicle.findFirst();
        if (!customer || !driver || !vehicle) {
            throw new Error('Required entities not found. Run seed first.');
        }
        console.log(`Using Customer: ${customer.name} (${customer.id})`);
        console.log(`Using Driver: ${driver.name} (${driver.id})`);
        console.log(`Using Vehicle: ${vehicle.vehicleNumber} (${vehicle.id})`);
        console.log('\nCreating duty slip without booking...');
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const bookingNumber = `BK-${dateStr}-${randomDigits}`;
        const reportingTime = new Date();
        const pickupTime = `${String(reportingTime.getHours()).padStart(2, '0')}:${String(reportingTime.getMinutes()).padStart(2, '0')}`;
        const result = await prisma.$transaction(async (tx) => {
            const newBooking = await tx.booking.create({
                data: {
                    tenantId: customer.tenantId,
                    bookingNumber,
                    customerId: customer.id,
                    pickupLocation: 'Direct Duty Slip Pickup',
                    dropLocation: 'Direct Duty Slip Drop',
                    pickupDate: new Date(),
                    pickupTime,
                    tripType: 'LOCAL',
                    vehicleTypeRequired: vehicle.vehicleType,
                    status: 'ASSIGNED',
                },
            });
            const newAssignment = await tx.assignment.create({
                data: {
                    tenantId: customer.tenantId,
                    bookingId: newBooking.id,
                    driverId: driver.id,
                    vehicleId: vehicle.id,
                    status: 'ACTIVE',
                },
            });
            await tx.driver.update({
                where: { id: driver.id },
                data: { status: 'ON_TRIP' },
            });
            await tx.vehicle.update({
                where: { id: vehicle.id },
                data: { status: 'ON_TRIP' },
            });
            const dutySlipNumber = `DS-${dateStr}-${randomDigits}`;
            const newSlip = await tx.dutySlip.create({
                data: {
                    tenantId: customer.tenantId,
                    dutySlipNumber,
                    bookingId: newBooking.id,
                    driverId: driver.id,
                    vehicleId: vehicle.id,
                    reportingTime: new Date(),
                    startKm: 10000,
                    status: 'DRAFT',
                },
            });
            return newSlip;
        });
        console.log(`Duty slip created: ${result.dutySlipNumber} (${result.id})`);
        console.log('\nPatching duty slip details (endKm, times, etc.)...');
        const updatedSlip = await prisma.dutySlip.update({
            where: { id: result.id },
            data: {
                endKm: 10085,
                startDateTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
                endDateTime: new Date(),
                toll: 150,
                parking: 80,
                status: 'FILLED',
            }
        });
        console.log(`Duty slip updated: status is ${updatedSlip.status}`);
        console.log('\nClosing duty slip & creating trip record...');
        const trip = await prisma.$transaction(async (tx) => {
            const baseFareCharged = 1500;
            const extraKmCharged = 0;
            const extraHoursCharged = 0;
            const toll = 150;
            const parking = 80;
            const stateTax = 0;
            const mcd = 0;
            const driverAllowance = 0;
            const nightChargesCharged = 0;
            const miscChargesCharged = 0;
            const totalAmount = baseFareCharged + toll + parking;
            const newTrip = await tx.trip.create({
                data: {
                    tenantId: customer.tenantId,
                    dutySlipId: updatedSlip.id,
                    bookingId: updatedSlip.bookingId,
                    startKm: updatedSlip.startKm,
                    endKm: 10085,
                    totalKm: 85,
                    toll,
                    parking,
                    driverAllowance,
                    extraCharges: miscChargesCharged,
                    baseFareCharged,
                    extraKmCharged,
                    extraHoursCharged,
                    nightChargesCharged,
                    miscChargesCharged,
                    totalAmount,
                    startDateTime: updatedSlip.startDateTime,
                    endDateTime: updatedSlip.endDateTime,
                    totalHours: 4,
                    totalDays: 1,
                    stateTaxCharged: stateTax,
                    mcdCharged: mcd,
                },
            });
            await tx.dutySlip.update({
                where: { id: updatedSlip.id },
                data: {
                    status: 'CLOSED',
                    endKm: 10085,
                    toll,
                    parking,
                    stateTax,
                    mcd,
                },
            });
            await tx.booking.update({
                where: { id: updatedSlip.bookingId },
                data: { status: 'COMPLETED' },
            });
            await tx.driver.update({
                where: { id: updatedSlip.driverId },
                data: { status: 'AVAILABLE' },
            });
            await tx.vehicle.update({
                where: { id: updatedSlip.vehicleId },
                data: { status: 'AVAILABLE' },
            });
            return newTrip;
        });
        console.log(`Trip created successfully: ${trip.id}`);
        console.log('\nGenerating Invoice from the trip...');
        const invoiceNumber = `INV-${Date.now()}`;
        const invoice = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    tenantId: customer.tenantId,
                    invoiceNumber,
                    customerId: customer.id,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                    status: 'DRAFT',
                    baseFare: trip.baseFareCharged,
                    extraKmCharges: trip.extraKmCharged,
                    toll: trip.toll,
                    parking: trip.parking,
                    stateTax: trip.stateTaxCharged,
                    mcd: trip.mcdCharged,
                    nightCharges: trip.nightChargesCharged,
                    miscCharges: trip.extraCharges,
                    subtotal: trip.totalAmount,
                    cgstRate: 2.5,
                    cgstAmount: Number(trip.totalAmount) * 0.025,
                    sgstRate: 2.5,
                    sgstAmount: Number(trip.totalAmount) * 0.025,
                    igstRate: 0,
                    igstAmount: 0,
                    totalTax: Number(trip.totalAmount) * 0.05,
                    totalAmount: Number(trip.totalAmount) * 1.05,
                },
            });
            await tx.invoiceItem.create({
                data: {
                    tenantId: customer.tenantId,
                    invoiceId: newInvoice.id,
                    tripId: trip.id,
                    description: `Consolidated charges for Duty Slip ${updatedSlip.dutySlipNumber}`,
                    amount: trip.totalAmount,
                },
            });
            return newInvoice;
        });
        console.log(`Invoice created successfully: ${invoice.invoiceNumber} (${invoice.id})`);
        console.log('--- DIRECT FLOW TEST COMPLETED SUCCESSFULLY ---');
    }
    catch (err) {
        console.error('Test failed with error:', err);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=test-direct-flow.js.map