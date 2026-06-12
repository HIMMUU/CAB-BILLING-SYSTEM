import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, GstType } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInvoiceDto) {
    // 1. Check if trip is already invoiced
    const existingItem = await this.prisma.invoiceItem.findFirst({
      where: { tripId: dto.tripId },
    });
    if (existingItem) {
      throw new ConflictException('This trip has already been invoiced');
    }

    // 2. Fetch the target closed trip
    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      include: {
        booking: { include: { customer: true } },
        dutySlip: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // 3. Extract charges from the Trip record
    const baseFare = Number(trip.baseFareCharged);
    const extraKm = Number(trip.extraKmCharged);
    const toll = Number(trip.toll);
    const parking = Number(trip.parking);
    const nightCharges = Number(trip.nightChargesCharged);
    
    // Aggregate miscellaneous charges
    const miscCharges =
      Number(trip.extraHoursCharged) +
      Number(trip.driverAllowance) +
      Number(trip.miscChargesCharged);

    const subtotal = baseFare + extraKm + toll + parking + nightCharges + miscCharges;

    // 4. Calculate Taxes based on GST Type
    const gstRate = dto.gstRate ?? 5; // default 5%
    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (dto.gstType === GstType.INTRASTATE) {
      cgstRate = gstRate / 2;
      cgstAmount = (subtotal * cgstRate) / 100;
      sgstRate = gstRate / 2;
      sgstAmount = (subtotal * sgstRate) / 100;
    } else {
      igstRate = gstRate;
      igstAmount = (subtotal * igstRate) / 100;
    }

    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const totalAmount = subtotal + totalTax;
    const dueAmount = totalAmount;

    // 5. Generate unique invoice number
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

    // 6. DB write in a transaction
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: trip.booking.customerId,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default 15 days due
          status: InvoiceStatus.UNPAID,
          baseFare,
          extraKmCharges: extraKm,
          toll,
          parking,
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
        } as any,
      });

      const description = `Duty Slip: ${trip.dutySlip.dutySlipNumber}, Route: ${trip.booking.pickupLocation} to ${trip.booking.dropLocation}`;
      await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          tripId: trip.id,
          description,
          amount: subtotal,
        } as any,
      });

      return invoice;
    });
  }

  async findUninvoicedTrips() {
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

  async findAll(query: { page?: number; limit?: number; search?: string; status?: InvoiceStatus }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
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
                  dutySlip: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            trip: {
              include: {
                dutySlip: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      const totalAmount = Number(invoice.totalAmount);
      const currentPaid = Number(invoice.paidAmount);
      const newPaid = dto.paidAmount !== undefined ? dto.paidAmount : currentPaid;
      const diff = newPaid - currentPaid;

      const data: any = {};
      if (dto.status !== undefined) {
        data.status = dto.status;
      }

      if (dto.paidAmount !== undefined) {
        data.paidAmount = newPaid;
        const dueAmount = Math.max(0, totalAmount - newPaid);
        data.dueAmount = dueAmount;

        if (dto.status === undefined) {
          if (dueAmount === 0) {
            data.status = InvoiceStatus.PAID;
          } else if (newPaid > 0) {
            data.status = InvoiceStatus.PARTIALLY_PAID;
          } else {
            data.status = InvoiceStatus.UNPAID;
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

      // Log the payment transaction if difference is positive
      if (diff > 0) {
        await tx.payment.create({
          data: {
            invoiceId: id,
            amount: diff,
            paymentDate: new Date(),
            paymentMode: 'BANK_TRANSFER',
            status: 'SUCCESS',
          } as any,
        });
      }

      return updated;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.invoice.delete({
      where: { id },
    });
  }

  async generatePdf(id: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            trip: {
              include: {
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
      throw new NotFoundException('Invoice not found');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header Banner - Sleek Dark Slate style
      doc.rect(0, 0, 595.28, 110).fill('#2563EB'); // Primary Blue header background
      const LOGO_PATH = path.resolve(__dirname, '..', 'assets', 'logo.png');
      doc.image(LOGO_PATH, 460, 20, { width: 80 });
      doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('CABBS BILLING SYSTEM', 50, 35);
      doc.fillColor('#94A3B8').fontSize(9).font('Helvetica').text('Corporate Transportation & Logistics Invoice', 50, 62);
      
      // Invoice tag in header
      doc.fillColor('#3B82F6').fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', 400, 35, { align: 'right', width: 145 });
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text(invoice.invoiceNumber, 400, 58, { align: 'right', width: 145 });

      // Reset fillColor
      doc.fillColor('#0F172A');

      // Row layout for Customer / Invoice Details
      // Bill To details
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748B').text('BILL TO:', 50, 150);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text(invoice.customer.name, 50, 165);
      
      if (invoice.customer.companyName) {
        doc.fontSize(10).font('Helvetica').fillColor('#475569').text(invoice.customer.companyName, 50, 180);
      }
      doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`Email: ${invoice.customer.email || 'N/A'}`, 50, 195);
      doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`Phone: ${invoice.customer.phone || 'N/A'}`, 50, 210);
      if (invoice.customer.gstNumber) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text(`GSTIN: ${invoice.customer.gstNumber}`, 50, 225);
      }

      // Invoice metadata (Right column)
      let metaY = 150;
      const drawMetaRow = (label: string, value: string) => {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748B').text(label, 320, metaY);
        doc.fontSize(9).font('Helvetica').fillColor('#0F172A').text(value, 420, metaY, { align: 'right', width: 125 });
        metaY += 18;
      };

      drawMetaRow('Invoice Date:', new Date(invoice.invoiceDate).toLocaleDateString('en-IN'));
      drawMetaRow('Due Date:', new Date(invoice.dueDate).toLocaleDateString('en-IN'));
      drawMetaRow('Payment Status:', invoice.status);
      drawMetaRow('GST Mode:', Number(invoice.cgstRate) > 0 ? 'Intrastate (CGST+SGST)' : 'Interstate (IGST)');

      // Table Header for items
      const tableY = 270;
      doc.rect(50, tableY, 495, 25).fill('#F8FAFC');
      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
      doc.text('DESCRIPTION', 60, tableY + 8);
      doc.text('AMOUNT', 480, tableY + 8, { align: 'right', width: 60 });

      // Table Row
      let rowY = tableY + 25;
      doc.rect(50, rowY, 495, 80).stroke('#E2E8F0');
      
      doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold');
      
      // Let's list details of the trip
      let itemDesc = '';
      if (invoice.items && invoice.items.length > 0) {
        const item = invoice.items[0];
        itemDesc = item.description;
        const trip = item.trip;
        if (trip) {
          const ds = trip.dutySlip;
          itemDesc += `\nVehicle: ${ds.vehicle.vehicleNumber} (${ds.vehicle.model})\nDriver: ${ds.driver.name}\nDistance: ${trip.totalKm} KM (Odometer: ${trip.startKm} - ${trip.endKm})`;
        }
      } else {
        itemDesc = 'Transportation Service Charges';
      }

      doc.text(itemDesc, 60, rowY + 12, { width: 380, lineGap: 3 });
      doc.font('Helvetica').text(`INR ${Number(invoice.subtotal).toFixed(2)}`, 450, rowY + 12, { align: 'right', width: 90 });

      // Calculations block (Right aligned)
      let calcY = rowY + 95;
      const drawCalcRow = (label: string, value: string, isBold = false) => {
        doc.fontSize(9).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fillColor(isBold ? '#0F172A' : '#475569').text(label, 320, calcY);
        doc.text(value, 440, calcY, { align: 'right', width: 105 });
        calcY += 18;
      };

      drawCalcRow('Subtotal:', `INR ${Number(invoice.subtotal).toFixed(2)}`);
      
      if (Number(invoice.cgstAmount) > 0) {
        drawCalcRow(`CGST (${Number(invoice.cgstRate)}%):`, `INR ${Number(invoice.cgstAmount).toFixed(2)}`);
        drawCalcRow(`SGST (${Number(invoice.sgstRate)}%):`, `INR ${Number(invoice.sgstAmount).toFixed(2)}`);
      } else if (Number(invoice.igstAmount) > 0) {
        drawCalcRow(`IGST (${Number(invoice.igstRate)}%):`, `INR ${Number(invoice.igstAmount).toFixed(2)}`);
      }

      drawCalcRow('Total Tax:', `INR ${Number(invoice.totalTax).toFixed(2)}`);
      
      // Thick line before grand total
      doc.moveTo(320, calcY).lineTo(545, calcY).stroke('#E2E8F0');
      calcY += 5;

      drawCalcRow('Grand Total:', `INR ${Number(invoice.totalAmount).toFixed(2)}`, true);
      drawCalcRow('Amount Paid:', `INR ${Number(invoice.paidAmount).toFixed(2)}`);
      
      doc.rect(320, calcY, 225, 22).fill('#EFF6FF');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1E40AF').text('Balance Due:', 330, calcY + 6);
      doc.text(`INR ${Number(invoice.dueAmount).toFixed(2)}`, 440, calcY + 6, { align: 'right', width: 95 });

      // Left-aligned Notes section
      let notesY = rowY + 95;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text('Terms & Conditions:', 50, notesY);
      doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('1. Payment is due within 15 days of invoice date.\n2. Please mention the invoice number in all your payments.\n3. Goods & Services Tax (GST) is charged as per applicable laws.', 50, notesY + 15, { width: 250, lineGap: 3 });

      // Footer
      doc.moveTo(50, 740).lineTo(545, 740).stroke('#E2E8F0');
      doc.fontSize(8).fillColor('#94A3B8').text('Thank you for your business! For any billing queries, contact accounts@cabbs.com.', 50, 755, { align: 'center' });

      doc.end();
    });
  }
}
