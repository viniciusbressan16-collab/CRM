import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AddProjectTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projectId: string;
    taskToEdit?: any; // Optional task to edit
}

export default function AddProjectTaskModal({ isOpen, onClose, onSuccess, projectId, taskToEdit }: AddProjectTaskModalProps) {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        assignee_ids: [] as string[],
        project_id: '',
        deal_id: '',
        due_date: '',
        priority: 'medium',
        is_urgent: false
    });

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            fetchProjects();

            const initForm = async () => {
                if (taskToEdit) {
                    const isDeal = taskToEdit.source === 'deal';
                    setFormData({
                        title: taskToEdit.title,
                        assignee_ids: taskToEdit.assignee_ids || (taskToEdit.assignee_id ? [taskToEdit.assignee_id] : []),
                        project_id: isDeal ? '' : (taskToEdit.project_id || projectId),
                        deal_id: isDeal ? taskToEdit.deal_id || taskToEdit.id : '', // Fallback might be tricky if id is same, but deal_tasks usually have deal_id column
                        due_date: taskToEdit.due_date ? new Date(taskToEdit.due_date).toISOString().split('T')[0] : '',
                        priority: taskToEdit.priority || (taskToEdit.is_urgent ? 'high' : 'medium') || 'medium',
                        is_urgent: taskToEdit.is_urgent || false
                    });
                } else {
                    const { data: { user } } = await supabase.auth.getUser();
                    setFormData({
                        title: '',
                        assignee_ids: user ? [user.id] : [],
                        project_id: projectId || '',
                        deal_id: '',
                        due_date: '',
                        priority: 'medium',
                        is_urgent: false
                    });
                }
            };
            initForm();
        }
    }, [isOpen, taskToEdit, projectId]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('id, name, avatar_url');
        setUsers(data || []);
    };

    const fetchProjects = async () => {
        const { data } = await supabase.from('internal_projects').select('id, title').order('title');
        setProjects(data || []);
    };

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
        setLoading(true);
        try {
            const isDeal = taskToEdit?.source === 'deal';
            const table = isDeal ? 'deal_tasks' : 'project_tasks';

            const { error } = await supabase.from(table).delete().eq('id', taskToEdit.id);
            if (error) throw error;

            // Log activity only for projects for now, or unified if needed
            if (!isDeal && projectId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('project_history').insert({
                        project_id: projectId,
                        user_id: user.id,
                        action_type: 'DELETE',
                        description: `excluiu a tarefa "${taskToEdit.title}".`
                    });
                }
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error deleting task:', error);
            alert(`Erro ao excluir tarefa: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Determine context
        const isDeal = taskToEdit?.source === 'deal';
        const targetProjectId = formData.project_id || projectId || null;

        try {
            if (isDeal) {
                // Handle Deal Task Update
                // Note: creating new deal tasks from here is not yet fully supported (needs deal selection), 
                // but editing works because we have the ID.
                if (!taskToEdit) throw new Error("Creating new Deal Tasks from this modal is not supported yet.");

                const payload: any = {
                    title: formData.title,
                    assignee_ids: formData.assignee_ids,
                    assignee_id: formData.assignee_ids[0] || null,
                    due_date: formData.due_date || null,
                    is_urgent: formData.priority === 'high'
                };

                const { error } = await supabase
                    .from('deal_tasks')
                    .update(payload)
                    .eq('id', taskToEdit.id);

                if (error) throw error;

            } else {
                // Handle Project Task (Create or Update)
                const payload: any = {
                    project_id: targetProjectId,
                    title: formData.title,
                    assignee_ids: formData.assignee_ids,
                    assignee_id: formData.assignee_ids[0] || null,
                    due_date: formData.due_date || null,
                    priority: formData.priority,
                    is_urgent: formData.is_urgent
                };

                if (taskToEdit) {
                    const { error } = await supabase
                        .from('project_tasks')
                        .update(payload)
                        .eq('id', taskToEdit.id);
                    if (error) throw error;

                    // Log history
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && targetProjectId) {
                        await supabase.from('project_history').insert({
                            project_id: targetProjectId,
                            user_id: user.id,
                            action_type: 'UPDATE',
                            description: `atualizou os detalhes da tarefa "${formData.title}".`
                        });
                    }
                } else {
                    payload.status = 'todo';
                    const { error } = await supabase
                        .from('project_tasks')
                        .insert(payload);
                    if (error) throw error;

                    // Log history
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && targetProjectId) {
                        await supabase.from('project_history').insert({
                            project_id: targetProjectId,
                            user_id: user.id,
                            action_type: 'CREATE',
                            description: `criou a tarefa "${formData.title}".`
                        });
                    }
                }
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving task:', error);
            alert(`Erro ao salvar tarefa: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isDeal = taskToEdit?.source === 'deal';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh] animate-scaleUp">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
                        {isDeal && <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">Vendas</span>}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        {!projectId && !isDeal && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Projeto *</label>
                                <select
                                    required={false}
                                    className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white outline-none"
                                    value={formData.project_id}
                                    onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                                >
                                    <option value="">Sem projeto relacionado</option>
                                    {projects.map(proj => (
                                        <option key={proj.id} value={proj.id}>{proj.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título da Tarefa *</label>
                        <input
                            type="text"
                            required
                            className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white outline-none"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Definir roadmap"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest mb-2 block">Prioridade</label>
                            <div className="flex gap-2">
                                {(['low', 'medium', 'high'] as const).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            priority: p,
                                            is_urgent: p === 'high' ? true : formData.is_urgent
                                        })}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all uppercase tracking-wider ${formData.priority === p
                                            ? p === 'high' ? 'bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
                                                p === 'medium' ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]' :
                                                    'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                            : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-400 dark:text-white/30 hover:border-primary/30'}`}
                                    >
                                        {p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : 'Alta'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest mb-2 block">Urgência</label>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, is_urgent: !formData.is_urgent })}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${formData.is_urgent
                                    ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                    : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-400 dark:text-white/30 hover:border-white/20'
                                    }`}
                            >
                                <span className="text-[11px] font-bold uppercase tracking-wider">Marcar como Urgente</span>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${formData.is_urgent ? 'bg-red-500' : 'bg-gray-300 dark:bg-white/20'}`}>
                                    <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${formData.is_urgent ? 'left-5' : 'left-1'}`}></div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Entrega</label>
                        <input
                            type="date"
                            className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white outline-none"
                            value={formData.due_date}
                            onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Responsáveis</label>
                        <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                            {users.map(user => {
                                const isSelected = formData.assignee_ids.includes(user.id);
                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => {
                                            const newIds = isSelected
                                                ? formData.assignee_ids.filter(id => id !== user.id)
                                                : [...formData.assignee_ids, user.id];
                                            setFormData({ ...formData, assignee_ids: newIds });
                                        }}
                                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${isSelected
                                            ? 'bg-primary/10 border-primary shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                                            : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 hover:border-primary/50'
                                            }`}
                                    >
                                        <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-primary text-black' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'} overflow-hidden`}>
                                            {user.avatar_url && (user.avatar_url.startsWith('http') || user.avatar_url.startsWith('/')) ? (
                                                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                user.name?.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <span className={`text-xs font-medium truncate ${isSelected ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {user.name || 'Sem nome'}
                                        </span>
                                        {isSelected && <span className="material-symbols-outlined text-primary text-sm ml-auto">check_circle</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    {taskToEdit && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="mr-auto px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            Excluir
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        disabled={loading}
                    >
                        {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        {taskToEdit ? 'Salvar Alterações' : 'Adicionar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

