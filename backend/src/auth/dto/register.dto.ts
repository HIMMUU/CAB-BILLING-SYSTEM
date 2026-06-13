import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Company name is required' })
  companyName: string;

  @IsEmail({}, { message: 'Please provide a valid company email' })
  @IsNotEmpty({ message: 'Company email is required' })
  companyEmail: string;

  @IsNotEmpty({ message: 'Company phone is required' })
  companyPhone: string;

  @IsOptional()
  companyAddress?: string;

  @IsOptional()
  companyGst?: string;

  @IsOptional()
  subscriptionPlan?: string;

  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsEmail({}, { message: 'Please provide a valid user email' })
  @IsNotEmpty({ message: 'User email is required' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
