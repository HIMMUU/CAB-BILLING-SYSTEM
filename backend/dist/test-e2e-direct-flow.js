"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function runE2ETest() {
    const API_URL = 'http://localhost:4000/api/v1';
    console.log('Logging in as admin@acme.cabbs.local...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@acme.cabbs.local',
            password: 'Password@123'
        })
    });
    if (!loginRes.ok) {
        throw new Error(`Login failed: ${await loginRes.text()}`);
    }
    const { accessToken } = await loginRes.json();
    console.log('Login successful! Token acquired.');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };
    console.log('\nFetching customer list...');
    const customerRes = await fetch(`${API_URL}/customers`, { headers });
    const customers = await customerRes.json();
    const customer = customers.data.find((c) => c.name === 'Acme Corp');
    if (!customer)
        throw new Error('Customer Acme Corp not found');
    console.log(`Using Customer: ${customer.name} (${customer.id})`);
    console.log('\nFetching driver list...');
    const driverRes = await fetch(`${API_URL}/drivers`, { headers });
    const drivers = await driverRes.json();
    const driver = drivers.data.find((d) => d.status === 'AVAILABLE') || drivers.data[0];
    if (!driver)
        throw new Error('No drivers found');
    console.log(`Using Driver: ${driver.name} (${driver.id})`);
    console.log('\nFetching vehicle list...');
    const vehicleRes = await fetch(`${API_URL}/vehicles`, { headers });
    const vehicles = await vehicleRes.json();
    const vehicle = vehicles.data.find((v) => v.status === 'AVAILABLE') || vehicles.data[0];
    if (!vehicle)
        throw new Error('No vehicles found');
    console.log(`Using Vehicle: ${vehicle.vehicleNumber} (${vehicle.id})`);
    console.log('\nCreating duty slip without booking...');
    const createDsRes = await fetch(`${API_URL}/duty-slips`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            reportingTime: new Date().toISOString(),
            startKm: 15000,
            customerId: customer.id,
            driverId: driver.id,
            vehicleId: vehicle.id,
            pickupLocation: 'Airport T3, Delhi',
            dropLocation: 'Acme Office, Sector 62 Noida',
            tripType: 'LOCAL',
            guestName: 'Jane Doe',
            employeeId: 'EMP-992'
        })
    });
    if (!createDsRes.ok) {
        throw new Error(`Creating duty slip failed: ${await createDsRes.text()}`);
    }
    const dutySlip = await createDsRes.json();
    console.log(`Duty slip created successfully: ${dutySlip.dutySlipNumber} (${dutySlip.id})`);
    console.log('\nUpdating duty slip metrics...');
    const patchDsRes = await fetch(`${API_URL}/duty-slips/${dutySlip.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
            startKm: 15000,
            endKm: 15080,
            startDateTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            endDateTime: new Date().toISOString(),
            toll: 150,
            parking: 80,
            stateTax: 0,
            mcd: 0,
            driverAllowance: 250,
            nightCharges: 0,
            extraCharges: 0,
            status: 'FILLED'
        })
    });
    if (!patchDsRes.ok) {
        throw new Error(`Updating duty slip failed: ${await patchDsRes.text()}`);
    }
    const patchedDutySlip = await patchDsRes.json();
    console.log(`Duty slip status is now: ${patchedDutySlip.status}`);
    console.log('\nClosing duty slip (creating trip)...');
    const closeTripRes = await fetch(`${API_URL}/trips`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            dutySlipId: dutySlip.id,
            endKm: 15080,
            startDateTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            endDateTime: new Date().toISOString(),
            toll: 150,
            parking: 80,
            driverAllowance: 250,
            nightCharges: 0,
            extraCharges: 0,
            baseFareCharged: 1200,
            extraKmCharged: 0,
            extraHoursCharged: 0,
            totalAmount: 1680
        })
    });
    if (!closeTripRes.ok) {
        throw new Error(`Closing trip failed: ${await closeTripRes.text()}`);
    }
    const trip = await closeTripRes.json();
    console.log(`Trip created successfully: ${trip.id}`);
    console.log('\nGenerating invoice for the created trip...');
    const createInvRes = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            tripIds: [trip.id],
            gstType: 'INTRASTATE',
            gstRate: 5
        })
    });
    if (!createInvRes.ok) {
        throw new Error(`Generating invoice failed: ${await createInvRes.text()}`);
    }
    const invoice = await createInvRes.json();
    console.log(`Invoice created successfully: ${invoice.invoiceNumber} (${invoice.id}), status: ${invoice.status}`);
    console.log('\n--- ALL E2E FLOW STEPS PASSED SUCCESSFULLY ---');
}
runE2ETest().catch(err => {
    console.error('\nE2E Test failed:', err);
});
//# sourceMappingURL=test-e2e-direct-flow.js.map