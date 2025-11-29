import React, { useEffect, useState } from 'react';
import MetricCard from '../components/MetricCard';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import SkeletonLoader from '../components/SkeletonLoader';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

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

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const res = await fetch('/api/subscription/manage');
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
    fetchSub();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
          <p className="text-secondary">{t('dashboard.subtitle')}</p>
        </div>
        {/* Plan Badge */}
        {!loading && subscription && (
          <div className="px-4 py-2 rounded-xl bg-background-card border border-border flex items-center gap-3 shadow-sm">
            <span className="text-sm text-secondary">{t('dashboard.currentPlan')}</span>
            <span className="font-bold text-primary">{subscription.plan.toUpperCase()}</span>
            <Link to="/subscription/plans">
              <Button size="sm" variant="outline" className="ml-2 h-8">
                {t('sidebar.widget.upgrade')}
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Quota Card */}
        <Card className="flex flex-col justify-between transition-all duration-200 hover:border-white/20 hover:bg-background-card/80 backdrop-blur-sm group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-secondary text-sm font-medium mb-1">{t('dashboard.dailyQuota')}</p>
              {loading ? (
                <SkeletonLoader type="small" className="w-20 h-8" />
              ) : (
                <h3 className="text-3xl font-bold text-white tracking-tight">
                  {subscription?.usage?.used || 0} <span className="text-lg text-secondary font-normal">/ {subscription?.dailyLimit}</span>
                </h3>
              )}
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-all">
              <span className="material-symbols-outlined">data_usage</span>
            </div>
          </div>
          {!loading && subscription && (
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((subscription.usage?.used || 0) / subscription.dailyLimit) * 100)}%` }}
              ></div>
            </div>
          )}
        </Card>

        <MetricCard label={t('dashboard.avgScore')} value="92.4" trend={2.1} icon="analytics" color="bg-purple-500" />
        <MetricCard label={t('dashboard.issuesDetected')} value="86" trend={-5} icon="bug_report" color="bg-orange-500" />
        <MetricCard label={t('dashboard.pendingReview')} value="12" icon="pending_actions" color="bg-gray-500" />
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
