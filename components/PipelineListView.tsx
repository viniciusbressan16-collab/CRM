
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

// --- Editable Components ---

interface EditableCellProps {
    value: string;
    onSave: (newValue: string) => void;
    placeholder?: string;
    className?: string;
}

const EditableCell = ({ value: initialValue, onSave, placeholder, className }: EditableCellProps) => {
    const [value, setValue] = useState(initialValue);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => setValue(initialValue), [initialValue]);

    const handleBlur = () => {
        setIsEditing(false);
        if (value !== initialValue) {
            onSave(value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    if (isEditing) {
        return (
            <input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`w-full bg-white dark:bg-black/20 border border-primary/50 rounded px-2 py-1 text-sm outline-none ${className}`}
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    return (
        <div
            className={`cursor-text hover:bg-gray-100 dark:hover:bg-white/5 rounded px-2 py-1 min-h-[28px] flex items-center ${className} ${!value && 'text-gray-400 italic'}`}
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        >
            {value || placeholder || '-'}
        </div>
    );
};

interface EditableCurrencyProps extends EditableCellProps {
    value: string; // expecting casted number-as-string or pure string logic handling usually
    numericValue: number | null;
    onSaveNumeric: (val: number) => void;
}

const EditableCurrencyCell = ({ numericValue, onSaveNumeric, className }: EditableCurrencyProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(numericValue?.toString() || '');

    useEffect(() => setLocalValue(numericValue?.toString() || ''), [numericValue]);

    const formatBRL = (val: number | null) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const handleBlur = () => {
        setIsEditing(false);
        const parsed = parseFloat(localValue.replace(',', '.'));
        if (!isNaN(parsed) && parsed !== numericValue) {
            onSaveNumeric(parsed);
        }
    };

    if (isEditing) {
        return (
            <input
                autoFocus
                type="number"
                step="0.01"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className={`w-full bg-white dark:bg-black/20 border border-primary/50 rounded px-2 py-1 text-sm outline-none ${className}`}
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    return (
        <div
            className={`cursor-text hover:bg-gray-100 dark:hover:bg-white/5 rounded px-2 py-1 min-h-[28px] flex items-center ${className}`}
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        >
            {formatBRL(numericValue)}
        </div>
    );
};

export default function PipelineListView({ deals, columns, onNavigate, onEdit, onBatchUpdate, getTagColor }: PipelineListViewProps) {
    // Initialize Config with Saved Order + Merging Logic
    const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => {
        const savedConfig = localStorage.getItem('pipeline_list_columns');
        const savedCustom = localStorage.getItem('pipeline_custom_columns');
        let initialCustom: ColumnConfig[] = savedCustom ? JSON.parse(savedCustom) : [];

        // Merge Logic:
        // 1. Start with what's saved in local storage (order matters)
        // 2. Add any DEFAULT_COLUMNS that are missing (e.g. new code features)
        // 3. Add any Custom Columns that are missing (e.g. newly added this session)

        let initialConfig: ColumnConfig[] = [];

        if (savedConfig) {
            try {
                initialConfig = JSON.parse(savedConfig);
            } catch (e) { console.error(e); }
        }

        // If no saved config, build canonical: Default + Custom
        if (initialConfig.length === 0) {
            return [...DEFAULT_COLUMNS, ...initialCustom];
        }

        // Ensure all Defaults exist
        const configKeys = new Set(initialConfig.map(c => c.key));
        DEFAULT_COLUMNS.forEach(def => {
            if (!configKeys.has(def.key)) {
                initialConfig.push(def);
                configKeys.add(def.key);
            }
        });

        // Ensure all Customs exist
        initialCustom.forEach(cust => {
            if (!configKeys.has(cust.key)) {
                initialConfig.push(cust);
                configKeys.add(cust.key);
            }
        });

        return initialConfig;
    });

    const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Filter State
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [showFilters, setShowFilters] = useState(false);
    const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null); // Track open dropdown

    // Custom Columns State
    const [newColumnName, setNewColumnName] = useState('');
    const [customColumnDefs, setCustomColumnDefs] = useState<ColumnConfig[]>(() => {
        const saved = localStorage.getItem('pipeline_custom_columns');
        return saved ? JSON.parse(saved) : [];
    });

    // Save Custom Columns Definitions
    useEffect(() => {
        localStorage.setItem('pipeline_custom_columns', JSON.stringify(customColumnDefs));

        // When Custom Defs change, ensure they are in the main config
        setColumnConfig(prev => {
            const currentKeys = new Set(prev.map(c => c.key));
            const newCols = customColumnDefs.filter(c => !currentKeys.has(c.key));
            if (newCols.length > 0) {
                const next = [...prev, ...newCols];
                localStorage.setItem('pipeline_list_columns', JSON.stringify(next));
                return next;
            }
            return prev;
        });
    }, [customColumnDefs]);

    // Save Main Config to LocalStorage on change
    useEffect(() => {
        localStorage.setItem('pipeline_list_columns', JSON.stringify(columnConfig));
    }, [columnConfig]);

    const handleAddCustomColumn = () => {
        if (!newColumnName.trim()) return;
        const key = newColumnName.toLowerCase().replace(/\s+/g, '_');

        // Prevent duplicates
        if (columnConfig.some(c => c.key === key) || customColumnDefs.some(c => c.key === key)) {
            alert('Coluna já existe!');
            return;
        }

        const newCol: ColumnConfig = {
            key,
            label: newColumnName,
            visible: true,
            isCustom: true
        };

        setCustomColumnDefs(prev => [...prev, newCol]);
        setNewColumnName('');
    };

    const handleDeleteCustomColumn = (key: string) => {
        if (confirm('Excluir coluna? Os dados não serão perdidos, apenas a coluna será removida da visualização.')) {
            setCustomColumnDefs(prev => prev.filter(c => c.key !== key));
        }
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        const newCols = [...columnConfig];
        if (direction === 'up') {
            if (index === 0) return;
            [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
        } else {
            if (index === newCols.length - 1) return;
            [newCols[index + 1], newCols[index]] = [newCols[index], newCols[index + 1]];
        }
        setColumnConfig(newCols);
        localStorage.setItem('pipeline_list_columns', JSON.stringify(newCols));
    };

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




    const visibleColumns = columnConfig.filter(c => c.visible);

    // --- Derived Data: Filter & Sort ---
    const processedDeals = React.useMemo(() => {
        let result = [...deals];

        // 1. Filter
        if (Object.keys(filters).length > 0) {
            result = result.filter(deal => {
                return Object.entries(filters).every(([key, filterValue]) => {
                    if (!filterValue) return true;

                    let value = '';
                    if (key === 'assignee') {
                        value = deal.assignee?.name || '';
                    } else if (key === 'pipeline_id') {
                        // Multi-select for pipeline_id
                        const selectedIds = filterValue.split(',').filter(Boolean);
                        if (selectedIds.length === 0) return true;
                        return selectedIds.includes(deal.pipeline_id || '');
                    } else if (key === 'tag') {
                        value = deal.tag || ''; // Filter by tag
                    } else if (key === 'status') {
                        // Allow filtering by status text (won/em andamento etc)
                        const statusMap: Record<string, string> = { 'active': 'Em Andamento', 'won': 'Ganho', 'lost': 'Perdido', 'archived': 'Arquivado' };
                        value = statusMap[deal.status || 'active'] || deal.status || '';
                    } else if (key === 'created_at') {
                        value = formatDate(deal.created_at);
                    } else if ((deal as any)[key] !== undefined) {
                        value = String((deal as any)[key] || '');
                    } else if (deal.custom_fields && (deal.custom_fields as any)[key]) {
                        value = String((deal.custom_fields as any)[key]);
                    }

                    return value.toLowerCase().includes(filterValue.toLowerCase());
                });
            });
        }

        // 2. Sort
        if (sortConfig) {
            result.sort((a, b) => {
                let aValue: any = '';
                let bValue: any = '';

                if (sortConfig.key === 'assignee') {
                    aValue = a.assignee?.name || '';
                    bValue = b.assignee?.name || '';
                } else if (sortConfig.key === 'pipeline_id') {
                    // Sort by stage name for better UX? Or just ID? Let's use Name.
                    aValue = getStageName(a.pipeline_id);
                    bValue = getStageName(b.pipeline_id);
                } else if (sortConfig.key === 'created_at') {
                    aValue = new Date(a.created_at || 0).getTime();
                    bValue = new Date(b.created_at || 0).getTime();
                } else if ((a as any)[sortConfig.key] !== undefined) {
                    aValue = (a as any)[sortConfig.key];
                    bValue = (b as any)[sortConfig.key];
                } else {
                    // Custom fields
                    aValue = (a.custom_fields as any)?.[sortConfig.key] || '';
                    bValue = (b.custom_fields as any)?.[sortConfig.key] || '';
                }

                if (aValue === bValue) return 0;

                // Handle numbers
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }

                // Handle strings
                const aString = String(aValue).toLowerCase();
                const bString = String(bValue).toLowerCase();

                if (aString < bString) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aString > bString) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [deals, filters, sortConfig, columns]);

    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return prev.direction === 'asc' ? { key, direction: 'desc' } : null; // Toggle Asc -> Desc -> Off
            }
            return { key, direction: 'asc' };
        });
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const toggleFilterOption = (columnKey: string, optionValue: string) => {
        setFilters(prev => {
            const current = prev[columnKey] ? prev[columnKey].split(',') : [];
            const newValues = current.includes(optionValue)
                ? current.filter(v => v !== optionValue)
                : [...current, optionValue];
            return { ...prev, [columnKey]: newValues.join(',') };
        });
    };
    return (
        <div className="rounded-xl flex flex-col h-full relative">
            {/* Click-outside backdrop for filter dropdowns */}
            {activeFilterDropdown && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setActiveFilterDropdown(null)}
                />
            )}

            {/* Column Config Modal */}
            {isConfigModalOpen && (
                <div className="absolute top-12 right-4 z-20 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-64 p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Colunas</h4>
                        <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>

                    {/* Add Column Input */}
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            placeholder="Nova coluna..."
                            className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/20 focus:outline-none focus:border-primary"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomColumn()}
                        />
                        <button
                            onClick={handleAddCustomColumn}
                            disabled={!newColumnName.trim()}
                            className="bg-primary hover:bg-primary-dark text-white rounded p-1.5 disabled:opacity-50 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
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
                                    {col.isCustom && <span className="ml-1 text-[8px] px-1 rounded bg-primary/20 text-primary font-medium">Custom</span>}
                                </span>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 gap-1">
                                    <button onClick={() => moveColumn(idx, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-primary disabled:opacity-30">
                                        <span className="material-symbols-outlined text-[18px]">arrow_drop_up</span>
                                    </button>
                                    <button onClick={() => moveColumn(idx, 'down')} disabled={idx === columnConfig.length - 1} className="text-gray-400 hover:text-primary disabled:opacity-30">
                                        <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
                                    </button>
                                    {col.isCustom && (
                                        <button onClick={() => handleDeleteCustomColumn(col.key)} className="text-red-400 hover:text-red-600 ml-1">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800 bg-glass-bg backdrop-blur-md">
                            <th className="px-4 py-4 w-[40px] text-center">
                                <input
                                    type="checkbox"
                                    checked={deals.length > 0 && selectedDealIds.size === deals.length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                            </th>
                            {visibleColumns.map(col => (
                                <th
                                    key={col.key}
                                    className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-primary transition-colors select-none"
                                    onClick={() => handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {sortConfig?.key === col.key && (
                                            <span className="material-symbols-outlined text-[14px]">
                                                {sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="px-6 py-4 text-right w-[80px]">
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`p-1 rounded-full transition-colors ${showFilters ? 'bg-primary/10 text-primary' : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500'}`}
                                        title="Filtrar Tabela"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">filter_list</span>
                                    </button>
                                    <button
                                        onClick={() => setIsConfigModalOpen(!isConfigModalOpen)}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500"
                                        title="Configurar Colunas"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">settings</span>
                                    </button>
                                </div>
                            </th>
                        </tr>
                        {/* Filter Row */}
                        {showFilters && (
                            <tr className="bg-gray-50/50 dark:bg-black/10 border-b border-gray-100 dark:border-gray-800">
                                <th className="px-4 py-2"></th>
                                {visibleColumns.map(col => (
                                    <th key={col.key} className="px-6 py-2 relative">
                                        {col.key === 'pipeline_id' ? (
                                            <div className="relative">
                                                <button
                                                    className={`w-full text-left text-xs px-2 py-1.5 rounded border ${activeFilterDropdown === col.key ? 'border-primary ring-1 ring-primary' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-black/20 text-gray-700 dark:text-gray-200 flex items-center justify-between cursor-pointer`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveFilterDropdown(activeFilterDropdown === col.key ? null : col.key);
                                                    }}
                                                >
                                                    <span className="truncate">
                                                        {filters[col.key]
                                                            ? `${filters[col.key].split(',').filter(Boolean).length} selecionado(s)`
                                                            : 'Todas as Fases'}
                                                    </span>
                                                    <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                                                </button>
                                                {/* Dropdown */}
                                                {activeFilterDropdown === col.key && (
                                                    <div className="absolute top-full left-0 w-48 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-2 max-h-60 overflow-y-auto mt-1">
                                                        {columns.map(option => {
                                                            const currentIds = (filters[col.key] || '').split(',');
                                                            const isSelected = currentIds.includes(option.id);
                                                            return (
                                                                <div
                                                                    key={option.id}
                                                                    className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleFilterOption(col.key, option.id);
                                                                    }}
                                                                >
                                                                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                                                                        {isSelected && <span className="material-symbols-outlined text-[10px] text-white">check</span>}
                                                                    </div>
                                                                    <span className="text-xs text-gray-700 dark:text-gray-200">{option.name}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder={`Filtrar...`}
                                                value={filters[col.key] || ''}
                                                onChange={(e) => handleFilterChange(col.key, e.target.value)}
                                                className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                                            />
                                        )}
                                    </th>
                                ))}
                                <th className="px-6 py-2"></th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {processedDeals.length === 0 ? (
                            <tr>
                                <td colSpan={visibleColumns.length + 2} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                                    Nenhuma oportunidade encontrada.
                                </td>
                            </tr>
                        ) : (
                            processedDeals.map((deal) => {
                                const isSelected = selectedDealIds.has(deal.id);
                                return (
                                    <tr
                                        key={deal.id}
                                        className={`
                                            border-b border-gray-100 dark:border-gray-800 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5
                                            ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}
                                        `}
                                        onClick={() => onNavigate('client', deal.id)}
                                    >
                                        <td className="px-4 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectOne(deal.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                        </td>
                                        {visibleColumns.map(col => (
                                            <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                                                {/* Render Logic based on Column Key */}
                                                {col.key === 'client_name' && (
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                                                            onClick={(e) => { e.stopPropagation(); onNavigate('client', deal.id); }}
                                                        >
                                                            {(deal.client_name || deal.title || '?')[0].toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <EditableCell
                                                                value={deal.client_name || deal.title || ''}
                                                                onSave={(val) => handleFieldChange(deal.id, 'title', val)}
                                                                placeholder="Nome do Cliente"
                                                                className="font-bold text-gray-900 dark:text-white truncate"
                                                            />
                                                            <EditableCell
                                                                value={deal.contact_name || ''}
                                                                onSave={(val) => handleFieldChange(deal.id, 'contact_name', val)}
                                                                placeholder="Sem contato"
                                                                className="text-xs text-gray-500 dark:text-gray-400"
                                                            />
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
                                                    <EditableCurrencyCell
                                                        value=""
                                                        numericValue={deal.value}
                                                        onSaveNumeric={(val) => handleFieldChange(deal.id, 'value', val)}
                                                        className="font-bold text-gray-700 dark:text-gray-300"
                                                    />
                                                )}

                                                {col.key === 'recovered_value' && (
                                                    <EditableCurrencyCell
                                                        value=""
                                                        numericValue={deal.recovered_value}
                                                        onSaveNumeric={(val) => handleFieldChange(deal.id, 'recovered_value', val)}
                                                        className="font-bold text-green-600 dark:text-green-400"
                                                    />
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

                                                {col.key === 'contact_name' && (
                                                    <EditableCell
                                                        value={deal.contact_name || ''}
                                                        onSave={(val) => handleFieldChange(deal.id, 'contact_name', val)}
                                                        placeholder="-"
                                                        className="text-gray-600 dark:text-gray-400"
                                                    />
                                                )}
                                                {col.key === 'email' && (
                                                    <EditableCell
                                                        value={deal.email || ''}
                                                        onSave={(val) => handleFieldChange(deal.id, 'email', val)}
                                                        placeholder="-"
                                                        className="text-gray-600 dark:text-gray-400"
                                                    />
                                                )}
                                                {col.key === 'phone' && (
                                                    <EditableCell
                                                        value={deal.phone || ''}
                                                        onSave={(val) => handleFieldChange(deal.id, 'phone', val)}
                                                        placeholder="-"
                                                        className="text-gray-600 dark:text-gray-400"
                                                    />
                                                )}
                                                {col.key === 'phone_secondary' && (
                                                    <EditableCell
                                                        value={deal.phone_secondary || ''}
                                                        onSave={(val) => handleFieldChange(deal.id, 'phone_secondary', val)}
                                                        placeholder="-"
                                                        className="text-gray-600 dark:text-gray-400"
                                                    />
                                                )}
                                                {col.key === 'cnpj' && (
                                                    <EditableCell
                                                        value={deal.cnpj || ''}
                                                        onSave={(val) => handleFieldChange(deal.id, 'cnpj', val)}
                                                        placeholder="-"
                                                        className="text-gray-600 dark:text-gray-400"
                                                    />
                                                )}
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
                                                    <EditableCell
                                                        value={(deal.custom_fields as any)?.[col.key] || ''}
                                                        onSave={(val) => handleCustomFieldChange(deal.id, col.key, val)}
                                                        placeholder="-"
                                                        className="text-gray-600 dark:text-gray-400"
                                                    />
                                                )}
                                            </td>
                                        ))
                                        }

                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEdit(deal); }}
                                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Editar Lead"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                        </td>
                                    </tr >
                                );
                            })
                        )}
                    </tbody >
                </table >
            </div >

            {/* Sticky Batch Actions Footer */}
            {
                selectedDealIds.size > 0 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white dark:bg-surface-light dark:text-gray-900 px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-4 z-10">
                        <span className="font-bold text-sm">{selectedDealIds.size} selecionados</span>
                        <div className="h-4 w-px bg-white/20 dark:bg-black/20"></div>
                        {/* Batch Actions could be expanded here */}
                        <span className="text-xs opacity-70">Edite uma linha para aplicar a todos</span>
                        <button onClick={() => setSelectedDealIds(new Set())} className="ml-2 hover:bg-white/20 dark:hover:bg-black/10 rounded-full p-1">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                )
            }
        </div >
    );
}
