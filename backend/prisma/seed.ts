import { PrismaClient, UserRole, UserStatus, CustomerType, DriverStatus, VehicleStatus, TripType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Clear existing data in reverse order of dependencies
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
  await prisma.rateCard.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  // Hash default password
  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 2. Create Tenants
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

  console.log(`Created tenants: ${tenantAcme.name} (${tenantAcme.id}), ${tenantExpress.name} (${tenantExpress.id})`);

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

  console.log('Seeding users completed.');

  // 4. Create Customers
  console.log('Seeding customers...');
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
    },
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
    },
  });

  console.log('Seeding customers completed.');

  // 5. Create Rate Cards
  console.log('Seeding rate cards...');
  
  // Custom rate cards for Acme Corp
  await prisma.rateCard.create({
    data: {
      tenantId: tenantAcme.id,
      customerId: customerAcmeCorp.id,
      vehicleType: 'Sedan',
      tripType: TripType.AIRPORT_TRANSFER,
      baseFare: 1500.00,
      baseKm: 40.00,
      baseHours: 4.00,
      extraKmRate: 12.00,
      extraHourRate: 100.00,
      driverAllowancePerDay: 250.00,
      nightCharges: 200.00,
    },
  });

  await prisma.rateCard.create({
    data: {
      tenantId: tenantAcme.id,
      customerId: customerAcmeCorp.id,
      vehicleType: 'SUV',
      tripType: TripType.AIRPORT_TRANSFER,
      baseFare: 2000.00,
      baseKm: 40.00,
      baseHours: 4.00,
      extraKmRate: 18.00,
      extraHourRate: 150.00,
      driverAllowancePerDay: 250.00,
      nightCharges: 200.00,
    },
  });

  // Default Rate Card for Sedan (Tenant default, customerId = null)
  await prisma.rateCard.create({
    data: {
      tenantId: tenantAcme.id,
      customerId: null,
      vehicleType: 'Sedan',
      tripType: TripType.AIRPORT_TRANSFER,
      baseFare: 1600.00,
      baseKm: 40.00,
      baseHours: 4.00,
      extraKmRate: 14.00,
      extraHourRate: 120.00,
      driverAllowancePerDay: 250.00,
      nightCharges: 200.00,
    },
  });

  console.log('Seeding rate cards completed.');

  // 6. Create Drivers
  console.log('Seeding drivers...');
  const driverRajesh = await prisma.driver.create({
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

  const driverVijay = await prisma.driver.create({
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

  console.log('Seeding drivers completed.');

  // 7. Create Vehicles
  console.log('Seeding vehicles...');
  const vehicleInnova = await prisma.vehicle.create({
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

  const vehicleDzire = await prisma.vehicle.create({
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
