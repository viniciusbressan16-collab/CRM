import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Database } from '../types/supabase';

interface AddAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    appointmentToEdit?: any;
    initialData?: {
        title?: string;
        description?: string;
    };
}

export default function AddAppointmentModal({ isOpen, onClose, onSuccess, appointmentToEdit, initialData }: AddAppointmentModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: '',
        start_time: '09:00',
        end_date: '',
        end_time: '10:00',
        location: '',
    });

    useEffect(() => {
        if (isOpen) {
            if (appointmentToEdit) {
                const start = new Date(appointmentToEdit.start_time);
                const end = new Date(appointmentToEdit.end_time);
                setFormData({
                    title: appointmentToEdit.title,
                    description: appointmentToEdit.description || '',
                    start_date: start.toISOString().split('T')[0],
                    start_time: start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    end_date: end.toISOString().split('T')[0],
                    end_time: end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    location: appointmentToEdit.location || '',
                });
            } else {
                setFormData({
                    title: initialData?.title || '',
                    description: initialData?.description || '',
                    start_date: new Date().toISOString().split('T')[0],
                    start_time: '09:00',
                    end_date: new Date().toISOString().split('T')[0],
                    end_time: '10:00',
                    location: '',
                });
            }
        }
    }, [isOpen, appointmentToEdit, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
            const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);

            const payload = {
                user_id: user.id,
                title: formData.title,
                description: formData.description,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                location: formData.location
            };

            if (appointmentToEdit) {
                const { error } = await supabase
                    .from('appointments')
                    .update(payload)
                    .eq('id', appointmentToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('appointments')
                    .insert(payload);
                if (error) throw error;
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving appointment:', error);
            alert('Erro ao salvar compromisso');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!appointmentToEdit || !window.confirm('Tem certeza que deseja excluir este compromisso?')) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('appointments').delete().eq('id', appointmentToEdit.id);
            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error deleting appointment:', error);
            alert('Erro ao excluir compromisso');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-600">event</span>
                        {appointmentToEdit ? 'Editar Compromisso' : 'Novo Compromisso'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                            placeholder="Ex: Reunião de Alinhamento"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Início</label>
                            <input
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Início</label>
                            <input
                                type="time"
                                required
                                value={formData.start_time}
                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Término</label>
                            <input
                                type="date"
                                required
                                value={formData.end_date}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Término</label>
                            <input
                                type="time"
                                required
                                value={formData.end_time}
                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Local (Opcional)</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white outline-none"
                            placeholder="Ex: Sala de Reunião 1 or Google Meet"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white outline-none resize-none h-24"
                            placeholder="Detalhes do compromisso..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        {appointmentToEdit && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 hover:border-red-300 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : (appointmentToEdit ? 'Salvar' : 'Agendar')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
