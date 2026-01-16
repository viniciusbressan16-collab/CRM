import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import AddGoalModal from '../components/AddGoalModal';
import UpdateGoalProgressModal from '../components/UpdateGoalProgressModal';
import { View } from '../App';
import { useAuth } from '../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../utils/roles';

import Header from '../components/Header';

interface GoalsPageProps {
  onNavigate: (view: View, id?: string) => void;
  activePage: View;
}

export default function GoalsPage({ onNavigate, activePage }: GoalsPageProps) {
  const { profile } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProgressGoal, setEditingProgressGoal] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalGoals: 0,
    completedGoals: 0,
    totalTarget: 0,
    totalCurrent: 0,
    averageProgress: 0,
    topPerformer: null as any
  });
  const [rankings, setRankings] = useState<any[]>([]);

  /* Removed client-side history calculation in favor of RPC */

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from('goals')
      .select(`
        *,
        assignee:profiles(id, name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching goals:', error);
    } else {
      setGoals(data || []);
      calculateStats(data || []);
    }
    setLoading(false);
  };

  const calculateStats = (data: any[]) => {
    const total = data.length;
    if (total === 0) {
      setStats({ totalGoals: 0, completedGoals: 0, totalTarget: 0, totalCurrent: 0, averageProgress: 0, topPerformer: null });
      return;
    }

    const completed = data.filter(g => (g.current_value || 0) >= g.target_value).length;
    const totalTarget = data.reduce((sum, g) => sum + (g.target_value || 0), 0);
    const totalCurrent = data.reduce((sum, g) => sum + (g.current_value || 0), 0);
    if (!total) {
      setStats({ totalGoals: 0, completedGoals: 0, totalTarget: 0, totalCurrent: 0, averageProgress: 0, topPerformer: null });
      return;
    }

    const progressSum = data.reduce((sum, g) => {
      const p = Math.min(100, Math.round(((g.current_value || 0) / (g.target_value || 1)) * 100));
      return sum + p;
    }, 0);

    // Calculate Rankings
    const userMap = new Map();
    data.forEach(g => {
      if (!g.user_id) return; // Skip general goals for individual ranking
      if (!userMap.has(g.user_id)) {
        userMap.set(g.user_id, {
          id: g.user_id,
          name: g.assignee?.name || 'Sem Nome',
          avatar_url: g.assignee?.avatar_url,
          totalProgress: 0,
          goalCount: 0,
          completedCount: 0
        });
      }
      const user = userMap.get(g.user_id);
      const p = Math.round(((g.current_value || 0) / (g.target_value || 1)) * 100);
      user.totalProgress += p; // Allow overachievement in rank!
      user.goalCount += 1;
      if (p >= 100) user.completedCount += 1;
    });

    const rankList = Array.from(userMap.values()).map((u: any) => ({
      ...u,
      average: Math.round(u.totalProgress / u.goalCount)
    })).sort((a, b) => b.average - a.average);

    setRankings(rankList);

    setStats({
      totalGoals: total,
      completedGoals: completed,
      totalTarget,
      totalCurrent,
      averageProgress: Math.round(progressSum / total),
      topPerformer: rankList.length > 0 ? rankList[0] : null
    });
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Erro ao excluir meta.');
    }
  };

  const calculateProgress = (current: number | null, target: number) => {
    const curr = current || 0;
    if (!target) return 0;
    return Math.round((curr / target) * 100);
  };

  return (
    <Layout activePage={activePage} onNavigate={onNavigate}>
      <Header
        title="Controle de Metas"
        description="Acompanhe o desempenho e objetivos da equipe em tempo real."
        onNavigate={onNavigate}
      >
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-white/50 dark:bg-black/40 border border-glass-border text-slate-900 dark:text-gray-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-shadow cursor-pointer backdrop-blur-md"
            >
              <option value="all" className="bg-gray-100 dark:bg-gray-900 text-slate-900 dark:text-gray-200">Todas as Metas</option>
              <option value="mine" className="bg-gray-100 dark:bg-gray-900 text-slate-900 dark:text-gray-200">Minhas Metas</option>
              <option value="general" className="bg-gray-100 dark:bg-gray-900 text-slate-900 dark:text-gray-200">Responsabilidade Geral</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-lg">filter_list</span>
          </div>
          {hasPermission(profile?.role, PERMISSIONS.EDIT_GOALS) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="glass-button flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl h-12 px-6 text-primary hover:text-black hover:bg-primary text-sm font-bold shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span className="truncate">Nova Meta</span>
            </button>
          )}
        </div>
      </Header>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 scroll-smooth custom-scrollbar">
          <div className="max-w-[1600px] mx-auto flex flex-col gap-8 pb-10">

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              <div className="glass-card p-6 rounded-2xl hover:border-primary/30 hover:-translate-y-1 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-primary/10 rounded-lg text-primary group-hover:text-white group-hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined">flag</span>
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Metas Totais</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-medium text-slate-900 dark:text-white">{stats.totalGoals}</h2>
                  <span className="text-sm font-medium text-gray-500">ativas</span>
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl hover:border-emerald-500/30 hover:-translate-y-1 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Concluídas</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-medium text-slate-900 dark:text-white">{stats.completedGoals}</h2>
                  <span className="text-sm font-medium text-emerald-500">
                    ({stats.totalGoals ? Math.round((stats.completedGoals / stats.totalGoals) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl hover:border-amber-500/30 hover:-translate-y-1 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                    <span className="material-symbols-outlined">trending_up</span>
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Progresso Médio</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-medium text-slate-900 dark:text-white">{stats.averageProgress}%</h2>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-600 to-primary h-1.5 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(250,232,176,0.3)]" style={{ width: `${stats.averageProgress}%` }}></div>
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl hover:border-violet-500/30 hover:-translate-y-1 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-violet-500/10 rounded-lg text-violet-400 group-hover:bg-violet-500/20 transition-colors">
                    <span className="material-symbols-outlined">target</span>
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Volume Alvo</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-medium text-slate-900 dark:text-white">{stats.totalCurrent}</h2>
                  <span className="text-sm font-medium text-gray-600">/ {stats.totalTarget}</span>
                </div>
              </div>

            </section>

            {/* Goals List (Now First) */}
            <section className="glass-panel rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-glass-border flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">list_alt</span>
                  <span className="text-slate-900 dark:text-white">Lista de Metas</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-glass-border">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Responsável</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Meta</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Período</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Progresso</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {loading ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 animate-pulse">Carregando metas...</td></tr>
                    ) : goals.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl text-gray-700">dataset</span>
                          <p>Nenhuma meta encontrada.</p>
                        </div>
                      </td></tr>
                    ) : (
                      goals.filter(g => {
                        if (filter === 'mine') return g.user_id === currentUserId;
                        if (filter === 'general') return g.user_id === null;
                        return true;
                      }).map((goal) => {
                        const progress = calculateProgress(goal.current_value, goal.target_value);
                        const statusColor = progress >= 100 ? 'emerald' : progress >= 50 ? 'primary' : 'rose';
                        // Map tailwind color names to hex/classes if needed, but for dynamic classes standard is tricky.
                        // We will use inline style or simpler logic. Let's use classes manually.

                        let barColorClass = 'bg-rose-500';
                        if (progress >= 100) barColorClass = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]';
                        else if (progress >= 50) barColorClass = 'bg-primary shadow-[0_0_10px_rgba(250,232,176,0.3)]';

                        return (
                          <tr key={goal.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {goal.user_id ? (
                                  <>
                                    {goal.assignee?.avatar_url ? (
                                      <div className="size-9 rounded-full bg-cover bg-center border border-glass-border" style={{ backgroundImage: `url('${goal.assignee.avatar_url}')` }}></div>
                                    ) : (
                                      <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                                        {goal.assignee?.name?.substring(0, 2).toUpperCase() || '??'}
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{goal.assignee?.name || 'Não atribuído'}</p>
                                      <p className="text-xs text-gray-500">Responsável</p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shadow-[0_0_10px_rgba(250,232,176,0.1)]">
                                      <span className="material-symbols-outlined text-lg">groups</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Equipe (Geral)</p>
                                      <p className="text-xs text-gray-500">Todos</p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-200/50 dark:bg-white/5 text-slate-700 dark:text-gray-300 border border-black/5 dark:border-white/10 uppercase tracking-wide">
                                {goal.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm text-gray-400 capitalize">{goal.period}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-medium">
                                  <span className="text-slate-900 dark:text-white">{goal.current_value || 0}</span>
                                  <span className="text-gray-500">Meta: {goal.target_value}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                                    style={{ width: `${Math.min(100, progress)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setEditingProgressGoal(goal)}
                                  className="p-2 text-gray-400 hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all"
                                  title="Atualizar Progresso"
                                >
                                  <span className="material-symbols-outlined text-lg">edit_square</span>
                                </button>
                                {hasPermission(profile?.role, PERMISSIONS.EDIT_GOALS) && (
                                  <button
                                    onClick={() => handleDeleteGoal(goal.id)}
                                    className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                    title="Excluir Meta"
                                  >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Dashboard (Ranking) - Now Below List */}
            <div className="flex flex-col gap-8">

              {/* Ranking Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Top Performer Card */}
                {stats.topPerformer ? (
                  <div className="bg-gradient-to-br from-gray-900 to-black border border-glass-border rounded-2xl p-6 text-white shadow-lg shadow-black/40 relative overflow-hidden flex flex-col justify-center min-h-[250px] group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent bg-fixed pointer-events-none"></div>
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                      <span className="material-symbols-outlined text-9xl text-primary">emoji_events</span>
                    </div>
                    <div className="relative z-10">
                      <span className="text-xs font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/20 px-3 py-1 rounded-lg backdrop-blur-sm">Top 1 do Mês</span>
                      <div className="mt-6 flex items-center gap-5">
                        {stats.topPerformer.avatar_url ? (
                          <div className="size-20 rounded-full bg-cover bg-center border-4 border-primary/30 shadow-[0_0_20px_rgba(250,232,176,0.2)]" style={{ backgroundImage: `url('${stats.topPerformer.avatar_url}')` }}></div>
                        ) : (
                          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center font-bold text-2xl border-4 border-primary/30 text-primary shadow-[0_0_20px_rgba(250,232,176,0.1)]">
                            {stats.topPerformer.name?.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="text-2xl font-bold text-white tracking-wide">{stats.topPerformer.name}</h3>
                          <p className="text-primary/70 text-sm font-medium mt-1">{stats.topPerformer.completedCount} metas concluídas</p>
                        </div>
                      </div>
                      <div className="mt-8">
                        <div className="flex justify-between text-sm font-medium mb-2">
                          <span className="text-gray-400">Desempenho Geral</span>
                          <span className="text-primary">{stats.topPerformer.average}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-white/5">
                          <div className="bg-gradient-to-r from-primary to-amber-500 h-2 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(250,232,176,0.4)]" style={{ width: `${Math.min(100, stats.topPerformer.average)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel p-6 rounded-2xl text-gray-500 text-center border border-dashed border-gray-700 flex flex-col items-center justify-center gap-3 min-h-[250px]">
                    <span className="material-symbols-outlined text-5xl opacity-30">emoji_events</span>
                    <p className="text-sm font-medium">Aguardando Top Performer</p>
                    <p className="text-xs opacity-60">Ninguém atingiu as metas ainda.</p>
                  </div>
                )}

                {/* Ranking List - Detailed Table */}
                <div className="glass-panel rounded-2xl overflow-hidden h-full">
                  <div className="px-6 py-5 border-b border-glass-border flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-500">leaderboard</span>
                      <span className="text-slate-900 dark:text-white">Ranking de Performance</span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-glass-border">
                          <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500 text-center">#</th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500">Consultor</th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500 text-center">Metas</th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500 text-center">% Sucesso</th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500 text-right">Nota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass-border">
                        {rankings.map((user, index) => {
                          let badgeColor = "bg-gray-800 text-gray-400 border border-gray-700";
                          let badgeText = "Normal";
                          if (user.average >= 100) { badgeColor = "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(250,232,176,0.1)]"; badgeText = "Excelente"; }
                          else if (user.average >= 75) { badgeColor = "bg-blue-900/20 text-blue-400 border border-blue-500/20"; badgeText = "Bom"; }
                          else if (user.average < 50) { badgeColor = "bg-rose-900/20 text-rose-400 border border-rose-500/20"; badgeText = "Atenção"; }

                          return (
                            <tr key={user.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-center">
                                <div className={`size-6 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]' : index === 1 ? 'bg-gray-300 dark:bg-gray-400 text-black' : index === 2 ? 'bg-orange-700 text-white' : 'text-gray-600 bg-black/5 dark:bg-white/5'}`}>
                                  {index + 1}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {user.avatar_url ? (
                                    <div className="size-8 rounded-full bg-cover bg-center border border-glass-border" style={{ backgroundImage: `url('${user.avatar_url}')` }}></div>
                                  ) : (
                                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary border border-primary/10">
                                      {user.name?.substring(0, 1) || '?'}
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{user.name}</span>
                                    <span className="text-xs text-gray-500">{user.completedCount} concluídas</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-medium">
                                <span className="text-slate-900 dark:text-white">{user.completedCount}</span>
                                <span className="text-gray-600"> / {user.goalCount}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${user.average >= 100 ? 'bg-primary shadow-[0_0_8px_rgba(250,232,176,0.3)]' : 'bg-gray-500'}`} style={{ width: `${Math.min(100, user.average)}%` }}></div>
                                  </div>
                                  <span className="text-xs font-bold w-8 text-right text-gray-400">{user.average}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                  {badgeText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {rankings.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-gray-500">Sem dados para ranking.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <AddGoalModal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
              onSuccess={fetchGoals}
            />

            <UpdateGoalProgressModal
              isOpen={!!editingProgressGoal}
              onClose={() => setEditingProgressGoal(null)}
              onSuccess={fetchGoals}
              goal={editingProgressGoal}
            />
          </div>
        </div>
      </main>
    </Layout>
  );
}