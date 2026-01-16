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
        assignee_id: '',
        project_id: '',
        due_date: '',
        priority: 'medium'
    });

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            fetchProjects();

            const initForm = async () => {
                if (taskToEdit) {
                    setFormData({
                        title: taskToEdit.title,
                        assignee_id: taskToEdit.assignee_id || '',
                        project_id: taskToEdit.project_id || projectId,
                        due_date: taskToEdit.due_date ? new Date(taskToEdit.due_date).toISOString().split('T')[0] : '',
                        priority: taskToEdit.priority || 'medium'
                    });
                } else {
                    const { data: { user } } = await supabase.auth.getUser();
                    setFormData({
                        title: '',
                        assignee_id: user?.id || '',
                        project_id: projectId || '',
                        due_date: '',
                        priority: 'medium'
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

    // ... handleSubmit ...
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const targetProjectId = formData.project_id || projectId || null; // Allow null

        try {
            const payload: any = {
                project_id: targetProjectId,
                title: formData.title,
                assignee_id: formData.assignee_id || null, // Convert empty string to null
                due_date: formData.due_date || null,
                priority: formData.priority,
            };
            // ... rest of logic ...


            if (taskToEdit) {
                // UPDATE existing task
                const { error } = await supabase
                    .from('project_tasks')
                    .update(payload)
                    .eq('id', taskToEdit.id);
                if (error) throw error;

                // Log history
                const { data: { user } } = await supabase.auth.getUser();
                if (user && projectId) {
                    await supabase.from('project_history').insert({
                        project_id: projectId,
                        user_id: user.id,
                        action_type: 'UPDATE',
                        description: `atualizou os detalhes da tarefa "${formData.title}".`
                    });
                }
            } else {
                // INSERT new task
                payload.status = 'todo'; // Default status for new tasks
                const { error } = await supabase
                    .from('project_tasks')
                    .insert(payload);
                if (error) throw error;

                // Log history for new task
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        {!projectId && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Projeto *</label>
                                <select
                                    required={false}
                                    className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white"
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
                            className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Definir roadmap"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridade</label>
                            <select
                                className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Entrega</label>
                            <input
                                type="date"
                                className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsável</label>
                        <select
                            className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white"
                            value={formData.assignee_id}
                            onChange={e => setFormData({ ...formData, assignee_id: e.target.value })}
                        >
                            <option value="">Sem responsável</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
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

