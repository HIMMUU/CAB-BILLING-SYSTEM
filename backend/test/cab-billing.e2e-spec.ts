import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  BookingStatus,
  DriverStatus,
  VehicleStatus,
  AssignmentStatus,
  DutySlipStatus,
  InvoiceStatus,
  TripType,
  PaymentMode,
  PaymentStatus,
} from '@prisma/client';

import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import * as fs from 'fs';

@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    const errorDetails = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message || exception,
      stack: exception.stack,
    };

    if (status === 500) {
      process.stderr.write(`NestJS E2E Exception Filter Caught 500:\nMessage: ${exception.message || exception}\nStack: ${exception.stack}\n`);
    }

    try {
      fs.appendFileSync('/Users/mac/.gemini/antigravity-ide/scratch/error.log', `Filter Caught Error at ${request.url}:\nStatus: ${status}\nMessage: ${exception.message || exception}\nStack: ${exception.stack}\n\n`);
    } catch (e) {}

    response.status(status).json(errorDetails);
  }
}

describe('Cab Billing System (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let operatorToken: string;
  let tenantId: string;
  let customerCorporateId: string;
  let customerIndividualId: string;
  let vehicleCategoryId: string;
  let driverId: string;
  let vehicleId: string;
  let bookingId: string;
  let assignmentId: string;
  let dutySlipId: string;
  let tripId: string;
  let invoiceId: string;

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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    
    // Ensure fresh database state
    await cleanDb();

    // Create the global category required for tests
    const category = await prisma.vehicleCategory.create({
      data: {
        name: 'Sedan',
      },
    });
    vehicleCategoryId = category.id;
  });

  afterAll(async () => {
    await cleanDb();
    await app.close();
  });

  describe('1. Auth Workflow', () => {
    it('should register a new tenant and operator user successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          companyName: 'Express Cabs Ltd',
          companyEmail: 'express@cabs.com',
          companyPhone: '+919999999999',
          companyAddress: '123 Expressway, Delhi, India',
          companyGst: '07AAAAA1111A1Z1',
          firstName: 'Sandeep',
          lastName: 'Sharma',
          email: 'sandeep@expresscabs.com',
          password: 'SecurePassword123!',
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('sandeep@expresscabs.com');
      expect(res.body.user.role).toBe('OPERATOR_ADMIN');
      expect(res.body.user.tenantId).toBeDefined();

      operatorToken = res.body.accessToken;
      tenantId = res.body.user.tenantId;
    });

    it('should login successfully with registered credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'sandeep@expresscabs.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.accessToken).toBeDefined();
    });
  });

  describe('2. Customer Management', () => {
    it('should create a corporate customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          name: 'Google India',
          companyName: 'Google India Pvt Ltd',
          type: 'CORPORATE',
          gstNumber: '07AAAAA1111A1Z1',
          email: 'accounts@google.com',
          phone: '+919876543210',
          billingAddress: 'Signature Towers, Gurgaon, India',
          creditLimit: 100000.00,
          paymentTerms: 'Net 30',
        })
        .expect(201);

      expect(res.body.name).toBe('Google India');
      expect(res.body.type).toBe('CORPORATE');
      customerCorporateId = res.body.id;
    });

    it('should create an individual customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          name: 'Aditya Sen',
          type: 'INDIVIDUAL',
          email: 'aditya@gmail.com',
          phone: '+919999911111',
          billingAddress: 'Sector 56, Gurgaon, India',
          creditLimit: 0.00,
          paymentTerms: 'Immediate',
        })
        .expect(201);

      expect(res.body.name).toBe('Aditya Sen');
      expect(res.body.type).toBe('INDIVIDUAL');
      customerIndividualId = res.body.id;
    });

    it('should enforce unique customer phone number per tenant', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          name: 'Duplicate Phone User',
          type: 'INDIVIDUAL',
          phone: '+919876543210', // already matches Google India
          billingAddress: 'Sector 40, Delhi',
        })
        .expect(409); // Conflict (Unique check fails in validation or service)
    });
  });

  describe('3. Rate Management', () => {
    it('should configure a default rate card for company clients on Sedan category', async () => {
      const res = await request(app.getHttpServer())
        .post('/rate-management/rate-cards')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          clientType: 'Company',
          vehicleCategoryId: vehicleCategoryId,
          halfDayRate: 1000,
          fullDayRate: 1800,
          includedKm: 80,
          extraKmRate: 15,
          extraHourRate: 150,
          minKmPerDay: 250,
          outstationRatePerKm: 14,
          driverAllowance: 300,
          nightCharge: 250,
          minHr: 4,
          minKm: 40,
          fullHr: 8,
          fullKm: 80,
          effectiveFrom: new Date().toISOString(),
        })
        .expect(201);

      expect(res.body.clientType).toBe('Company');
      expect(Number(res.body.fullDayRate)).toBe(1800);
    });

    it('should configure a custom customer rate card for Google India with discounted rates', async () => {
      const res = await request(app.getHttpServer())
        .post('/rate-management/rate-cards')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          customerId: customerCorporateId,
          clientType: 'Company',
          vehicleCategoryId: vehicleCategoryId,
          halfDayRate: 800,
          fullDayRate: 1500, // discounted from 1800
          includedKm: 80,
          extraKmRate: 12, // discounted from 15
          extraHourRate: 100,
          minKmPerDay: 250,
          outstationRatePerKm: 12,
          driverAllowance: 250,
          nightCharge: 200,
          minHr: 4,
          minKm: 40,
          fullHr: 8,
          fullKm: 80,
          effectiveFrom: new Date().toISOString(),
        })
        .expect(201);

      expect(res.body.customerId).toBe(customerCorporateId);
      expect(Number(res.body.fullDayRate)).toBe(1500);
    });
  });

  describe('4. Fleet Setup', () => {
    it('should create a driver successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/drivers')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          name: 'Ramesh Kumar',
          mobile: '+919111111111',
          licenseNumber: 'DL-ABC-123456',
          licenseExpiry: '2030-01-01T00:00:00.000Z',
          address: 'Driver Colony, Delhi',
          emergencyContact: 'Sita Devi - +919111111112',
          status: DriverStatus.AVAILABLE,
        })
        .expect(201);

      expect(res.body.name).toBe('Ramesh Kumar');
      driverId = res.body.id;
    });

    it('should create a vehicle successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          vehicleNumber: 'DL1CA9999',
          vehicleType: 'Sedan',
          model: 'Toyota Etios',
          seatingCapacity: 5,
          registrationDate: '2023-01-01T00:00:00.000Z',
          insuranceExpiry: '2027-01-01T00:00:00.000Z',
          fitnessExpiry: '2027-01-01T00:00:00.000Z',
          permitExpiry: '2027-01-01T00:00:00.000Z',
          status: VehicleStatus.AVAILABLE,
        })
        .expect(201);

      expect(res.body.vehicleNumber).toBe('DL1CA9999');
      vehicleId = res.body.id;
    });
  });

  describe('5. Bookings & Resource Assignment', () => {
    it('should create a local booking for Google India customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          customerId: customerCorporateId,
          pickupLocation: 'Google Office, Sector 15, Gurgaon',
          dropLocation: 'Aerocity, Delhi',
          pickupDate: '2026-07-01T00:00:00.000Z',
          pickupTime: '10:00',
          tripType: TripType.LOCAL,
          vehicleTypeRequired: 'Sedan',
        })
        .expect(201);

      expect(res.body.status).toBe(BookingStatus.PENDING);
      bookingId = res.body.id;
    });

    it('should assign driver and vehicle and generate draft duty slip', async () => {
      const res = await request(app.getHttpServer())
        .post('/assignments')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          bookingId: bookingId,
          driverId: driverId,
          vehicleId: vehicleId,
        });

      if (res.status !== 201) {
        throw new Error(`Assignment failed with status ${res.status}: ${res.text}`);
      }
      expect(res.status).toBe(201);

      expect(res.body.booking.status).toBe(BookingStatus.ASSIGNED);
      expect(res.body.driver.status).toBe(DriverStatus.ON_TRIP);
      expect(res.body.vehicle.status).toBe(VehicleStatus.ON_TRIP);
      
      assignmentId = res.body.id;

      // Verify DutySlip is auto-created in DRAFT
      const dutySlips = await prisma.dutySlip.findMany({
        where: { bookingId: bookingId },
      });
      expect(dutySlips.length).toBe(1);
      expect(dutySlips[0].status).toBe(DutySlipStatus.DRAFT);
      expect(Number(dutySlips[0].startKm)).toBe(0);

      dutySlipId = dutySlips[0].id;
      console.log('--- TEST DEBUG: SET dutySlipId to:', dutySlipId);
    });

    it('should prevent double booking of driver and vehicle on overlapping date', async () => {
      // Create second booking on same date
      const secondBookingRes = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          customerId: customerCorporateId,
          pickupLocation: 'Gurgaon Office',
          dropLocation: 'Noida Sector 62',
          pickupDate: '2026-07-01T00:00:00.000Z', // Same date
          pickupTime: '14:00',
          tripType: TripType.LOCAL,
          vehicleTypeRequired: 'Sedan',
        })
        .expect(201);

      const secondBookingId = secondBookingRes.body.id;

      // Verify overlap validation blocks assignment of the same driver & vehicle
      const conflictRes = await request(app.getHttpServer())
        .post('/assignments')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          bookingId: secondBookingId,
          driverId: driverId, // Same driver
          vehicleId: vehicleId, // Same vehicle
        })
        .expect(409); // ConflictException

      expect(conflictRes.body.message).toContain('already assigned to another active trip on this date');
    });
  });

  describe('6. Duty Slip & Trip Closure pricing calculation', () => {
    it('should close the trip and calculate fares based on the custom rate card', async () => {
      console.log('--- TEST DEBUG: GET dutySlipId as:', dutySlipId);
      // Simulate trip duration of 9 hours (exceeding full-day 8h limit) and 100 KM (exceeding full-day 80km limit)
      // Custom card parameters: fullDayRate = 1500, fullKm = 80, extraKmRate = 12, extraHourRate = 100, driverAllowance = 250, nightCharge = 200
      const startDateTime = new Date('2026-07-01T10:00:00.000Z').toISOString();
      const endDateTime = new Date('2026-07-01T19:00:00.000Z').toISOString(); // 9 hours

      const res = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          dutySlipId: dutySlipId,
          endKm: 100, // totalKm = 100 - 0 = 100 (exceeds 80km by 20km)
          toll: 150.00,
          parking: 80.00,
          driverAllowance: 250.00,
          nightCharges: 0.00,
          extraCharges: 0.00,
          startDateTime: startDateTime,
          endDateTime: endDateTime,
        });

      if (res.status !== 201) {
        throw new Error(`Trip closure failed with status ${res.status}: ${res.text}`);
      }
      expect(res.status).toBe(201);

      expect(res.body.id).toBeDefined();
      expect(Number(res.body.totalKm)).toBe(100);

      const closedSlip = await prisma.dutySlip.findUnique({
        where: { id: dutySlipId },
      });
      expect(closedSlip?.status).toBe(DutySlipStatus.CLOSED);
      
      // Verification of Pricing:
      // Base Fare = 1500
      // Extra Km = (100 - 80) * 12 = 240
      // Extra Hours = (9 - 8) * 100 = 100
      // Toll = 150
      // Parking = 80
      // Driver Allowance = 250
      // Night Charges = 0
      // Total amount expected = 1500 + 240 + 100 + 150 + 80 + 250 = 2320
      expect(Number(res.body.baseFareCharged)).toBe(1500);
      expect(Number(res.body.extraKmCharged)).toBe(240);
      expect(Number(res.body.extraHoursCharged)).toBe(100);
      expect(Number(res.body.totalAmount)).toBe(2320);

      tripId = res.body.tripId || res.body.id;

      // Verify driver and vehicle statuses revert to AVAILABLE
      const driver = await prisma.driver.findUnique({ where: { id: driverId } });
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      expect(driver?.status).toBe(DriverStatus.AVAILABLE);
      expect(vehicle?.status).toBe(VehicleStatus.AVAILABLE);
    });
  });

  describe('7. Billing & Invoices (GST & RCM logic)', () => {
    it('should generate a tax invoice and compute CGST & SGST (split equally) for intrastate travel', async () => {
      // Corporate customer GST begins with "07" (Delhi).
      // Tenant GST also begins with "07" (Delhi).
      // Since states match, it should apply CGST and SGST (split evenly).
      // GST rates from custom rate config default to cgst=2.5% and sgst=2.5% (total 5%)
      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          customerId: customerCorporateId,
          tripIds: [tripId],
          gstType: 'INTRASTATE',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      expect(res.body.status).toBe(InvoiceStatus.UNPAID);
      expect(Number(res.body.baseFare)).toBe(1500);
      expect(Number(res.body.subtotal)).toBe(2320);

      // Taxable amount = subtotal - (toll + parking + mcd)
      // Taxable amount = 2320 - (150 + 80 + 0) = 2090
      // CGST (2.5%) = 2090 * 0.025 = 52.25
      // SGST (2.5%) = 2090 * 0.025 = 52.25
      // Total Tax = 104.50
      // Total Amount = 2320 + 104.50 = 2424.50
      expect(Number(res.body.cgstRate)).toBe(2.5);
      expect(Number(res.body.sgstRate)).toBe(2.5);
      expect(Number(res.body.igstRate)).toBe(0);
      expect(Number(res.body.cgstAmount)).toBe(52.25);
      expect(Number(res.body.sgstAmount)).toBe(52.25);
      expect(Number(res.body.totalTax)).toBe(104.50);
      expect(Number(res.body.totalAmount)).toBe(2424.50);
      expect(Number(res.body.dueAmount)).toBe(2424.50);

      invoiceId = res.body.id;
    });

    it('should generate an invoice under RCM where taxes are calculated but not added to totalAmount', async () => {
      // Delete previous invoice to avoid duplicates error
      await prisma.invoiceItem.deleteMany({});
      await prisma.invoice.deleteMany({});

      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          customerId: customerCorporateId,
          tripIds: [tripId],
          gstType: 'INTRASTATE',
          isRcm: true, // Reverse Charge Mechanism
          invoiceDate: new Date().toISOString(),
        })
        .expect(201);

      // In RCM, totalAmount = subtotal (taxes are not added)
      expect(Number(res.body.subtotal)).toBe(2320);
      expect(Number(res.body.cgstAmount)).toBe(52.25);
      expect(Number(res.body.totalTax)).toBe(104.50);
      expect(Number(res.body.totalAmount)).toBe(2320); // equals subtotal
      expect(Number(res.body.dueAmount)).toBe(2320);

      invoiceId = res.body.id;
    });
  });

  describe('8. Payment Logging & Balance Adjustments', () => {
    it('should fail to log a payment exceeding the outstanding invoice due amount', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          invoiceId: invoiceId,
          amount: 3000.00, // exceeds 2320
          paymentMode: PaymentMode.UPI,
          transactionReference: 'UPI-OVERPAY-123',
        })
        .expect(400);
    });

    it('should record a partial payment, shifting status to PARTIALLY_PAID', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          invoiceId: invoiceId,
          amount: 1000.00,
          paymentMode: PaymentMode.BANK_TRANSFER,
          transactionReference: 'TXN-PARTIAL-99',
        })
        .expect(201);

      expect(res.body.status).toBe(PaymentStatus.SUCCESS);
      expect(Number(res.body.amount)).toBe(1000);

      // Check updated invoice balances
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });
      expect(updatedInvoice?.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      expect(Number(updatedInvoice?.paidAmount)).toBe(1000);
      expect(Number(updatedInvoice?.dueAmount)).toBe(1320);
    });

    it('should record final payment, shifting status to PAID and due amount to 0', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          invoiceId: invoiceId,
          amount: 1320.00, // outstanding due
          paymentMode: PaymentMode.CASH,
          transactionReference: 'TXN-FINAL-100',
        })
        .expect(201);

      expect(res.body.status).toBe(PaymentStatus.SUCCESS);

      // Check updated invoice balances
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });
      expect(updatedInvoice?.status).toBe(InvoiceStatus.PAID);
      expect(Number(updatedInvoice?.paidAmount)).toBe(2320);
      expect(Number(updatedInvoice?.dueAmount)).toBe(0);
    });
  });

  describe('9. Dashboard & Financial Reports', () => {
    it('should retrieve revenue report matching the closed/paid trip sums', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/revenue')
        .set('Authorization', `Bearer ${operatorToken}`)
        .query({
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        })
        .expect(200);

      // Revenue report calculations
      expect(res.body.summary).toBeDefined();
      // Out of the invoices generated, total paid is 2320 and outstanding is 0
      expect(Number(res.body.summary.totalAmount)).toBeGreaterThan(0);
      expect(Number(res.body.summary.totalPaid)).toBe(2320);
      expect(Number(res.body.summary.totalDue)).toBe(0);
    });

    it('should retrieve vehicle utilization statistics correctly aggregating test vehicle trips', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/vehicle-utilization')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      const testVehicleStats = res.body.find(
        (v: any) => v.vehicleNumber === 'DL1CA9999',
      );
      expect(testVehicleStats).toBeDefined();
      expect(testVehicleStats.tripsCount).toBe(1);
      expect(Number(testVehicleStats.totalKm)).toBe(100);
      expect(Number(testVehicleStats.totalRevenue)).toBe(2320);
    });

    it('should retrieve correct dashboard stats cards counters', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/summary')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(res.body.todaysBookings).toBeDefined();
      expect(res.body.activeTrips).toBeDefined();
      expect(res.body.availableVehicles).toBe(1);
      expect(res.body.availableDrivers).toBe(1);
      expect(Number(res.body.revenue)).toBe(2320);
    });
  });
});
