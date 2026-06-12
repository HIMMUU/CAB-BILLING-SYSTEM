-- PostgreSQL DDL for Cab Billing & Fleet Management SaaS MVP
-- Designed for Multi-Tenant Architecture (SaaS Operator / Tenant Cab Operators)

-- Enable UUID extension for secure and non-enumerable IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- ENUMS & TYPES
-- =========================================================================

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'OPERATOR_ADMIN', 'DISPATCHER', 'BILLING_EXECUTIVE');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE customer_type AS ENUM ('CORPORATE', 'INDIVIDUAL');
CREATE TYPE driver_status AS ENUM ('AVAILABLE', 'ON_TRIP', 'INACTIVE');
CREATE TYPE vehicle_status AS ENUM ('AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'INACTIVE');
CREATE TYPE trip_type_enum AS ENUM ('LOCAL', 'AIRPORT_TRANSFER', 'OUTSTATION', 'HOURLY_RENTAL');
CREATE TYPE booking_status AS ENUM ('PENDING', 'ASSIGNED', 'STARTED', 'COMPLETED', 'CANCELLED');
CREATE TYPE assignment_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE duty_slip_status AS ENUM ('DRAFT', 'FILLED', 'CLOSED');
CREATE TYPE invoice_status AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'VOID');
CREATE TYPE payment_mode_enum AS ENUM ('BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- =========================================================================
-- TABLES
-- =========================================================================

-- 1. Tenants Table (SaaS Companies / Cab Operators)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    logo_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Users Table (Admin & Staff)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    status user_status DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_tenant_email UNIQUE(tenant_id, email)
);

-- 3. Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    type customer_type DEFAULT 'INDIVIDUAL' NOT NULL,
    gst_number VARCHAR(15),
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    billing_address TEXT NOT NULL,
    credit_limit DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    payment_terms VARCHAR(100), -- e.g., "Net 30", "Immediate"
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_tenant_customer_phone UNIQUE(tenant_id, phone)
);

-- 4. Customer Rate Cards
CREATE TABLE rate_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE, -- Null means default tenant rate card for a vehicle type
    vehicle_type VARCHAR(100) NOT NULL, -- e.g., "Sedan", "SUV", "Hatchback"
    trip_type trip_type_enum NOT NULL,
    base_fare DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    base_km DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    base_hours DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    extra_km_rate DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    extra_hour_rate DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    driver_allowance_per_day DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    night_charges DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_tenant_customer_rate UNIQUE(tenant_id, customer_id, vehicle_type, trip_type)
);

-- 5. Drivers Table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    license_expiry DATE NOT NULL,
    address TEXT NOT NULL,
    emergency_contact VARCHAR(255) NOT NULL,
    status driver_status DEFAULT 'AVAILABLE' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_tenant_driver_mobile UNIQUE(tenant_id, mobile),
    CONSTRAINT unique_tenant_license UNIQUE(tenant_id, license_number)
);

-- 6. Driver Documents Table
CREATE TABLE driver_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- e.g., "Aadhaar Card", "PAN Card", "Police Verification"
    document_number VARCHAR(100) NOT NULL,
    expiry_date DATE,
    s3_url VARCHAR(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Vehicles Table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(50) NOT NULL, -- e.g., "DL1CA1234"
    vehicle_type VARCHAR(100) NOT NULL, -- e.g., "Sedan", "SUV"
    model VARCHAR(255) NOT NULL,
    seating_capacity INT NOT NULL,
    registration_date DATE NOT NULL,
    insurance_expiry DATE NOT NULL,
    fitness_expiry DATE NOT NULL,
    permit_expiry DATE NOT NULL,
    status vehicle_status DEFAULT 'AVAILABLE' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_tenant_vehicle_number UNIQUE(tenant_id, vehicle_number)
);

-- 8. Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_number VARCHAR(100) NOT NULL, -- Format e.g. BK-2026-0001
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    pickup_location TEXT NOT NULL,
    drop_location TEXT NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    trip_type trip_type_enum NOT NULL,
    vehicle_type_required VARCHAR(100) NOT NULL, -- Type requested (e.g. Sedan)
    status booking_status DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_tenant_booking_number UNIQUE(tenant_id, booking_number)
);

