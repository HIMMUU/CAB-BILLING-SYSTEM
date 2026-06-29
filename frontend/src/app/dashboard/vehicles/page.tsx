'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import DatePicker from '@/components/DatePicker';

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  seatingCapacity: number;
  registrationDate: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  permitExpiry: string;
  status: 'AVAILABLE' | 'ON_TRIP' | 'MAINTENANCE' | 'INACTIVE';
}

export default function VehiclesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form inputs
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    vehicleType: '',
    model: '',
    seatingCapacity: 4,
    registrationDate: '',
    insuranceExpiry: '',
    fitnessExpiry: '',
    permitExpiry: '',
    status: 'AVAILABLE' as 'AVAILABLE' | 'ON_TRIP' | 'MAINTENANCE' | 'INACTIVE',
  });
  const [categories, setCategories] = useState<any[]>([]);

  const fetchCategories = async () => {
    try {
      const res = await api.request('/rate-management/categories');
      setCategories(res || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  useEffect(() => {
    const token = api.getToken();
    const currentUser = api.getUser();
    if (!token || !currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      fetchCategories();
    }
  }, [router]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      let url = `/vehicles?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`;

      const res = await api.request(url);
      setVehicles(res.data);
      setTotalPages(res.meta.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user, page, filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVehicles();
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      vehicleNumber: '',
      vehicleType: '',
      model: '',
      seatingCapacity: 4,
      registrationDate: '',
      insuranceExpiry: '',
      fitnessExpiry: '',
      permitExpiry: '',
      status: 'AVAILABLE',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      model: vehicle.model,
      seatingCapacity: vehicle.seatingCapacity,
      registrationDate: vehicle.registrationDate ? vehicle.registrationDate.substring(0, 10) : '',
      insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.substring(0, 10) : '',
      fitnessExpiry: vehicle.fitnessExpiry ? vehicle.fitnessExpiry.substring(0, 10) : '',
      permitExpiry: vehicle.permitExpiry ? vehicle.permitExpiry.substring(0, 10) : '',
      status: vehicle.status,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const cleanVehicleNumber = (num: string): string => {
    return num.replace(/[\s-]/g, '').toUpperCase();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanedPlate = cleanVehicleNumber(formData.vehicleNumber);
    if (!cleanedPlate) {
      setFormError('Vehicle number is required.');
      return;
    }

    if (!formData.vehicleType || !formData.model || !formData.registrationDate || !formData.insuranceExpiry || !formData.fitnessExpiry || !formData.permitExpiry) {
      setFormError('All fields are required.');
      return;
    }

    if (formData.seatingCapacity < 1) {
      setFormError('Seating capacity must be at least 1.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        vehicleNumber: cleanedPlate,
        seatingCapacity: Number(formData.seatingCapacity),
      };

      if (editingId) {
        await api.request(`/vehicles/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api.request('/vehicles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsFormOpen(false);
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await api.request(`/vehicles/${id}`, { method: 'DELETE' });
      fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vehicle.');
    }
  };

  const getExpiryBadge = (expiryDateStr: string, name: string) => {
    if (!expiryDateStr) return <span className="text-gray-400">No date</span>;
    
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <div className="flex flex-col text-left mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{name}</span>
          <span className="text-red-700 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[10px] inline-block w-fit mt-0.5">
            EXPIRED ({Math.abs(diffDays)}d ago)
          </span>
        </div>
      );
    } else if (diffDays <= 30) {
      return (
        <div className="flex flex-col text-left mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{name}</span>
          <span className="text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] inline-block w-fit mt-0.5">
            EXPIRING SOON ({diffDays}d left)
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col text-left mb-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{name}</span>
        <span className="text-[#0F172A] text-xs font-medium">
          {expiry.toLocaleDateString('en-GB')}
        </span>
      </div>
    );
  };

  if (!user) return null;

  const canEdit = user.role !== 'BILLING_EXECUTIVE';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Vehicles</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage fleet assets, availability, permits, and document compliance</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreate}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Add Vehicle</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Toolbar Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full mb-6">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search vehicles by number, type, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 transition"
          />
        </form>

        <div className="flex bg-gray-100 p-0.5 border border-[#E2E8F0] rounded-lg self-start">
          {['ALL', 'AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'INACTIVE'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
                filterStatus === status
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {status.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle List Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="p-12 text-center text-[#64748B]">
            No vehicles found. Click "Add Vehicle" to register a fleet asset.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC]">
                  <th className="py-3 px-6">Vehicle Details</th>
                  <th className="py-3 px-6">Type & Capacity</th>
                  <th className="py-3 px-6">Registration Date</th>
                  <th className="py-3 px-6">Document Expiries</th>
                  <th className="py-3 px-6">Status</th>
                  {canEdit && <th className="py-3 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-sm">
                {vehicles.map((vehicle) => {
                  return (
                    <tr key={vehicle.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-[#0F172A] tracking-wide font-mono text-sm bg-gray-50 border border-[#E2E8F0] px-2 py-1 rounded inline-block">
                          {vehicle.vehicleNumber}
                        </div>
                        <div className="text-xs font-semibold text-[#64748B] mt-1">{vehicle.model}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-[#0F172A] font-medium">{vehicle.vehicleType}</div>
                        <div className="text-xs text-[#64748B]">{vehicle.seatingCapacity} Seater</div>
                      </td>
                      <td className="py-4 px-6 text-[#64748B] text-xs">
                        {vehicle.registrationDate ? new Date(vehicle.registrationDate).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="py-4 px-6 space-y-2">
                        {getExpiryBadge(vehicle.permitExpiry, 'Permit')}
                        {getExpiryBadge(vehicle.insuranceExpiry, 'Insurance')}
                        {getExpiryBadge(vehicle.fitnessExpiry, 'Fitness')}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          vehicle.status === 'AVAILABLE' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' :
                          vehicle.status === 'ON_TRIP' ? 'text-blue-700 bg-blue-50 border border-blue-200' :
                          vehicle.status === 'MAINTENANCE' ? 'text-amber-700 bg-amber-50 border border-amber-200' :
                          'text-gray-500 bg-gray-100 border border-gray-200'
                        }`}>
                          {vehicle.status.replace('_', ' ')}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEdit(vehicle)}
                            className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-100 rounded-lg transition"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="border-t border-[#E2E8F0] px-6 py-4 flex items-center justify-between bg-[#F8FAFC]">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50 transition"
            >
              Previous
            </button>
            <span className="text-xs text-[#64748B]">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Creation / Edition Slide-over Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[500px] h-full bg-white border-l border-[#E2E8F0] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#0F172A]">
                  {editingId ? 'Edit Vehicle Info' : 'Add New Vehicle'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {formError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Vehicle Status
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'INACTIVE'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: status as any })}
                        className={`py-2 text-center rounded-lg text-[10px] font-bold uppercase border transition-all ${
                          formData.status === status
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
                        }`}
                      >
                        {status.replace('_', ' ').toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Vehicle Number (Registration Plate)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. DL1CA9999"
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition font-mono tracking-wider"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Alphanumeric only. Will be stripped of spaces/hyphens.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                    Model Description
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g. Toyota Innova Crysta"
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Vehicle Type
                    </label>
                    <select
                      required
                      value={formData.vehicleType}
                      onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    >
                      <option value="">Select Type</option>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Sedan">Sedan</option>
                          <option value="SUV">SUV</option>
                          <option value="MUV">MUV</option>
                          <option value="Luxury">Luxury</option>
                          <option value="Tempo Traveller">Tempo Traveller</option>
                          <option value="Bus">Bus</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Seating Capacity
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.seatingCapacity}
                      onChange={(e) => setFormData({ ...formData, seatingCapacity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Registration Date
                    </label>
                    <DatePicker
                      value={formData.registrationDate}
                      onChange={(val) => setFormData({ ...formData, registrationDate: val })}
                      format="YYYY-MM-DD"
                      placeholder="YYYY-MM-DD"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Permit Expiry Date
                    </label>
                    <DatePicker
                      value={formData.permitExpiry}
                      onChange={(val) => setFormData({ ...formData, permitExpiry: val })}
                      format="YYYY-MM-DD"
                      placeholder="YYYY-MM-DD"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Insurance Expiry Date
                    </label>
                    <DatePicker
                      value={formData.insuranceExpiry}
                      onChange={(val) => setFormData({ ...formData, insuranceExpiry: val })}
                      format="YYYY-MM-DD"
                      placeholder="YYYY-MM-DD"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                      Fitness Expiry Date
                    </label>
                    <DatePicker
                      value={formData.fitnessExpiry}
                      onChange={(val) => setFormData({ ...formData, fitnessExpiry: val })}
                      format="YYYY-MM-DD"
                      placeholder="YYYY-MM-DD"
                      required
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="mt-8 border-t border-[#E2E8F0] pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-1/2 py-2.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg text-sm transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={submitting}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition font-semibold flex items-center justify-center shadow-sm"
              >
                {submitting ? 'Saving...' : 'Save Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
