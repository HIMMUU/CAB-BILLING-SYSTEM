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
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const path = __importStar(require("path"));
const prisma_service_1 = require("../prisma/prisma.service");
const create_invoice_dto_1 = require("./dto/create-invoice.dto");
const client_1 = require("@prisma/client");
const trips_service_1 = require("../trips/trips.service");
const pdfkit_1 = __importDefault(require("pdfkit"));
let InvoicesService = class InvoicesService {
    constructor(prisma, tripsService) {
        this.prisma = prisma;
        this.tripsService = tripsService;
    }
    async create(dto) {
        const tripIds = dto.tripIds && dto.tripIds.length > 0
            ? dto.tripIds
            : (dto.tripId ? [dto.tripId] : []);
        if (tripIds.length === 0) {
            throw new common_1.BadRequestException('At least one Trip ID is required');
        }
        const existingItems = await this.prisma.invoiceItem.findMany({
            where: { tripId: { in: tripIds } },
        });
        if (existingItems.length > 0) {
            const alreadyInvoiced = existingItems.map(item => item.tripId).join(', ');
            throw new common_1.ConflictException(`The following trip(s) have already been invoiced: ${alreadyInvoiced}`);
        }
        const trips = await this.prisma.trip.findMany({
            where: { id: { in: tripIds } },
            include: {
                booking: { include: { customer: true } },
                dutySlip: true,
            },
        });
        if (trips.length !== tripIds.length) {
            throw new common_1.NotFoundException('One or more trips not found');
        }
        const customerIds = Array.from(new Set(trips.map(t => t.booking.customerId)));
        if (customerIds.length > 1) {
            throw new common_1.BadRequestException('All selected trips must belong to the same customer');
        }
        const customerId = customerIds[0];
        const customer = trips[0].booking.customer;
        let baseFare = 0;
        let extraKm = 0;
        let toll = 0;
        let parking = 0;
        let stateTax = 0;
        let mcd = 0;
        let nightCharges = 0;
        let miscCharges = 0;
        for (const trip of trips) {
            baseFare += Number(trip.baseFareCharged);
            extraKm += Number(trip.extraKmCharged);
            toll += Number(trip.toll);
            parking += Number(trip.parking);
            stateTax += Number(trip.stateTaxCharged || 0);
            mcd += Number(trip.mcdCharged || 0);
            nightCharges += Number(trip.nightChargesCharged);
            miscCharges +=
                Number(trip.extraHoursCharged) +
                    Number(trip.driverAllowance) +
                    Number(trip.miscChargesCharged);
        }
        const subtotal = baseFare + extraKm + toll + parking + stateTax + mcd + nightCharges + miscCharges;
        let cgstRate = 0;
        let cgstAmount = 0;
        let sgstRate = 0;
        let sgstAmount = 0;
        let igstRate = 0;
        let igstAmount = 0;
        const hasCustGst = Number(customer.cgstRate || 0) > 0 || Number(customer.sgstRate || 0) > 0 || Number(customer.igstRate || 0) > 0;
        if (hasCustGst) {
            cgstRate = Number(customer.cgstRate || 0);
            cgstAmount = (subtotal * cgstRate) / 100;
            sgstRate = Number(customer.sgstRate || 0);
            sgstAmount = (subtotal * sgstRate) / 100;
            igstRate = Number(customer.igstRate || 0);
            igstAmount = (subtotal * igstRate) / 100;
        }
        else {
            const gstRate = dto.gstRate ?? 5;
            if (dto.gstType === create_invoice_dto_1.GstType.INTRASTATE) {
                cgstRate = gstRate / 2;
                cgstAmount = (subtotal * cgstRate) / 100;
                sgstRate = gstRate / 2;
                sgstAmount = (subtotal * sgstRate) / 100;
            }
            else {
                igstRate = gstRate;
                igstAmount = (subtotal * igstRate) / 100;
            }
        }
        const totalTax = cgstAmount + sgstAmount + igstAmount;
        const isCorporate = customer.type === 'CORPORATE';
        const totalGstRate = cgstRate + sgstRate + igstRate;
        const isRcm = isCorporate && Math.abs(totalGstRate - 5) < 0.01;
        const totalAmount = isRcm ? subtotal : (subtotal + totalTax);
        const dueAmount = totalAmount;
        let invoiceNumber = '';
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
            attempts++;
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomDigits = Math.floor(1000 + Math.random() * 9000);
            invoiceNumber = `INV-${dateStr}-${randomDigits}`;
            const existing = await this.prisma.invoice.findFirst({
                where: { invoiceNumber },
            });
            if (!existing) {
                isUnique = true;
            }
        }
        return this.prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.create({
                data: {
                    tenantId: trips[0].tenantId,
                    invoiceNumber,
                    customerId,
                    invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                    status: client_1.InvoiceStatus.UNPAID,
                    baseFare,
                    extraKmCharges: extraKm,
                    toll,
                    parking,
                    stateTax,
                    mcd,
                    nightCharges,
                    miscCharges,
                    subtotal,
                    cgstRate,
                    cgstAmount,
                    sgstRate,
                    sgstAmount,
                    igstRate,
                    igstAmount,
                    totalTax,
                    totalAmount,
                    paidAmount: 0.00,
                    dueAmount,
                },
            });
            for (const trip of trips) {
                const tripSubtotal = Number(trip.baseFareCharged) +
                    Number(trip.extraKmCharged) +
                    Number(trip.toll) +
                    Number(trip.parking) +
                    Number(trip.stateTaxCharged || 0) +
                    Number(trip.mcdCharged || 0) +
                    Number(trip.nightChargesCharged) +
                    Number(trip.extraHoursCharged) +
                    Number(trip.driverAllowance) +
                    Number(trip.miscChargesCharged);
                const description = `Duty Slip: ${trip.dutySlip.dutySlipNumber}, Route: ${trip.booking.pickupLocation} to ${trip.booking.dropLocation}`;
                await tx.invoiceItem.create({
                    data: {
                        tenantId: trips[0].tenantId,
                        invoiceId: invoice.id,
                        tripId: trip.id,
                        description,
                        amount: tripSubtotal,
                    },
                });
            }
            return invoice;
        });
    }
    async findUninvoicedTrips() {
        const closedSlipsWithoutTrips = await this.prisma.dutySlip.findMany({
            where: {
                status: 'CLOSED',
                trip: null,
            },
        });
        if (closedSlipsWithoutTrips.length > 0) {
            for (const slip of closedSlipsWithoutTrips) {
                try {
                    const startDateTime = slip.startDateTime ? new Date(slip.startDateTime).toISOString() : undefined;
                    const endDateTime = slip.endDateTime ? new Date(slip.endDateTime).toISOString() : undefined;
                    const endKm = Number(slip.endKm) || Number(slip.startKm) || 0;
                    await this.tripsService.closeTrip({
                        dutySlipId: slip.id,
                        endKm,
                        startDateTime,
                        endDateTime,
                        toll: Number(slip.toll) || undefined,
                        parking: Number(slip.parking) || undefined,
                        driverAllowance: Number(slip.driverAllowance) || undefined,
                        nightCharges: Number(slip.nightCharges) || undefined,
                        extraCharges: Number(slip.extraCharges) || undefined,
                        stateTax: Number(slip.stateTax) || undefined,
                        mcd: Number(slip.mcd) || undefined,
                    });
                }
                catch (err) {
                    console.error(`Failed to auto-heal trip for closed duty slip ${slip.dutySlipNumber}:`, err);
                }
            }
        }
        return this.prisma.trip.findMany({
            where: {
                invoiceItems: {
                    none: {},
                },
            },
            include: {
                booking: {
                    include: {
                        customer: true,
                    },
                },
                dutySlip: true,
            },
            orderBy: {
                closedAt: 'desc',
            },
        });
    }
    recalculateInvoiceFields(invoice) {
        if (!invoice || !invoice.items || invoice.items.length === 0) {
            return invoice;
        }
        let baseFare = 0;
        let extraKmCharges = 0;
        let toll = 0;
        let parking = 0;
        let nightCharges = 0;
        let miscCharges = 0;
        let stateTax = 0;
        let mcd = 0;
        for (const item of invoice.items) {
            const trip = item.trip;
            if (!trip)
                continue;
            baseFare += Number(trip.baseFareCharged || 0);
            extraKmCharges += Number(trip.extraKmCharged || 0);
            toll += Number(trip.toll || 0);
            parking += Number(trip.parking || 0);
            stateTax += Number(trip.stateTaxCharged || 0);
            mcd += Number(trip.mcdCharged || 0);
            nightCharges += Number(trip.nightChargesCharged || 0);
            miscCharges +=
                Number(trip.extraHoursCharged || 0) +
                    Number(trip.driverAllowance || 0) +
                    Number(trip.miscChargesCharged || trip.extraCharges || 0);
        }
        const subtotal = baseFare + extraKmCharges + toll + parking + stateTax + mcd + nightCharges + miscCharges;
        const cgstRate = Number(invoice.cgstRate || 0);
        const sgstRate = Number(invoice.sgstRate || 0);
        const igstRate = Number(invoice.igstRate || 0);
        const cgstAmount = (subtotal * cgstRate) / 100;
        const sgstAmount = (subtotal * sgstRate) / 100;
        const igstAmount = (subtotal * igstRate) / 100;
        const totalTax = cgstAmount + sgstAmount + igstAmount;
        const isCorporate = invoice.customer?.type === 'CORPORATE';
        const totalGstRate = cgstRate + sgstRate + igstRate;
        const isRcm = isCorporate && Math.abs(totalGstRate - 5) < 0.01;
        const totalAmount = isRcm ? subtotal : (subtotal + totalTax);
        const dueAmount = Math.max(0, totalAmount - Number(invoice.paidAmount || 0));
        return {
            ...invoice,
            baseFare,
            extraKmCharges,
            toll,
            parking,
            stateTax,
            mcd,
            nightCharges,
            miscCharges,
            subtotal,
            cgstRate,
            cgstAmount,
            sgstRate,
            sgstAmount,
            igstRate,
            igstAmount,
            totalTax,
            totalAmount,
            dueAmount,
        };
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
                { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
                {
                    customer: {
                        name: { contains: query.search, mode: 'insensitive' },
                    },
                },
            ];
        }
        const [total, data] = await Promise.all([
            this.prisma.invoice.count({ where }),
            this.prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: true,
                    items: {
                        include: {
                            trip: {
                                include: {
                                    booking: {
                                        include: {
                                            customer: true,
                                        },
                                    },
                                    dutySlip: {
                                        include: {
                                            driver: true,
                                            vehicle: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
        ]);
        const mappedData = data.map((inv) => this.recalculateInvoiceFields(inv));
        return {
            data: mappedData,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: {
                customer: true,
                items: {
                    include: {
                        trip: {
                            include: {
                                booking: {
                                    include: {
                                        customer: true,
                                    },
                                },
                                dutySlip: {
                                    include: {
                                        driver: true,
                                        vehicle: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        return this.recalculateInvoiceFields(invoice);
    }
    async update(id, dto) {
        return this.prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({
                where: { id },
            });
            if (!invoice) {
                throw new common_1.NotFoundException('Invoice not found');
            }
            const totalAmount = Number(invoice.totalAmount);
            const currentPaid = Number(invoice.paidAmount);
            const newPaid = dto.paidAmount !== undefined ? dto.paidAmount : currentPaid;
            const diff = newPaid - currentPaid;
            const data = {};
            if (dto.status !== undefined) {
                data.status = dto.status;
            }
            if (dto.paidAmount !== undefined) {
                data.paidAmount = newPaid;
                const dueAmount = Math.max(0, totalAmount - newPaid);
                data.dueAmount = dueAmount;
                if (dto.status === undefined) {
                    if (dueAmount === 0) {
                        data.status = client_1.InvoiceStatus.PAID;
                    }
                    else if (newPaid > 0) {
                        data.status = client_1.InvoiceStatus.PARTIALLY_PAID;
                    }
                    else {
                        data.status = client_1.InvoiceStatus.UNPAID;
                    }
                }
            }
            const updated = await tx.invoice.update({
                where: { id },
                data,
                include: {
                    customer: true,
                    items: true,
                },
            });
            if (diff > 0) {
                await tx.payment.create({
                    data: {
                        tenantId: updated.tenantId,
                        invoiceId: id,
                        amount: diff,
                        paymentDate: new Date(),
                        paymentMode: 'BANK_TRANSFER',
                        status: 'SUCCESS',
                    },
                });
            }
            return updated;
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.invoice.delete({
            where: { id },
        });
    }
    async generatePdf(id) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: {
                customer: true,
                items: {
                    include: {
                        trip: {
                            include: {
                                booking: {
                                    include: {
                                        customer: true,
                                    },
                                },
                                dutySlip: {
                                    include: {
                                        driver: true,
                                        vehicle: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: invoice.tenantId },
        });
        const companyName = tenant?.name || 'TRAVEL DREAM';
        const companyAddress = tenant?.companyAddress || 'E57/A,HARI NAGAR EXTN-PART-II\nBADARPUR,NEW DELHI-110044 NEW\nDELHI 110044';
        const companyPhone = tenant?.companyPhone || '9310632440\n9560352484';
        const companyEmail = tenant?.companyEmail || 'traveldream1812@gmail.com';
        const companyGst = tenant?.companyGst || '07CICPS3802E2ZH';
        const companyPan = tenant?.companyPan || 'CICPS3802E';
        const sacNo = tenant?.sacNo || '9966';
        const serviceCategory = tenant?.serviceCategory || 'Rent-A-Cab';
        const bankName = tenant?.bankName || 'HDFC BANK';
        const bankBranch = tenant?.bankBranch || 'BADARPUR BRANCH';
        const bankAccountNo = tenant?.bankAccountNo || '50100234567890';
        const bankIfsc = tenant?.bankIfsc || 'HDFC0001234';
        const bankAccountHolder = tenant?.bankAccountHolder || 'TRAVEL DREAM';
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
            if (!tenant?.logoUrl)
                return null;
            if (tenant.logoUrl.startsWith('http://') || tenant.logoUrl.startsWith('https://')) {
                try {
                    const res = await fetch(tenant.logoUrl, { signal: AbortSignal.timeout(2000) });
                    if (res.ok) {
                        return Buffer.from(await res.arrayBuffer());
                    }
                }
                catch (e) {
                    console.warn('Failed to fetch logo from URL:', tenant.logoUrl, e.message);
                }
            }
            else {
                try {
                    const fs = require('fs');
                    const cleanPath = tenant.logoUrl.replace(/^\//, '');
                    const pathsToTry = [
                        path.resolve(__dirname, '..', 'assets', cleanPath),
                        path.resolve(__dirname, '..', '..', 'frontend', 'public', cleanPath),
                        path.resolve(tenant.logoUrl),
                    ];
                    for (const p of pathsToTry) {
                        if (fs.existsSync(p)) {
                            return fs.readFileSync(p);
                        }
                    }
                }
                catch (e) {
                    console.warn('Failed to read logo from local path:', tenant.logoUrl, e.message);
                }
            }
            return null;
        })();
        const parsedInvoice = this.recalculateInvoiceFields(invoice);
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));
            let pageNum = 1;
            const drawHeader = (pNum) => {
                doc.fillColor('#64748B').fontSize(8).font(fontBold).text(`Page No.`, 480, 20, { width: 50, align: 'right' });
                doc.text(`${pNum}`, 535, 20, { width: 15, align: 'right' });
                const layout = tenant?.pdfHeaderLayout || 'SINGLE_LINE';
                const titleStr = (tenant?.invoiceTitle || 'TAX INVOICE').toUpperCase();
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
                const gridY = 70;
                doc.rect(50, gridY, 495, 55).stroke('#CBD5E1');
                doc.moveTo(175, gridY).lineTo(175, gridY + 55).stroke('#CBD5E1');
                doc.moveTo(380, gridY).lineTo(380, gridY + 55).stroke('#CBD5E1');
                doc.fillColor(primaryColor).fontSize(7.5).font(fontBold);
                doc.text('GSTIN.:', 55, gridY + 5);
                doc.text('SAC NO.:', 55, gridY + 15);
                doc.text('PAN NO.:', 55, gridY + 25);
                doc.text('STATE CODE:', 55, gridY + 35);
                doc.text('S.T.Ctgry:', 55, gridY + 45);
                doc.fillColor('#334155').font(fontRegular);
                doc.text(companyGst, 105, gridY + 5);
                doc.text(sacNo, 105, gridY + 15);
                doc.text(companyPan, 105, gridY + 25);
                doc.text(companyGst.substring(0, 2) || '07', 115, gridY + 35);
                doc.text(serviceCategory, 105, gridY + 45);
                doc.fillColor('#334155').font(fontRegular).fontSize(7.5);
                const addrLines = companyAddress.split('\n');
                let addrY = gridY + 5;
                for (const line of addrLines) {
                    doc.text(line, 180, addrY);
                    addrY += 9;
                }
                doc.fillColor(primaryColor).font(fontBold).text('Email ID:', 180, gridY + 42);
                doc.fillColor('#334155').font(fontRegular).text(companyEmail, 220, gridY + 42);
                doc.fillColor(primaryColor).font(fontBold).text('Contact No.:', 385, gridY + 5);
                doc.fillColor('#334155').font(fontRegular);
                const contactLines = companyPhone.split('\n');
                let contactY = gridY + 15;
                for (const line of contactLines) {
                    doc.text(line, 435, contactY);
                    contactY += 10;
                }
                const billY = 130;
                doc.rect(50, billY, 495, 65).stroke('#CBD5E1');
                doc.moveTo(350, billY).lineTo(350, billY + 65).stroke('#CBD5E1');
                doc.fillColor(primaryColor).font(fontBold).fontSize(8);
                doc.text('Client Name :', 55, billY + 5);
                doc.text('Address :', 55, billY + 15);
                doc.text('G.S.T. IN :', 55, billY + 40);
                doc.text('PAN No :', 55, billY + 49);
                doc.text('State Code :', 55, billY + 57);
                doc.fillColor('#334155').font(fontRegular);
                doc.text(parsedInvoice.customer.name, 115, billY + 5);
                doc.text(parsedInvoice.customer.billingAddress, 115, billY + 15, { width: 230, height: 22 });
                doc.text(parsedInvoice.customer.gstNumber || 'N/A', 115, billY + 40);
                doc.text(parsedInvoice.customer.gstNumber ? parsedInvoice.customer.gstNumber.substring(2, 12) : 'N/A', 115, billY + 49);
                doc.text(parsedInvoice.customer.gstNumber ? parsedInvoice.customer.gstNumber.substring(0, 2) : 'N/A', 115, billY + 57);
                doc.fillColor(primaryColor).font(fontBold);
                doc.text('Bill No. :', 355, billY + 5);
                doc.text('Bill Date :', 355, billY + 18);
                doc.fillColor('#334155').font(fontRegular);
                doc.text(parsedInvoice.invoiceNumber, 405, billY + 5);
                doc.text(new Date(parsedInvoice.invoiceDate).toLocaleDateString('en-GB'), 405, billY + 18);
                const tableHeaderY = 200;
                doc.rect(50, tableHeaderY, 495, 20).fill(primaryColor);
                doc.fillColor('#FFFFFF').fontSize(8.5).font(fontBold);
                doc.text('Date/D.S. No.', 52, tableHeaderY + 6, { width: 61, align: 'center' });
                doc.text('Vehicle Detail', 117, tableHeaderY + 6, { width: 56, align: 'center' });
                doc.text('Duty Description / Particulars', 178, tableHeaderY + 6);
                doc.text('Rate', 437, tableHeaderY + 6, { width: 51, align: 'center' });
                doc.text('Amount', 492, tableHeaderY + 6, { width: 51, align: 'center' });
                doc.fillColor('#000000');
            };
            drawHeader(pageNum);
            let currentY = 220;
            const bottomLimit = 730;
            if (parsedInvoice.items && parsedInvoice.items.length > 0) {
                for (let idx = 0; idx < parsedInvoice.items.length; idx++) {
                    const item = parsedInvoice.items[idx];
                    const trip = item.trip;
                    if (!trip)
                        continue;
                    const ds = trip.dutySlip;
                    const booking = trip.booking;
                    const dateStr = new Date(booking.pickupDate).toLocaleDateString('en-GB');
                    const dsNo = ds.dutySlipNumber.replace('DS-', '');
                    const vehicleModel = ds.vehicle.model.split(' ')[0] || ds.vehicle.vehicleType;
                    const vehicleNo = ds.vehicle.vehicleNumber.slice(-4);
                    const particularsRows = [];
                    const empId = booking.employeeId || ds.employeeId;
                    if (empId) {
                        particularsRows.push({ label: `Emp Id - ${empId}` });
                    }
                    const guestVal = (booking.guestSalutation ? booking.guestSalutation + ' ' : '') + (booking.guestName || booking.customer.name);
                    particularsRows.push({ label: `Guest - ${guestVal}` });
                    if (booking.tripType === client_1.TripType.OUTSTATION) {
                        particularsRows.push({ label: `OUTSTATION : ${trip.totalKm} KM` });
                        particularsRows.push({ label: `${booking.pickupLocation.toUpperCase()} TO ${booking.dropLocation.toUpperCase()}` });
                        particularsRows.push({ label: `( As Per 250 Km per Day min.running limit )` });
                    }
                    else {
                        particularsRows.push({ label: `${booking.tripType} : ${trip.totalKm} Kms & ${Number(trip.totalHours || 0).toFixed(2)} Hrs. Duty` });
                    }
                    const baseKm = booking.tripType === client_1.TripType.OUTSTATION ? Number(trip.totalDays) * 250 : (booking.tripType === client_1.TripType.AIRPORT_TRANSFER ? 40 : 80);
                    const baseHr = booking.tripType === client_1.TripType.OUTSTATION ? 24 : 8;
                    particularsRows.push({
                        label: booking.tripType === client_1.TripType.OUTSTATION
                            ? `UPTO ${baseKm} Kms. & ${trip.totalDays} Days Duty`
                            : `UPTO ${baseKm} Kms. & ${baseHr} Hrs Duty`,
                        rate: Number(trip.baseFareCharged).toFixed(2),
                        amount: Number(trip.baseFareCharged).toFixed(2),
                    });
                    if (Number(trip.extraKmCharged) > 0) {
                        const extraKmQty = Math.max(0, Number(trip.totalKm) - baseKm);
                        const extraKmRate = extraKmQty > 0 ? Number(trip.extraKmCharged) / extraKmQty : 14;
                        particularsRows.push({
                            label: `Extra Km ${extraKmQty.toFixed(2)} @`,
                            rate: extraKmRate.toFixed(2),
                            amount: Number(trip.extraKmCharged).toFixed(2),
                        });
                    }
                    if (Number(trip.extraHoursCharged) > 0) {
                        const extraHrsQty = Math.max(0, Number(trip.totalHours || 0) - baseHr);
                        const extraHrsRate = extraHrsQty > 0 ? Number(trip.extraHoursCharged) / extraHrsQty : 100;
                        particularsRows.push({
                            label: `Extra Hrs ${extraHrsQty.toFixed(2)} @`,
                            rate: extraHrsRate.toFixed(2),
                            amount: Number(trip.extraHoursCharged).toFixed(2),
                        });
                    }
                    if (Number(trip.driverAllowance) > 0) {
                        particularsRows.push({
                            label: `DRIVER ALLOWANCE 1 @`,
                            rate: Number(trip.driverAllowance).toFixed(2),
                            amount: Number(trip.driverAllowance).toFixed(2),
                        });
                    }
                    if (Number(trip.nightChargesCharged) > 0) {
                        particularsRows.push({
                            label: `NIGHT SURCHARGE`,
                            amount: Number(trip.nightChargesCharged).toFixed(2),
                        });
                    }
                    if (Number(trip.parking) > 0) {
                        particularsRows.push({
                            label: 'Parking Charges',
                            amount: Number(trip.parking).toFixed(2),
                        });
                    }
                    if (Number(trip.toll) > 0) {
                        particularsRows.push({
                            label: 'Toll Charges',
                            amount: Number(trip.toll).toFixed(2),
                        });
                    }
                    if (Number(trip.stateTaxCharged) > 0) {
                        particularsRows.push({
                            label: 'State Tax',
                            amount: Number(trip.stateTaxCharged).toFixed(2),
                        });
                    }
                    if (Number(trip.mcdCharged) > 0) {
                        particularsRows.push({
                            label: 'MCD Toll',
                            amount: Number(trip.mcdCharged).toFixed(2),
                        });
                    }
                    if (Number(trip.miscChargesCharged) > 0) {
                        particularsRows.push({
                            label: 'Other/Misc Charges',
                            amount: Number(trip.miscChargesCharged).toFixed(2),
                        });
                    }
                    const tripSubtotal = Number(trip.baseFareCharged) +
                        Number(trip.extraKmCharged) +
                        Number(trip.toll) +
                        Number(trip.parking) +
                        Number(trip.stateTaxCharged || 0) +
                        Number(trip.mcdCharged || 0) +
                        Number(trip.nightChargesCharged) +
                        Number(trip.extraHoursCharged) +
                        Number(trip.driverAllowance) +
                        Number(trip.miscChargesCharged);
                    particularsRows.push({
                        label: 'DUTY SLIP TOTAL',
                        amount: tripSubtotal.toFixed(2),
                    });
                    const rowHeight = particularsRows.length * 11 + 10;
                    const isLastItem = (idx === parsedInvoice.items.length - 1);
                    const limit = isLastItem ? 550 : bottomLimit;
                    if (currentY > 220 && currentY + rowHeight > limit) {
                        doc.moveTo(50, currentY).lineTo(545, currentY).stroke('#CBD5E1');
                        doc.fillColor('#64748B').font(fontBold).fontSize(8).text('Continued........', 450, currentY + 10);
                        doc.addPage();
                        pageNum++;
                        drawHeader(pageNum);
                        currentY = 220;
                    }
                    doc.rect(50, currentY, 495, rowHeight).stroke('#CBD5E1');
                    if (!isRefined) {
                        doc.moveTo(115, currentY).lineTo(115, currentY + rowHeight).stroke('#F1F5F9');
                        doc.moveTo(175, currentY).lineTo(175, currentY + rowHeight).stroke('#F1F5F9');
                        doc.moveTo(435, currentY).lineTo(435, currentY + rowHeight).stroke('#F1F5F9');
                        doc.moveTo(490, currentY).lineTo(490, currentY + rowHeight).stroke('#F1F5F9');
                    }
                    doc.fillColor('#0F172A').font(fontBold).fontSize(8.5);
                    doc.text(dateStr, 52, currentY + 5, { width: 61, align: 'center' });
                    doc.text(dsNo, 52, currentY + 16, { width: 61, align: 'center' });
                    doc.text(vehicleModel.toUpperCase(), 117, currentY + 5, { width: 56, align: 'center' });
                    doc.text(vehicleNo, 117, currentY + 16, { width: 56, align: 'center' });
                    let particularsY = currentY + 5;
                    for (const subRow of particularsRows) {
                        if (subRow.label === 'DUTY SLIP TOTAL') {
                            doc.moveTo(175, particularsY - 2).lineTo(545, particularsY - 2).lineWidth(0.5).stroke('#CBD5E1');
                        }
                        doc.fillColor(subRow.label === 'DUTY SLIP TOTAL' ? primaryColor : '#334155');
                        doc.font(subRow.rate || subRow.amount || subRow.label === 'DUTY SLIP TOTAL' ? fontBold : fontRegular).fontSize(8);
                        doc.text(subRow.label, 180, particularsY);
                        if (subRow.rate) {
                            doc.text(subRow.rate, 437, particularsY, { width: 51, align: 'right' });
                        }
                        if (subRow.amount) {
                            doc.text(subRow.amount, 492, particularsY, { width: 51, align: 'right' });
                        }
                        particularsY += 11;
                    }
                    currentY += rowHeight;
                }
            }
            if (currentY < 550) {
                const remainingH = 550 - currentY;
                doc.rect(50, currentY, 495, remainingH).stroke('#CBD5E1');
                if (!isRefined) {
                    doc.moveTo(115, currentY).lineTo(115, 550).stroke('#F1F5F9');
                    doc.moveTo(175, currentY).lineTo(175, 550).stroke('#F1F5F9');
                    doc.moveTo(435, currentY).lineTo(435, 550).stroke('#F1F5F9');
                    doc.moveTo(490, currentY).lineTo(490, 550).stroke('#F1F5F9');
                }
                currentY = 550;
            }
            const footerY = currentY;
            const totalSlipsEnclosed = parsedInvoice.items.length;
            let amountColSum = 0;
            let tollParkingTaxSum = 0;
            for (const item of parsedInvoice.items) {
                const trip = item.trip;
                if (!trip)
                    continue;
                amountColSum += Number(trip.baseFareCharged || 0) +
                    Number(trip.extraKmCharged || 0) +
                    Number(trip.extraHoursCharged || 0) +
                    Number(trip.driverAllowance || 0) +
                    Number(trip.nightChargesCharged || 0);
                tollParkingTaxSum += Number(trip.toll || 0) +
                    Number(trip.parking || 0) +
                    Number(trip.stateTaxCharged || 0) +
                    Number(trip.mcdCharged || 0) +
                    Number(trip.miscChargesCharged || 0);
            }
            doc.rect(50, footerY, 495, 60).stroke('#CBD5E1');
            doc.moveTo(350, footerY).lineTo(350, footerY + 60).stroke('#CBD5E1');
            doc.fillColor(primaryColor).font(fontBold).fontSize(8.5);
            doc.text('TOTAL DUTY SLIP ENCLOSE', 55, footerY + 6);
            doc.fillColor('#0F172A').text(`${totalSlipsEnclosed}`, 210, footerY + 6);
            doc.fillColor(primaryColor).text('TOTAL AMOUNT', 355, footerY + 6);
            doc.fillColor('#0F172A').text(amountColSum.toFixed(2), 480, footerY + 6, { width: 60, align: 'right' });
            const totalGstRate = Number(parsedInvoice.cgstRate || 0) + Number(parsedInvoice.sgstRate || 0) + Number(parsedInvoice.igstRate || 0);
            const isCorporate = parsedInvoice.customer?.type === 'CORPORATE';
            const isRcm = isCorporate && Math.abs(totalGstRate - 5) < 0.01;
            if (isRcm) {
                doc.fillColor('#475569').fontSize(7).text('As per the Notification No.22/2019.Tax(rate)dated30.09.19 Service receiver is liable to pay', 55, footerY + 25, { width: 280 });
            }
            doc.fillColor(primaryColor).fontSize(8.5).text('Parking/TollTax Detail', 355, footerY + 20);
            doc.fillColor('#0F172A').text(tollParkingTaxSum.toFixed(2), 480, footerY + 20, { width: 60, align: 'right' });
            let gstLineY = footerY + 34;
            if (Number(parsedInvoice.cgstAmount) > 0) {
                doc.fillColor(primaryColor).text(`CGST( @ ${Number(parsedInvoice.cgstRate)} % )`, 355, gstLineY);
                doc.fillColor('#0F172A').text(Number(parsedInvoice.cgstAmount).toFixed(2), 480, gstLineY, { width: 60, align: 'right' });
                gstLineY += 12;
                doc.fillColor(primaryColor).text(`SGST( @ ${Number(parsedInvoice.sgstRate)} % )`, 355, gstLineY);
                doc.fillColor('#0F172A').text(Number(parsedInvoice.sgstAmount).toFixed(2), 480, gstLineY, { width: 60, align: 'right' });
            }
            else if (Number(parsedInvoice.igstAmount) > 0) {
                doc.fillColor(primaryColor).text(`IGST( @ ${Number(parsedInvoice.igstRate)} % )`, 355, gstLineY);
                doc.fillColor('#0F172A').text(Number(parsedInvoice.igstAmount).toFixed(2), 480, gstLineY, { width: 60, align: 'right' });
            }
            const totalBoxY = footerY + 60;
            doc.rect(50, totalBoxY, 495, 30).stroke('#CBD5E1');
            doc.moveTo(350, totalBoxY).lineTo(350, totalBoxY + 30).stroke('#CBD5E1');
            const grandTotal = Number(parsedInvoice.totalAmount);
            const amountInWords = numberToWords(grandTotal);
            doc.fillColor('#475569').font(fontBold).fontSize(7.5);
            doc.text(amountInWords, 55, totalBoxY + 10, { width: 280 });
            if (isRefined) {
                doc.rect(350, totalBoxY, 195, 30).fill(primaryColor);
                doc.fillColor('#FFFFFF').fontSize(9).font(fontBold).text('NET AMOUNT', 355, totalBoxY + 10);
                doc.text(grandTotal.toFixed(2), 480, totalBoxY + 10, { width: 60, align: 'right' });
            }
            else {
                doc.fillColor(primaryColor).fontSize(9).font(fontBold).text('NET AMOUNT', 355, totalBoxY + 10);
                doc.text(grandTotal.toFixed(2), 480, totalBoxY + 10, { width: 60, align: 'right' });
            }
            const termsY = totalBoxY + 35;
            const showTerms = tenant?.pdfShowTerms !== false;
            const showBank = tenant?.pdfShowBank !== false;
            if (showTerms) {
                const customTerms = tenant?.termsAndConditions || ('E. & O.E. Subject to Delhi Jurisdiction.\n' +
                    'Our Responsibility of the signed duty slip resets till we handover them to you with the bill.\n' +
                    'Interest chargable on bills not paid on presentation @ 18% p.a.\n' +
                    'Passengers Tax, Toll tax, Interstate taxes, Car parking Etc. will be charged on actual basis on production of receipts.\n' +
                    'GST, if Applicable will be charged extra. A subsequent bill will be issued for the same.\n' +
                    'In case of discrepancy , Kindly return the bill for necessary correction within 10 days or it shall be treated as O.K. and you shall be liable to pay the full amount.');
                doc.fillColor(primaryColor).font(fontBold).fontSize(8.5).text('Terms & Condition', 55, termsY);
                doc.fillColor('#475569').font(fontRegular).fontSize(7).text(customTerms, 55, termsY + 12, { width: 330, lineGap: 1.5 });
            }
            doc.font(fontBold).fontSize(9).fillColor(primaryColor).text(companyName.toUpperCase(), 390, termsY + 5, { align: 'center', width: 150 });
            doc.fillColor('#000000');
            if (showBank) {
                doc.rect(390, termsY + 20, 150, 48).stroke('#CBD5E1');
                doc.fillColor(primaryColor).fontSize(6.5).font(fontBold);
                doc.text('BANK DETAILS:', 393, termsY + 23);
                doc.fillColor('#334155').font(fontRegular);
                doc.text(`Bank Name: ${bankName}`, 393, termsY + 31, { width: 144, height: 8 });
                doc.text(`A/c No: ${bankAccountNo}`, 393, termsY + 39, { width: 144, height: 8 });
                doc.text(`IFSC: ${bankIfsc}`, 393, termsY + 47, { width: 144, height: 8 });
                doc.text(`Branch: ${bankBranch}`, 393, termsY + 55, { width: 144, height: 8 });
            }
            doc.fillColor(primaryColor).font(fontBold).fontSize(8.5).text('Authorized Signatory', 390, termsY + 75, { align: 'center', width: 150 });
            doc.end();
        });
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        trips_service_1.TripsService])
], InvoicesService);
function numberToWords(num) {
    const a = [
        '', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ',
        'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '
    ];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    if (num === 0)
        return 'zero';
    let str = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = Math.floor(num / 100);
    num %= 100;
    const tens = Math.floor(num);
    const paise = Math.round((num - tens) * 100);
    const convertTens = (n) => {
        if (n < 20)
            return a[n];
        return b[Math.floor(n / 10)] + ' ' + a[n % 10];
    };
    if (crore > 0) {
        str += convertTens(crore) + 'crore ';
    }
    if (lakh > 0) {
        str += convertTens(lakh) + 'lakh ';
    }
    if (thousand > 0) {
        str += convertTens(thousand) + 'thousand ';
    }
    if (hundred > 0) {
        str += convertTens(hundred) + 'hundred ';
    }
    if (tens > 0) {
        if (str !== '')
            str += 'and ';
        str += convertTens(tens);
    }
    str = str.trim();
    let result = 'RUPEES ' + str.toUpperCase();
    if (paise > 0) {
        result += ' AND ' + convertTens(paise).trim().toUpperCase() + ' PAISE';
    }
    result += ' ONLY';
    return result;
}
//# sourceMappingURL=invoices.service.js.map