-- 9. Assignments Table
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status assignment_status DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_active_booking_assignment UNIQUE(booking_id, status) -- Max 1 active assignment per booking
);

-- 10. Duty Slips Table
CREATE TABLE duty_slips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    duty_slip_number VARCHAR(100) NOT NULL, -- Format e.g. DS-2026-0001
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    reporting_time TIMESTAMP WITH TIME ZONE NOT NULL,
    start_km DECIMAL(10, 2) NOT NULL,
    end_km DECIMAL(10, 2),
    total_km DECIMAL(10, 2) GENERATED ALWAYS AS (end_km - start_km) STORED,
    toll DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    parking DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    night_charges DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    driver_allowance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    extra_charges DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    status duty_slip_status DEFAULT 'DRAFT' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_tenant_duty_slip_number UNIQUE(tenant_id, duty_slip_number),
    CONSTRAINT unique_booking_duty_slip UNIQUE(booking_id) -- One duty slip per booking
);

-- 11. Trips Table (Trip Closure Details)
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    duty_slip_id UUID NOT NULL REFERENCES duty_slips(id) ON DELETE RESTRICT,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    start_km DECIMAL(10, 2) NOT NULL,
    end_km DECIMAL(10, 2) NOT NULL,
    total_km DECIMAL(10, 2) NOT NULL,
    toll DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    parking DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    driver_allowance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    extra_charges DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    base_fare_charged DECIMAL(10, 2) NOT NULL,
    extra_km_charged DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    extra_hours_charged DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    night_charges_charged DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    misc_charges_charged DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL, -- Final calculated billable amount before taxes
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_duty_slip_trip UNIQUE(duty_slip_id),
    CONSTRAINT unique_booking_trip UNIQUE(booking_id)
);

-- 12. Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL, -- Format e.g. INV-2026-0001
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status DEFAULT 'DRAFT' NOT NULL,
    base_fare DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    extra_km_charges DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    toll DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    parking DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    night_charges DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    misc_charges DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL, -- Total before taxes
    cgst_rate DECIMAL(5, 2) DEFAULT 0.00 NOT NULL, -- e.g. 2.50 for 2.5%
    cgst_amount DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    sgst_rate DECIMAL(5, 2) DEFAULT 0.00 NOT NULL,
    sgst_amount DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    igst_rate DECIMAL(5, 2) DEFAULT 0.00 NOT NULL,
    igst_amount DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_tax DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL, -- Final Invoice Amount including tax
    paid_amount DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    due_amount DECIMAL(12, 2) NOT NULL, -- remaining due
    s3_url VARCHAR(512), -- Frozen PDF Invoice
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_tenant_invoice_number UNIQUE(tenant_id, invoice_number)
);

-- 13. Invoice Items (Allows consolidated invoicing for multiple trips/duty slips)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 14. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_mode payment_mode_enum NOT NULL,
    transaction_reference VARCHAR(255), -- UTR, Cheque number, etc.
    status payment_status DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 15. Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL, -- e.g., "BOOKING_CREATE", "TRIP_CLOSE"
    entity_name VARCHAR(100) NOT NULL, -- e.g., "bookings", "duty_slips"
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =========================================================================

-- Tenant filtering indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_assignments_tenant ON assignments(tenant_id);
CREATE INDEX idx_duty_slips_tenant ON duty_slips(tenant_id);
CREATE INDEX idx_trips_tenant ON trips(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);

-- Operational lookup indexes
CREATE INDEX idx_bookings_pickup_date ON bookings(pickup_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_duty_slips_status ON duty_slips(status);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_name, entity_id);

-- Overlap check indexes for assignments
CREATE INDEX idx_assignments_vehicle_active ON assignments(vehicle_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_assignments_driver_active ON assignments(driver_id) WHERE status = 'ACTIVE';
