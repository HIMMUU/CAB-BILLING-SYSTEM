import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDutySlipDto } from './dto/create-duty-slip.dto';
import { UpdateDutySlipDto } from './dto/update-duty-slip.dto';
import {
  DutySlipStatus,
  BookingStatus,
  AssignmentStatus,
  DriverStatus,
  VehicleStatus,
} from '@prisma/client';
import PDFDocument from 'pdfkit';

@Injectable()
export class DutySlipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDutySlipDto) {
    const bookingId = dto.bookingId;
    const employeeId = dto.employeeId;

    if (!bookingId) {
      // Create Duty Slip WITHOUT booking (Direct Duty Slip)
      let customer =
        dto.customerId && dto.customerId !== 'MANUAL'
          ? await this.prisma.customer.findUnique({
              where: { id: dto.customerId },
            })
          : null;

      if (!customer) {
        const defaultTenant = await this.prisma.tenant.findFirst();
        if (!defaultTenant) throw new NotFoundException('Tenant not found');
        const cName = dto.manualCustomerName || 'Direct Customer';

        let existing = await this.prisma.customer.findFirst({
          where: { tenantId: defaultTenant.id, name: cName },
        });
        if (!existing) {
          existing = await this.prisma.customer.create({
            data: {
              tenantId: defaultTenant.id,
              name: cName,
              phone: '0000000000',
              billingAddress: 'Direct Walk-in',
            },
          });
        }
        customer = existing;
      }

      let driver =
        dto.driverId && dto.driverId !== 'MANUAL'
          ? await this.prisma.driver.findUnique({ where: { id: dto.driverId } })
          : null;

      if (!driver) {
        const dName = dto.manualDriverName || 'External Driver';
        const dPhone =
          dto.manualDriverPhone && dto.manualDriverPhone.trim()
            ? dto.manualDriverPhone.trim()
            : 'EXT-' + Math.floor(1000000000 + Math.random() * 9000000000);
        let existing = await this.prisma.driver.findFirst({
          where: { tenantId: customer.tenantId, name: dName },
        });
        if (!existing) {
          const defaultExpiry = new Date();
          defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 5);

          existing = await this.prisma.driver.create({
            data: {
              tenantId: customer.tenantId,
              name: dName,
              mobile: dPhone,
              licenseNumber:
                'EXT-' + Math.floor(100000 + Math.random() * 900000),
              licenseExpiry: defaultExpiry,
              address: 'External / Ad-hoc Driver',
              emergencyContact: '0000000000',
            },
          });
        }
        driver = existing;
      }

      let vehicle =
        dto.vehicleId && dto.vehicleId !== 'MANUAL'
          ? await this.prisma.vehicle.findUnique({
              where: { id: dto.vehicleId },
            })
          : null;

