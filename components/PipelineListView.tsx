
import React, { useState, useEffect } from 'react';
import { Database } from '../types/supabase';
import { View } from '../App';

type Deal = Database['public']['Tables']['deals']['Row'];
type PipelineElement = Database['public']['Tables']['pipelines']['Row'];
type DealWithAssignee = Deal & {
    assignee: {
        name: string;
        avatar_url: string | null;
    } | null;
};

interface PipelineListViewProps {
    deals: DealWithAssignee[];
    columns: PipelineElement[];
    onNavigate: (view: View, id?: string) => void;
    onEdit: (deal: Deal) => void;
    onBatchUpdate: (dealIds: string[], updates: Partial<Deal>) => Promise<void>;
    getTagColor: (tag: string) => string;
}

type ColumnKey = string; // Changed from fixed union to string to support dynamic keys

interface ColumnConfig {
    key: ColumnKey;
    label: string;
    visible: boolean;
    locked?: boolean;
    isCustom?: boolean; // Identify if it's a dynamic field
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
    { key: 'client_name', label: 'Cliente', visible: true, locked: true },
    { key: 'pipeline_id', label: 'Fase', visible: true },
    { key: 'value', label: 'Valor Estimado', visible: true },
    { key: 'recovered_value', label: 'Valor Recuperado', visible: true },
    { key: 'tag', label: 'Etiqueta', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'contact_name', label: 'Contato', visible: false },
    { key: 'email', label: 'Email', visible: false },
    { key: 'phone', label: 'Telefone', visible: false },
    { key: 'phone_secondary', label: 'Telefone Secundário', visible: false },
    { key: 'cnpj', label: 'CNPJ', visible: false },
    { key: 'assignee', label: 'Responsável', visible: false },
    { key: 'created_at', label: 'Criado em', visible: false },
];

