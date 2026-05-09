import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { backendClient } from '@/lib/backendClient';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AnalyticsCourse {
  id: string | number;
  title: string;
  students_count: number;
  revenue: number;
  completion_rate: number;
  views?: number;
  current_price?: number;
}

interface AnalyticsEnrollment {
  id: string | number;
  course_id: string | number;
  enrolled_at: string;
  progress: number;
  status: string;
  days_since_active?: number;
  attention_level?: string;
}

interface AnalyticsSubmission {
  id: string | number;
  status: string;
  submitted_at?: string | null;
}

const chartColors = ['#14B8A6', '#0F766E', '#F59E0B', '#6366F1', '#EF4444'];

function formatMonthKey(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(date);
}

function formatCurrency(value: number) {
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

export default function FormateurAnalyticsPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<AnalyticsCourse[]>([]);
  const [enrollments, setEnrollments] = useState<AnalyticsEnrollment[]>([]);
  const [submissions, setSubmissions] = useState<AnalyticsSubmission[]>([]);

  const loadAnalytics = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [coursesRes, enrollmentsRes, submissionsRes] = await Promise.all([
        backendClient.from<AnalyticsCourse>('courses').select('*').eq('instructor_id', user.id).order('updated_at', { ascending: false }),
        backendClient.from<AnalyticsEnrollment>('course_enrollments').select('*').order('enrolled_at', { ascending: true }),
        backendClient.from<AnalyticsSubmission>('submissions').select('*').order('submitted_at', { ascending: false }),
      ]);
      if (coursesRes.error) throw coursesRes.error;
      if (enrollmentsRes.error) throw enrollmentsRes.error;
      if (submissionsRes.error) throw submissionsRes.error;
      setCourses(coursesRes.data || []);
      setEnrollments(enrollmentsRes.data || []);
      setSubmissions(submissionsRes.data || []);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les analytics formateur.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const monthlyRevenue = useMemo(() => {
    const courseMap = new Map(courses.map((course) => [String(course.id), course]));
    const monthly = new Map<string, { month: string; revenue: number; sales: number }>();

    for (const enrollment of enrollments) {
      const course = courseMap.get(String(enrollment.course_id));
      if (!course) continue;
      const key = formatMonthKey(enrollment.enrolled_at);
      const current = monthly.get(key) ?? { month: key, revenue: 0, sales: 0 };
      current.revenue += Number(course.current_price || 0);
      current.sales += 1;
      monthly.set(key, current);
    }

    return Array.from(monthly.values());
  }, [courses, enrollments]);

  const coursePerformance = useMemo(() => (
    courses.map((course) => {
      const views = Number(course.views || Math.max(course.students_count * 6, 1));
      return {
        name: course.title.length > 18 ? `${course.title.slice(0, 18)}…` : course.title,
        completion: Number(course.completion_rate || 0),
        conversion: views > 0 ? Number(((course.students_count / views) * 100).toFixed(1)) : 0,
        views,
        students: Number(course.students_count || 0),
      };
    })
  ), [courses]);

  const communityMix = useMemo(() => {
    const active = enrollments.filter((entry) => entry.attention_level === 'on_track' || entry.attention_level === 'completed').length;
    const watch = enrollments.filter((entry) => entry.attention_level === 'watch').length;
    const atRisk = enrollments.filter((entry) => entry.attention_level === 'at_risk' || entry.status === 'inactive').length;
    return [
      { name: 'Actifs', value: active },
      { name: 'À surveiller', value: watch },
      { name: 'À relancer', value: atRisk },
    ].filter((item) => item.value > 0);
  }, [enrollments]);

  const headline = useMemo(() => {
    const totalRevenue = courses.reduce((sum, course) => sum + Number(course.revenue || 0), 0);
    const totalViews = courses.reduce((sum, course) => sum + Number(course.views || 0), 0);
    const totalStudents = courses.reduce((sum, course) => sum + Number(course.students_count || 0), 0);
    const avgCompletion = courses.length
      ? Math.round(courses.reduce((sum, course) => sum + Number(course.completion_rate || 0), 0) / courses.length)
      : 0;
    const atRisk = enrollments.filter((entry) => entry.attention_level === 'at_risk' || entry.status === 'inactive').length;
    const recentSubmissions = submissions.filter((entry) => entry.status === 'pending').length;

    return {
      totalRevenue,
      totalViews,
      totalStudents,
      avgCompletion,
      atRisk,
      recentSubmissions,
      conversion: totalViews > 0 ? Number(((totalStudents / totalViews) * 100).toFixed(1)) : 0,
    };
  }, [courses, enrollments, submissions]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur', path: '/dashboard/formateur' }, { label: 'Analytics' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics formateur</h1>
          <p className="mt-2 text-gray-600">Ventes, revenus, vues, conversion, complétion et signaux d’abandon sur vos formations.</p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            { label: 'Ventes', value: headline.totalStudents },
            { label: 'Revenus', value: formatCurrency(headline.totalRevenue) },
            { label: 'Vues', value: headline.totalViews.toLocaleString('fr-FR') },
            { label: 'Conversion', value: `${headline.conversion}%` },
            { label: 'Complétion', value: `${headline.avgCompletion}%` },
            { label: 'À relancer', value: headline.atRisk },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-sm text-gray-500">{item.label}</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Revenus par mois</h2>
              <p className="text-sm text-gray-500">Estimés à partir des inscriptions et du prix courant des cours.</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="#14B8A6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Conversion et complétion par cours</h2>
              <p className="text-sm text-gray-500">Croise vues, inscriptions et progression réelle.</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={coursePerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="conversion" stroke="#14B8A6" strokeWidth={3} />
                  <Line type="monotone" dataKey="completion" stroke="#6366F1" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Engagement apprenants</h2>
              <p className="text-sm text-gray-500">Répartition des cohortes actives, à surveiller et à relancer.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={communityMix} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
                      {communityMix.map((entry, index) => (
                        <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {communityMix.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }}></span>
                      <span className="font-medium text-gray-800">{entry.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{entry.value}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  <div className="font-semibold">Corrections en attente</div>
                  <div className="mt-1">{headline.recentSubmissions} soumission(s) attendent encore une action du formateur.</div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Cours les plus regardés</h2>
              <p className="text-sm text-gray-500">Lecture utile pour repérer les cours qui tirent la croissance et ceux qui décrochent.</p>
            </div>
            <div className="space-y-3">
              {coursePerformance
                .slice()
                .sort((left, right) => right.views - left.views)
                .map((course) => (
                  <div key={course.name} className="rounded-xl border border-gray-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-gray-900">{course.name}</span>
                      <span className="text-sm text-gray-500">{course.views.toLocaleString('fr-FR')} vues</span>
                    </div>
                    <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-3">
                      <span>Conversion: {course.conversion}%</span>
                      <span>Complétion: {course.completion}%</span>
                      <span>Inscriptions: {course.students}</span>
                    </div>
                  </div>
                ))}
              {!loading && !coursePerformance.length ? <p className="text-sm text-gray-500">Aucune donnée analytique disponible.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
