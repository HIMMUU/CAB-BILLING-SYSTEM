"use strict";
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  type: string;
  companyName: string | null;
}

interface VehicleCategory {
  id: string;
  name: string;
}

interface CustomRatePackage {
  id: string;
  includedKm: number;
  includedHours: number;
  rate: number;
}

interface RateCard {
  id: string;
  customerId: string | null;
  clientType: string;
  vehicleCategoryId: string;
  halfDayRate: string | number;
  fullDayRate: string | number;
  includedKm: string | number;
  minHr?: string | number;
  minKm?: string | number;
  fullHr?: string | number;
  fullKm?: string | number;
  extraKmRate: string | number;
  extraHourRate: string | number;
  minKmPerDay: string | number;
  outstationRatePerKm: string | number;
  driverAllowance: string | number;
  nightCharge: string | number;
  outstationNightCharge?: string | number;
  nightStartTime: string | null;
  nightEndTime: string | null;
  effectiveFrom: string;
  status: string;
  customer?: Customer | null;
  vehicleCategory: VehicleCategory;
  customPackages?: CustomRatePackage[] | null;
}

interface TaxConfiguration {
  id: string;
  taxName: string;
  cgst: string | number;
  sgst: string | number;
  igst: string | number;
  effectiveFrom: string;
  isActive: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  entityName: string;
  entityId: string;
  oldValues: unknown;
  newValues: unknown;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface DashboardUser {
  role?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function RateManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [activeTab, setActiveTab] = useState<"rates" | "taxes">("rates");

  // Shared Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);

  // Rate Cards list & filters
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [ratesSearch, setRatesSearch] = useState("");
  const [filterClientType, setFilterClientType] = useState("ALL");
  const [filterCustomerId, setFilterCustomerId] = useState("ALL");
  const [filterCategoryId, setFilterCategoryId] = useState("ALL");
  const [filterEffectiveDate, setFilterEffectiveDate] = useState("");
  const [ratesPage, setRatesPage] = useState(1);
  const [ratesTotalPages, setRatesTotalPages] = useState(1);

  // Tax Configurations
  const [taxConfigs, setTaxConfigs] = useState<TaxConfiguration[]>([]);
  const [loadingTaxes, setLoadingTaxes] = useState(true);
  const [taxesError, setTaxesError] = useState<string | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Rate Card Drawer State
  const [isRatesDrawerOpen, setIsRatesDrawerOpen] = useState(false);
  const [submittingRate, setSubmittingRate] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateFormError, setRateFormError] = useState<string | null>(null);
  const [rateFormData, setRateFormData] = useState({
    customerId: "",
    clientType: "Company",
    vehicleCategoryId: "",
    halfDayRate: 0,
    fullDayRate: 2000,
    minKm: 40,
    minHr: 4,
    fullKm: 80,
    fullHr: 8,
    extraKmRate: 14,
    extraHourRate: 150,
    minKmPerDay: 250,
    outstationRatePerKm: 15,
    driverAllowance: 250,
    outstationNightCharge: 0,
    nightCharge: 200,
    nightStartTime: "23:00",
    nightEndTime: "05:00",
    customPackages: [] as CustomRatePackage[],
  });

