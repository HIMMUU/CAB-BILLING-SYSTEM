import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDutySlipDto } from './dto/create-duty-slip.dto';
import { UpdateDutySlipDto } from './dto/update-duty-slip.dto';
import { DutySlipStatus, BookingStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';

@Injectable()
export class DutySlipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDutySlipDto) {
    let bookingId = dto.bookingId;
    let employeeId = dto.employeeId;

    if (!bookingId) {
      // Create Duty Slip WITHOUT booking
      if (!dto.customerId || !dto.driverId || !dto.vehicleId) {
        throw new BadRequestException('Customer ID, Driver ID, and Vehicle ID are required to create a duty slip without an existing booking');
      }

      // 1. Verify customer, driver, vehicle exist
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const driver = await this.prisma.driver.findUnique({
        where: { id: dto.driverId },
      });
      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
      });
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      // 2. Generate a unique booking number
      let bookingNumber = '';
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        attempts++;
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        bookingNumber = `BK-${dateStr}-${randomDigits}`;

        const existing = await this.prisma.booking.findFirst({
          where: { bookingNumber },
        });
        if (!existing) {
          isUnique = true;
        }
      }

      const rTime = new Date(dto.reportingTime);
      const pickupTime = `${String(rTime.getHours()).padStart(2, '0')}:${String(rTime.getMinutes()).padStart(2, '0')}`;

      // Create Booking + Assignment + DutySlip inside a single transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const newBooking = await tx.booking.create({
          data: {
            tenantId: customer.tenantId,
            bookingNumber,
            customerId: dto.customerId,
            pickupLocation: dto.pickupLocation || 'Direct Duty Slip Pickup',
            dropLocation: dto.dropLocation || 'Direct Duty Slip Drop',
            pickupDate: new Date(dto.reportingTime),
            pickupTime,
            tripType: (dto.tripType as any) || 'LOCAL',
            vehicleTypeRequired: vehicle.vehicleType,
            status: BookingStatus.ASSIGNED,
            employeeId: dto.employeeId,
            guestName: dto.guestName,
            guestSalutation: dto.guestSalutation,
            bookingBy: dto.bookingBy,
            remarks: dto.remarks,
          } as any,
        });

        const newAssignment = await tx.assignment.create({
          data: {
            tenantId: customer.tenantId,
            bookingId: newBooking.id,
            driverId: dto.driverId,
            vehicleId: dto.vehicleId,
            status: 'ACTIVE',
          } as any,
        });

        // Set driver and vehicle as ON_TRIP
        await tx.driver.update({
          where: { id: dto.driverId },
          data: { status: 'ON_TRIP' as any },
        });

        await tx.vehicle.update({
          where: { id: dto.vehicleId },
          data: { status: 'ON_TRIP' as any },
        });

        // Generate unique duty slip number
        let dutySlipNumber = '';
        let isUniqueSlip = false;
        let attemptsSlip = 0;
        while (!isUniqueSlip && attemptsSlip < 10) {
          attemptsSlip++;
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const randomDigits = Math.floor(1000 + Math.random() * 9000);
          dutySlipNumber = `DS-${dateStr}-${randomDigits}`;

          const existing = await tx.dutySlip.findFirst({
            where: { dutySlipNumber },
          });
          if (!existing) {
            isUniqueSlip = true;
          }
        }

        const newSlip = await tx.dutySlip.create({
          data: {
            tenantId: customer.tenantId,
            dutySlipNumber,
            bookingId: newBooking.id,
            driverId: dto.driverId,
            vehicleId: dto.vehicleId,
            reportingTime: new Date(dto.reportingTime),
            startKm: dto.startKm,
            status: DutySlipStatus.DRAFT,
            employeeId: dto.employeeId,
          } as any,
        });

        return newSlip;
      });

      // Refetch with relations
      return this.prisma.dutySlip.findUnique({
        where: { id: result.id },
        include: {
          booking: { include: { customer: true } },
          driver: true,
          vehicle: true,
        },
      });
    }

    // 1. Fetch target booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // 2. Verify booking is ASSIGNED (must have driver/vehicle assignment)
    if (booking.status !== BookingStatus.ASSIGNED) {
      throw new BadRequestException('A duty slip can only be created for an ASSIGNED booking. Please assign resources first.');
    }

    // 3. Check if duty slip already exists for this booking
    const existingSlip = await this.prisma.dutySlip.findUnique({
      where: { bookingId },
    });
    if (existingSlip) {
      throw new ConflictException('A duty slip has already been generated for this booking');
    }

    // 4. Fetch the active assignment for this booking to pre-populate driver and vehicle
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        bookingId,
        status: 'ACTIVE',
      },
    });
    if (!assignment) {
      throw new BadRequestException('No active resource assignment found for this booking.');
    }

    // 5. Generate unique duty slip number
    let dutySlipNumber = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      attempts++;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      dutySlipNumber = `DS-${dateStr}-${randomDigits}`;

      const existing = await this.prisma.dutySlip.findFirst({
        where: { dutySlipNumber },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    // 6. Create the Duty Slip
    return this.prisma.dutySlip.create({
      data: {
        dutySlipNumber,
        bookingId,
        driverId: assignment.driverId,
        vehicleId: assignment.vehicleId,
        reportingTime: new Date(dto.reportingTime),
        startKm: dto.startKm,
        status: DutySlipStatus.DRAFT,
        employeeId: employeeId || booking.employeeId,
      } as any,
      include: {
        booking: { include: { customer: true } },
        driver: true,
        vehicle: true,
      },
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: DutySlipStatus;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { dutySlipNumber: { contains: query.search, mode: 'insensitive' } },
        {
          booking: {
            bookingNumber: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          driver: {
            name: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          vehicle: {
            vehicleNumber: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.dutySlip.count({ where }),
      this.prisma.dutySlip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: { include: { customer: true } },
          driver: true,
          vehicle: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const dutySlip = await this.prisma.dutySlip.findUnique({
      where: { id },
      include: {
        booking: { include: { customer: true } },
        driver: true,
        vehicle: true,
      },
    });

    if (!dutySlip) {
      throw new NotFoundException('Duty slip not found');
    }

    return dutySlip;
  }

  async update(id: string, dto: UpdateDutySlipDto) {
    const slip = await this.findOne(id);

    // If closing or filing the slip, validate KMs
    const startKm = dto.startKm !== undefined ? dto.startKm : Number(slip.startKm);
    const endKm = dto.endKm !== undefined ? dto.endKm : (slip.endKm ? Number(slip.endKm) : undefined);

    if (endKm !== undefined && endKm < startKm) {
      throw new BadRequestException('End KM cannot be less than Start KM');
    }

    // Auto set status to FILLED if endKm is supplied and status is not explicitly set
    let targetStatus = dto.status ?? slip.status;
    if (dto.endKm !== undefined && targetStatus === DutySlipStatus.DRAFT) {
      targetStatus = DutySlipStatus.FILLED;
    }

    // Update guest fields on Booking if any are provided
    if (dto.guestName !== undefined || dto.guestSalutation !== undefined || dto.bookingBy !== undefined || dto.remarks !== undefined) {
      await this.prisma.booking.update({
        where: { id: slip.bookingId },
        data: {
          guestName: dto.guestName,
          guestSalutation: dto.guestSalutation,
          bookingBy: dto.bookingBy,
          remarks: dto.remarks,
        },
      });
    }

    return this.prisma.dutySlip.update({
      where: { id },
      data: {
        reportingTime: dto.reportingTime ? new Date(dto.reportingTime) : undefined,
        startKm: dto.startKm,
        endKm: dto.endKm,
        toll: dto.toll,
        parking: dto.parking,
        nightCharges: dto.nightCharges,
        driverAllowance: dto.driverAllowance,
        extraCharges: dto.extraCharges,
        startDateTime: dto.startDateTime ? new Date(dto.startDateTime) : undefined,
        endDateTime: dto.endDateTime ? new Date(dto.endDateTime) : undefined,
        stateTax: dto.stateTax,
        mcd: dto.mcd,
        status: targetStatus,
        employeeId: dto.employeeId,
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
      },
      include: {
        booking: { include: { customer: true } },
        driver: true,
        vehicle: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.dutySlip.delete({
      where: { id },
    });
  }

  async generatePdf(id: string): Promise<Buffer> {
    const slip = await this.findOne(id);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: slip.tenantId },
    });

    const companyName = tenant?.name || 'TRAVEL DREAM';
    const slipTitle = tenant?.dutySlipTitle || 'TRIP OPERATIONAL DUTY SLIP';

    const primaryColor = tenant?.pdfColorPrimary || '#1E3A8A';
    const isRefined = tenant?.pdfTheme === 'REFINED';
    
    // Font mapping
    let fontRegular = 'Helvetica';
    let fontBold = 'Helvetica-Bold';
    if (tenant?.pdfFontFamily === 'Times-Roman') {
      fontRegular = 'Times-Roman';
      fontBold = 'Times-Bold';
    } else if (tenant?.pdfFontFamily === 'Courier') {
      fontRegular = 'Courier';
      fontBold = 'Courier-Bold';
    }

    const logoBuffer = await (async () => {
      const logoUrl = tenant?.logoUrl || '/logo.png';
      if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
        try {
          const res = await fetch(logoUrl, { signal: AbortSignal.timeout(2000) });
          if (res.ok) {
            return Buffer.from(await res.arrayBuffer());
          }
        } catch (e: any) {
          console.warn('Failed to fetch logo from URL:', logoUrl, e.message);
        }
      } else {
        try {
          const fs = require('fs');
          const cleanPath = logoUrl.replace(/^\//, '');
          const pathsToTry = [
            path.resolve(__dirname, '..', 'assets', cleanPath),
            path.resolve(__dirname, '..', '..', 'frontend', 'public', cleanPath),
            path.resolve(__dirname, '..', '..', '..', 'frontend', 'public', cleanPath),
            path.resolve(logoUrl),
          ];
          for (const p of pathsToTry) {
            if (fs.existsSync(p)) {
              return fs.readFileSync(p);
            }
          }
        } catch (e: any) {
          console.warn('Failed to read logo from local path:', logoUrl, e.message);
        }
      }
      return null;
    })();

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Title & Header layout
      const layout = tenant?.pdfHeaderLayout || 'SINGLE_LINE';
      const titleStr = slipTitle.toUpperCase();

      if (layout === 'SPLIT' && logoBuffer && !tenant?.hideLogoOnPdf) {
        doc.fillColor(primaryColor).fontSize(16).font(fontBold).text(companyName.toUpperCase(), 50, 30);
        doc.fillColor('#475569').fontSize(10).font(fontBold).text(titleStr, 50, 52);
        try {
          doc.image(logoBuffer, 460, 25, { width: 85, height: 35, fit: [85, 35] });
        } catch (e) {
          doc.fillColor('#64748B').fontSize(10).font(fontBold).text('LOGO', 460, 30, { align: 'right', width: 85 });
        }
      } else if (layout === 'STACKED') {
        doc.fillColor(primaryColor).fontSize(20).font(fontBold).text(companyName.toUpperCase(), 50, 25);
        doc.fillColor('#475569').fontSize(11).font(fontBold).text(titleStr, 50, 50);
      } else {
        // SINGLE_LINE
        doc.fillColor(primaryColor).fontSize(18).font(fontBold).text(companyName.toUpperCase(), 50, 30);
        doc.fillColor('#475569').fontSize(11).font(fontBold).text(titleStr, 350, 35, { align: 'right', width: 195 });
      }

      // Draw double lines for REFINED theme
      if (isRefined) {
        doc.moveTo(50, 63).lineTo(545, 63).lineWidth(1).stroke(primaryColor);
        doc.moveTo(50, 65.5).lineTo(545, 65.5).lineWidth(0.5).stroke(primaryColor);
        doc.lineWidth(1); // reset line width
      }

      // Reset text settings
      doc.fillColor('#0F172A').fontSize(10);

      // Section 1: Slip and Booking Info Metadata Table (shifted up to y=85)
      doc.rect(50, 85, 495, 60).stroke('#E2E8F0');
      doc.moveTo(50, 115).lineTo(545, 115).stroke('#E2E8F0');
      if (!isRefined) {
        doc.moveTo(297, 85).lineTo(297, 145).stroke('#E2E8F0');
      }

      // Row 1 Columns
      doc.font(fontBold).text('Duty Slip No:', 60, 95);
      doc.font(fontRegular).text(slip.dutySlipNumber, 150, 95);

      doc.font(fontBold).text('Booking Code:', 307, 95);
      doc.font(fontRegular).text(slip.booking.bookingNumber, 400, 95);

      // Row 2 Columns
      doc.font(fontBold).text('Slip Status:', 60, 125);
      doc.font(fontRegular).text(slip.status, 150, 125);

      doc.font(fontBold).text('Trip Date & Time:', 307, 125);
      const repDate = new Date(slip.reportingTime).toLocaleDateString('en-GB');
      const repTime = new Date(slip.reportingTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      doc.font(fontRegular).text(`${repDate} ${repTime}`, 400, 125);

      // Section 2: Customer & Route Information Card (shifted up to y=165)
      doc.fontSize(12).font(fontBold).text('Customer & Route Details', 50, 165);
      doc.rect(50, 180, 495, 95).stroke('#E2E8F0');
      
      doc.fontSize(10).font(fontBold).text('Customer Name:', 60, 188);
      doc.font(fontRegular).text(slip.booking.customer.name + (slip.booking.customer.companyName ? ` (${slip.booking.customer.companyName})` : ''), 150, 188);

      const guestDisplay = (slip.booking.guestSalutation ? slip.booking.guestSalutation + ' ' : '') + (slip.booking.guestName || '---');
      doc.font(fontBold).text('Guest Name:', 307, 188);
      doc.font(fontRegular).text(guestDisplay, 400, 188);

      const empId = slip.employeeId || slip.booking.employeeId;
      doc.font(fontBold).text('Employee ID:', 60, 203);
      doc.font(fontRegular).text(empId || '---', 150, 203);

      doc.font(fontBold).text('Booked By:', 307, 203);
      doc.font(fontRegular).text(slip.booking.bookingBy || '---', 400, 203);

      doc.font(fontBold).text('Pickup Address:', 60, 220);
      doc.font(fontRegular).text(slip.booking.pickupLocation, 150, 220, { width: 380, height: 15 });

      doc.font(fontBold).text('Drop Address:', 60, 237);
      doc.font(fontRegular).text(slip.booking.dropLocation, 150, 237, { width: 380, height: 15 });

      // Section 3: Driver & Vehicle Allocation Details (shifted up to y=292)
      doc.fontSize(12).font(fontBold).text('Allocated Resources', 50, 292);
      doc.rect(50, 307, 495, 60).stroke('#E2E8F0');
      if (!isRefined) {
        doc.moveTo(297, 307).lineTo(297, 367).stroke('#E2E8F0');
      }

      // Left Column (Driver)
      doc.fontSize(10).font(fontBold).text('Driver Name:', 60, 317);
      doc.font(fontRegular).text(slip.driver.name, 150, 317);
      doc.font(fontBold).text('License No:', 60, 342);
      doc.font(fontRegular).text(slip.driver.licenseNumber, 150, 342);

      // Right Column (Vehicle)
      doc.font(fontBold).text('Vehicle Plate:', 307, 317);
      doc.font(fontRegular).text(slip.vehicle.vehicleNumber, 400, 317);
      doc.font(fontBold).text('Model / Type:', 307, 342);
      doc.font(fontRegular).text(`${slip.vehicle.model} (${slip.vehicle.vehicleType})`, 400, 342);

      // Section 4: Operational Log Table (shifted up to y=382)
      doc.fontSize(12).font(fontBold).text('Operational Trip Logs', 50, 382);
      
      doc.rect(50, 397, 495, 80).stroke('#E2E8F0');
      doc.moveTo(50, 427).lineTo(545, 427).stroke('#E2E8F0');
      if (!isRefined) {
        doc.moveTo(165, 397).lineTo(165, 477).stroke('#E2E8F0');
        doc.moveTo(280, 397).lineTo(280, 477).stroke('#E2E8F0');
        doc.moveTo(395, 397).lineTo(395, 477).stroke('#E2E8F0');
      }

      // Table Header Row
      doc.fontSize(8).font(fontBold);
      doc.text('START KM', 55, 407);
      doc.text('END KM', 170, 407);
      doc.text('START DATE & TIME', 285, 407);
      doc.text('END DATE & TIME', 400, 407);

      // Table Data Row
      doc.fontSize(9).font(fontBold);
      doc.text(`${slip.startKm} KM`, 55, 442);
      doc.text(slip.endKm !== null ? `${slip.endKm} KM` : '--- KM', 170, 442);
      const formatDT = (dt: Date | string | null) => {
        if (!dt) return '---';
        const d = new Date(dt).toLocaleDateString('en-GB');
        const t = new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${d} ${t}`;
      };
      doc.text(formatDT(slip.startDateTime), 285, 442);
      doc.text(formatDT(slip.endDateTime), 400, 442);

      // Section 5: Tolls & Charges Receipt Table (shifted up to y=492)
      doc.fontSize(12).font(fontBold).text('Tolls & Incidentals Breakdown', 50, 492);
      
      doc.rect(50, 507, 495, 140).stroke('#E2E8F0');
      doc.moveTo(50, 542).lineTo(545, 542).stroke('#E2E8F0');
      doc.moveTo(50, 577).lineTo(545, 577).stroke('#E2E8F0');
      doc.moveTo(50, 612).lineTo(545, 612).stroke('#E2E8F0');
      if (!isRefined) {
        doc.moveTo(297, 507).lineTo(297, 647).stroke('#E2E8F0');
      }

      doc.fontSize(10).font(fontBold);
      doc.text('Toll Charges:', 60, 519);
      doc.font(fontRegular).text(`INR ${slip.toll}`, 180, 519);

      doc.font(fontBold).text('Parking Charges:', 307, 519);
      doc.font(fontRegular).text(`INR ${slip.parking}`, 420, 519);

      doc.font(fontBold).text('State Tax:', 60, 554);
      doc.font(fontRegular).text(`INR ${slip.stateTax}`, 180, 554);

      doc.font(fontBold).text('MCD Toll:', 307, 554);
      doc.font(fontRegular).text(`INR ${slip.mcd}`, 420, 554);

      doc.font(fontBold).text('Night Surcharge:', 60, 589);
      doc.font(fontRegular).text(`INR ${slip.nightCharges}`, 180, 589);

      doc.font(fontBold).text('Driver Allowance:', 307, 589);
      doc.font(fontRegular).text(`INR ${slip.driverAllowance}`, 420, 589);

      doc.font(fontBold).text('Extra / Misc Charges:', 60, 624);
      doc.font(fontRegular).text(`INR ${slip.extraCharges}`, 180, 624);

      const totalTolls = Number(slip.toll) + Number(slip.parking) + Number(slip.stateTax) + Number(slip.mcd) + Number(slip.nightCharges) + Number(slip.driverAllowance) + Number(slip.extraCharges);
      doc.font(fontBold).text('Total Incidentals:', 307, 624);
      doc.font(fontBold).fillColor(primaryColor).text(`INR ${totalTolls.toFixed(2)}`, 420, 624);

      // Reset color
      doc.fillColor('#0F172A');

      // Footer Signatures (shifted up to y=675 / 690)
      doc.fontSize(8).font(fontBold);
      doc.text('DRIVER SIGNATURE', 60, 690);
      doc.text('CUSTOMER SIGNATURE', 225, 690);
      doc.text('DISPATCH AUTHORIZED', 390, 690);

      doc.font(fontRegular);
      doc.text('-------------------------', 60, 675);
      doc.text('-------------------------', 225, 675);
      doc.text('-------------------------', 390, 675);

      // Print footer metadata (shifted to y=725)
      doc.fontSize(8).fillColor('#64748B').text('Document digitally generated by CABBS. Valid without seal.', 50, 725, { align: 'center' });

      // End PDF stream
      doc.end();
    });
  }
}
