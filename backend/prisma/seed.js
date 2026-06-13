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
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Starting database seeding...');
    console.log('Cleaning existing data...');
    await prisma.auditLog.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.dutySlip.deleteMany({});
    await prisma.assignment.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.driverDocument.deleteMany({});
    await prisma.driver.deleteMany({});
    await prisma.taxConfiguration.deleteMany({});
    await prisma.rateCard.deleteMany({});
    await prisma.vehicleCategory.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});
    const passwordHash = await bcrypt.hash('Password@123', 10);
    console.log('Seeding tenants...');
    const tenantAcme = await prisma.tenant.create({
        data: {
            name: 'Acme Cabs',
            domain: 'acme.cabbs.local',
            logoUrl: 'https://placehold.co/200x200?text=Acme+Cabs',
        },
    });
    const tenantExpress = await prisma.tenant.create({
        data: {
            name: 'Express Travel',
            domain: 'express.cabbs.local',
            logoUrl: 'https://placehold.co/200x200?text=Express+Travel',
        },
    });
    const tenantTdh = await prisma.tenant.create({
        data: {
            name: 'Travel Dream Holiday',
            domain: 'traveldreamholiday.com',
            logoUrl: '/logo.png',
        },
    });
    console.log(`Created tenants: ${tenantAcme.name} (${tenantAcme.id}), ${tenantExpress.name} (${tenantExpress.id}), ${tenantTdh.name} (${tenantTdh.id})`);
    console.log('Seeding vehicle categories...');
    const catSedan = await prisma.vehicleCategory.create({ data: { name: 'Sedan' } });
    const catSuv = await prisma.vehicleCategory.create({ data: { name: 'SUV' } });
    const catMuv = await prisma.vehicleCategory.create({ data: { name: 'MUV' } });
    const catLuxury = await prisma.vehicleCategory.create({ data: { name: 'Luxury' } });
    const catTempo = await prisma.vehicleCategory.create({ data: { name: 'Tempo Traveller' } });
    const catBus = await prisma.vehicleCategory.create({ data: { name: 'Bus' } });
    console.log('Seeding tax configurations...');
    await prisma.taxConfiguration.create({
        data: {
            tenantId: tenantAcme.id,
            taxName: 'GST (Local Cabs)',
            cgst: 2.50,
            sgst: 2.50,
            igst: 5.00,
            isActive: true,
            effectiveFrom: new Date('2026-01-01'),
        },
    });
    await prisma.taxConfiguration.create({
        data: {
            tenantId: tenantTdh.id,
            taxName: 'GST (Goa Travel)',
            cgst: 2.50,
            sgst: 2.50,
            igst: 5.00,
            isActive: true,
            effectiveFrom: new Date('2026-01-01'),
        },
    });
    console.log('Seeding users...');
    const superAdmin = await prisma.user.create({
        data: {
            email: 'superadmin@cabbs.local',
            passwordHash,
            firstName: 'Super',
            lastName: 'Admin',
            role: client_1.UserRole.SUPER_ADMIN,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const acmeAdmin = await prisma.user.create({
        data: {
            tenantId: tenantAcme.id,
            email: 'admin@acme.cabbs.local',
            passwordHash,
            firstName: 'Acme',
            lastName: 'Admin',
            role: client_1.UserRole.OPERATOR_ADMIN,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const acmeDispatcher = await prisma.user.create({
        data: {
            tenantId: tenantAcme.id,
            email: 'dispatcher@acme.cabbs.local',
            passwordHash,
            firstName: 'Acme',
            lastName: 'Dispatcher',
            role: client_1.UserRole.DISPATCHER,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const acmeBilling = await prisma.user.create({
        data: {
            tenantId: tenantAcme.id,
            email: 'billing@acme.cabbs.local',
            passwordHash,
            firstName: 'Acme',
            lastName: 'Billing',
            role: client_1.UserRole.BILLING_EXECUTIVE,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const expressAdmin = await prisma.user.create({
        data: {
            tenantId: tenantExpress.id,
            email: 'admin@express.cabbs.local',
            passwordHash,
            firstName: 'Express',
            lastName: 'Admin',
            role: client_1.UserRole.OPERATOR_ADMIN,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const tdhAdmin = await prisma.user.create({
        data: {
            tenantId: tenantTdh.id,
            email: 'staff@traveldreamholiday.com',
            passwordHash,
            firstName: 'TDH',
            lastName: 'Staff',
            role: client_1.UserRole.OPERATOR_ADMIN,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    console.log('Seeding users completed.');
    console.log('Seeding customers...');
    const customerAcmeCorp = await prisma.customer.create({
        data: {
            tenantId: tenantAcme.id,
            name: 'Acme Corp',
            companyName: 'Acme Logistics Pvt Ltd',
            type: client_1.CustomerType.CORPORATE,
            gstNumber: '07AAAAA1111A1Z1',
            email: 'finance@acme.com',
            phone: '+919876543210',
            billingAddress: '123 Business Tower, Delhi, India',
            creditLimit: 50000.00,
            paymentTerms: 'Net 30',
            status: 'ACTIVE',
        },
    });
    const customerJane = await prisma.customer.create({
        data: {
            tenantId: tenantAcme.id,
            name: 'Jane Smith',
            type: client_1.CustomerType.INDIVIDUAL,
            email: 'janesmith@gmail.com',
            phone: '+919999988888',
            billingAddress: 'Sector 15, Gurgaon, India',
            creditLimit: 0.00,
            paymentTerms: 'Immediate',
            status: 'ACTIVE',
        },
    });
    const customerTdhCorp = await prisma.customer.create({
        data: {
            tenantId: tenantTdh.id,
            name: 'Dream Resorts India',
            companyName: 'Dream Resorts & Leisure Group',
            type: client_1.CustomerType.CORPORATE,
            gstNumber: '07AAAAA2222B2Z2',
            email: 'bookings@dreamresorts.com',
            phone: '+919811122233',
            billingAddress: '55 Luxury Beach Road, Goa, India',
            creditLimit: 75000.00,
            paymentTerms: 'Net 15',
            status: 'ACTIVE',
        },
    });
    const customerTdhGuest = await prisma.customer.create({
        data: {
            tenantId: tenantTdh.id,
            name: 'Alex Johnson',
            type: client_1.CustomerType.INDIVIDUAL,
            email: 'alex.j@hotmail.com',
            phone: '+919555566666',
            billingAddress: 'Greenwood Apartments, Bangalore, India',
            creditLimit: 0.00,
            paymentTerms: 'Immediate',
            status: 'ACTIVE',
        },
    });
    console.log('Seeding customers completed.');
    console.log('Seeding rate cards...');
    await prisma.rateCard.create({
        data: {
            tenantId: tenantAcme.id,
            customerId: customerAcmeCorp.id,
            clientType: 'Company',
            vehicleCategoryId: catSedan.id,
            halfDayRate: 1000.00,
            fullDayRate: 1800.00,
            includedKm: 80.00,
            extraKmRate: 12.00,
            extraHourRate: 100.00,
            minKmPerDay: 250.00,
            outstationRatePerKm: 13.00,
            driverAllowance: 250.00,
            nightCharge: 200.00,
            nightStartTime: '23:00',
            nightEndTime: '05:00',
            effectiveFrom: new Date('2026-01-01'),
            status: 'ACTIVE',
        },
    });
    await prisma.rateCard.create({
        data: {
            tenantId: tenantAcme.id,
            customerId: customerAcmeCorp.id,
            clientType: 'Company',
            vehicleCategoryId: catSuv.id,
            halfDayRate: 1400.00,
            fullDayRate: 2400.00,
            includedKm: 80.00,
            extraKmRate: 18.00,
            extraHourRate: 150.00,
            minKmPerDay: 250.00,
            outstationRatePerKm: 17.00,
            driverAllowance: 250.00,
            nightCharge: 200.00,
            nightStartTime: '23:00',
            nightEndTime: '05:00',
            effectiveFrom: new Date('2026-01-01'),
            status: 'ACTIVE',
        },
    });
    await prisma.rateCard.create({
        data: {
            tenantId: tenantAcme.id,
            customerId: null,
            clientType: 'Individual',
            vehicleCategoryId: catSedan.id,
            halfDayRate: 1100.00,
            fullDayRate: 1900.00,
            includedKm: 80.00,
            extraKmRate: 14.00,
            extraHourRate: 120.00,
            minKmPerDay: 250.00,
            outstationRatePerKm: 14.00,
            driverAllowance: 250.00,
            nightCharge: 200.00,
            nightStartTime: '23:00',
            nightEndTime: '05:00',
            effectiveFrom: new Date('2026-01-01'),
            status: 'ACTIVE',
        },
    });
    await prisma.rateCard.create({
        data: {
            tenantId: tenantTdh.id,
            customerId: customerTdhCorp.id,
            clientType: 'Travel Company',
            vehicleCategoryId: catSedan.id,
            halfDayRate: 900.00,
            fullDayRate: 1600.00,
            includedKm: 80.00,
            extraKmRate: 11.00,
            extraHourRate: 90.00,
            minKmPerDay: 250.00,
            outstationRatePerKm: 12.00,
            driverAllowance: 300.00,
            nightCharge: 250.00,
            nightStartTime: '23:00',
            nightEndTime: '05:00',
            effectiveFrom: new Date('2026-01-01'),
            status: 'ACTIVE',
        },
    });
    await prisma.rateCard.create({
        data: {
            tenantId: tenantTdh.id,
            customerId: customerTdhCorp.id,
            clientType: 'Travel Company',
            vehicleCategoryId: catSuv.id,
            halfDayRate: 1300.00,
            fullDayRate: 2200.00,
            includedKm: 80.00,
            extraKmRate: 16.00,
            extraHourRate: 140.00,
            minKmPerDay: 250.00,
            outstationRatePerKm: 16.00,
            driverAllowance: 300.00,
            nightCharge: 250.00,
            nightStartTime: '23:00',
            nightEndTime: '05:00',
            effectiveFrom: new Date('2026-01-01'),
            status: 'ACTIVE',
        },
    });
    await prisma.rateCard.create({
        data: {
            tenantId: tenantTdh.id,
            customerId: null,
            clientType: 'Individual',
            vehicleCategoryId: catSuv.id,
            halfDayRate: 1500.00,
            fullDayRate: 2600.00,
            includedKm: 80.00,
            extraKmRate: 18.00,
            extraHourRate: 150.00,
            minKmPerDay: 250.00,
            outstationRatePerKm: 18.00,
            driverAllowance: 400.00,
            nightCharge: 300.00,
            nightStartTime: '23:00',
            nightEndTime: '05:00',
            effectiveFrom: new Date('2026-01-01'),
            status: 'ACTIVE',
        },
    });
    console.log('Seeding rate cards completed.');
    console.log('Seeding drivers...');
    await prisma.driver.create({
        data: {
            tenantId: tenantAcme.id,
            name: 'Rajesh Kumar',
            mobile: '+919812345678',
            licenseNumber: 'DL-1220150045678',
            licenseExpiry: new Date('2028-10-12'),
            address: '45-A Near Bus Stand, Dwarka, Delhi',
            emergencyContact: 'Sarla Devi (Wife) - +919812345679',
            status: client_1.DriverStatus.AVAILABLE,
        },
    });
    await prisma.driver.create({
        data: {
            tenantId: tenantAcme.id,
            name: 'Vijay Singh',
            mobile: '+919823456789',
            licenseNumber: 'DL-1220160056789',
            licenseExpiry: new Date('2029-05-15'),
            address: 'Sector 22, Rohini, Delhi',
            emergencyContact: 'Meena Singh (Wife) - +919823456780',
            status: client_1.DriverStatus.AVAILABLE,
        },
    });
    await prisma.driver.create({
        data: {
            tenantId: tenantTdh.id,
            name: 'Ramesh Sawant',
            mobile: '+919111122222',
            licenseNumber: 'MH-0120180012345',
            licenseExpiry: new Date('2030-01-20'),
            address: 'Plot 12, Panaji, Goa',
            emergencyContact: 'Neha Sawant (Wife) - +919111122223',
            status: client_1.DriverStatus.AVAILABLE,
        },
    });
    await prisma.driver.create({
        data: {
            tenantId: tenantTdh.id,
            name: 'Anil D Souza',
            mobile: '+919333344444',
            licenseNumber: 'MH-0220190054321',
            licenseExpiry: new Date('2031-06-18'),
            address: 'Colva Beach Road, Margao, Goa',
            emergencyContact: 'Maria D Souza (Mother) - +919333344445',
            status: client_1.DriverStatus.AVAILABLE,
        },
    });
    console.log('Seeding drivers completed.');
    console.log('Seeding vehicles...');
    await prisma.vehicle.create({
        data: {
            tenantId: tenantAcme.id,
            vehicleNumber: 'DL1CA9999',
            vehicleType: 'SUV',
            model: 'Toyota Innova Crysta',
            seatingCapacity: 7,
            registrationDate: new Date('2022-01-15'),
            insuranceExpiry: new Date('2027-01-14'),
            fitnessExpiry: new Date('2027-01-14'),
            permitExpiry: new Date('2027-01-14'),
            status: client_1.VehicleStatus.AVAILABLE,
        },
    });
    await prisma.vehicle.create({
        data: {
            tenantId: tenantAcme.id,
            vehicleNumber: 'DL2CB1111',
            vehicleType: 'Sedan',
            model: 'Maruti Suzuki Dzire',
            seatingCapacity: 4,
            registrationDate: new Date('2023-04-10'),
            insuranceExpiry: new Date('2028-04-09'),
            fitnessExpiry: new Date('2028-04-09'),
            permitExpiry: new Date('2028-04-09'),
            status: client_1.VehicleStatus.AVAILABLE,
        },
    });
    await prisma.vehicle.create({
        data: {
            tenantId: tenantTdh.id,
            vehicleNumber: 'GA01TA1234',
            vehicleType: 'SUV',
            model: 'Toyota Innova Crysta',
            seatingCapacity: 7,
            registrationDate: new Date('2023-08-20'),
            insuranceExpiry: new Date('2028-08-19'),
            fitnessExpiry: new Date('2028-08-19'),
            permitExpiry: new Date('2028-08-19'),
            status: client_1.VehicleStatus.AVAILABLE,
        },
    });
    await prisma.vehicle.create({
        data: {
            tenantId: tenantTdh.id,
            vehicleNumber: 'GA02TA5678',
            vehicleType: 'Sedan',
            model: 'Honda City',
            seatingCapacity: 4,
            registrationDate: new Date('2024-02-12'),
            insuranceExpiry: new Date('2029-02-11'),
            fitnessExpiry: new Date('2029-02-11'),
            permitExpiry: new Date('2029-02-11'),
            status: client_1.VehicleStatus.AVAILABLE,
        },
    });
    console.log('Seeding vehicles completed.');
    console.log('Database seeding successfully finished!');
}
main()
    .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map