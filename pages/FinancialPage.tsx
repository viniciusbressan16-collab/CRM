import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { View } from '../App';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import AddRecoveryModal from '../components/AddRecoveryModal';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS, hasPermission } from '../utils/roles';
import AddRetainerModal from '../components/AddRetainerModal';
import AddExpenseModal from '../components/AddExpenseModal';
import RetainerHistoryModal from '../components/RetainerHistoryModal';
import Header from '../components/Header';

interface FinancialPageProps {
   onNavigate: (view: View, id?: string) => void;
   activePage: View;
}

export default function FinancialPage({ onNavigate, activePage }: FinancialPageProps) {
   const { profile } = useAuth();
   if (!hasPermission(profile?.role, PERMISSIONS.VIEW_FINANCIAL)) {
      return (
         <Layout onNavigate={onNavigate} activePage={activePage}>
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">Acesso restrito: apenas gestores podem visualizar esta página.</div>
         </Layout>
      );
   }
   // Modal States
   const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
   const [isRetainerModalOpen, setIsRetainerModalOpen] = useState(false);
   const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
   const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
   const [dropdownPos, setDropdownPos] = useState<any>({ top: 0, left: 0, right: 0 });

   // Data States
   const [loading, setLoading] = useState(true);
   const [metrics, setMetrics] = useState({
      totalRevenue: 0,
      netProfit: 0,
      pendingAnalysisCount: 0,
      totalRecoveredVolume: 0,
      totalExpenses: 0,
      pendingRevenue: 0,
      realizedRevenue: 0
   });
   const [filteredRecoveries, setFilteredRecoveries] = useState<any[]>([]);
   const [activeRetainers, setActiveRetainers] = useState<any[]>([]);
   const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
   const [chartData, setChartData] = useState<any[]>([]);
   const [currentMonthPayments, setCurrentMonthPayments] = useState<any[]>([]);

   // History Modal State
   const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
   const [selectedRetainerId, setSelectedRetainerId] = useState<string | null>(null);
   const [selectedClientName, setSelectedClientName] = useState('');
   const [editingRetainer, setEditingRetainer] = useState<any>(null);
   const [editingRecovery, setEditingRecovery] = useState<any>(null);

   const fetchData = async () => {
      setLoading(true);
      try {
         // Fetch Recoveries
         const { data: recoveries, error: recError } = await supabase
            .from('financial_recoveries')
            .select('*')
            .order('created_at', { ascending: false });
         if (recError) throw recError;

         // Fetch Retainers
         const { data: retainers, error: retError } = await supabase
            .from('financial_retainers')
            .select('*');
         if (retError) throw retError;

         // Fetch Expenses
         const { data: expenses, error: expError } = await supabase
            .from('financial_expenses')
            .select('*')
            .order('date', { ascending: false });
         if (expError) throw expError;

         // Fetch Current Month Payments
         const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
         const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();

         const { data: allRetainerPayments, error: retPayError } = await supabase
            .from('financial_retainer_payments')
            .select('*');
         if (retPayError) throw retPayError;

         const monthPayments = allRetainerPayments?.filter(p => {
            const d = new Date(p.due_date);
            const n = new Date();
            return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
         });

         // Mocking original variables to prevent errors if used later (startOfMonth/endOfMonth are defined above, leaving them unused is fine)
         const payError = null;

         if (payError) throw payError;
         setCurrentMonthPayments(monthPayments || []);

         // --- CALCULATIONS ---
         const paidRecoveries = recoveries?.filter(r => r.status === 'paid') || [];
         const revenueFromRecoveries = (paidRecoveries as any[]).reduce((sum, item) => sum + (item.my_company_amount || 0), 0);
         // 2. Retainers Revenue (Strictly from Payments)
         const paidRetainerPayments = (allRetainerPayments as any[])?.filter(p => p.status === 'paid') || [];

         const retainersMap = new Map(retainers?.map(r => [r.id, r]));

         const revenueFromRetainers = paidRetainerPayments.reduce((sum, payment) => {
            const retainer = retainersMap.get(payment.retainer_id);
            if (!retainer) return sum;
            // Calculate share
            const comm = retainer.commission_percent || 20;
            const share = (payment.amount || 0) * (comm / 100);
            return sum + share;
         }, 0);

         const realizedRevenue = revenueFromRecoveries + revenueFromRetainers;
         const totalExpenses = expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
         const netProfit = realizedRevenue - totalExpenses;

         const restitutionRecoveries = (recoveries as any[])?.filter(r => r.status === 'restitution') || [];
         const analysisRecoveries = (recoveries as any[])?.filter(r => r.status === 'analysis') || [];
         const pendingRevenue = (restitutionRecoveries as any[]).reduce((sum, r) => sum + (r.my_company_amount || 0), 0);
         const totalRecoveredVol = recoveries?.reduce((sum, r) => sum + (r.total_recovered || 0), 0) || 0;

         // --- CHART DATA (Last 6 Months) ---
         const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
         const today = new Date();
         const currentMonthIdx = today.getMonth();
         const last6MonthsIndices = Array.from({ length: 6 }, (_, i) => {
            let idx = currentMonthIdx - 5 + i;
            if (idx < 0) idx += 12;
            return idx;
         });

         const chartDataCalc = last6MonthsIndices.map(monthIdx => {
            const year = monthIdx > currentMonthIdx ? today.getFullYear() - 1 : today.getFullYear();

            // Recoveries Revenue
            const monthRecoveries = (paidRecoveries as any[]).filter(r => {
               const d = new Date(r.created_at!);
               return d.getMonth() === monthIdx && d.getFullYear() === year;
            });
            const recRevenue = monthRecoveries.reduce((sum, r) => sum + (r.my_company_amount || 0), 0);

            // Retainer Payments Revenue
            const monthRetainerPayments = paidRetainerPayments.filter(p => {
               const d = new Date(p.payment_date || p.due_date);
               return d.getMonth() === monthIdx && d.getFullYear() === year;
            });

            const retRevenue = monthRetainerPayments.reduce((sum, p) => {
               const retainer = retainersMap.get(p.retainer_id);
               if (!retainer) return sum;
               const comm = retainer.commission_percent || 20;
               return sum + ((p.amount || 0) * (comm / 100)); // Calculate share dynamically
            }, 0);

            // Expenses
            const monthExpenses = expenses?.filter(e => {
               const d = new Date(e.date);
               return d.getMonth() === monthIdx && d.getFullYear() === year;
            }) || [];
            const expAmount = (monthExpenses as any[]).reduce((sum, e) => sum + (e.amount || 0), 0);

            return { month: months[monthIdx], revenue: recRevenue + retRevenue, expense: expAmount };
         });

         setMetrics({
            totalRevenue: realizedRevenue,
            netProfit,
            pendingAnalysisCount: analysisRecoveries.length,
            totalRecoveredVolume: totalRecoveredVol,
            totalExpenses,
            pendingRevenue,
            realizedRevenue
         });

         setFilteredRecoveries([...restitutionRecoveries, ...analysisRecoveries]);
         const activeRetainersList = retainers?.filter(r => r.active) || [];
         setActiveRetainers(activeRetainersList);
         setRecentExpenses(expenses?.slice(0, 10) || []);
         setChartData(chartDataCalc);

      } catch (error) {
         console.error('Error fetching financial data:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleMarkAsPaid = async (retainer: any) => {
      try {
         const existingPayment = currentMonthPayments.find(p => p.retainer_id === retainer.id);
         const today = new Date();

         if (existingPayment) {
            const { error } = await supabase
               .from('financial_retainer_payments')
               // @ts-ignore
               .update({ status: 'paid', payment_date: today.toISOString() })
               .eq('id', existingPayment.id);
            if (error) throw error;
         } else {
            const paymentDay = retainer.start_date ? new Date(retainer.start_date).getDate() : 10;
            const dueDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);

            const { error } = await supabase.from('financial_retainer_payments').insert({
               retainer_id: retainer.id,
               due_date: dueDate.toISOString(),
               payment_date: today.toISOString(),
               amount: retainer.monthly_fee,
               status: 'paid'
            });
            if (error) throw error;
         }

         fetchData();
      } catch (error) {
         console.error('Error marking as paid:', error);
         alert('Erro ao marcar como pago.');
      }
   };

   const handleSetAsPending = async (paymentId: string) => {
      try {
         const { error } = await supabase
            .from('financial_retainer_payments')
            // @ts-ignore
            .update({ status: 'pending', payment_date: null }) // Clear payment date?
            .eq('id', paymentId);
         if (error) throw error;
         fetchData();
      } catch (error) {
         console.error('Error setting as pending:', error);
         alert('Erro ao marcar como pendente.');
      }
   };

   const handleDeleteRetainer = async (retainerId: string) => {
      if (!confirm('Tem certeza que deseja remover este mensalista da lista? O histórico será mantido.')) return;
      try {
         const { error } = await supabase
            .from('financial_retainers')
            // @ts-ignore
            .update({ active: false })
            .eq('id', retainerId);
         if (error) throw error;
         fetchData();
      } catch (error) {
         console.error('Error deleting retainer:', error);
         alert('Erro ao excluir mensalista.');
      }
   };

   const handleDeleteRecovery = async (recoveryId: string) => {
      if (!confirm('Tem certeza que deseja excluir esta recuperação?')) return;
      try {
         const { error } = await supabase
            .from('financial_recoveries')
            .delete()
            .eq('id', recoveryId);
         if (error) throw error;
         fetchData();
      } catch (error) {
         console.error('Error deleting recovery:', error);
         alert('Erro ao excluir recuperação.');
      }
   };

   const openHistory = (retainer: any) => {
      setSelectedRetainerId(retainer.id);
      setSelectedClientName(retainer.client_name);
      setIsHistoryModalOpen(true);
   };

   useEffect(() => {
      fetchData();
   }, []);

   return (
      <Layout onNavigate={onNavigate} activePage={activePage}>
         {/* Top Navbar */}
         <Header
            title="Gestão Financeira"
            description="Acompanhe resultados, metas e saúde financeira da consultoria."
            onNavigate={onNavigate}
         />

         {/* Scrollable Dashboard Content */}
         <div className="flex-1 lg:overflow-y-auto p-4 md:p-6 bg-transparent">
            <div className="mx-auto max-w-7xl">
               {/* Page Heading & Controls */}
               <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-end sm:items-end sm:flex-row">
                  <div>
                     <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Gestão Financeira</h2>
                     <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Acompanhe resultados, metas e saúde financeira da consultoria.</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 hover:border-primary/30 transition-all active:scale-95"
                     >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                        Despesa
                     </button>
                     <button
                        onClick={() => setIsRetainerModalOpen(true)}
                        className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 hover:border-primary/30 transition-all active:scale-95"
                     >
                        <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                        Mensalista
                     </button>
                     <button
                        onClick={() => setIsRecoveryModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95"
                     >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Nova Recuperação
                     </button>
                  </div>
               </div>


               {/* KPI Stats Grid */}
               <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                     {
                        label: 'Receita Realizada',
                        value: metrics.realizedRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                        icon: 'monetization_on',
                        color: 'blue',
                        trend: 'Valores em Caixa',
                        trendColor: 'blue'
                     },
                     {
                        label: 'Lucro Líquido',
                        value: metrics.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                        icon: 'account_balance_wallet',
                        color: 'emerald',
                        trend: 'Após Despesas',
                        trendColor: 'emerald'
                     },
                     {
                        label: 'Despesas Totais',
                        value: metrics.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                        icon: 'trending_down',
                        color: 'rose',
                        trend: 'Custos Operac.',
                        trendColor: 'rose',
                     },
                     {
                        label: 'Receita Pendente',
                        value: metrics.pendingRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                        icon: 'pending_actions',
                        color: 'amber',
                        trend: `${metrics.pendingAnalysisCount} processos em análise`,
                        trendColor: 'amber'
                     },
                  ].map((kpi, i) => (
                     <div key={i} className="glass-card rounded-xl p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                           <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
                           <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-${kpi.color}-500/20 text-${kpi.color}-400`}>
                              <span className="material-symbols-outlined text-lg">{kpi.icon}</span>
                           </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</h3>
                        <p className={`mt-2 text-xs font-medium text-${kpi.trendColor}-600 dark:text-${kpi.trendColor}-400 flex items-center gap-1`}>
                           {kpi.trend}
                        </p>
                     </div>
                  ))}
               </div>

               {/* Charts Section */}
               <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="glass-card rounded-xl p-6 shadow-sm lg:col-span-2">
                     <div className="mb-6 flex items-center justify-between">
                        <div>
                           <h3 className="text-base font-bold text-gray-900 dark:text-white">Fluxo Financeiro (Últimos 6 Meses)</h3>
                           <p className="text-sm text-gray-500 dark:text-gray-400">Receitas Realizadas vs Despesas</p>
                        </div>
                     </div>
                     {/* Visual Chart Bars - Recharts Implementation */}
                     <div className="h-64 w-full">
                        {/* Gradients */}
                        <svg style={{ height: 0, width: 0, position: 'absolute' }}>
                           <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#d4af37" stopOpacity={0.8} />
                                 <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#fb7185" stopOpacity={0.8} />
                                 <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                              </linearGradient>
                           </defs>
                        </svg>

                        <div className="h-full w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                 <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                 />
                                 <Tooltip
                                    cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                                    content={({ active, payload, label }) => {
                                       if (active && payload && payload.length) {
                                          return (
                                             <div className="glass-panel p-3 rounded-lg shadow-xl border border-glass-border">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{label}</p>
                                                <div className="flex items-center gap-2 mb-1">
                                                   <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                   <span className="text-xs text-gray-500">Rec:</span>
                                                   <span className="text-xs font-bold text-primary">
                                                      {Number(payload[0].value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                   </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                   <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                                                   <span className="text-xs text-gray-500">Desp:</span>
                                                   <span className="text-xs font-bold text-rose-400">
                                                      {Number(payload[1].value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                   </span>
                                                </div>
                                             </div>
                                          );
                                       }
                                       return null;
                                    }}
                                 />
                                 <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#d4af37"
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    strokeWidth={2}
                                 />
                                 <Area
                                    type="monotone"
                                    dataKey="expense"
                                    stroke="#fb7185"
                                    fillOpacity={1}
                                    fill="url(#colorExpense)"
                                    strokeWidth={2}
                                 />
                              </AreaChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                  </div>

                  {/* Secondary Stats */}
                  <div className="flex flex-col gap-6 lg:col-span-1">
                     <div className="flex-1 glass-card rounded-xl p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-white">Volume Recuperado</h3>
                        <div className="flex flex-col gap-4">
                           <div className="relative pt-1">
                              <div className="mb-2 flex items-center justify-between">
                                 <div className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">Total Bruto</div>
                                 <div className="text-right text-xs font-semibold text-primary">
                                    {metrics.totalRecoveredVolume.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                 </div>
                              </div>
                              {/* Recharts Pie Chart Mini or just simple bar? Keeping simple bar but animated */}
                              <div className="flex h-2 overflow-hidden rounded bg-gray-100 text-xs dark:bg-gray-800">
                                 <div
                                    className="animate-stripes flex flex-col justify-center bg-blue-500 text-center text-white shadow-none whitespace-nowrap transition-all duration-500"
                                    style={{ width: '100%' }}
                                 ></div>
                              </div>
                           </div>
                        </div>
                        <div className="mt-6 flex items-center gap-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/10">
                           <div className="rounded-full bg-white p-2 text-primary shadow-sm dark:bg-gray-800">
                              <span className="material-symbols-outlined block">lightbulb</span>
                           </div>
                           <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Info</p>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                 Esse é o volume total recuperado para clientes, base para cálculo dos honorários.
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Tables Section */}
               {/* Tables Section */}
               <div className="flex flex-col gap-8">
                  {/* Recuperações em Andamento */}
                  <div className="glass-card rounded-xl shadow-sm">
                     <div className="flex items-center justify-between border-b border-glass-border px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="material-symbols-outlined text-amber-500">pending</span>
                           <h3 className="text-base font-bold text-gray-900 dark:text-white">Recuperações em Andamento</h3>
                        </div>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                           <thead className="bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-400">
                              <tr>
                                 <th className="px-6 py-3 font-semibold">Cliente</th>
                                 <th className="px-6 py-3 font-semibold">Valor Bruto</th>
                                 <th className="px-6 py-3 font-semibold">Comissão Parc.</th>
                                 <th className="px-6 py-3 font-semibold">Receita Realizada</th>
                                 <th className="px-6 py-3 font-semibold text-amber-600">Receita Pendente</th>
                                 <th className="px-6 py-3 font-semibold">Status</th>
                                 <th className="px-6 py-3 font-semibold text-right">Ações</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-glass-border">
                              {filteredRecoveries.length > 0 ? (
                                 filteredRecoveries.map((rec) => (
                                    <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                                       <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{rec.client_name}</td>
                                       <td className="px-6 py-4">{rec.total_recovered?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                       <td className="px-6 py-4 text-slate-500">
                                          {rec.partner_amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({rec.partner_percent}%)
                                       </td>
                                       <td className="px-6 py-4 font-medium text-slate-400">
                                          {/* For now, In Progress means 0 realized */}
                                          R$ 0,00
                                       </td>
                                       <td className="px-6 py-4 font-bold text-amber-600">
                                          {rec.my_company_amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                       </td>
                                       <td className="px-6 py-4">
                                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium uppercase ${rec.status === 'restitution'
                                             ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                             : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                             }`}>
                                             {rec.status === 'restitution' ? 'Em Restituição' : 'Em Análise'}
                                          </span>
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-2">
                                             <button
                                                onClick={() => {
                                                   setEditingRecovery(rec);
                                                   setIsRecoveryModalOpen(true);
                                                }}
                                                className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                title="Editar"
                                             >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                             </button>
                                             <button
                                                onClick={() => handleDeleteRecovery(rec.id)}
                                                className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                                                title="Excluir"
                                             >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                             </button>
                                          </div>
                                       </td>
                                    </tr>
                                 ))
                              ) : (
                                 <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                       Nenhuma recuperação em andamento.
                                    </td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                     {/* Mensalistas Ativos */}
                     {/* Mensalistas Ativos */}
                     <div className="glass-card rounded-xl shadow-sm">
                        <div className="flex items-center justify-between border-b border-glass-border px-6 py-4">
                           <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-blue-500">calendar_today</span>
                              <h3 className="text-base font-bold text-gray-900 dark:text-white">Mensalistas Ativos</h3>
                           </div>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                              <thead className="bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-400">
                                 <tr>
                                    <th className="px-6 py-3 font-semibold">Cliente</th>
                                    <th className="px-6 py-3 font-semibold">Dia Pagamento</th>
                                    <th className="px-6 py-3 font-semibold">Mensalidade</th>
                                    <th className="px-6 py-3 font-semibold">Nossa Parte</th>
                                    <th className="px-6 py-3 font-semibold">Status (Mês Atual)</th>
                                    <th className="px-6 py-3 font-semibold text-right">Ações</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-glass-border">
                                 {activeRetainers.length > 0 ? (
                                    activeRetainers.map((ret) => {
                                       const payment = currentMonthPayments.find(p => p.retainer_id === ret.id);
                                       const isPaid = payment?.status === 'paid';

                                       // Calculate next upcoming payment date
                                       const today = new Date();
                                       // Parse YYYY-MM-DD
                                       const dayNum = ret.start_date ? parseInt(ret.start_date.split('-')[2]) : 10;
                                       const dueDate = new Date(today.getFullYear(), today.getMonth(), dayNum);
                                       const formattedDate = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                                       return (
                                          <tr key={ret.id} className="hover:bg-white/5 transition-colors group">
                                             <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                <button
                                                   onClick={() => openHistory(ret)}
                                                   className="hover:text-primary underline-offset-4 hover:underline flex items-center gap-1"
                                                >
                                                   {ret.client_name}
                                                   <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 transition-opacity">history</span>
                                                </button>
                                             </td>
                                             <td className="px-6 py-4 text-center font-medium">
                                                {formattedDate}
                                             </td>
                                             <td className="px-6 py-4">{ret.monthly_fee?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                             <td className="px-6 py-4 font-bold text-blue-600">
                                                {ret.our_share?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                             </td>
                                             <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                   {isPaid ? (
                                                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full text-xs">
                                                         <span className="material-symbols-outlined text-sm">check_circle</span>
                                                         Pago
                                                      </span>
                                                   ) : (
                                                      <button
                                                         onClick={() => handleMarkAsPaid(ret)}
                                                         className="text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1"
                                                      >
                                                         <span className="material-symbols-outlined text-xs">payments</span>
                                                         Marcar Pago
                                                      </button>
                                                   )}
                                                </div>
                                             </td>
                                             <td className="px-6 py-4 text-right relative">
                                                <button
                                                   onClick={(e) => {
                                                      e.stopPropagation();
                                                      setActiveDropdownId(ret.id);
                                                   }}
                                                   className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                >
                                                   <span className="material-symbols-outlined text-lg">more_horiz</span>
                                                </button>

                                                {activeDropdownId === ret.id && (
                                                   <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => {
                                                      e.stopPropagation();
                                                      setActiveDropdownId(null);
                                                   }}>
                                                      <div
                                                         className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-72 border border-gray-200 dark:border-gray-700 p-1 overflow-hidden"
                                                         onClick={(e) => e.stopPropagation()}
                                                      >
                                                         <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 mb-1">
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-left">Ações do Mensalista</h3>
                                                         </div>

                                                         <div className="flex flex-col p-1">
                                                            <button
                                                               onClick={() => {
                                                                  setEditingRetainer(ret);
                                                                  setIsRetainerModalOpen(true);
                                                                  setActiveDropdownId(null);
                                                               }}
                                                               className="w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg flex items-center gap-3 transition-colors"
                                                            >
                                                               <span className="material-symbols-outlined text-xl text-gray-500">edit</span>
                                                               Editar Contrato
                                                            </button>

                                                            {isPaid && payment && (
                                                               <button
                                                                  onClick={() => {
                                                                     handleSetAsPending(payment.id);
                                                                     setActiveDropdownId(null);
                                                                  }}
                                                                  className="w-full px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-900/20 rounded-lg flex items-center gap-3 transition-colors"
                                                               >
                                                                  <span className="material-symbols-outlined text-xl">pending</span>
                                                                  Marcar como Pendente
                                                               </button>
                                                            )}

                                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2"></div>

                                                            <button
                                                               onClick={() => {
                                                                  handleDeleteRetainer(ret.id);
                                                                  setActiveDropdownId(null);
                                                               }}
                                                               className="w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg flex items-center gap-3 transition-colors"
                                                            >
                                                               <span className="material-symbols-outlined text-xl">delete</span>
                                                               Remover da Lista
                                                            </button>
                                                         </div>
                                                      </div>
                                                   </div>
                                                )}
                                             </td>
                                          </tr>
                                       );
                                    })
                                 ) : (
                                    <tr>
                                       <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                          Nenhum mensalista ativo.
                                       </td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>

                     {/* Despesas Recentes */}
                     <div className="glass-card rounded-xl shadow-sm">
                        <div className="flex items-center justify-between border-b border-glass-border px-6 py-4">
                           <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-rose-500">trending_down</span>
                              <h3 className="text-base font-bold text-gray-900 dark:text-white">Despesas Recentes</h3>
                           </div>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                              <thead className="bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-400">
                                 <tr>
                                    <th className="px-6 py-3 font-semibold">Descrição</th>
                                    <th className="px-6 py-3 font-semibold">Categoria</th>
                                    <th className="px-6 py-3 font-semibold">Valor</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-glass-border">
                                 {recentExpenses.length > 0 ? (
                                    recentExpenses.map((exp) => (
                                       <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                             {exp.description}
                                             <div className="text-xs text-slate-500 font-normal">{new Date(exp.date).toLocaleDateString('pt-BR')}</div>
                                          </td>
                                          <td className="px-6 py-4">
                                             <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                {exp.category}
                                             </span>
                                          </td>
                                          <td className="px-6 py-4 font-bold text-rose-600">
                                             - {exp.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </td>
                                       </tr>
                                    ))
                                 ) : (
                                    <tr>
                                       <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                          Nenhuma despesa recente.
                                       </td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               </div>

               <footer className="mt-12 border-t border-glass-border py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  © 2024 Kern & Oliveira - Consultoria Tributária. Todos os direitos reservados.
               </footer>
            </div>
         </div>

         {/* Modals */}
         <AddRecoveryModal
            isOpen={isRecoveryModalOpen}
            onClose={() => {
               setIsRecoveryModalOpen(false);
               setEditingRecovery(null);
            }}
            onSuccess={fetchData}
            initialData={editingRecovery}
         />
         <AddRetainerModal
            isOpen={isRetainerModalOpen}
            onClose={() => {
               setIsRetainerModalOpen(false);
               setEditingRetainer(null);
            }}
            onSuccess={fetchData}
            initialData={editingRetainer}
         />
         <AddExpenseModal
            isOpen={isExpenseModalOpen}
            onClose={() => setIsExpenseModalOpen(false)}
            onSuccess={fetchData}
         />


         <RetainerHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            retainerId={selectedRetainerId}
            clientName={selectedClientName}
            onUpdate={fetchData}
         />

      </Layout >
   );
}