      if (!vehicle) {
        const vNum =
          dto.manualVehicleNumber ||
          'EXT-CAB-' + Math.floor(100 + Math.random() * 900);
        const vModel = dto.manualVehicleModel || 'Standard Cab';
        let existing = await this.prisma.vehicle.findFirst({
          where: { tenantId: customer.tenantId, vehicleNumber: vNum },
        });
        if (!existing) {
          const defaultExpiry = new Date();
          defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 5);

          existing = await this.prisma.vehicle.create({
            data: {
              tenantId: customer.tenantId,
              vehicleNumber: vNum,
              model: vModel,
              vehicleType: 'Sedan',
              seatingCapacity: 4,
              registrationDate: new Date(),
              insuranceExpiry: defaultExpiry,
              fitnessExpiry: defaultExpiry,
              permitExpiry: defaultExpiry,
            },
          });
        }
        vehicle = existing;
      }

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: customer.tenantId },
      });

      const bkPrefix =
        tenant?.bookingPrefix !== undefined ? tenant.bookingPrefix : 'BK-2026-';
      const bkStart = tenant?.bookingStartingNumber || 1001;
      const countBookings = await this.prisma.booking.count({
        where: { tenantId: customer.tenantId },
      });
      let bookingNumber = '';
      let isUnique = false;
      let currentBkVal = countBookings + bkStart;
      while (!isUnique) {
        bookingNumber = `${bkPrefix}${currentBkVal}`;
        const existing = await this.prisma.booking.findFirst({
          where: { tenantId: customer.tenantId, bookingNumber },
        });
        if (!existing) {
          isUnique = true;
        } else {
          currentBkVal++;
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
            customerId: customer.id,
            pickupLocation: dto.pickupLocation || 'Direct Duty Slip Pickup',
            dropLocation: dto.dropLocation || 'Direct Duty Slip Drop',
            pickupDate: new Date(dto.reportingTime),
            pickupTime,
            tripType: (dto.tripType as any) || 'LOCAL',
            vehicleTypeRequired: vehicle.vehicleType,
            status: BookingStatus.ASSIGNED,
            employeeId: dto.employeeId,
            guestName: dto.guestName || dto.manualCustomerName,
            guestSalutation: dto.guestSalutation,
            bookingBy: dto.bookingBy,
            remarks: dto.remarks,
          } as any,
        });

        const newAssignment = await tx.assignment.create({
          data: {
            tenantId: customer.tenantId,
            bookingId: newBooking.id,
            driverId: driver.id,
            vehicleId: vehicle.id,
            status: 'ACTIVE',
          } as any,
        });

        // Set driver and vehicle as ON_TRIP
        await tx.driver.update({
          where: { id: driver.id },
          data: { status: 'ON_TRIP' as any },
        });

        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { status: 'ON_TRIP' as any },
        });

        // Generate unique duty slip number
        const dsPrefix =
          tenant?.dutySlipPrefix !== undefined
            ? tenant.dutySlipPrefix
            : 'DS-2026-';
        const dsStart = tenant?.dutySlipStartingNumber || 1001;
        const countSlips = await tx.dutySlip.count({
          where: { tenantId: customer.tenantId },
        });
        let dutySlipNumber = '';
        let isUniqueSlip = false;
        let currentDsVal = countSlips + dsStart;
        while (!isUniqueSlip) {
          dutySlipNumber = `${dsPrefix}${currentDsVal}`;
          const existing = await tx.dutySlip.findFirst({
            where: { tenantId: customer.tenantId, dutySlipNumber },
          });
          if (!existing) {
            isUniqueSlip = true;
          } else {
            currentDsVal++;
          }
        }

        const newSlip = await tx.dutySlip.create({
          data: {
            tenantId: customer.tenantId,
            dutySlipNumber,
            bookingId: newBooking.id,
            driverId: driver.id,
            vehicleId: vehicle.id,
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
      throw new BadRequestException(
        'A duty slip can only be created for an ASSIGNED booking. Please assign resources first.',
      );
    }

    // 3. Check if duty slip already exists for this booking
    const existingSlip = await this.prisma.dutySlip.findUnique({
      where: { bookingId },
    });
    if (existingSlip) {
      throw new ConflictException(
        'A duty slip has already been generated for this booking',
      );
    }

    // 4. Fetch the active assignment for this booking to pre-populate driver and vehicle
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        bookingId,
        status: 'ACTIVE',
      },
    });
    if (!assignment) {
      throw new BadRequestException(
        'No active resource assignment found for this booking.',
      );
    }

    // 5. Generate unique duty slip number
    const countSlips = await this.prisma.dutySlip.count();
    let dutySlipNumber = '';
    let isUnique = false;
    let currentDsVal = countSlips + 1;
    while (!isUnique) {
      dutySlipNumber = String(currentDsVal);
      const existing = await this.prisma.dutySlip.findFirst({
        where: { dutySlipNumber },
      });
      if (!existing) {
        isUnique = true;
      } else {
        currentDsVal++;
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
    const startKm =
      dto.startKm !== undefined ? dto.startKm : Number(slip.startKm);
    const endKm =
      dto.endKm !== undefined
        ? dto.endKm
        : slip.endKm
          ? Number(slip.endKm)
          : undefined;

    if (endKm !== undefined && endKm < startKm) {
      throw new BadRequestException('End KM cannot be less than Start KM');
    }

    // Validate Start and End DateTimes
    const startDt = dto.startDateTime
      ? new Date(dto.startDateTime)
      : slip.startDateTime
        ? new Date(slip.startDateTime)
        : null;
    const endDt = dto.endDateTime
      ? new Date(dto.endDateTime)
      : slip.endDateTime
        ? new Date(slip.endDateTime)
        : null;

    if (startDt && endDt && endDt < startDt) {
      throw new BadRequestException(
        'End Date & Time cannot be before Start Date & Time',
      );
    }

    // Auto set status to FILLED if endKm is supplied and status is not explicitly set
    let targetStatus = dto.status ?? slip.status;
    if (dto.endKm !== undefined && targetStatus === DutySlipStatus.DRAFT) {
      targetStatus = DutySlipStatus.FILLED;
    }

    // Update guest fields on Booking if any are provided
    if (
      dto.guestName !== undefined ||
      dto.guestSalutation !== undefined ||
      dto.bookingBy !== undefined ||
      dto.remarks !== undefined
    ) {
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
        reportingTime: dto.reportingTime
          ? new Date(dto.reportingTime)
          : undefined,
        startKm: dto.startKm,
        endKm: dto.endKm,
        toll: dto.toll,
        parking: dto.parking,
        nightCharges: dto.nightCharges,
        driverAllowance: dto.driverAllowance,
        extraCharges: dto.extraCharges,
        startDateTime: dto.startDateTime
          ? new Date(dto.startDateTime)
          : undefined,
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
    const slip = await this.prisma.dutySlip.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            invoiceItems: true,
          },
        },
        booking: true,
      },
    });

    if (!slip) {
      throw new NotFoundException('Duty slip not found');
    }

    if (
      slip.trip &&
      slip.trip.invoiceItems &&
      slip.trip.invoiceItems.length > 0
    ) {
      throw new BadRequestException(
        'Cannot delete a duty slip that has already been billed on an invoice. Please remove it from the invoice first.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete associated Trip if unbilled
      if (slip.trip) {
        await tx.trip.delete({
          where: { id: slip.trip.id },
        });
      }

      // 2. Delete associated Assignment(s) for this booking, if any
      if (slip.bookingId) {
        await tx.assignment.deleteMany({
          where: { bookingId: slip.bookingId },
        });
      }

      // 3. Delete Duty Slip itself
      const deletedSlip = await tx.dutySlip.delete({
        where: { id },
      });

      // 4. Reset Booking status to PENDING
      if (slip.bookingId) {
        await tx.booking.update({
          where: { id: slip.bookingId },
          data: { status: BookingStatus.PENDING },
        });
      }

      // 5. Check if driver has other active assignments; if not, revert status to AVAILABLE
      if (slip.driverId) {
        const activeDriverAssignments = await tx.assignment.count({
          where: {
            driverId: slip.driverId,
            status: AssignmentStatus.ACTIVE,
          },
        });
        if (activeDriverAssignments === 0) {
          await tx.driver.update({
            where: { id: slip.driverId },
            data: { status: DriverStatus.AVAILABLE },
          });
        }
      }

      // 6. Check if vehicle has other active assignments; if not, revert status to AVAILABLE
      if (slip.vehicleId) {
        const activeVehicleAssignments = await tx.assignment.count({
          where: {
            vehicleId: slip.vehicleId,
            status: AssignmentStatus.ACTIVE,
          },
        });
        if (activeVehicleAssignments === 0) {
          await tx.vehicle.update({
            where: { id: slip.vehicleId },
            data: { status: VehicleStatus.AVAILABLE },
          });
        }
      }

      return deletedSlip;
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
          const res = await fetch(logoUrl, {
            signal: AbortSignal.timeout(2000),
          });
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
            path.resolve(
              __dirname,
              '..',
              '..',
              'frontend',
              'public',
              cleanPath,
            ),
            path.resolve(
              __dirname,
              '..',
              '..',
              '..',
              'frontend',
              'public',
              cleanPath,
            ),
            path.resolve(logoUrl),
          ];
          for (const p of pathsToTry) {
            if (fs.existsSync(p)) {
              return fs.readFileSync(p);
            }
          }
        } catch (e: any) {
          console.warn(
            'Failed to read logo from local path:',
            logoUrl,
            e.message,
          );
        }
      }
      return null;
    })();

    const signatureBuffer = await (async () => {
      const sigUrl = tenant?.digitalSignatureUrl;
      if (!sigUrl) return null;

      // Handle Data URL (base64)
      if (sigUrl.startsWith('data:image/')) {
        try {
          const base64Data = sigUrl.split(',')[1];
          if (base64Data) {
            return Buffer.from(base64Data, 'base64');
          }
        } catch (e: any) {
          console.warn('Failed to parse base64 digital signature:', e.message);
        }
      }

      // Handle HTTP/HTTPS URL
      if (sigUrl.startsWith('http://') || sigUrl.startsWith('https://')) {
        try {
          const res = await fetch(sigUrl, {
            signal: AbortSignal.timeout(2500),
          });
          if (res.ok) {
            return Buffer.from(await res.arrayBuffer());
          }
        } catch (e: any) {
          console.warn(
            'Failed to fetch digital signature from URL:',
            sigUrl,
            e.message,
          );
        }
      }

      // Handle local file paths
      try {
        const fs = require('fs');
        const cleanPath = sigUrl.replace(/^\//, '');
        const pathsToTry = [
          path.resolve(__dirname, '..', 'assets', cleanPath),
          path.resolve(__dirname, '..', '..', 'frontend', 'public', cleanPath),
          path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'frontend',
            'public',
            cleanPath,
          ),
          path.resolve(cleanPath),
          path.resolve(sigUrl),
        ];
        for (const p of pathsToTry) {
          if (fs.existsSync(p)) {
            return fs.readFileSync(p);
          }
        }
      } catch (e: any) {
        console.warn(
          'Failed to read digital signature from local path:',
          sigUrl,
          e.message,
        );
      }

      return null;
    })();

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const titleStr = slipTitle.toUpperCase();
      const hasLogo = logoBuffer && !tenant?.hideLogoOnPdf;

      // Draw Logo on Top-Left (Bigger: 130x65)
      if (hasLogo) {
        try {
          doc.image(logoBuffer, 50, 10, {
            width: 130,
            height: 65,
            fit: [130, 65],
          });
        } catch (e) {
          console.warn('Failed to draw logo on duty slip:', e);
        }
      }

      const textStartX = hasLogo ? 190 : 50;
      const textWidth = hasLogo ? 355 : 495;
      const companyNameColor = tenant?.pdfColorCompanyName || primaryColor;

      // Company Name (Bigger, 22pt bold)
      doc
        .fillColor(companyNameColor)
        .fontSize(22)
        .font(fontBold)
        .text(companyName.toUpperCase(), textStartX, 15, {
          width: textWidth,
          align: 'left',
        });

      // Duty Slip Title (Bigger, 11.5pt bold)
      doc
        .fillColor('#334155')
        .fontSize(11.5)
        .font(fontBold)
        .text(titleStr, textStartX, 40, {
          width: textWidth,
          align: 'left',
        });

      // Address & Helpline info
      let currentHeaderY = 55;

      const addressStr = tenant?.companyAddress || '';
      if (addressStr) {
        doc.fontSize(8.5).font(fontRegular);
        const addrHeight = doc.heightOfString(addressStr, { width: textWidth });
        doc
          .fillColor('#475569')
          .text(addressStr, textStartX, currentHeaderY, {
            width: textWidth,
            align: 'left',
          });
        currentHeaderY += addrHeight + 3;
      }

      const helplineStr = tenant?.companyPhone
        ? `Helpline / Contact: ${tenant.companyPhone}${tenant?.companyEmail ? ` | Email: ${tenant.companyEmail}` : ''}`
        : tenant?.companyEmail
          ? `Email: ${tenant.companyEmail}`
          : '';

      if (helplineStr) {
        doc
          .fillColor(primaryColor)
          .fontSize(8.5)
          .font(fontBold)
          .text(helplineStr, textStartX, currentHeaderY, {
            width: textWidth,
            align: 'left',
          });
        currentHeaderY += 12;
      }

      // Draw horizontal divider line
      const lineY = Math.max(currentHeaderY + 4, 82);
      if (isRefined) {
        doc.moveTo(50, lineY).lineTo(545, lineY).lineWidth(1).stroke(primaryColor);
        doc
          .moveTo(50, lineY + 2.5)
          .lineTo(545, lineY + 2.5)
          .lineWidth(0.5)
          .stroke(primaryColor);
        doc.lineWidth(1); // reset line width
      } else {
        doc.moveTo(50, lineY).lineTo(545, lineY).lineWidth(0.5).stroke('#CBD5E1');
      }

      // Reset text settings
      doc.fillColor('#0F172A').fontSize(10);

      const tableStartY = lineY + 8;

      // Section 1: Slip and Booking Info Metadata Table (Without Slip Status)
      doc.rect(50, tableStartY, 495, 52).stroke('#E2E8F0');
      doc.moveTo(50, tableStartY + 26).lineTo(545, tableStartY + 26).stroke('#E2E8F0');
      if (!isRefined) {
        doc.moveTo(297, tableStartY).lineTo(297, tableStartY + 26).stroke('#E2E8F0');
      }

      // Row 1 Columns
      doc.font(fontBold).text('Duty Slip No:', 60, tableStartY + 8);
      doc.font(fontRegular).text(slip.dutySlipNumber, 150, tableStartY + 8);

      const bookingCode = slip.booking?.bookingNumber || 'DIRECT-DS';
      doc.font(fontBold).text('Booking Code:', 307, tableStartY + 8);
      doc.font(fontRegular).text(bookingCode, 400, tableStartY + 8);

      // Row 2 Column: Trip Date & Time
      doc.font(fontBold).text('Trip Date & Time:', 60, tableStartY + 33);
      const repDate = new Date(slip.reportingTime).toLocaleDateString('en-GB');
      const repTime = new Date(slip.reportingTime).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      doc.font(fontRegular).text(`${repDate} ${repTime}`, 180, tableStartY + 33);

      // Section 2: Customer & Route Information Card (With Duty Type)
      const sec2TitleY = tableStartY + 60;
      const sec2BoxY = sec2TitleY + 15;
      doc.fontSize(12).font(fontBold).text('Customer & Route Details', 50, sec2TitleY);
      doc.rect(50, sec2BoxY, 495, 95).stroke('#E2E8F0');

      const custName = slip.booking?.customer?.name
        ? slip.booking.customer.name +
          (slip.booking.customer.companyName
            ? ` (${slip.booking.customer.companyName})`
            : '')
        : (slip as any).manualCustomerName || 'Direct Customer';

      doc.fontSize(10).font(fontBold).text('Customer Name:', 60, sec2BoxY + 8);
      doc.font(fontRegular).text(custName, 150, sec2BoxY + 8);

      const guestDisplay =
        (slip.booking?.guestSalutation
          ? slip.booking.guestSalutation + ' '
          : '') + (slip.booking?.guestName || (slip as any).manualGuestName || '---');
      doc.font(fontBold).text('Guest Name:', 307, sec2BoxY + 8);
      doc.font(fontRegular).text(guestDisplay, 400, sec2BoxY + 8);

      const dutyTypeVal = (slip.booking?.tripType || 'LOCAL').replace(/_/g, ' ');
      doc.font(fontBold).text('Duty Type:', 60, sec2BoxY + 23);
      doc.font(fontRegular).text(dutyTypeVal, 150, sec2BoxY + 23);

      const empId = slip.employeeId || slip.booking?.employeeId;
      doc.font(fontBold).text('Emp ID:', 260, sec2BoxY + 23);
      doc.font(fontRegular).text(empId || '---', 305, sec2BoxY + 23);

      const bookedBy = slip.booking?.bookingBy || 'Direct Walk-in';
      doc.font(fontBold).text('Booked By:', 370, sec2BoxY + 23);
      doc.font(fontRegular).text(bookedBy, 435, sec2BoxY + 23);

      const pickupLoc = slip.booking?.pickupLocation || (slip as any).manualPickupLocation || '---';
      const dropLoc = slip.booking?.dropLocation || (slip as any).manualDropLocation || '---';

      doc.font(fontBold).text('Pickup Address:', 60, sec2BoxY + 40);
      doc.font(fontRegular).text(pickupLoc, 150, sec2BoxY + 40, {
        width: 380,
      });

      doc.font(fontBold).text('Drop Address:', 60, sec2BoxY + 57);
      doc.font(fontRegular).text(dropLoc, 150, sec2BoxY + 57, { width: 380 });

      // Section 3: Driver & Vehicle Allocation Details (VEHICLE NUMBER)
      const sec3TitleY = sec2BoxY + 110;
      const sec3BoxY = sec3TitleY + 15;
      doc.fontSize(12).font(fontBold).text('Allocated Resources', 50, sec3TitleY);
      doc.rect(50, sec3BoxY, 495, 40).stroke('#E2E8F0');
      if (!isRefined) {
        doc.moveTo(297, sec3BoxY).lineTo(297, sec3BoxY + 40).stroke('#E2E8F0');
      }

      // Left Column (Driver)
      doc.fontSize(10).font(fontBold).text('Driver Name:', 60, sec3BoxY + 12);
      doc.font(fontRegular).text(slip.driver.name, 150, sec3BoxY + 12);

      // Right Column (Vehicle Number & Car Type)
      doc.font(fontBold).text('VEHICLE NUMBER:', 307, sec3BoxY + 7);
      doc.font(fontRegular).text(slip.vehicle.vehicleNumber, 415, sec3BoxY + 7);
      doc.font(fontBold).text('CAR TYPE:', 307, sec3BoxY + 22);
      doc
        .font(fontRegular)
        .text(`${slip.vehicle.model} (${slip.vehicle.vehicleType})`, 380, sec3BoxY + 22);

      // Section 4: Trip Details (Empty Space for Manual Fill)
      const sec4TitleY = sec3BoxY + 50;
      const sec4BoxY = sec4TitleY + 15;
      doc.fontSize(12).font(fontBold).text('Trip Details', 50, sec4TitleY);
      doc.rect(50, sec4BoxY, 495, 45).stroke('#E2E8F0');
      if (!isRefined) {
        doc.moveTo(297, sec4BoxY).lineTo(297, sec4BoxY + 45).stroke('#E2E8F0');
      }

      const reqVehicleStr = slip.booking?.vehicleTypeRequired || slip.vehicle.vehicleType;
      doc.fontSize(9.5).font(fontBold).text('Req. Vehicle:', 60, sec4BoxY + 9);
      doc.font(fontRegular).text(reqVehicleStr, 150, sec4BoxY + 9);

      doc.font(fontBold).text('Driver Notes:', 307, sec4BoxY + 9);
      doc.font(fontRegular).text('____________________', 380, sec4BoxY + 9);

      doc.font(fontBold).text('Driver Remarks:', 60, sec4BoxY + 27);
      doc.font(fontRegular).text('__________________________________________________________', 150, sec4BoxY + 27);

      // Section 5: Operational Trip Logs (Empty Blank Lines for Manual Entry)
      const sec5TitleY = sec4BoxY + 55;
      const sec5BoxY = sec5TitleY + 15;
      doc.fontSize(12).font(fontBold).text('Operational Trip Logs', 50, sec5TitleY);

      doc.rect(50, sec5BoxY, 495, 70).stroke('#E2E8F0');
      doc.moveTo(50, sec5BoxY + 30).lineTo(545, sec5BoxY + 30).stroke('#E2E8F0');
      if (!isRefined) {
        doc.moveTo(165, sec5BoxY).lineTo(165, sec5BoxY + 70).stroke('#E2E8F0');
        doc.moveTo(280, sec5BoxY).lineTo(280, sec5BoxY + 70).stroke('#E2E8F0');
        doc.moveTo(395, sec5BoxY).lineTo(395, sec5BoxY + 70).stroke('#E2E8F0');
      }

      // Table Header Row
      doc.fontSize(8).font(fontBold);
      doc.text('START KM', 55, sec5BoxY + 10);
      doc.text('END KM', 170, sec5BoxY + 10);
      doc.text('START DATE & TIME', 285, sec5BoxY + 10);
      doc.text('END DATE & TIME', 400, sec5BoxY + 10);

      // Table Data Row (Always Blank for Driver Manual Entry)
      doc.fontSize(9).font(fontBold);
      doc.text('___________ KM', 55, sec5BoxY + 45);
      doc.text('___________ KM', 170, sec5BoxY + 45);
      doc.text('___/___/___  ___:___', 285, sec5BoxY + 45);
      doc.text('___/___/___  ___:___', 400, sec5BoxY + 45);

      // Section 6: Tolls & Charges Receipt Table
      const sec6TitleY = sec5BoxY + 80;
      const sec6BoxY = sec6TitleY + 15;
      doc
        .fontSize(12)
        .font(fontBold)
        .text('Tolls & Incidentals Breakdown', 50, sec6TitleY);

      doc.rect(50, sec6BoxY, 495, 120).stroke('#E2E8F0');
      doc.moveTo(50, sec6BoxY + 30).lineTo(545, sec6BoxY + 30).stroke('#E2E8F0');
      doc.moveTo(50, sec6BoxY + 60).lineTo(545, sec6BoxY + 60).stroke('#E2E8F0');
      doc.moveTo(50, sec6BoxY + 90).lineTo(545, sec6BoxY + 90).stroke('#E2E8F0');
      if (!isRefined) {
        doc.moveTo(297, sec6BoxY).lineTo(297, sec6BoxY + 120).stroke('#E2E8F0');
      }

      doc.fontSize(9.5).font(fontBold);
      doc.text('Toll Charges:', 60, sec6BoxY + 10);
      doc
        .font(fontRegular)
        .text(
          slip.status === 'DRAFT' ? 'INR ___________' : `INR ${slip.toll}`,
          180,
          sec6BoxY + 10,
        );

      doc.font(fontBold).text('Parking Charges:', 307, sec6BoxY + 10);
      doc
        .font(fontRegular)
        .text(
          slip.status === 'DRAFT' ? 'INR ___________' : `INR ${slip.parking}`,
          420,
          sec6BoxY + 10,
        );

      doc.font(fontBold).text('State Tax:', 60, sec6BoxY + 40);
      doc
        .font(fontRegular)
        .text(
          slip.status === 'DRAFT' ? 'INR ___________' : `INR ${slip.stateTax}`,
          180,
          sec6BoxY + 40,
        );

      doc.font(fontBold).text('MCD Toll:', 307, sec6BoxY + 40);
      doc
        .font(fontRegular)
        .text(
          slip.status === 'DRAFT' ? 'INR ___________' : `INR ${slip.mcd}`,
          420,
          sec6BoxY + 40,
        );

      doc.font(fontBold).text('Night Allowance:', 60, sec6BoxY + 70);
      doc
        .font(fontRegular)
        .text(
          slip.status === 'DRAFT'
            ? 'INR ___________'
            : `INR ${slip.nightCharges}`,
          180,
          sec6BoxY + 70,
        );

      doc.font(fontBold).text('Driver Allowance:', 307, sec6BoxY + 70);
      doc
        .font(fontRegular)
        .text(
          slip.status === 'DRAFT'
            ? 'INR ___________'
            : `INR ${slip.driverAllowance}`,
          420,
          sec6BoxY + 70,
        );

      doc.font(fontBold).text('Extra / Misc Charges:', 60, sec6BoxY + 100);
      doc
        .font(fontRegular)
        .text(
          slip.status === 'DRAFT'
            ? 'INR ___________'
            : `INR ${slip.extraCharges}`,
          180,
          sec6BoxY + 100,
        );

      const totalTolls =
        Number(slip.toll) +
        Number(slip.parking) +
        Number(slip.stateTax) +
        Number(slip.mcd) +
        Number(slip.nightCharges) +
        Number(slip.driverAllowance) +
        Number(slip.extraCharges);
      doc.font(fontBold).text('Total Incidentals:', 307, sec6BoxY + 100);
      if (slip.status === 'DRAFT') {
        doc
          .font(fontBold)
          .fillColor(primaryColor)
          .text('INR ___________', 420, sec6BoxY + 100);
      } else {
        doc
          .font(fontBold)
          .fillColor(primaryColor)
          .text(`INR ${totalTolls.toFixed(2)}`, 420, sec6BoxY + 100);
      }

      // Reset color
      doc.fillColor('#0F172A');

      // Footer Signatures (with Digital Signature)
      const sigLineY = Math.min(sec6BoxY + 165, 715);
      doc.fontSize(8).font(fontBold);
      doc.text('DRIVER SIGNATURE', 60, sigLineY + 15);
      doc.text('CUSTOMER SIGNATURE', 225, sigLineY + 15);
      doc.text('DISPATCH AUTHORIZED', 390, sigLineY + 15);

      doc.font(fontRegular);
      doc.text('-------------------------', 60, sigLineY);
      doc.text('-------------------------', 225, sigLineY);

      if (signatureBuffer) {
        try {
          doc.image(signatureBuffer, 385, sigLineY - 30, {
            width: 110,
            height: 28,
            fit: [110, 28],
          });
        } catch (e) {
          doc.text('-------------------------', 390, sigLineY);
        }
      } else {
        doc.text('-------------------------', 390, sigLineY);
      }

      // End PDF stream
      doc.end();
    });
  }
}
