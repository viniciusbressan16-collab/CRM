import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AddProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projectToEdit?: any;
}

export default function AddProjectModal({ isOpen, onClose, onSuccess, projectToEdit }: AddProjectModalProps) {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Tecnologia',
        status: 'planning',
        start_date: '',
        due_date: '',
        selectedMembers: [] as string[]
    });

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            if (projectToEdit) {
                setFormData({
                    title: projectToEdit.title,
                    description: projectToEdit.description || '',
                    category: projectToEdit.category,
                    status: projectToEdit.status || 'planning',
                    start_date: projectToEdit.start_date || '',
                    due_date: projectToEdit.due_date || '',
                    selectedMembers: projectToEdit.members ? projectToEdit.members.map((m: any) => m.profile?.id || m.user_id) : []
                });
            } else {
                setFormData({
                    title: '',
                    description: '',
                    category: 'Tecnologia',
                    status: 'planning',
                    start_date: '',
                    due_date: '',
                    selectedMembers: []
                });
            }
        }
    }, [isOpen, projectToEdit]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('id, name, avatar_url');
        setUsers(data || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const projectPayload: any = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                status: formData.status,
                start_date: formData.start_date || null,
                due_date: formData.due_date || null,
            };

            if (!projectToEdit) {
                projectPayload.created_by = user.id;
                projectPayload.progress = 0;
            }

            let projectId = projectToEdit?.id;

            if (projectToEdit) {
                const { error: updateError } = await supabase
                    .from('internal_projects')
                    .update(projectPayload)
                    .eq('id', projectId);
                if (updateError) throw updateError;
            } else {
                const { data: project, error: insertError } = await supabase
                    .from('internal_projects')
                    .insert(projectPayload)
                    .select()
                    .single();
                if (insertError) throw insertError;
                projectId = project.id;
            }

            // Manage Members
            const newMemberIds = formData.selectedMembers;
            // Simple delete-insert strategy for now
            if (projectToEdit) {
                await supabase.from('project_members').delete().eq('project_id', projectId);
            }

            if (newMemberIds.length > 0) {
                const members = newMemberIds.map(uid => ({
                    project_id: projectId,
                    user_id: uid,
                    role: 'member'
                }));
                const { error: membersError } = await supabase.from('project_members').insert(members as any);
                if (membersError) throw membersError;
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving project:', error);
            alert(`Erro ao salvar projeto: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{projectToEdit ? 'Editar Projeto' : 'Novo Projeto'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Form Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título do Projeto *</label>
                        <input
                            type="text"
                            required
                            className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Migração de Servidor"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                        <textarea
                            rows={3}
                            className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white resize-none"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Detalhes do projeto..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                            <select
                                className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="Tecnologia">Tecnologia</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Comercial">Comercial</option>
                                <option value="RH">RH</option>
                                <option value="Operacional">Operacional</option>
                                <option value="Financeiro">Financeiro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                            <select
                                className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="planning">Planejamento</option>
                                <option value="not_started">Não Iniciado</option>
                                <option value="in_progress">Em Andamento</option>
                                <option value="on_hold">Em Pausa</option>
                                <option value="completed">Concluído</option>
                                <option value="delayed">Atrasado</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início</label>
                            <input
                                type="date"
                                className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Prevista</label>
                            <input
                                type="date"
                                className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-sm focus:border-primary focus:ring-primary dark:text-white"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Equipe Envolvida</label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                            {users.map(user => {
                                const isSelected = formData.selectedMembers.includes(user.id);
                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => {
                                            if (isSelected) {
                                                setFormData(p => ({ ...p, selectedMembers: p.selectedMembers.filter(id => id !== user.id) }));
                                            } else {
                                                setFormData(p => ({ ...p, selectedMembers: [...p.selectedMembers, user.id] }));
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {user.avatar_url ? (
                                            <div className="size-4 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${user.avatar_url}')` }}></div>
                                        ) : (
                                            <div className="size-4 rounded-full bg-gray-300 dark:bg-gray-500"></div>
                                        )}
                                        {user.name}
                                        {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                                    </button>
                                )
                            })}
                        </div>
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
                        {projectToEdit ? 'Salvar' : 'Criar Projeto'}
                    </button>
                </div>
            </div>
        </div>
    );
}
