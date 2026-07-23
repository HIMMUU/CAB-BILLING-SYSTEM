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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutySlipsService = void 0;
const common_1 = require("@nestjs/common");
const path = __importStar(require("path"));
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const pdfkit_1 = __importDefault(require("pdfkit"));
let DutySlipsService = class DutySlipsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const bookingId = dto.bookingId;
        const employeeId = dto.employeeId;
        if (!bookingId) {
            if (!dto.customerId || !dto.driverId || !dto.vehicleId) {
                throw new common_1.BadRequestException('Customer ID, Driver ID, and Vehicle ID are required to create a duty slip without an existing booking');
            }
            const customer = await this.prisma.customer.findUnique({
                where: { id: dto.customerId },
            });
            if (!customer) {
                throw new common_1.NotFoundException('Customer not found');
            }
            const driver = await this.prisma.driver.findUnique({
                where: { id: dto.driverId },
            });
            if (!driver) {
                throw new common_1.NotFoundException('Driver not found');
            }
            const vehicle = await this.prisma.vehicle.findUnique({
                where: { id: dto.vehicleId },
            });
            if (!vehicle) {
                throw new common_1.NotFoundException('Vehicle not found');
            }
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: customer.tenantId },
            });
            const bkPrefix = tenant?.bookingPrefix !== undefined ? tenant.bookingPrefix : 'BK-2026-';
            const bkStart = tenant?.bookingStartingNumber || 1001;
            const countBookings = await this.prisma.booking.count({ where: { tenantId: customer.tenantId } });
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
                }
                else {
                    currentBkVal++;
                }
            }
            const rTime = new Date(dto.reportingTime);
            const pickupTime = `${String(rTime.getHours()).padStart(2, '0')}:${String(rTime.getMinutes()).padStart(2, '0')}`;
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
                        tripType: dto.tripType || 'LOCAL',
                        vehicleTypeRequired: vehicle.vehicleType,
                        status: client_1.BookingStatus.ASSIGNED,
                        employeeId: dto.employeeId,
                        guestName: dto.guestName,
                        guestSalutation: dto.guestSalutation,
                        bookingBy: dto.bookingBy,
                        remarks: dto.remarks,
                    },
                });
                const newAssignment = await tx.assignment.create({
                    data: {
                        tenantId: customer.tenantId,
                        bookingId: newBooking.id,
                        driverId: dto.driverId,
                        vehicleId: dto.vehicleId,
                        status: 'ACTIVE',
                    },
                });
                await tx.driver.update({
                    where: { id: dto.driverId },
                    data: { status: 'ON_TRIP' },
                });
                await tx.vehicle.update({
                    where: { id: dto.vehicleId },
                    data: { status: 'ON_TRIP' },
                });
                const dsPrefix = tenant?.dutySlipPrefix !== undefined ? tenant.dutySlipPrefix : 'DS-2026-';
                const dsStart = tenant?.dutySlipStartingNumber || 1001;
                const countSlips = await tx.dutySlip.count({ where: { tenantId: customer.tenantId } });
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
                    }
                    else {
                        currentDsVal++;
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
                        status: client_1.DutySlipStatus.DRAFT,
                        employeeId: dto.employeeId,
                    },
                });
                return newSlip;
            });
            return this.prisma.dutySlip.findUnique({
                where: { id: result.id },
                include: {
                    booking: { include: { customer: true } },
                    driver: true,
                    vehicle: true,
                },
            });
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.status !== client_1.BookingStatus.ASSIGNED) {
            throw new common_1.BadRequestException('A duty slip can only be created for an ASSIGNED booking. Please assign resources first.');
        }
        const existingSlip = await this.prisma.dutySlip.findUnique({
            where: { bookingId },
        });
        if (existingSlip) {
            throw new common_1.ConflictException('A duty slip has already been generated for this booking');
        }
        const assignment = await this.prisma.assignment.findFirst({
            where: {
                bookingId,
                status: 'ACTIVE',
            },
        });
        if (!assignment) {
            throw new common_1.BadRequestException('No active resource assignment found for this booking.');
        }
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
            }
            else {
                currentDsVal++;
            }
        }
        return this.prisma.dutySlip.create({
            data: {
                dutySlipNumber,
                bookingId,
                driverId: assignment.driverId,
                vehicleId: assignment.vehicleId,
                reportingTime: new Date(dto.reportingTime),
                startKm: dto.startKm,
                status: client_1.DutySlipStatus.DRAFT,
                employeeId: employeeId || booking.employeeId,
            },
            include: {
                booking: { include: { customer: true } },
                driver: true,
                vehicle: true,
            },
        });
    }
    async findAll(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const where = {};
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
    async findOne(id) {
        const dutySlip = await this.prisma.dutySlip.findUnique({
            where: { id },
            include: {
                booking: { include: { customer: true } },
                driver: true,
                vehicle: true,
            },
        });
        if (!dutySlip) {
            throw new common_1.NotFoundException('Duty slip not found');
        }
        return dutySlip;
    }
    async update(id, dto) {
        const slip = await this.findOne(id);
        const startKm = dto.startKm !== undefined ? dto.startKm : Number(slip.startKm);
        const endKm = dto.endKm !== undefined
            ? dto.endKm
            : slip.endKm
                ? Number(slip.endKm)
                : undefined;
        if (endKm !== undefined && endKm < startKm) {
            throw new common_1.BadRequestException('End KM cannot be less than Start KM');
        }
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
            throw new common_1.BadRequestException('End Date & Time cannot be before Start Date & Time');
        }
        let targetStatus = dto.status ?? slip.status;
        if (dto.endKm !== undefined && targetStatus === client_1.DutySlipStatus.DRAFT) {
            targetStatus = client_1.DutySlipStatus.FILLED;
        }
        if (dto.guestName !== undefined ||
            dto.guestSalutation !== undefined ||
            dto.bookingBy !== undefined ||
            dto.remarks !== undefined) {
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
    async remove(id) {
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
            throw new common_1.NotFoundException('Duty slip not found');
        }
        if (slip.trip &&
            slip.trip.invoiceItems &&
            slip.trip.invoiceItems.length > 0) {
            throw new common_1.BadRequestException('Cannot delete a duty slip that has already been billed on an invoice. Please remove it from the invoice first.');
        }
        return this.prisma.$transaction(async (tx) => {
            if (slip.trip) {
                await tx.trip.delete({
                    where: { id: slip.trip.id },
                });
            }
            if (slip.bookingId) {
                await tx.assignment.deleteMany({
                    where: { bookingId: slip.bookingId },
                });
            }
            const deletedSlip = await tx.dutySlip.delete({
                where: { id },
            });
            if (slip.bookingId) {
                await tx.booking.update({
                    where: { id: slip.bookingId },
                    data: { status: client_1.BookingStatus.PENDING },
                });
            }
            if (slip.driverId) {
                const activeDriverAssignments = await tx.assignment.count({
                    where: {
                        driverId: slip.driverId,
                        status: client_1.AssignmentStatus.ACTIVE,
                    },
                });
                if (activeDriverAssignments === 0) {
                    await tx.driver.update({
                        where: { id: slip.driverId },
                        data: { status: client_1.DriverStatus.AVAILABLE },
                    });
                }
            }
            if (slip.vehicleId) {
                const activeVehicleAssignments = await tx.assignment.count({
                    where: {
                        vehicleId: slip.vehicleId,
                        status: client_1.AssignmentStatus.ACTIVE,
                    },
                });
                if (activeVehicleAssignments === 0) {
                    await tx.vehicle.update({
                        where: { id: slip.vehicleId },
                        data: { status: client_1.VehicleStatus.AVAILABLE },
                    });
                }
            }
            return deletedSlip;
        });
    }
    async generatePdf(id) {
        const slip = await this.findOne(id);
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: slip.tenantId },
        });
        const companyName = tenant?.name || 'TRAVEL DREAM';
        const slipTitle = tenant?.dutySlipTitle || 'TRIP OPERATIONAL DUTY SLIP';
        const primaryColor = tenant?.pdfColorPrimary || '#1E3A8A';
        const isRefined = tenant?.pdfTheme === 'REFINED';
        let fontRegular = 'Helvetica';
        let fontBold = 'Helvetica-Bold';
        if (tenant?.pdfFontFamily === 'Times-Roman') {
            fontRegular = 'Times-Roman';
            fontBold = 'Times-Bold';
        }
        else if (tenant?.pdfFontFamily === 'Courier') {
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
                }
                catch (e) {
                    console.warn('Failed to fetch logo from URL:', logoUrl, e.message);
                }
            }
            else {
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
                }
                catch (e) {
                    console.warn('Failed to read logo from local path:', logoUrl, e.message);
                }
            }
            return null;
        })();
        const signatureBuffer = await (async () => {
            const sigUrl = tenant?.digitalSignatureUrl;
            if (!sigUrl)
                return null;
            if (sigUrl.startsWith('data:image/')) {
                try {
                    const base64Data = sigUrl.split(',')[1];
                    if (base64Data) {
                        return Buffer.from(base64Data, 'base64');
                    }
                }
                catch (e) {
                    console.warn('Failed to parse base64 digital signature:', e.message);
                }
            }
            if (sigUrl.startsWith('http://') || sigUrl.startsWith('https://')) {
                try {
                    const res = await fetch(sigUrl, {
                        signal: AbortSignal.timeout(2500),
                    });
                    if (res.ok) {
                        return Buffer.from(await res.arrayBuffer());
                    }
                }
                catch (e) {
                    console.warn('Failed to fetch digital signature from URL:', sigUrl, e.message);
                }
            }
            try {
                const fs = require('fs');
                const cleanPath = sigUrl.replace(/^\//, '');
                const pathsToTry = [
                    path.resolve(__dirname, '..', 'assets', cleanPath),
                    path.resolve(__dirname, '..', '..', 'frontend', 'public', cleanPath),
                    path.resolve(__dirname, '..', '..', '..', 'frontend', 'public', cleanPath),
                    path.resolve(cleanPath),
                    path.resolve(sigUrl),
                ];
                for (const p of pathsToTry) {
                    if (fs.existsSync(p)) {
                        return fs.readFileSync(p);
                    }
                }
            }
            catch (e) {
                console.warn('Failed to read digital signature from local path:', sigUrl, e.message);
            }
            return null;
        })();
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));
            const titleStr = slipTitle.toUpperCase();
            const hasLogo = logoBuffer && !tenant?.hideLogoOnPdf;
            if (hasLogo) {
                try {
                    doc.image(logoBuffer, 50, 12, {
                        width: 110,
                        height: 60,
                        fit: [110, 60],
                    });
                }
                catch (e) {
                    console.warn('Failed to draw logo on duty slip:', e);
                }
            }
            const textStartX = hasLogo ? 170 : 50;
            const textWidth = hasLogo ? 375 : 495;
            const companyNameColor = tenant?.pdfColorCompanyName || primaryColor;
            doc
                .fillColor(companyNameColor)
                .fontSize(22)
                .font(fontBold)
                .text(companyName.toUpperCase(), textStartX, 15, {
                width: textWidth,
                align: 'left',
            });
            doc
                .fillColor('#334155')
                .fontSize(11.5)
                .font(fontBold)
                .text(titleStr, textStartX, 40, {
                width: textWidth,
                align: 'left',
            });
            let currentHeaderY = 55;
            const addressStr = tenant?.companyAddress || '';
            if (addressStr) {
                doc
                    .fillColor('#475569')
                    .fontSize(8.5)
                    .font(fontRegular)
                    .text(addressStr, textStartX, currentHeaderY, {
                    width: textWidth,
                    align: 'left',
                    height: 12,
                    lineBreak: false,
                });
                currentHeaderY += 12;
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
            }
            const lineY = 80;
            if (isRefined) {
                doc.moveTo(50, lineY).lineTo(545, lineY).lineWidth(1).stroke(primaryColor);
                doc
                    .moveTo(50, lineY + 2.5)
                    .lineTo(545, lineY + 2.5)
                    .lineWidth(0.5)
                    .stroke(primaryColor);
                doc.lineWidth(1);
            }
            else {
                doc.moveTo(50, lineY).lineTo(545, lineY).lineWidth(0.5).stroke('#CBD5E1');
            }
            doc.fillColor('#0F172A').fontSize(10);
            doc.rect(50, 90, 495, 60).stroke('#E2E8F0');
            doc.moveTo(50, 120).lineTo(545, 120).stroke('#E2E8F0');
            if (!isRefined) {
                doc.moveTo(297, 90).lineTo(297, 150).stroke('#E2E8F0');
            }
            doc.font(fontBold).text('Duty Slip No:', 60, 100);
            doc.font(fontRegular).text(slip.dutySlipNumber, 150, 100);
            const bookingCode = slip.booking?.bookingNumber || 'DIRECT-DS';
            doc.font(fontBold).text('Booking Code:', 307, 100);
            doc.font(fontRegular).text(bookingCode, 400, 100);
            doc.font(fontBold).text('Slip Status:', 60, 130);
            doc.font(fontRegular).text(slip.status, 150, 130);
            doc.font(fontBold).text('Trip Date & Time:', 307, 130);
            const repDate = new Date(slip.reportingTime).toLocaleDateString('en-GB');
            const repTime = new Date(slip.reportingTime).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
            doc.font(fontRegular).text(`${repDate} ${repTime}`, 400, 130);
            doc.fontSize(12).font(fontBold).text('Customer & Route Details', 50, 165);
            doc.rect(50, 180, 495, 95).stroke('#E2E8F0');
            const custName = slip.booking?.customer?.name
                ? slip.booking.customer.name +
                    (slip.booking.customer.companyName
                        ? ` (${slip.booking.customer.companyName})`
                        : '')
                : slip.manualCustomerName || 'Direct Customer';
            doc.fontSize(10).font(fontBold).text('Customer Name:', 60, 188);
            doc.font(fontRegular).text(custName, 150, 188);
            const guestDisplay = (slip.booking?.guestSalutation
                ? slip.booking.guestSalutation + ' '
                : '') + (slip.booking?.guestName || slip.manualGuestName || '---');
            doc.font(fontBold).text('Guest Name:', 307, 188);
            doc.font(fontRegular).text(guestDisplay, 400, 188);
            const empId = slip.employeeId || slip.booking?.employeeId;
            doc.font(fontBold).text('Employee ID:', 60, 203);
            doc.font(fontRegular).text(empId || '---', 150, 203);
            const bookedBy = slip.booking?.bookingBy || 'Direct Walk-in';
            doc.font(fontBold).text('Booked By:', 307, 203);
            doc.font(fontRegular).text(bookedBy, 400, 203);
            const pickupLoc = slip.booking?.pickupLocation || slip.manualPickupLocation || '---';
            const dropLoc = slip.booking?.dropLocation || slip.manualDropLocation || '---';
            doc.font(fontBold).text('Pickup Address:', 60, 220);
            doc.font(fontRegular).text(pickupLoc, 150, 220, {
                width: 380,
            });
            doc.font(fontBold).text('Drop Address:', 60, 237);
            doc.font(fontRegular).text(dropLoc, 150, 237, { width: 380 });
            doc.fontSize(12).font(fontBold).text('Allocated Resources', 50, 292);
            doc.rect(50, 307, 495, 40).stroke('#E2E8F0');
            if (!isRefined) {
                doc.moveTo(297, 307).lineTo(297, 347).stroke('#E2E8F0');
            }
            doc.fontSize(10).font(fontBold).text('Driver Name:', 60, 320);
            doc.font(fontRegular).text(slip.driver.name, 150, 320);
            doc.font(fontBold).text('NUMBER:', 307, 315);
            doc.font(fontRegular).text(slip.vehicle.vehicleNumber, 380, 315);
            doc.font(fontBold).text('CAR TYPE:', 307, 330);
            doc
                .font(fontRegular)
                .text(`${slip.vehicle.model} (${slip.vehicle.vehicleType})`, 380, 330);
            doc.fontSize(12).font(fontBold).text('Trip Details', 50, 357);
            doc.rect(50, 372, 495, 42).stroke('#E2E8F0');
            if (!isRefined) {
                doc.moveTo(297, 372).lineTo(297, 414).stroke('#E2E8F0');
            }
            const tripTypeStr = (slip.booking?.tripType || 'LOCAL').replace(/_/g, ' ');
            const reqVehicleStr = slip.booking?.vehicleTypeRequired || slip.vehicle.vehicleType;
            const remarksStr = slip.booking?.remarks || 'N/A';
            doc.fontSize(9.5).font(fontBold).text('Trip Type:', 60, 381);
            doc.font(fontRegular).text(tripTypeStr, 150, 381);
            doc.font(fontBold).text('Req. Vehicle:', 307, 381);
            doc.font(fontRegular).text(reqVehicleStr, 400, 381);
            doc.font(fontBold).text('Remarks:', 60, 397);
            doc.font(fontRegular).text(remarksStr, 150, 397, { width: 380 });
            doc.fontSize(12).font(fontBold).text('Operational Trip Logs', 50, 424);
            doc.rect(50, 439, 495, 70).stroke('#E2E8F0');
            doc.moveTo(50, 469).lineTo(545, 469).stroke('#E2E8F0');
            if (!isRefined) {
                doc.moveTo(165, 439).lineTo(165, 509).stroke('#E2E8F0');
                doc.moveTo(280, 439).lineTo(280, 509).stroke('#E2E8F0');
                doc.moveTo(395, 439).lineTo(395, 509).stroke('#E2E8F0');
            }
            doc.fontSize(8).font(fontBold);
            doc.text('START KM', 55, 449);
            doc.text('END KM', 170, 449);
            doc.text('START DATE & TIME', 285, 449);
            doc.text('END DATE & TIME', 400, 449);
            doc.fontSize(9).font(fontBold);
            if (slip.status === 'DRAFT') {
                doc.text('___________ KM', 55, 484);
                doc.text('___________ KM', 170, 484);
                doc.text('___/___/___  ___:___', 285, 484);
                doc.text('___/___/___  ___:___', 400, 484);
            }
            else {
                doc.text(`${slip.startKm} KM`, 55, 484);
                doc.text(slip.endKm !== null ? `${slip.endKm} KM` : '--- KM', 170, 484);
                const formatDT = (dt) => {
                    if (!dt)
                        return '---';
                    const d = new Date(dt).toLocaleDateString('en-GB');
                    const t = new Date(dt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    });
                    return `${d} ${t}`;
                };
                doc.text(formatDT(slip.startDateTime), 285, 484);
                doc.text(formatDT(slip.endDateTime), 400, 484);
            }
            doc
                .fontSize(12)
                .font(fontBold)
                .text('Tolls & Incidentals Breakdown', 50, 519);
            doc.rect(50, 534, 495, 120).stroke('#E2E8F0');
            doc.moveTo(50, 564).lineTo(545, 564).stroke('#E2E8F0');
            doc.moveTo(50, 594).lineTo(545, 594).stroke('#E2E8F0');
            doc.moveTo(50, 624).lineTo(545, 624).stroke('#E2E8F0');
            if (!isRefined) {
                doc.moveTo(297, 534).lineTo(297, 654).stroke('#E2E8F0');
            }
            doc.fontSize(9.5).font(fontBold);
            doc.text('Toll Charges:', 60, 544);
            doc
                .font(fontRegular)
                .text(slip.status === 'DRAFT' ? 'INR ___________' : `INR ${slip.toll}`, 180, 544);
            doc.font(fontBold).text('Parking Charges:', 307, 544);
            doc
                .font(fontRegular)
                .text(slip.status === 'DRAFT' ? 'INR ___________' : `INR ${slip.parking}`, 420, 544);
            doc.font(fontBold).text('State Tax:', 60, 574);
            doc
                .font(fontRegular)
                .text(slip.status === 'DRAFT' ? 'INR ___________' : `INR ${slip.stateTax}`, 180, 574);
            doc.font(fontBold).text('MCD Toll:', 307, 574);
            doc
                .font(fontRegular)
                .text(slip.status === 'DRAFT' ? 'INR ___________' : `INR ${slip.mcd}`, 420, 574);
            doc.font(fontBold).text('Night Allowance:', 60, 604);
            doc
                .font(fontRegular)
                .text(slip.status === 'DRAFT'
                ? 'INR ___________'
                : `INR ${slip.nightCharges}`, 180, 604);
            doc.font(fontBold).text('Driver Allowance:', 307, 604);
            doc
                .font(fontRegular)
                .text(slip.status === 'DRAFT'
                ? 'INR ___________'
                : `INR ${slip.driverAllowance}`, 420, 604);
            doc.font(fontBold).text('Extra / Misc Charges:', 60, 634);
            doc
                .font(fontRegular)
                .text(slip.status === 'DRAFT'
                ? 'INR ___________'
                : `INR ${slip.extraCharges}`, 180, 634);
            const totalTolls = Number(slip.toll) +
                Number(slip.parking) +
                Number(slip.stateTax) +
                Number(slip.mcd) +
                Number(slip.nightCharges) +
                Number(slip.driverAllowance) +
                Number(slip.extraCharges);
            doc.font(fontBold).text('Total Incidentals:', 307, 634);
            if (slip.status === 'DRAFT') {
                doc
                    .font(fontBold)
                    .fillColor(primaryColor)
                    .text('INR ___________', 420, 634);
            }
            else {
                doc
                    .font(fontBold)
                    .fillColor(primaryColor)
                    .text(`INR ${totalTolls.toFixed(2)}`, 420, 634);
            }
            doc.fillColor('#0F172A');
            doc.fontSize(8).font(fontBold);
            doc.text('DRIVER SIGNATURE', 60, 715);
            doc.text('CUSTOMER SIGNATURE', 225, 715);
            doc.text('DISPATCH AUTHORIZED', 390, 715);
            doc.font(fontRegular);
            doc.text('-------------------------', 60, 700);
            doc.text('-------------------------', 225, 700);
            if (signatureBuffer) {
                try {
                    doc.image(signatureBuffer, 385, 670, {
                        width: 110,
                        height: 28,
                        fit: [110, 28],
                    });
                }
                catch (e) {
                    doc.text('-------------------------', 390, 700);
                }
            }
            else {
                doc.text('-------------------------', 390, 700);
            }
            doc.end();
        });
    }
};
exports.DutySlipsService = DutySlipsService;
exports.DutySlipsService = DutySlipsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DutySlipsService);
//# sourceMappingURL=duty-slips.service.js.map