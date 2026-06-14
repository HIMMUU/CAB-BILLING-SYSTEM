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
        let bookingId = dto.bookingId;
        let employeeId = dto.employeeId;
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
        const endKm = dto.endKm !== undefined ? dto.endKm : (slip.endKm ? Number(slip.endKm) : undefined);
        if (endKm !== undefined && endKm < startKm) {
            throw new common_1.BadRequestException('End KM cannot be less than Start KM');
        }
        let targetStatus = dto.status ?? slip.status;
        if (dto.endKm !== undefined && targetStatus === client_1.DutySlipStatus.DRAFT) {
            targetStatus = client_1.DutySlipStatus.FILLED;
        }
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
    async remove(id) {
        await this.findOne(id);
        return this.prisma.dutySlip.delete({
            where: { id },
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
                    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(2000) });
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
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));
            const layout = tenant?.pdfHeaderLayout || 'SINGLE_LINE';
            const titleStr = slipTitle.toUpperCase();
            if (layout === 'SPLIT' && logoBuffer && !tenant?.hideLogoOnPdf) {
                doc.fillColor(primaryColor).fontSize(16).font(fontBold).text(companyName.toUpperCase(), 50, 30);
                doc.fillColor('#475569').fontSize(10).font(fontBold).text(titleStr, 50, 52);
                try {
                    doc.image(logoBuffer, 460, 25, { width: 85, height: 35, fit: [85, 35] });
                }
                catch (e) {
                    doc.fillColor('#64748B').fontSize(10).font(fontBold).text('LOGO', 460, 30, { align: 'right', width: 85 });
                }
            }
            else if (layout === 'STACKED') {
                doc.fillColor(primaryColor).fontSize(20).font(fontBold).text(companyName.toUpperCase(), 50, 25);
                doc.fillColor('#475569').fontSize(11).font(fontBold).text(titleStr, 50, 50);
            }
            else {
                doc.fillColor(primaryColor).fontSize(18).font(fontBold).text(companyName.toUpperCase(), 50, 30);
                doc.fillColor('#475569').fontSize(11).font(fontBold).text(titleStr, 350, 35, { align: 'right', width: 195 });
            }
            if (isRefined) {
                doc.moveTo(50, 63).lineTo(545, 63).lineWidth(1).stroke(primaryColor);
                doc.moveTo(50, 65.5).lineTo(545, 65.5).lineWidth(0.5).stroke(primaryColor);
                doc.lineWidth(1);
            }
            doc.fillColor('#0F172A').fontSize(10);
            doc.rect(50, 85, 495, 60).stroke('#E2E8F0');
            doc.moveTo(50, 115).lineTo(545, 115).stroke('#E2E8F0');
            if (!isRefined) {
                doc.moveTo(297, 85).lineTo(297, 145).stroke('#E2E8F0');
            }
            doc.font(fontBold).text('Duty Slip No:', 60, 95);
            doc.font(fontRegular).text(slip.dutySlipNumber, 150, 95);
            doc.font(fontBold).text('Booking Code:', 307, 95);
            doc.font(fontRegular).text(slip.booking.bookingNumber, 400, 95);
            doc.font(fontBold).text('Slip Status:', 60, 125);
            doc.font(fontRegular).text(slip.status, 150, 125);
            doc.font(fontBold).text('Trip Date & Time:', 307, 125);
            doc.font(fontRegular).text(`${new Date(slip.reportingTime).toLocaleDateString()} ${new Date(slip.reportingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 400, 125);
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
            doc.fontSize(12).font(fontBold).text('Allocated Resources', 50, 292);
            doc.rect(50, 307, 495, 60).stroke('#E2E8F0');
            if (!isRefined) {
                doc.moveTo(297, 307).lineTo(297, 367).stroke('#E2E8F0');
            }
            doc.fontSize(10).font(fontBold).text('Driver Name:', 60, 317);
            doc.font(fontRegular).text(slip.driver.name, 150, 317);
            doc.font(fontBold).text('License No:', 60, 342);
            doc.font(fontRegular).text(slip.driver.licenseNumber, 150, 342);
            doc.font(fontBold).text('Vehicle Plate:', 307, 317);
            doc.font(fontRegular).text(slip.vehicle.vehicleNumber, 400, 317);
            doc.font(fontBold).text('Model / Type:', 307, 342);
            doc.font(fontRegular).text(`${slip.vehicle.model} (${slip.vehicle.vehicleType})`, 400, 342);
            doc.fontSize(12).font(fontBold).text('Operational Trip Logs', 50, 382);
            doc.rect(50, 397, 495, 80).stroke('#E2E8F0');
            doc.moveTo(50, 427).lineTo(545, 427).stroke('#E2E8F0');
            if (!isRefined) {
                doc.moveTo(165, 397).lineTo(165, 477).stroke('#E2E8F0');
                doc.moveTo(280, 397).lineTo(280, 477).stroke('#E2E8F0');
                doc.moveTo(395, 397).lineTo(395, 477).stroke('#E2E8F0');
            }
            doc.fontSize(8).font(fontBold);
            doc.text('START KM', 55, 407);
            doc.text('END KM', 170, 407);
            doc.text('START DATE & TIME', 285, 407);
            doc.text('END DATE & TIME', 400, 407);
            doc.fontSize(9).font(fontBold);
            doc.text(`${slip.startKm} KM`, 55, 442);
            doc.text(slip.endKm !== null ? `${slip.endKm} KM` : '--- KM', 170, 442);
            doc.text(slip.startDateTime ? `${new Date(slip.startDateTime).toLocaleDateString()} ${new Date(slip.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '---', 285, 442);
            doc.text(slip.endDateTime ? `${new Date(slip.endDateTime).toLocaleDateString()} ${new Date(slip.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '---', 400, 442);
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
            doc.fillColor('#0F172A');
            doc.fontSize(8).font(fontBold);
            doc.text('DRIVER SIGNATURE', 60, 690);
            doc.text('CUSTOMER SIGNATURE', 225, 690);
            doc.text('DISPATCH AUTHORIZED', 390, 690);
            doc.font(fontRegular);
            doc.text('-------------------------', 60, 675);
            doc.text('-------------------------', 225, 675);
            doc.text('-------------------------', 390, 675);
            doc.fontSize(8).fillColor('#64748B').text('Document digitally generated by CABBS. Valid without seal.', 50, 725, { align: 'center' });
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