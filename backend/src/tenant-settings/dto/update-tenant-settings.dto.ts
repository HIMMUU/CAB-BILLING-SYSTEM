import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateTenantSettingsDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  digitalSignatureUrl?: string;

  @IsString()
  @IsOptional()
  companyAddress?: string;

  @IsString()
  @IsOptional()
  companyPhone?: string;

  @IsEmail({}, { message: 'Invalid company email address' })
  @IsOptional()
  companyEmail?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid GSTIN format (e.g. 07AAAAA1111A1Z1)',
  })
  companyGst?: string;

  @IsString()
  @IsOptional()
  @Length(10, 10, { message: 'PAN must be exactly 10 characters long' })
  companyPan?: string;

  @IsString()
  @IsOptional()
  sacNo?: string;

  @IsString()
  @IsOptional()
  serviceCategory?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankBranch?: string;

  @IsString()
  @IsOptional()
  bankAccountNo?: string;

  @IsString()
  @IsOptional()
  bankIfsc?: string;

  @IsString()
  @IsOptional()
  bankAccountHolder?: string;

  @IsString()
  @IsOptional()
  invoiceTitle?: string;

  @IsString()
  @IsOptional()
  dutySlipTitle?: string;

  @IsOptional()
  hideLogoOnPdf?: boolean;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsString()
  @IsOptional()
  pdfTheme?: string;

  @IsString()
  @IsOptional()
  pdfColorPrimary?: string;

  @IsString()
  @IsOptional()
  pdfFontFamily?: string;

  @IsOptional()
  pdfShowBank?: boolean;

  @IsOptional()
  pdfShowTerms?: boolean;

  @IsString()
  @IsOptional()
  pdfHeaderLayout?: string;
}
