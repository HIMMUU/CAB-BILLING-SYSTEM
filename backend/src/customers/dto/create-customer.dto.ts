import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { CustomerType } from '@prisma/client';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsEnum(CustomerType, { message: 'Type must be CORPORATE or INDIVIDUAL' })
  type: CustomerType;

  @ValidateIf((o) => o.type === CustomerType.CORPORATE)
  @IsNotEmpty({ message: 'GST number is required for corporate customers' })
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid Indian GSTIN format',
  })
  gstNumber?: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Phone number must be a valid 10-15 digit string' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Billing address is required' })
  billingAddress: string;

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
  rateCards?: any[];
}
