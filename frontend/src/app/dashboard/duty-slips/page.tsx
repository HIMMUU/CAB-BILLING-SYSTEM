'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import DatePicker from '@/components/DatePicker';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Customer {
  id: string;
  name: string;
  companyName: string | null;
  cgstRate?: number | string | null;
  sgstRate?: number | string | null;
  igstRate?: number | string | null;
  clientType?: string | null;
  billingAddress?: string | null;
  phone?: string | null;
}
interface Booking {
  id: string; bookingNumber: string; pickupLocation: string; dropLocation: string;
  pickupDate: string; pickupTime: string; vehicleTypeRequired: string;
  customer: Customer; employeeId?: string | null; customerId?: string;
  modeOfPayment?: string;
  modeOfReservation?: string;
  bookingBy?: string;
  guestSalutation?: string;
  guestName?: string;
  fileCode?: string;
  pickupType?: string;
  remarks?: string;
  tripType?: string;
}
interface Driver { id: string; name: string; mobile: string }
interface Vehicle { id: string; vehicleNumber: string; model: string; vehicleType: string }
interface DutySlip {
  id: string; dutySlipNumber: string; bookingId: string; driverId: string; vehicleId: string;
  reportingTime: string; startKm: number; endKm: number | null;
  toll: number; parking: number; nightCharges: number; driverAllowance: number; extraCharges: number;
  status: 'DRAFT' | 'FILLED' | 'CLOSED';
  startDateTime: string | null; endDateTime: string | null;
  stateTax: number; mcd: number; employeeId?: string | null;
  booking: Booking; driver: Driver; vehicle: Vehicle;
  pickupLocation?: string;
  dropLocation?: string;
  trip?: any;
}
interface CalcPreview {
  baseFareCharged: number; extraKmCharged: number; extraHoursCharged: number;
  toll: number; parking: number; driverAllowance: number; nightCharges: number;
  extraCharges: number; stateTax: number; mcd: number; totalDistance: number; totalAmount: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
const handleDateChange = (val: string): string => {
  const clean = val.replace(/\D/g, '').slice(0, 8);
  if (clean.length >= 5) {
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
  }
  if (clean.length >= 3) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }
  return clean;
};

const handleTimeChange = (val: string): string => {
  const clean = val.replace(/\D/g, '').slice(0, 4);
  if (clean.length >= 3) {
    return `${clean.slice(0, 2)}:${clean.slice(2)}`;
  }
  return clean;
};

const dateToApi = (d: string): string => {
  if (!d) return '';
  const parts = d.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return d;
};

const dateToDisplay = (d: string): string => {
  if (!d) return '';
  const clean = d.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return d;
};

