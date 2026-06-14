"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pdfkit_1 = __importDefault(require("pdfkit"));
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRevenueReport(startDate, endDate) {
        const invoices = await this.prisma.invoice.findMany({
            where: {
                invoiceDate: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined,
                },
            },
            orderBy: { invoiceDate: 'asc' },
        });
        let totalSubtotal = 0;
        let totalTax = 0;
        let totalAmount = 0;
        let totalPaid = 0;
        let totalDue = 0;
        const timelineMap = new Map();
        for (const invoice of invoices) {
            const sub = Number(invoice.subtotal);
            const tax = Number(invoice.totalTax);
            const amt = Number(invoice.totalAmount);
            const paid = Number(invoice.paidAmount);
            const due = Number(invoice.dueAmount);
            totalSubtotal += sub;
            totalTax += tax;
            totalAmount += amt;
            totalPaid += paid;
            totalDue += due;
            const dateStr = new Date(invoice.invoiceDate).toISOString().slice(0, 10);
            if (!timelineMap.has(dateStr)) {
                timelineMap.set(dateStr, { date: dateStr, revenue: 0, collections: 0 });
            }
            const entry = timelineMap.get(dateStr);
            entry.revenue += amt;
            entry.collections += paid;
        }
        const timeline = Array.from(timelineMap.values());
        return {
            summary: {
                totalSubtotal,
                totalTax,
                totalAmount,
                totalPaid,
                totalDue,
                invoiceCount: invoices.length,
            },
            timeline,
        };
    }
    async getBookingReport(startDate, endDate) {
        const dateQuery = {};
        if (startDate)
            dateQuery.gte = new Date(startDate);
        if (endDate)
            dateQuery.lte = new Date(endDate);
        const where = Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {};
        const [statusCounts, typeCounts, totalBookings] = await Promise.all([
            this.prisma.booking.groupBy({
                by: ['status'],
                _count: { _all: true },
                where,
            }),
            this.prisma.booking.groupBy({
                by: ['tripType'],
                _count: { _all: true },
                where,
            }),
            this.prisma.booking.count({
                where,
            }),
        ]);
        const statusBreakdown = statusCounts.reduce((acc, curr) => {
            acc[curr.status] = curr._count._all;
            return acc;
        }, {});
        const typeBreakdown = typeCounts.reduce((acc, curr) => {
            acc[curr.tripType] = curr._count._all;
            return acc;
        }, {});
        return {
            totalBookings,
            statusBreakdown,
            typeBreakdown,
        };
    }
    async getVehicleUtilizationReport(startDate, endDate) {
        const vehicles = await this.prisma.vehicle.findMany({
            include: {
                dutySlips: {
                    where: {
                        status: 'CLOSED',
                        trip: {
                            closedAt: {
                                gte: startDate ? new Date(startDate) : undefined,
                                lte: endDate ? new Date(endDate) : undefined,
                            },
                        },
                    },
                    include: {
                        trip: true,
                    },
                },
            },
        });
        const report = vehicles.map((v) => {
            let tripsCount = 0;
            let totalKm = 0;
            let totalRevenue = 0;
            for (const ds of v.dutySlips) {
                if (ds.trip) {
                    tripsCount++;
                    totalKm += Number(ds.trip.totalKm);
                    totalRevenue += Number(ds.trip.totalAmount);
                }
            }
            return {
                vehicleId: v.id,
                vehicleNumber: v.vehicleNumber,
                model: v.model,
                vehicleType: v.vehicleType,
                status: v.status,
                tripsCount,
                totalKm,
                totalRevenue,
            };
        });
        report.sort((a, b) => b.tripsCount - a.tripsCount);
        return report;
    }
    async getDriverReport(startDate, endDate) {
        const drivers = await this.prisma.driver.findMany({
            include: {
                dutySlips: {
                    where: {
                        status: 'CLOSED',
                        trip: {
                            closedAt: {
                                gte: startDate ? new Date(startDate) : undefined,
                                lte: endDate ? new Date(endDate) : undefined,
                            },
                        },
                    },
                    include: {
                        trip: true,
                    },
                },
            },
        });
        const report = drivers.map((d) => {
            let tripsCount = 0;
            let totalKm = 0;
            let driverAllowance = 0;
            let totalRevenue = 0;
            for (const ds of d.dutySlips) {
                if (ds.trip) {
                    tripsCount++;
                    totalKm += Number(ds.trip.totalKm);
                    driverAllowance += Number(ds.trip.driverAllowance);
                    totalRevenue += Number(ds.trip.totalAmount);
                }
            }
            return {
                driverId: d.id,
                name: d.name,
                mobile: d.mobile,
                status: d.status,
                tripsCount,
                totalKm,
                driverAllowance,
                totalRevenue,
            };
        });
        report.sort((a, b) => b.tripsCount - a.tripsCount);
        return report;
    }
    async getOutstandingReport() {
        const outstandingInvoices = await this.prisma.invoice.findMany({
            where: {
                dueAmount: { gt: 0 },
                status: { notIn: ['VOID', 'PAID'] },
            },
            include: {
                customer: true,
            },
        });
        const today = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const customerMap = new Map();
        for (const inv of outstandingInvoices) {
            const due = Number(inv.dueAmount);
            const dueDate = new Date(inv.dueDate);
            const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / oneDayMs);
            const custId = inv.customerId;
            if (!customerMap.has(custId)) {
                customerMap.set(custId, {
                    customerId: custId,
                    customerName: inv.customer.name,
                    companyName: inv.customer.companyName,
                    totalOutstanding: 0,
                    current: 0,
                    overdue1to30: 0,
                    overdue31to60: 0,
                    overdue61Plus: 0,
                });
            }
            const entry = customerMap.get(custId);
            entry.totalOutstanding += due;
            if (diffDays <= 0) {
                entry.current += due;
            }
            else if (diffDays <= 30) {
                entry.overdue1to30 += due;
            }
            else if (diffDays <= 60) {
                entry.overdue31to60 += due;
            }
            else {
                entry.overdue61Plus += due;
            }
        }
        const ageingLedger = Array.from(customerMap.values());
        let globalCurrent = 0;
        let global1to30 = 0;
        let global31to60 = 0;
        let global61Plus = 0;
        let globalTotal = 0;
        for (const ledger of ageingLedger) {
            globalCurrent += ledger.current;
            global1to30 += ledger.overdue1to30;
            global31to60 += ledger.overdue31to60;
            global61Plus += ledger.overdue61Plus;
            globalTotal += ledger.totalOutstanding;
        }
        return {
            summary: {
                current: globalCurrent,
                overdue1to30: global1to30,
                overdue31to60: global31to60,
                overdue61Plus: global61Plus,
                totalOutstanding: globalTotal,
            },
            ledger: ageingLedger,
        };
    }
    async getBillRegisterData(query) {
        const where = {};
        where.status = { not: 'VOID' };
        if (query.customerId) {
            where.customerId = query.customerId;
        }
        if (query.gstOption === 'GST') {
            where.customer = { gstNumber: { not: null, notIn: [''] } };
        }
        else if (query.gstOption === 'SERVICES_TAX') {
            where.customer = { OR: [{ gstNumber: null }, { gstNumber: '' }] };
        }
        if (query.billCoverNo) {
            where.invoiceNumber = { contains: query.billCoverNo, mode: 'insensitive' };
        }
        if (query.billDateFrom || query.billDateTo) {
            where.invoiceDate = {};
            if (query.billDateFrom)
                where.invoiceDate.gte = new Date(query.billDateFrom);
            if (query.billDateTo)
                where.invoiceDate.lte = new Date(query.billDateTo);
        }
        if (query.monthOf) {
            const [year, month] = query.monthOf.split('-').map(Number);
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0, 23, 59, 59, 999);
            where.invoiceDate = { gte: start, lte: end };
        }
        if (query.state) {
            where.customer = {
                ...where.customer,
                billingAddress: { contains: query.state, mode: 'insensitive' },
            };
        }
        if (query.city) {
            where.customer = {
                ...where.customer,
                billingAddress: { contains: query.city, mode: 'insensitive' },
            };
        }
        if (query.guestName || query.employeeId || query.dutyDateFrom || query.dutyDateTo) {
            where.items = {
                some: {
                    trip: {
                        booking: {
                            guestName: query.guestName ? { contains: query.guestName, mode: 'insensitive' } : undefined,
                            employeeId: query.employeeId ? { contains: query.employeeId, mode: 'insensitive' } : undefined,
                            pickupDate: (query.dutyDateFrom || query.dutyDateTo) ? {
                                gte: query.dutyDateFrom ? new Date(query.dutyDateFrom) : undefined,
                                lte: query.dutyDateTo ? new Date(query.dutyDateTo) : undefined,
                            } : undefined,
                        },
                    },
                },
            };
        }
        const invoices = await this.prisma.invoice.findMany({
            where,
            orderBy: { invoiceDate: 'asc' },
            include: {
                customer: true,
                items: {
                    include: {
                        trip: {
                            include: {
                                booking: true,
                            },
                        },
                    },
                },
            },
        });
        return invoices.map((inv, idx) => {
            const subtotal = Number(inv.subtotal);
            const toll = Number(inv.toll);
            const parking = Number(inv.parking);
            const mcd = Number(inv.mcd || 0);
            const stateTax = Number(inv.stateTax || 0);
            const basicAmt = subtotal - toll - parking - mcd - stateTax;
            const ptTaxes = toll + parking + mcd + stateTax;
            const guestNames = Array.from(new Set(inv.items
                .map((item) => item.trip?.booking?.guestName)
                .filter(Boolean))).join(', ') || '.';
            return {
                sn: idx + 1,
                id: inv.id,
                billDate: new Date(inv.invoiceDate).toLocaleDateString('en-GB'),
                billNo: inv.invoiceNumber,
                clientName: inv.customer.name,
                guestName: guestNames,
                basicAmt,
                ptTaxes,
                igst: Number(inv.igstAmount),
                cgst: Number(inv.cgstAmount),
                sgst: Number(inv.sgstAmount),
                total: Number(inv.totalAmount),
            };
        });
    }
    async generateBillRegisterPdf(query) {
        const data = await this.getBillRegisterData(query);
        const invoices = await this.prisma.invoice.findMany({
            where: {
                status: { not: 'VOID' },
                ...(query.customerId ? { customerId: query.customerId } : {}),
            },
            take: 1,
        });
        let tenantId = '';
        if (invoices.length > 0) {
            tenantId = invoices[0].tenantId;
        }
        const tenant = tenantId
            ? await this.prisma.tenant.findUnique({ where: { id: tenantId } })
            : await this.prisma.tenant.findFirst();
        const companyName = tenant?.name || 'TRAVEL DREAM';
        const companyAddress = tenant?.companyAddress || 'E57/A,HARI NAGAR EXTN-PART-II\nBADARPUR,NEW DELHI-110044 New Delhi Delhi\n110044';
        const companyPhone = tenant?.companyPhone || '9310632440 9560352484';
        const companyEmail = tenant?.companyEmail || 'traveldream1812@gmail.com';
        const [logoBuffer, badgeBuffer] = await Promise.all([
            (async () => {
                const logoUrl = tenant?.logoUrl;
                if (logoUrl && (logoUrl.startsWith('http://') || logoUrl.startsWith('https://'))) {
                    try {
                        const res = await fetch(logoUrl, { signal: AbortSignal.timeout(3000) });
                        if (res.ok)
                            return Buffer.from(await res.arrayBuffer());
                    }
                    catch (e) {
                        console.warn('Failed to fetch report tenant logo:', e.message);
                    }
                }
                return null;
            })(),
            (async () => {
                const badgeUrl = 'https://res.cloudinary.com/dletrtogt/image/upload/v1718363717/satisfaction_guaranteed.png';
                try {
                    const res = await fetch(badgeUrl, { signal: AbortSignal.timeout(3000) });
                    if (res.ok)
                        return Buffer.from(await res.arrayBuffer());
                }
                catch (e) {
                    console.warn('Failed to fetch satisfaction badge:', e.message);
                }
                return null;
            })(),
        ]);
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 30, size: 'A4', layout: 'landscape' });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));
            let pageNum = 1;
            const drawHeader = (pNum) => {
                if (logoBuffer) {
                    try {
                        doc.image(logoBuffer, 30, 20, { width: 90, height: 42, fit: [90, 42] });
                    }
                    catch (e) {
                        console.warn('Failed to draw logo on report:', e);
                    }
                }
                doc.fillColor('#000000')
                    .font('Helvetica-Bold')
                    .fontSize(14)
                    .text(companyName.toUpperCase(), 150, 18, { align: 'center', width: 541 });
                doc.font('Helvetica')
                    .fontSize(8.5)
                    .text(companyAddress.replace(/\n/g, ', '), 150, 36, { align: 'center', width: 541 });
                doc.font('Helvetica-Bold')
                    .text('Contact No: ', 280, 50, { continued: true })
                    .font('Helvetica')
                    .text(companyPhone.replace(/\n/g, ', '), { continued: true })
                    .font('Helvetica-Bold')
                    .text('  Email: ', { continued: true })
                    .font('Helvetica')
                    .text(companyEmail);
                doc.font('Helvetica-Bold')
                    .fontSize(9.5)
                    .text(`Page No  ${pNum}`, 720, 18, { align: 'right', width: 95 });
                doc.font('Helvetica-Bold')
                    .fontSize(13)
                    .text('Bill Register', 700, 38, { align: 'right', width: 115, underline: true });
                doc.moveTo(30, 68).lineTo(815, 68).lineWidth(0.5).stroke('#000000');
                let dateFilterStr = 'All Records';
                if (query.dutyDateFrom || query.dutyDateTo) {
                    const startFmt = query.dutyDateFrom ? new Date(query.dutyDateFrom).toLocaleDateString('en-GB') : 'Start';
                    const endFmt = query.dutyDateTo ? new Date(query.dutyDateTo).toLocaleDateString('en-GB') : 'End';
                    dateFilterStr = `Duty Date From:-  ${startFmt} To  ${endFmt}`;
                }
                else if (query.billDateFrom || query.billDateTo) {
                    const startFmt = query.billDateFrom ? new Date(query.billDateFrom).toLocaleDateString('en-GB') : 'Start';
                    const endFmt = query.billDateTo ? new Date(query.billDateTo).toLocaleDateString('en-GB') : 'End';
                    dateFilterStr = `Bill Date From:-  ${startFmt} To  ${endFmt}`;
                }
                else if (query.monthOf) {
                    const parts = query.monthOf.split('-');
                    dateFilterStr = `Month Of:-  ${parts[1]}/${parts[0]}`;
                }
                doc.font('Helvetica-Bold')
                    .fontSize(9.5)
                    .text(dateFilterStr, 30, 75);
                doc.moveTo(30, 90).lineTo(815, 90).lineWidth(1).stroke('#000000');
            };
            const drawTableHeader = (startY) => {
                doc.rect(30, startY, 785, 20).fill('#F8FAFC').stroke('#000000');
                doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5);
                const cols = [
                    { label: 'S.N', x: 30, w: 25, align: 'center' },
                    { label: 'Bill Date', x: 55, w: 65, align: 'left' },
                    { label: 'Bill No', x: 120, w: 65, align: 'left' },
                    { label: 'Client Name', x: 185, w: 160, align: 'left' },
                    { label: 'Guest Name', x: 345, w: 110, align: 'left' },
                    { label: 'Basic Amt', x: 455, w: 65, align: 'right' },
                    { label: 'P/T/Taxes', x: 520, w: 65, align: 'right' },
                    { label: 'IGST', x: 585, w: 55, align: 'right' },
                    { label: 'CGST', x: 640, w: 55, align: 'right' },
                    { label: 'SGST', x: 695, w: 55, align: 'right' },
                    { label: 'Total', x: 750, w: 65, align: 'right' },
                ];
                cols.forEach((col) => {
                    doc.text(col.label, col.x + 3, startY + 6, {
                        width: col.w - 6,
                        align: col.align,
                    });
                    if (col.x > 30) {
                        doc.moveTo(col.x, startY).lineTo(col.x, startY + 20).stroke('#000000');
                    }
                });
            };
            drawHeader(pageNum);
            let currentY = 95;
            drawTableHeader(currentY);
            currentY += 20;
            let grandBasicAmt = 0;
            let grandPtTaxes = 0;
            let grandIgst = 0;
            let grandCgst = 0;
            let grandSgst = 0;
            let grandTotal = 0;
            data.forEach((row, index) => {
                grandBasicAmt += row.basicAmt;
                grandPtTaxes += row.ptTaxes;
                grandIgst += row.igst;
                grandCgst += row.cgst;
                grandSgst += row.sgst;
                grandTotal += row.total;
                doc.fontSize(8);
                const clientNameHeight = doc.heightOfString(row.clientName, { width: 160 - 6 });
                const guestNameHeight = doc.heightOfString(row.guestName, { width: 110 - 6 });
                const rowHeight = Math.max(18, clientNameHeight, guestNameHeight) + 6;
                if (currentY + rowHeight > 520) {
                    doc.addPage();
                    pageNum++;
                    drawHeader(pageNum);
                    let tempY = 95;
                    drawTableHeader(tempY);
                    currentY = tempY + 20;
                }
                doc.fillColor('#000000').font('Helvetica').fontSize(8);
                doc.text(row.sn.toString(), 30 + 3, currentY + 4, { width: 25 - 6, align: 'center' });
                doc.text(row.billDate, 55 + 3, currentY + 4, { width: 65 - 6 });
                doc.text(row.billNo, 120 + 3, currentY + 4, { width: 65 - 6 });
                doc.text(row.clientName, 185 + 3, currentY + 4, { width: 160 - 6 });
                doc.text(row.guestName, 345 + 3, currentY + 4, { width: 110 - 6 });
                doc.text(row.basicAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 455 + 3, currentY + 4, { width: 65 - 6, align: 'right' });
                doc.text(row.ptTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 520 + 3, currentY + 4, { width: 65 - 6, align: 'right' });
                doc.text(row.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 585 + 3, currentY + 4, { width: 55 - 6, align: 'right' });
                doc.text(row.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 640 + 3, currentY + 4, { width: 55 - 6, align: 'right' });
                doc.text(row.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 695 + 3, currentY + 4, { width: 55 - 6, align: 'right' });
                doc.text(row.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 750 + 3, currentY + 4, { width: 65 - 6, align: 'right' });
                doc.rect(30, currentY, 785, rowHeight).stroke('#000000');
                const colsX = [55, 120, 185, 345, 455, 520, 585, 640, 695, 750];
                colsX.forEach((xCoord) => {
                    doc.moveTo(xCoord, currentY).lineTo(xCoord, currentY + rowHeight).stroke('#000000');
                });
                currentY += rowHeight;
            });
            const totalRowHeight = 20;
            if (currentY + totalRowHeight > 520) {
                doc.addPage();
                pageNum++;
                drawHeader(pageNum);
                let tempY = 95;
                drawTableHeader(tempY);
                currentY = tempY + 20;
            }
            doc.rect(30, currentY, 785, totalRowHeight).fill('#F1F5F9').stroke('#000000');
            doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5);
            doc.text('TOTAL', 30 + 3, currentY + 5, { width: 425 - 6, align: 'right' });
            const totalColsX = [55, 120, 185, 345, 455, 520, 585, 640, 695, 750];
            totalColsX.forEach((xCoord) => {
                doc.moveTo(xCoord, currentY).lineTo(xCoord, currentY + totalRowHeight).stroke('#000000');
            });
            doc.text(grandBasicAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 455 + 3, currentY + 5, { width: 65 - 6, align: 'right' });
            doc.text(grandPtTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 520 + 3, currentY + 5, { width: 65 - 6, align: 'right' });
            doc.text(grandIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 585 + 3, currentY + 5, { width: 55 - 6, align: 'right' });
            doc.text(grandCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 640 + 3, currentY + 5, { width: 55 - 6, align: 'right' });
            doc.text(grandSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 695 + 3, currentY + 5, { width: 55 - 6, align: 'right' });
            doc.text(grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 750 + 3, currentY + 5, { width: 65 - 6, align: 'right' });
            doc.end();
        });
    }
    async getDutySlipRegisterData(query) {
        const where = {};
        if (query.driverId) {
            where.driverId = query.driverId;
        }
        if (query.vehicleId) {
            where.vehicleId = query.vehicleId;
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.startDate || query.endDate) {
            where.reportingTime = {};
            if (query.startDate)
                where.reportingTime.gte = new Date(query.startDate);
            if (query.endDate)
                where.reportingTime.lte = new Date(query.endDate);
        }
        if (query.dutySlipFrom || query.dutySlipTo) {
            where.dutySlipNumber = {};
            if (query.dutySlipFrom)
                where.dutySlipNumber.gte = query.dutySlipFrom;
            if (query.dutySlipTo)
                where.dutySlipNumber.lte = query.dutySlipTo;
        }
        if (query.vehicleOwnership === 'O') {
            where.vehicle = {
                NOT: {
                    vehicleType: { contains: 'hired', mode: 'insensitive' },
                },
            };
        }
        else if (query.vehicleOwnership === 'H') {
            where.vehicle = {
                vehicleType: { contains: 'hired', mode: 'insensitive' },
            };
        }
        if (query.billingStatus === 'BI') {
            where.trip = {
                invoiceItems: {
                    some: {},
                },
            };
        }
        else if (query.billingStatus === 'UB') {
            where.OR = [
                { trip: null },
                {
                    trip: {
                        invoiceItems: {
                            none: {},
                        },
                    },
                },
            ];
        }
        if (query.customerId ||
            query.guestName ||
            query.employeeId ||
            query.dutyType ||
            query.state ||
            query.city) {
            where.booking = where.booking || {};
            if (query.customerId) {
                where.booking.customerId = query.customerId;
            }
            if (query.guestName) {
                where.booking.guestName = { contains: query.guestName, mode: 'insensitive' };
            }
            if (query.employeeId) {
                where.booking.employeeId = { contains: query.employeeId, mode: 'insensitive' };
            }
            if (query.dutyType) {
                where.booking.tripType = query.dutyType;
            }
            if (query.state || query.city) {
                const customerConditions = [];
                if (query.state) {
                    customerConditions.push({
                        billingAddress: { contains: query.state, mode: 'insensitive' },
                    });
                }
                if (query.city) {
                    customerConditions.push({
                        billingAddress: { contains: query.city, mode: 'insensitive' },
                    });
                }
                where.booking.customer = {
                    AND: customerConditions,
                };
            }
        }
        const slips = await this.prisma.dutySlip.findMany({
            where,
            orderBy: { reportingTime: 'asc' },
            include: {
                booking: {
                    include: {
                        customer: true,
                    },
                },
                driver: true,
                vehicle: true,
            },
        });
        return slips.map((slip, idx) => {
            const start = Number(slip.startKm) || 0;
            const end = Number(slip.endKm) || 0;
            const run = end > start ? end - start : 0;
            return {
                sn: idx + 1,
                id: slip.id,
                date: new Date(slip.reportingTime).toLocaleDateString('en-GB'),
                slipNo: slip.dutySlipNumber,
                clientName: slip.booking.customer.name,
                guestName: slip.booking.guestName || '.',
                driverName: slip.driver.name,
                vehicleNo: slip.vehicle.vehicleNumber,
                startKm: start,
                endKm: end > 0 ? end : '-',
                runKm: run > 0 ? run : '-',
                status: slip.status,
            };
        });
    }
    async generateDutySlipRegisterPdf(query) {
        const data = await this.getDutySlipRegisterData(query);
        let tenantId = '';
        if (data.length > 0) {
            const firstSlip = await this.prisma.dutySlip.findUnique({
                where: { id: data[0].id },
            });
            if (firstSlip)
                tenantId = firstSlip.tenantId;
        }
        const tenant = tenantId
            ? await this.prisma.tenant.findUnique({ where: { id: tenantId } })
            : await this.prisma.tenant.findFirst();
        const companyName = tenant?.name || 'TRAVEL DREAM';
        const companyAddress = tenant?.companyAddress || 'E57/A,HARI NAGAR EXTN-PART-II\nBADARPUR,NEW DELHI-110044 New Delhi Delhi\n110044';
        const companyPhone = tenant?.companyPhone || '9310632440 9560352484';
        const companyEmail = tenant?.companyEmail || 'traveldream1812@gmail.com';
        const logoBuffer = await (async () => {
            const logoUrl = tenant?.logoUrl;
            if (logoUrl && (logoUrl.startsWith('http://') || logoUrl.startsWith('https://'))) {
                try {
                    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(3000) });
                    if (res.ok)
                        return Buffer.from(await res.arrayBuffer());
                }
                catch (e) {
                    console.warn('Failed to fetch report tenant logo:', e.message);
                }
            }
            return null;
        })();
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 30, size: 'A4', layout: 'landscape' });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));
            let pageNum = 1;
            const drawHeader = (pNum) => {
                if (logoBuffer) {
                    try {
                        doc.image(logoBuffer, 30, 20, { width: 90, height: 42, fit: [90, 42] });
                    }
                    catch (e) {
                        console.warn('Failed to draw logo on report:', e);
                    }
                }
                doc.fillColor('#000000')
                    .font('Helvetica-Bold')
                    .fontSize(14)
                    .text(companyName.toUpperCase(), 150, 18, { align: 'center', width: 541 });
                doc.font('Helvetica')
                    .fontSize(8.5)
                    .text(companyAddress.replace(/\n/g, ', '), 150, 36, { align: 'center', width: 541 });
                doc.font('Helvetica-Bold')
                    .text('Contact No: ', 280, 50, { continued: true })
                    .font('Helvetica')
                    .text(companyPhone.replace(/\n/g, ', '), { continued: true })
                    .font('Helvetica-Bold')
                    .text('  Email: ', { continued: true })
                    .font('Helvetica')
                    .text(companyEmail);
                doc.font('Helvetica-Bold')
                    .fontSize(9.5)
                    .text(`Page No  ${pNum}`, 720, 18, { align: 'right', width: 95 });
                doc.font('Helvetica-Bold')
                    .fontSize(13)
                    .text('Duty Slip Operational Register', 550, 38, { align: 'right', width: 265, underline: true });
                doc.moveTo(30, 68).lineTo(815, 68).lineWidth(0.5).stroke('#000000');
                let filterStr = 'All Records';
                if (query.startDate || query.endDate) {
                    const startFmt = query.startDate ? new Date(query.startDate).toLocaleDateString('en-GB') : 'Start';
                    const endFmt = query.endDate ? new Date(query.endDate).toLocaleDateString('en-GB') : 'End';
                    filterStr = `Date range:-  ${startFmt} To  ${endFmt}`;
                }
                doc.font('Helvetica-Bold')
                    .fontSize(9.5)
                    .text(filterStr, 30, 75);
                doc.moveTo(30, 90).lineTo(815, 90).lineWidth(1).stroke('#000000');
            };
            const drawTableHeader = (startY) => {
                doc.rect(30, startY, 785, 20).fill('#F8FAFC').stroke('#000000');
                doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5);
                const cols = [
                    { label: 'S.N', x: 30, w: 25, align: 'center' },
                    { label: 'Duty Date', x: 55, w: 65, align: 'left' },
                    { label: 'Slip No', x: 120, w: 65, align: 'left' },
                    { label: 'Client Name', x: 185, w: 140, align: 'left' },
                    { label: 'Guest Name', x: 325, w: 100, align: 'left' },
                    { label: 'Driver', x: 425, w: 100, align: 'left' },
                    { label: 'Car / Vehicle No', x: 525, w: 70, align: 'left' },
                    { label: 'Start KM', x: 595, w: 50, align: 'right' },
                    { label: 'End KM', x: 645, w: 50, align: 'right' },
                    { label: 'Run KM', x: 695, w: 50, align: 'right' },
                    { label: 'Status', x: 745, w: 70, align: 'center' },
                ];
                cols.forEach((col) => {
                    doc.text(col.label, col.x + 3, startY + 6, {
                        width: col.w - 6,
                        align: col.align,
                    });
                    if (col.x > 30) {
                        doc.moveTo(col.x, startY).lineTo(col.x, startY + 20).stroke('#000000');
                    }
                });
            };
            drawHeader(pageNum);
            let currentY = 95;
            drawTableHeader(currentY);
            currentY += 20;
            data.forEach((row) => {
                doc.fontSize(8);
                const clientNameHeight = doc.heightOfString(row.clientName, { width: 140 - 6 });
                const guestNameHeight = doc.heightOfString(row.guestName, { width: 100 - 6 });
                const driverNameHeight = doc.heightOfString(row.driverName, { width: 100 - 6 });
                const rowHeight = Math.max(18, clientNameHeight, guestNameHeight, driverNameHeight) + 6;
                if (currentY + rowHeight > 520) {
                    doc.addPage();
                    pageNum++;
                    drawHeader(pageNum);
                    let tempY = 95;
                    drawTableHeader(tempY);
                    currentY = tempY + 20;
                }
                doc.fillColor('#000000').font('Helvetica').fontSize(8);
                doc.text(row.sn.toString(), 30 + 3, currentY + 4, { width: 25 - 6, align: 'center' });
                doc.text(row.date, 55 + 3, currentY + 4, { width: 65 - 6 });
                doc.text(row.slipNo, 120 + 3, currentY + 4, { width: 65 - 6 });
                doc.text(row.clientName, 185 + 3, currentY + 4, { width: 140 - 6 });
                doc.text(row.guestName, 325 + 3, currentY + 4, { width: 100 - 6 });
                doc.text(row.driverName, 425 + 3, currentY + 4, { width: 100 - 6 });
                doc.text(row.vehicleNo, 525 + 3, currentY + 4, { width: 70 - 6 });
                doc.text(row.startKm.toString(), 595 + 3, currentY + 4, { width: 50 - 6, align: 'right' });
                doc.text(row.endKm.toString(), 645 + 3, currentY + 4, { width: 50 - 6, align: 'right' });
                doc.text(row.runKm.toString(), 695 + 3, currentY + 4, { width: 50 - 6, align: 'right' });
                doc.text(row.status, 745 + 3, currentY + 4, { width: 70 - 6, align: 'center' });
                doc.rect(30, currentY, 785, rowHeight).stroke('#000000');
                const colsX = [55, 120, 185, 325, 425, 525, 595, 645, 695, 745];
                colsX.forEach((xCoord) => {
                    doc.moveTo(xCoord, currentY).lineTo(xCoord, currentY + rowHeight).stroke('#000000');
                });
                currentY += rowHeight;
            });
            doc.end();
        });
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map