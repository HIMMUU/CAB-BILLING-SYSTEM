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
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
        });
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.status !== client_1.BookingStatus.ASSIGNED) {
            throw new common_1.BadRequestException('A duty slip can only be created for an ASSIGNED booking. Please assign resources first.');
        }
        const existingSlip = await this.prisma.dutySlip.findUnique({
            where: { bookingId: dto.bookingId },
        });
        if (existingSlip) {
            throw new common_1.ConflictException('A duty slip has already been generated for this booking');
        }
        const assignment = await this.prisma.assignment.findFirst({
            where: {
                bookingId: dto.bookingId,
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
                bookingId: dto.bookingId,
                driverId: assignment.driverId,
                vehicleId: assignment.vehicleId,
                reportingTime: new Date(dto.reportingTime),
                startKm: dto.startKm,
                status: client_1.DutySlipStatus.DRAFT,
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
                status: targetStatus,
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
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));
            doc.rect(0, 0, 595.28, 110).fill('#2563EB');
            const LOGO_PATH = path.resolve(__dirname, '..', 'assets', 'logo.png');
            doc.image(LOGO_PATH, 460, 20, { width: 80 });
            doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('CABBS LOGISTICS', 50, 30);
            doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica').text('Corporate Fleet & Trip Operations Management Portal', 50, 55);
            doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('TRIP OPERATIONAL DUTY SLIP', 50, 75);
            doc.fillColor('#0F172A').fontSize(10);
            doc.rect(50, 130, 495, 60).stroke('#E2E8F0');
            doc.moveTo(50, 160).lineTo(545, 160).stroke('#E2E8F0');
            doc.moveTo(297, 130).lineTo(297, 190).stroke('#E2E8F0');
            doc.font('Helvetica-Bold').text('Duty Slip No:', 60, 140);
            doc.font('Helvetica').text(slip.dutySlipNumber, 150, 140);
            doc.font('Helvetica-Bold').text('Booking Code:', 307, 140);
            doc.font('Helvetica').text(slip.booking.bookingNumber, 400, 140);
            doc.font('Helvetica-Bold').text('Slip Status:', 60, 170);
            doc.font('Helvetica').text(slip.status, 150, 170);
            doc.font('Helvetica-Bold').text('Trip Date & Time:', 307, 170);
            doc.font('Helvetica').text(`${new Date(slip.reportingTime).toLocaleDateString()} ${new Date(slip.reportingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 400, 170);
            doc.fontSize(12).font('Helvetica-Bold').text('Customer & Route Details', 50, 210);
            doc.rect(50, 225, 495, 80).stroke('#E2E8F0');
            doc.fontSize(10).font('Helvetica-Bold').text('Customer Name:', 60, 235);
            doc.font('Helvetica').text(slip.booking.customer.name, 150, 235);
            if (slip.booking.customer.companyName) {
                doc.font('Helvetica-Bold').text('Company:', 307, 235);
                doc.font('Helvetica').text(slip.booking.customer.companyName, 400, 235);
            }
            doc.font('Helvetica-Bold').text('Pickup Address:', 60, 255);
            doc.font('Helvetica').text(slip.booking.pickupLocation, 150, 255, { width: 380, height: 18 });
            doc.font('Helvetica-Bold').text('Drop Address:', 60, 275);
            doc.font('Helvetica').text(slip.booking.dropLocation, 150, 275, { width: 380, height: 18 });
            doc.fontSize(12).font('Helvetica-Bold').text('Allocated Resources', 50, 325);
            doc.rect(50, 340, 495, 60).stroke('#E2E8F0');
            doc.moveTo(297, 340).lineTo(297, 400).stroke('#E2E8F0');
            doc.fontSize(10).font('Helvetica-Bold').text('Driver Name:', 60, 350);
            doc.font('Helvetica').text(slip.driver.name, 150, 350);
            doc.font('Helvetica-Bold').text('License No:', 60, 375);
            doc.font('Helvetica').text(slip.driver.licenseNumber, 150, 375);
            doc.font('Helvetica-Bold').text('Vehicle Plate:', 307, 350);
            doc.font('Helvetica').text(slip.vehicle.vehicleNumber, 400, 350);
            doc.font('Helvetica-Bold').text('Model / Type:', 307, 375);
            doc.font('Helvetica').text(`${slip.vehicle.model} (${slip.vehicle.vehicleType})`, 400, 375);
            doc.fontSize(12).font('Helvetica-Bold').text('Operational Trip Logs', 50, 420);
            doc.rect(50, 435, 495, 60).stroke('#E2E8F0');
            doc.moveTo(50, 465).lineTo(545, 465).stroke('#E2E8F0');
            doc.moveTo(215, 435).lineTo(215, 495).stroke('#E2E8F0');
            doc.moveTo(380, 435).lineTo(380, 495).stroke('#E2E8F0');
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('START ODOMETER', 60, 445);
            doc.text('END ODOMETER', 225, 445);
            doc.text('TOTAL DISTANCE RUN', 390, 445);
            doc.fontSize(12).font('Helvetica-Bold');
            doc.text(`${slip.startKm} KM`, 60, 475);
            doc.text(slip.endKm !== null ? `${slip.endKm} KM` : '--- KM', 225, 475);
            doc.text(slip.endKm !== null ? `${Number(slip.endKm) - Number(slip.startKm)} KM` : '--- KM', 390, 475);
            doc.fontSize(12).font('Helvetica-Bold').text('Tolls & Incidentals Breakdown', 50, 515);
            doc.rect(50, 530, 495, 120).stroke('#E2E8F0');
            doc.moveTo(50, 560).lineTo(545, 560).stroke('#E2E8F0');
            doc.moveTo(50, 590).lineTo(545, 590).stroke('#E2E8F0');
            doc.moveTo(50, 620).lineTo(545, 620).stroke('#E2E8F0');
            doc.moveTo(297, 530).lineTo(297, 650).stroke('#E2E8F0');
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Toll Charges:', 60, 542);
            doc.font('Helvetica').text(`INR ${slip.toll}`, 180, 542);
            doc.font('Helvetica-Bold').text('Parking Charges:', 307, 542);
            doc.font('Helvetica').text(`INR ${slip.parking}`, 420, 542);
            doc.font('Helvetica-Bold').text('Night Surcharge:', 60, 572);
            doc.font('Helvetica').text(`INR ${slip.nightCharges}`, 180, 572);
            doc.font('Helvetica-Bold').text('Driver Allowance:', 307, 572);
            doc.font('Helvetica').text(`INR ${slip.driverAllowance}`, 420, 572);
            doc.font('Helvetica-Bold').text('Extra / Misc Charges:', 60, 602);
            doc.font('Helvetica').text(`INR ${slip.extraCharges}`, 180, 602);
            const totalTolls = Number(slip.toll) + Number(slip.parking) + Number(slip.nightCharges) + Number(slip.driverAllowance) + Number(slip.extraCharges);
            doc.font('Helvetica-Bold').text('Total Incidentals:', 307, 602);
            doc.font('Helvetica-Bold').fillColor('#2563EB').text(`INR ${totalTolls.toFixed(2)}`, 420, 602);
            doc.fillColor('#0F172A');
            doc.fontSize(8).font('Helvetica-Bold');
            doc.text('DRIVER SIGNATURE', 60, 720);
            doc.text('CUSTOMER SIGNATURE', 225, 720);
            doc.text('DISPATCH AUTHORIZED', 390, 720);
            doc.font('Helvetica');
            doc.text('-------------------------', 60, 705);
            doc.text('-------------------------', 225, 705);
            doc.text('-------------------------', 390, 705);
            doc.fontSize(8).fillColor('#64748B').text('Document digitally generated by CABBS. Valid without seal.', 50, 755, { align: 'center' });
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