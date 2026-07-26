'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  TrendingUp, Users, Calendar, Activity,
  CheckCircle, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { formatPrice } from '@/lib/format';

type Booking = {
  status: string;
  amount: number;
  start_time: string;
  payment_status: string;
};

type MonthlyData = {
  name: string;
  bookings: number;
  revenue: number;
};

type StatusData = {
  name: string;
  value: number;
};

const COLORS = ['#c5a880', '#10b981', '#f59e0b', '#ef4444'];

export function AdminAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusData[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    upcoming: 0,
    cancelled: 0,
    revenue: 0,
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch profiles (members)
        const profilesSnap = await getDocs(collection(db, 'profiles'));
        setTotalMembers(profilesSnap.size);

        // Fetch bookings
        const bookingsSnap = await getDocs(collection(db, 'bookings'));
        const bookingList = bookingsSnap.docs.map((d) => d.data() as Booking);
        setBookings(bookingList);

        // Calculate basic stats
        let completed = 0;
        let upcoming = 0;
        let cancelled = 0;
        let revenue = 0;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyMap: Record<string, { bookings: number; revenue: number }> = {};
        months.forEach((m) => { monthlyMap[m] = { bookings: 0, revenue: 0 }; });

        const statusMap: Record<string, number> = { confirmed: 0, completed: 0, pending: 0, cancelled: 0 };

        bookingList.forEach((b) => {
          if (b.status === 'completed') completed++;
          else if (b.status === 'confirmed' || b.status === 'pending') upcoming++;
          else if (b.status === 'cancelled') cancelled++;

          if (b.payment_status === 'paid') {
            revenue += Number(b.amount || 0);
          }

          // Parse month
          if (b.start_time) {
            const date = new Date(b.start_time);
            if (!isNaN(date.getTime())) {
              const monthName = months[date.getMonth()];
              monthlyMap[monthName].bookings++;
              if (b.payment_status === 'paid') {
                monthlyMap[monthName].revenue += Number(b.amount || 0);
              }
            }
          }

          const statusKey = b.status?.toLowerCase();
          if (statusKey in statusMap) {
            statusMap[statusKey]++;
          }
        });

        setStats({
          total: bookingList.length,
          completed,
          upcoming,
          cancelled,
          revenue,
        });

        // Map Monthly Trends
        const trendData = months.map((m) => ({
          name: m,
          bookings: monthlyMap[m].bookings,
          revenue: monthlyMap[m].revenue,
        }));
        setMonthlyTrend(trendData);

        // Map Status Distribution
        setStatusDistribution([
          { name: 'Confirmed', value: statusMap.confirmed },
          { name: 'Completed', value: statusMap.completed },
          { name: 'Pending', value: statusMap.pending },
          { name: 'Cancelled', value: statusMap.cancelled },
        ].filter((s) => s.value > 0));

      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <span className="text-sm text-muted-foreground">Loading Analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Revenue', value: formatPrice(stats.revenue, 'INR'), icon: TrendingUp, color: 'text-gold' },
          { label: 'Total Bookings', value: stats.total, icon: Calendar, color: 'text-primary' },
          { label: 'Registered Members', value: totalMembers, icon: Users, color: 'text-emerald-400' },
          { label: 'Completion Rate', value: stats.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%', icon: CheckCircle, color: 'text-blue-400' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/40 bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Booking Trends */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-soft">
          <h4 className="text-sm font-semibold text-foreground mb-4">Monthly Booking Trends</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Bar dataKey="bookings" fill="#c5a880" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Growth */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-soft">
          <h4 className="text-sm font-semibold text-foreground mb-4">Revenue Growth (INR)</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-soft">
          <h4 className="text-sm font-semibold text-foreground mb-4">Booking Status Distribution</h4>
          <div className="h-64 w-full flex items-center justify-center">
            {statusDistribution.length === 0 ? (
              <span className="text-xs text-muted-foreground">No data available</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[10px] text-muted-foreground capitalize">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Breakdowns */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-soft flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Platform Stats Breakdown</h4>
            <div className="space-y-4 text-xs">
              {[
                { label: 'Completed Sessions', value: stats.completed, color: 'bg-emerald-400' },
                { label: 'Upcoming Sessions', value: stats.upcoming, color: 'bg-gold' },
                { label: 'Cancelled Sessions', value: stats.cancelled, color: 'bg-red-400' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-border/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                    <span className="text-muted-foreground font-medium">{row.label}</span>
                  </div>
                  <span className="font-semibold text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/20 flex justify-between items-center text-xs text-muted-foreground">
            <span>Data refreshed in real-time</span>
            <span className="flex items-center gap-0.5 text-gold font-semibold"><ArrowUpRight className="h-3.5 w-3.5" /> Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
}
