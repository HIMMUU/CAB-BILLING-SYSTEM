"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const invoices_service_1 = require("./invoices/invoices.service");
const tenant_context_service_1 = require("./common/context/tenant-context.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function main() {
    const prisma = new client_1.PrismaClient();
    const context = new tenant_context_service_1.TenantContextService();
    const service = new invoices_service_1.InvoicesService(prisma, null);
    console.log('Inspecting database data...');
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        console.log('Creating test tenant...');
        tenant = await prisma.tenant.create({
            data: {
                name: 'TRAVEL DREAM',
                companyAddress: 'E57/A,HARI NAGAR EXTN-PART-II\nBADARPUR,NEW DELHI-110044 NEW\nDELHI 110044',
                companyPhone: '9310632440\n9560352484',
                companyEmail: 'traveldream1812@gmail.com',
                companyGst: '07CICPS3802E2ZH',
                companyPan: 'CICPS3802E',
                sacNo: '9966',
                serviceCategory: 'Rent-A-Cab',
                bankName: 'HDFC BANK',
                bankBranch: 'BADARPUR BRANCH',
                bankAccountNo: '50100234567890',
                bankIfsc: 'HDFC0001234',
                bankAccountHolder: 'TRAVEL DREAM',
            },
        });
    }
    else {
        tenant = await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
                companyAddress: 'E57/A,HARI NAGAR EXTN-PART-II\nBADARPUR,NEW DELHI-110044 NEW\nDELHI 110044',
                companyPhone: '9310632440\n9560352484',
                companyEmail: 'traveldream1812@gmail.com',
                companyGst: '07CICPS3802E2ZH',
                companyPan: 'CICPS3802E',
                sacNo: '9966',
                serviceCategory: 'Rent-A-Cab',
                bankName: 'HDFC BANK',
                bankBranch: 'BADARPUR BRANCH',
                bankAccountNo: '50100234567890',
                bankIfsc: 'HDFC0001234',
                bankAccountHolder: 'TRAVEL DREAM',
            },
        });
    }
    let customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id } });
    if (!customer) {
        console.log('Creating test customer...');
        customer = await prisma.customer.create({
            data: {
                tenantId: tenant.id,
                name: 'ITER MOBILITY PRIVATE LIMITED',
                billingAddress: 'PLOT IN KH NO. 16/29 NEAR BY KUNDAN FARM KAPASHER, NEW DELHI',
                phone: '9876543210',
                gstNumber: '07AAHCI2728M1Z9',
                type: 'CORPORATE',
            },
        });
    }
    else {
        customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
                type: 'CORPORATE',
                name: 'ITER MOBILITY PRIVATE LIMITED',
                billingAddress: 'PLOT IN KH NO. 16/29 NEAR BY KUNDAN FARM KAPASHER, NEW DELHI',
                gstNumber: '07AAHCI2728M1Z9',
            },
        });
    }
    let vehicle = await prisma.vehicle.findFirst({ where: { tenantId: tenant.id } });
    if (!vehicle) {
        console.log('Creating test vehicle...');
        vehicle = await prisma.vehicle.create({
            data: {
                tenantId: tenant.id,
                vehicleNumber: 'DL3CA9999',
                vehicleType: 'Sedan',
                model: 'DZIRE 4502',
                seatingCapacity: 5,
                registrationDate: new Date(),
                insuranceExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                fitnessExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                permitExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
    }
    let driver = await prisma.driver.findFirst({ where: { tenantId: tenant.id } });
    if (!driver) {
        console.log('Creating test driver...');
        driver = await prisma.driver.create({
            data: {
                tenantId: tenant.id,
                name: 'MR. RAJ KUMAR',
                mobile: '9999988888',
                licenseNumber: 'DL-1220150045678',
                licenseExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                address: 'Delhi, India',
                emergencyContact: 'None',
            },
        });
    }
    let invoice = await prisma.invoice.findFirst({ where: { tenantId: tenant.id } });
    if (!invoice) {
        console.log('Creating test booking, duty slip, closed trip, and invoice...');
        const booking = await prisma.booking.create({
            data: {
                tenantId: tenant.id,
                bookingNumber: `BK-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
                customerId: customer.id,
                pickupLocation: 'Delhi Airport',
                dropLocation: 'Gurgaon Office',
                pickupDate: new Date(),
                pickupTime: '10:00',
                tripType: 'LOCAL',
                vehicleTypeRequired: 'Sedan',
                status: 'COMPLETED',
                employeeId: '15869976-1',
            },
        });
        const dutySlip = await prisma.dutySlip.create({
            data: {
                tenantId: tenant.id,
                dutySlipNumber: `DS-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
                bookingId: booking.id,
                driverId: driver.id,
                vehicleId: vehicle.id,
                reportingTime: new Date(),
                startKm: 10000,
                endKm: 10168,
                status: 'CLOSED',
            },
        });
        const trip = await prisma.trip.create({
            data: {
                tenantId: tenant.id,
                dutySlipId: dutySlip.id,
                bookingId: booking.id,
                startKm: 10000,
                endKm: 10168,
                totalKm: 168,
                baseFareCharged: 1400.00,
                extraKmCharged: 1232.00,
                extraHoursCharged: 750.00,
                driverAllowance: 300.00,
                nightChargesCharged: 0.00,
                toll: 500.00,
                parking: 0.00,
                stateTaxCharged: 120.00,
                mcdCharged: 0.00,
                totalAmount: 3382.00,
            },
        });
        invoice = await context.runWithContext({ tenantId: tenant.id }, () => service.create({
            tripIds: [trip.id],
            gstType: 'INTRASTATE',
            gstRate: 5,
            invoiceDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        }));
    }
    console.log(`Generating PDF for Invoice: ${invoice.invoiceNumber}...`);
    const pdfBuffer = await context.runWithContext({ tenantId: tenant.id }, () => service.generatePdf(invoice.id));
    const outputPath = path.resolve(__dirname, '..', 'test_invoice.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`Successfully wrote test invoice PDF to: ${outputPath}`);
    await prisma.$disconnect();
}
main().catch((err) => {
    console.error('Error generating test PDF:', err);
});
//# sourceMappingURL=test-pdf.js.map