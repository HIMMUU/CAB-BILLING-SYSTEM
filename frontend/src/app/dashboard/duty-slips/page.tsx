"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import DatePicker from "@/components/DatePicker";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Customer {
  id: string;
  tenantId?: string;
  name: string;
  companyName: string | null;
  type?: string;
  cgstRate?: number | string | null;
  sgstRate?: number | string | null;
  igstRate?: number | string | null;
  clientType?: string | null;
  billingAddress?: string | null;
  phone?: string | null;
  rateCards?: RateCard[];
}
interface CustomRatePackage {
  id: string;
  includedKm: number;
  includedHours: number;
  rate: number;
}
interface VehicleCategory {
  id?: string;
  name: string;
}
interface RateCard {
  id: string;
  name?: string;
  tenantId?: string;
  customerId?: string | null;
  clientType: string;
  status: string;
  effectiveFrom: string;
  createdAt?: string;
  updatedAt?: string;
  vehicleCategory: VehicleCategory;
  halfDayRate?: number | string | null;
  fullDayRate?: number | string | null;
  includedKm?: number | string | null;
  extraKmRate?: number | string | null;
  extraHourRate?: number | string | null;
  minKmPerDay?: number | string | null;
  outstationRatePerKm?: number | string | null;
  driverAllowance?: number | string | null;
  nightCharge?: number | string | null;
  outstationNightCharge?: number | string | null;
  nightStartTime?: string | null;
  nightEndTime?: string | null;
  minHr?: number | string | null;
  minKm?: number | string | null;
  fullHr?: number | string | null;
  fullKm?: number | string | null;
  customPackages?: CustomRatePackage[];
}
interface User {
  id: string;
  role: string;
  [key: string]: unknown;
}
interface Trip {
  totalKm?: number | string | null;
  totalHours?: number | string | null;
  nightChargesCharged?: number | string | null;
  driverAllowance?: number | string | null;
  baseFareCharged?: number | string | null;
  extraKmCharged?: number | string | null;
  extraHoursCharged?: number | string | null;
}
interface PricingSnapshot {
  isFlexible?: boolean;
  items?: Array<{
    id: string;
    particular: string;
    rate: number;
    quantity?: number;
    amount: number;
  }>;
  userNotes?: string;
  billingMode?: "N" | "H" | "F" | "C" | "T";
  rateCardId?: string;
  customPackageId?: string;
  carGroup?: string;
  baseFare?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  includeNightCharges?: boolean;
  nightChargesOnTime?: number;
  isManualNightCharges?: boolean;
  includeDriverAllowance?: boolean;
  driverAllowance?: number;
  isManualDriverAllowance?: boolean;
}
interface Booking {
  id: string;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation: string;
  pickupDate: string;
  pickupTime: string;
  vehicleTypeRequired: string;
  customer: Customer;
  employeeId?: string | null;
  customerId?: string;
  modeOfPayment?: string;
  modeOfReservation?: string;
  bookingBy?: string;
  guestSalutation?: string;
  guestName?: string;
  fileCode?: string;
  pickupType?: string;
  remarks?: string;
  tripType?: string;
  dutySlip?: DutySlip | null;
}
interface Driver {
  id: string;
  name: string;
  mobile: string;
}
interface Vehicle {
  id: string;
  vehicleNumber: string;
  model: string;
  vehicleType: string;
}
interface DutySlip {
  id: string;
  dutySlipNumber: string;
  bookingId: string;
  driverId: string;
  vehicleId: string;
  reportingTime: string;
  startKm: number;
  endKm: number | null;
  toll: number;
  parking: number;
  nightCharges: number;
  driverAllowance: number;
  extraCharges: number;
  status: "DRAFT" | "FILLED" | "CLOSED";
  startDateTime: string | null;
  endDateTime: string | null;
  stateTax: number;
  mcd: number;
  employeeId?: string | null;
  booking: Booking;
  driver: Driver;
  vehicle: Vehicle;
  pickupLocation?: string;
  dropLocation?: string;
  remarks?: string;
  guestName?: string | null;
  guestSalutation?: string | null;
  carGroup?: string | null;
  rateCardId?: string | null;
  billingMode?: string | null;
  baseFare?: number | null;
  extraKmRate?: number | null;
  extraHourRate?: number | null;
  packageKm?: number | null;
  packageHours?: number | null;
  pricingSnapshot?: PricingSnapshot | null;
  trip?: Trip | null;
}
/* ─── Helpers ────────────────────────────────────────────────────────── */
const handleTimeChange = (val: string): string => {
  const clean = val.replace(/\D/g, "").slice(0, 4);
  if (clean.length >= 3) {
    return `${clean.slice(0, 2)}:${clean.slice(2)}`;
  }
  return clean;
};

const dateToApi = (d: string): string => {
  if (!d) return "";
  const parts = d.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return d;
};

