import React, { useState, useEffect } from 'react';
import { View } from '../App';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import Header from '../components/Header';
import AddProjectModal from '../components/AddProjectModal';
import { supabase } from '../lib/supabaseClient';

interface InternalProjectsPageProps {
  onNavigate: (view: View, id?: string) => void;
  activePage: View;
}

export default function InternalProjectsPage({ onNavigate, activePage }: InternalProjectsPageProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [projectToEdit, setProjectToEdit] = useState<any>(null);

  // State with Persistence
  const [categoryFilter, setCategoryFilter] = useState(() => localStorage.getItem('taxcrm_projects_category_filter') || 'Todos');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'delayed' | 'completed'>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // For main view if needed, but History has its own
  const [historyWeek, setHistoryWeek] = useState<string>(''); // Format: "YYYY-Www"
  const [activeTab, setActiveTab] = useState<'projects' | 'history'>('projects');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('taxcrm_projects_view_mode') as any) || 'grid');

  // Helper to get current ISO week
  const getCurrentISOWeek = () => {
    const d = new Date();
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('taxcrm_projects_visible_columns');
    return saved ? JSON.parse(saved) : ['project', 'status', 'next_steps', 'members', 'progress', 'due_date', 'actions'];
  });

  // Initialize with current week if empty
  useEffect(() => {
    if (!historyWeek) {
      setHistoryWeek(getCurrentISOWeek());
    }
  }, []);

  // Persistence Effects
  useEffect(() => { localStorage.setItem('taxcrm_projects_category_filter', categoryFilter); }, [categoryFilter]);
  useEffect(() => { localStorage.setItem('taxcrm_projects_status_filter', statusFilter); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('taxcrm_projects_view_mode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('taxcrm_projects_visible_columns', JSON.stringify(visibleColumns)); }, [visibleColumns]);

  // Column Customization
  // Column Customization
  const baseColumns = [
    { id: 'project', label: 'Projeto' },
    { id: 'status', label: 'Status' },
    { id: 'members', label: 'Membros' },
    { id: 'progress', label: 'Progresso' },
    { id: 'due_date', label: 'Prazo' },
    { id: 'next_steps', label: 'Próximos Passos' },
    { id: 'category', label: 'Categoria' },
    { id: 'budget', label: 'Orçamento' },
    { id: 'priority', label: 'Prioridade' },
    { id: 'actions', label: 'Ações' }
  ];

  const [customColumns, setCustomColumns] = useState<any[]>([]);
  const ALL_COLUMNS = [...baseColumns, ...customColumns];

  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);

  // Custom Cell Editing State
  const [editingCell, setEditingCell] = useState<{ projectId: string, columnId: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Helper to toggle column visibility
  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(c => c !== columnId)
        : [...prev, columnId]
    );
  };

  useEffect(() => {
    fetchProjects();
    fetchCustomColumns();
  }, []);

  const fetchCustomColumns = async () => {
    const { data } = await supabase.from('project_column_definitions').select('*');
    if (data) {
      setCustomColumns(data.map(c => ({ id: c.id, label: c.label, isCustom: true })));
    }
  };

  const handleAddCustomColumn = async () => {
    const label = prompt("Nome da nova coluna:");
    if (!label) return;

    const { data, error } = await supabase
      .from('project_column_definitions')
      .insert({ label })
      .select()
      .single();

    if (error) {
      console.error('Error creating column:', error);
      alert('Erro ao criar coluna.');
      return;
    }

    if (data) {
      setCustomColumns(prev => [...prev, { id: data.id, label: data.label, isCustom: true }]);
      setVisibleColumns(prev => [...prev, data.id]);
    }
  };

  const handleDeleteCustomColumn = async (columnId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    if (!confirm('Tem certeza que deseja excluir esta coluna e todos os dados associados? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('project_column_definitions')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      // Remove from customColumns state
      setCustomColumns(prev => prev.filter(col => col.id !== columnId));
      // Remove from visibleColumns state
      setVisibleColumns(prev => prev.filter(id => id !== columnId));

      // Optional: You might want to remove the data from custom_fields in projects, 
      // but typically the column definition removal is enough to hide it. 
      // Cleaning up JSONB data is complex and usually not strictly necessary immediately.

    } catch (error) {
      console.error('Error deleting custom column:', error);
      alert('Erro ao excluir coluna.');
    }
  };

  const handleCustomCellUpdate = async (projectId: string, columnId: string, value: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          custom_fields: {
            ...(p.custom_fields || {}),
            [columnId]: value
          }
        };
      }
      return p;
    }));
    setEditingCell(null);

    try {
      const project = projects.find(p => p.id === projectId);
      const currentFields = project?.custom_fields || {};
      const newFields = { ...currentFields, [columnId]: value };

      const { error } = await supabase
        .from('internal_projects')
        .update({ custom_fields: newFields })
        .eq('id', projectId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving custom field:', error);
      alert('Erro ao salvar valor.');
      fetchProjects();
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    console.log('Fetching projects...');
    try {
      const { data, error } = await supabase
        .from('internal_projects')
        .select(`
          *,
          members:project_members(
             role,
             profile:profiles(id, name, avatar_url)
          ),
          tasks:project_tasks(id, title, status, due_date)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        throw error;
      }
      console.log('Projects fetched:', data);
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    try {
      const { error } = await supabase.from('internal_projects').delete().eq('id', id);
      if (error) throw error;
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Erro ao excluir.');
    }
  };

  // Filter Logic
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || p.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    let matchesDate = true;
    if (dateFilter) {
      const [year, week] = dateFilter.split('-W').map(Number);

      // Calculate start and end of the selected week
      const simpleDate = new Date(year, 0, 1 + (week - 1) * 7);
      const dayOfWeek = simpleDate.getDay();
      const weekStart = simpleDate;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Check overlap: Project Start <= Week End AND (Project End >= Week Start OR Status is active)
      // Proxy: created_at as Start, due_date as End. 
      // If due_date is missing, assume it goes indefinitely if not completed?
      // Or just check strictly? User said "what was done in that week", implying activity.

      const pStart = new Date(p.created_at);
      const pEnd = p.due_date ? new Date(p.due_date) : new Date(8640000000000000); // Max date if no due date

      // Overlap logic: Start <= RangeEnd && End >= RangeStart
      matchesDate = pStart <= weekEnd && pEnd >= weekStart;
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  // Stats
  const activeCount = projects.filter(p => p.status === 'in_progress').length;
  // TODO: Implement real dates logic for "Next Due"

  // Status Update Logic
  const handleStatusUpdate = async (projectId: string, newStatus: string) => {
    // Optimistic update
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, status: newStatus } : p
    ));
    setEditingStatusId(null);

    try {
      const { error } = await supabase
        .from('internal_projects')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error);
      fetchProjects(); // Revert on error
      alert('Erro ao atualizar status.');
    }
  };

  // Helper to find next step
  const calculateProgress = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'done').length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getNextStep = (tasks: any[]) => {
    console.log('Tasks for Next Step:', tasks);
    if (!tasks || tasks.length === 0) return null;
    // Filter pending tasks
    const pending = tasks.filter(t => t.status !== 'done');
    if (pending.length === 0) return null;

    // Sort by due date (asc) or title
    return pending.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })[0];
  };

  return (
    <Layout activePage={activePage} onNavigate={onNavigate}>
      <Header
        title="Gestão de Projetos Internos"
        description="Acompanhe e gerencie iniciativas estratégicas, parcerias e eventos internos da empresa."
        onNavigate={onNavigate}
      >
        {activeTab === 'projects' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-105 hover:bg-primary-hover focus:outline-none"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Novo Projeto</span>
          </button>
        )}
      </Header>

      {/* Tabs */}
      <div className="container mx-auto max-w-7xl px-4 md:px-8 mt-8 mb-6">
        <div className="bg-black/20 p-1 rounded-xl inline-flex border border-white/5 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'projects' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            Projetos Ativos
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'history' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            Histórico Semanal
          </button>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 md:p-8">

        {activeTab === 'projects' && (
          <>
            {/* Stats */}
            <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Projetos Ativos', val: activeCount, sub: 'Iniciativas em andamento', icon: 'trending_up', color: 'primary' },
                { title: 'Total de Projetos', val: projects.length, sub: 'Base histórica', icon: 'folder', color: 'blue' },
                { title: 'Atrasados', val: projects.filter(p => p.status === 'delayed').length, sub: 'Atenção necessária', icon: 'warning', color: 'red' },
              ].map((stat, i) => (
                <div key={i} className="glass-card relative overflow-hidden rounded-2xl border border-white/5 p-6 shadow-xl group hover:border-primary/20 transition-colors">
                  <div className={`absolute top-0 right-0 p-20 rounded-full bg-${stat.color === 'primary' ? 'primary' : stat.color + '-500'}/5 blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-${stat.color === 'primary' ? 'primary' : stat.color + '-500'}/10 transition-colors duration-500`}></div>

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/50">{stat.title}</span>
                      <span className={`text-4xl font-bold ${stat.color === 'primary' ? 'text-primary drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'text-white'}`}>{stat.val}</span>
                    </div>
                    <div className={`rounded-lg p-3 ${stat.color === 'primary' ? 'bg-primary/10 text-primary shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'bg-white/5 text-white/70'}`}>
                      <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs font-medium text-white/40 group-hover:text-white/60 transition-colors">{stat.sub}</p>

                  {/* Specular Highlight for that jewelry look */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-4">
                <div className="relative flex-1 max-w-md group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors pointer-events-none"><span className="material-symbols-outlined text-[20px]">search</span></span>
                  <input
                    className="h-12 w-full rounded-xl border border-white/5 bg-black/20 pr-4 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all shadow-inner hover:bg-black/30"
                    style={{ paddingLeft: '50px' }}
                    placeholder="Buscar projetos..."
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>




              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 custom-scrollbar">
                {['Todos', 'Marketing', 'Tecnologia', 'RH', 'Comercial', 'Financeiro', 'Operacional'].map((tag, i) => (
                  <button
                    key={tag}
                    onClick={() => setCategoryFilter(tag)}
                    className={`whitespace-nowrap px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all duration-300 ${categoryFilter === tag
                      ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                      : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:border-white/10 hover:text-white'
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters Row 2: Status & Display */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-black/20 p-1 rounded-lg flex items-center border border-white/5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    title="Visualização em Grade"
                  >
                    <span className="material-symbols-outlined text-[20px]">grid_view</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    title="Visualização em Lista"
                  >
                    <span className="material-symbols-outlined text-[20px]">view_list</span>
                  </button>
                </div>
                <div className="h-6 w-px bg-white/10 mx-2"></div>

                {/* Column Picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowColumnPicker(!showColumnPicker)}
                    className="bg-black/20 border border-white/10 text-xs rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">view_column</span>
                    Colunas
                  </button>

                  {showColumnPicker && (
                    <>
                      <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowColumnPicker(false)}></div>
                      <div className="absolute top-full left-0 mt-2 w-56 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-50 p-2 flex flex-col gap-1 backdrop-blur-xl">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Exibir Colunas</div>
                        {ALL_COLUMNS.map(col => (
                          <label
                            key={col.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group"
                            onClick={(e) => {
                              e.preventDefault(); // Prevent default label behavior
                              toggleColumn(col.id);
                            }}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleColumns.includes(col.id) ? 'bg-primary border-primary' : 'border-gray-600 bg-transparent group-hover:border-gray-500'}`}>
                              {visibleColumns.includes(col.id) && <span className="material-symbols-outlined text-[12px] text-black font-bold">check</span>}
                            </div>
                            <span className={`text-xs flex-1 ${visibleColumns.includes(col.id) ? 'text-white font-medium' : 'text-gray-400'}`}>{col.label}</span>

                            {(col as any).isCustom && (
                              <button
                                onClick={(e) => handleDeleteCustomColumn(col.id, e)}
                                className="p-1 hover:bg-white/10 rounded-md text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                title="Excluir Coluna"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            )}
                          </label>
                        ))}
                        <div className="border-t border-white/10 mt-1 pt-1">
                          <button
                            onClick={handleAddCustomColumn}
                            className="w-full text-left px-3 py-2 text-xs text-primary font-bold hover:bg-primary/10 rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            Nova Coluna
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>



                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-black/20 border border-white/10 text-xs rounded-lg px-3 py-2 text-white focus:border-primary outline-none"
                >
                  <option value="all">Todos os Status</option>
                  <option value="planning">Em Planejamento</option>
                  <option value="not_started">Pendente</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="delayed">Atrasados</option>
                  <option value="completed">Concluídos</option>
                </select>
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Exibindo {filteredProjects.length} projeto(s)
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-white">Histórico de Projetos</h2>
                <p className="text-sm text-white/40">Selecione uma semana para ver o snapshot do período.</p>
              </div>
              <div className="flex items-center gap-4 bg-black/40 p-1.5 rounded-xl border border-white/10">
                <button
                  onClick={() => {
                    const [y, w] = historyWeek.split('-W').map(Number);
                    let newY = y;
                    let newW = w - 1;
                    if (newW < 1) { newY--; newW = 52; } // Simplified rollback
                    setHistoryWeek(`${newY}-W${String(newW).padStart(2, '0')}`);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>

                <div className="flex flex-col items-center px-4 min-w-[200px]">
                  <span className="text-white font-bold text-sm tracking-widest uppercase">
                    {(() => {
                      if (!historyWeek) return 'Selecione...';
                      const [y, w] = historyWeek.split('-W').map(Number);
                      // Recalculate range for display
                      const simpleDate = new Date(y, 0, 1 + (w - 1) * 7);
                      const dow = simpleDate.getDay();
                      const ISOWeekStart = simpleDate;
                      if (dow <= 4) ISOWeekStart.setDate(simpleDate.getDate() - simpleDate.getDay() + 1);
                      else ISOWeekStart.setDate(simpleDate.getDate() + 8 - simpleDate.getDay());

                      const start = new Date(ISOWeekStart);
                      const end = new Date(start);
                      end.setDate(end.getDate() + 6);

                      return `Semana ${w}`;
                    })()}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    {(() => {
                      if (!historyWeek) return '';
                      const [y, w] = historyWeek.split('-W').map(Number);
                      const simpleDate = new Date(y, 0, 1 + (w - 1) * 7);
                      const dow = simpleDate.getDay();
                      const ISOWeekStart = simpleDate;
                      if (dow <= 4) ISOWeekStart.setDate(simpleDate.getDate() - simpleDate.getDay() + 1);
                      else ISOWeekStart.setDate(simpleDate.getDate() + 8 - simpleDate.getDay());

                      const start = new Date(ISOWeekStart);
                      const end = new Date(start);
                      end.setDate(end.getDate() + 6);

                      return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
                    })()}
                  </span>
                </div>

                <button
                  onClick={() => {
                    const [y, w] = historyWeek.split('-W').map(Number);
                    let newY = y;
                    let newW = w + 1;
                    if (newW > 52) { newY++; newW = 1; } // Simplified rollforward
                    setHistoryWeek(`${newY}-W${String(newW).padStart(2, '0')}`);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>

            {!historyWeek ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                <span className="material-symbols-outlined text-5xl text-white/10 mb-4">date_range</span>
                <p className="text-white/30">Selecione uma semana acima para visualizar o histórico.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {['in_progress', 'completed', 'delayed'].map(status => {
                  const weekProjects = projects.filter(p => {
                    const [yearStr, weekStr] = historyWeek.split('-W');
                    const year = parseInt(yearStr);
                    const week = parseInt(weekStr);

                    // Robust ISO Week Calculation
                    const simpleDate = new Date(year, 0, 1 + (week - 1) * 7);
                    const dayOfWeek = simpleDate.getDay();
                    const ISOWeekStart = simpleDate;
                    if (dayOfWeek <= 4)
                      ISOWeekStart.setDate(simpleDate.getDate() - simpleDate.getDay() + 1);
                    else
                      ISOWeekStart.setDate(simpleDate.getDate() + 8 - simpleDate.getDay());

                    const weekStart = new Date(ISOWeekStart);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    weekEnd.setHours(23, 59, 59, 999);

                    if (isNaN(weekStart.getTime())) return false;

                    const pStart = new Date(p.created_at);
                    const pEnd = p.due_date ? new Date(p.due_date) : new Date(8640000000000000);
                    if (p.due_date) pEnd.setHours(23, 59, 59, 999);

                    // Date Overlap Check
                    const isActiveInWeek = pStart <= weekEnd && pEnd >= weekStart;

                    // Completed Timestamp Heuristic:
                    // Use completed_at if available, else updated_at as fallback for completion time
                    const completedAt = p.status === 'completed' ? new Date(p.completed_at || p.updated_at || new Date()) : null;

                    if (!isActiveInWeek) {
                      // Special case: If it was completed in this week, we might want to show it even if "active" range (due date) didn't overlap perfectly?
                      // But usually overlap covers it.
                      return false;
                    }

                    // HIDE FROM FUTURE: If project was completed prior to this week, it should not appear at all.
                    // (It should have appeared in the week was completed as "Completed", and then disappear).
                    if (completedAt && weekStart > completedAt) {
                      return false;
                    }

                    // STATUS LOGIC

                    // Define the "Snapshot Point" in time we are evaluating against.
                    // If the week is in the past, we look at the state at the end of that week.
                    // If the week is current (or future), we can't look ahead, so we look at "Now".
                    const now = new Date();
                    const snapshotDate = weekEnd > now ? now : weekEnd;

                    // 1. COMPLETED in this specific week
                    if (status === 'completed') {
                      if (p.status !== 'completed') return false;
                      // It is currently completed. Was it completed THIS week?
                      if (completedAt && completedAt >= weekStart && completedAt <= weekEnd) {
                        return true;
                      }
                      return false;
                    }

                    // 2. DELAYED in this specific week
                    if (status === 'delayed') {
                      // Logic: Active in week, AND due_date < snapshotDate AND NOT completed by snapshotDate
                      if (!p.due_date) return false;
                      const dueDate = new Date(p.due_date);
                      dueDate.setHours(23, 59, 59, 999);

                      // Check if it was overdue at the moment of the snapshot
                      const isOverdue = dueDate < snapshotDate;

                      // Check if it was NOT completed by that moment
                      // inclusive check: if completedAt < snapshotDate, then it was completed then.
                      const wasNotCompletedThen = !completedAt || completedAt > snapshotDate;

                      if (isOverdue && wasNotCompletedThen) return true;
                      return false;
                    }

                    // 3. IN PROGRESS in this specific week
                    if (status === 'in_progress') {
                      // Active in week.
                      // Checks:
                      const wasCompletedBeforeWeek = completedAt && completedAt < weekStart;
                      const wasCompletedDuringWeek = completedAt && completedAt >= weekStart && completedAt <= weekEnd;

                      if (wasCompletedBeforeWeek) return false; // Already done prior to this week
                      if (wasCompletedDuringWeek) return false; // Is in "Completed" bucket (handled above)

                      // Is it Delayed?
                      const dueDate = p.due_date ? new Date(p.due_date) : null;
                      if (dueDate) dueDate.setHours(23, 59, 59, 999);

                      const isOverdue = dueDate && dueDate < snapshotDate;
                      if (isOverdue) return false;

                      return true; // Otherwise, it was just open and running.
                    }

                    return false;
                  });

                  return (
                    <div key={status} className="flex flex-col gap-4">
                      <div className={`flex items-center gap-3 pb-4 border-b ${status === 'in_progress' ? 'border-blue-500/20' : status === 'completed' ? 'border-green-500/20' : 'border-red-500/20'}`}>
                        <div className={`size-3 rounded-full ${status === 'in_progress' ? 'bg-blue-500' : status === 'completed' ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_10px_currentColor]`}></div>
                        <h3 className="font-bold text-white uppercase tracking-wider text-sm">
                          {status === 'in_progress' ? 'Em Andamento' : status === 'completed' ? 'Concluídos' : 'Atrasados'}
                        </h3>
                        <span className="ml-auto text-xs font-bold text-white/30 bg-white/5 px-2 py-1 rounded-full">{weekProjects.length}</span>
                      </div>

                      <div className="flex flex-col gap-3">
                        {weekProjects.length === 0 ? (
                          <div className="p-6 text-center text-xs text-white/20 italic border border-dashed border-white/5 rounded-xl">
                            Nenhum projeto encontrado.
                          </div>
                        ) : weekProjects.map(p => (
                          <div key={p.id} className="glass-card p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{p.category}</span>
                              {p.due_date && <span className="text-[10px] text-white/30">{new Date(p.due_date).toLocaleDateString('pt-BR')}</span>}
                            </div>
                            <h4 className="font-bold text-white text-sm mb-1 group-hover:text-primary transition-colors">{p.title}</h4>
                            <div className="flex items-center gap-2 mt-3">
                              <div className="flex -space-x-1">
                                {p.members?.slice(0, 3).map((m: any, i: number) => (
                                  <div key={i} className="size-5 rounded-full bg-gray-700 border border-black flex items-center justify-center text-[8px] overflow-hidden">
                                    {m.profile?.avatar_url ? <img src={m.profile.avatar_url} className="w-full h-full object-cover" /> : m.profile?.name?.[0]}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 pb-8">
              {loading ? (
                <div className="col-span-full py-20 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                  </div>
                  <p className="mt-4 text-sm text-white/50 animate-pulse">Carregando projetos de excelência...</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="col-span-full py-20 text-center glass-panel rounded-2xl border border-white/5 border-dashed">
                  <span className="material-symbols-outlined text-4xl text-white/20 mb-4">folder_off</span>
                  <p className="text-white/40">Nenhum projeto encontrado.</p>
                </div>
              ) : (
                filteredProjects.map(project => (
                  <div key={project.id} onClick={() => onNavigate('project_details', project.id)} className="cursor-pointer transition-transform hover:scale-[1.01]">
                    <ProjectCard
                      id={project.id}
                      category={project.category}
                      title={project.title}
                      desc={project.description}
                      progress={calculateProgress(project.tasks)}
                      status={project.status}
                      dueDate={project.due_date}
                      members={project.members || []}
                      onDelete={() => handleDelete(project.id)}
                    // onEdit={() => ...} // TODO: Implement edit
                    />
                  </div>
                ))
              )}

              {/* Add Card (Only in Grid) */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="group flex min-h-[260px] flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-white/30 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-500"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 shadow-inner group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500 backdrop-blur-sm border border-white/5 group-hover:border-primary/30">
                  <span className="material-symbols-outlined text-3xl group-hover:text-primary transition-colors">add</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="font-bold uppercase tracking-widest text-xs group-hover:text-primary transition-colors">Iniciar Novo Projeto</span>
                  <span className="text-[10px] text-white/20">Estratégia & Execução</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="glass-panel rounded-xl mb-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-glass-border bg-white/5">
                    {ALL_COLUMNS.map(col => visibleColumns.includes(col.id) && (
                      <th key={col.id} className={`p-4 text-xs font-bold text-gray-400 uppercase tracking-wider ${col.id === 'actions' ? 'text-right' : ''}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {loading ? (
                    <tr><td colSpan={visibleColumns.length} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr><td colSpan={visibleColumns.length} className="p-8 text-center text-gray-500">Nenhum projeto encontrado.</td></tr>
                  ) : filteredProjects.map(project => (
                    <tr key={project.id} onClick={() => onNavigate('project_details', project.id)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                      {ALL_COLUMNS.map(col => {
                        if (!visibleColumns.includes(col.id)) return null;

                        // Render Project Cell
                        if (col.id === 'project') return (
                          <td key={col.id} className="p-4">
                            <div className="font-bold text-white mb-1">{project.title}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[300px]">{project.description}</div>
                          </td>
                        );

                        // Render Status Cell with Inline Edit
                        if (col.id === 'status') return (
                          <td key={col.id} className="p-4 relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingStatusId(editingStatusId === project.id ? null : project.id); }}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border hover:opacity-80 transition-opacity ${project.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                project.status === 'delayed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  project.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                    'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                }`}
                            >
                              {project.status === 'in_progress' ? 'Em Andamento' :
                                project.status === 'delayed' ? 'Atrasado' :
                                  project.status === 'completed' ? 'Concluído' :
                                    project.status === 'planning' ? 'Em Planejamento' :
                                      'Pendente'}
                            </button>

                            {/* Inline Status Dropdown */}
                            {editingStatusId === project.id && (
                              <div className="absolute top-full left-4 mt-1 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden flex flex-col p-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                                <div className="fixed inset-0 z-0" onClick={(e) => { e.stopPropagation(); setEditingStatusId(null); }}></div>
                                {['planning', 'not_started', 'in_progress', 'delayed', 'completed'].map((opt) => (
                                  <button
                                    key={opt}
                                    className="relative z-10 px-3 py-2 text-xs text-left text-gray-300 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between group"
                                    onClick={(e) => { e.stopPropagation(); handleStatusUpdate(project.id, opt); }}
                                  >
                                    <span>
                                      {opt === 'in_progress' ? 'Em Andamento' :
                                        opt === 'delayed' ? 'Atrasado' :
                                          opt === 'completed' ? 'Concluído' :
                                            opt === 'planning' ? 'Em Planejamento' :
                                              'Pendente'}
                                    </span>
                                    {project.status === opt && <span className="material-symbols-outlined text-[14px] text-primary">check</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                        );

                        // Render Next Steps Cell
                        if (col.id === 'next_steps') {
                          const nextTask = getNextStep(project.tasks);
                          return (
                            <td key={col.id} className="p-4">
                              {nextTask ? (
                                <div className="flex flex-col gap-0.5 max-w-[200px]">
                                  <div className="text-xs font-medium text-white truncate" title={nextTask.title}>{nextTask.title}</div>
                                  {nextTask.due_date && (
                                    <div className={`text-[10px] flex items-center gap-1 ${new Date(nextTask.due_date) < new Date() ? 'text-red-400' : 'text-gray-500'
                                      }`}>
                                      <span className="material-symbols-outlined text-[10px]">event</span>
                                      {new Date(nextTask.due_date).toLocaleDateString('pt-BR')}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-600 italic">Nada pendente</span>
                              )}
                            </td>
                          );
                        }

                        // Render Members Cell
                        if (col.id === 'members') return (
                          <td key={col.id} className="p-4">
                            <div className="flex -space-x-2">
                              {project.members && project.members.slice(0, 4).map((m: any, idx: number) => (
                                <div key={idx} className="size-8 rounded-full border border-black bg-gray-800 flex items-center justify-center text-[10px] overflow-hidden" title={m.profile?.name}>
                                  {m.profile?.avatar_url ? <img src={m.profile.avatar_url} className="w-full h-full object-cover" /> : m.profile?.name?.charAt(0).toUpperCase()}
                                </div>
                              ))}
                              {project.members && project.members.length > 4 && (
                                <div className="size-8 rounded-full border border-black bg-gray-800 flex items-center justify-center text-[10px] text-gray-400">
                                  +{project.members.length - 4}
                                </div>
                              )}
                            </div>
                          </td>
                        );

                        // Render Progress Cell
                        if (col.id === 'progress') {
                          const progress = calculateProgress(project.tasks);
                          return (
                            <td key={col.id} className="p-4 w-40">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                                <span className="text-xs font-medium text-primary">{progress}%</span>
                              </div>
                            </td>
                          );
                        }

                        // Render Due Date Cell
                        if (col.id === 'due_date') return (
                          <td key={col.id} className="p-4">
                            <div className={`text-xs font-medium flex items-center gap-1 ${project.due_date && new Date(project.due_date) < new Date() && project.status !== 'completed' ? 'text-red-400' : 'text-gray-400'}`}>
                              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                              {project.due_date ? new Date(project.due_date).toLocaleDateString('pt-BR') : '-'}
                            </div>
                          </td>
                        );

                        // Render Category Cell (Optional)
                        if (col.id === 'category') return (
                          <td key={col.id} className="p-4">
                            <span className="px-2 py-1 rounded border border-white/10 text-[10px] font-medium uppercase tracking-wider text-gray-400 bg-white/5">
                              {project.category}
                            </span>
                          </td>
                        );

                        // Render Budget Cell (Optional - Placeholder logic for now)
                        if (col.id === 'budget') return (
                          <td key={col.id} className="p-4 text-xs font-medium text-white/70">
                            {project.budget ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.budget) : '-'}
                          </td>
                        );

                        // Render Priority Cell (Optional - Placeholder logic for now)
                        if (col.id === 'priority') return (
                          <td key={col.id} className="p-4">
                            <div className="flex items-center gap-1">
                              {project.priority === 'high' && <span className="material-symbols-outlined text-[14px] text-red-500">error</span>}
                              <span className={`text-xs font-medium ${project.priority === 'high' ? 'text-red-400' : 'text-gray-400'}`}>
                                {project.priority === 'high' ? 'Alta' : project.priority === 'medium' ? 'Média' : 'Normal'}
                              </span>
                            </div>
                          </td>
                        );

                        // Render Actions Cell
                        if (col.id === 'actions') return (
                          <td key={col.id} className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProjectToEdit(project);
                                  setIsAddModalOpen(true);
                                }}
                                title="Editar Projeto"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                                title="Excluir Projeto"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        );

                        // Render Custom Columns
                        if ((col as any).isCustom) {
                          const customValue = project.custom_fields?.[col.id] || '';
                          const isEditing = editingCell?.projectId === project.id && editingCell?.columnId === col.id;

                          return (
                            <td
                              key={col.id}
                              className="p-4 cursor-pointer hover:bg-white/5 transition-colors group/cell relative"
                              onClick={() => {
                                if (!isEditing) {
                                  setEditingCell({ projectId: project.id, columnId: col.id });
                                  setEditValue(customValue);
                                }
                              }}
                            >
                              {isEditing ? (
                                <input
                                  autoFocus
                                  className="w-full bg-transparent border-b border-primary text-sm text-white focus:outline-none py-1"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCustomCellUpdate(project.id, col.id, editValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCustomCellUpdate(project.id, col.id, editValue);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <div className="min-h-[24px] flex items-center justify-between group/content gap-2">
                                  {customValue ? (
                                    <>
                                      <span className="text-sm text-white break-words">{customValue}</span>
                                      <div className="flex items-center gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-primary transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCell({ projectId: project.id, columnId: col.id });
                                            setEditValue(customValue);
                                          }}
                                          title="Editar"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">edit</span>
                                        </button>
                                        <button
                                          type="button"
                                          className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-red-400 transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Limpar este campo?')) {
                                              handleCustomCellUpdate(project.id, col.id, '');
                                            }
                                          }}
                                          title="Limpar"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className="text-[10px] text-primary/70 hover:text-primary font-medium flex items-center gap-1 opacity-60 group-hover/cell:opacity-100 transition-all border border-primary/20 hover:border-primary/50 rounded px-2 py-0.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCell({ projectId: project.id, columnId: col.id });
                                        setEditValue('');
                                      }}
                                    >
                                      <span className="material-symbols-outlined text-[10px]">add</span>
                                      Adicionar info
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        }

                        return <td key={col.id} className="p-4"></td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setProjectToEdit(null); }}
        onSuccess={() => { fetchProjects(); setIsAddModalOpen(false); setProjectToEdit(null); }}
        projectToEdit={projectToEdit}
      />
    </Layout >
  );
}