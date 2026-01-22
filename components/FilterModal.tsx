import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface FilterState {
    tags: string[];
    assigneeIds: string[];
    status: string[];
    minValue: string;
    maxValue: string;
    startDate: string;
    endDate: string;
}

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: FilterState;
    onApplyFilters: (filters: FilterState) => void;
    onClearFilters: () => void;
}

export default function FilterModal({ isOpen, onClose, currentFilters, onApplyFilters, onClearFilters }: FilterModalProps) {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [partnerships, setPartnerships] = useState<string[]>([]);
    const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);

    useEffect(() => {
        if (isOpen) {
            // Ensure assigneeIds is always an array
            const safeAssignees = Array.isArray(currentFilters.assigneeIds) ? currentFilters.assigneeIds : [];
            setLocalFilters({ ...currentFilters, assigneeIds: safeAssignees });
            fetchProfiles();
            fetchPartnerships();
        }
    }, [isOpen, currentFilters]);

    const fetchProfiles = async () => {
        const { data } = await supabase.from('profiles').select('*');
        if (data) setProfiles(data);
    };

    const fetchPartnerships = async () => {
        const { data } = await supabase.from('partnerships').select('name').order('name');
        if (data) setPartnerships(data.map(p => p.name));
    };

    const handleTagToggle = (tag: string) => {
        setLocalFilters(prev => {
            if (prev.tags.includes(tag)) {
                return { ...prev, tags: prev.tags.filter(t => t !== tag) };
            } else {
                return { ...prev, tags: [...prev.tags, tag] };
            }
        });
    };

    const handleStatusToggle = (status: string) => {
        setLocalFilters(prev => {
            if (prev.status.includes(status)) {
                return { ...prev, status: prev.status.filter(s => s !== status) };
            } else {
                return { ...prev, status: [...prev.status, status] };
            }
        });
    };

    const handleAssigneeToggle = (id: string) => {
        setLocalFilters(prev => {
            if (prev.assigneeIds.includes(id)) {
                return { ...prev, assigneeIds: prev.assigneeIds.filter(i => i !== id) };
            } else {
                return { ...prev, assigneeIds: [...prev.assigneeIds, id] };
            }
        });
    };

    const handleClear = () => {
        onClearFilters();
        onClose();
    };

    const handleApply = () => {
        onApplyFilters(localFilters);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">filter_list</span>
                        Filtros Avançados
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Tags / Parcerias */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parcerias (Tags)</h3>
                        <div className="flex flex-wrap gap-2">
                            {partnerships.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => handleTagToggle(tag)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${localFilters.tags.includes(tag)
                                        ? 'bg-primary text-white border-primary shadow-sm'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50'
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Responsável */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsáveis</h3>
                            {localFilters.assigneeIds && localFilters.assigneeIds.length > 0 && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                    {localFilters.assigneeIds.length} selecionado{localFilters.assigneeIds.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {profiles.map(profile => (
                                <button
                                    key={profile.id}
                                    onClick={() => handleAssigneeToggle(profile.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${localFilters.assigneeIds.includes(profile.id)
                                        ? 'bg-primary text-white border-primary shadow-sm'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50'
                                        }`}
                                >
                                    <div className="size-5 rounded-full bg-cover bg-center border border-white/20" style={{ backgroundImage: `url('${profile.avatar_url || 'https://i.pravatar.cc/150'}')` }}></div>
                                    {profile.name}
                                </button>
                            ))}
                            {profiles.length === 0 && <p className="text-xs text-slate-500">Carregando consultores...</p>}
                        </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</h3>
                        <div className="flex gap-3">
                            {[
                                { id: 'active', label: 'Em Andamento', color: 'blue' },
                                { id: 'won', label: 'Ganho', color: 'green' },
                                { id: 'lost', label: 'Perdido', color: 'red' }
                            ].map(status => (
                                <label key={status.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localFilters.status.includes(status.id)}
                                        onChange={() => handleStatusToggle(status.id)}
                                        className={`rounded text-${status.color}-600 focus:ring-${status.color}-500 border-gray-300 dark:border-gray-600 dark:bg-slate-800`}
                                    />
                                    <span className={`text-sm font-medium text-slate-700 dark:text-slate-200`}>{status.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Faixa de Valor */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Estimado</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">Min</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full h-10 !pl-14 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                    value={localFilters.minValue}
                                    onChange={(e) => setLocalFilters({ ...localFilters, minValue: e.target.value })}
                                />
                            </div>
                            <span className="text-slate-400">-</span>
                            <div className="flex-1 relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">Max</span>
                                <input
                                    type="number"
                                    placeholder="Sem limite"
                                    className="w-full h-10 !pl-14 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                    value={localFilters.maxValue}
                                    onChange={(e) => setLocalFilters({ ...localFilters, maxValue: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data de Criação */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data de Criação</h3>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 w-8">De:</span>
                                <input
                                    type="date"
                                    className="flex-1 h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-slate-700 dark:text-slate-200"
                                    value={localFilters.startDate}
                                    onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 w-8">Até:</span>
                                <input
                                    type="date"
                                    className="flex-1 h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-slate-700 dark:text-slate-200"
                                    value={localFilters.endDate}
                                    onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={handleClear}
                        className="text-sm font-bold text-slate-500 hover:text-red-500 transition-colors"
                    >
                        Limpar Filtros
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleApply}
                            className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