const splitDT = (s: string | null | undefined) => {
  if (!s) return { date: "", time: "" };
  const d = new Date(s);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

const mergeDT = (date: string, time: string) => {
  if (!date) return null;
  const isoDate = date.includes("/") ? dateToApi(date) : date;
  const d = new Date(`${isoDate}T${time || "00:00"}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const getRateClientType = (customer: Customer): string => {
  if (customer?.type === "INDIVIDUAL") return "Individual";
  return /travel|holiday|resort|tour/i.test(customer?.companyName || "")
    ? "Travel Company"
    : "Company";
};

const getRateEffectiveAt = (
  date?: string | null,
  time?: string | null,
  fallback?: string | null,
): Date => {
  const sourceDate = date || fallback;
  if (!sourceDate) return new Date();
  if (!date && sourceDate.includes("T")) {
    const parsed = new Date(sourceDate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const datePart = sourceDate.includes("T")
    ? sourceDate.split("T")[0]
    : sourceDate;
  const timePart =
    time ||
    (sourceDate.includes("T") ? sourceDate.split("T")[1].slice(0, 5) : "23:59");
  const merged = mergeDT(datePart, timePart);
  return merged ? new Date(merged) : new Date();
};

const filterApplicableRateCards = (
  cards: RateCard[],
  customer: Customer | null,
  tripType: string | undefined,
  effectiveAt: Date,
  categoryName?: string | null,
) => {
  if (!Array.isArray(cards) || !customer?.id) return [];

  const clientType = getRateClientType(customer).toLowerCase();
  const isOutstation =
    tripType === "OUTSTATION" || tripType === "O" || tripType === "T";
  const uniqueCards = Array.from(
    new Map(
      cards.filter((card) => card?.id).map((card) => [card.id, card]),
    ).values(),
  );

  const eligibleCards = uniqueCards.filter((card) => {
    if (!card?.id || card.status !== "ACTIVE") return false;
    if (customer.tenantId && card.tenantId !== customer.tenantId) return false;
    if (
      typeof card.vehicleCategory?.name !== "string" ||
      !card.vehicleCategory.name.trim()
    ) {
      return false;
    }

    const isCustomerCard = card.customerId === customer.id;
    const isMatchingDefaultCard =
      !card.customerId &&
      String(card.clientType || "")
        .trim()
        .toLowerCase() === clientType;
    if (!isCustomerCard && !isMatchingDefaultCard) return false;

    const effectiveFrom = new Date(card.effectiveFrom).getTime();
    if (
      !Number.isFinite(effectiveFrom) ||
      effectiveFrom > effectiveAt.getTime()
    ) {
      return false;
    }

    if (
      categoryName &&
      card.vehicleCategory.name.trim().toLowerCase() !==
        categoryName.trim().toLowerCase()
    ) {
      return false;
    }

    if (isOutstation) {
      return (
        Number(card.minKmPerDay) > 0 && Number(card.outstationRatePerKm) > 0
      );
    }

    const hasCustomPackage = card.customPackages?.some(
      (ratePackage) =>
        Number(ratePackage.includedKm) > 0 &&
        Number(ratePackage.includedHours) > 0 &&
        Number(ratePackage.rate) > 0,
    );
    return (
      Boolean(hasCustomPackage) ||
      ((Number(card.fullDayRate) > 0 || Number(card.halfDayRate) > 0) &&
        (Number(card.fullKm) || Number(card.minKm) || Number(card.includedKm)) >
          0 &&
        (Number(card.fullHr) || Number(card.minHr)) > 0)
    );
  });

  const categories = Array.from(
    new Set(
      eligibleCards.map((card) =>
        card.vehicleCategory.name.trim().toLowerCase(),
      ),
    ),
  );
  return categories.flatMap((category) => {
    const categoryCards = eligibleCards.filter(
      (card) => card.vehicleCategory.name.trim().toLowerCase() === category,
    );
    const customerCards = categoryCards.filter(
      (card) => card.customerId === customer.id,
    );
    const preferredCards = customerCards.length
      ? customerCards
      : categoryCards.filter((card) => !card.customerId);
    preferredCards.sort((a, b) => {
      const effectiveDate =
        new Date(b.effectiveFrom).getTime() -
        new Date(a.effectiveFrom).getTime();
      if (effectiveDate !== 0) return effectiveDate;
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });
    return preferredCards.length > 0 ? [preferredCards[0]] : [];
  });
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error || "Unknown error");

const fmt = (n: number | string | null | undefined) =>
  Number(n || 0).toFixed(2);
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-GB") : "–";
const fmtTime = (s: string | null | undefined) =>
  s
    ? new Date(s).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "–";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border-amber-200",
  FILLED: "bg-blue-50 text-blue-700 border-blue-200",
  CLOSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

/* ─── Field Component ────────────────────────────────────────────────── */
const Field = ({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {label}
    </label>
    {children}
  </div>
);
const inp =
  "w-full border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition placeholder:text-slate-400";
const sel = inp + " cursor-pointer";

/* ══════════════════════════════════════════════════════════════════════ */
export default function DutySlipsPage() {
  const router = useRouter();
  const [user] = useState<User | null>(() => api.getUser());

  /* data */
  const [dutySlips, setDutySlips] = useState<DutySlip[]>([]);
  const [assignedBookings, setAssignedBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedRateCard, setSelectedRateCard] = useState<RateCard | null>(
    null,
  );
  const [availableRateCards, setAvailableRateCards] = useState<RateCard[]>([]);
  const [fullCustomer, setFullCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateCardLoadError, setRateCardLoadError] = useState<string | null>(
    null,
  );

  // PDF Preview State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Delete Confirmation Modal State
  const [deletingSlip, setDeletingSlip] = useState<DutySlip | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  /* filter / pagination */
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* From-Booking create drawer */
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    bookingId: "",
    reportingDate: "",
    reportingTime: "",
    startKm: 0,
    employeeId: "",
  });

  /* Direct create & Edit unified full-screen form */
  const [isDirectOpen, setIsDirectOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState<DutySlip | null>(null);
  const isRestoringRef = useRef(false);
  const [df, setDf] = useState({
    customerType: "regular" as "regular" | "new",
    modeOfPayment: "Credit",
    modeOfReservation: "Email",
    clientType: "COMPANY",
    customerId: "",
    state: "",
    city: "",
    address: "",
    phone: "",
    bookingBy: "",
    guestSalutation: "Mr",
    guestName: "",
    reportingAt: "",
    fileCode: "",
    employeeId: "",
    reportingDate: "",
    reportingTime: "",
    pickupType: "other" as "airport" | "railway" | "hotel" | "other",
    vehicleId: "",
    carGroup: "",
    carName: "",
    carFrom: "",
    driverId: "",
    pickupLocation: "",
    dropLocation: "",
    remarks: "",
    dutyStartDate: "",
    dutyStartTime: "",
    dutyStartMeter: 0,
    dutyEndDate: "",
    dutyEndTime: "",
    dutyEndMeter: 0,
    actualKm: 0,
    billedKm: 0,
    actualHours: 0,
    billedHours: 0,
    dayHours: 0,
    nightHours: 0,
    clientAdvance: 0,
    clientRemarks: "",
    serviceTax: 5,
    parking: 0,
    toll: 0,
    mcdToll: 0,
    stateTax: 0,
    driverAdvance: 0,
    driverAllowance: 0,
    driverRefund: 0,
    feedbackPoint: "",
    driverRemark: "",
    dutyType: "L",
    tourCode: "",
    localBill: "",
    nightChargesOnTime: 0,
    nightUnits: 1,
    nightRate: 200,
    driverAllowanceDays: 1,
    driverAllowanceRate: 300,
    billingMode: "C" as "N" | "H" | "F" | "C" | "T",
    customPackageId: "",
    extraCharges: 0,
    manualDriverName: "",
    manualDriverPhone: "",
    manualVehicleNumber: "",
    manualVehicleModel: "",

    // overrides & rates
    baseFare: 0,
    extraKmRate: 0,
    extraHourRate: 0,
    extraKmCharged: 0,
    extraHoursCharged: 0,
    includeDriverAllowance: false,
    includeNightCharges: false,
    isManualBaseFare: false,
    isManualExtraKmRate: false,
    isManualExtraHourRate: false,
    isManualExtraKmCharged: false,
    isManualExtraHoursCharged: false,
    isManualDriverAllowance: false,
    isManualNightCharges: false,
  });

  const resetDirectForm = () => {
    setEditingSlip(null);
    setFullCustomer(null);
    setCustomParticulars([]);
    setFormError(null);
    setRateCardLoadError(null);
    setDf({
      customerType: "regular",
      modeOfPayment: "Credit",
      modeOfReservation: "Email",
      clientType: "COMPANY",
      customerId: "",
      state: "",
      city: "",
      address: "",
      phone: "",
      bookingBy: "",
      guestSalutation: "Mr",
      guestName: "",
      reportingAt: "",
      fileCode: "",
      employeeId: "",
      reportingDate: "",
      reportingTime: "",
      pickupType: "other",
      vehicleId: "",
      carGroup: "",
      carName: "",
      carFrom: "",
      driverId: "",
      pickupLocation: "",
      dropLocation: "",
      remarks: "",
      dutyStartDate: "",
      dutyStartTime: "",
      dutyStartMeter: 0,
      dutyEndDate: "",
      dutyEndTime: "",
      dutyEndMeter: 0,
      actualKm: 0,
      billedKm: 0,
      actualHours: 0,
      billedHours: 0,
      dayHours: 0,
      nightHours: 0,
      clientAdvance: 0,
      clientRemarks: "",
      serviceTax: 5,
      parking: 0,
      toll: 0,
      mcdToll: 0,
      stateTax: 0,
      driverAdvance: 0,
      driverAllowance: 0,
      driverRefund: 0,
      feedbackPoint: "",
      driverRemark: "",
      dutyType: "L",
      tourCode: "",
      localBill: "",
      nightChargesOnTime: 0,
      nightUnits: 1,
      nightRate: 200,
      driverAllowanceDays: 1,
      driverAllowanceRate: 300,
      billingMode: "C",
      customPackageId: "",
      extraCharges: 0,
      manualDriverName: "",
      manualDriverPhone: "",
      manualVehicleNumber: "",
      manualVehicleModel: "",

      baseFare: 0,
      extraKmRate: 0,
      extraHourRate: 0,
      extraKmCharged: 0,
      extraHoursCharged: 0,
      includeDriverAllowance: false,
      includeNightCharges: false,
      isManualBaseFare: false,
      isManualExtraKmRate: false,
      isManualExtraHourRate: false,
      isManualExtraKmCharged: false,
      isManualExtraHoursCharged: false,
      isManualDriverAllowance: false,
      isManualNightCharges: false,
    });
  };

  /* Flexible Duty Slip custom line items state */
  const [customParticulars, setCustomParticulars] = useState<
    Array<{
      id: string;
      particular: string;
      rate: number;
      quantity?: number;
      amount: number;
    }>
  >([]);

  const handleAddParticularRow = () => {
    setCustomParticulars((prev) => [
      ...prev,
      { id: "item_" + Date.now(), particular: "", rate: 0, amount: 0 },
    ]);
  };

  const handleUpdateParticular = (id: string, field: string, value: string) => {
    setCustomParticulars((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === "rate") {
          const r = parseFloat(value) || 0;
          return { ...row, rate: r, amount: r };
        }
        if (field === "amount") {
          const a = parseFloat(value) || 0;
          return { ...row, amount: a };
        }
        return { ...row, [field]: value };
      }),
    );
  };

  const handleRemoveParticular = (id: string) => {
    setCustomParticulars((prev) => prev.filter((row) => row.id !== id));
  };

  /* submitting */
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* Helper to calculate night hours */
  const calculateNightHours = (
    start: Date,
    end: Date,
    nightStartStr = "22:00",
    nightEndStr = "06:00",
  ): number => {
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end)
      return 0;
    let nightHours = 0;
    const [nsH] = nightStartStr.split(":").map(Number);
    const [neH] = nightEndStr.split(":").map(Number);
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
    if (!api.getToken() || !user) router.push("/login");
  }, [router, user]);

  /* ── Compute dynamic available Car Groups ── */
  const availableCarGroups = useMemo(() => {
    return Array.from(
      new Set(
        availableRateCards
          .map((card) => card.vehicleCategory?.name)
          .filter((name): name is string => !!name),
      ),
    );
  }, [availableRateCards]);
  const cardsForSelectedCategory = useMemo(() => {
    if (!df.carGroup) return [];
    return availableRateCards.filter(
      (card) =>
        card.vehicleCategory?.name?.toLowerCase() === df.carGroup.toLowerCase(),
    );
  }, [availableRateCards, df.carGroup]);
  const selectedRateCardIsAvailable = cardsForSelectedCategory.some(
    (card) => card.id === selectedRateCard?.id,
  );
  const selectedCustomPackage = selectedRateCard?.customPackages?.find(
    (ratePackage) => ratePackage.id === df.customPackageId,
  );
  const isOutstationBooking = editingSlip?.booking
    ? editingSlip.booking.tripType === "OUTSTATION"
    : df.dutyType === "O" || df.dutyType === "T";
  const supportsOutstationRate =
    selectedRateCardIsAvailable &&
    Number(selectedRateCard?.minKmPerDay) > 0 &&
    Number(selectedRateCard?.outstationRatePerKm) > 0;
  const supportsLocalRate =
    selectedRateCardIsAvailable &&
    (Number(selectedRateCard?.fullDayRate) > 0 ||
      Number(selectedRateCard?.halfDayRate) > 0 ||
      (selectedRateCard?.customPackages?.some(
        (ratePackage) => Number(ratePackage.rate) > 0,
      ) ??
        false));
  const supportsFullDay =
    !isOutstationBooking &&
    selectedRateCardIsAvailable &&
    Number(selectedRateCard?.fullDayRate) > 0;
  const supportsHalfDay =
    !isOutstationBooking &&
    selectedRateCardIsAvailable &&
    Number(selectedRateCard?.halfDayRate) > 0;

  /* ── Fetch Customer details on selection ── */
  useEffect(() => {
    if (!df.customerId) {
      return;
    }
    const fetchCust = async () => {
      try {
        const customer = await api.request(`/customers/${df.customerId}`, {
          bypassCache: true,
        });
        if (!customer?.id) {
          throw new Error("Customer API returned an invalid response.");
        }
        // Only set fullCustomer if not already set by openUnifiedForm (during restore)
        setFullCustomer((prev) =>
          prev && prev.id === customer.id ? prev : customer,
        );
        const taxRate =
          Number(customer.cgstRate || 0) +
          Number(customer.sgstRate || 0) +
          Number(customer.igstRate || 0);
        const effectiveAt = getRateEffectiveAt(
          undefined,
          undefined,
          editingSlip?.endDateTime ||
            editingSlip?.startDateTime ||
            editingSlip?.reportingTime,
        );
        const customerRateCards = filterApplicableRateCards(
          customer.rateCards || [],
          customer,
          editingSlip?.booking?.tripType ||
            (df.dutyType === "O" || df.dutyType === "T"
              ? "OUTSTATION"
              : "LOCAL"),
          effectiveAt,
        );
        const firstCategory =
          customerRateCards[0]?.vehicleCategory?.name || null;
        setDf((f) => ({
          ...f,
          address: customer.billingAddress || f.address,
          phone: customer.phone || f.phone,
          clientType: customer.clientType || f.clientType,
          serviceTax: taxRate || f.serviceTax,
          // GUARD: Do NOT overwrite carGroup if restoring an existing slip
          carGroup: isRestoringRef.current
            ? f.carGroup
            : customerRateCards.some(
                  (card) =>
                    card.vehicleCategory?.name?.toLowerCase() ===
                    f.carGroup.toLowerCase(),
                )
              ? f.carGroup
              : firstCategory || "",
        }));
      } catch (err) {
        console.error("Failed to fetch customer details:", err);
        setRateCardLoadError(
          `Could not load this customer's rate-card details: ${getErrorMessage(err)}`,
        );
      }
    };
    fetchCust();
  }, [df.customerId, df.dutyType, editingSlip]);

  /* ── Match active rate card ── */
  useEffect(() => {
    let isCurrentRequest = true;

    const matchRateCard = async () => {
      if (!df.customerId || fullCustomer?.id !== df.customerId) {
        setSelectedRateCard(null);
        setAvailableRateCards([]);
        setRateCardLoadError(null);
        return;
      }

      setRateCardLoadError(null);
      let allCards: RateCard[] = Array.isArray(fullCustomer.rateCards)
        ? [...fullCustomer.rateCards]
        : [];
      try {
        const mappedClientType = getRateClientType(fullCustomer);
        const res = await api.request(
          `/rate-management/rate-cards?customerId=ALL&clientType=${mappedClientType}&limit=500`,
          { bypassCache: true },
        );
        if (!Array.isArray(res?.data)) {
          throw new Error("Rate-card API returned an invalid response.");
        }
        allCards = [...allCards, ...res.data];
      } catch (err) {
        console.error("Failed to fetch default rate cards:", err);
        if (isCurrentRequest) {
          setRateCardLoadError(
            `Could not load default rate cards for this customer: ${getErrorMessage(err)}`,
          );
        }
      }

      if (!isCurrentRequest) return;

      const effectiveAt = getRateEffectiveAt(
        df.dutyEndDate || df.dutyStartDate || df.reportingDate,
        df.dutyEndTime || df.dutyStartTime || df.reportingTime,
        editingSlip?.booking?.pickupDate,
      );
      const bookingTripType = editingSlip?.booking?.tripType;
      const rateTripType =
        bookingTripType ||
        (df.dutyType === "O" || df.dutyType === "T" ? "OUTSTATION" : "LOCAL");
      const relevantCards = filterApplicableRateCards(
        allCards,
        fullCustomer,
        rateTripType,
        effectiveAt,
      );
      setAvailableRateCards(relevantCards);

      const targetCategory =
        df.carGroup ||
        df.carName ||
        relevantCards[0]?.vehicleCategory?.name ||
        "";
      const cardsForCategory = relevantCards.filter(
        (card) =>
          card.vehicleCategory?.name?.toLowerCase() ===
          targetCategory.toLowerCase(),
      );
      const rc =
        cardsForCategory.find((card) => card.id === selectedRateCard?.id) ||
        cardsForCategory.find((card) => card.id === editingSlip?.rateCardId) ||
        cardsForCategory.find((card) => card.customerId === fullCustomer.id) ||
        cardsForCategory[0] ||
        null;

      setSelectedRateCard(rc);

      if (rc) {
        const hasCustom =
          ((Number(rc.fullKm) || Number(rc.minKm)) !== 80 &&
            (Number(rc.fullKm) || Number(rc.minKm)) !== 40) ||
          ((Number(rc.fullHr) || Number(rc.minHr)) !== 8 &&
            (Number(rc.fullHr) || Number(rc.minHr)) !== 4) ||
          !!rc.customerId;
        setDf((f) => {
          // GUARD: Do NOT mutate carGroup, billingMode, or rates when restoring
          if (isRestoringRef.current) return f;

          const isOutstationDuty = f.dutyType === "O" || f.dutyType === "T";
          const isFlexDuty = f.dutyType === "FLEXIBLE";

          // Preserve billingMode if it's already explicitly chosen or if editing
          let newBillingMode = f.billingMode;
          if (!isFlexDuty && !isOutstationDuty) {
            if (!editingSlip) {
              newBillingMode = hasCustom ? "C" : "F";
            } else if (!f.billingMode || f.billingMode === "N") {
              newBillingMode = hasCustom ? "C" : "F";
            }
          }

          return {
            ...f,
            carGroup: f.carGroup || rc.vehicleCategory?.name || "",
            billingMode: newBillingMode,
            driverAllowance:
              Number(f.driverAllowance) > 0
                ? f.driverAllowance
                : Number(rc.driverAllowance) || 0,
            nightChargesOnTime:
              Number(f.nightChargesOnTime) > 0
                ? f.nightChargesOnTime
                : isOutstationDuty
                  ? Number(rc.outstationNightCharge || rc.nightCharge) || 0
                  : Number(rc.nightCharge) || 0,
          };
        });
      }
    };
    matchRateCard();

    return () => {
      isCurrentRequest = false;
    };
  }, [
    fullCustomer,
    df.customerId,
    df.carGroup,
    df.carName,
    df.dutyType,
    df.dutyEndDate,
    df.dutyEndTime,
    df.dutyStartDate,
    df.dutyStartTime,
    df.reportingDate,
    df.reportingTime,
    editingSlip,
    selectedRateCard?.id,
  ]);

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

    if (
      df.dutyStartDate &&
      df.dutyStartTime &&
      df.dutyEndDate &&
      df.dutyEndTime
    ) {
      const isoStartDate = df.dutyStartDate.includes("/")
        ? dateToApi(df.dutyStartDate)
        : df.dutyStartDate;
      const isoEndDate = df.dutyEndDate.includes("/")
        ? dateToApi(df.dutyEndDate)
        : df.dutyEndDate;
      const start = new Date(`${isoStartDate}T${df.dutyStartTime}`);
      const end = new Date(`${isoEndDate}T${df.dutyEndTime}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        actHrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        bilHrs = actHrs;

        const startD = new Date(isoStartDate);
        const endD = new Date(isoEndDate);
        const diffDaysMs = endD.getTime() - startD.getTime();
        calcDays = Math.max(
          1,
          Math.round(diffDaysMs / (1000 * 60 * 60 * 24)) + 1,
        );

        nightHrs = calculateNightHours(
          start,
          end,
          selectedRateCard?.nightStartTime || "22:00",
          selectedRateCard?.nightEndTime || "06:00",
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

    if (df.dutyType === "FLEXIBLE") {
      // Flexible Duty Slip (Custom Particulars)
      calculatedBaseFare = 0;
      baseKm = 0;
      baseHours = 0;
      bilKm = actKm;
      bilHrs = actHrs;
    } else if (df.dutyType === "O" || df.dutyType === "T") {
      const minKm = selectedRateCard
        ? Number(selectedRateCard.minKmPerDay) || 250
        : 250;
      const ratePerKm = selectedRateCard
        ? Number(selectedRateCard.outstationRatePerKm) || 15
        : 15;
      baseKm = calcDays * minKm;
      calculatedBaseFare = baseKm * ratePerKm;
      calculatedExtraKmRate = ratePerKm;
      calculatedExtraHourRate = selectedRateCard
        ? Number(selectedRateCard.extraHourRate) || 100
        : 100;
      calculatedDriverAllowance =
        calcDays *
        (selectedRateCard
          ? Number(selectedRateCard.driverAllowance) || 250
          : 250);
      calculatedNightCharges =
        nightHrs > 0
          ? calcDays *
            (selectedRateCard
              ? Number(
                  selectedRateCard.outstationNightCharge ||
                    selectedRateCard.nightCharge,
                ) || 200
              : 200)
          : 0;
      baseHours = 24 * calcDays;
      bilKm = Math.max(actKm, baseKm);
      bilHrs = actHrs;
    } else if (df.billingMode === "C") {
      // Custom Company Package (e.g. 120 KM / 12 Hrs)
      baseKm = selectedCustomPackage
        ? Number(selectedCustomPackage.includedKm)
        : selectedRateCard
          ? Number(
              selectedRateCard.fullKm ||
                selectedRateCard.minKm ||
                selectedRateCard.includedKm,
            ) || 120
          : 120;
      baseHours = selectedCustomPackage
        ? Number(selectedCustomPackage.includedHours)
        : selectedRateCard
          ? Number(selectedRateCard.fullHr || selectedRateCard.minHr) || 12
          : 12;
      calculatedBaseFare = selectedCustomPackage
        ? Number(selectedCustomPackage.rate)
        : selectedRateCard
          ? Number(
              selectedRateCard.fullDayRate || selectedRateCard.halfDayRate,
            ) || 2000
          : 2000;
      bilKm = Math.max(actKm, baseKm);
      bilHrs = Math.max(actHrs, baseHours);

      calculatedExtraKmRate = selectedRateCard
        ? Number(selectedRateCard.extraKmRate) || 12
        : 12;
      calculatedExtraHourRate = selectedRateCard
        ? Number(selectedRateCard.extraHourRate) || 100
        : 100;
      calculatedDriverAllowance = 0;
      calculatedNightCharges =
        nightHrs > 0
          ? selectedRateCard
            ? Number(selectedRateCard.nightCharge) || 200
            : 200
          : 0;
    } else if (df.billingMode === "H") {
      // Local Half Day (4 Hrs / 40 KM)
      baseKm = selectedRateCard ? Number(selectedRateCard.minKm) || 40 : 40;
      baseHours = selectedRateCard ? Number(selectedRateCard.minHr) || 4 : 4;
      calculatedBaseFare = selectedRateCard
        ? Number(selectedRateCard.halfDayRate) || 1000
        : 1000;
      bilKm = Math.max(actKm, baseKm);
      bilHrs = Math.max(actHrs, baseHours);

      calculatedExtraKmRate = selectedRateCard
        ? Number(selectedRateCard.extraKmRate) || 12
        : 12;
      calculatedExtraHourRate = selectedRateCard
        ? Number(selectedRateCard.extraHourRate) || 100
        : 100;
      calculatedDriverAllowance = 0;
      calculatedNightCharges =
        nightHrs > 0
          ? selectedRateCard
            ? Number(selectedRateCard.nightCharge) || 200
            : 200
          : 0;
    } else if (
      df.billingMode === "T" ||
      df.pickupType === "airport" ||
      df.pickupType === "railway"
    ) {
      // Transfer (Airport / Railway)
      baseKm = 40;
      baseHours = 4;
      calculatedBaseFare = selectedRateCard
        ? Number(selectedRateCard.halfDayRate) || 1000
        : 1000;
      bilKm = Math.max(actKm, baseKm);
      bilHrs = Math.max(actHrs, baseHours);

      calculatedExtraKmRate = selectedRateCard
        ? Number(selectedRateCard.extraKmRate) || 12
        : 12;
      calculatedExtraHourRate = selectedRateCard
        ? Number(selectedRateCard.extraHourRate) || 100
        : 100;
      calculatedDriverAllowance = 0;
      calculatedNightCharges =
        nightHrs > 0
          ? selectedRateCard
            ? Number(selectedRateCard.nightCharge) || 200
            : 200
          : 0;
    } else {
      // Local Full Day (8 Hrs / 80 KM)
      baseKm = selectedRateCard ? Number(selectedRateCard.fullKm) || 80 : 80;
      baseHours = selectedRateCard ? Number(selectedRateCard.fullHr) || 8 : 8;
      calculatedBaseFare = selectedRateCard
        ? Number(selectedRateCard.fullDayRate) || 1600
        : 1600;
      bilKm = Math.max(actKm, baseKm);
      bilHrs = Math.max(actHrs, baseHours);

      calculatedExtraKmRate = selectedRateCard
        ? Number(selectedRateCard.extraKmRate) || 12
        : 12;
      calculatedExtraHourRate = selectedRateCard
        ? Number(selectedRateCard.extraHourRate) || 100
        : 100;
      calculatedDriverAllowance = 0;
      calculatedNightCharges =
        nightHrs > 0
          ? selectedRateCard
            ? Number(selectedRateCard.nightCharge) || 200
            : 200
          : 0;
    }

    setDf((f) => {
      // GUARD: Do NOT recalculate any rates while openUnifiedForm is still restoring state
      if (isRestoringRef.current) return f;

      const baseFareVal = f.isManualBaseFare ? f.baseFare : calculatedBaseFare;
      const extraKmRateVal = f.isManualExtraKmRate
        ? f.extraKmRate
        : calculatedExtraKmRate;
      const extraHourRateVal = f.isManualExtraHourRate
        ? f.extraHourRate
        : calculatedExtraHourRate;

      const isOutstation = f.dutyType === "O" || f.dutyType === "T";
      const autoIncludeDA = f.isManualDriverAllowance
        ? f.includeDriverAllowance
        : isOutstation;

      const driverAllowanceVal = autoIncludeDA
        ? f.isManualDriverAllowance && Number(f.driverAllowance) > 0
          ? f.driverAllowance
          : calculatedDriverAllowance || 250
        : 0;

      const autoIncludeNight = f.isManualNightCharges
        ? f.includeNightCharges
        : nightHrs > 0;

      const nightChargesVal = autoIncludeNight
        ? f.isManualNightCharges && Number(f.nightChargesOnTime) > 0
          ? f.nightChargesOnTime
          : calculatedNightCharges || 200
        : 0;

      const extraKmChargedVal = f.isManualExtraKmCharged
        ? f.extraKmCharged
        : Math.max(0, bilKm - baseKm) * extraKmRateVal;
      const extraHoursChargedVal = f.isManualExtraHoursCharged
        ? f.extraHoursCharged
        : Math.max(0, actHrs - baseHours) * extraHourRateVal;

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
        includeDriverAllowance: autoIncludeDA,
        includeNightCharges: autoIncludeNight,
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
    df.customPackageId,
    df.includeDriverAllowance,
    df.includeNightCharges,
    selectedRateCard,
    selectedCustomPackage,
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

    if (df.dutyType === "FLEXIBLE") {
      const customSubtotal = customParticulars.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );
      const miscCharges = Number(df.extraCharges || 0);
      const subtotal =
        customSubtotal + toll + parking + stateTax + mcd + miscCharges;
      return {
        packageType: "Flexible Duty Slip (Manual Particulars)",
        includedKm: 0,
        includedHours: 0,
        subtotal,
        totalAmount: subtotal,
        customSubtotal,
      };
    }

    const driverAllowance = df.includeDriverAllowance
      ? Number(df.driverAllowance || 0)
      : 0;
    const nightCharges = df.includeNightCharges
      ? Number(df.nightChargesOnTime || 0)
      : 0;
    const extraCharges = Number(df.extraCharges || 0);

    const subtotal =
      baseFare +
      extraKmCharged +
      extraHoursCharged +
      toll +
      parking +
      stateTax +
      mcd +
      driverAllowance +
      nightCharges +
      extraCharges;
    const taxAmount = 0;
    const totalAmount = subtotal;

    // Resolve included values for reference
    let includedKm = 80;
    let includedHours = 8;
    let packageType = "Local (8h / 80k)";

    let calcDays = 1;
    if (df.dutyStartDate && df.dutyEndDate) {
      const isoStartDate = df.dutyStartDate.includes("/")
        ? dateToApi(df.dutyStartDate)
        : df.dutyStartDate;
      const isoEndDate = df.dutyEndDate.includes("/")
        ? dateToApi(df.dutyEndDate)
        : df.dutyEndDate;
      const startD = new Date(isoStartDate);
      const endD = new Date(isoEndDate);
      const diffDaysMs = endD.getTime() - startD.getTime();
      calcDays = Math.max(
        1,
        Math.round(diffDaysMs / (1000 * 60 * 60 * 24)) + 1,
      );
    }

    if (df.dutyType === "FLEXIBLE") {
      includedKm = 0;
      includedHours = 0;
      packageType = df.remarks?.trim()
        ? `Flexible Duty (${df.remarks.trim()})`
        : "Flexible Duty (Custom Rate / Particulars)";
    } else if (df.dutyType === "O" || df.dutyType === "T") {
      const minKm = selectedRateCard
        ? Number(selectedRateCard.minKmPerDay) || 250
        : 250;
      includedKm = calcDays * minKm;
      includedHours = calcDays * 24;
      packageType = `Outstation (${calcDays} Days)`;
    } else if (df.billingMode === "C") {
      includedKm = selectedCustomPackage
        ? Number(selectedCustomPackage.includedKm)
        : selectedRateCard
          ? Number(
              selectedRateCard.fullKm ||
                selectedRateCard.minKm ||
                selectedRateCard.includedKm,
            ) || 120
          : 120;
      includedHours = selectedCustomPackage
        ? Number(selectedCustomPackage.includedHours)
        : selectedRateCard
          ? Number(selectedRateCard.fullHr || selectedRateCard.minHr) || 12
          : 12;
      packageType = `Company Package (${includedHours}h / ${includedKm}k)`;
    } else if (df.billingMode === "H") {
      includedKm = selectedRateCard ? Number(selectedRateCard.minKm) || 40 : 40;
      includedHours = selectedRateCard
        ? Number(selectedRateCard.minHr) || 4
        : 4;
      packageType = `Local Half Day (${includedHours}h / ${includedKm}k)`;
    } else if (
      df.billingMode === "T" ||
      df.pickupType === "airport" ||
      df.pickupType === "railway"
    ) {
      includedKm = 40;
      includedHours = 4;
      packageType = "Transfer (Airport / Railway)";
    } else {
      includedKm = selectedRateCard
        ? Number(selectedRateCard.fullKm) || 80
        : 80;
      includedHours = selectedRateCard
        ? Number(selectedRateCard.fullHr) || 8
        : 8;
      packageType = `Local Full Day (${includedHours}h / ${includedKm}k)`;
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
  }, [df, selectedRateCard, selectedCustomPackage, customParticulars]);

  /* ── fetchers ── */
  const fetchDutySlips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      const res = await api.request(`/duty-slips?${params}`);
      setDutySlips(res.data || []);
      setTotalPages(res.meta?.lastPage || 1);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => {
    if (!user) return;
    const timeoutId = window.setTimeout(() => {
      void fetchDutySlips();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [user, fetchDutySlips]);

  const loadAssets = async () => {
    setLoadingBookings(true);
    try {
      const [bRes, cRes, dRes, vRes] = await Promise.all([
        api.request("/bookings?status=ASSIGNED&limit=100"),
        api.request("/customers?limit=200"),
        api.request("/drivers?limit=200"),
        api.request("/vehicles?limit=200"),
      ]);
      setAssignedBookings(
        (bRes.data || []).filter((b: Booking) => !b.dutySlip),
      );
      setCustomers(cRes.data || cRes || []);
      setDrivers(dRes.data || dRes || []);
      setVehicles(vRes.data || vRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBookings(false);
    }
  };

  /* ── handlers ── */
  const handleBookingCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (
      !bookingForm.bookingId ||
      !bookingForm.reportingDate ||
      !bookingForm.reportingTime
    ) {
      setFormError("Booking, reporting date and reporting time are required.");
      return;
    }

    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(bookingForm.reportingDate)) {
      setFormError("Reporting Date must be in DD/MM/YYYY format.");
      return;
    }
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(bookingForm.reportingTime)) {
      setFormError("Reporting Time must be in 24 Hrs HH:mm format.");
      return;
    }

    setSubmitting(true);
    try {
      await api.request("/duty-slips", {
        method: "POST",
        body: JSON.stringify({
          bookingId: bookingForm.bookingId,
          reportingTime: mergeDT(
            bookingForm.reportingDate,
            bookingForm.reportingTime,
          ),
          startKm: Number(bookingForm.startKm),
          employeeId: bookingForm.employeeId || undefined,
        }),
      });
      setIsBookingDrawerOpen(false);
      fetchDutySlips();
      loadAssets();
    } catch (e: unknown) {
      setFormError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnifiedSave = async (
    e: React.FormEvent,
    closeStatus?: boolean,
  ) => {
    e.preventDefault();
    setFormError(null);
    if (!df.customerId && df.customerType !== "new") {
      setFormError("Select a customer or enter customer name.");
      return;
    }
    if (!df.driverId) {
      setFormError("Select a driver or choose Manual Driver.");
      return;
    }
    if (!df.vehicleId) {
      setFormError("Select a vehicle or choose Manual Vehicle.");
      return;
    }

    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;

    if (df.reportingDate && !dateRegex.test(df.reportingDate)) {
      setFormError("Reporting Date must be in DD/MM/YYYY format.");
      return;
    }
    if (df.reportingTime && !timeRegex.test(df.reportingTime)) {
      setFormError("Reporting Time must be in 24 Hrs HH:mm format.");
      return;
    }

    if (df.dutyStartDate && !dateRegex.test(df.dutyStartDate)) {
      setFormError("Start Date must be in DD/MM/YYYY format.");
      return;
    }
    if (df.dutyStartTime && !timeRegex.test(df.dutyStartTime)) {
      setFormError("Start Time must be in 24 Hrs HH:mm format.");
      return;
    }

    if (df.dutyEndDate && !dateRegex.test(df.dutyEndDate)) {
      setFormError("End Date must be in DD/MM/YYYY format.");
      return;
    }
    if (df.dutyEndTime && !timeRegex.test(df.dutyEndTime)) {
      setFormError("End Time must be in 24 Hrs HH:mm format.");
      return;
    }

    const now = new Date();
    const todayDDMMYYYY = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    const nowHHmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const startD = df.dutyStartDate || df.reportingDate || todayDDMMYYYY;
    const startT = df.dutyStartTime || df.reportingTime || nowHHmm;
    const repD = df.reportingDate || startD || todayDDMMYYYY;
    const repT = df.reportingTime || startT || nowHHmm;

    const rdt = mergeDT(repD, repT);
    const startDateTime = mergeDT(startD, startT);
    const endDateTime = mergeDT(df.dutyEndDate, df.dutyEndTime);

    let targetStatus: "DRAFT" | "FILLED" | "CLOSED" = "DRAFT";
    if (closeStatus) {
      targetStatus = "CLOSED";
    } else if (df.dutyEndDate && df.dutyEndTime && df.dutyEndMeter > 0) {
      targetStatus = "CLOSED";
    } else if (df.dutyStartDate && df.dutyStartTime) {
      targetStatus = "FILLED";
    }

    if (targetStatus === "CLOSED") {
      if (
        df.billingMode === "C" &&
        (selectedRateCard?.customPackages?.length ?? 0) > 0 &&
        !selectedCustomPackage
      ) {
        setFormError("Select a custom package before closing this duty slip.");
        return;
      }
      const booking = editingSlip?.booking;
      if (!editingSlip?.bookingId || !booking?.customer?.id) {
        setFormError(
          "This duty slip cannot be closed without a valid booking and customer. Link it to an assigned booking first.",
        );
        return;
      }

      const effectiveAt = getRateEffectiveAt(
        df.dutyEndDate || df.dutyStartDate || df.reportingDate,
        df.dutyEndTime || df.dutyStartTime || df.reportingTime,
      ).getTime();
      const categoryName =
        booking.vehicleTypeRequired ||
        editingSlip.carGroup ||
        editingSlip.vehicle?.vehicleType;
      const hasValidRateCard =
        filterApplicableRateCards(
          selectedRateCard ? [selectedRateCard] : [],
          booking.customer,
          booking.tripType,
          new Date(effectiveAt),
          categoryName,
        ).length > 0;

      if (!hasValidRateCard) {
        setFormError(
          "This duty slip cannot be closed without an active, effective rate card with a valid base rate for this trip. Select or create a matching rate card first.",
        );
        return;
      }
    }

    const patchStatus = targetStatus === "CLOSED" ? "FILLED" : targetStatus;

    const isFlexibleDuty = df.dutyType === "FLEXIBLE";
    const customSubtotal = isFlexibleDuty
      ? customParticulars.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      : 0;

    const cleanGuestName = (df.guestName || "").trim();
    const cleanGuestSalutation = cleanGuestName
      ? (df.guestSalutation || "").trim()
      : "";

    const pricingSnapshot = {
      isFlexible: isFlexibleDuty,
      items: isFlexibleDuty ? customParticulars : [],
      userNotes: df.remarks || "",
      miscCharges: Number(df.extraCharges) || 0,
      billingMode: df.billingMode || undefined,
      rateCardId: selectedRateCard?.id || undefined,
      customPackageId: selectedCustomPackage?.id || undefined,
      carGroup: df.carGroup || undefined,
      baseFare: Number(df.baseFare) || 0,
      extraKmRate: Number(df.extraKmRate) || 0,
      extraHourRate: Number(df.extraHourRate) || 0,
      includeNightCharges: Boolean(df.includeNightCharges),
      nightChargesOnTime: Number(df.nightChargesOnTime) || 0,
      isManualNightCharges: Boolean(df.isManualNightCharges),
      includeDriverAllowance: Boolean(df.includeDriverAllowance),
      driverAllowance: Number(df.driverAllowance) || 0,
      isManualDriverAllowance: Boolean(df.isManualDriverAllowance),
      packageKm: selectedCustomPackage
        ? Number(selectedCustomPackage.includedKm)
        : df.billingMode === "C"
          ? Number(
              selectedRateCard?.fullKm ||
                selectedRateCard?.minKm ||
                selectedRateCard?.includedKm ||
                120,
            )
          : df.billingMode === "H" || df.billingMode === "T"
            ? Number(selectedRateCard?.minKm || 40)
            : Number(selectedRateCard?.fullKm || 80),
      packageHours: selectedCustomPackage
        ? Number(selectedCustomPackage.includedHours)
        : df.billingMode === "C"
          ? Number(selectedRateCard?.fullHr || selectedRateCard?.minHr || 12)
          : df.billingMode === "H" || df.billingMode === "T"
            ? Number(selectedRateCard?.minHr || 4)
            : Number(selectedRateCard?.fullHr || 8),
      guestName: cleanGuestName || undefined,
      guestSalutation: cleanGuestSalutation || undefined,
      bookingBy: df.bookingBy || undefined,
      pickupLocation: df.pickupLocation || df.reportingAt || undefined,
      dropLocation: df.dropLocation || undefined,
      tripType:
        df.dutyType === "O" || df.dutyType === "T"
          ? "OUTSTATION"
          : isFlexibleDuty
            ? "HOURLY_RENTAL"
            : "LOCAL",
    };
    const payloadRemarks = JSON.stringify(pricingSnapshot);

    const calcExtraCharges = Number(df.extraCharges) || 0;
    const calcDriverAllowance = isFlexibleDuty
      ? 0
      : df.includeDriverAllowance
        ? Number(df.driverAllowance) || 0
        : 0;
    const calcNightCharges = isFlexibleDuty
      ? 0
      : df.includeNightCharges
        ? Number(df.nightChargesOnTime) || 0
        : 0;
    const calcBaseFare = isFlexibleDuty
      ? customSubtotal
      : Number(df.baseFare) || 0;
    const calcExtraKm = isFlexibleDuty ? 0 : Number(df.extraKmCharged) || 0;
    const calcExtraHours = isFlexibleDuty
      ? 0
      : Number(df.extraHoursCharged) || 0;

    setSubmitting(true);
    try {
      let slipId = editingSlip?.id;

      if (editingSlip) {
        // Update existing duty slip — save snapshot fields directly to DB columns
        const packageKmVal = selectedCustomPackage
          ? Number(selectedCustomPackage.includedKm)
          : df.billingMode === "C"
            ? Number(
                selectedRateCard?.fullKm ||
                  selectedRateCard?.minKm ||
                  selectedRateCard?.includedKm ||
                  120,
              )
            : df.billingMode === "H" || df.billingMode === "T"
              ? Number(selectedRateCard?.minKm || 40)
              : Number(selectedRateCard?.fullKm || 80);
        const packageHoursVal = selectedCustomPackage
          ? Number(selectedCustomPackage.includedHours)
          : df.billingMode === "C"
            ? Number(selectedRateCard?.fullHr || selectedRateCard?.minHr || 12)
            : df.billingMode === "H" || df.billingMode === "T"
              ? Number(selectedRateCard?.minHr || 4)
              : Number(selectedRateCard?.fullHr || 8);

        await api.request(`/duty-slips/${editingSlip.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            reportingTime: rdt,
            startKm: Number(df.dutyStartMeter) || 0,
            endKm: Number(df.dutyEndMeter) || undefined,
            startDateTime: startDateTime || undefined,
            endDateTime: endDateTime || undefined,
            toll: Number(df.toll) || 0,
            parking: Number(df.parking) || 0,
            nightCharges: calcNightCharges,
            driverAllowance: calcDriverAllowance,
            extraCharges: calcExtraCharges,
            stateTax: Number(df.stateTax) || 0,
            mcd: Number(df.mcdToll) || 0,
            status: patchStatus,
            employeeId: df.employeeId || undefined,
            driverId: df.driverId !== "MANUAL" ? df.driverId : undefined,
            vehicleId: df.vehicleId !== "MANUAL" ? df.vehicleId : undefined,
            guestName: cleanGuestName ? cleanGuestName : null,
            guestSalutation: cleanGuestSalutation ? cleanGuestSalutation : null,
            bookingBy: df.bookingBy || undefined,
            pickupLocation: df.pickupLocation || df.reportingAt || undefined,
            dropLocation: df.dropLocation || undefined,
            tripType:
              df.dutyType === "O" || df.dutyType === "T"
                ? "OUTSTATION"
                : isFlexibleDuty
                  ? "HOURLY_RENTAL"
                  : "LOCAL",
            remarks: payloadRemarks || undefined,
            // ── Snapshot fields: persist commercial data to dedicated DB columns ──
            carGroup: df.carGroup || undefined,
            rateCardId: selectedRateCard?.id || undefined,
            billingMode: df.billingMode || undefined,
            baseFare: Number(df.baseFare) || undefined,
            extraKmRate: Number(df.extraKmRate) || undefined,
            extraHourRate: Number(df.extraHourRate) || undefined,
            packageKm: packageKmVal || undefined,
            packageHours: packageHoursVal || undefined,
            pricingSnapshot,
          }),
        });
      } else {
        // Create new duty slip
        const slip = await api.request("/duty-slips", {
          method: "POST",
          body: JSON.stringify({
            reportingTime: rdt,
            startKm: Number(df.dutyStartMeter) || 0,
            customerId: df.customerId !== "MANUAL" ? df.customerId : undefined,
            driverId: df.driverId !== "MANUAL" ? df.driverId : undefined,
            vehicleId: df.vehicleId !== "MANUAL" ? df.vehicleId : undefined,
            pickupLocation: df.pickupLocation || df.reportingAt || undefined,
            dropLocation: df.dropLocation || undefined,
            tripType:
              df.dutyType === "O" || df.dutyType === "T"
                ? "OUTSTATION"
                : isFlexibleDuty
                  ? "HOURLY_RENTAL"
                  : "LOCAL",
            guestName: cleanGuestName || undefined,
            guestSalutation: cleanGuestSalutation || undefined,
            bookingBy: df.bookingBy || undefined,
            remarks: payloadRemarks || undefined,
            employeeId: df.employeeId || undefined,
            manualCustomerName:
              df.customerType === "new"
                ? cleanGuestName || undefined
                : undefined,
            manualDriverName:
              df.driverId === "MANUAL" ? df.manualDriverName : undefined,
            manualDriverPhone:
              df.driverId === "MANUAL" ? df.manualDriverPhone : undefined,
            manualVehicleNumber:
              df.vehicleId === "MANUAL" ? df.manualVehicleNumber : undefined,
            manualVehicleModel:
              df.vehicleId === "MANUAL" ? df.manualVehicleModel : undefined,
            // ── Snapshot fields saved on creation ──
            carGroup: df.carGroup || undefined,
            rateCardId: selectedRateCard?.id || undefined,
            billingMode: df.billingMode || undefined,
            baseFare: Number(df.baseFare) || undefined,
            extraKmRate: Number(df.extraKmRate) || undefined,
            extraHourRate: Number(df.extraHourRate) || undefined,
          }),
        });
        slipId = slip.id;

        // Second PATCH to fill operational + snapshot details
        const createPackageKm = selectedCustomPackage
          ? Number(selectedCustomPackage.includedKm)
          : df.billingMode === "C"
            ? Number(
                selectedRateCard?.fullKm ||
                  selectedRateCard?.minKm ||
                  selectedRateCard?.includedKm ||
                  120,
              )
            : df.billingMode === "H" || df.billingMode === "T"
              ? Number(selectedRateCard?.minKm || 40)
              : Number(selectedRateCard?.fullKm || 80);
        const createPackageHours = selectedCustomPackage
          ? Number(selectedCustomPackage.includedHours)
          : df.billingMode === "C"
            ? Number(selectedRateCard?.fullHr || selectedRateCard?.minHr || 12)
            : df.billingMode === "H" || df.billingMode === "T"
              ? Number(selectedRateCard?.minHr || 4)
              : Number(selectedRateCard?.fullHr || 8);

        await api.request(`/duty-slips/${slip.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            startKm: Number(df.dutyStartMeter) || 0,
            endKm: Number(df.dutyEndMeter) || undefined,
            startDateTime: startDateTime || undefined,
            endDateTime: endDateTime || undefined,
            toll: Number(df.toll) || 0,
            parking: Number(df.parking) || 0,
            nightCharges: calcNightCharges,
            driverAllowance: calcDriverAllowance,
            extraCharges: calcExtraCharges,
            stateTax: Number(df.stateTax) || 0,
            mcd: Number(df.mcdToll) || 0,
            status: patchStatus,
            employeeId: df.employeeId || undefined,
            pickupLocation: df.pickupLocation || df.reportingAt || undefined,
            dropLocation: df.dropLocation || undefined,
            tripType:
              df.dutyType === "O" || df.dutyType === "T"
                ? "OUTSTATION"
                : isFlexibleDuty
                  ? "HOURLY_RENTAL"
                  : "LOCAL",
            // ── Snapshot fields also saved in second PATCH ──
            packageKm: createPackageKm || undefined,
            packageHours: createPackageHours || undefined,
            pricingSnapshot,
          }),
        });
      }

      // If CLOSED, register/close the Trip record
      if (targetStatus === "CLOSED") {
        const subtotal =
          calcBaseFare +
          calcExtraKm +
          calcExtraHours +
          Number(df.toll || 0) +
          Number(df.parking || 0) +
          Number(df.stateTax || 0) +
          Number(df.mcdToll || 0) +
          calcDriverAllowance +
          calcNightCharges +
          calcExtraCharges;

        const totalAmount = subtotal;

        await api.request("/trips", {
          method: "POST",
          body: JSON.stringify({
            dutySlipId: slipId,
            endKm: Number(df.dutyEndMeter),
            startDateTime,
            endDateTime,
            toll: Number(df.toll) || 0,
            parking: Number(df.parking) || 0,
            driverAllowance: calcDriverAllowance,
            nightCharges: calcNightCharges,
            extraCharges: calcExtraCharges,
            stateTax: Number(df.stateTax) || 0,
            mcd: Number(df.mcdToll) || 0,
            baseFareCharged: calcBaseFare,
            extraKmCharged: calcExtraKm,
            extraHoursCharged: calcExtraHours,
            totalAmount: Number(totalAmount) || 0,
          }),
        });
      }

      setIsDirectOpen(false);
      resetDirectForm();
      fetchDutySlips();
    } catch (e: unknown) {
      setFormError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const openUnifiedForm = async (slip: DutySlip) => {
    isRestoringRef.current = true;
    loadAssets();
    setFormError(null);
    setRateCardLoadError(null);
    setEditingSlip(slip);
    setFullCustomer(null);

    const s = splitDT(slip.startDateTime);
    const e = splitDT(slip.endDateTime);
    const rep = splitDT(slip.reportingTime);
    const bDate = splitDT(slip.booking?.pickupDate);

    const resolvedStartDate = s.date || rep.date || bDate.date || "";
    const resolvedStartTime = s.time || rep.time || bDate.time || "09:00";
    const resolvedRepDate = s.date || rep.date || bDate.date || "";
    const resolvedRepTime = s.time || rep.time || bDate.time || "09:00";

    // Fetch customer details to get custom rate cards and tax rates
    let customerObj = null;
    let allCards: RateCard[] = [];
    try {
      if (slip.booking?.customerId) {
        customerObj = await api.request(
          `/customers/${slip.booking.customerId}`,
          { bypassCache: true },
        );
        setFullCustomer(customerObj);
        if (customerObj?.rateCards && Array.isArray(customerObj.rateCards)) {
          allCards = [...customerObj.rateCards];
        }
      }
      if (customerObj) {
        const mappedClientType = getRateClientType(customerObj);
        const res = await api.request(
          `/rate-management/rate-cards?customerId=ALL&clientType=${mappedClientType}&limit=500`,
          { bypassCache: true },
        );
        if (!Array.isArray(res?.data)) {
          throw new Error("Rate-card API returned an invalid response.");
        }
        allCards = [...allCards, ...res.data];
      }
    } catch (err) {
      console.error(err);
      setRateCardLoadError(
        `Could not load applicable rate cards: ${getErrorMessage(err)}`,
      );
    }

    const effectiveAt = getRateEffectiveAt(
      undefined,
      undefined,
      slip.endDateTime ||
        slip.startDateTime ||
        slip.reportingTime ||
        slip.booking?.pickupDate,
    );
    allCards = filterApplicableRateCards(
      allCards,
      customerObj,
      slip.booking?.tripType || "LOCAL",
      effectiveAt,
    );
    setAvailableRateCards(allCards);

    let parsedParticulars: Array<{
      id: string;
      particular: string;
      rate: number;
      quantity?: number;
      amount: number;
    }> = [];
    let isFlex = slip.booking?.tripType === "HOURLY_RENTAL";
    let remarksText = "";
    let savedBillingMode: "N" | "H" | "F" | "C" | "T" | null = null;
    let savedRateCardId: string | null = null;
    let savedCustomPackageId: string | null = null;
    let savedBaseFare: number | null = null;
    let savedExtraKmRate: number | null = null;
    let savedExtraHourRate: number | null = null;
    let savedCarGroup: string | null = null;
    let savedIncludeNightCharges: boolean | null = null;
    let savedNightChargesOnTime: number | null = null;
    let savedIsManualNightCharges: boolean | null = null;
    let savedIncludeDriverAllowance: boolean | null = null;
    let savedDriverAllowance: number | null = null;
    let savedIsManualDriverAllowance: boolean | null = null;

    // ── PRIORITY 1: Read from dedicated DB snapshot columns (most reliable) ──
    if (slip.carGroup) savedCarGroup = slip.carGroup;
    if (slip.rateCardId) savedRateCardId = slip.rateCardId;
    if (
      slip.billingMode === "N" ||
      slip.billingMode === "H" ||
      slip.billingMode === "F" ||
      slip.billingMode === "C" ||
      slip.billingMode === "T"
    )
      savedBillingMode = slip.billingMode;
    if (typeof slip.baseFare === "number" && slip.baseFare > 0)
      savedBaseFare = slip.baseFare;
    if (typeof slip.extraKmRate === "number" && slip.extraKmRate > 0)
      savedExtraKmRate = slip.extraKmRate;
    if (typeof slip.extraHourRate === "number" && slip.extraHourRate > 0)
      savedExtraHourRate = slip.extraHourRate;

    // ── PRIORITY 2: Parse pricingSnapshot JSON (if available in DB) ──
    if (slip.pricingSnapshot && typeof slip.pricingSnapshot === "object") {
      const snap = slip.pricingSnapshot;
      if (snap.isFlexible && Array.isArray(snap.items)) {
        isFlex = true;
        parsedParticulars = snap.items;
      }
      if (!savedBillingMode && snap.billingMode)
        savedBillingMode = snap.billingMode;
      if (!savedRateCardId && snap.rateCardId)
        savedRateCardId = snap.rateCardId;
      if (!savedCustomPackageId && snap.customPackageId) {
        savedCustomPackageId = snap.customPackageId;
      }
      if (!savedCarGroup && snap.carGroup) savedCarGroup = snap.carGroup;
      if (savedBaseFare === null && typeof snap.baseFare === "number")
        savedBaseFare = snap.baseFare;
      if (savedExtraKmRate === null && typeof snap.extraKmRate === "number")
        savedExtraKmRate = snap.extraKmRate;
      if (savedExtraHourRate === null && typeof snap.extraHourRate === "number")
        savedExtraHourRate = snap.extraHourRate;
      if (typeof snap.includeNightCharges === "boolean")
        savedIncludeNightCharges = snap.includeNightCharges;
      if (typeof snap.nightChargesOnTime === "number")
        savedNightChargesOnTime = snap.nightChargesOnTime;
      if (typeof snap.isManualNightCharges === "boolean")
        savedIsManualNightCharges = snap.isManualNightCharges;
      if (typeof snap.includeDriverAllowance === "boolean")
        savedIncludeDriverAllowance = snap.includeDriverAllowance;
      if (typeof snap.driverAllowance === "number")
        savedDriverAllowance = snap.driverAllowance;
      if (typeof snap.isManualDriverAllowance === "boolean")
        savedIsManualDriverAllowance = snap.isManualDriverAllowance;
      remarksText = snap.userNotes || slip.remarks || "";
    } else {
      // ── PRIORITY 3: Fallback — parse legacy JSON from booking.remarks ──
      const rawRemarks = slip.remarks || slip.booking?.remarks || "";
      try {
        if (rawRemarks.trim().startsWith("{")) {
          const obj: PricingSnapshot = JSON.parse(rawRemarks);
          if (obj.isFlexible && Array.isArray(obj.items)) {
            isFlex = true;
            parsedParticulars = obj.items;
          }
          if (!savedBillingMode && obj.billingMode)
            savedBillingMode = obj.billingMode;
          if (!savedRateCardId && obj.rateCardId)
            savedRateCardId = obj.rateCardId;
          if (!savedCustomPackageId && obj.customPackageId) {
            savedCustomPackageId = obj.customPackageId;
          }
          if (!savedCarGroup && obj.carGroup) savedCarGroup = obj.carGroup;
          if (savedBaseFare === null && typeof obj.baseFare === "number")
            savedBaseFare = obj.baseFare;
          if (savedExtraKmRate === null && typeof obj.extraKmRate === "number")
            savedExtraKmRate = obj.extraKmRate;
          if (
            savedExtraHourRate === null &&
            typeof obj.extraHourRate === "number"
          )
            savedExtraHourRate = obj.extraHourRate;
          if (typeof obj.includeNightCharges === "boolean")
            savedIncludeNightCharges = obj.includeNightCharges;
          if (typeof obj.nightChargesOnTime === "number")
            savedNightChargesOnTime = obj.nightChargesOnTime;
          if (typeof obj.isManualNightCharges === "boolean")
            savedIsManualNightCharges = obj.isManualNightCharges;
          if (typeof obj.includeDriverAllowance === "boolean")
            savedIncludeDriverAllowance = obj.includeDriverAllowance;
          if (typeof obj.driverAllowance === "number")
            savedDriverAllowance = obj.driverAllowance;
          if (typeof obj.isManualDriverAllowance === "boolean")
            savedIsManualDriverAllowance = obj.isManualDriverAllowance;
          remarksText = obj.userNotes || "";
        } else {
          remarksText = rawRemarks;
        }
      } catch {
        remarksText = rawRemarks;
      }
    }

    setCustomParticulars(parsedParticulars);

    const targetCategory =
      savedCarGroup ||
      slip.booking?.vehicleTypeRequired ||
      slip.vehicle?.vehicleType ||
      "";
    const cardsForCategory = filterApplicableRateCards(
      allCards,
      customerObj,
      slip.booking?.tripType || "LOCAL",
      effectiveAt,
      targetCategory,
    );
    const matchedRc =
      cardsForCategory.find((card) => card.id === savedRateCardId) ||
      cardsForCategory.find(
        (card) => card.customerId === slip.booking?.customerId,
      ) ||
      cardsForCategory[0] ||
      null;
    setSelectedRateCard(matchedRc || null);

    const customerTaxRate = customerObj
      ? Number(customerObj.cgstRate || 0) +
        Number(customerObj.sgstRate || 0) +
        Number(customerObj.igstRate || 0)
      : Number(slip.booking?.customer?.cgstRate || 0) +
        Number(slip.booking?.customer?.sgstRate || 0) +
        Number(slip.booking?.customer?.igstRate || 0);

    const actKm = slip.trip
      ? Number(slip.trip.totalKm || 0)
      : Math.max(0, (Number(slip.endKm) || 0) - (Number(slip.startKm) || 0));
    const actHrs = slip.trip ? Number(slip.trip.totalHours || 0) : 0;

    const isPickupTransfer =
      slip.booking?.pickupType === "airport" ||
      slip.booking?.pickupType === "railway";
    const isOutstation = slip.booking?.tripType === "OUTSTATION";

    let resolvedBillingMode: "N" | "H" | "F" | "C" | "T" = "F";
    if (isFlex) {
      resolvedBillingMode = "N";
    } else if (isOutstation) {
      resolvedBillingMode = "N";
    } else if (isPickupTransfer) {
      resolvedBillingMode = "T";
    } else if (savedBillingMode) {
      resolvedBillingMode = savedBillingMode;
    } else {
      const hasCustom = !!(
        matchedRc &&
        ((Number(matchedRc.fullKm || matchedRc.minKm) !== 80 &&
          Number(matchedRc.fullKm || matchedRc.minKm) !== 40) ||
          (Number(matchedRc.fullHr || matchedRc.minHr) !== 8 &&
            Number(matchedRc.fullHr || matchedRc.minHr) !== 4) ||
          !!matchedRc.customerId)
      );
      resolvedBillingMode = hasCustom ? "C" : "F";
    }

    const hasClosedTrip = !!slip.trip;

    const rawNightCharge = Number(
      slip.nightCharges || slip.trip?.nightChargesCharged || 0,
    );
    const resolvedIncludeNight =
      savedIncludeNightCharges !== null
        ? savedIncludeNightCharges
        : rawNightCharge > 0;
    const resolvedNightCharge =
      savedNightChargesOnTime !== null
        ? savedNightChargesOnTime
        : rawNightCharge > 0
          ? rawNightCharge
          : isOutstation
            ? Number(
                matchedRc?.outstationNightCharge || matchedRc?.nightCharge,
              ) || 200
            : Number(matchedRc?.nightCharge) || 200;
    const resolvedIsManualNight =
      savedIsManualNightCharges !== null
        ? savedIsManualNightCharges
        : hasClosedTrip ||
          rawNightCharge > 0 ||
          savedIncludeNightCharges !== null;

    const rawDA = Number(
      slip.driverAllowance || slip.trip?.driverAllowance || 0,
    );
    const resolvedIncludeDA =
      savedIncludeDriverAllowance !== null
        ? savedIncludeDriverAllowance
        : rawDA > 0 || isOutstation;
    const resolvedDriverAllowance =
      savedDriverAllowance !== null
        ? savedDriverAllowance
        : rawDA > 0
          ? rawDA
          : Number(matchedRc?.driverAllowance) || 250;
    const resolvedIsManualDA =
      savedIsManualDriverAllowance !== null
        ? savedIsManualDriverAllowance
        : hasClosedTrip || rawDA > 0 || savedIncludeDriverAllowance !== null;

    const editGuestName = (
      slip.guestName ||
      slip.booking?.guestName ||
      ""
    ).trim();
    const editGuestSalutation = editGuestName
      ? slip.guestSalutation || slip.booking?.guestSalutation || "Mr"
      : "Mr";

    // Resolved carGroup: DB snapshot > booking vehicleTypeRequired > vehicle type
    const resolvedCarGroup =
      savedCarGroup ||
      slip.booking?.vehicleTypeRequired ||
      slip.vehicle?.vehicleType ||
      matchedRc?.vehicleCategory?.name ||
      "";

    setDf({
      customerType: slip.booking?.customer ? "regular" : "new",
      modeOfPayment: slip.booking?.modeOfPayment || "Credit",
      modeOfReservation: slip.booking?.modeOfReservation || "Email",
      clientType:
        customerObj?.clientType ||
        slip.booking?.customer?.clientType ||
        "COMPANY",
      customerId: slip.booking?.customerId || "",
      state: "",
      city: "",
      address:
        customerObj?.billingAddress ||
        slip.booking?.customer?.billingAddress ||
        "",
      phone: customerObj?.phone || slip.booking?.customer?.phone || "",
      bookingBy: slip.booking?.bookingBy || "",
      guestSalutation: editGuestSalutation,
      guestName: editGuestName,
      reportingAt: slip.pickupLocation || "",
      fileCode: slip.booking?.fileCode || "",
      employeeId: slip.employeeId || "",
      reportingDate: resolvedRepDate,
      reportingTime: resolvedRepTime,
      pickupType:
        slip.booking?.pickupType === "airport" ||
        slip.booking?.pickupType === "railway" ||
        slip.booking?.pickupType === "hotel"
          ? slip.booking.pickupType
          : "other",
      vehicleId: slip.vehicleId || "",
      carGroup: resolvedCarGroup,
      carName: slip.vehicle?.model || "",
      carFrom: "",
      driverId: slip.driverId || "",
      pickupLocation: slip.pickupLocation || "",
      dropLocation: slip.dropLocation || "",
      remarks: remarksText,
      dutyStartDate: resolvedStartDate,
      dutyStartTime: resolvedStartTime,
      dutyStartMeter: Number(slip.startKm) || 0,
      dutyEndDate: e.date || "",
      dutyEndTime: e.time || "",
      dutyEndMeter: Number(slip.endKm) || 0,
      actualKm: actKm,
      billedKm: actKm,
      actualHours: actHrs,
      billedHours: actHrs,
      dayHours: 0,
      nightHours: 0,
      clientAdvance: 0,
      clientRemarks: "",
      serviceTax: customerTaxRate || 5,
      parking: Number(slip.parking) || 0,
      toll: Number(slip.toll) || 0,
      mcdToll: Number(slip.mcd) || 0,
      stateTax: Number(slip.stateTax) || 0,
      driverAdvance: 0,
      driverAllowance: resolvedIncludeDA ? resolvedDriverAllowance : 0,
      driverAllowanceDays: 1,
      driverAllowanceRate:
        resolvedIncludeDA && resolvedDriverAllowance > 0
          ? resolvedDriverAllowance
          : Number(matchedRc?.driverAllowance) || 300,
      driverRefund: 0,
      feedbackPoint: "",
      driverRemark: "",
      dutyType: isFlex ? "FLEXIBLE" : isOutstation ? "O" : "L",
      tourCode: "",
      localBill: "",
      nightChargesOnTime: resolvedIncludeNight ? resolvedNightCharge : 0,
      nightUnits: 1,
      nightRate: resolvedNightCharge || 200,
      billingMode: resolvedBillingMode,
      customPackageId: savedCustomPackageId || "",
      extraCharges: Number(slip.extraCharges) || 0,
      manualDriverName: "",
      manualDriverPhone: "",
      manualVehicleNumber: "",
      manualVehicleModel: "",

      // Override values — DB snapshot takes priority over calculated values
      baseFare: hasClosedTrip
        ? Number(slip.trip?.baseFareCharged)
        : savedBaseFare !== null
          ? savedBaseFare
          : resolvedBillingMode === "H" || resolvedBillingMode === "T"
            ? Number(matchedRc?.halfDayRate) || 1000
            : resolvedBillingMode === "C"
              ? Number(matchedRc?.fullDayRate || matchedRc?.halfDayRate) || 2000
              : Number(matchedRc?.fullDayRate) || 1600,
      extraKmRate:
        savedExtraKmRate !== null
          ? savedExtraKmRate
          : Number(matchedRc?.extraKmRate || 12),
      extraHourRate:
        savedExtraHourRate !== null
          ? savedExtraHourRate
          : Number(matchedRc?.extraHourRate || 100),
      extraKmCharged: hasClosedTrip ? Number(slip.trip?.extraKmCharged) : 0,
      extraHoursCharged: hasClosedTrip
        ? Number(slip.trip?.extraHoursCharged)
        : 0,
      includeDriverAllowance: resolvedIncludeDA,
      includeNightCharges: resolvedIncludeNight,
      // Mark rates as "manual" so the reactive calculator won't overwrite them
      isManualBaseFare: hasClosedTrip || savedBaseFare !== null,
      isManualExtraKmRate: savedExtraKmRate !== null,
      isManualExtraHourRate: savedExtraHourRate !== null,
      isManualExtraKmCharged: hasClosedTrip,
      isManualExtraHoursCharged: hasClosedTrip,
      isManualDriverAllowance: resolvedIsManualDA,
      isManualNightCharges: resolvedIsManualNight,
    });

    // Release the restore guard after a short tick so React flushes state before effects run
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 100);

    setIsDirectOpen(true);
  };

  const openEdit = (slip: DutySlip) => {
    openUnifiedForm(slip);
  };

  const openClose = (slip: DutySlip) => {
    openUnifiedForm(slip);
    // pre-populate close inputs if empty
    setDf((f) => ({
      ...f,
      dutyEndDate: f.dutyEndDate || new Date().toISOString().split("T")[0],
      dutyEndTime: f.dutyEndTime || "18:00",
      dutyEndMeter: f.dutyEndMeter || Number(f.dutyStartMeter) + 50,
    }));
  };

  const downloadPdf = async (id: string, num: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/duty-slips/${id}/pdf`,
        {
          headers: { Authorization: `Bearer ${api.getToken()}` },
        },
      );
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DS-${num}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert(getErrorMessage(e));
    }
  };

  const previewPdf = async (id: string, num: string) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/duty-slips/${id}/pdf`,
        {
          headers: { Authorization: `Bearer ${api.getToken()}` },
        },
      );
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewTitle(`Duty Slip: ${num}`);
    } catch (e: unknown) {
      alert(getErrorMessage(e));
    } finally {
      setPreviewLoading(false);
    }
  };

  if (!user) return null;
  const canEdit = user.role !== "BILLING_EXECUTIVE";

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Duty Slips</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage trip sheets, log travel data and close duties
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                loadAssets();
                setBookingForm({
                  bookingId: "",
                  reportingDate: "",
                  reportingTime: "",
                  startKm: 0,
                  employeeId: "",
                });
                setFormError(null);
                setIsBookingDrawerOpen(true);
              }}
              className="py-2 px-4 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 shadow-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              From Booking
            </button>
            <button
              onClick={() => {
                loadAssets();
                resetDirectForm();
                setIsDirectOpen(true);
              }}
              className="py-2 px-5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Create Duty Slip
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchDutySlips();
          }}
          className="relative flex-1 max-w-xs"
        >
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search slip, booking, driver..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
          />
        </form>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {["ALL", "DRAFT", "FILLED", "CLOSED"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setFilterStatus(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${filterStatus === s ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
            Loading duty slips…
          </div>
        ) : dutySlips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <svg
              className="w-10 h-10 opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <p className="text-sm font-medium">No duty slips found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[
                    "Slip No.",
                    "Booking",
                    "Customer",
                    "Guest Name",
                    "Driver",
                    "Vehicle",
                    "Reporting Date & Time",
                    "Status",
                    "KM",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dutySlips.map((slip) => (
                  <tr
                    key={slip.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 text-xs">
                      {slip.dutySlipNumber}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                      {slip.booking?.bookingNumber || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800 truncate max-w-[140px]">
                        {slip.booking?.customer?.name}
                      </div>
                      {slip.employeeId && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {slip.employeeId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
                      {(() => {
                        const gName = (
                          slip.guestName ||
                          slip.booking?.guestName ||
                          ""
                        ).trim();
                        const gSal = (
                          slip.guestSalutation ||
                          slip.booking?.guestSalutation ||
                          ""
                        ).trim();
                        if (!gName)
                          return <span className="text-slate-400">—</span>;
                        return (
                          <div className="truncate max-w-[120px] font-semibold text-slate-800">
                            {gSal ? `${gSal} ` : ""}
                            {gName}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 text-xs">
                      {slip.driver?.name || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-slate-600">
                      {slip.vehicle?.vehicleNumber || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      <div className="text-slate-800 font-medium">
                        {fmtDate(
                          slip.startDateTime ||
                            slip.reportingTime ||
                            slip.booking?.pickupDate,
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        {fmtTime(
                          slip.startDateTime ||
                            slip.reportingTime ||
                            slip.booking?.pickupDate,
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${STATUS_STYLES[slip.status]}`}
                      >
                        {slip.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                      {slip.startKm} {slip.endKm ? `→ ${slip.endKm}` : ""}
                    </td>
                    <td className="px-4 py-3.5">
                      {canEdit && (
                        <div className="flex items-center gap-1 justify-end">
                          {slip.status !== "CLOSED" && (
                            <button
                              onClick={() => openClose(slip)}
                              className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                            >
                              Close Duty
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(slip)}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              previewPdf(slip.id, slip.dutySlipNumber)
                            }
                            className="px-2 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition inline-flex items-center gap-1 cursor-pointer"
                            title="Preview PDF"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-3.5 h-3.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                              />
                            </svg>
                            Preview
                          </button>
                          <button
                            onClick={() =>
                              downloadPdf(slip.id, slip.dutySlipNumber)
                            }
                            className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                            title="Download PDF"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeletingSlip(slip)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                            title="Delete Duty Slip"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                              />
                            </svg>
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
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              ← Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
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
                <h3 className="text-base font-bold text-slate-900">
                  Create from Booking
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate a duty slip from an assigned booking
                </p>
              </div>
              <button
                onClick={() => setIsBookingDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formError}
              </div>
            )}

            <form
              onSubmit={handleBookingCreate}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              <Field label="Select Assigned Booking *">
                {loadingBookings ? (
                  <div className="text-sm text-slate-500 py-2">
                    Loading bookings…
                  </div>
                ) : (
                  <select
                    required
                    value={bookingForm.bookingId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const found = assignedBookings.find(
                        (b) => b.id === selectedId,
                      );
                      if (found) {
                        const dt = splitDT(
                          found.pickupDate || found.pickupTime,
                        );
                        setBookingForm((f) => ({
                          ...f,
                          bookingId: selectedId,
                          reportingDate:
                            dt.date ||
                            f.reportingDate ||
                            new Date().toISOString().split("T")[0],
                          reportingTime: dt.time || f.reportingTime || "09:00",
                          employeeId: found.employeeId || f.employeeId || "",
                        }));
                      } else {
                        setBookingForm((f) => ({
                          ...f,
                          bookingId: selectedId,
                        }));
                      }
                    }}
                    className={sel}
                  >
                    <option value="">— Choose Booking —</option>
                    {assignedBookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bookingNumber} · {b.customer?.name}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Driver and vehicle are inherited from the active assignment.
                </p>
              </Field>

              <Field label="Reporting Date & Time *">
                <div className="flex gap-2">
                  <div className="w-2/3">
                    <DatePicker
                      value={bookingForm.reportingDate}
                      onChange={(val) =>
                        setBookingForm((f) => ({ ...f, reportingDate: val }))
                      }
                      format="DD/MM/YYYY"
                      placeholder="DD/MM/YYYY"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="HH:mm"
                    maxLength={5}
                    required
                    value={bookingForm.reportingTime}
                    onChange={(e) =>
                      setBookingForm((f) => ({
                        ...f,
                        reportingTime: handleTimeChange(e.target.value),
                      }))
                    }
                    className={inp + " w-1/3"}
                  />
                </div>
              </Field>

              <Field label="Start Odometer (KM) *">
                <input
                  type="number"
                  required
                  min={0}
                  value={bookingForm.startKm || ""}
                  onChange={(e) =>
                    setBookingForm((f) => ({
                      ...f,
                      startKm: parseInt(e.target.value) || 0,
                    }))
                  }
                  className={inp + " font-mono"}
                  placeholder="e.g. 12540"
                />
              </Field>

              <Field label="Employee ID (optional)">
                <input
                  type="text"
                  value={bookingForm.employeeId}
                  onChange={(e) =>
                    setBookingForm((f) => ({
                      ...f,
                      employeeId: e.target.value,
                    }))
                  }
                  className={inp}
                  placeholder="EMP-001"
                />
              </Field>
            </form>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setIsBookingDrawerOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBookingCreate}
                disabled={submitting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60"
              >
                {submitting ? "Creating…" : "Create Duty Slip"}
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
              <button
                type="button"
                onClick={() => {
                  setIsDirectOpen(false);
                  setEditingSlip(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                  />
                </svg>
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingSlip
                    ? `Edit Duty Slip: ${editingSlip.dutySlipNumber}`
                    : "Create Duty Slip"}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingSlip
                    ? "Update slip details, operational metrics, or finalize charges to close duty"
                    : "Direct creation without prior booking"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDirectOpen(false);
                  setEditingSlip(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={(e) => handleUnifiedSave(e)}
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60"
              >
                {submitting
                  ? "Saving…"
                  : editingSlip
                    ? "Update Slip"
                    : "Save as Draft"}
              </button>
              {df.dutyEndDate && df.dutyEndTime && df.dutyEndMeter > 0 && (
                <button
                  type="button"
                  onClick={(e) => handleUnifiedSave(e, true)}
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60 shadow-sm flex items-center gap-1.5"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  Close & Finalize Duty
                </button>
              )}
            </div>
          </div>

          {formError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shrink-0">
              {formError}
            </div>
          )}

          {/* Form Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-6 max-w-[1500px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ─── LEFT COLUMN: Operational Inputs (7/12) ─── */}
            <div className="lg:col-span-7 space-y-6">
              {/* Customer Information Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 rounded-t-xl">
                  <h3 className="text-sm font-bold text-slate-700">
                    Customer & Profile
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Customer *">
                      {editingSlip ? (
                        <div className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800">
                          {editingSlip.booking?.customer?.name || "—"}
                        </div>
                      ) : (
                        <select
                          required
                          value={df.customerId}
                          onChange={(e) =>
                            setDf((f) => ({ ...f, customerId: e.target.value }))
                          }
                          className={sel}
                        >
                          <option value="">— Select Customer —</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                    <Field label="Client Type">
                      <select
                        value={df.clientType}
                        onChange={(e) =>
                          setDf((f) => ({ ...f, clientType: e.target.value }))
                        }
                        className={sel}
                      >
                        {["COMPANY", "INDIVIDUAL", "TRAVEL_COMPANY"].map(
                          (o) => (
                            <option key={o} value={o}>
                              {o.replace("_", " ")}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Phone / Mobile">
                      <input
                        type="tel"
                        value={df.phone}
                        onChange={(e) =>
                          setDf((f) => ({ ...f, phone: e.target.value }))
                        }
                        className={inp}
                        placeholder="+91 98765 43210"
                      />
                    </Field>
                    <Field label="Full Address">
                      <input
                        type="text"
                        value={df.address}
                        onChange={(e) =>
                          setDf((f) => ({ ...f, address: e.target.value }))
                        }
                        className={inp}
                        placeholder="Billing Address"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Booking By">
                      <input
                        type="text"
                        value={df.bookingBy}
                        onChange={(e) =>
                          setDf((f) => ({ ...f, bookingBy: e.target.value }))
                        }
                        className={inp}
                        placeholder="Booked By"
                      />
                    </Field>
                    <Field label="File Code">
                      <input
                        type="text"
                        value={df.fileCode}
                        onChange={(e) =>
                          setDf((f) => ({ ...f, fileCode: e.target.value }))
                        }
                        className={inp}
                        placeholder="FC-001"
                      />
                    </Field>
                    <Field label="Employee ID">
                      <input
                        type="text"
                        value={df.employeeId}
                        onChange={(e) =>
                          setDf((f) => ({ ...f, employeeId: e.target.value }))
                        }
                        className={inp}
                        placeholder="EMP-001"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                        Salutation
                      </label>
                      <select
                        value={df.guestSalutation}
                        onChange={(e) =>
                          setDf((f) => ({
                            ...f,
                            guestSalutation: e.target.value,
                          }))
                        }
                        className={sel}
                      >
                        {["Mr", "Ms", "Mrs", "Dr", "Prof"].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <Field label="Guest / Passenger Name">
                        <input
                          type="text"
                          value={df.guestName}
                          onChange={(e) =>
                            setDf((f) => ({ ...f, guestName: e.target.value }))
                          }
                          className={inp}
                          placeholder="Guest / Passenger Name (e.g. Mr John Doe)"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver & Vehicle Information Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 rounded-t-xl">
                  <h3 className="text-sm font-bold text-slate-700">
                    Vehicle & Driver
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  {/* Vehicle Section */}
                  <div
                    className={
                      df.vehicleId === "MANUAL"
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                        : "grid grid-cols-1 md:grid-cols-3 gap-4"
                    }
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Vehicle *
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setDf((f) => ({
                              ...f,
                              vehicleId:
                                f.vehicleId === "MANUAL" ? "" : "MANUAL",
                            }))
                          }
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                        >
                          {df.vehicleId === "MANUAL"
                            ? "← Select Registered"
                            : "+ Direct Cab / Manual"}
                        </button>
                      </div>
                      <select
                        required
                        value={df.vehicleId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const v = vehicles.find((v) => v.id === val);
                          setDf((f) => ({
                            ...f,
                            vehicleId: val,
                            carName:
                              v?.model ||
                              (val === "MANUAL" ? f.manualVehicleModel : ""),
                            // Only set carGroup from vehicle's physical type if carGroup is empty
                            // Do NOT override existing commercial category (e.g. SUV) with physical type (e.g. Sedan)
                            carGroup: f.carGroup || v?.vehicleType || "",
                          }));
                        }}
                        className={sel}
                      >
                        <option value="">— Choose Vehicle —</option>
                        <option value="MANUAL">
                          + Direct Cab / Manual Vehicle
                        </option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.vehicleNumber} ({v.model})
                          </option>
                        ))}
                      </select>
                    </div>
                    {df.vehicleId === "MANUAL" ? (
                      <>
                        <Field label="Direct Cab / Vehicle Number *">
                          <input
                            type="text"
                            required
                            value={df.manualVehicleNumber}
                            onChange={(e) =>
                              setDf((f) => ({
                                ...f,
                                manualVehicleNumber: e.target.value,
                              }))
                            }
                            className={inp}
                            placeholder="e.g. DL1CA9999"
                          />
                        </Field>
                        <Field label="Car Group / Category *">
                          <select
                            required
                            value={df.carGroup}
                            onChange={(e) =>
                              setDf((f) => ({ ...f, carGroup: e.target.value }))
                            }
                            className={sel}
                          >
                            <option value="">— Select Category —</option>
                            {availableCarGroups.map((groupName) => (
                              <option key={groupName} value={groupName}>
                                {groupName}
                              </option>
                            ))}
                          </select>
                          {rateCardLoadError ? (
                            <p
                              role="alert"
                              className="mt-1 text-xs text-red-600"
                            >
                              {rateCardLoadError}
                            </p>
                          ) : df.customerId &&
                            availableRateCards.length === 0 ? (
                            <p className="mt-1 text-xs text-amber-700">
                              No active, effective rate card is available for
                              this customer. Add a matching rate card before
                              closing.
                            </p>
                          ) : null}
                        </Field>
                        <Field label="Vehicle Model *">
                          <input
                            type="text"
                            required
                            value={df.manualVehicleModel}
                            onChange={(e) =>
                              setDf((f) => ({
                                ...f,
                                manualVehicleModel: e.target.value,
                                carName: e.target.value,
                              }))
                            }
                            className={inp}
                            placeholder="e.g. Toyota Innova Crysta"
                          />
                        </Field>
                      </>
                    ) : (
                      <>
                        <Field label="Car Group">
                          <select
                            value={df.carGroup}
                            onChange={(e) =>
                              setDf((f) => ({ ...f, carGroup: e.target.value }))
                            }
                            className={sel}
                          >
                            <option value="">— Select —</option>
                            {availableCarGroups.map((groupName) => (
                              <option key={groupName} value={groupName}>
                                {groupName}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Car Name">
                          <input
                            type="text"
                            value={df.carName}
                            onChange={(e) =>
                              setDf((f) => ({ ...f, carName: e.target.value }))
                            }
                            className={inp}
                            placeholder="e.g. Innova Crysta"
                          />
                        </Field>
                      </>
                    )}
                  </div>

                  {/* Driver & Reporting Time Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Driver *
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setDf((f) => ({
                              ...f,
                              driverId: f.driverId === "MANUAL" ? "" : "MANUAL",
                            }))
                          }
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                        >
                          {df.driverId === "MANUAL"
                            ? "← Select Registered"
                            : "+ Manual Driver"}
                        </button>
                      </div>
                      <select
                        required
                        value={df.driverId}
                        onChange={(e) =>
                          setDf((f) => ({ ...f, driverId: e.target.value }))
                        }
                        className={sel}
                      >
                        <option value="">— Select Driver —</option>
                        <option value="MANUAL">+ Manual Driver</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} · {d.mobile}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <Field label="Reporting Date & Time *">
                        <div className="grid grid-cols-2 gap-2">
                          <DatePicker
                            value={df.reportingDate}
                            onChange={(val) =>
                              setDf((f) => ({
                                ...f,
                                reportingDate: val,
                                dutyStartDate: f.dutyStartDate || val,
                              }))
                            }
                            format="DD/MM/YYYY"
                            placeholder="DD/MM/YYYY"
                            required
                          />
                          <input
                            type="text"
                            placeholder="HH:mm"
                            maxLength={5}
                            required
                            value={df.reportingTime}
                            onChange={(e) => {
                              const timeVal = handleTimeChange(e.target.value);
                              setDf((f) => ({
                                ...f,
                                reportingTime: timeVal,
                                dutyStartTime: f.dutyStartTime || timeVal,
                              }));
                            }}
                            className={inp}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* Manual Driver Fields Row */}
                  {df.driverId === "MANUAL" && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 animate-fade-in">
                      <Field label="Driver Name *">
                        <input
                          type="text"
                          required
                          value={df.manualDriverName}
                          onChange={(e) =>
                            setDf((f) => ({
                              ...f,
                              manualDriverName: e.target.value,
                            }))
                          }
                          className={inp}
                          placeholder="e.g. Vijay Singh"
                        />
                      </Field>
                      <Field label="Driver Mobile (Optional)">
                        <input
                          type="text"
                          value={df.manualDriverPhone}
                          onChange={(e) =>
                            setDf((f) => ({
                              ...f,
                              manualDriverPhone: e.target.value,
                            }))
                          }
                          className={inp}
                          placeholder="e.g. 9876543210 (Optional)"
                        />
                      </Field>
                    </div>
                  )}

                  {/* Route & Passenger Details Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <Field label="Pickup Location">
                      <input
                        type="text"
                        value={df.pickupLocation}
                        onChange={(e) =>
                          setDf((f) => ({
                            ...f,
                            pickupLocation: e.target.value,
                          }))
                        }
                        className={inp}
                        placeholder="IGI Airport T3"
                      />
                    </Field>
                    <Field label="Drop Location">
                      <input
                        type="text"
                        value={df.dropLocation}
                        onChange={(e) =>
                          setDf((f) => ({ ...f, dropLocation: e.target.value }))
                        }
                        className={inp}
                        placeholder="Connaught Place"
                      />
                    </Field>
                    <Field label="Guest Name">
                      <input
                        type="text"
                        value={df.guestName}
                        onChange={(e) =>
                          setDf((f) => ({ ...f, guestName: e.target.value }))
                        }
                        className={inp}
                        placeholder="Passenger Name"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Duty Timestamps & Meters */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 rounded-t-xl">
                  <h3 className="text-sm font-bold text-slate-700">
                    Duty Start & Closure Metrics
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3 p-4 bg-blue-50/40 rounded-xl border border-blue-100/40">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        Start Metrics
                      </p>
                      <Field label="Start Date">
                        <DatePicker
                          value={df.dutyStartDate}
                          onChange={(val) =>
                            setDf((f) => ({ ...f, dutyStartDate: val }))
                          }
                          format="DD/MM/YYYY"
                          placeholder="DD/MM/YYYY"
                        />
                      </Field>
                      <Field label="Start Time">
                        <input
                          type="text"
                          placeholder="HH:mm"
                          maxLength={5}
                          value={df.dutyStartTime}
                          onChange={(e) =>
                            setDf((f) => ({
                              ...f,
                              dutyStartTime: handleTimeChange(e.target.value),
                            }))
                          }
                          className={inp}
                        />
                      </Field>
                      <Field label="Start Meter (KM)">
                        <input
                          type="number"
                          min={0}
                          value={df.dutyStartMeter || ""}
                          onChange={(e) =>
                            setDf((f) => ({
                              ...f,
                              dutyStartMeter: parseInt(e.target.value) || 0,
                            }))
                          }
                          className={inp + " font-mono"}
                        />
                      </Field>
                    </div>
                    <div className="space-y-3 p-4 bg-emerald-50/40 rounded-xl border border-emerald-100/40">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        End Metrics
                      </p>
                      <Field label="End Date">
                        <DatePicker
                          value={df.dutyEndDate}
                          onChange={(val) =>
                            setDf((f) => ({ ...f, dutyEndDate: val }))
                          }
                          format="DD/MM/YYYY"
                          placeholder="DD/MM/YYYY"
                        />
                      </Field>
                      <Field label="End Time">
                        <input
                          type="text"
                          placeholder="HH:mm"
                          maxLength={5}
                          value={df.dutyEndTime}
                          onChange={(e) =>
                            setDf((f) => ({
                              ...f,
                              dutyEndTime: handleTimeChange(e.target.value),
                            }))
                          }
                          className={inp}
                        />
                      </Field>
                      <Field label="End Meter (KM)">
                        <input
                          type="number"
                          min={0}
                          value={df.dutyEndMeter || ""}
                          onChange={(e) =>
                            setDf((f) => ({
                              ...f,
                              dutyEndMeter: parseInt(e.target.value) || 0,
                            }))
                          }
                          className={inp + " font-mono"}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <Field label="Actual KM">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={df.actualKm || ""}
                        onChange={(e) =>
                          setDf((f) => ({
                            ...f,
                            actualKm: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className={inp + " font-mono bg-slate-50"}
                      />
                    </Field>
                    <Field label="Billed KM">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={df.billedKm || ""}
                        onChange={(e) =>
                          setDf((f) => ({
                            ...f,
                            billedKm: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className={inp + " font-mono"}
                      />
                    </Field>
                    <Field label="Actual Hrs">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={df.actualHours || ""}
                        onChange={(e) =>
                          setDf((f) => ({
                            ...f,
                            actualHours: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className={inp + " font-mono bg-slate-50"}
                      />
                    </Field>
                    <Field label="Billed Hrs">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={df.billedHours || ""}
                        onChange={(e) =>
                          setDf((f) => ({
                            ...f,
                            billedHours: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className={inp + " font-mono"}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Day Hours">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={df.dayHours || ""}
                        onChange={(e) =>
                          setDf((f) => ({
                            ...f,
                            dayHours: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className={inp + " font-mono bg-slate-50"}
                      />
                    </Field>
                    <Field label="Night Hours">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={df.nightHours || ""}
                        onChange={(e) =>
                          setDf((f) => ({
                            ...f,
                            nightHours: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className={inp + " font-mono bg-slate-50"}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Duty Type Configuration */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 rounded-t-xl">
                  <h3 className="text-sm font-bold text-slate-700">
                    Trip & Billing Mode
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <Field label="Service / Billing Option *">
                      {(() => {
                        const customKm =
                          Number(selectedRateCard?.fullKm) ||
                          Number(selectedRateCard?.minKm) ||
                          Number(selectedRateCard?.includedKm) ||
                          0;
                        const customHr =
                          Number(selectedRateCard?.fullHr) ||
                          Number(selectedRateCard?.minHr) ||
                          0;
                        const customFare =
                          Number(selectedRateCard?.fullDayRate) ||
                          Number(selectedRateCard?.halfDayRate) ||
                          0;

                        const halfDayFare =
                          Number(selectedRateCard?.halfDayRate) || 0;
                        const halfDayKm = Number(selectedRateCard?.minKm) || 0;
                        const halfDayHr = Number(selectedRateCard?.minHr) || 0;

                        const fullDayKm =
                          Number(selectedRateCard?.fullKm) ||
                          Number(selectedRateCard?.includedKm) ||
                          Number(selectedRateCard?.minKm) ||
                          0;
                        const fullDayHr =
                          Number(selectedRateCard?.fullHr) ||
                          Number(selectedRateCard?.minHr) ||
                          0;
                        const fullDayFare =
                          Number(selectedRateCard?.fullDayRate) || 0;

                        const outstationMinKm =
                          Number(selectedRateCard?.minKmPerDay) || 0;
                        const outstationRate =
                          Number(selectedRateCard?.outstationRatePerKm) || 0;

                        const currentOptionVal =
                          df.dutyType === "FLEXIBLE"
                            ? "flexible_duty"
                            : df.dutyType === "O" || df.dutyType === "T"
                              ? "outstation"
                              : df.billingMode === "C"
                                ? "custom_package"
                                : df.billingMode === "H"
                                  ? "local_half_day"
                                  : df.billingMode === "T" ||
                                      df.pickupType === "airport" ||
                                      df.pickupType === "railway"
                                    ? "transfer"
                                    : df.billingMode === "F"
                                      ? "local_full_day"
                                      : "local_full_day";
                        const currentOptionIsAvailable =
                          (currentOptionVal === "custom_package" &&
                            !isOutstationBooking &&
                            supportsLocalRate) ||
                          (currentOptionVal === "local_full_day" &&
                            supportsFullDay) ||
                          (currentOptionVal === "local_half_day" &&
                            supportsHalfDay) ||
                          (currentOptionVal === "transfer" &&
                            supportsHalfDay) ||
                          (currentOptionVal === "outstation" &&
                            isOutstationBooking &&
                            supportsOutstationRate) ||
                          (currentOptionVal === "flexible_duty" &&
                            (isOutstationBooking
                              ? supportsOutstationRate
                              : supportsLocalRate));

                        return (
                          <>
                            <select
                              value={
                                currentOptionIsAvailable ? currentOptionVal : ""
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setDf((f) => {
                                  const baseUpdates = {
                                    ...f,
                                    isManualBaseFare: false,
                                    isManualExtraKmCharged: false,
                                    isManualExtraHoursCharged: false,
                                  };
                                  if (val === "flexible_duty") {
                                    if (customParticulars.length === 0) {
                                      setCustomParticulars([
                                        {
                                          id: "item_" + Date.now(),
                                          particular: "",
                                          rate: 0,
                                          amount: 0,
                                        },
                                      ]);
                                    }
                                    return {
                                      ...baseUpdates,
                                      dutyType: "FLEXIBLE",
                                      billingMode: "N",
                                      pickupType: "other",
                                    };
                                  } else if (val === "outstation") {
                                    return {
                                      ...baseUpdates,
                                      dutyType: "O",
                                      billingMode: "N",
                                      pickupType: "other",
                                    };
                                  } else if (val === "custom_package") {
                                    return {
                                      ...baseUpdates,
                                      dutyType: "L",
                                      billingMode: "C",
                                      customPackageId: "",
                                      pickupType: "other",
                                    };
                                  } else if (val === "local_half_day") {
                                    return {
                                      ...baseUpdates,
                                      dutyType: "L",
                                      billingMode: "H",
                                      pickupType: "other",
                                    };
                                  } else if (val === "transfer") {
                                    return {
                                      ...baseUpdates,
                                      dutyType: "L",
                                      billingMode: "T",
                                      pickupType: "airport",
                                    };
                                  } else {
                                    return {
                                      ...baseUpdates,
                                      dutyType: "L",
                                      billingMode: "F",
                                      pickupType: "other",
                                    };
                                  }
                                });
                              }}
                              className={sel}
                            >
                              <option value="" disabled>
                                {selectedRateCardIsAvailable
                                  ? "Select an applicable rate"
                                  : "No active rate card for this customer and vehicle category"}
                              </option>
                              {!isOutstationBooking && supportsLocalRate && (
                                <option value="custom_package">
                                  Custom Rate Card{" "}
                                  {selectedRateCard
                                    ? `(${selectedRateCard.vehicleCategory?.name || ""} - ${customKm} KM / ${customHr} Hrs @ ₹${customFare.toLocaleString("en-IN")})`
                                    : ""}
                                </option>
                              )}
                              {supportsFullDay && (
                                <option value="local_full_day">
                                  Local Full Day ({fullDayKm} KM / {fullDayHr}{" "}
                                  Hrs) - ₹{fullDayFare.toLocaleString("en-IN")}
                                </option>
                              )}
                              {supportsHalfDay && (
                                <option value="local_half_day">
                                  Local Half Day ({halfDayKm} KM / {halfDayHr}{" "}
                                  Hrs) - ₹{halfDayFare.toLocaleString("en-IN")}
                                </option>
                              )}
                              {supportsHalfDay && (
                                <option value="transfer">
                                  Transfer (Airport / Railway) - ₹
                                  {halfDayFare.toLocaleString("en-IN")}
                                </option>
                              )}
                              {isOutstationBooking &&
                                supportsOutstationRate && (
                                  <option value="outstation">
                                    Outstation ({outstationMinKm} KM/Day @ ₹
                                    {outstationRate}/km)
                                  </option>
                                )}
                              {(isOutstationBooking
                                ? supportsOutstationRate
                                : supportsLocalRate) && (
                                <option value="flexible_duty">
                                  Flexible Duty Slip (Manual Particulars)
                                </option>
                              )}
                            </select>

                            {/* Applied Rate Card Selector - ONLY shown below when Custom Rate Card is selected */}
                            {currentOptionVal === "custom_package" &&
                              cardsForSelectedCategory.length > 0 && (
                                <div className="mt-4">
                                  <Field label="Applied Rate Card">
                                    <select
                                      value={selectedRateCard?.id || ""}
                                      onChange={(e) => {
                                        const card =
                                          cardsForSelectedCategory.find(
                                            (c) => c.id === e.target.value,
                                          );
                                        if (card) {
                                          setSelectedRateCard(card);
                                          setDf((f) => ({
                                            ...f,
                                            carGroup:
                                              card.vehicleCategory?.name ||
                                              f.carGroup,
                                            billingMode: "C",
                                            customPackageId:
                                              card.customPackages?.[0]?.id ||
                                              "",
                                            baseFare: Number(
                                              card.customPackages?.[0]?.rate ||
                                                card.fullDayRate ||
                                                card.halfDayRate ||
                                                0,
                                            ),
                                            driverAllowance:
                                              Number(card.driverAllowance) || 0,
                                            nightChargesOnTime:
                                              df.dutyType === "O" ||
                                              df.dutyType === "T"
                                                ? Number(
                                                    card.outstationNightCharge ||
                                                      card.nightCharge,
                                                  ) || 0
                                                : Number(card.nightCharge) || 0,
                                            isManualBaseFare: false,
                                            isManualExtraKmCharged: false,
                                            isManualExtraHoursCharged: false,
                                          }));
                                        }
                                      }}
                                      className={sel}
                                    >
                                      {cardsForSelectedCategory.map((rc) => {
                                        const customPackages =
                                          rc.customPackages || [];
                                        const packageSummary =
                                          customPackages.length > 0
                                            ? `${customPackages.length} custom packages`
                                            : `${Number(rc.fullKm) || Number(rc.minKm) || Number(rc.includedKm)}km / ${Number(rc.fullHr) || Number(rc.minHr)}hr @ ₹${Number(rc.fullDayRate || rc.halfDayRate).toLocaleString("en-IN")}`;
                                        const isCustomerCard = !!rc.customerId;
                                        return (
                                          <option key={rc.id} value={rc.id}>
                                            {rc.vehicleCategory?.name} •{" "}
                                            {packageSummary}{" "}
                                            {isCustomerCard
                                              ? "(Company Custom)"
                                              : "(Default)"}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </Field>
                                  {selectedRateCard?.customPackages &&
                                    selectedRateCard.customPackages.length >
                                      0 && (
                                      <Field label="Custom Package">
                                        <select
                                          value={df.customPackageId}
                                          onChange={(event) => {
                                            const ratePackage =
                                              selectedRateCard.customPackages?.find(
                                                (item) =>
                                                  item.id ===
                                                  event.target.value,
                                              );
                                            if (ratePackage) {
                                              setDf((current) => ({
                                                ...current,
                                                customPackageId: ratePackage.id,
                                                baseFare: Number(
                                                  ratePackage.rate,
                                                ),
                                                isManualBaseFare: false,
                                                isManualExtraKmCharged: false,
                                                isManualExtraHoursCharged: false,
                                              }));
                                            }
                                          }}
                                          className={sel}
                                        >
                                          <option value="">
                                            Select package
                                          </option>
                                          {selectedRateCard.customPackages.map(
                                            (ratePackage) => (
                                              <option
                                                key={ratePackage.id}
                                                value={ratePackage.id}
                                              >
                                                {ratePackage.includedKm} KM /{" "}
                                                {ratePackage.includedHours} Hrs
                                                — ₹
                                                {Number(
                                                  ratePackage.rate,
                                                ).toLocaleString("en-IN")}
                                              </option>
                                            ),
                                          )}
                                        </select>
                                      </Field>
                                    )}
                                </div>
                              )}
                          </>
                        );
                      })()}
                    </Field>
                  </div>

                  {/* Available Rate Details Summary Panel */}
                  {selectedRateCard && df.dutyType !== "FLEXIBLE" && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Rate Details •{" "}
                          {selectedRateCard.vehicleCategory?.name || "Standard"}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${selectedRateCard.customerId ? "bg-indigo-100 text-indigo-800" : "bg-slate-200 text-slate-700"}`}
                        >
                          {selectedRateCard.customerId
                            ? "Company Custom Rate"
                            : "Standard Rate Card"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                          <span className="text-[10px] text-slate-500 block">
                            Base Package
                          </span>
                          <span className="font-bold text-slate-800">
                            ₹
                            {df.billingMode === "H" || df.billingMode === "T"
                              ? (
                                  Number(selectedRateCard.halfDayRate) || 1000
                                ).toLocaleString("en-IN")
                              : df.billingMode === "C"
                                ? (
                                    Number(
                                      selectedCustomPackage?.rate ||
                                        selectedRateCard.fullDayRate ||
                                        selectedRateCard.halfDayRate,
                                    ) || 2000
                                  ).toLocaleString("en-IN")
                                : (
                                    Number(selectedRateCard.fullDayRate) || 1600
                                  ).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-blue-600 block font-semibold">
                            {df.billingMode === "H" || df.billingMode === "T"
                              ? `${Number(selectedRateCard.minKm) || 40} km / ${Number(selectedRateCard.minHr) || 4} hr`
                              : df.billingMode === "C"
                                ? `${Number(selectedCustomPackage?.includedKm || selectedRateCard.fullKm || selectedRateCard.minKm || selectedRateCard.includedKm) || 120} km / ${Number(selectedCustomPackage?.includedHours || selectedRateCard.fullHr || selectedRateCard.minHr) || 12} hr`
                                : `80 km / 8 hr`}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                          <span className="text-[10px] text-slate-500 block">
                            Extra KM Rate
                          </span>
                          <span className="font-bold text-slate-800 font-mono">
                            ₹
                            {Number(selectedRateCard.extraKmRate || 12).toFixed(
                              0,
                            )}
                            /km
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                          <span className="text-[10px] text-slate-500 block">
                            Extra Hour Rate
                          </span>
                          <span className="font-bold text-slate-800 font-mono">
                            ₹
                            {Number(
                              selectedRateCard.extraHourRate || 100,
                            ).toFixed(0)}
                            /hr
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                          <span className="text-[10px] text-slate-500 block">
                            Night / DA
                          </span>
                          <span className="font-bold text-slate-800 font-mono">
                            Night: ₹
                            {Number(
                              selectedRateCard.nightCharge || 200,
                            ).toFixed(0)}
                          </span>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            DA: ₹
                            {Number(
                              selectedRateCard.driverAllowance || 250,
                            ).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {df.dutyType === "FLEXIBLE" && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Custom Particulars
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            Add custom particulars (e.g. Local Duty, Driver
                            Bata, Night Allowance)
                          </span>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                              <th className="py-2.5 px-3">Particular Name</th>
                              <th className="py-2.5 px-2 text-right w-28">
                                Rate (₹)
                              </th>
                              <th className="py-2.5 px-2 text-right w-28">
                                Amount (₹)
                              </th>
                              <th className="py-2.5 px-2 text-center w-12">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {customParticulars.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={row.particular}
                                    onChange={(e) =>
                                      handleUpdateParticular(
                                        row.id,
                                        "particular",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="e.g. Local Duty / Driver Bata"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min={0}
                                    value={row.rate || ""}
                                    onChange={(e) =>
                                      handleUpdateParticular(
                                        row.id,
                                        "rate",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-right font-mono text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min={0}
                                    value={row.amount || ""}
                                    onChange={(e) =>
                                      handleUpdateParticular(
                                        row.id,
                                        "amount",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-right font-mono font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveParticular(row.id)
                                    }
                                    className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                                    title="Delete row"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={2}
                                      stroke="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                      />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleAddParticularRow}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                            className="w-3.5 h-3.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4.5v15m7.5-7.5h-15"
                            />
                          </svg>
                          + Add Particular Row
                        </button>
                        <div className="text-xs font-semibold text-slate-700">
                          Particulars Subtotal:{" "}
                          <span className="font-mono text-blue-600 font-bold text-sm">
                            ₹
                            {customParticulars
                              .reduce(
                                (sum, r) => sum + Number(r.amount || 0),
                                0,
                              )
                              .toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Remarks / Internal Notes">
                      <input
                        type="text"
                        value={df.remarks}
                        onChange={(e) =>
                          setDf((f) => ({ ...f, remarks: e.target.value }))
                        }
                        className={inp}
                      />
                    </Field>
                    <Field label="Tour Code (optional)">
                      <input
                        type="text"
                        value={df.tourCode}
                        onChange={(e) =>
                          setDf((f) => ({ ...f, tourCode: e.target.value }))
                        }
                        className={inp}
                        placeholder="TC-001"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── RIGHT COLUMN: Rate Reference & Interactive Billing (5/12) ─── */}
            <div className="lg:col-span-5 space-y-6">
              {/* Rate Card Reference Panel */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Rate Card Reference
                </h4>
                <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                  <span className="text-slate-500">Customer Rate Plan</span>
                  <span className="font-semibold text-slate-800 text-right truncate">
                    {df.customerId
                      ? selectedRateCard
                        ? selectedRateCard.name || "Custom Rate Plan"
                        : "Standard Rate Card"
                      : "—"}
                  </span>
                  <span className="text-slate-500">Package Type</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {liveBillingPreview?.packageType || "Local (8h / 80k)"}
                  </span>
                  <span className="text-slate-500">Included Distance</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {liveBillingPreview?.includedKm || 80} KM
                  </span>
                  <span className="text-slate-500">Included Hours</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {liveBillingPreview?.includedHours || 8} Hrs
                  </span>
                </div>
              </div>

              {/* Interactive live Billing Breakup */}
              {liveBillingPreview && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-slate-800">
                  {/* Clean Header */}
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        OPERATIONAL BILLING BREAKUP
                      </h3>
                    </div>
                    <span className="text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                      Editable
                    </span>
                  </div>

                  <div className="p-5 space-y-4 text-xs divide-y divide-slate-100">
                    {df.dutyType === "FLEXIBLE" ? (
                      /* Flexible Duty Custom Line Items Section */
                      <div className="space-y-4 pt-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                              Custom Particulars
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Entered in the form on the left
                            </span>
                          </div>
                        </div>

                        {customParticulars.length === 0 ? (
                          <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                            No custom line items added yet. Fill in particulars
                            on the left.
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                                  <th className="p-2.5">Particular</th>
                                  <th className="p-2.5 text-right">Rate</th>
                                  <th className="p-2.5 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {customParticulars.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-slate-50/50"
                                  >
                                    <td className="p-2.5 font-medium text-slate-800">
                                      {item.particular || "—"}
                                    </td>
                                    <td className="p-2.5 text-right font-mono text-slate-600">
                                      ₹{Number(item.rate || 0).toFixed(2)}
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-semibold text-slate-800">
                                      ₹{Number(item.amount || 0).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Tolls, Taxes & Additional Charges */}
                        <div className="pt-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                            Tolls, Taxes & Additional Charges
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[11px] font-medium text-slate-600">
                                Parking
                              </span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={df.parking || ""}
                                onChange={(e) =>
                                  setDf((f) => ({
                                    ...f,
                                    parking: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-right font-mono font-semibold text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[11px] font-medium text-slate-600">
                                Tolls
                              </span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={df.toll || ""}
                                onChange={(e) =>
                                  setDf((f) => ({
                                    ...f,
                                    toll: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-right font-mono font-semibold text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[11px] font-medium text-slate-600">
                                State Tax
                              </span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={df.stateTax || ""}
                                onChange={(e) =>
                                  setDf((f) => ({
                                    ...f,
                                    stateTax: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-right font-mono font-semibold text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[11px] font-medium text-slate-600">
                                MCD Toll
                              </span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={df.mcdToll || ""}
                                onChange={(e) =>
                                  setDf((f) => ({
                                    ...f,
                                    mcdToll: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-right font-mono font-semibold text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Misc Extra Charges */}
                        <div className="flex items-center justify-between pt-3">
                          <span className="text-slate-700 font-medium">
                            Misc Extra Charges (₹)
                          </span>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={df.extraCharges || ""}
                            onChange={(e) =>
                              setDf((f) => ({
                                ...f,
                                extraCharges: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-right text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Standard Rate Card Breakup Rows */
                      <>
                        {/* Base Fare Row */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-700 font-medium">
                            Base Fare (₹)
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={df.baseFare || ""}
                            onChange={(e) =>
                              setDf((f) => ({
                                ...f,
                                baseFare: parseFloat(e.target.value) || 0,
                                isManualBaseFare: true,
                              }))
                            }
                            className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-right text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                          />
                        </div>

                        {/* Extra KM Row */}
                        <div className="flex flex-col gap-2 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-700 font-medium">
                              Extra KM Charges
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400">
                                Rate: ₹
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={df.extraKmRate || ""}
                                onChange={(e) =>
                                  setDf((f) => ({
                                    ...f,
                                    extraKmRate:
                                      parseFloat(e.target.value) || 0,
                                    isManualExtraKmRate: true,
                                  }))
                                }
                                className="w-14 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center font-mono text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
                              />
                              <span className="text-[11px] text-slate-400">
                                /KM
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pl-2 border-l-2 border-slate-200">
                            <span className="text-[11px] text-slate-400">
                              {df.billedKm > liveBillingPreview.includedKm
                                ? `(${df.billedKm - liveBillingPreview.includedKm} KM extra)`
                                : "(No extra KM)"}
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={df.extraKmCharged || ""}
                              onChange={(e) =>
                                setDf((f) => ({
                                  ...f,
                                  extraKmCharged:
                                    parseFloat(e.target.value) || 0,
                                  isManualExtraKmCharged: true,
                                }))
                              }
                              className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-right text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                            />
                          </div>
                        </div>

                        {/* Extra Hours Row */}
                        <div className="flex flex-col gap-2 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-700 font-medium">
                              Extra Hours Charges
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400">
                                Rate: ₹
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={df.extraHourRate || ""}
                                onChange={(e) =>
                                  setDf((f) => ({
                                    ...f,
                                    extraHourRate:
                                      parseFloat(e.target.value) || 0,
                                    isManualExtraHourRate: true,
                                  }))
                                }
                                className="w-14 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center font-mono text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
                              />
                              <span className="text-[11px] text-slate-400">
                                /Hr
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pl-2 border-l-2 border-slate-200">
                            <span className="text-[11px] text-slate-400">
                              {df.billedHours > liveBillingPreview.includedHours
                                ? `(${(df.billedHours - liveBillingPreview.includedHours).toFixed(1)} Hrs extra)`
                                : "(No extra hours)"}
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={df.extraHoursCharged || ""}
                              onChange={(e) =>
                                setDf((f) => ({
                                  ...f,
                                  extraHoursCharged:
                                    parseFloat(e.target.value) || 0,
                                  isManualExtraHoursCharged: true,
                                }))
                              }
                              className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-right text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                            />
                          </div>
                        </div>

                        {/* Driver Allowance Row */}
                        <div className="pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={df.includeDriverAllowance}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setDf((f) => {
                                    const fallbackRate =
                                      f.dutyType === "O" || f.dutyType === "T"
                                        ? selectedRateCard
                                          ? Number(
                                              selectedRateCard.driverAllowance,
                                            ) || 300
                                          : 300
                                        : selectedRateCard
                                          ? Number(
                                              selectedRateCard.driverAllowance,
                                            ) || 250
                                          : 250;
                                    const days =
                                      f.driverAllowanceDays > 0
                                        ? f.driverAllowanceDays
                                        : 1;
                                    const rate =
                                      f.driverAllowanceRate > 0
                                        ? f.driverAllowanceRate
                                        : fallbackRate;
                                    return {
                                      ...f,
                                      includeDriverAllowance: checked,
                                      driverAllowanceDays: days,
                                      driverAllowanceRate: rate,
                                      driverAllowance: checked
                                        ? days * rate
                                        : 0,
                                      isManualDriverAllowance: true,
                                    };
                                  });
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                              />
                              <span className="text-slate-700 font-medium">
                                Driver Allowance
                              </span>
                            </label>
                            <div className="text-xs font-semibold text-slate-700">
                              Total:{" "}
                              <span className="font-mono text-blue-700 font-bold">
                                ₹
                                {df.includeDriverAllowance
                                  ? (df.driverAllowance || 0).toLocaleString(
                                      "en-IN",
                                    )
                                  : "0"}
                              </span>
                            </div>
                          </div>

                          {df.includeDriverAllowance && (
                            <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 mt-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                  Days / Count
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={df.driverAllowanceDays || 1}
                                  onChange={(e) => {
                                    const days = Math.max(
                                      1,
                                      parseInt(e.target.value) || 1,
                                    );
                                    setDf((f) => ({
                                      ...f,
                                      driverAllowanceDays: days,
                                      driverAllowance:
                                        days * (f.driverAllowanceRate || 0),
                                      isManualDriverAllowance: true,
                                    }));
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                                  placeholder="1"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                  Rate (₹ / Day)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={df.driverAllowanceRate || 0}
                                  onChange={(e) => {
                                    const rate = Math.max(
                                      0,
                                      parseFloat(e.target.value) || 0,
                                    );
                                    setDf((f) => ({
                                      ...f,
                                      driverAllowanceRate: rate,
                                      driverAllowance:
                                        (f.driverAllowanceDays || 1) * rate,
                                      isManualDriverAllowance: true,
                                    }));
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                                  placeholder="300"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Night Allowance Row */}
                        <div className="pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={df.includeNightCharges}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setDf((f) => {
                                    const fallbackRate =
                                      f.dutyType === "O" || f.dutyType === "T"
                                        ? selectedRateCard
                                          ? Number(
                                              selectedRateCard.outstationNightCharge ||
                                                selectedRateCard.nightCharge,
                                            ) || 200
                                          : 200
                                        : selectedRateCard
                                          ? Number(
                                              selectedRateCard.nightCharge,
                                            ) || 200
                                          : 200;
                                    const units =
                                      f.nightUnits > 0 ? f.nightUnits : 1;
                                    const rate =
                                      f.nightRate > 0
                                        ? f.nightRate
                                        : fallbackRate;
                                    return {
                                      ...f,
                                      includeNightCharges: checked,
                                      nightUnits: units,
                                      nightRate: rate,
                                      nightChargesOnTime: checked
                                        ? units * rate
                                        : 0,
                                      isManualNightCharges: true,
                                    };
                                  });
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                              />
                              <span className="text-slate-700 font-medium">
                                Night Allowance
                              </span>
                            </label>
                            <div className="text-xs font-semibold text-slate-700">
                              Total:{" "}
                              <span className="font-mono text-blue-700 font-bold">
                                ₹
                                {df.includeNightCharges
                                  ? (df.nightChargesOnTime || 0).toLocaleString(
                                      "en-IN",
                                    )
                                  : "0"}
                              </span>
                            </div>
                          </div>

                          {df.includeNightCharges && (
                            <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 mt-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                  Night Units / Count
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={df.nightUnits || 1}
                                  onChange={(e) => {
                                    const units = Math.max(
                                      1,
                                      parseInt(e.target.value) || 1,
                                    );
                                    setDf((f) => ({
                                      ...f,
                                      nightUnits: units,
                                      nightChargesOnTime:
                                        units * (f.nightRate || 0),
                                      isManualNightCharges: true,
                                    }));
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                                  placeholder="1"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                  Rate (₹ / Night)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={df.nightRate || 0}
                                  onChange={(e) => {
                                    const rate = Math.max(
                                      0,
                                      parseFloat(e.target.value) || 0,
                                    );
                                    setDf((f) => ({
                                      ...f,
                                      nightRate: rate,
                                      nightChargesOnTime:
                                        (f.nightUnits || 1) * rate,
                                      isManualNightCharges: true,
                                    }));
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                                  placeholder="200"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Incidentals 2x2 Grid */}
                        <div className="pt-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[11px] font-medium text-slate-600">
                                Parking
                              </span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={df.parking || ""}
                                onChange={(e) =>
                                  setDf((f) => ({
                                    ...f,
                                    parking: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-18 bg-white border border-slate-200 rounded px-2 py-1 text-right font-mono font-semibold text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[11px] font-medium text-slate-600">
                                Tolls
                              </span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={df.toll || ""}
                                onChange={(e) =>
                                  setDf((f) => ({
                                    ...f,
                                    toll: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-18 bg-white border border-slate-200 rounded px-2 py-1 text-right font-mono font-semibold text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[11px] font-medium text-slate-600">
                                State Tax
                              </span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={df.stateTax || ""}
                                onChange={(e) =>
                                  setDf((f) => ({
                                    ...f,
                                    stateTax: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-18 bg-white border border-slate-200 rounded px-2 py-1 text-right font-mono font-semibold text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[11px] font-medium text-slate-600">
                                MCD Toll
                              </span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={df.mcdToll || ""}
                                onChange={(e) =>
                                  setDf((f) => ({
                                    ...f,
                                    mcdToll: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-18 bg-white border border-slate-200 rounded px-2 py-1 text-right font-mono font-semibold text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Misc Extra Charges */}
                        <div className="flex items-center justify-between pt-3">
                          <span className="text-slate-700 font-medium">
                            Misc Extra Charges (₹)
                          </span>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={df.extraCharges || ""}
                            onChange={(e) =>
                              setDf((f) => ({
                                ...f,
                                extraCharges: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-right text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                          />
                        </div>
                      </>
                    )}

                    {/* Grand Total Row */}
                    <div className="flex justify-between items-center pt-4 pb-1 text-sm border-t border-slate-200">
                      <span className="text-slate-800 font-bold tracking-tight uppercase">
                        GRAND TOTAL
                      </span>
                      <span className="font-mono text-emerald-600 font-bold text-lg">
                        ₹{fmt(liveBillingPreview.totalAmount)}
                      </span>
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
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h4a2 2 0 002-2V5a2 2 0 00-2-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M5 5a3 3 0 00-3 3v8a3 3 0 003 3h8a3 3 0 003-3V8a3 3 0 00-3-3H5zm4 4a1 1 0 11-2 0 1 1 0 012 0zm-1 4a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="font-bold text-sm tracking-wide">
                  {previewTitle}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = previewPdfUrl;
                    a.download = `${previewTitle.replace(/: /g, "-")}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {/* Iframe preview */}
            <div className="flex-1 bg-slate-100 p-2">
              <iframe
                src={`${previewPdfUrl}#toolbar=0`}
                className="w-full h-full rounded-lg border border-slate-200"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* PDF Loading Overlay */}
      {previewLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl flex items-center gap-3 border border-slate-100">
            <svg
              className="animate-spin h-5 w-5 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Generating PDF Preview...
            </span>
          </div>
        </div>
      )}

      {/* Delete Duty Slip Modal */}
      {deletingSlip && (
        <div
          onClick={() => setDeletingSlip(null)}
          className="fixed inset-0 bg-slate-900/60 z-[99999] flex items-center justify-center p-4 min-h-screen overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative z-[100000]"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Delete Duty Slip
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {deletingSlip.dutySlipNumber}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete duty slip{" "}
              <strong className="text-slate-800 font-mono">
                {deletingSlip.dutySlipNumber}
              </strong>
              ? This action will remove unbilled logs and revert linked
              booking/driver assignments.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSlip(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await api.request(`/duty-slips/${deletingSlip.id}`, {
                      method: "DELETE",
                    });
                    setDeletingSlip(null);
                    fetchDutySlips();
                  } catch (err: unknown) {
                    alert(
                      getErrorMessage(err) || "Failed to delete duty slip.",
                    );
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isDeleting ? "Deleting..." : "Delete Duty Slip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
