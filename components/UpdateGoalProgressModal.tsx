import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UpdateGoalProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    goal: any | null;
}

export default function UpdateGoalProgressModal({ isOpen, onClose, onSuccess, goal }: UpdateGoalProgressModalProps) {
    const [loading, setLoading] = useState(false);
    const [currentValue, setCurrentValue] = useState('');

    useEffect(() => {
        if (goal && isOpen) {
            setCurrentValue(goal.current_value?.toString() || '0');
        }
    }, [goal, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goal) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('goals')
                // @ts-ignore
                .update({ current_value: parseInt(currentValue) || 0 })
                .eq('id', goal.id);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating goal:', error);
            alert('Erro ao atualizar meta.');
        } finally {
            setLoading(false);
        }
    };

    // Helper for quick increments
    const increment = () => {
        const val = parseInt(currentValue) || 0;
        setCurrentValue((val + 1).toString());
    };

    const decrement = () => {
        const val = parseInt(currentValue) || 0;
        if (val > 0) setCurrentValue((val - 1).toString());
    };

    if (!isOpen || !goal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col">

                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Atualizar Progresso</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    <div className="text-center space-y-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Meta: <span className="font-medium text-gray-900 dark:text-white">{goal.type}</span></p>
                        <div className="text-xs text-gray-400">Alvo: {goal.target_value}</div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <button
                            type="button"
                            onClick={decrement}
                            className="size-12 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            <span className="material-symbols-outlined">remove</span>
                        </button>

                        <div className="w-24">
                            <input
                                type="number"
                                value={currentValue}
                                onChange={(e) => setCurrentValue(e.target.value)}
                                className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:border-primary outline-none py-2 text-gray-900 dark:text-white"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={increment}
                            className="size-12 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            <span className="material-symbols-outlined">add</span>
                        </button>
                    </div>

                </form>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-xl">save</span>
                                Salvar
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