const splitDT = (s: string | null | undefined) => {
  if (!s) return { date: '', time: '' };
  const d = new Date(s);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

const mergeDT = (date: string, time: string) => {
  if (!date) return null;
  const isoDate = date.includes('/') ? dateToApi(date) : date;
  const d = new Date(`${isoDate}T${time || '00:00'}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const fmt = (n: number | string | null | undefined) =>
  Number(n || 0).toFixed(2);
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('en-GB') : '–';
const fmtTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '–';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  FILLED: 'bg-blue-50 text-blue-700 border-blue-200',
  CLOSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/* ─── Field Component ────────────────────────────────────────────────── */
const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
    {children}
  </div>
);
const inp = "w-full border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition placeholder:text-slate-400";
const sel = inp + " cursor-pointer";

/* ══════════════════════════════════════════════════════════════════════ */
export default function DutySlipsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  /* data */
  const [dutySlips, setDutySlips] = useState<DutySlip[]>([]);
  const [assignedBookings, setAssignedBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedRateCard, setSelectedRateCard] = useState<any>(null);
  const [fullCustomer, setFullCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF Preview State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  /* filter / pagination */
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* From-Booking create drawer */
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({ bookingId: '', reportingDate: '', reportingTime: '', startKm: 0, employeeId: '' });

  /* Direct create & Edit unified full-screen form */
  const [isDirectOpen, setIsDirectOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState<DutySlip | null>(null);
  const [df, setDf] = useState({
    customerType: 'regular' as 'regular' | 'new',
    modeOfPayment: 'Credit', modeOfReservation: 'Email', clientType: 'COMPANY',
    customerId: '', state: '', city: '', address: '', phone: '',
    bookingBy: '', guestSalutation: 'Mr', guestName: '',
    reportingAt: '', fileCode: '', employeeId: '',
    reportingDate: '', reportingTime: '',
    pickupType: 'other' as 'airport' | 'railway' | 'hotel' | 'other',
    vehicleId: '', carGroup: '', carName: '', carFrom: '',
    driverId: '', pickupLocation: '', dropLocation: '', remarks: '',
    dutyStartDate: '', dutyStartTime: '', dutyStartMeter: 0,
    dutyEndDate: '', dutyEndTime: '', dutyEndMeter: 0,
    actualKm: 0, billedKm: 0, actualHours: 0, billedHours: 0,
    dayHours: 0, nightHours: 0,
    clientAdvance: 0, clientRemarks: '',
    serviceTax: 5, parking: 0, toll: 0, mcdToll: 0, stateTax: 0,
    driverAdvance: 0, driverAllowance: 0, driverRefund: 0, feedbackPoint: '', driverRemark: '',
    dutyType: 'L', tourCode: '', localBill: '', nightChargesOnTime: 0,
    billingMode: 'N' as 'N' | 'H' | 'F',
    extraCharges: 0,

    // overrides & rates
    baseFare: 0,
    extraKmRate: 0,
    extraHourRate: 0,
    extraKmCharged: 0,
    extraHoursCharged: 0,
    includeDriverAllowance: true,
    includeNightCharges: true,
    isManualBaseFare: false,
    isManualExtraKmRate: false,
    isManualExtraHourRate: false,
    isManualExtraKmCharged: false,
    isManualExtraHoursCharged: false,
    isManualDriverAllowance: false,
    isManualNightCharges: false,
  });

  /* Print */
  const [printSlip, setPrintSlip] = useState<DutySlip | null>(null);

  /* submitting */
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* Action menu */
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Helper to calculate night hours */
  const calculateNightHours = (start: Date, end: Date, nightStartStr = '22:00', nightEndStr = '06:00'): number => {
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return 0;
    let nightHours = 0;
    const [nsH, nsM] = nightStartStr.split(':').map(Number);
    const [neH, neM] = nightEndStr.split(':').map(Number);
    let current = new Date(start);
    const stepMs = 30 * 60 * 1000;
    while (current < end) {
      const next = new Date(current.getTime() + stepMs);
      const segmentEnd = next > end ? end : next;
      const segmentMs = segmentEnd.getTime() - current.getTime();
      const hour = current.getHours();
      let isNight = false;
      if (nsH > neH) {
        isNight = hour >= nsH || hour < neH;
      } else {
        isNight = hour >= nsH && hour < neH;
      }
      if (isNight) nightHours += segmentMs / (1000 * 60 * 60);
      current = segmentEnd;
    }
    return parseFloat(nightHours.toFixed(2));
  };

  /* ── auth ── */
  useEffect(() => {
    const token = api.getToken();
    const u = api.getUser();
    if (!token || !u) { router.push('/login'); return; }
    setUser(u);
    fetchDutySlips();
  }, []);

  useEffect(() => {
    if (user) fetchDutySlips();
  }, [page, filterStatus, search]);

  /* click outside menu */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActionMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Fetch Customer details on selection ── */
  useEffect(() => {
    if (!df.customerId) {
      setFullCustomer(null);
      return;
    }
    const fetchCust = async () => {
      try {
        const customer = await api.request(`/customers/${df.customerId}`);
        setFullCustomer(customer);
        const taxRate = Number(customer.cgstRate || 0) + Number(customer.sgstRate || 0) + Number(customer.igstRate || 0);
        setDf(f => ({
          ...f,
          address: customer.billingAddress || f.address,
          phone: customer.phone || f.phone,
          clientType: customer.clientType || f.clientType,
          serviceTax: taxRate || f.serviceTax,
        }));
      } catch (err) {
        console.error('Failed to fetch customer details:', err);
      }
    };
    fetchCust();
  }, [df.customerId]);

  /* ── Match active rate card ── */
  useEffect(() => {
    const matchRateCard = async () => {
      if (!df.customerId || !df.carGroup) {
        setSelectedRateCard(null);
        return;
      }
      // 1. Customer specific card
      if (fullCustomer && fullCustomer.rateCards) {
        const rc = fullCustomer.rateCards.find(
          (r: any) => r.vehicleCategory?.name?.toLowerCase() === df.carGroup.toLowerCase()
        );
        if (rc) {
          setSelectedRateCard(rc);
          setDf(f => ({
            ...f,
            driverAllowance: Number(rc.driverAllowance) || 0,
            nightChargesOnTime: df.dutyType === 'O' || df.dutyType === 'T'
              ? Number(rc.outstationNightCharge || rc.nightCharge) || 0
              : Number(rc.nightCharge) || 0,
          }));
          return;
        }
      }
      // 2. Default tenant card
      try {
        const cat = categories.find(c => c.name.toLowerCase() === df.carGroup.toLowerCase());
        if (cat) {
          let mappedClientType = 'Individual';
          if (fullCustomer) {
            if (fullCustomer.type === 'CORPORATE') {
              const lowerName = (fullCustomer.companyName || '').toLowerCase();
              if (lowerName.includes('travel') || lowerName.includes('holiday') || lowerName.includes('resort') || lowerName.includes('tour')) {
                mappedClientType = 'Travel Company';
              } else {
                mappedClientType = 'Company';
              }
            }
          }
          const res = await api.request(
            `/rate-management/rate-cards?customerId=ALL&vehicleCategoryId=${cat.id}&clientType=${mappedClientType}`
          );
          const rc = res.data?.find((r: any) => !r.customerId && r.status === 'ACTIVE');
          if (rc) {
            setSelectedRateCard(rc);
            setDf(f => ({
              ...f,
              driverAllowance: Number(rc.driverAllowance) || 0,
              nightChargesOnTime: df.dutyType === 'O' || df.dutyType === 'T'
                ? Number(rc.outstationNightCharge || rc.nightCharge) || 0
                : Number(rc.nightCharge) || 0,
            }));
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch default rate card:', err);
      }
      setSelectedRateCard(null);
    };
    matchRateCard();
  }, [fullCustomer, df.carGroup, df.dutyType]);

  /* ── Reactive KM and Hour metrics calculator ── */
  useEffect(() => {
    let actKm = 0;
    if (df.dutyEndMeter > 0 && df.dutyStartMeter > 0) {
      actKm = Math.max(0, df.dutyEndMeter - df.dutyStartMeter);
    }
    let bilKm = actKm;

    let actHrs = 0;
    let nightHrs = 0;
    let dayHrs = 0;
    let bilHrs = 0;
    let calcDays = 1;

    if (df.dutyStartDate && df.dutyStartTime && df.dutyEndDate && df.dutyEndTime) {
      const isoStartDate = df.dutyStartDate.includes('/') ? dateToApi(df.dutyStartDate) : df.dutyStartDate;
      const isoEndDate = df.dutyEndDate.includes('/') ? dateToApi(df.dutyEndDate) : df.dutyEndDate;
      const start = new Date(`${isoStartDate}T${df.dutyStartTime}`);
      const end = new Date(`${isoEndDate}T${df.dutyEndTime}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        actHrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        bilHrs = actHrs;

        const startD = new Date(isoStartDate);
        const endD = new Date(isoEndDate);
        const diffDaysMs = endD.getTime() - startD.getTime();
        calcDays = Math.max(1, Math.round(diffDaysMs / (1000 * 60 * 60 * 24)) + 1);

        nightHrs = calculateNightHours(
          start,
          end,
          selectedRateCard?.nightStartTime || '22:00',
          selectedRateCard?.nightEndTime || '06:00'
        );
        dayHrs = Math.max(0, actHrs - nightHrs);
      }
    }

    let calculatedBaseFare = 0;
    let calculatedExtraKmRate = 12;
    let calculatedExtraHourRate = 100;
    let calculatedDriverAllowance = 0;
    let calculatedNightCharges = 0;
    let baseKm = 80;
    let baseHours = 8;

    if (df.dutyType === 'O' || df.dutyType === 'T') {
      const minKm = selectedRateCard ? (Number(selectedRateCard.minKmPerDay) || 250) : 250;
      const ratePerKm = selectedRateCard ? (Number(selectedRateCard.outstationRatePerKm) || 12) : 12;
      baseKm = calcDays * minKm;
      calculatedBaseFare = baseKm * ratePerKm;
      calculatedExtraKmRate = ratePerKm;
      calculatedExtraHourRate = selectedRateCard ? (Number(selectedRateCard.extraHourRate) || 100) : 100;
      calculatedDriverAllowance = calcDays * (selectedRateCard ? (Number(selectedRateCard.driverAllowance) || 250) : 250);
      calculatedNightCharges = nightHrs > 0
        ? calcDays * (selectedRateCard ? (Number(selectedRateCard.outstationNightCharge || selectedRateCard.nightCharge) || 200) : 200)
        : 0;
      baseHours = 24 * calcDays;
      bilKm = Math.max(actKm, baseKm);
      bilHrs = actHrs;
    } else {
      // Local
      const thresholdHr = selectedRateCard ? (Number(selectedRateCard.minHr) || 4) : 4;
      const thresholdKm = selectedRateCard ? (Number(selectedRateCard.minKm) || 40) : 40;
      const fullHr = selectedRateCard ? (Number(selectedRateCard.fullHr) || 8) : 8;
      const fullKm = selectedRateCard ? (Number(selectedRateCard.fullKm) || 80) : 80;

      let isHalfDay = false;
      if (df.billingMode === 'H') {
        isHalfDay = true;
      } else if (df.billingMode === 'F') {
        isHalfDay = false;
      } else if (df.pickupType === 'airport') {
        isHalfDay = true;
      } else if (actHrs <= thresholdHr && actKm <= thresholdKm) {
        isHalfDay = true;
      }

      if (isHalfDay) {
        calculatedBaseFare = selectedRateCard ? (Number(selectedRateCard.halfDayRate) || 1000) : 1000;
        baseKm = thresholdKm;
        baseHours = thresholdHr;
        bilKm = Math.max(actKm, thresholdKm);
        bilHrs = Math.max(actHrs, thresholdHr);
      } else {
        calculatedBaseFare = selectedRateCard ? (Number(selectedRateCard.fullDayRate) || 1800) : 1800;
        baseKm = fullKm;
        baseHours = fullHr;
        bilKm = Math.max(actKm, baseKm);
        bilHrs = Math.max(actHrs, baseHours);
      }

      calculatedExtraKmRate = selectedRateCard ? (Number(selectedRateCard.extraKmRate) || 12) : 12;
      calculatedExtraHourRate = selectedRateCard ? (Number(selectedRateCard.extraHourRate) || 100) : 100;
      calculatedDriverAllowance = 0; // DA ONLY IN OUTSTATION
      calculatedNightCharges = nightHrs > 0
        ? (selectedRateCard ? (Number(selectedRateCard.nightCharge) || 200) : 200)
        : 0;
    }

    setDf(f => {
      const baseFareVal = f.isManualBaseFare ? f.baseFare : calculatedBaseFare;
      const extraKmRateVal = f.isManualExtraKmRate ? f.extraKmRate : calculatedExtraKmRate;
      const extraHourRateVal = f.isManualExtraHourRate ? f.extraHourRate : calculatedExtraHourRate;

      const driverAllowanceVal = f.includeDriverAllowance
        ? (f.isManualDriverAllowance ? f.driverAllowance : calculatedDriverAllowance)
        : 0;
      const nightChargesVal = f.includeNightCharges
        ? (f.isManualNightCharges ? f.nightChargesOnTime : calculatedNightCharges)
        : 0;

      const extraKmChargedVal = f.isManualExtraKmCharged
        ? f.extraKmCharged
        : (Math.max(0, bilKm - baseKm) * extraKmRateVal);
      const extraHoursChargedVal = f.isManualExtraHoursCharged
        ? f.extraHoursCharged
        : (Math.max(0, actHrs - baseHours) * extraHourRateVal);

      return {
        ...f,
        actualKm: parseFloat(actKm.toFixed(2)),
        billedKm: parseFloat(bilKm.toFixed(2)),
        actualHours: parseFloat(actHrs.toFixed(2)),
        billedHours: parseFloat(bilHrs.toFixed(2)),
        dayHours: parseFloat(dayHrs.toFixed(2)),
        nightHours: parseFloat(nightHrs.toFixed(2)),
        baseFare: baseFareVal,
        extraKmRate: extraKmRateVal,
        extraHourRate: extraHourRateVal,
        extraKmCharged: parseFloat(extraKmChargedVal.toFixed(2)),
        extraHoursCharged: parseFloat(extraHoursChargedVal.toFixed(2)),
        driverAllowance: driverAllowanceVal,
        nightChargesOnTime: nightChargesVal,
      };
    });
  }, [
    df.dutyStartDate,
    df.dutyStartTime,
    df.dutyEndDate,
    df.dutyEndTime,
    df.dutyStartMeter,
    df.dutyEndMeter,
    df.dutyType,
    df.pickupType,
    df.billingMode,
    selectedRateCard,
  ]);

  /* ── Live billing preview calculations ── */
  const liveBillingPreview = React.useMemo(() => {
    if (!df.customerId) return null;

    const baseFare = Number(df.baseFare || 0);
    const extraKmCharged = Number(df.extraKmCharged || 0);
    const extraHoursCharged = Number(df.extraHoursCharged || 0);
    const toll = Number(df.toll || 0);
    const parking = Number(df.parking || 0);
    const stateTax = Number(df.stateTax || 0);
    const mcd = Number(df.mcdToll || 0);
    const driverAllowance = Number(df.driverAllowance || 0);
    const nightCharges = Number(df.nightChargesOnTime || 0);
    const extraCharges = Number(df.extraCharges || 0);

    const subtotal = baseFare + extraKmCharged + extraHoursCharged + toll + parking + stateTax + mcd + driverAllowance + nightCharges + extraCharges;
    const gstRate = 0;
    const taxAmount = 0;
    const totalAmount = subtotal;

    // Resolve included values for reference
    let includedKm = 80;
    let includedHours = 8;
    let packageType = 'Local (8h / 80k)';

    let calcDays = 1;
    if (df.dutyStartDate && df.dutyEndDate) {
      const isoStartDate = df.dutyStartDate.includes('/') ? dateToApi(df.dutyStartDate) : df.dutyStartDate;
      const isoEndDate = df.dutyEndDate.includes('/') ? dateToApi(df.dutyEndDate) : df.dutyEndDate;
      const startD = new Date(isoStartDate);
      const endD = new Date(isoEndDate);
      const diffDaysMs = endD.getTime() - startD.getTime();
      calcDays = Math.max(1, Math.round(diffDaysMs / (1000 * 60 * 60 * 24)) + 1);
    }

    if (df.dutyType === 'O' || df.dutyType === 'T') {
      const minKm = selectedRateCard ? (Number(selectedRateCard.minKmPerDay) || 250) : 250;
      includedKm = calcDays * minKm;
      includedHours = calcDays * 24;
      packageType = `Outstation (${calcDays} Days)`;
    } else {
      const thresholdHr = selectedRateCard ? (Number(selectedRateCard.minHr) || 4) : 4;
      const thresholdKm = selectedRateCard ? (Number(selectedRateCard.minKm) || 40) : 40;
      const fullHr = selectedRateCard ? (Number(selectedRateCard.fullHr) || 8) : 8;
      const fullKm = selectedRateCard ? (Number(selectedRateCard.fullKm) || 80) : 80;

      let isHalfDay = false;
      if (df.billingMode === 'H') {
        isHalfDay = true;
      } else if (df.billingMode === 'F') {
        isHalfDay = false;
      } else if (df.pickupType === 'airport') {
        isHalfDay = true;
      } else if (df.actualHours <= thresholdHr && df.actualKm <= thresholdKm) {
        isHalfDay = true;
      }

      if (isHalfDay) {
        includedKm = thresholdKm;
        includedHours = thresholdHr;
        packageType = `Local (Half-Day: ${thresholdHr}h / ${thresholdKm}k)`;
      } else {
        includedKm = fullKm;
        includedHours = fullHr;
        packageType = `Local (Full-Day: ${fullHr}h / ${includedKm}k)`;
      }
    }

    return {
      baseFare,
      extraKmCharged,
      extraHoursCharged,
      toll,
      parking,
      stateTax,
      mcd,
      driverAllowance,
      nightCharges,
      extraCharges,
      subtotal,
      taxAmount,
      totalAmount,
      includedKm,
      includedHours,
      packageType,
    };
  }, [df, selectedRateCard]);

  /* ── fetchers ── */
  const fetchDutySlips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      const res = await api.request(`/duty-slips?${params}`);
      setDutySlips(res.data || []);
      setTotalPages(res.meta?.lastPage || 1);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadAssets = async () => {
    setLoadingBookings(true);
    try {
      const [bRes, cRes, dRes, vRes, catRes] = await Promise.all([
        api.request('/bookings?status=ASSIGNED&limit=100'),
        api.request('/customers?limit=200'),
        api.request('/drivers?limit=200'),
        api.request('/vehicles?limit=200'),
        api.request('/rate-management/categories'),
      ]);
      setAssignedBookings((bRes.data || []).filter((b: any) => !b.dutySlip));
      setCustomers(cRes.data || cRes || []);
      setDrivers(dRes.data || dRes || []);
      setVehicles(vRes.data || vRes || []);
      setCategories(catRes || []);
    } catch (e) { console.error(e); }
    finally { setLoadingBookings(false); }
  };

  /* ── handlers ── */
  const handleBookingCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!bookingForm.bookingId || !bookingForm.reportingDate || !bookingForm.reportingTime) {
      setFormError('Booking, reporting date and reporting time are required.');
      return;
    }

    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(bookingForm.reportingDate)) {
      setFormError('Reporting Date must be in DD/MM/YYYY format.');
      return;
    }
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(bookingForm.reportingTime)) {
      setFormError('Reporting Time must be in 24 Hrs HH:mm format.');
      return;
    }

    setSubmitting(true);
    try {
      await api.request('/duty-slips', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: bookingForm.bookingId,
          reportingTime: mergeDT(bookingForm.reportingDate, bookingForm.reportingTime),
          startKm: Number(bookingForm.startKm),
          employeeId: bookingForm.employeeId || undefined,
        }),
      });
      setIsBookingDrawerOpen(false);
      fetchDutySlips();
      loadAssets();
    } catch (e: any) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleUnifiedSave = async (e: React.FormEvent, closeStatus?: boolean) => {
    e.preventDefault();
    setFormError(null);
    if (!df.customerId) { setFormError('Select a customer.'); return; }
    if (!df.driverId) { setFormError('Select a driver.'); return; }
    if (!df.vehicleId) { setFormError('Select a vehicle.'); return; }

    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;

    if (df.reportingDate && !dateRegex.test(df.reportingDate)) {
      setFormError('Reporting Date must be in DD/MM/YYYY format.');
      return;
    }
    if (df.reportingTime && !timeRegex.test(df.reportingTime)) {
      setFormError('Reporting Time must be in 24 Hrs HH:mm format.');
      return;
    }

    if (df.dutyStartDate && !dateRegex.test(df.dutyStartDate)) {
      setFormError('Start Date must be in DD/MM/YYYY format.');
      return;
    }
    if (df.dutyStartTime && !timeRegex.test(df.dutyStartTime)) {
      setFormError('Start Time must be in 24 Hrs HH:mm format.');
      return;
    }

    if (df.dutyEndDate && !dateRegex.test(df.dutyEndDate)) {
      setFormError('End Date must be in DD/MM/YYYY format.');
      return;
    }
    if (df.dutyEndTime && !timeRegex.test(df.dutyEndTime)) {
      setFormError('End Time must be in 24 Hrs HH:mm format.');
      return;
    }

    const startDateTime = mergeDT(df.dutyStartDate, df.dutyStartTime);
    const endDateTime = mergeDT(df.dutyEndDate, df.dutyEndTime);

    if (startDateTime && endDateTime) {
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);
      if (end < start) {
        setFormError('End Date & Time cannot be before Start Date & Time.');
        return;
      }
    }

    const rdt = df.reportingDate && df.reportingTime
      ? mergeDT(df.reportingDate, df.reportingTime)
      : new Date().toISOString();

    let targetStatus: 'DRAFT' | 'FILLED' | 'CLOSED' = 'DRAFT';
    if (closeStatus) {
      targetStatus = 'CLOSED';
    } else if (df.dutyEndDate && df.dutyEndTime && df.dutyEndMeter > 0) {
      targetStatus = 'CLOSED';
    } else if (df.dutyStartDate && df.dutyStartTime) {
      targetStatus = 'FILLED';
    }

    const patchStatus = targetStatus === 'CLOSED' ? 'FILLED' : targetStatus;

    setSubmitting(true);
    try {
      let slipId = editingSlip?.id;

      if (editingSlip) {
        // Update existing duty slip
        await api.request(`/duty-slips/${editingSlip.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            reportingTime: rdt,
            startKm: Number(df.dutyStartMeter) || 0,
            endKm: Number(df.dutyEndMeter) || undefined,
            startDateTime: startDateTime || undefined,
            endDateTime: endDateTime || undefined,
            toll: Number(df.toll) || 0,
            parking: Number(df.parking) || 0,
            nightCharges: Number(df.nightChargesOnTime) || 0,
            driverAllowance: Number(df.driverAllowance) || 0,
            extraCharges: Number(df.extraCharges) || 0,
            stateTax: Number(df.stateTax) || 0,
            mcd: Number(df.mcdToll) || 0,
            status: patchStatus,
            employeeId: df.employeeId || undefined,
            driverId: df.driverId,
            vehicleId: df.vehicleId,
            guestName: df.guestName || undefined,
            guestSalutation: df.guestSalutation || undefined,
            bookingBy: df.bookingBy || undefined,
            remarks: df.remarks || undefined,
          }),
        });
      } else {
        // Create new duty slip
        const slip = await api.request('/duty-slips', {
          method: 'POST',
          body: JSON.stringify({
            reportingTime: rdt,
            startKm: Number(df.dutyStartMeter) || 0,
            customerId: df.customerId,
            driverId: df.driverId,
            vehicleId: df.vehicleId,
            pickupLocation: df.pickupLocation || df.reportingAt || undefined,
            dropLocation: df.dropLocation || undefined,
            tripType: df.dutyType === 'O' || df.dutyType === 'T' ? 'OUTSTATION' : 'LOCAL',
            guestName: df.guestName || undefined,
            guestSalutation: df.guestSalutation || undefined,
            bookingBy: df.bookingBy || undefined,
            remarks: df.remarks || undefined,
            employeeId: df.employeeId || undefined,
          }),
        });
        slipId = slip.id;

        // Patch other details
        await api.request(`/duty-slips/${slip.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            startKm: Number(df.dutyStartMeter) || 0,
            endKm: Number(df.dutyEndMeter) || undefined,
            startDateTime: startDateTime || undefined,
            endDateTime: endDateTime || undefined,
            toll: Number(df.toll) || 0,
            parking: Number(df.parking) || 0,
            nightCharges: Number(df.nightChargesOnTime) || 0,
            driverAllowance: Number(df.driverAllowance) || 0,
            extraCharges: Number(df.extraCharges) || 0,
            stateTax: Number(df.stateTax) || 0,
            mcd: Number(df.mcdToll) || 0,
            status: patchStatus,
            employeeId: df.employeeId || undefined,
          }),
        });
      }

      // If CLOSED, register/close the Trip record
      if (targetStatus === 'CLOSED') {
        const subtotal = Number(df.baseFare || 0) +
          Number(df.extraKmCharged || 0) +
          Number(df.extraHoursCharged || 0) +
          Number(df.toll || 0) +
          Number(df.parking || 0) +
          Number(df.stateTax || 0) +
          Number(df.mcdToll || 0) +
          Number(df.driverAllowance || 0) +
          Number(df.nightChargesOnTime || 0) +
          Number(df.extraCharges || 0);

        const totalAmount = subtotal;

        await api.request('/trips', {
          method: 'POST',
          body: JSON.stringify({
            dutySlipId: slipId,
            endKm: Number(df.dutyEndMeter),
            startDateTime,
            endDateTime,
            toll: Number(df.toll) || 0,
            parking: Number(df.parking) || 0,
            driverAllowance: Number(df.driverAllowance) || 0,
            nightCharges: Number(df.nightChargesOnTime) || 0,
            extraCharges: Number(df.extraCharges) || 0,
            stateTax: Number(df.stateTax) || 0,
            mcd: Number(df.mcdToll) || 0,
            baseFareCharged: Number(df.baseFare) || 0,
            extraKmCharged: Number(df.extraKmCharged) || 0,
            extraHoursCharged: Number(df.extraHoursCharged) || 0,
            totalAmount: Number(totalAmount) || 0,
          }),
        });
      }

      setIsDirectOpen(false);
      setEditingSlip(null);
      fetchDutySlips();
    } catch (e: any) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleDirectCreate = (e: React.FormEvent) => handleUnifiedSave(e);

  const openUnifiedForm = async (slip: DutySlip) => {
    loadAssets();
    setFormError(null);
    setEditingSlip(slip);

    const s = splitDT(slip.startDateTime);
    const e = splitDT(slip.endDateTime);
    const rep = splitDT(slip.reportingTime);

    // Fetch customer details to get custom rate cards and tax rates
    let customerObj = null;
    try {
      customerObj = await api.request(`/customers/${slip.booking?.customerId}`);
      setFullCustomer(customerObj);
    } catch (err) {
      console.error(err);
    }

    const customerTaxRate = customerObj
      ? Number(customerObj.cgstRate || 0) + Number(customerObj.sgstRate || 0) + Number(customerObj.igstRate || 0)
      : Number(slip.booking?.customer?.cgstRate || 0) + Number(slip.booking?.customer?.sgstRate || 0) + Number(slip.booking?.customer?.igstRate || 0);

    setDf({
      customerType: slip.booking?.customer ? 'regular' : 'new',
      modeOfPayment: slip.booking?.modeOfPayment || 'Credit',
      modeOfReservation: slip.booking?.modeOfReservation || 'Email',
      clientType: customerObj?.clientType || slip.booking?.customer?.clientType || 'COMPANY',
      customerId: slip.booking?.customerId || '',
      state: '',
      city: '',
      address: customerObj?.billingAddress || slip.booking?.customer?.billingAddress || '',
      phone: customerObj?.phone || slip.booking?.customer?.phone || '',
      bookingBy: slip.booking?.bookingBy || '',
      guestSalutation: slip.booking?.guestSalutation || 'Mr',
      guestName: slip.booking?.guestName || '',
      reportingAt: slip.pickupLocation || '',
      fileCode: slip.booking?.fileCode || '',
      employeeId: slip.employeeId || '',
      reportingDate: rep.date || '',
      reportingTime: rep.time || '',
      pickupType: (slip.booking?.pickupType || 'other') as any,
      vehicleId: slip.vehicleId || '',
      carGroup: slip.vehicle?.vehicleType || '',
      carName: slip.vehicle?.model || '',
      carFrom: '',
      driverId: slip.driverId || '',
      pickupLocation: slip.pickupLocation || '',
      dropLocation: slip.dropLocation || '',
      remarks: slip.booking?.remarks || '',
      dutyStartDate: s.date || '',
      dutyStartTime: s.time || '',
      dutyStartMeter: Number(slip.startKm) || 0,
      dutyEndDate: e.date || '',
      dutyEndTime: e.time || '',
      dutyEndMeter: Number(slip.endKm) || 0,
      actualKm: 0,
      billedKm: 0,
      actualHours: 0,
      billedHours: 0,
      dayHours: 0,
      nightHours: 0,
      clientAdvance: 0,
      clientRemarks: '',
      serviceTax: customerTaxRate || 5,
      parking: Number(slip.parking) || 0,
      toll: Number(slip.toll) || 0,
      mcdToll: Number(slip.mcd) || 0,
      stateTax: Number(slip.stateTax) || 0,
      driverAdvance: 0,
      driverAllowance: Number(slip.driverAllowance) || 0,
      driverRefund: 0,
      feedbackPoint: '',
      driverRemark: '',
      dutyType: slip.booking?.tripType === 'OUTSTATION' ? 'O' : 'L',
      tourCode: '',
      localBill: '',
      nightChargesOnTime: Number(slip.nightCharges) || 0,
      billingMode: 'N',
      extraCharges: Number(slip.extraCharges) || 0,

      // Override values
      baseFare: slip.trip ? Number((slip.trip as any).baseFareCharged) : 0,
      extraKmRate: 0,
      extraHourRate: 0,
      extraKmCharged: slip.trip ? Number((slip.trip as any).extraKmCharged) : 0,
      extraHoursCharged: slip.trip ? Number((slip.trip as any).extraHoursCharged) : 0,
      includeDriverAllowance: Number(slip.driverAllowance) > 0 || !slip.trip,
      includeNightCharges: Number(slip.nightCharges) > 0 || !slip.trip,
      isManualBaseFare: !!slip.trip,
      isManualExtraKmRate: false,
      isManualExtraHourRate: false,
      isManualExtraKmCharged: !!slip.trip,
      isManualExtraHoursCharged: !!slip.trip,
      isManualDriverAllowance: Number(slip.driverAllowance) > 0,
      isManualNightCharges: Number(slip.nightCharges) > 0,
    });

    setIsDirectOpen(true);
  };

  const openEdit = (slip: DutySlip) => {
    openUnifiedForm(slip);
  };

  const openClose = (slip: DutySlip) => {
    openUnifiedForm(slip);
    // pre-populate close inputs if empty
    setDf(f => ({
      ...f,
      dutyEndDate: f.dutyEndDate || new Date().toISOString().split('T')[0],
      dutyEndTime: f.dutyEndTime || '18:00',
      dutyEndMeter: f.dutyEndMeter || Number(f.dutyStartMeter) + 50,
    }));
  };


  const handleDelete = async (id: string) => {
    if (!confirm('Delete this duty slip?')) return;
    try { await api.request(`/duty-slips/${id}`, { method: 'DELETE' }); fetchDutySlips(); }
    catch (e: any) { alert(e.message); }
  };

  const downloadPdf = async (id: string, num: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/duty-slips/${id}/pdf`, {
        headers: { Authorization: `Bearer ${api.getToken()}` },
      });
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `DS-${num}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e: any) { alert(e.message); }
  };

  const previewPdf = async (id: string, num: string) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/duty-slips/${id}/pdf`, {
        headers: { Authorization: `Bearer ${api.getToken()}` },
      });
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewTitle(`Duty Slip: ${num}`);
    } catch (e: any) { alert(e.message); }
    finally { setPreviewLoading(false); }
  };

  if (!user) return null;
  const canEdit = user.role !== 'BILLING_EXECUTIVE';

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Duty Slips</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage trip sheets, log travel data and close duties</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { loadAssets(); setBookingForm({ bookingId: '', reportingDate: '', reportingTime: '', startKm: 0, employeeId: '' }); setFormError(null); setIsBookingDrawerOpen(true); }}
              className="py-2 px-4 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              From Booking
            </button>
            <button
              onClick={() => { loadAssets(); setFormError(null); setIsDirectOpen(true); }}
              className="py-2 px-5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Create Duty Slip
            </button>
          </div>
        )}
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchDutySlips(); }} className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search slip, booking, driver..." className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
        </form>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {['ALL', 'DRAFT', 'FILLED', 'CLOSED'].map(s => (
            <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${filterStatus === s ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading duty slips…</div>
        ) : dutySlips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            <p className="text-sm font-medium">No duty slips found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Slip No.', 'Booking', 'Customer', 'Guest Name', 'Driver', 'Vehicle', 'Reporting Date & Time', 'Status', 'KM', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dutySlips.map(slip => (
                  <tr key={slip.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 text-xs">{slip.dutySlipNumber}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">{slip.booking?.bookingNumber || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800 truncate max-w-[140px]">{slip.booking?.customer?.name}</div>
                      {slip.employeeId && <div className="text-[10px] text-slate-400 font-mono">{slip.employeeId}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
                      {slip.booking?.guestName ? (
                        <div className="truncate max-w-[120px] font-semibold text-slate-800">
                          {slip.booking.guestSalutation ? `${slip.booking.guestSalutation} ` : ''}{slip.booking.guestName}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 text-xs">{slip.driver?.name || '—'}</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-slate-600">{slip.vehicle?.vehicleNumber || '—'}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      <div className="text-slate-800 font-medium">{fmtDate(slip.reportingTime)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{fmtTime(slip.reportingTime)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${STATUS_STYLES[slip.status]}`}>
                        {slip.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                      {slip.startKm} {slip.endKm ? `→ ${slip.endKm}` : ''}
                    </td>
                    <td className="px-4 py-3.5">
                      {canEdit && (
                        <div className="relative flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          {slip.status !== 'CLOSED' && (
                            <button onClick={() => openClose(slip)}
                              className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition">
                              Close Duty
                            </button>
                          )}
                          <button onClick={() => openEdit(slip)}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition">
                            Edit
                          </button>
                          <button
                            onClick={() => previewPdf(slip.id, slip.dutySlipNumber)}
                            className="px-2 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition inline-flex items-center gap-1"
                            title="Preview PDF"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                            Preview
                          </button>
                          <button onClick={() => downloadPdf(slip.id, slip.dutySlipNumber)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                            title="Download PDF"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                          </button>
                          <button onClick={() => handleDelete(slip.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="border-t border-slate-100 px-6 py-3.5 flex items-center justify-between bg-slate-50">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition">
              ← Previous
            </button>
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition">
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ══════════ FROM-BOOKING DRAWER ══════════ */}
      {isBookingDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create from Booking</h3>
                <p className="text-xs text-slate-500 mt-0.5">Generate a duty slip from an assigned booking</p>
              </div>
              <button onClick={() => setIsBookingDrawerOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {formError && <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}

            <form onSubmit={handleBookingCreate} className="flex-1 overflow-y-auto p-6 space-y-5">
              <Field label="Select Assigned Booking *">
                {loadingBookings ? <div className="text-sm text-slate-500 py-2">Loading bookings…</div> : (
                  <select required value={bookingForm.bookingId} onChange={e => setBookingForm(f => ({ ...f, bookingId: e.target.value }))} className={sel}>
                    <option value="">— Choose Booking —</option>
                    {assignedBookings.map(b => (
                      <option key={b.id} value={b.id}>{b.bookingNumber} · {b.customer?.name}</option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-slate-400 mt-1.5">Driver and vehicle are inherited from the active assignment.</p>
              </Field>

              <Field label="Reporting Date & Time *">
                <div className="flex gap-2">
                  <div className="w-2/3">
                    <DatePicker
                      value={bookingForm.reportingDate}
                      onChange={(val) => setBookingForm(f => ({ ...f, reportingDate: val }))}
                      format="DD/MM/YYYY"
                      placeholder="DD/MM/YYYY"
                      required
                    />
                  </div>
                  <input type="text" placeholder="HH:mm" maxLength={5} required value={bookingForm.reportingTime} onChange={e => setBookingForm(f => ({ ...f, reportingTime: handleTimeChange(e.target.value) }))} className={inp + ' w-1/3'} />
                </div>
              </Field>

              <Field label="Start Odometer (KM) *">
                <input type="number" required min={0} value={bookingForm.startKm || ''} onChange={e => setBookingForm(f => ({ ...f, startKm: parseInt(e.target.value) || 0 }))} className={inp + ' font-mono'} placeholder="e.g. 12540" />
              </Field>

              <Field label="Employee ID (optional)">
                <input type="text" value={bookingForm.employeeId} onChange={e => setBookingForm(f => ({ ...f, employeeId: e.target.value }))} className={inp} placeholder="EMP-001" />
              </Field>
            </form>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button type="button" onClick={() => setIsBookingDrawerOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={handleBookingCreate} disabled={submitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60">
                {submitting ? 'Creating…' : 'Create Duty Slip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ DIRECT CREATE — FULL SCREEN ══════════ */}
      {isDirectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { setIsDirectOpen(false); setEditingSlip(null); }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingSlip ? `Edit Duty Slip: ${editingSlip.dutySlipNumber}` : 'Create Duty Slip'}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingSlip ? 'Update slip details, operational metrics, or finalize charges to close duty' : 'Direct creation without prior booking'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setIsDirectOpen(false); setEditingSlip(null); }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" onClick={(e) => handleUnifiedSave(e)} disabled={submitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60">
                {submitting ? 'Saving…' : (editingSlip ? 'Update Slip' : 'Save as Draft')}
              </button>
              {(df.dutyEndDate && df.dutyEndTime && df.dutyEndMeter > 0) && (
                <button type="button" onClick={(e) => handleUnifiedSave(e, true)} disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60 shadow-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  Close & Finalize Duty
                </button>
              )}
            </div>
          </div>

          {formError && <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shrink-0">{formError}</div>}

          {/* Form Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-6 max-w-[1500px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ─── LEFT COLUMN: Operational Inputs (7/12) ─── */}
            <div className="lg:col-span-7 space-y-6">

              {/* Customer Information Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 rounded-t-xl">
                  <h3 className="text-sm font-bold text-slate-700">Customer & Profile</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Customer *">
                      {editingSlip ? (
                        <div className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800">
                          {editingSlip.booking?.customer?.name || '—'}
                        </div>
                      ) : (
                        <select required value={df.customerId} onChange={e => setDf(f => ({ ...f, customerId: e.target.value }))} className={sel}>
                          <option value="">— Select Customer —</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                    </Field>
                    <Field label="Client Type">
                      <select value={df.clientType} onChange={e => setDf(f => ({ ...f, clientType: e.target.value }))} className={sel}>
                        {['COMPANY', 'INDIVIDUAL', 'TRAVEL_COMPANY'].map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Phone / Mobile">
                      <input type="tel" value={df.phone} onChange={e => setDf(f => ({ ...f, phone: e.target.value }))} className={inp} placeholder="+91 98765 43210" />
                    </Field>
                    <Field label="Full Address">
                      <input type="text" value={df.address} onChange={e => setDf(f => ({ ...f, address: e.target.value }))} className={inp} placeholder="Billing Address" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Booking By">
                      <input type="text" value={df.bookingBy} onChange={e => setDf(f => ({ ...f, bookingBy: e.target.value }))} className={inp} placeholder="Booked By" />
                    </Field>
                    <Field label="File Code">
                      <input type="text" value={df.fileCode} onChange={e => setDf(f => ({ ...f, fileCode: e.target.value }))} className={inp} placeholder="FC-001" />
                    </Field>
                    <Field label="Employee ID">
                      <input type="text" value={df.employeeId} onChange={e => setDf(f => ({ ...f, employeeId: e.target.value }))} className={inp} placeholder="EMP-001" />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Driver & Vehicle Information Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 rounded-t-xl">
                  <h3 className="text-sm font-bold text-slate-700">Vehicle & Driver</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Vehicle *">
                      <select required value={df.vehicleId} onChange={e => {
                        const v = vehicles.find(v => v.id === e.target.value);
                        setDf(f => ({
                          ...f,
                          vehicleId: e.target.value,
                          carName: v?.model || '',
                          carGroup: v?.vehicleType || '',
                        }));
                      }} className={sel}>
                        <option value="">— Choose Vehicle —</option>
                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.model})</option>)}
                      </select>
                    </Field>
                    <Field label="Car Group">
                      <select value={df.carGroup} onChange={e => setDf(f => ({ ...f, carGroup: e.target.value }))} className={sel}>
                        <option value="">— Select —</option>
                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Car Name">
                      <input type="text" value={df.carName} onChange={e => setDf(f => ({ ...f, carName: e.target.value }))} className={inp} placeholder="e.g. Innova Crysta" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Driver *">
                      <select required value={df.driverId} onChange={e => setDf(f => ({ ...f, driverId: e.target.value }))} className={sel}>
                        <option value="">— Select Driver —</option>
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name} · {d.mobile}</option>)}
                      </select>
                    </Field>
                    <Field label="Reporting Time *">
                      <div className="flex gap-2">
                        <div className="w-2/3">
                          <DatePicker
                            value={df.reportingDate}
                            onChange={(val) => setDf(f => ({ ...f, reportingDate: val }))}
                            format="DD/MM/YYYY"
                            placeholder="DD/MM/YYYY"
                            required
                          />
                        </div>
                        <input type="text" placeholder="HH:mm" maxLength={5} required value={df.reportingTime} onChange={e => setDf(f => ({ ...f, reportingTime: handleTimeChange(e.target.value) }))} className={inp + ' w-1/3'} />
                      </div>
                    </Field>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Pickup Location">
                      <input type="text" value={df.pickupLocation} onChange={e => setDf(f => ({ ...f, pickupLocation: e.target.value }))} className={inp} placeholder="IGI Airport T3" />
                    </Field>
                    <Field label="Drop Location">
                      <input type="text" value={df.dropLocation} onChange={e => setDf(f => ({ ...f, dropLocation: e.target.value }))} className={inp} placeholder="Connaught Place" />
                    </Field>
                    <Field label="Guest Name">
                      <input type="text" value={df.guestName} onChange={e => setDf(f => ({ ...f, guestName: e.target.value }))} className={inp} placeholder="Passenger Name" />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Duty Timestamps & Meters */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 rounded-t-xl">
                  <h3 className="text-sm font-bold text-slate-700">Duty Start & Closure Metrics</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3 p-4 bg-blue-50/40 rounded-xl border border-blue-100/40">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Start Metrics
                      </p>
                      <Field label="Start Date">
                        <DatePicker
                          value={df.dutyStartDate}
                          onChange={(val) => setDf(f => ({ ...f, dutyStartDate: val }))}
                          format="DD/MM/YYYY"
                          placeholder="DD/MM/YYYY"
                        />
                      </Field>
                      <Field label="Start Time"><input type="text" placeholder="HH:mm" maxLength={5} value={df.dutyStartTime} onChange={e => setDf(f => ({ ...f, dutyStartTime: handleTimeChange(e.target.value) }))} className={inp} /></Field>
                      <Field label="Start Meter (KM)"><input type="number" min={0} value={df.dutyStartMeter || ''} onChange={e => setDf(f => ({ ...f, dutyStartMeter: parseInt(e.target.value) || 0 }))} className={inp + ' font-mono'} /></Field>
                    </div>
                    <div className="space-y-3 p-4 bg-emerald-50/40 rounded-xl border border-emerald-100/40">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />End Metrics
                      </p>
                      <Field label="End Date">
                        <DatePicker
                          value={df.dutyEndDate}
                          onChange={(val) => setDf(f => ({ ...f, dutyEndDate: val }))}
                          format="DD/MM/YYYY"
                          placeholder="DD/MM/YYYY"
                        />
                      </Field>
                      <Field label="End Time"><input type="text" placeholder="HH:mm" maxLength={5} value={df.dutyEndTime} onChange={e => setDf(f => ({ ...f, dutyEndTime: handleTimeChange(e.target.value) }))} className={inp} /></Field>
                      <Field label="End Meter (KM)"><input type="number" min={0} value={df.dutyEndMeter || ''} onChange={e => setDf(f => ({ ...f, dutyEndMeter: parseInt(e.target.value) || 0 }))} className={inp + ' font-mono'} /></Field>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <Field label="Actual KM"><input type="number" min={0} step="0.01" value={df.actualKm || ''} onChange={e => setDf(f => ({ ...f, actualKm: parseFloat(e.target.value) || 0 }))} className={inp + ' font-mono bg-slate-50'} /></Field>
                    <Field label="Billed KM"><input type="number" min={0} step="0.01" value={df.billedKm || ''} onChange={e => setDf(f => ({ ...f, billedKm: parseFloat(e.target.value) || 0 }))} className={inp + ' font-mono'} /></Field>
                    <Field label="Actual Hrs"><input type="number" min={0} step="0.01" value={df.actualHours || ''} onChange={e => setDf(f => ({ ...f, actualHours: parseFloat(e.target.value) || 0 }))} className={inp + ' font-mono bg-slate-50'} /></Field>
                    <Field label="Billed Hrs"><input type="number" min={0} step="0.01" value={df.billedHours || ''} onChange={e => setDf(f => ({ ...f, billedHours: parseFloat(e.target.value) || 0 }))} className={inp + ' font-mono'} /></Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Day Hours"><input type="number" min={0} step="0.5" value={df.dayHours || ''} onChange={e => setDf(f => ({ ...f, dayHours: parseFloat(e.target.value) || 0 }))} className={inp + ' font-mono bg-slate-50'} /></Field>
                    <Field label="Night Hours"><input type="number" min={0} step="0.5" value={df.nightHours || ''} onChange={e => setDf(f => ({ ...f, nightHours: parseFloat(e.target.value) || 0 }))} className={inp + ' font-mono bg-slate-50'} /></Field>
                  </div>
                </div>
              </div>

              {/* Duty Type Configuration */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 rounded-t-xl">
                  <h3 className="text-sm font-bold text-slate-700">Trip & Billing Mode</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <Field label="Service / Billing Option *">
                      <select
                        value={
                          df.dutyType === 'O' || df.dutyType === 'T'
                            ? 'outstation'
                            : df.pickupType === 'airport' || df.pickupType === 'railway'
                              ? 'transfer'
                              : df.billingMode === 'H'
                                ? 'local_half_day'
                                : 'local_full_day'
                        }
                        onChange={e => {
                          const val = e.target.value;
                          setDf(f => {
                            if (val === 'outstation') {
                              return { ...f, dutyType: 'O', billingMode: 'N', pickupType: 'other' };
                            } else if (val === 'transfer') {
                              return { ...f, dutyType: 'L', billingMode: 'N', pickupType: 'airport' };
                            } else if (val === 'local_half_day') {
                              return { ...f, dutyType: 'L', billingMode: 'H', pickupType: 'other' };
                            } else {
                              return { ...f, dutyType: 'L', billingMode: 'F', pickupType: 'other' };
                            }
                          });
                        }}
                        className={sel}
                      >
                        <option value="local_half_day">Local Half Day (4 Hrs / 40 KM)</option>
                        <option value="local_full_day">Local Full Day (8 Hrs / 80 KM)</option>
                        <option value="transfer">Transfer (Airport / Railway)</option>
                        <option value="outstation">Outstation</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Remarks / Internal Notes">
                      <input type="text" value={df.remarks} onChange={e => setDf(f => ({ ...f, remarks: e.target.value }))} className={inp} />
                    </Field>
                    <Field label="Tour Code (optional)">
                      <input type="text" value={df.tourCode} onChange={e => setDf(f => ({ ...f, tourCode: e.target.value }))} className={inp} placeholder="TC-001" />
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── RIGHT COLUMN: Rate Reference & Interactive Billing (5/12) ─── */}
            <div className="lg:col-span-5 space-y-6">

              {/* Rate Card Reference Panel */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rate Card Reference</h4>
                <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                  <span className="text-slate-500">Customer Rate Plan</span>
                  <span className="font-semibold text-slate-800 text-right truncate">
                    {df.customerId ? (selectedRateCard ? selectedRateCard.name || 'Custom Rate Plan' : 'Standard Rate Card') : '—'}
                  </span>
                  <span className="text-slate-500">Package Type</span>
                  <span className="font-semibold text-slate-800 text-right">{liveBillingPreview?.packageType || 'Local (8h / 80k)'}</span>
                  <span className="text-slate-500">Included Distance</span>
                  <span className="font-semibold text-slate-800 text-right">{liveBillingPreview?.includedKm || 80} KM</span>
                  <span className="text-slate-500">Included Hours</span>
                  <span className="font-semibold text-slate-800 text-right">{liveBillingPreview?.includedHours || 8} Hrs</span>
                </div>
              </div>

              {/* Interactive live Billing Breakup */}
              {liveBillingPreview && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-slate-800 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Billing Breakup</p>
                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Editable</span>
                  </div>

                  <div className="space-y-3 text-xs divide-y divide-slate-100">

                    {/* Base Fare Row */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-600 font-medium">Base Fare (₹)</span>
                      <input type="number" min={0} value={df.baseFare || ''}
                        onChange={e => setDf(f => ({ ...f, baseFare: parseFloat(e.target.value) || 0, isManualBaseFare: true }))}
                        className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-semibold text-right text-emerald-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                    </div>

                    {/* Extra KM Row */}
                    <div className="flex flex-col gap-1.5 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Extra KM Charges</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-mono mr-1">Rate:</span>
                          <input type="number" min={0} value={df.extraKmRate || ''}
                            onChange={e => setDf(f => ({ ...f, extraKmRate: parseFloat(e.target.value) || 0, isManualExtraKmRate: true }))}
                            className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-mono text-[11px] text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                          <span className="text-[10px] text-slate-400 font-mono">/KM</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pl-2 border-l border-slate-100">
                        <span className="text-[10px] text-slate-500">
                          {df.billedKm > liveBillingPreview.includedKm ? `(${df.billedKm - liveBillingPreview.includedKm} KM extra)` : '(No extra KM)'}
                        </span>
                        <input type="number" min={0} value={df.extraKmCharged || ''}
                          onChange={e => setDf(f => ({ ...f, extraKmCharged: parseFloat(e.target.value) || 0, isManualExtraKmCharged: true }))}
                          className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-semibold text-right text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                      </div>
                    </div>

                    {/* Extra Hours Row */}
                    <div className="flex flex-col gap-1.5 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Extra Hours Charges</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-mono mr-1">Rate:</span>
                          <input type="number" min={0} value={df.extraHourRate || ''}
                            onChange={e => setDf(f => ({ ...f, extraHourRate: parseFloat(e.target.value) || 0, isManualExtraHourRate: true }))}
                            className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-mono text-[11px] text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                          <span className="text-[10px] text-slate-400 font-mono">/Hr</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pl-2 border-l border-slate-100">
                        <span className="text-[10px] text-slate-500">
                          {df.billedHours > liveBillingPreview.includedHours ? `(${parseFloat((df.billedHours - liveBillingPreview.includedHours).toFixed(2))} Hrs extra)` : '(No extra hours)'}
                        </span>
                        <input type="number" min={0} value={df.extraHoursCharged || ''}
                          onChange={e => setDf(f => ({ ...f, extraHoursCharged: parseFloat(e.target.value) || 0, isManualExtraHoursCharged: true }))}
                          className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-semibold text-right text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                      </div>
                    </div>

                    {/* Driver Allowance */}
                    <div className="flex items-center justify-between pt-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={df.includeDriverAllowance}
                          onChange={e => setDf(f => ({ ...f, includeDriverAllowance: e.target.checked }))}
                          className="rounded text-blue-600 focus:ring-blue-500 bg-white border-slate-300 w-3.5 h-3.5" />
                        <span className="text-slate-600 font-medium">Driver Allowance (₹)</span>
                      </div>
                      <input type="number" disabled={!df.includeDriverAllowance} min={0} value={df.driverAllowance || ''}
                        onChange={e => setDf(f => ({ ...f, driverAllowance: parseFloat(e.target.value) || 0, isManualDriverAllowance: true }))}
                        className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-semibold text-right text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 disabled:opacity-40 disabled:bg-slate-100 disabled:text-slate-400" />
                    </div>

                    {/* Night Charges */}
                    <div className="flex items-center justify-between pt-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={df.includeNightCharges}
                          onChange={e => setDf(f => ({ ...f, includeNightCharges: e.target.checked }))}
                          className="rounded text-blue-600 focus:ring-blue-500 bg-white border-slate-300 w-3.5 h-3.5" />
                        <span className="text-slate-600 font-medium">Night Allowance (₹)</span>
                      </div>
                      <input type="number" disabled={!df.includeNightCharges} min={0} value={df.nightChargesOnTime || ''}
                        onChange={e => setDf(f => ({ ...f, nightChargesOnTime: parseFloat(e.target.value) || 0, isManualNightCharges: true }))}
                        className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-semibold text-right text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 disabled:opacity-40 disabled:bg-slate-100 disabled:text-slate-400" />
                    </div>

                    {/* Parking & Tolls & Taxes */}
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[11px] text-slate-505">Parking</span>
                        <input type="number" min={0} value={df.parking || ''}
                          onChange={e => setDf(f => ({ ...f, parking: parseFloat(e.target.value) || 0 }))}
                          className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-right font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[11px] text-slate-505">Tolls</span>
                        <input type="number" min={0} value={df.toll || ''}
                          onChange={e => setDf(f => ({ ...f, toll: parseFloat(e.target.value) || 0 }))}
                          className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-right font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[11px] text-slate-550">State Tax</span>
                        <input type="number" min={0} value={df.stateTax || ''}
                          onChange={e => setDf(f => ({ ...f, stateTax: parseFloat(e.target.value) || 0 }))}
                          className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-right font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[11px] text-slate-550">MCD Toll</span>
                        <input type="number" min={0} value={df.mcdToll || ''}
                          onChange={e => setDf(f => ({ ...f, mcdToll: parseFloat(e.target.value) || 0 }))}
                          className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-right font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                      </div>
                    </div>

                    {/* Extra / Misc Charges */}
                    <div className="flex items-center justify-between pt-3">
                      <span className="text-slate-600 font-medium">Misc Extra Charges (₹)</span>
                      <input type="number" min={0} value={df.extraCharges || ''}
                        onChange={e => setDf(f => ({ ...f, extraCharges: parseFloat(e.target.value) || 0 }))}
                        className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono text-right text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100" />
                    </div>

                    {/* Grand Total Row */}
                    <div className="flex justify-between pt-4 pb-1 text-sm font-bold border-t border-slate-200">
                      <span className="text-slate-700 font-bold">GRAND TOTAL</span>
                      <span className="font-mono text-emerald-600 text-base">₹{fmt(liveBillingPreview.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* PDF Preview Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[90vh] border border-slate-100">
            {/* Modal Header */}
            <div className="bg-[#0F172A] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h4a2 2 0 002-2V5a2 2 0 00-2-2H9z" />
                  <path fillRule="evenodd" d="M5 5a3 3 0 00-3 3v8a3 3 0 003 3h8a3 3 0 003-3V8a3 3 0 00-3-3H5zm4 4a1 1 0 11-2 0 1 1 0 012 0zm-1 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <h3 className="font-bold text-sm tracking-wide">{previewTitle}</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = previewPdfUrl;
                    a.download = `${previewTitle.replace(/: /g, '-')}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    window.URL.revokeObjectURL(previewPdfUrl);
                    setPreviewPdfUrl(null);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Iframe preview */}
            <div className="flex-1 bg-slate-100 p-2">
              <iframe src={`${previewPdfUrl}#toolbar=0`} className="w-full h-full rounded-lg border border-slate-200" title="PDF Preview" />
            </div>
          </div>
        </div>
      )}

      {/* PDF Loading Overlay */}
      {previewLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl flex items-center gap-3 border border-slate-100">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Generating PDF Preview...</span>
          </div>
        </div>
      )}
    </div>
  );
}
