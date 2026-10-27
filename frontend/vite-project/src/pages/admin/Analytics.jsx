import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Download,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/ui/Toast';
import { Stat } from '../../components/ui/Stat';
import { Panel } from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const getTodayString = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
};

const getDaysAgoString = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};

const DAYS_OF_WEEK = [
  { dayIndex: 1, label: 'Mon' },
  { dayIndex: 2, label: 'Tue' },
  { dayIndex: 3, label: 'Wed' },
  { dayIndex: 4, label: 'Thu' },
  { dayIndex: 5, label: 'Fri' },
  { dayIndex: 6, label: 'Sat' },
  { dayIndex: 0, label: 'Sun' },
];

const OPERATING_HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00

export default function Analytics() {
  const { addToast } = useToast();

  const [preset, setPreset] = useState('30d');
  const [from, setFrom] = useState(getDaysAgoString(30));
  const [to, setTo] = useState(getTodayString());

  const [summary, setSummary] = useState(null);
  const [utilization, setUtilization] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [daily, setDaily] = useState([]);
  const [noShows, setNoShows] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Table sorting
  const [sortField, setSortField] = useState('utilizationPct');
  const [sortAsc, setSortAsc] = useState(false);

  // Handle Preset Changes
  const handlePresetChange = (days) => {
    if (days === 'custom') {
      setPreset('custom');
      return;
    }
    const daysNum = parseInt(days, 10);
    setPreset(`${days}d`);
    setFrom(getDaysAgoString(daysNum));
    setTo(getTodayString());
  };

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params = { from, to };
      const [sumRes, utilRes, peakRes, dailyRes, noShowRes, heatRes, insRes] = await Promise.all([
        api.get('/analytics/summary', { params }),
        api.get('/analytics/utilization', { params }),
        api.get('/analytics/peak-hours', { params }),
        api.get('/analytics/daily', { params }),
        api.get('/analytics/no-shows', { params }),
        api.get('/analytics/heatmap', { params }),
        api.get('/analytics/insights', { params }),
      ]);

      setSummary(sumRes.data);
      setUtilization(utilRes.data.utilization || []);
      setPeakHours(peakRes.data.peakHours || []);
      setDaily(dailyRes.data.daily || []);
      setNoShows(noShowRes.data.noShows || []);
      setHeatmap(heatRes.data.heatmap || []);
      setInsights(insRes.data.insights || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  }, [from, to, addToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const res = await api.get('/analytics/export.csv', {
        params: { from, to },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slotsync-analytics-${from}-to-${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      addToast('Analytics CSV exported successfully.', 'success');
    } catch (err) {
      addToast('Failed to export CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Heatmap Lookup Matrix: `day-hour` -> count
  const heatmapLookup = useMemo(() => {
    const map = {};
    let max = 0;
    heatmap.forEach((h) => {
      map[`${h.day}-${h.hour}`] = h.count;
      if (h.count > max) max = h.count;
    });
    return { map, max };
  }, [heatmap]);

  const getHeatmapColor = (count) => {
    if (!count || count === 0) return 'bg-slate-100/60 border border-slate-200/50 text-text-3';
    if (count <= 2) return 'bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200';
    if (count <= 5) return 'bg-emerald-300 text-emerald-950 font-semibold border border-emerald-400';
    return 'bg-emerald-500 text-white font-bold border border-emerald-600';
  };

  // Sort Utilization Table
  const sortedUtilization = useMemo(() => {
    return [...utilization].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [utilization, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const deltas = summary?.deltas || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header and Controls */}
      <div className="pb-4 border-b border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
              Analytics & Insights
            </h1>
            <Badge variant="neutral" size="sm">
              Live Metrics
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            Real-time space utilization, congestion heatmaps, no-show trends, and operational insights.
          </p>
        </div>

        {/* Date Filter & Export Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-paper p-1 border border-line text-xs font-medium">
            <button
              type="button"
              onClick={() => handlePresetChange(7)}
              className={`px-3 py-1 rounded-lg transition-all ${
                preset === '7d' ? 'bg-surface text-ink font-semibold shadow-2xs' : 'text-text-2 hover:text-ink'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange(30)}
              className={`px-3 py-1 rounded-lg transition-all ${
                preset === '30d' ? 'bg-surface text-ink font-semibold shadow-2xs' : 'text-text-2 hover:text-ink'
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('custom')}
              className={`px-3 py-1 rounded-lg transition-all ${
                preset === 'custom' ? 'bg-surface text-ink font-semibold shadow-2xs' : 'text-text-2 hover:text-ink'
              }`}
            >
              Custom
            </button>
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1.5 rounded-xl border border-line text-xs">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="text-xs font-semibold text-ink focus:outline-hidden"
              />
              <span className="text-text-3">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="text-xs font-semibold text-ink focus:outline-hidden"
              />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            icon={Download}
            loading={exporting}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Rule-based Insight Banners */}
      {!loading && insights.length > 0 && (
        <div className="space-y-2.5">
          {insights.map((ins) => {
            const isWarning = ins.type === 'warning';
            const isInfo = ins.type === 'info';
            return (
              <div
                key={ins.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                  isWarning
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : isInfo
                    ? 'bg-primary-50/70 border-primary-200 text-primary-900'
                    : 'bg-slate-50 border-line text-slate-800'
                }`}
              >
                {isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : isInfo ? (
                  <Sparkles className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold">{ins.title}: </span>
                  <span>{ins.message}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4 KPI Cards with deltas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Total Bookings"
          value={loading ? '—' : summary?.totalBookings ?? 0}
          delta={deltas.totalBookings !== undefined ? `${deltas.totalBookings > 0 ? '+' : ''}${deltas.totalBookings}%` : null}
          deltaType={deltas.totalBookings > 0 ? 'positive' : deltas.totalBookings < 0 ? 'negative' : 'neutral'}
          description="Total reservations in period"
        />
        <Stat
          label="Space Utilization"
          value={loading ? '—' : `${summary?.utilizationRate ?? 0}%`}
          delta={deltas.utilizationRate !== undefined ? `${deltas.utilizationRate > 0 ? '+' : ''}${deltas.utilizationRate}% pts` : null}
          deltaType={deltas.utilizationRate > 0 ? 'positive' : deltas.utilizationRate < 0 ? 'negative' : 'neutral'}
          description="Of total capacity hours"
        />
        <Stat
          label="No-Show Rate"
          value={loading ? '—' : `${summary?.noShowRate ?? 0}%`}
          delta={deltas.noShowRate !== undefined ? `${deltas.noShowRate > 0 ? '+' : ''}${deltas.noShowRate}% pts` : null}
          deltaType={deltas.noShowRate < 0 ? 'positive' : deltas.noShowRate > 0 ? 'negative' : 'neutral'}
          description="Unattended bookings"
        />
        <Stat
          label="Active Facilities"
          value={loading ? '—' : summary?.activeRooms ?? 0}
          delta={summary?.pendingApprovals > 0 ? `${summary.pendingApprovals} pending` : 'All clear'}
          deltaType={summary?.pendingApprovals > 0 ? 'negative' : 'positive'}
          description="Available for booking"
        />
      </div>

      {/* Demand Heatmap */}
      <Panel className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-heading font-bold text-base text-ink">
              Hourly Demand Heatmap
            </h2>
            <p className="text-xs text-text-2">
              Concentration of reservations across days of the week and operating hours.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-text-3">
            <span>Low</span>
            <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200" />
            <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-200" />
            <span className="w-3.5 h-3.5 rounded bg-emerald-300 border border-emerald-400" />
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600" />
            <span>High</span>
          </div>
        </div>

        {loading ? (
          <Skeleton className="w-full h-44 rounded-xl" />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[650px] space-y-1.5">
              {/* Hour Headers */}
              <div className="grid grid-cols-[50px_repeat(14,_1fr)] gap-1 text-[11px] font-semibold text-text-3 text-center">
                <div />
                {OPERATING_HOURS.map((h) => (
                  <div key={h} className="truncate">
                    {h}:00
                  </div>
                ))}
              </div>

              {/* Day Rows */}
              {DAYS_OF_WEEK.map(({ dayIndex, label }) => (
                <div
                  key={dayIndex}
                  className="grid grid-cols-[50px_repeat(14,_1fr)] gap-1 items-center"
                >
                  <span className="text-xs font-semibold text-text-2 text-right pr-2">
                    {label}
                  </span>
                  {OPERATING_HOURS.map((hour) => {
                    const count = heatmapLookup.map[`${dayIndex}-${hour}`] || 0;
                    return (
                      <div
                        key={hour}
                        title={`${label} ${hour}:00 - ${count} booking(s)`}
                        className={`h-7 rounded-md flex items-center justify-center text-[10px] transition-transform hover:scale-110 cursor-default ${getHeatmapColor(
                          count
                        )}`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Utilization Bar Chart */}
        <Panel className="p-6 space-y-4">
          <div>
            <h2 className="font-heading font-bold text-base text-ink">
              Room Utilization Rate (%)
            </h2>
            <p className="text-xs text-text-2">
              Percentage of available operating hours booked per facility.
            </p>
          </div>

          <div className="h-64">
            {loading ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : utilization.length === 0 ? (
              <EmptyState icon={BarChart3} title="No room data available" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilization} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E1E6EF" />
                  <XAxis
                    dataKey="roomName"
                    tick={{ fontSize: 11, fill: '#6B7A90' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7A90' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E1E6EF',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val}%`, 'Utilization']}
                  />
                  <Bar dataKey="utilizationPct" fill="#0D5257" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        {/* Attended vs No-Show Daily Trends */}
        <Panel className="p-6 space-y-4">
          <div>
            <h2 className="font-heading font-bold text-base text-ink">
              Attended vs No-Show Trends
            </h2>
            <p className="text-xs text-text-2">
              Historical completion and absence trajectories.
            </p>
          </div>

          <div className="h-64">
            {loading ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : daily.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No trend data available" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E1E6EF" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6B7A90' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7A90' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E1E6EF',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Attended"
                    stroke="#1E7F48"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="noShows"
                    name="No-Shows"
                    stroke="#DC2626"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      {/* Sortable Room Performance Table */}
      <Panel className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-base text-ink">
              Facility Performance Breakdown
            </h2>
            <p className="text-xs text-text-2">
              Detailed utilization metrics, capacity, and booked hours per facility.
            </p>
          </div>
        </div>

        {loading ? (
          <Skeleton className="w-full h-48 rounded-xl" />
        ) : sortedUtilization.length === 0 ? (
          <EmptyState icon={Building2} title="No facilities found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line text-text-3 uppercase tracking-wider font-semibold">
                <tr>
                  <th
                    className="pb-3 pr-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('roomName')}
                  >
                    <div className="flex items-center gap-1">
                      Room <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="pb-3 px-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('building')}
                  >
                    <div className="flex items-center gap-1">
                      Building <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="pb-3 px-4 cursor-pointer hover:text-ink text-right"
                    onClick={() => handleSort('capacity')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Capacity <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="pb-3 px-4 cursor-pointer hover:text-ink text-right"
                    onClick={() => handleSort('bookedSlots')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Booked Hours <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="pb-3 px-4 cursor-pointer hover:text-ink text-right"
                    onClick={() => handleSort('availableSlots')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Available Hours <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="pb-3 pl-4 cursor-pointer hover:text-ink text-right"
                    onClick={() => handleSort('utilizationPct')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Utilization Rate <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sortedUtilization.map((r) => (
                  <tr key={r.roomId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 pr-4 font-semibold text-ink">{r.roomName}</td>
                    <td className="py-3 px-4 text-text-2">{r.building}</td>
                    <td className="py-3 px-4 text-text-2 text-right">{r.capacity} seats</td>
                    <td className="py-3 px-4 text-text-2 text-right">{r.bookedSlots} hrs</td>
                    <td className="py-3 px-4 text-text-3 text-right">{r.availableSlots} hrs</td>
                    <td className="py-3 pl-4 text-right">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                          r.utilizationPct > 60
                            ? 'bg-emerald-50 text-emerald-800'
                            : r.utilizationPct > 20
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {r.utilizationPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
