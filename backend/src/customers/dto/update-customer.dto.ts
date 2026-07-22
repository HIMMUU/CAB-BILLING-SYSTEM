import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { CustomerType } from '@prisma/client';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsEnum(CustomerType, { message: 'Type must be CORPORATE or INDIVIDUAL' })
  @IsOptional()
  type?: CustomerType;

  @ValidateIf((o) => o.type === CustomerType.CORPORATE)
  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid Indian GSTIN format',
  })
  gstNumber?: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Phone number must be a valid 10-15 digit string',
  })
  phone?: string;

  @IsString()
  @IsOptional()
  billingAddress?: string;

  @IsOptional()
  creditLimit?: number;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  clientType?: string;

  @IsOptional()
  cgstRate?: number;

  @IsOptional()
  sgstRate?: number;

  @IsOptional()
  igstRate?: number;

  @IsOptional()
  isRcm?: boolean;

  @IsOptional()
  rateCards?: any[];
}
