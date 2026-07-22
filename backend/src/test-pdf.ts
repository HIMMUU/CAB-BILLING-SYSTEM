import {
  PrismaClient,
  TripType,
  DutySlipStatus,
  BookingStatus,
} from '@prisma/client';
import { InvoicesService } from './invoices/invoices.service';
import { TenantContextService } from './common/context/tenant-context.service';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const prisma = new PrismaClient();
  const context = new TenantContextService();
  const service = new InvoicesService(prisma as any, null as any);

  console.log('Inspecting database data...');

  // 1. Get or create Tenant
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log('Creating test tenant...');
    tenant = await prisma.tenant.create({
      data: {
        name: 'TRAVEL DREAM',
        companyAddress:
          'E57/A,HARI NAGAR EXTN-PART-II\nBADARPUR,NEW DELHI-110044 NEW\nDELHI 110044',
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
  } else {
    // Make sure it has address & bank settings for the test
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        companyAddress:
          'E57/A,HARI NAGAR EXTN-PART-II\nBADARPUR,NEW DELHI-110044 NEW\nDELHI 110044',
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

  // 2. Get or create Customer
  let customer = await prisma.customer.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!customer) {
    console.log('Creating test customer...');
    customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: 'ITER MOBILITY PRIVATE LIMITED',
        billingAddress:
          'PLOT IN KH NO. 16/29 NEAR BY KUNDAN FARM KAPASHER, NEW DELHI',
        phone: '9876543210',
        gstNumber: '07AAHCI2728M1Z9',
        type: 'CORPORATE',
      },
    });
  } else {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        type: 'CORPORATE',
        name: 'ITER MOBILITY PRIVATE LIMITED',
        billingAddress:
          'PLOT IN KH NO. 16/29 NEAR BY KUNDAN FARM KAPASHER, NEW DELHI',
        gstNumber: '07AAHCI2728M1Z9',
      },
    });
  }

  // 3. Get or create Vehicle
  let vehicle = await prisma.vehicle.findFirst({
    where: { tenantId: tenant.id },
  });
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

  // 4. Get or create Driver
  let driver = await prisma.driver.findFirst({
    where: { tenantId: tenant.id },
  });
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

  // 5. Get or create Invoice
  let invoice = await prisma.invoice.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!invoice) {
    console.log(
      'Creating test booking, duty slip, closed trip, and invoice...',
    );

    // Create Booking
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

    // Create Duty Slip
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

    // Create Closed Trip
    const trip = await prisma.trip.create({
      data: {
        tenantId: tenant.id,
        dutySlipId: dutySlip.id,
        bookingId: booking.id,
        startKm: 10000,
        endKm: 10168,
        totalKm: 168,
        baseFareCharged: 1400.0,
        extraKmCharged: 1232.0,
        extraHoursCharged: 750.0,
        driverAllowance: 300.0,
        nightChargesCharged: 0.0,
        toll: 500.0,
        parking: 0.0,
        stateTaxCharged: 120.0,
        mcdCharged: 0.0,
        totalAmount: 3382.0,
      },
    });

    // Create Invoice
    invoice = await context.runWithContext({ tenantId: tenant.id }, () =>
      service.create({
        tripIds: [trip.id],
        gstType: 'INTRASTATE' as any,
        gstRate: 5,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    );
  }

  console.log(`Generating PDF for Invoice: ${invoice.invoiceNumber}...`);

  // Run with tenant context
  const pdfBuffer = await context.runWithContext({ tenantId: tenant.id }, () =>
    service.generatePdf(invoice.id),
  );

  const outputPath = path.resolve(__dirname, '..', 'test_invoice.pdf');
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`Successfully wrote test invoice PDF to: ${outputPath}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error generating test PDF:', err);
});