  // Tax Config Drawer State
  const [isTaxesDrawerOpen, setIsTaxesDrawerOpen] = useState(false);
  const [submittingTax, setSubmittingTax] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [taxFormError, setTaxFormError] = useState<string | null>(null);
  const [taxFormData, setTaxFormData] = useState({
    taxName: "",
    cgst: 0,
    sgst: 0,
    igst: 0,
    effectiveFrom: "",
    isActive: false,
  });

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push("/login");
    } else {
      void Promise.resolve().then(() => setUser(currentUser as DashboardUser));
    }
  }, [router]);

  // Load Categories & Customers once
  const loadSharedData = async () => {
    try {
      const [catsRes, custsRes] = await Promise.all([
        api.request("/rate-management/categories"),
        api.request("/customers?limit=100"),
      ]);
      setCategories(catsRes);
      setCustomers(custsRes.data || []);
      if (catsRes.length > 0) {
        setRateFormData((prev) => ({
          ...prev,
          vehicleCategoryId: catsRes[0].id,
        }));
      }
    } catch (e: unknown) {
      console.error("Failed to load configuration list:", e);
    }
  };

  useEffect(() => {
    if (user) {
      void Promise.resolve().then(loadSharedData);
    }
  }, [user]);

  // Fetch Rate Cards
  const fetchRateCards = async () => {
    setLoadingRates(true);
    try {
      let query = `/rate-management/rate-cards?page=${ratesPage}&limit=10`;
      if (ratesSearch) query += `&search=${encodeURIComponent(ratesSearch)}`;
      if (filterClientType !== "ALL")
        query += `&clientType=${filterClientType}`;
      if (filterCustomerId !== "ALL")
        query += `&customerId=${filterCustomerId}`;
      if (filterCategoryId !== "ALL")
        query += `&vehicleCategoryId=${filterCategoryId}`;
      if (filterEffectiveDate) query += `&effectiveDate=${filterEffectiveDate}`;

      const res = await api.request(query);
      setRateCards(res.data);
      setRatesTotalPages(res.meta.totalPages);
      setRatesError(null);
    } catch (err: unknown) {
      setRatesError(getErrorMessage(err, "Failed to load rate cards"));
    } finally {
      setLoadingRates(false);
    }
  };

  // Fetch Tax Configurations
  const fetchTaxConfigs = async () => {
    setLoadingTaxes(true);
    try {
      const res = await api.request("/rate-management/tax-configs");
      setTaxConfigs(res);
      setTaxesError(null);
    } catch (err: unknown) {
      setTaxesError(getErrorMessage(err, "Failed to load tax settings"));
    } finally {
      setLoadingTaxes(false);
    }
  };

  // Load active tab data
  useEffect(() => {
    if (user) {
      if (activeTab === "rates") {
        void Promise.resolve().then(fetchRateCards);
      } else {
        void Promise.resolve().then(fetchTaxConfigs);
      }
    }
  }, [
    user,
    activeTab,
    ratesPage,
    filterClientType,
    filterCustomerId,
    filterCategoryId,
    filterEffectiveDate,
  ]);

  // Trigger search on submit
  const handleRatesSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRatesPage(1);
    fetchRateCards();
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const csvContent = await api.request(
        "/rate-management/rate-cards/export",
      );
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `rate_cards_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Failed to export CSV"));
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.request("/rate-management/audit-logs");
      setAuditLogs(res);
    } catch (err: unknown) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenAuditLogs = () => {
    setShowLogsModal(true);
    fetchAuditLogs();
  };

  // =========================================================================
  // RATE CARD ACTIONS
  // =========================================================================

  const handleOpenCreateRate = () => {
    setEditingRateId(null);
    setRateFormData({
      customerId: "",
      clientType: "Company",
      vehicleCategoryId: categories[0]?.id || "",
      halfDayRate: 0,
      fullDayRate: 2000,
      minKm: 40,
      minHr: 4,
      fullKm: 80,
      fullHr: 8,
      extraKmRate: 14,
      extraHourRate: 150,
      minKmPerDay: 250,
      outstationRatePerKm: 15,
      driverAllowance: 250,
      outstationNightCharge: 0,
      nightCharge: 200,
      nightStartTime: "23:00",
      nightEndTime: "05:00",
      customPackages: [
        {
          id: crypto.randomUUID(),
          includedKm: 100,
          includedHours: 10,
          rate: 0,
        },
        {
          id: crypto.randomUUID(),
          includedKm: 120,
          includedHours: 12,
          rate: 0,
        },
        {
          id: crypto.randomUUID(),
          includedKm: 160,
          includedHours: 16,
          rate: 0,
        },
      ],
    });
    setRateFormError(null);
    setIsRatesDrawerOpen(true);
  };

  const handleOpenEditRate = (rate: RateCard) => {
    setEditingRateId(rate.id);

    setRateFormData({
      customerId: rate.customerId || "",
      clientType: rate.clientType,
      vehicleCategoryId: rate.vehicleCategoryId,
      halfDayRate: Number(rate.halfDayRate || 0),
      fullDayRate: Number(rate.fullDayRate || 0),
      minKm: Number(rate.minKm || 40),
      minHr: Number(rate.minHr || 4),
      fullKm: Number(rate.fullKm || rate.includedKm || 80),
      fullHr: Number(rate.fullHr || 8),
      extraKmRate: Number(rate.extraKmRate || 0),
      extraHourRate: Number(rate.extraHourRate || 0),
      minKmPerDay: Number(rate.minKmPerDay || 250),
      outstationRatePerKm: Number(rate.outstationRatePerKm || 0),
      driverAllowance: Number(rate.driverAllowance || 250),
      outstationNightCharge: 0,
      nightCharge: Number(rate.nightCharge || 200),
      nightStartTime: rate.nightStartTime || "23:00",
      nightEndTime: rate.nightEndTime || "05:00",
      customPackages: Array.isArray(rate.customPackages)
        ? rate.customPackages
        : [],
    });
    setRateFormError(null);
    setIsRatesDrawerOpen(true);
  };

  const handleCloneRate = async (id: string) => {
    if (!confirm("Are you sure you want to clone this rate card?")) return;
    try {
      await api.request(`/rate-management/rate-cards/${id}/clone`, {
        method: "POST",
      });
      fetchRateCards();
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Failed to clone rate card"));
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rate card?")) return;
    try {
      await api.request(`/rate-management/rate-cards/${id}`, {
        method: "DELETE",
      });
      fetchRateCards();
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Failed to delete rate card"));
    }
  };

  const handleRateFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateFormError(null);

    // Form validations
    if (!rateFormData.clientType || !rateFormData.vehicleCategoryId) {
      setRateFormError("Client Type and Vehicle Category are required.");
      return;
    }
    if (rateFormData.customPackages.length > 0 && !rateFormData.customerId) {
      setRateFormError(
        "Select a customer before adding company-specific custom packages.",
      );
      return;
    }

    const hasLocalRates =
      (rateFormData.halfDayRate > 0 &&
        rateFormData.minKm > 0 &&
        rateFormData.minHr > 0) ||
      (rateFormData.fullDayRate > 0 &&
        rateFormData.fullKm > 0 &&
        rateFormData.fullHr > 0);
    const hasCustomPackages =
      rateFormData.customPackages.length > 0 &&
      rateFormData.customPackages.every(
        (ratePackage) =>
          ratePackage.includedKm > 0 &&
          ratePackage.includedHours > 0 &&
          ratePackage.rate > 0,
      );
    const hasOutstationRates =
      rateFormData.minKmPerDay > 0 && rateFormData.outstationRatePerKm > 0;
    if (!hasLocalRates && !hasOutstationRates && !hasCustomPackages) {
      setRateFormError(
        "Enter a valid local, outstation, or custom package with a rate before saving.",
      );
      return;
    }
    if (
      rateFormData.customPackages.some(
        (ratePackage) =>
          ratePackage.includedKm <= 0 ||
          ratePackage.includedHours <= 0 ||
          ratePackage.rate <= 0,
      )
    ) {
      setRateFormError(
        "Each custom package needs positive KM, hours, and rate values.",
      );
      return;
    }

    setSubmittingRate(true);
    try {
      const payload = {
        customerId: rateFormData.customerId || undefined,
        clientType: rateFormData.clientType,
        vehicleCategoryId: rateFormData.vehicleCategoryId,
        halfDayRate: Number(rateFormData.halfDayRate),
        fullDayRate: Number(rateFormData.fullDayRate),
        includedKm: Number(rateFormData.fullKm),
        minKm: Number(rateFormData.minKm),
        fullKm: Number(rateFormData.fullKm),
        minHr: Number(rateFormData.minHr),
        fullHr: Number(rateFormData.fullHr),
        extraKmRate: Number(rateFormData.extraKmRate),
        extraHourRate: Number(rateFormData.extraHourRate),
        minKmPerDay: Number(rateFormData.minKmPerDay),
        outstationRatePerKm: Number(rateFormData.outstationRatePerKm),
        driverAllowance: Number(rateFormData.driverAllowance),
        nightCharge: Number(rateFormData.nightCharge),
        outstationNightCharge: 0,
        nightStartTime: rateFormData.nightStartTime,
        nightEndTime: rateFormData.nightEndTime,
        customPackages: rateFormData.customPackages,
      };

      if (editingRateId) {
        await api.request(`/rate-management/rate-cards/${editingRateId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api.request("/rate-management/rate-cards", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsRatesDrawerOpen(false);
      fetchRateCards();
    } catch (err: unknown) {
      setRateFormError(getErrorMessage(err, "Operation failed"));
    } finally {
      setSubmittingRate(false);
    }
  };

  // =========================================================================
  // TAX CONFIG ACTIONS
  // =========================================================================

  const handleOpenCreateTax = () => {
    setEditingTaxId(null);
    setTaxFormData({
      taxName: "",
      cgst: 2.5,
      sgst: 2.5,
      igst: 5.0,
      effectiveFrom: new Date().toISOString().split("T")[0],
      isActive: false,
    });
    setTaxFormError(null);
    setIsTaxesDrawerOpen(true);
  };

  const handleOpenEditTax = (tax: TaxConfiguration) => {
    setEditingTaxId(tax.id);
    setTaxFormData({
      taxName: tax.taxName,
      cgst: Number(tax.cgst),
      sgst: Number(tax.sgst),
      igst: Number(tax.igst),
      effectiveFrom: new Date(tax.effectiveFrom).toISOString().split("T")[0],
      isActive: tax.isActive,
    });
    setTaxFormError(null);
    setIsTaxesDrawerOpen(true);
  };

  const handleActivateTax = async (id: string) => {
    try {
      await api.request(`/rate-management/tax-configs/${id}/activate`, {
        method: "POST",
      });
      fetchTaxConfigs();
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Failed to activate tax configuration"));
    }
  };

  const handleDeleteTax = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tax configuration?"))
      return;
    try {
      await api.request(`/rate-management/tax-configs/${id}`, {
        method: "DELETE",
      });
      fetchTaxConfigs();
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Failed to delete tax configuration"));
    }
  };

  const handleTaxFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaxFormError(null);

    // Validation
    if (!taxFormData.taxName || !taxFormData.effectiveFrom) {
      setTaxFormError("Tax Name and Effective Date are required.");
      return;
    }

    if (taxFormData.cgst < 0 || taxFormData.sgst < 0 || taxFormData.igst < 0) {
      setTaxFormError("Tax percentages cannot be negative.");
      return;
    }

    setSubmittingTax(true);
    try {
      const payload = {
        taxName: taxFormData.taxName,
        cgst: Number(taxFormData.cgst),
        sgst: Number(taxFormData.sgst),
        igst: Number(taxFormData.igst),
        effectiveFrom: new Date(taxFormData.effectiveFrom).toISOString(),
        isActive: taxFormData.isActive,
      };

      if (editingTaxId) {
        await api.request(`/rate-management/tax-configs/${editingTaxId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api.request("/rate-management/tax-configs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsTaxesDrawerOpen(false);
      fetchTaxConfigs();
    } catch (err: unknown) {
      setTaxFormError(getErrorMessage(err, "Operation failed"));
    } finally {
      setSubmittingTax(false);
    }
  };

  if (!user) return null;

  const canEdit = user.role === "SUPER_ADMIN" || user.role === "OPERATOR_ADMIN";

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans bg-[#F8FAFC] min-h-screen">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Rate & Billing Settings
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Configure client-specific pricing grids, default values, and
            regional tax brackets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAuditLogs}
            className="py-2.5 px-4 bg-white border border-[#E2E8F0] hover:bg-gray-50 text-[#0F172A] font-semibold rounded-lg text-sm transition flex items-center gap-2 shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 text-gray-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            <span>Audit Logs</span>
          </button>

          {activeTab === "rates" ? (
            <>
              <button
                onClick={handleExportCsv}
                className="py-2.5 px-4 bg-white border border-[#E2E8F0] hover:bg-gray-50 text-[#0F172A] font-semibold rounded-lg text-sm transition flex items-center gap-2 shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 text-gray-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                <span>Export CSV</span>
              </button>
              {canEdit && (
                <button
                  onClick={handleOpenCreateRate}
                  className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-sm transition flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  <span>Add Rate Card</span>
                </button>
              )}
            </>
          ) : (
            canEdit && (
              <button
                onClick={handleOpenCreateTax}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-sm transition flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                <span>Add Tax Settings</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-[#E2E8F0] gap-6 mb-6">
        <button
          onClick={() => setActiveTab("rates")}
          className={`pb-3 font-semibold text-sm transition-all relative ${
            activeTab === "rates"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          Rate Cards
        </button>
        <button
          onClick={() => setActiveTab("taxes")}
          className={`pb-3 font-semibold text-sm transition-all relative ${
            activeTab === "taxes"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          Tax Settings
        </button>
      </div>

      {/* =========================================================================
          TAB 1: RATE CARDS
          ========================================================================= */}
      {activeTab === "rates" && (
        <div>
          {/* Filters Row */}
          <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl flex flex-wrap items-center gap-3 shadow-sm mb-6">
            <form
              onSubmit={handleRatesSearchSubmit}
              className="relative w-full md:max-w-xs"
            >
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search rates..."
                value={ratesSearch}
                onChange={(e) => setRatesSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 transition"
              />
            </form>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:flex-1 md:justify-end">
              {/* Client Type Filter */}
              <select
                value={filterClientType}
                onChange={(e) => {
                  setFilterClientType(e.target.value);
                  setRatesPage(1);
                }}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-medium text-[#475569] focus:outline-none focus:border-blue-500 transition"
              >
                <option value="ALL">All Client Types</option>
                <option value="Company">Company</option>
                <option value="Travel Company">Travel Company</option>
                <option value="Individual">Individual</option>
              </select>

              {/* Customer Filter */}
              <select
                value={filterCustomerId}
                onChange={(e) => {
                  setFilterCustomerId(e.target.value);
                  setRatesPage(1);
                }}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-medium text-[#475569] focus:outline-none focus:border-blue-500 transition max-w-[180px]"
              >
                <option value="ALL">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Vehicle Category Filter */}
              <select
                value={filterCategoryId}
                onChange={(e) => {
                  setFilterCategoryId(e.target.value);
                  setRatesPage(1);
                }}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-medium text-[#475569] focus:outline-none focus:border-blue-500 transition"
              >
                <option value="ALL">All Vehicle Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Effective From Date Filter */}
              <input
                type="date"
                value={filterEffectiveDate}
                onChange={(e) => {
                  setFilterEffectiveDate(e.target.value);
                  setRatesPage(1);
                }}
                className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs font-medium text-[#475569] focus:outline-none focus:border-blue-500 transition"
              />

              {/* Reset button */}
              {(filterClientType !== "ALL" ||
                filterCustomerId !== "ALL" ||
                filterCategoryId !== "ALL" ||
                filterEffectiveDate ||
                ratesSearch) && (
                <button
                  onClick={() => {
                    setRatesSearch("");
                    setFilterClientType("ALL");
                    setFilterCustomerId("ALL");
                    setFilterCategoryId("ALL");
                    setFilterEffectiveDate("");
                    setRatesPage(1);
                  }}
                  className="text-xs text-red-600 hover:text-red-700 bg-red-50 border border-red-100 hover:bg-red-100 font-semibold px-3 py-2 rounded-lg transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {ratesError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {ratesError}
            </div>
          )}

          {/* Rates Table Grid */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            {loadingRates ? (
              <div className="p-12 flex justify-center">
                <svg
                  className="animate-spin h-8 w-8 text-blue-600"
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
              </div>
            ) : rateCards.length === 0 ? (
              <div className="p-12 text-center text-[#64748B]">
                No rate cards matching the criteria. Click &quot;Add Rate
                Card&quot; to register new rates.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase bg-[#F8FAFC]">
                      <th className="py-3 px-4">Client Type</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">
                        Half Day Package
                      </th>
                      <th className="py-3 px-4 text-center">
                        Full Day Package
                      </th>
                      <th className="py-3 px-4 text-center">Custom Packages</th>
                      <th className="py-3 px-4 text-center">
                        Outstation (KM / day / rate per KM)
                      </th>
                      <th className="py-3 px-3 text-center">Extra KM</th>
                      <th className="py-3 px-3 text-center">Extra Hour</th>
                      <th className="py-3 px-4 text-center">
                        Local Night Allowance
                      </th>
                      <th className="py-3 px-4">Effective From</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                    {rateCards.map((rc) => {
                      return (
                        <tr
                          key={rc.id}
                          className="hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="py-4 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                                rc.clientType === "Company"
                                  ? "text-indigo-700 bg-indigo-50 border border-indigo-200"
                                  : rc.clientType === "Travel Company"
                                    ? "text-teal-700 bg-teal-50 border border-teal-200"
                                    : "text-amber-700 bg-amber-50 border border-amber-200"
                              }`}
                            >
                              {rc.clientType}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-medium text-[#0F172A]">
                            {rc.customer?.name || (
                              <span className="text-[#94A3B8] italic font-normal">
                                Default (All Clients)
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-semibold text-gray-700">
                            {rc.vehicleCategory.name}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-bold font-mono text-[#0F172A] text-sm">
                              ₹{Number(rc.halfDayRate).toLocaleString("en-IN")}
                            </span>
                            <span className="block text-[11px] text-blue-600 font-semibold mt-0.5">
                              {Number(rc.minKm || 40)} km /{" "}
                              {Number(rc.minHr || 4)} hrs
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-bold font-mono text-[#0F172A] text-sm">
                              ₹{Number(rc.fullDayRate).toLocaleString("en-IN")}
                            </span>
                            <span className="block text-[11px] text-blue-600 font-semibold mt-0.5">
                              {Number(rc.fullKm || rc.includedKm || 80)} km /{" "}
                              {Number(rc.fullHr || 8)} hrs
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {rc.customPackages &&
                            rc.customPackages.length > 0 ? (
                              <div className="space-y-1">
                                {rc.customPackages.map((ratePackage) => (
                                  <div
                                    key={ratePackage.id}
                                    className="whitespace-nowrap text-[11px]"
                                  >
                                    <span className="font-semibold text-[#334155]">
                                      {ratePackage.includedKm} km /{" "}
                                      {ratePackage.includedHours} hr
                                    </span>
                                    <span className="ml-1 text-blue-700">
                                      ₹
                                      {Number(ratePackage.rate).toLocaleString(
                                        "en-IN",
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-bold font-mono text-[#0F172A] text-sm">
                              {Number(rc.minKmPerDay) > 0
                                ? `${Number(rc.minKmPerDay)} km/day`
                                : "—"}
                            </span>
                            <span className="block text-[11px] text-blue-600 font-semibold mt-0.5">
                              {Number(rc.outstationRatePerKm) > 0
                                ? `₹${Number(rc.outstationRatePerKm).toLocaleString("en-IN")}/km`
                                : "No outstation rate"}
                            </span>
                          </td>
                          {/* Extra KM */}
                          <td className="py-4 px-3 text-center font-mono text-[#0F172A]">
                            ₹{Number(rc.extraKmRate).toFixed(0)}/km
                          </td>
                          {/* Extra Hour */}
                          <td className="py-4 px-3 text-center font-mono text-[#0F172A]">
                            ₹{Number(rc.extraHourRate).toFixed(0)}/hr
                          </td>
                          {/* Night Allowance */}
                          <td className="py-4 px-4 text-center text-xs">
                            <span className="font-mono text-[#0F172A] font-semibold">
                              ₹{Number(rc.nightCharge).toFixed(0)}
                            </span>
                            {rc.nightStartTime && (
                              <span className="block text-[10px] text-gray-400 font-sans mt-0.5">
                                {rc.nightStartTime}-{rc.nightEndTime}
                              </span>
                            )}
                          </td>
                          {/* Effective & Status */}
                          <td className="py-4 px-4 text-xs text-[#475569]">
                            {new Date(rc.effectiveFrom).toLocaleDateString(
                              "en-GB",
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                rc.status === "ACTIVE"
                                  ? "text-emerald-700"
                                  : "text-slate-500"
                              }`}
                            >
                              <span
                                className={`inline-block w-2.5 h-2.5 rounded-full ${
                                  rc.status === "ACTIVE"
                                    ? "bg-emerald-500"
                                    : "bg-slate-300"
                                }`}
                              />
                              {rc.status}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="py-4 px-4 text-right space-x-1.5 shrink-0">
                            {canEdit && (
                              <>
                                <button
                                  onClick={() => handleCloneRate(rc.id)}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                                  title="Clone"
                                >
                                  Clone
                                </button>
                                <button
                                  onClick={() => handleOpenEditRate(rc)}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white border border-[#E2E8F0] hover:bg-gray-50 rounded-lg transition"
                                  title="Edit"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRate(rc.id)}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                  title="Delete"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Rates Pagination */}
            {!loadingRates && ratesTotalPages > 1 && (
              <div className="border-t border-[#E2E8F0] px-6 py-4 flex items-center justify-between bg-[#F8FAFC]">
                <button
                  disabled={ratesPage === 1}
                  onClick={() => setRatesPage((p) => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50 transition"
                >
                  Previous
                </button>
                <span className="text-xs text-[#64748B]">
                  Page {ratesPage} of {ratesTotalPages}
                </span>
                <button
                  disabled={ratesPage === ratesTotalPages}
                  onClick={() =>
                    setRatesPage((p) => Math.min(p + 1, ratesTotalPages))
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TAX SETTINGS
          ========================================================================= */}
      {activeTab === "taxes" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          {taxesError && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {taxesError}
            </div>
          )}
          {loadingTaxes ? (
            <div className="p-12 flex justify-center">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
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
            </div>
          ) : taxConfigs.length === 0 ? (
            <div className="p-12 text-center text-[#64748B]">
              No tax configurations found. Click &quot;Add Tax Settings&quot; to
              create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase bg-[#F8FAFC]">
                    <th className="py-3 px-6">Tax Bracket Name</th>
                    <th className="py-3 px-6 text-center">CGST %</th>
                    <th className="py-3 px-6 text-center">SGST %</th>
                    <th className="py-3 px-6 text-center">IGST %</th>
                    <th className="py-3 px-6">Effective Date</th>
                    <th className="py-3 px-6">Active Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                  {taxConfigs.map((tax) => (
                    <tr
                      key={tax.id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${tax.isActive ? "bg-blue-50/20" : ""}`}
                    >
                      <td className="py-4 px-6 font-semibold text-[#0F172A]">
                        {tax.taxName}
                      </td>
                      <td className="py-4 px-6 text-center font-mono text-gray-700">
                        {Number(tax.cgst).toFixed(2)}%
                      </td>
                      <td className="py-4 px-6 text-center font-mono text-gray-700">
                        {Number(tax.sgst).toFixed(2)}%
                      </td>
                      <td className="py-4 px-6 text-center font-mono text-gray-700">
                        {Number(tax.igst).toFixed(2)}%
                      </td>
                      <td className="py-4 px-6 text-xs text-[#475569]">
                        {new Date(tax.effectiveFrom).toLocaleDateString(
                          "en-GB",
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {tax.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active Configuration
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        {canEdit && (
                          <>
                            {!tax.isActive && (
                              <button
                                onClick={() => handleActivateTax(tax.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-100 rounded-lg transition"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditTax(tax)}
                              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white border border-[#E2E8F0] hover:bg-gray-50 rounded-lg transition"
                            >
                              Edit
                            </button>
                            {!tax.isActive && (
                              <button
                                onClick={() => handleDeleteTax(tax.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          DRAWER: RATE CARD FORM
          ========================================================================= */}
      {isRatesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-xl h-full bg-white border-l border-[#E2E8F0] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-left">
            <div>
              <div className="flex items-center justify-between mb-6 border-b border-[#E2E8F0] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    {editingRateId ? "Edit Rate Card" : "Create Rate Card"}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Create custom KM/hour packages and rates for a company and
                    vehicle group. Changes apply immediately.
                  </p>
                </div>
                <button
                  onClick={() => setIsRatesDrawerOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
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

              {rateFormError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {rateFormError}
                </div>
              )}

              <form onSubmit={handleRateFormSubmit} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3 border-b pb-1">
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Client Type
                      </label>
                      <select
                        value={rateFormData.clientType}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            clientType: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      >
                        <option value="Company">Company</option>
                        <option value="Travel Company">Travel Company</option>
                        <option value="Individual">Individual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        Vehicle Category
                      </label>
                      <select
                        value={rateFormData.vehicleCategoryId}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            vehicleCategoryId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 rounded-lg border border-[#BFDBFE] bg-blue-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
                          Custom Packages
                        </h5>
                        <p className="mt-1 text-[11px] text-[#475569]">
                          Configure any included KM, hours, and package rate for
                          this company and vehicle group.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setRateFormData((prev) => ({
                            ...prev,
                            customPackages: [
                              ...prev.customPackages,
                              {
                                id: crypto.randomUUID(),
                                includedKm: 100,
                                includedHours: 10,
                                rate: 0,
                              },
                            ],
                          }))
                        }
                        className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Add Package
                      </button>
                    </div>
                    {rateFormData.customPackages.length === 0 ? (
                      <p className="rounded border border-dashed border-blue-200 bg-white p-3 text-xs text-slate-500">
                        No custom packages added yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {rateFormData.customPackages.map(
                          (ratePackage, index) => (
                            <div
                              key={ratePackage.id}
                              className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded-lg border border-blue-100 bg-white p-3"
                            >
                              <label className="text-[10px] font-bold uppercase text-[#64748B]">
                                Included KM
                                <input
                                  type="number"
                                  min="1"
                                  value={ratePackage.includedKm}
                                  onChange={(event) =>
                                    setRateFormData((prev) => ({
                                      ...prev,
                                      customPackages: prev.customPackages.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                includedKm: Number(
                                                  event.target.value,
                                                ),
                                              }
                                            : item,
                                      ),
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-2 py-2 text-sm font-normal text-[#0F172A]"
                                />
                              </label>
                              <label className="text-[10px] font-bold uppercase text-[#64748B]">
                                Included Hours
                                <input
                                  type="number"
                                  min="1"
                                  value={ratePackage.includedHours}
                                  onChange={(event) =>
                                    setRateFormData((prev) => ({
                                      ...prev,
                                      customPackages: prev.customPackages.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                includedHours: Number(
                                                  event.target.value,
                                                ),
                                              }
                                            : item,
                                      ),
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-2 py-2 text-sm font-normal text-[#0F172A]"
                                />
                              </label>
                              <label className="text-[10px] font-bold uppercase text-[#64748B]">
                                Rate (₹)
                                <input
                                  type="number"
                                  min="0"
                                  value={ratePackage.rate}
                                  onChange={(event) =>
                                    setRateFormData((prev) => ({
                                      ...prev,
                                      customPackages: prev.customPackages.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                rate: Number(
                                                  event.target.value,
                                                ),
                                              }
                                            : item,
                                      ),
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-2 py-2 text-sm font-normal text-[#0F172A]"
                                />
                              </label>
                              <button
                                type="button"
                                aria-label={`Remove package ${index + 1}`}
                                onClick={() =>
                                  setRateFormData((prev) => ({
                                    ...prev,
                                    customPackages: prev.customPackages.filter(
                                      (_, itemIndex) => itemIndex !== index,
                                    ),
                                  }))
                                }
                                className="h-9 rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                        {rateFormData.customPackages.length > 0
                          ? "Customer (Required for custom packages)"
                          : "Customer (Optional)"}
                      </label>
                      <select
                        value={rateFormData.customerId}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            customerId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      >
                        <option value="">
                          Default (All Customers under type)
                        </option>
                        {customers
                          .filter((c) => {
                            if (rateFormData.clientType === "Individual")
                              return c.type === "INDIVIDUAL";
                            return c.type === "CORPORATE";
                          })
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Local and outstation packages */}
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3 border-b pb-1">
                    Local Packages
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-[#E2E8F0] p-3">
                      <p className="mb-3 text-xs font-bold text-[#475569]">
                        Half Day (4 hrs / 40 km)
                      </p>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-[#64748B]">
                        Package Rate (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={rateFormData.halfDayRate}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            halfDayRate: Number(e.target.value),
                          })
                        }
                        className="mb-3 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-blue-600 focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[10px] font-bold uppercase text-[#64748B]">
                          KM
                          <input
                            type="number"
                            min="1"
                            value={rateFormData.minKm}
                            onChange={(e) =>
                              setRateFormData({
                                ...rateFormData,
                                minKm: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-sm font-normal text-[#0F172A]"
                          />
                        </label>
                        <label className="text-[10px] font-bold uppercase text-[#64748B]">
                          Hours
                          <input
                            type="number"
                            min="1"
                            value={rateFormData.minHr}
                            onChange={(e) =>
                              setRateFormData({
                                ...rateFormData,
                                minHr: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-sm font-normal text-[#0F172A]"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#E2E8F0] p-3">
                      <p className="mb-3 text-xs font-bold text-[#475569]">
                        Full Day (8 hrs / 80 km)
                      </p>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-[#64748B]">
                        Package Rate (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={rateFormData.fullDayRate}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            fullDayRate: Number(e.target.value),
                          })
                        }
                        className="mb-3 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-blue-600 focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[10px] font-bold uppercase text-[#64748B]">
                          KM
                          <input
                            type="number"
                            min="1"
                            value={rateFormData.fullKm}
                            onChange={(e) =>
                              setRateFormData({
                                ...rateFormData,
                                fullKm: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-sm font-normal text-[#0F172A]"
                          />
                        </label>
                        <label className="text-[10px] font-bold uppercase text-[#64748B]">
                          Hours
                          <input
                            type="number"
                            min="1"
                            value={rateFormData.fullHr}
                            onChange={(e) =>
                              setRateFormData({
                                ...rateFormData,
                                fullHr: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-sm font-normal text-[#0F172A]"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Extra KM Rate (₹ / km)
                      </label>
                      <input
                        type="number"
                        value={rateFormData.extraKmRate}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            extraKmRate: Number(e.target.value),
                          })
                        }
                        placeholder="14"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Extra Hour Rate (₹ / hr)
                      </label>
                      <input
                        type="number"
                        value={rateFormData.extraHourRate}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            extraHourRate: Number(e.target.value),
                          })
                        }
                        placeholder="150"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3 border-b pb-1">
                    Outstation Package
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <label className="text-[10px] font-bold uppercase text-[#64748B]">
                      Minimum KM / Day
                      <input
                        type="number"
                        min="0"
                        value={rateFormData.minKmPerDay}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            minKmPerDay: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#0F172A]"
                      />
                    </label>
                    <label className="text-[10px] font-bold uppercase text-[#64748B]">
                      Rate / KM (₹)
                      <input
                        type="number"
                        min="0"
                        value={rateFormData.outstationRatePerKm}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            outstationRatePerKm: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#0F172A]"
                      />
                    </label>
                    <label className="text-[10px] font-bold uppercase text-[#64748B]">
                      Driver Allowance (₹ / day)
                      <input
                        type="number"
                        min="0"
                        value={rateFormData.driverAllowance}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            driverAllowance: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#0F172A]"
                      />
                    </label>
                  </div>
                </div>

                {/* Night Charges */}
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3 border-b pb-1">
                    Local Night Allowance
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Night Allowance (₹)
                      </label>
                      <input
                        type="number"
                        value={rateFormData.nightCharge}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            nightCharge: Number(e.target.value),
                          })
                        }
                        placeholder="200"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Start Time
                      </label>
                      <input
                        type="text"
                        value={rateFormData.nightStartTime}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            nightStartTime: e.target.value,
                          })
                        }
                        placeholder="23:00"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        End Time
                      </label>
                      <input
                        type="text"
                        value={rateFormData.nightEndTime}
                        onChange={(e) =>
                          setRateFormData({
                            ...rateFormData,
                            nightEndTime: e.target.value,
                          })
                        }
                        placeholder="05:00"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="mt-8 border-t border-[#E2E8F0] pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsRatesDrawerOpen(false)}
                className="w-1/2 py-2.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg text-sm transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRateFormSubmit}
                disabled={submittingRate}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition font-semibold flex items-center justify-center shadow-sm"
              >
                {submittingRate
                  ? "Saving..."
                  : editingRateId
                    ? "Update Rate Card"
                    : "Create Rate Card"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER: TAX BRACKET FORM
          ========================================================================= */}
      {isTaxesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-white border-l border-[#E2E8F0] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-left">
            <div>
              <div className="flex items-center justify-between mb-6 border-b border-[#E2E8F0] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    {editingTaxId
                      ? "Edit Tax Configuration"
                      : "Create Tax Configuration"}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Specify tax rates for CGST, SGST, and IGST.
                  </p>
                </div>
                <button
                  onClick={() => setIsTaxesDrawerOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
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

              {taxFormError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {taxFormError}
                </div>
              )}

              <form onSubmit={handleTaxFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Tax Configuration Name
                  </label>
                  <input
                    type="text"
                    required
                    value={taxFormData.taxName}
                    onChange={(e) =>
                      setTaxFormData({
                        ...taxFormData,
                        taxName: e.target.value,
                      })
                    }
                    placeholder="e.g. Standard GST 5%"
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      CGST (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={taxFormData.cgst}
                      onChange={(e) =>
                        setTaxFormData({
                          ...taxFormData,
                          cgst: Number(e.target.value),
                        })
                      }
                      placeholder="2.5"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      SGST (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={taxFormData.sgst}
                      onChange={(e) =>
                        setTaxFormData({
                          ...taxFormData,
                          sgst: Number(e.target.value),
                        })
                      }
                      placeholder="2.5"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      IGST (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={taxFormData.igst}
                      onChange={(e) =>
                        setTaxFormData({
                          ...taxFormData,
                          igst: Number(e.target.value),
                        })
                      }
                      placeholder="5.0"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Effective From
                  </label>
                  <input
                    type="date"
                    required
                    value={taxFormData.effectiveFrom}
                    onChange={(e) =>
                      setTaxFormData({
                        ...taxFormData,
                        effectiveFrom: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={taxFormData.isActive}
                    onChange={(e) =>
                      setTaxFormData({
                        ...taxFormData,
                        isActive: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-xs font-semibold text-[#475569] uppercase tracking-wider cursor-pointer select-none"
                  >
                    Set as Active Configuration
                  </label>
                </div>
              </form>
            </div>

            <div className="mt-8 border-t border-[#E2E8F0] pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsTaxesDrawerOpen(false)}
                className="w-1/2 py-2.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg text-sm transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTaxFormSubmit}
                disabled={submittingTax}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition font-semibold flex items-center justify-center shadow-sm"
              >
                {submittingTax ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: AUDIT LOGS OVERLAY
          ========================================================================= */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Rate & Tax Audit Logs
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Track modifications, creators, and history timestamps.
                </p>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
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

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-[300px]">
              {loadingLogs ? (
                <div className="flex justify-center items-center h-48">
                  <svg
                    className="animate-spin h-8 w-8 text-blue-600"
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
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No audit logs available for rates or taxes.
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border border-[#E2E8F0] p-4 rounded-xl text-xs flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gray-50/50 hover:bg-gray-50 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                              log.action.includes("CREATE")
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                : log.action.includes("UPDATE")
                                  ? "bg-amber-50 text-amber-800 border border-amber-100"
                                  : "bg-red-50 text-red-800 border border-red-100"
                            }`}
                          >
                            {log.action.replace("_", " ")}
                          </span>
                          <span className="font-semibold text-gray-700">
                            on {log.entityName}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          ID: <span className="font-mono">{log.entityId}</span>
                        </div>
                        {log.user && (
                          <div className="text-gray-600 font-medium">
                            By {log.user.firstName} {log.user.lastName} (
                            {log.user.email})
                          </div>
                        )}
                      </div>
                      <div className="text-right text-[#64748B] text-[10px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString("en-GB")}{" "}
                        {new Date(log.createdAt).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#E2E8F0] bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition shadow-sm"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
