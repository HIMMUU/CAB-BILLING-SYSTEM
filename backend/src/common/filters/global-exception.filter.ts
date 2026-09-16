import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        error = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        error = resObj.error || exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma database errors
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          error = 'Conflict';
          const target = (exception.meta?.target as string[]) || [];
          const targetStr = Array.isArray(target) ? target.join(', ') : String(target);
          if (targetStr.includes('mobile')) {
            message = 'A driver or customer with this phone number already exists.';
          } else if (targetStr.includes('license_number') || targetStr.includes('licenseNumber')) {
            message = 'A driver with this license number already exists.';
          } else if (targetStr.includes('vehicle_number') || targetStr.includes('vehicleNumber')) {
            message = 'A vehicle with this registration number already exists.';
          } else if (targetStr.includes('invoice_number') || targetStr.includes('invoiceNumber')) {
            message = 'An invoice with this invoice number already exists.';
          } else if (targetStr.includes('duty_slip_number') || targetStr.includes('dutySlipNumber')) {
            message = 'A duty slip with this duty slip number already exists.';
          } else if (targetStr.includes('booking_number') || targetStr.includes('bookingNumber')) {
            message = 'A booking with this booking number already exists.';
          } else if (targetStr.includes('email')) {
            message = 'A user with this email address already exists.';
          } else {
            message = `Unique constraint failed on field(s): ${targetStr || 'unique field'}.`;
          }
          break;
        }

        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message =
            (exception.meta?.cause as string) ||
            'The requested record was not found or has already been removed.';
          break;
        }

        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          const field = (exception.meta?.field_name as string) || 'referenced entity';
          message = `Foreign key constraint failed on ${field}. Associated record does not exist.`;
          break;
        }

        case 'P2014': {
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'The requested change violates a required relation constraint.';
          break;
        }

        case 'P2000': {
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'The provided value is too long for the database column.';
          break;
        }

        case 'P2001': {
          status = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message = 'Record searched for does not exist.';
          break;
        }

        default: {
          status = HttpStatus.BAD_REQUEST;
          error = 'Database Request Error';
          message = `Database operation error (${exception.code}): ${exception.message.split('\n').pop() || 'Request failed'}`;
          break;
        }
      }

      this.logger.warn(
        `[Prisma ${exception.code}] ${request.method} ${request.url} - ${Array.isArray(message) ? message.join('; ') : message}`,
      );
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Bad Request';
      const lines = exception.message.split('\n');
      const conciseMsg = lines[lines.length - 1] || 'Database validation error.';
      message = conciseMsg.replace(/Argument `\w+`: /g, '').trim() || 'Invalid data submitted.';
      this.logger.warn(`[PrismaValidationError] ${request.method} ${request.url} - ${message}`);
    } else if (exception instanceof Error) {
      this.logger.error(
        `[Unhandled Error] ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      message = exception.message || 'An unexpected error occurred.';
    }

    const payload = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error,
    };

    response.status(status).json(payload);
  }
}