export default function PipelineListView({ deals, columns, onNavigate, onEdit, onBatchUpdate, getTagColor }: PipelineListViewProps) {
    const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
    const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    // Sync DEFAULT_COLUMNS with state (handles code updates) & Load from LocalStorage
    useEffect(() => {
        const savedConfig = localStorage.getItem('pipeline_list_columns');
        let initialConfig = DEFAULT_COLUMNS;

        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                // Merge saved config with defaults to ensure new columns appear
                const savedKeys = new Set(parsed.map((c: ColumnConfig) => c.key));
                const missingDefaults = DEFAULT_COLUMNS.filter(c => !savedKeys.has(c.key));

                // Preserve saved visibility preference, but add new columns
                initialConfig = [...parsed, ...missingDefaults];
            } catch (e) {
                console.error('Failed to parse saved columns', e);
            }
        }

        setColumnConfig(prev => {
            // If state has already diverged (e.g. custom fields added), merging logic is complex.
            // For simplicity on mount, we trust localStorage + defaults.
            // But we must also respect checking against current state if it was somehow initialized differently?
            // Actually, this runs on mount. 'prev' is initial DEFAULT_COLUMNS.
            return initialConfig;
        });
    }, []);

    // Save to LocalStorage on change
    useEffect(() => {
        if (columnConfig !== DEFAULT_COLUMNS) {
            localStorage.setItem('pipeline_list_columns', JSON.stringify(columnConfig));
        }
    }, [columnConfig]);

    // Dynamic Column Synchronization: Update config when deals change to include new custom fields
    useEffect(() => {
        const customKeys = new Set<string>();
        deals.forEach(deal => {
            if (deal.custom_fields && typeof deal.custom_fields === 'object' && !Array.isArray(deal.custom_fields)) {
                Object.keys(deal.custom_fields).forEach(key => customKeys.add(key));
            }
        });

        if (customKeys.size > 0) {
            setColumnConfig(prev => {
                const newConfig = [...prev];
                let changed = false;
                customKeys.forEach(key => {
                    if (!newConfig.find(c => c.key === key)) {
                        newConfig.push({
                            key: key,
                            label: key, // Label is same as key for custom fields
                            visible: false,
                            isCustom: true
                        });
                        changed = true;
                    }
                });
                return changed ? newConfig : prev;
            });
        }
    }, [deals]);

    // --- Helpers ---
    const getStageName = (pipelineId: string | null) => {
        if (!pipelineId) return 'Sem Fase';
        return columns.find(c => c.id === pipelineId)?.name || 'Desconhecido';
    };

    const formatCurrency = (val: number | null) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    // --- Bulk Selection ---
    const toggleSelectAll = () => {
        if (selectedDealIds.size === deals.length) {
            setSelectedDealIds(new Set());
        } else {
            setSelectedDealIds(new Set(deals.map(d => d.id)));
        }
    };

    const toggleSelectRow = (id: string) => {
        const newSet = new Set(selectedDealIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedDealIds(newSet);
    };

    // --- Bulk Edit Logic ---
    const handleFieldChange = async (dealId: string, field: keyof Deal, value: any) => {
        // Optimistic UI could be handled by parent refetch, but let's assume parent handles it.

        if (selectedDealIds.has(dealId)) {
            // Apply to ALL selected
            if (confirm(`Aplicar alteração para ${selectedDealIds.size} itens selecionados?`)) {
                await onBatchUpdate(Array.from(selectedDealIds), { [field]: value });
            }
        } else {
            // Apply only to single row
            await onBatchUpdate([dealId], { [field]: value });
        }
    };

    // New handler for custom fields
    const handleCustomFieldChange = async (dealId: string, field: string, value: string) => {
        const deal = deals.find(d => d.id === dealId);
        if (!deal) return;

        const currentFields = (deal.custom_fields as Record<string, any>) || {};
        const newFields = { ...currentFields, [field]: value };

        if (selectedDealIds.has(dealId)) {
            if (confirm(`Aplicar alteração para ${selectedDealIds.size} itens selecionados?`)) {
                await onBatchUpdate(Array.from(selectedDealIds), { custom_fields: newFields });
            }
        } else {
            await onBatchUpdate([dealId], { custom_fields: newFields });
        }
    };

    // --- Column Config Logic ---
    const toggleColumnVisibility = (key: ColumnKey) => {
        setColumnConfig(prev => prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        const newConfig = [...columnConfig];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newConfig.length) return;

        [newConfig[index], newConfig[targetIndex]] = [newConfig[targetIndex], newConfig[index]];
        setColumnConfig(newConfig);
    };


    const visibleColumns = columnConfig.filter(c => c.visible);

    return (
        <div className="rounded-xl overflow-hidden flex flex-col h-full relative">
            {/* Column Config Modal */}
            {isConfigModalOpen && (
                <div className="absolute top-12 right-4 z-20 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-64 p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Colunas</h4>
                        <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                    <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {columnConfig.map((col, idx) => (
                            <div key={col.key} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded group">
                                <input
                                    type="checkbox"
                                    checked={col.visible}
                                    onChange={() => !col.locked && toggleColumnVisibility(col.key)}
                                    disabled={col.locked}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className={`text-sm flex-1 truncate ${col.visible ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>
                                    {col.label}
                                    {col.isCustom && <span className="ml-1 text-[8px] opacity-50 px-1 rounded bg-primary/20">Custom</span>}
                                </span>
                                <div className="flex flex-col opacity-0 group-hover:opacity-100">
                                    <button onClick={() => moveColumn(idx, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-primary disabled:opacity-30">
                                        <span className="material-symbols-outlined text-[10px] leading-none">arrow_drop_up</span>
                                    </button>
                                    <button onClick={() => moveColumn(idx, 'down')} disabled={idx === columnConfig.length - 1} className="text-gray-400 hover:text-primary disabled:opacity-30">
                                        <span className="material-symbols-outlined text-[10px] leading-none">arrow_drop_down</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-glass-border bg-glass-bg backdrop-blur-md">
                            <th className="px-4 py-4 w-[40px] text-center">
                                <input
                                    type="checkbox"
                                    checked={deals.length > 0 && selectedDealIds.size === deals.length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                            </th>
                            {visibleColumns.map(col => (
                                <th key={col.key} className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-6 py-4 text-right w-[60px]">
                                <button
                                    onClick={() => setIsConfigModalOpen(!isConfigModalOpen)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500"
                                    title="Configurar Colunas"
                                >
                                    <span className="material-symbols-outlined text-[20px]">add</span>
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {deals.length === 0 ? (
                            <tr>
                                <td colSpan={visibleColumns.length + 2} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                                    Nenhuma oportunidade encontrada.
                                </td>
                            </tr>
                        ) : (
                            deals.map((deal) => {
                                const isSelected = selectedDealIds.has(deal.id);
                                return (
                                    <tr
                                        key={deal.id}
                                        className={`group transition-all duration-200 border-b border-glass-border/50
                                            ${isSelected
                                                ? 'bg-primary/20 backdrop-blur-sm'
                                                : 'hover:bg-white/5 hover:backdrop-blur-sm'}`}
                                    >
                                        <td className="px-4 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectRow(deal.id)}
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                        </td>

                                        {visibleColumns.map(col => (
                                            <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                                                {/* Render Logic based on Column Key */}
                                                {col.key === 'client_name' && (
                                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('client', deal.id)}>
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            {(deal.client_name || deal.title || '?')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{deal.client_name || deal.title}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{deal.contact_name || 'Sem contato'}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {col.key === 'pipeline_id' && (
                                                    <select
                                                        className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md border-none focus:ring-2 focus:ring-primary cursor-pointer outline-none max-w-[150px]"
                                                        value={deal.pipeline_id || ''}
                                                        onChange={(e) => handleFieldChange(deal.id, 'pipeline_id', e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {columns.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {col.key === 'value' && (
                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                        {formatCurrency(deal.value)}
                                                    </span>
                                                )}

                                                {col.key === 'recovered_value' && (
                                                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                        {deal.recovered_value ? formatCurrency(deal.recovered_value) : '-'}
                                                    </span>
                                                )}

                                                {col.key === 'tag' && (
                                                    deal.tag ? (
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${getTagColor(deal.tag)}-100 text-${getTagColor(deal.tag)}-700 dark:bg-${getTagColor(deal.tag)}-900/30 dark:text-${getTagColor(deal.tag)}-400`}>
                                                            {deal.tag}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )
                                                )}

                                                {col.key === 'status' && (
                                                    <select
                                                        className={`px-2 py-1 rounded-full text-xs font-bold border-none focus:ring-2 focus:ring-primary cursor-pointer outline-none appearance-none text-center
                                                            ${deal.status === 'won' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                                                                deal.status === 'lost' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                                                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30'}`}
                                                        value={deal.status || 'active'}
                                                        onChange={(e) => handleFieldChange(deal.id, 'status', e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="active">Em Andamento</option>
                                                        <option value="won">Ganho</option>
                                                        <option value="lost">Perdido</option>
                                                    </select>
                                                )}

                                                {col.key === 'contact_name' && <span className="text-sm text-gray-600 dark:text-gray-400">{deal.contact_name || '-'}</span>}
                                                {col.key === 'email' && <span className="text-sm text-gray-600 dark:text-gray-400">{deal.email || '-'}</span>}
                                                {col.key === 'phone' && <span className="text-sm text-gray-600 dark:text-gray-400">{deal.phone || '-'}</span>}
                                                {col.key === 'phone_secondary' && <span className="text-sm text-gray-600 dark:text-gray-400">{deal.phone_secondary || '-'}</span>}
                                                {col.key === 'cnpj' && <span className="text-sm text-gray-600 dark:text-gray-400">{deal.cnpj || '-'}</span>}
                                                {col.key === 'assignee' && (
                                                    <div className="flex items-center gap-2">
                                                        {deal.assignee?.avatar_url ? (
                                                            <div className="w-5 h-5 rounded-full bg-cover" style={{ backgroundImage: `url('${deal.assignee.avatar_url}')` }}></div>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold">
                                                                {(deal.assignee?.name || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{deal.assignee?.name || '-'}</span>
                                                    </div>
                                                )}
                                                {col.key === 'created_at' && <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(deal.created_at)}</span>}

                                                {/* Dynamic Custom Field Rendering */}
                                                {col.isCustom && (
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        {(deal.custom_fields as any)?.[col.key] || '-'}
                                                    </span>
                                                )}
                                            </td>
                                        ))}

                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEdit(deal); }}
                                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Editar Lead"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Sticky Batch Actions Footer */}
            {selectedDealIds.size > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white dark:bg-surface-light dark:text-gray-900 px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-4 z-10">
                    <span className="font-bold text-sm">{selectedDealIds.size} selecionados</span>
                    <div className="h-4 w-px bg-white/20 dark:bg-black/20"></div>
                    {/* Batch Actions could be expanded here */}
                    <span className="text-xs opacity-70">Edite uma linha para aplicar a todos</span>
                    <button onClick={() => setSelectedDealIds(new Set())} className="ml-2 hover:bg-white/20 dark:hover:bg-black/10 rounded-full p-1">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            )}
        </div>
    );
}
