import React, { useEffect, useState } from 'react';
import MetricCard from '../components/MetricCard';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import SkeletonLoader from '../components/SkeletonLoader';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, History, Zap, Calendar, ArrowRight } from 'lucide-react';

const data = [
  { name: 'Mon', score: 92 },
  { name: 'Tue', score: 88 },
  { name: 'Wed', score: 95 },
  { name: 'Thu', score: 82 },
  { name: 'Fri', score: 96 },
  { name: 'Sat', score: 90 },
  { name: 'Sun', score: 94 },
];

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const riskData = [
    { name: t('dashboard.riskLevels.safe'), value: 65, fill: '#10b981' }, // Emerald-500
    { name: t('dashboard.riskLevels.low'), value: 20, fill: '#3b82f6' }, // Blue-500
    { name: t('dashboard.riskLevels.med'), value: 10, fill: '#f59e0b' }, // Amber-500
    { name: t('dashboard.riskLevels.high'), value: 5, fill: '#ef4444' }, // Red-500
  ];

  const { user } = useAuth();

  useEffect(() => {
    const fetchSub = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/subscription/manage', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setSubscription(data.data);
        }
      } catch (e) {
        console.error("Failed to fetch subscription", e);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchSub();
  }, [user]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
          <p className="text-secondary">{t('dashboard.subtitle')}</p>
        </div>
      </div>

      {/* V3 Summary Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan & Expiry */}
        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-gray-300 font-medium">Current Plan</h3>
            </div>
            {loading ? (
              <SkeletonLoader type="small" className="w-24 h-8" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white capitalize mb-1">
                  {subscription?.plan || 'Free'}
                </div>
                <div className="text-sm text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Next Billing: {formatDate(subscription?.nextBillingDate)}
                </div>
              </>
            )}
            <Link to="/subscription/overview" className="absolute bottom-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
            <h3 className="text-gray-300 font-medium">Usage This Month</h3>
          </div>
          {loading ? (
            <SkeletonLoader type="small" className="w-24 h-8" />
          ) : (
            <>
              <div className="text-3xl font-bold text-white mb-1">
                {subscription?.usage?.used || 0}
                <span className="text-lg text-gray-500 font-normal ml-2">
                  / {subscription?.dailyLimit === -1 ? '∞' : subscription?.dailyLimit}
                </span>
              </div>
              <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-yellow-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((subscription?.usage?.used || 0) / (subscription?.dailyLimit || 1)) * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-center gap-3">
          <Link to="/history" className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <History className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-gray-200 font-medium">View History</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          </Link>
          <Link to="/subscription/plans" className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CreditCard className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-gray-200 font-medium">Upgrade Plan</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.complianceTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101522', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.riskDistribution')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              {riskData.map((item) => (
                <div key={item.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full ring-2 ring-opacity-20 ring-white" style={{ backgroundColor: item.fill }}></div>
                    <span className="text-sm font-medium text-secondary group-hover:text-white transition-colors">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 w-1/2">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${item.value}%`, backgroundColor: item.fill }}></div>
                    </div>
                    <span className="text-sm font-bold text-secondary w-8 text-right">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">tips_and_updates</span>
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">{t('dashboard.weeklyTip.title')}</p>
                  <p className="text-xs text-secondary leading-relaxed">{t('dashboard.weeklyTip.content')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
