import React, { useState, useEffect } from 'react';
import { View } from '../App';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import AddProjectModal from '../components/AddProjectModal';
import AddProjectTaskModal from '../components/AddProjectTaskModal';
import AddProjectDocumentModal from '../components/AddProjectDocumentModal';
import AddProjectMemberModal from '../components/AddProjectMemberModal';
import Header from '../components/Header';

interface ProjectDetailsPageProps {
    onNavigate: (view: View, id?: string) => void;
    activePage: View;
    projectId: string;
}

export default function ProjectDetailsPage({ onNavigate, activePage, projectId }: ProjectDetailsPageProps) {
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'documents'>('overview');
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'done'>('pending');

    const logActivity = async (action: string, description: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('project_history').insert({
            project_id: projectId,
            user_id: user.id,
            action_type: action,
            description: description
        });
    };

    const toggleTaskStatus = async (task: any) => {
        try {
            const newStatus = task.status === 'done' ? 'todo' : 'done';

            // Optimistic update
            setProject((prev: any) => ({
                ...prev,
                tasks: prev.tasks.map((t: any) =>
                    t.id === task.id ? { ...t, status: newStatus } : t
                )
            }));

            const { error } = await supabase
                .from('project_tasks')
                .update({ status: newStatus })
                .eq('id', task.id);

            if (error) throw error;
            logActivity('UPDATE', `atualizou o status da tarefa "${task.title}" para ${newStatus === 'done' ? 'Concluída' : 'Pendente'}.`);
        } catch (error) {
            console.error('Error updating task status:', error);
            // Revert on error
            fetchProjectDetails();
            alert('Erro ao atualizar status da tarefa');
        }
    };

    const handleDeleteTask = async (task: any) => {
        if (!confirm(`Tem certeza que deseja excluir a tarefa "${task.title}"?`)) return;

        try {
            const { error } = await supabase
                .from('project_tasks')
                .delete()
                .eq('id', task.id);

            if (error) throw error;
            logActivity('DELETE', `excluiu a tarefa "${task.title}".`);
            fetchProjectDetails();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Erro ao excluir tarefa');
        }
    };

    const handleDeleteDocument = async (doc: any) => {
        if (!confirm(`Tem certeza que deseja excluir o documento "${doc.name}"?`)) return;

        try {
            const urlObj = new URL(doc.url);
            const pathParts = urlObj.pathname.split('/project-files/');
            if (pathParts.length < 2) {
                throw new Error('Could not parse file path from URL');
            }
            const storagePath = decodeURIComponent(pathParts[1]);

            // 1. Delete from Storage
            const { error: storageError } = await supabase.storage
                .from('project-files')
                .remove([storagePath]);

            if (storageError) {
                console.warn('Error deleting file from storage (continuing to DB delete):', storageError);
            }

            // 2. Delete from DB
            const { error: dbError } = await supabase
                .from('project_documents')
                .delete()
                .eq('id', doc.id);

            if (dbError) throw dbError;

            logActivity('DELETE', `excluiu o documento "${doc.name}".`);
            fetchProjectDetails();
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Erro ao excluir documento');
        }
    };

    const handleEditTask = (task: any) => {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
    };

    useEffect(() => {
        fetchProjectDetails();
    }, [projectId]);

    const fetchProjectDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('internal_projects')
                .select(`
          *,
          members:project_members(
             role,
             profile:profiles(id, name, avatar_url)
          ),
          tasks:project_tasks(*),
          documents:project_documents(*),
          history:project_history(
            *,
            profile:profiles(name)
          )
        `)
                .eq('id', projectId)
                .order('created_at', { foreignTable: 'project_history', ascending: false })
                .single();

            if (error) throw error;
            setProject(data);
        } catch (error) {
            console.error('Error fetching project:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (member: any) => {
        if (!confirm(`Tem certeza que deseja remover "${member.profile.name}" da equipe?`)) return;

        try {
            const { error } = await supabase
                .from('project_members')
                .delete()
                .match({ project_id: projectId, user_id: member.profile.id });

            if (error) throw error;

            logActivity('REMOVE_MEMBER', `removeu "${member.profile.name}" da equipe.`);
            fetchProjectDetails();
        } catch (error) {
            console.error('Error removing member:', error);
            alert('Erro ao remover membro');
        }
    };

    if (loading) return <Layout activePage={activePage} onNavigate={onNavigate}><div className="flex h-full items-center justify-center text-white/50">Carregando detalhes...</div></Layout>;
    if (!project) return <Layout activePage={activePage} onNavigate={onNavigate}><div className="flex h-full items-center justify-center text-white/50">Projeto não encontrado.</div></Layout>;

    return (
        <Layout activePage={activePage} onNavigate={onNavigate}>
            <div className="flex flex-col h-full">

                <Header
                    title={project.title}
                    description={`Departamento: ${project.category} • Iniciado em: ${new Date(project.created_at).toLocaleDateString('pt-BR')}`}
                    onNavigate={onNavigate}
                    startContent={
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-lg text-white">
                                <span className="material-symbols-outlined text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">rocket_launch</span>
                            </div>
                        </div>
                    }
                >
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-white/70 text-xs font-bold uppercase tracking-wider flex items-center gap-2 backdrop-blur-md">
                            <span className="material-symbols-outlined text-[14px] text-emerald-400">schedule</span>
                            Em Andamento
                        </div>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="glass-button px-4 py-2 rounded-lg text-sm flex items-center gap-2 text-white/80 hover:text-white"
                        >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            Editar Projeto
                        </button>
                    </div>
                </Header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto w-full">
                    <div className="w-full max-w-[1600px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Main Content (Left, 2 cols) */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Tasks Section */}
                            <div className="glass-card-premium p-6">
                                {/* Specular Highlight */}
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50"></div>

                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                                            <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white tracking-tight">Lista de Tarefas</h3>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <select
                                            value={taskFilter}
                                            onChange={(e) => setTaskFilter(e.target.value as any)}
                                            className="bg-white/5 border border-white/10 text-xs font-bold text-white/70 rounded-lg px-3 py-1.5 focus:border-primary/50 outline-none transition-all cursor-pointer uppercase tracking-wider"
                                        >
                                            <option value="all" className="bg-gray-900">Todas</option>
                                            <option value="pending" className="bg-gray-900">Pendentes</option>
                                            <option value="done" className="bg-gray-900">Concluídas</option>
                                        </select>
                                        <button
                                            onClick={() => setIsTaskModalOpen(true)}
                                            className="text-sm font-bold text-primary hover:text-primary-light flex items-center gap-1.5 transition-colors uppercase tracking-wider"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">add</span>
                                            Nova Tarefa
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* Empty State */}
                                    {(!project.tasks || project.tasks.length === 0) && (
                                        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5 mx-4">
                                            <span className="material-symbols-outlined text-4xl text-white/20 mb-2">assignment_add</span>
                                            <p className="text-white/40 font-medium">Nenhuma tarefa criada.</p>
                                        </div>
                                    )}

                                    {/* Tasks List */}
                                    {project.tasks?.filter((t: any) => {
                                        if (taskFilter === 'all') return true;
                                        if (taskFilter === 'pending') return t.status !== 'done';
                                        if (taskFilter === 'done') return t.status === 'done';
                                        return true;
                                    }).map((task: any) => (
                                        <div key={task.id} className="group relative flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden" onClick={() => toggleTaskStatus(task)}>
                                            {/* Hover Glow */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                                            <div className={`relative z-10 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${task.status === 'done' ? 'bg-primary border-primary text-black shadow-[0_0_10px_rgba(212,175,55,0.4)]' : 'border-white/20 group-hover:border-primary/50 bg-black/20'}`}>
                                                {task.status === 'done' && <span className="material-symbols-outlined text-[16px] font-bold">check</span>}
                                            </div>
                                            <div className="relative z-10 flex-1">
                                                <h4 className={`font-medium transition-colors ${task.status === 'done' ? 'line-through text-white/30' : 'text-white group-hover:text-primary/90'}`}>{task.title}</h4>
                                                <div className="flex items-center gap-4 text-[11px] font-medium text-white/40 mt-1.5 uppercase tracking-wide">
                                                    {task.due_date && <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">calendar_today</span> {new Date(task.due_date).toLocaleDateString('pt-BR')}</span>}
                                                    {task.assignee_id && (() => {
                                                        const assignee = project.members?.find((m: any) => m.profile.id === task.assignee_id)?.profile;
                                                        return (
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="material-symbols-outlined text-[14px]">person</span>
                                                                {assignee ? assignee.name : 'N/A'}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {task.is_urgent && (
                                                    <span className="relative z-10 px-2 py-0.5 text-[10px] font-black rounded border border-red-500/50 bg-red-500/20 text-red-400 uppercase tracking-tighter animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                                        URGENTE
                                                    </span>
                                                )}
                                                <span className={`relative z-10 px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${task.priority === 'high' || task.priority === 'alta' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                                    task.priority === 'medium' || task.priority === 'média' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                        'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                    }`}>
                                                    {task.priority === 'low' ? 'Baixa' : task.priority === 'medium' ? 'Média' : task.priority === 'high' ? 'Alta' : task.priority || 'Normal'}
                                                </span>
                                            </div>

                                            <div className="relative z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                                    className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }}
                                                    className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Documents Section */}
                            <div className="glass-card-premium p-6">
                                {/* Specular Highlight */}
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50"></div>

                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                            <span className="material-symbols-outlined text-blue-400 text-xl">folder_open</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white tracking-tight">Arquivos</h3>
                                    </div>
                                    <button
                                        onClick={() => setIsDocModalOpen(true)}
                                        className="glass-button px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">upload</span>
                                        Anexar
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {project.documents?.map((doc: any) => (
                                        <div key={doc.id} className="group relative flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                                            <div className="h-10 w-10 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined">description</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm truncate text-white group-hover:text-primary transition-colors block mb-1">{doc.name}</a>
                                                <p className="text-[10px] font-medium text-white/40 uppercase tracking-wide">{doc.size} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-white/40 hover:text-white rounded-lg transition-colors" title="Download">
                                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteDocument(doc)}
                                                    className="p-1.5 text-white/40 hover:text-red-400 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Activity Feed */}
                            <div className="glass-card-premium p-6">
                                {/* Specular Highlight */}
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50"></div>

                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                        <span className="material-symbols-outlined text-purple-400 text-xl">history</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">Atividades Recentes</h3>
                                </div>
                                <div className="relative pl-4 border-l border-white/10 space-y-8 ml-2">
                                    {(!project.history || project.history.length === 0) && (
                                        <p className="text-sm text-white/30 italic">Nenhuma atividade registrada.</p>
                                    )}
                                    {project.history?.map((activity: any) => (
                                        <div key={activity.id} className="relative">
                                            <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-black border border-primary ring-4 ring-black"></div>
                                            <p className="text-sm text-white/70 leading-relaxed">
                                                <span className="font-bold text-primary">{activity.profile?.name || 'Usuário'}</span> {activity.description}
                                            </p>
                                            <span className="text-[10px] font-bold text-white/30 mt-1 block uppercase tracking-wider">{new Date(activity.created_at).toLocaleString('pt-BR')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar (Right, 1 col) */}
                        <div className="space-y-6">
                            {/* Progress Card */}
                            <div className="glass-card-premium p-8 flex flex-col items-center relative overflow-hidden">
                                {/* Ambient Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full pointer-events-none"></div>

                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-8 w-full text-center border-b border-white/5 pb-4">Progresso Geral</h3>
                                <div className="flex items-center justify-center mb-8 relative">
                                    {/* Dynamic Circle Chart */}
                                    {(() => {
                                        const totalTasks = project.tasks?.length || 0;
                                        const completedTasks = project.tasks?.filter((t: any) => t.status === 'done').length || 0;
                                        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                                        const circumference = 2 * Math.PI * 50; // r=50
                                        const offset = circumference - (progress / 100) * circumference;

                                        return (
                                            <div className="relative h-40 w-40 flex items-center justify-center">
                                                {/* Glow behind chart */}
                                                <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full"></div>
                                                <svg className="transform -rotate-90 w-full h-full relative z-10">
                                                    {/* Track */}
                                                    <circle
                                                        className="text-white/5"
                                                        strokeWidth="8"
                                                        stroke="currentColor"
                                                        fill="transparent"
                                                        r="50"
                                                        cx="80"
                                                        cy="80"
                                                    />
                                                    {/* Indicator */}
                                                    <circle
                                                        className="text-primary transition-all duration-1000 ease-out"
                                                        strokeWidth="8"
                                                        strokeDasharray={circumference}
                                                        strokeDashoffset={offset}
                                                        strokeLinecap="round"
                                                        stroke="url(#goldGradient)"
                                                        fill="transparent"
                                                        r="50"
                                                        cx="80"
                                                        cy="80"
                                                    />
                                                    {/* Gradient Definition */}
                                                    <defs>
                                                        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                            <stop offset="0%" stopColor="#d4af37" />
                                                            <stop offset="100%" stopColor="#f59e0b" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                                <div className="absolute text-center">
                                                    <span className="text-4xl font-bold text-white tracking-tighter">{progress}%</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="w-full flex justify-between text-sm py-4 border-t border-white/5">
                                    <span className="text-white/40 font-medium">Concluídas</span>
                                    <span className="font-bold text-primary">
                                        {project.tasks?.filter((t: any) => t.status === 'done').length || 0} <span className="text-white/40">/ {project.tasks?.length || 0}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Team */}
                            <div className="glass-card-premium p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">Equipe</h3>
                                    <button
                                        onClick={() => setIsMemberModalOpen(true)}
                                        className="text-primary hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">person_add</span>
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {project.members?.map((m: any) => (
                                        <div key={m.profile.id} className="flex items-center gap-3 group">
                                            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 bg-cover bg-center shadow-inner" style={{ backgroundImage: `url('${m.profile.avatar_url || ''}')` }}></div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white">{m.profile.name}</p>
                                                <p className="text-[10px] text-white/40 uppercase tracking-wider">{m.role}</p>
                                            </div>
                                            <div className={`h-1.5 w-1.5 rounded-full ${m.role === 'manager' ? 'bg-primary shadow-[0_0_8px_rgba(212,175,55,0.6)]' : 'bg-white/20'}`}></div>

                                            <button
                                                onClick={() => handleRemoveMember(m)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-red-400 transition-all rounded"
                                                title="Remover membro"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="glass-card-premium p-6">
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-6">Cronograma</h3>
                                <div className="space-y-5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60"><span className="material-symbols-outlined">event</span></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Início</p>
                                            <p className="text-sm font-bold text-white">
                                                {project.start_date ? new Date(project.start_date).toLocaleDateString('pt-BR') : 'Não definido'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500"><span className="material-symbols-outlined">event_available</span></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Previsão</p>
                                            <p className="text-sm font-bold text-primary">
                                                {project.due_date ? new Date(project.due_date).toLocaleDateString('pt-BR') : 'Não definido'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <AddProjectModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={fetchProjectDetails}
                    projectToEdit={project}
                />

                <AddProjectTaskModal
                    isOpen={isTaskModalOpen}
                    onClose={() => {
                        setIsTaskModalOpen(false);
                        setSelectedTask(null);
                    }}
                    onSuccess={() => {
                        fetchProjectDetails();
                        setIsTaskModalOpen(false);
                        setSelectedTask(null);
                    }}
                    projectId={projectId}
                    taskToEdit={selectedTask}
                />

                <AddProjectDocumentModal
                    isOpen={isDocModalOpen}
                    onClose={() => setIsDocModalOpen(false)}
                    onSuccess={fetchProjectDetails}
                    projectId={projectId}
                />

                <AddProjectMemberModal
                    isOpen={isMemberModalOpen}
                    onClose={() => setIsMemberModalOpen(false)}
                    onSuccess={fetchProjectDetails}
                    projectId={projectId}
                    currentMembers={project.members}
                />
            </div>
        </Layout>
    );
}
