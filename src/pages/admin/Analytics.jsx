import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Percent,
  Clock,
  Building2,
  Calendar,
  AlertTriangle,
  Users,
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';

const getTodayString = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
};

const getDaysAgoString = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};

export default function Analytics() {
  const { addToast } = useToast();

  const [from, setFrom] = useState(getDaysAgoString(30));
  const [to, setTo] = useState(getTodayString());

  const [summary, setSummary] = useState(null);
  const [utilization, setUtilization] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [daily, setDaily] = useState([]);
  const [noShows, setNoShows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params = { from, to };
      const [sumRes, utilRes, peakRes, dailyRes, noShowRes] = await Promise.all([
        api.get('/analytics/summary', { params }),
        api.get('/analytics/utilization', { params }),
        api.get('/analytics/peak-hours', { params }),
        api.get('/analytics/daily', { params }),
        api.get('/analytics/no-shows', { params }),
      ]);

      setSummary(sumRes.data);
      setUtilization(utilRes.data.utilization || []);
      setPeakHours(peakRes.data.peakHours || []);
      setDaily(dailyRes.data.daily || []);
      setNoShows(noShowRes.data.noShows || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  }, [from, to, addToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header and Date Filter */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Campus Utilization & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time space metrics aggregated directly from database transaction logs.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="text-xs font-semibold text-slate-800 focus:outline-hidden"
          />
          <span className="text-slate-300">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="text-xs font-semibold text-slate-800 focus:outline-hidden"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-slate-500">Calculating facility metrics...</p>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Room Utilization</p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                  {summary?.utilizationRate || 0}%
                </h3>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Across {summary?.activeRooms || 0} active facilities
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Percent className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">No-Show Rate</p>
                <h3 className="text-2xl font-extrabold text-rose-600 mt-1">
                  {summary?.noShowRate || 0}%
                </h3>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Missed check-in grace period
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Total Reservations</p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                  {summary?.totalBookings || 0}
                </h3>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  {summary?.usedBookings || 0} slots utilized
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Pending Approvals</p>
                <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
                  {summary?.pendingApprovals || 0}
                </h3>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Requiring admin decision
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Charts Row 1: Room Utilization & Peak Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Utilization Bar Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary-600" />
                Utilization Percentage by Space
              </h3>
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={utilization} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="roomName"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                    <Tooltip
                      formatter={(val) => [`${val}%`, 'Utilization']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Bar dataKey="utilizationPct" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Hours Histogram */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-600" />
                Peak Booking Hours
              </h3>
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip
                      formatter={(val) => [val, 'Bookings']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Bar dataKey="bookings" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Daily Trend Line Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-600" />
              Daily Bookings & Completion Volume
            </h3>
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="totalBookings"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Total Requests"
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Attended"
                  />
                  <Line
                    type="monotone"
                    dataKey="noShows"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="No-Shows"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* No-Shows Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Facility No-Show Rate Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Identifies spaces experiencing high ghost booking rates for policy adjustments.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Space Name</th>
                    <th className="py-3 px-4">Building</th>
                    <th className="py-3 px-4">No-Show Releases</th>
                    <th className="py-3 px-4">Total Reservations</th>
                    <th className="py-3 px-4 text-right">No-Show Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {noShows.map((n) => (
                    <tr key={n.roomId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{n.roomName}</td>
                      <td className="py-3 px-4 text-xs">{n.building}</td>
                      <td className="py-3 px-4 text-xs font-mono">{n.noShowCount}</td>
                      <td className="py-3 px-4 text-xs font-mono">{n.totalCount}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            n.noShowRate > 20
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {n.noShowRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
