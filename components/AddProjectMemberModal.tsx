import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AddProjectMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projectId: string;
    currentMembers?: any[];
}

export default function AddProjectMemberModal({ isOpen, onClose, onSuccess, projectId, currentMembers = [] }: AddProjectMemberModalProps) {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            setSelectedUsers([]);
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('id, name, avatar_url, role');
        setUsers(data || []);
    };

    const toggleUser = (userId: string) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const handleSubmit = async () => {
        if (selectedUsers.length === 0) return;
        setLoading(true);

        try {
            const members = selectedUsers.map(uid => ({
                project_id: projectId,
                user_id: uid,
                role: 'member'
            }));

            const { error } = await supabase.from('project_members').insert(members as any); // Type casting for simplicity as Supabase types might be outdated
            if (error) throw error;

            // Log history
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const addedNames = users.filter(u => selectedUsers.includes(u.id)).map(u => u.name).join(', ');
                await supabase.from('project_history').insert({
                    project_id: projectId,
                    user_id: user.id,
                    action_type: 'ADD_MEMBER',
                    description: `adicionou os membros: ${addedNames}.`
                });
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error adding members:', error);
            alert(`Erro ao adicionar membros: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Filter out users already in the project
    const currentMemberIds = currentMembers.map(m => m.user_id || m.profile?.id);
    const availableUsers = users.filter(u => !currentMemberIds.includes(u.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Adicionar Membros</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {availableUsers.length === 0 ? (
                        <p className="text-center text-gray-500">Todos os usuários já estão no projeto.</p>
                    ) : (
                        <div className="space-y-2">
                            {availableUsers.map(user => {
                                const isSelected = selectedUsers.includes(user.id);
                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => toggleUser(user.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected
                                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                            : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300 dark:border-gray-500'
                                            }`}>
                                            {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 bg-cover bg-center" style={{ backgroundImage: `url('${user.avatar_url || ''}')` }}></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
                                            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

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
                        disabled={loading || selectedUsers.length === 0}
                    >
                        {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        Adicionar ({selectedUsers.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
