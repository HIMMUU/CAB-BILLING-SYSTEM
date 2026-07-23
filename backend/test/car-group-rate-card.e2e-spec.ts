import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Car Group Modification & Rate Card E2E Test (Innova Crysta, Ciaz, Dzire)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;
  let operatorToken: string;
  let tenantId: string;
  let customerId: string;

  async function cleanDb() {
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
  }

  beforeAll(async () => {
    jest.setTimeout(30000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await cleanDb();

    // 1. Register tenant operator
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        companyName: 'Apex Cabs Pvt Ltd',
        firstName: 'Rajesh',
        lastName: 'Kumar',
        email: 'rajesh@apexcabs.com',
        phone: '9876543210',
        password: 'Password123!',
      });
    expect(regRes.status).toBe(201);
    operatorToken = regRes.body.accessToken;
    tenantId = regRes.body.user.tenantId;
  });

  afterAll(async () => {
    await cleanDb();
    await app.close();
  });

  it('1. Should create customer and update rate card grid with Innova Crysta, Ciaz, and Dzire', async () => {
    // Create Customer
    const custRes = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        name: 'TechCorp Pvt Ltd',
        companyName: 'TechCorp Pvt Ltd',
        type: 'CORPORATE',
        gstNumber: '07AAAAA0000A1Z5',
        phone: '9998887770',
        billingAddress: 'MG Road, Gurgaon',
        clientType: 'Company',
      });
    expect(custRes.status).toBe(201);
    customerId = custRes.body.id;

    // Update Customer with custom Rate Cards for Innova Crysta, Ciaz, Dzire
    const updateRes = await request(app.getHttpServer())
      .patch(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        name: 'TechCorp Pvt Ltd',
        companyName: 'TechCorp Pvt Ltd',
        type: 'CORPORATE',
        gstNumber: '07AAAAA0000A1Z5',
        phone: '9998887770',
        billingAddress: 'MG Road, Gurgaon',
        rateCards: [
          {
            vehicleCategoryName: 'Innova Crysta',
            halfDayRate: 1800,
            fullDayRate: 3000,
            minKm: 80,
            minHr: 8,
            fullKm: 80,
            fullHr: 8,
            extraKmRate: 20,
            extraHourRate: 200,
            driverAllowance: 300,
            nightCharge: 250,
          },
          {
            vehicleCategoryName: 'Ciaz',
            halfDayRate: 1400,
            fullDayRate: 2200,
            minKm: 80,
            minHr: 8,
            fullKm: 80,
            fullHr: 8,
            extraKmRate: 15,
            extraHourRate: 150,
            driverAllowance: 250,
            nightCharge: 200,
          },
          {
            vehicleCategoryName: 'Dzire',
            halfDayRate: 1100,
            fullDayRate: 1800,
            minKm: 80,
            minHr: 8,
            fullKm: 80,
            fullHr: 8,
            extraKmRate: 12,
            extraHourRate: 120,
            driverAllowance: 250,
            nightCharge: 200,
          },
        ],
      });
    expect(updateRes.status).toBe(200);

    // Verify rate cards & categories in DB
    const categories = await prisma.vehicleCategory.findMany({});
    const categoryNames = categories.map((c) => c.name);
    expect(categoryNames).toContain('Innova Crysta');
    expect(categoryNames).toContain('Ciaz');
    expect(categoryNames).toContain('Dzire');

    const customerDetails = await request(app.getHttpServer())
      .get(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(customerDetails.status).toBe(200);
    expect(customerDetails.body.rateCards.length).toBe(3);

    const innovaCard = customerDetails.body.rateCards.find(
      (rc: any) => rc.vehicleCategory.name === 'Innova Crysta',
    );
    expect(innovaCard).toBeDefined();
    expect(Number(innovaCard.fullDayRate)).toBe(3000);
    expect(Number(innovaCard.extraKmRate)).toBe(20);
  });

  it('2. Should use Innova Crysta rate card on Duty Slip closure & calculate correct trip fare', async () => {
    // Create Driver
    const driverRes = await prisma.driver.create({
      data: {
        tenantId,
        name: 'Ramesh Driver',
        mobile: '9811111111',
        licenseNumber: 'DL-998877',
        licenseExpiry: new Date('2030-01-01'),
        address: 'Delhi',
        emergencyContact: '9811111112',
      },
    });

    // Create Vehicle with category Innova Crysta
    const vehicleRes = await prisma.vehicle.create({
      data: {
        tenantId,
        vehicleNumber: 'DL1CAB9999',
        model: 'Toyota Innova Crysta',
        vehicleType: 'Innova Crysta',
        seatingCapacity: 7,
        registrationDate: new Date(),
        insuranceExpiry: new Date('2030-01-01'),
        fitnessExpiry: new Date('2030-01-01'),
        permitExpiry: new Date('2030-01-01'),
      },
    });

    // Create Booking requesting Innova Crysta
    const bookingRes = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        customerId,
        pickupLocation: 'Delhi Airport',
        dropLocation: 'Gurgaon Cyber City',
        pickupDate: '2026-08-01',
        pickupTime: '09:00',
        tripType: 'LOCAL',
        vehicleTypeRequired: 'Innova Crysta',
        reportingAddress: 'Terminal 3',
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.id;

    // Create Duty Slip directly for customer, driver, vehicle
    const dsRes = await request(app.getHttpServer())
      .post('/duty-slips')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        customerId,
        driverId: driverRes.id,
        vehicleId: vehicleRes.id,
        reportingTime: '2026-08-01T09:00:00.000Z',
        startKm: 1000,
        tripType: 'LOCAL',
      });
    expect(dsRes.status).toBe(201);
    const dutySlipId = dsRes.body.id;

    // Close Duty Slip (create Trip) with 100 KM (20 Extra KM over 80 base KM)
    const tripRes = await request(app.getHttpServer())
      .post('/trips')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        dutySlipId,
        endKm: 1100, // 100 total km
        startDateTime: '2026-08-01T09:00:00.000Z',
        endDateTime: '2026-08-01T17:00:00.000Z', // 8 hrs
        toll: 150,
        parking: 50,
      });
    expect(tripRes.status).toBe(201);

    // Verify trip fare calculated using Innova Crysta Rate Card:
    // Base fare (full day for 8 hrs/80km) = 3000
    // Extra KM (100 - 80 = 20 KM @ Rs 20/km) = 400
    // Driver Allowance = 300
    expect(Number(tripRes.body.baseFareCharged)).toBe(3000);
    expect(Number(tripRes.body.extraKmCharged)).toBe(400);
    expect(Number(tripRes.body.driverAllowance)).toBe(300);

    // 3. Generate Invoice
    const invRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        tripId: tripRes.body.id,
        invoiceDate: '2026-08-02',
      });
    expect(invRes.status).toBe(201);
    expect(Number(invRes.body.baseFare)).toBe(3000);
    expect(Number(invRes.body.extraKmCharges)).toBe(400);
    expect(Number(invRes.body.toll)).toBe(150);
    expect(Number(invRes.body.parking)).toBe(50);
  });
});
