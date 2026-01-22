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
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'delayed' | 'completed'>(() => (localStorage.getItem('taxcrm_projects_status_filter') as any) || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('taxcrm_projects_view_mode') as any) || 'grid');

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('taxcrm_projects_visible_columns');
    return saved ? JSON.parse(saved) : ['project', 'status', 'next_steps', 'members', 'progress', 'due_date', 'actions'];
  });

  // Persistence Effects
  useEffect(() => { localStorage.setItem('taxcrm_projects_category_filter', categoryFilter); }, [categoryFilter]);
  useEffect(() => { localStorage.setItem('taxcrm_projects_status_filter', statusFilter); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('taxcrm_projects_view_mode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('taxcrm_projects_visible_columns', JSON.stringify(visibleColumns)); }, [visibleColumns]);

  // Column Customization
  const ALL_COLUMNS = [
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

  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);

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
  }, []);

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
    return matchesSearch && matchesCategory && matchesStatus;
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
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-105 hover:bg-primary-hover focus:outline-none"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>Novo Projeto</span>
        </button>
      </Header>
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-7xl p-4 md:p-8">

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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors"><span className="material-symbols-outlined text-[20px]">search</span></span>
                <input
                  className="h-12 w-full rounded-xl border border-white/5 bg-black/20 pl-12 pr-4 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all shadow-inner hover:bg-black/30"
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
                    <div className="fixed inset-0 z-10" onClick={() => setShowColumnPicker(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-20 p-2 flex flex-col gap-1 backdrop-blur-xl">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Exibir Colunas</div>
                      {ALL_COLUMNS.map(col => (
                        <label key={col.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleColumns.includes(col.id) ? 'bg-primary border-primary' : 'border-gray-600 bg-transparent group-hover:border-gray-500'}`}>
                            {visibleColumns.includes(col.id) && <span className="material-symbols-outlined text-[12px] text-black font-bold">check</span>}
                          </div>
                          <span className={`text-xs ${visibleColumns.includes(col.id) ? 'text-white font-medium' : 'text-gray-400'}`}>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="h-6 w-px bg-white/10 mx-2"></div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-black/20 border border-white/10 text-xs rounded-lg px-3 py-2 text-white focus:border-primary outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="in_progress">Em Andamento</option>
                <option value="delayed">Atrasados</option>
                <option value="completed">Concluídos</option>
              </select>
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Exibindo {filteredProjects.length} projeto(s)
            </div>
          </div>

          {/* Grid or List */}
          {viewMode === 'grid' ? (
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
                      progress={project.progress}
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
                          <td key={col.id} className={`p-4 relative ${editingStatusId === project.id ? 'z-50' : 'z-10'}`}>
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
                                    'Pendente'}
                            </button>

                            {/* Inline Status Dropdown */}
                            {editingStatusId === project.id && (
                              <div className="absolute top-full left-4 mt-1 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden flex flex-col p-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                                <div className="fixed inset-0 z-0" onClick={(e) => { e.stopPropagation(); setEditingStatusId(null); }}></div>
                                {['in_progress', 'delayed', 'completed', 'pending'].map((opt) => (
                                  <button
                                    key={opt}
                                    className="relative z-10 px-3 py-2 text-xs text-left text-gray-300 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between group"
                                    onClick={(e) => { e.stopPropagation(); handleStatusUpdate(project.id, opt); }}
                                  >
                                    <span>
                                      {opt === 'in_progress' ? 'Em Andamento' :
                                        opt === 'delayed' ? 'Atrasado' :
                                          opt === 'completed' ? 'Concluído' :
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
                        if (col.id === 'progress') return (
                          <td key={col.id} className="p-4 w-40">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                              </div>
                              <span className="text-xs font-medium text-primary">{project.progress || 0}%</span>
                            </div>
                          </td>
                        );

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

                        return <td key={col.id} className="p-4"></td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setProjectToEdit(null); }}
        onSuccess={() => { fetchProjects(); setIsAddModalOpen(false); setProjectToEdit(null); }}
        projectToEdit={projectToEdit}
      />
    </Layout>
  );
}