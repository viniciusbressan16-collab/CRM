import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Database, Json } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Deal = Database['public']['Tables']['deals']['Row'];

interface CustomField {
    key: string;
    value: string;
}

interface AssociatedCompany {
    name: string;
    cnpj: string;
}

interface NewDealModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (deal: Partial<Deal>) => Promise<void>;
    initialData?: Partial<Deal>;
    knownCustomKeys?: string[];
}

export default function NewDealModal({ isOpen, onClose, onSave, initialData, knownCustomKeys = [] }: NewDealModalProps) {
    const [loading, setLoading] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [partnerships, setPartnerships] = useState<string[]>([]);

    // Form State
    const [companyName, setCompanyName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [contactName, setContactName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [service, setService] = useState(''); // This is now "Parceria" (mapped to tag)
    const [value, setValue] = useState('');
    const [recoveredValue, setRecoveredValue] = useState('');
    const [assigneeId, setAssigneeId] = useState('');

    // Custom Fields State
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    // Associated Companies State
    const [associatedCompanies, setAssociatedCompanies] = useState<AssociatedCompany[]>([]);

    // New Partnership Input State
    const [isAddingPartnership, setIsAddingPartnership] = useState(false);
    const [newPartnershipName, setNewPartnershipName] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchProfiles();
            fetchPartnerships();
            if (initialData) {
                setCompanyName(initialData.client_name || '');
                setCnpj(initialData.cnpj || '');
                setContactName(initialData.contact_name || '');
                setPhone(initialData.phone || '');
                setEmail(initialData.email || '');
                setService(initialData.tag || '');
                setValue(initialData.value?.toString() || '');
                setRecoveredValue(initialData.recovered_value?.toString() || '');
                setAssigneeId(initialData.assignee_id || '');

                // Load Custom Fields and merge with global keys
                const initialFields = (initialData.custom_fields && typeof initialData.custom_fields === 'object' && !Array.isArray(initialData.custom_fields))
                    ? (initialData.custom_fields as Record<string, any>)
                    : {};

                const mergedFields: CustomField[] = [];
                const addedKeys = new Set<string>();

                // 1. Add fields that have values in this specific lead
                Object.entries(initialFields).forEach(([key, value]) => {
                    if (key) {
                        mergedFields.push({ key, value: value !== null ? String(value) : '' });
                        addedKeys.add(key);
                    }
                });

                // 2. Add empty entries for known global keys that aren't in this lead yet
                knownCustomKeys.forEach(key => {
                    if (key && !addedKeys.has(key)) {
                        mergedFields.push({ key, value: '' });
                        addedKeys.add(key);
                    }
                });

                setCustomFields(mergedFields);

                // Load Associated Companies
                if (initialData.associated_companies && Array.isArray(initialData.associated_companies)) {
                    setAssociatedCompanies(initialData.associated_companies as unknown as AssociatedCompany[]);
                } else {
                    setAssociatedCompanies([]);
                }
            } else {
                resetForm();
                // For new leads, show all global custom keys as empty inputs
                setCustomFields(knownCustomKeys.map(key => ({ key, value: '' })));
            }
        }
    }, [isOpen, initialData, knownCustomKeys]);

    const resetForm = () => {
        setCompanyName('');
        setCnpj('');
        setContactName('');
        setPhone('');
        setEmail('');
        setService('');
        setValue('');
        setRecoveredValue('');
        setAssigneeId('');
        setCustomFields([]);
        setAssociatedCompanies([]);
        setIsAddingPartnership(false);
        setNewPartnershipName('');
    };

    const fetchProfiles = async () => {
        const { data } = await supabase.from('profiles').select('*');
        if (data) setProfiles(data);
    };

    const fetchPartnerships = async () => {
        const { data } = await supabase.from('partnerships').select('name').order('name');
        if (data) setPartnerships(data.map(p => p.name));
    };

    const handleCreatePartnership = async () => {
        if (!newPartnershipName.trim()) return;
        try {
            const { error } = await supabase.from('partnerships').insert({ name: newPartnershipName });
            if (!error) {
                fetchPartnerships();
                setService(newPartnershipName);
                setIsAddingPartnership(false);
                setNewPartnershipName('');
            }
        } catch (error) {
            console.error('Error creating partnership:', error);
        }
    };

    // Custom Fields Handlers
    const addCustomField = () => {
        setCustomFields([...customFields, { key: '', value: '' }]);
    };

    const removeCustomField = (index: number) => {
        const newFields = [...customFields];
        newFields.splice(index, 1);
        setCustomFields(newFields);
    };

    const updateCustomField = (index: number, field: keyof CustomField, newValue: string) => {
        const newFields = [...customFields];
        newFields[index][field] = newValue;
        setCustomFields(newFields);
    };

    // Associated Companies Handlers
    const addAssociatedCompany = () => {
        setAssociatedCompanies([...associatedCompanies, { name: '', cnpj: '' }]);
    };

    const removeAssociatedCompany = (index: number) => {
        const newCompanies = [...associatedCompanies];
        newCompanies.splice(index, 1);
        setAssociatedCompanies(newCompanies);
    };

    const updateAssociatedCompany = (index: number, field: keyof AssociatedCompany, newValue: string) => {
        const newCompanies = [...associatedCompanies];
        newCompanies[index][field] = newValue;
        setAssociatedCompanies(newCompanies);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Convert Custom Fields array to object
        const customFieldsObject = customFields.reduce((acc, field) => {
            if (field.key.trim()) {
                acc[field.key.trim()] = field.value;
            }
            return acc;
        }, {} as { [key: string]: string });

        try {
            await onSave({
                id: initialData?.id,
                client_name: companyName,
                cnpj,
                contact_name: contactName,
                phone,
                email,
                tag: service, // Storing Partnership in tag
                title: `${companyName}`,
                value: parseFloat(value) || 0,
                recovered_value: parseFloat(recoveredValue) || 0,
                assignee_id: assigneeId || null,
                status: initialData?.status || 'active',
                pipeline_id: initialData?.pipeline_id,
                custom_fields: customFieldsObject,
                associated_companies: associatedCompanies as unknown as Json
            });
            onClose();
        } catch (error) {
            console.error('Error saving deal:', error);
            alert('Erro ao salvar lead.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-surface-dark w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {initialData ? 'Editar Lead' : 'Cadastro de Novo Lead'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Insira os dados da oportunidade</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Empresa Principal */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informações da Empresa Principal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nome da Empresa</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="Ex: Indústria Metal Ltda"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">CNPJ</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="00.000.000/0000-00"
                                    value={cnpj}
                                    onChange={(e) => setCnpj(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Empresas Associadas */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300">Empresas Associadas</label>
                                <button
                                    type="button"
                                    onClick={addAssociatedCompany}
                                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                    Adicionar Empresa Associada
                                </button>
                            </div>

                            {associatedCompanies.map((company, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 relative group animate-in fade-in slide-in-from-top-1">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nome da Empresa</label>
                                        <input
                                            type="text"
                                            className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                            placeholder="CLEYTON PNEUS"
                                            value={company.name}
                                            onChange={(e) => updateAssociatedCompany(index, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5 pr-8">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CNPJ</label>
                                        <input
                                            type="text"
                                            className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                            placeholder="00.000.000/0000-00"
                                            value={company.cnpj}
                                            onChange={(e) => updateAssociatedCompany(index, 'cnpj', e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeAssociatedCompany(index)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remover Empresa"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contato */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dados de Contato</h3>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nome do Contato</label>
                            <input
                                type="text"
                                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                placeholder="Nome completo do decisor"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="(00) 00000-0000"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">E-mail</label>
                                <input
                                    type="email"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="contato@empresa.com.br"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Detalhes */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalhes da Oportunidade</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Parceria</label>
                                <div className="space-y-2">
                                    <div className="relative">
                                        <select
                                            className="w-full h-10 px-3 appearance-none rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                            value={service}
                                            onChange={(e) => setService(e.target.value)}
                                        >
                                            <option value="">Selecione uma parceria...</option>
                                            {partnerships.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">expand_more</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingPartnership(!isAddingPartnership)}
                                        className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">add</span>
                                        Nova Parceria
                                    </button>
                                    {isAddingPartnership && (
                                        <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                                            <input
                                                type="text"
                                                value={newPartnershipName}
                                                onChange={(e) => setNewPartnershipName(e.target.value)}
                                                placeholder="Nome da parceria"
                                                className="flex-1 h-8 rounded border border-slate-300 dark:border-slate-700 px-2 text-xs bg-white dark:bg-slate-800"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCreatePartnership}
                                                className="h-8 px-3 bg-primary text-white text-xs font-bold rounded hover:bg-primary-hover"
                                            >
                                                Salvar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Valor Estimado de Recuperação</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                                <input
                                    type="number"
                                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="0,00"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Valor Recuperado (Realizado)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                                <input
                                    type="number"
                                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="0,00"
                                    value={recoveredValue}
                                    onChange={(e) => setRecoveredValue(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Campos Personalizados */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campos Personalizados</h3>
                            <button
                                type="button"
                                onClick={addCustomField}
                                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                Adicionar Campo
                            </button>
                        </div>

                        <div className="space-y-3">
                            {customFields.map((field, index) => (
                                <div key={index} className="flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                                    <div className="w-1/3">
                                        <input
                                            type="text"
                                            className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                            placeholder="Nome do Campo"
                                            value={field.key}
                                            onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                            placeholder="Valor"
                                            value={field.value}
                                            onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeCustomField(index)}
                                        className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Remover Campo"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            ))}
                            {customFields.length === 0 && (
                                <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-sm">
                                    Nenhum campo personalizado adicionado
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Seleção de Responsável</label>
                        <div className="relative">
                            <select
                                className="w-full h-10 pl-9 pr-3 appearance-none rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                value={assigneeId}
                                onChange={(e) => setAssigneeId(e.target.value)}
                            >
                                <option value="">Selecione um consultor...</option>
                                {profiles.map(profile => (
                                    <option key={profile.id} value={profile.id}>{profile.name} ({profile.role || 'Consultor'})</option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">person</span>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">expand_more</span>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Salvando...' : 'Salvar Lead'}
                    </button>
                </div>
            </div>
        </div>
    );
}
