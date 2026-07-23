import { PrismaClient, UserRole, UserStatus, CustomerType, DriverStatus, VehicleStatus, TripType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Clear existing data ONLY if FORCE_SEED=true is specified
  if (process.env.FORCE_SEED === 'true') {
    console.log('Cleaning existing data (FORCE_SEED=true)...');
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
  } else {
    console.log('Skipping database wipe (preserving existing production data). Use FORCE_SEED=true to wipe.');
    const existingTenantCount = await prisma.tenant.count();
    if (existingTenantCount > 0) {
      console.log(`🛡️ Production data protection: ${existingTenantCount} tenant(s) already exist. Skipping demo seeding to protect client data.`);
      return;
    }
  }

  // Hash default password
  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 2. Create Tenants (using safe upsert/find)
  console.log('Seeding tenants...');
  let tenantAcme = await prisma.tenant.findFirst({ where: { domain: 'acme.cabbs.local' } });
  if (!tenantAcme) {
    tenantAcme = await prisma.tenant.create({
      data: { name: 'Acme Cabs', domain: 'acme.cabbs.local', logoUrl: 'https://placehold.co/200x200?text=Acme+Cabs' },
    });
  }

  let tenantExpress = await prisma.tenant.findFirst({ where: { domain: 'express.cabbs.local' } });
  if (!tenantExpress) {
    tenantExpress = await prisma.tenant.create({
      data: { name: 'Express Travel', domain: 'express.cabbs.local', logoUrl: 'https://placehold.co/200x200?text=Express+Travel' },
    });
  }

  let tenantTdh = await prisma.tenant.findFirst({ where: { domain: 'traveldreamholiday.com' } });
  if (!tenantTdh) {
    tenantTdh = await prisma.tenant.create({
      data: { name: 'Travel Dream Holiday', domain: 'traveldreamholiday.com', logoUrl: '/logo.png' },
    });
  }

  console.log(`Created tenants: ${tenantAcme.name} (${tenantAcme.id}), ${tenantExpress.name} (${tenantExpress.id}), ${tenantTdh.name} (${tenantTdh.id})`);

  // 2b. Seed Vehicle Categories
  console.log('Seeding vehicle categories...');
  const catSedan = await prisma.vehicleCategory.create({ data: { name: 'Sedan' } });
  const catSuv = await prisma.vehicleCategory.create({ data: { name: 'SUV' } });
  const catMuv = await prisma.vehicleCategory.create({ data: { name: 'MUV' } });
  const catLuxury = await prisma.vehicleCategory.create({ data: { name: 'Luxury' } });
  const catTempo = await prisma.vehicleCategory.create({ data: { name: 'Tempo Traveller' } });
  const catBus = await prisma.vehicleCategory.create({ data: { name: 'Bus' } });
  const catInnova = await prisma.vehicleCategory.create({ data: { name: 'Innova Crysta' } });
  const catDzire = await prisma.vehicleCategory.create({ data: { name: 'Dzire' } });
  const catCiaz = await prisma.vehicleCategory.create({ data: { name: 'Ciaz' } });

  // 2c. Seed Tax Configurations
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

  // 3. Create Users
  console.log('Seeding users...');
  
  // Super Admin (no tenantId)
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@cabbs.local',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // Acme Tenants Users
  const acmeAdmin = await prisma.user.create({
    data: {
      tenantId: tenantAcme.id,
      email: 'admin@acme.cabbs.local',
      passwordHash,
      firstName: 'Acme',
      lastName: 'Admin',
      role: UserRole.OPERATOR_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const acmeDispatcher = await prisma.user.create({
    data: {
      tenantId: tenantAcme.id,
      email: 'dispatcher@acme.cabbs.local',
      passwordHash,
      firstName: 'Acme',
      lastName: 'Dispatcher',
      role: UserRole.DISPATCHER,
      status: UserStatus.ACTIVE,
    },
  });

  const acmeBilling = await prisma.user.create({
    data: {
      tenantId: tenantAcme.id,
      email: 'billing@acme.cabbs.local',
      passwordHash,
      firstName: 'Acme',
      lastName: 'Billing',
      role: UserRole.BILLING_EXECUTIVE,
      status: UserStatus.ACTIVE,
    },
  });

  // Express Tenant Users
  const expressAdmin = await prisma.user.create({
    data: {
      tenantId: tenantExpress.id,
      email: 'admin@express.cabbs.local',
      passwordHash,
      firstName: 'Express',
      lastName: 'Admin',
      role: UserRole.OPERATOR_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // TDH Staff Users
  const tdhAdmin = await prisma.user.create({
    data: {
      tenantId: tenantTdh.id,
      email: 'staff@traveldreamholiday.com',
      passwordHash,
      firstName: 'TDH',
      lastName: 'Staff',
      role: UserRole.OPERATOR_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('Seeding users completed.');

  // 4. Create Customers
  console.log('Seeding customers...');
  
  // Acme Customers
  const customerAcmeCorp = await prisma.customer.create({
    data: {
      tenantId: tenantAcme.id,
      name: 'Acme Corp',
      companyName: 'Acme Logistics Pvt Ltd',
      type: CustomerType.CORPORATE,
      gstNumber: '07AAAAA1111A1Z1',
      email: 'finance@acme.com',
      phone: '+919876543210',
      billingAddress: '123 Business Tower, Delhi, India',
      creditLimit: 50000.00,
      paymentTerms: 'Net 30',
      status: 'ACTIVE',
      clientType: 'Company',
    } as any,
  });

  const customerJane = await prisma.customer.create({
    data: {
      tenantId: tenantAcme.id,
      name: 'Jane Smith',
      type: CustomerType.INDIVIDUAL,
      email: 'janesmith@gmail.com',
      phone: '+919999988888',
      billingAddress: 'Sector 15, Gurgaon, India',
      creditLimit: 0.00,
      paymentTerms: 'Immediate',
      status: 'ACTIVE',
      clientType: 'Individual',
    } as any,
  });

  // TDH Customers
  const customerTdhCorp = await prisma.customer.create({
    data: {
      tenantId: tenantTdh.id,
      name: 'Dream Resorts India',
      companyName: 'Dream Resorts & Leisure Group',
      type: CustomerType.CORPORATE,
      gstNumber: '07AAAAA2222B2Z2',
      email: 'bookings@dreamresorts.com',
      phone: '+919811122233',
      billingAddress: '55 Luxury Beach Road, Goa, India',
      creditLimit: 75000.00,
      paymentTerms: 'Net 15',
      status: 'ACTIVE',
      clientType: 'Travel Company',
    } as any,
  });

  const customerTdhGuest = await prisma.customer.create({
    data: {
      tenantId: tenantTdh.id,
      name: 'Alex Johnson',
      type: CustomerType.INDIVIDUAL,
      email: 'alex.j@hotmail.com',
      phone: '+919555566666',
      billingAddress: 'Greenwood Apartments, Bangalore, India',
      creditLimit: 0.00,
      paymentTerms: 'Immediate',
      status: 'ACTIVE',
      clientType: 'Individual',
    } as any,
  });

  console.log('Seeding customers completed.');

  // 5. Create Rate Cards
  console.log('Seeding rate cards...');
  
  // Custom rate cards for Acme Corp (Company Type)
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

  // Default Rate Card for Sedan (Acme default)
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

  // TDH Rate Cards
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

  // 6. Create Drivers
  console.log('Seeding drivers...');
  
  // Acme Drivers
  await prisma.driver.create({
    data: {
      tenantId: tenantAcme.id,
      name: 'Rajesh Kumar',
      mobile: '+919812345678',
      licenseNumber: 'DL-1220150045678',
      licenseExpiry: new Date('2028-10-12'),
      address: '45-A Near Bus Stand, Dwarka, Delhi',
      emergencyContact: 'Sarla Devi (Wife) - +919812345679',
      status: DriverStatus.AVAILABLE,
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
      status: DriverStatus.AVAILABLE,
    },
  });

  // TDH Drivers
  await prisma.driver.create({
    data: {
      tenantId: tenantTdh.id,
      name: 'Ramesh Sawant',
      mobile: '+919111122222',
      licenseNumber: 'MH-0120180012345',
      licenseExpiry: new Date('2030-01-20'),
      address: 'Plot 12, Panaji, Goa',
      emergencyContact: 'Neha Sawant (Wife) - +919111122223',
      status: DriverStatus.AVAILABLE,
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
      status: DriverStatus.AVAILABLE,
    },
  });

  console.log('Seeding drivers completed.');

  // 7. Create Vehicles
  console.log('Seeding vehicles...');
  
  // Acme Vehicles
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
      status: VehicleStatus.AVAILABLE,
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
      status: VehicleStatus.AVAILABLE,
    },
  });

  // TDH Vehicles
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
      status: VehicleStatus.AVAILABLE,
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
      status: VehicleStatus.AVAILABLE,
    },
  });

  console.log('Seeding vehicles completed.');

  // Seeding closed trips for testing the consolidated invoices flow
  console.log('Seeding bookings, duty slips, and closed trips...');
  
  const booking1 = await prisma.booking.create({
    data: {
      tenantId: tenantAcme.id,
      bookingNumber: 'BK-1001',
      customerId: customerAcmeCorp.id,
      pickupLocation: 'Dwarka Sector 10, Delhi',
      dropLocation: 'Connaught Place, Delhi',
      pickupDate: new Date('2026-06-10'),
      pickupTime: '09:00',
      tripType: TripType.LOCAL,
      vehicleTypeRequired: 'Sedan',
      status: 'COMPLETED',
    } as any,
  });

  const booking2 = await prisma.booking.create({
    data: {
      tenantId: tenantAcme.id,
      bookingNumber: 'BK-1002',
      customerId: customerAcmeCorp.id,
      pickupLocation: 'Rohini Sector 15, Delhi',
      dropLocation: 'Gurgaon Cyber City',
      pickupDate: new Date('2026-06-11'),
      pickupTime: '08:30',
      tripType: TripType.LOCAL,
      vehicleTypeRequired: 'SUV',
      status: 'COMPLETED',
    } as any,
  });

  const vehicleSedan = await prisma.vehicle.findFirst({ where: { vehicleNumber: 'DL2CB1111' } });
  const vehicleSuv = await prisma.vehicle.findFirst({ where: { vehicleNumber: 'DL1CA9999' } });
  const driverRajesh = await prisma.driver.findFirst({ where: { mobile: '+919812345678' } });
  const driverVijay = await prisma.driver.findFirst({ where: { mobile: '+919823456789' } });

  await prisma.assignment.create({
    data: {
      tenantId: tenantAcme.id,
      bookingId: booking1.id,
      vehicleId: vehicleSedan!.id,
      driverId: driverRajesh!.id,
      status: 'COMPLETED',
    },
  });

  await prisma.assignment.create({
    data: {
      tenantId: tenantAcme.id,
      bookingId: booking2.id,
      vehicleId: vehicleSuv!.id,
      driverId: driverVijay!.id,
      status: 'COMPLETED',
    },
  });

  const ds1 = await prisma.dutySlip.create({
    data: {
      tenantId: tenantAcme.id,
      dutySlipNumber: 'DS-1001',
      bookingId: booking1.id,
      driverId: driverRajesh!.id,
      vehicleId: vehicleSedan!.id,
      reportingTime: new Date('2026-06-10T08:30:00Z'),
      startKm: 12000,
      endKm: 12085,
      toll: 120,
      parking: 80,
      status: 'CLOSED',
      startDateTime: new Date('2026-06-10T09:00:00Z'),
      endDateTime: new Date('2026-06-10T17:00:00Z'),
    },
  });

  const ds2 = await prisma.dutySlip.create({
    data: {
      tenantId: tenantAcme.id,
      dutySlipNumber: 'DS-1002',
      bookingId: booking2.id,
      driverId: driverVijay!.id,
      vehicleId: vehicleSuv!.id,
      reportingTime: new Date('2026-06-11T08:00:00Z'),
      startKm: 15000,
      endKm: 15090,
      toll: 150,
      parking: 100,
      status: 'CLOSED',
      startDateTime: new Date('2026-06-11T08:30:00Z'),
      endDateTime: new Date('2026-06-11T16:30:00Z'),
    },
  });

  await prisma.trip.create({
    data: {
      tenantId: tenantAcme.id,
      dutySlipId: ds1.id,
      bookingId: booking1.id,
      startKm: 12000,
      endKm: 12085,
      totalKm: 85,
      toll: 120,
      parking: 80,
      driverAllowance: 250,
      extraCharges: 0,
      baseFareCharged: 1800,
      extraKmCharged: 70,
      extraHoursCharged: 0,
      nightChargesCharged: 0,
      miscChargesCharged: 0,
      totalAmount: 2320,
      startDateTime: new Date('2026-06-10T09:00:00Z'),
      endDateTime: new Date('2026-06-10T17:00:00Z'),
      totalHours: 8,
      totalDays: 1,
    } as any,
  });

  await prisma.trip.create({
    data: {
      tenantId: tenantAcme.id,
      dutySlipId: ds2.id,
      bookingId: booking2.id,
      startKm: 15000,
      endKm: 15090,
      totalKm: 90,
      toll: 150,
      parking: 100,
      driverAllowance: 250,
      extraCharges: 0,
      baseFareCharged: 2400,
      extraKmCharged: 180,
      extraHoursCharged: 0,
      nightChargesCharged: 0,
      miscChargesCharged: 0,
      totalAmount: 3080,
      startDateTime: new Date('2026-06-11T08:30:00Z'),
      endDateTime: new Date('2026-06-11T16:30:00Z'),
      totalHours: 8,
      totalDays: 1,
    } as any,
  });

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
