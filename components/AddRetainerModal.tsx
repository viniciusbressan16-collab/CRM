import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AddRetainerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any; // Retainer to edit
}

export default function AddRetainerModal({ isOpen, onClose, onSuccess, initialData }: AddRetainerModalProps) {
    const [loading, setLoading] = useState(false);

    // Form State
    const [clientName, setClientName] = useState('');
    const [monthlyFee, setMonthlyFee] = useState('');
    const [commissionPercent, setCommissionPercent] = useState('20');
    const [startDate, setStartDate] = useState('');

    // Populate form on open/change
    React.useEffect(() => {
        if (isOpen && initialData) {
            setClientName(initialData.client_name);
            setMonthlyFee(initialData.monthly_fee?.toString() || '');
            setCommissionPercent(initialData.commission_percent?.toString() || '20');
            setStartDate(initialData.start_date || '');
        } else if (isOpen && !initialData) {
            resetForm();
        }
    }, [isOpen, initialData]);

    // Derived
    const fee = parseFloat(monthlyFee) || 0;
    const commPercent = parseFloat(commissionPercent) || 0;
    const ourShare = fee * (commPercent / 100);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData?.id) {
                // Update
                const { error } = await supabase
                    .from('financial_retainers')
                    // @ts-ignore
                    .update({
                        client_name: clientName,
                        monthly_fee: fee,
                        our_share: ourShare,
                        commission_percent: commPercent,
                        start_date: startDate,
                    })
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                // Insert
                // @ts-ignore
                const { error } = await supabase.from('financial_retainers').insert({
                    client_name: clientName,
                    monthly_fee: fee,
                    our_share: ourShare,
                    commission_percent: commPercent,
                    start_date: startDate,
                    active: true,
                });
                if (error) throw error;
            }

            onSuccess();
            onClose();
            resetForm();
        } catch (error) {
            console.error('Error saving retainer:', error);
            alert('Erro ao salvar mensalista.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setClientName('');
        setMonthlyFee('');
        setCommissionPercent('20');
        setStartDate('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">calendar_month</span>
                            {initialData ? 'Editar Mensalista' : 'Novo Mensalista'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Cliente / Empresa</label>
                        <input
                            required
                            type="text"
                            className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                            placeholder="Nome da empresa"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Valor da Mensalidade (Total)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
                            <input
                                required
                                type="number"
                                step="0.01"
                                className="w-full h-10 pl-12 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400 font-medium"
                                placeholder="0,00"
                                value={monthlyFee}
                                onChange={(e) => setMonthlyFee(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Comissão (%)</label>
                            <div className="relative">
                                <input
                                    required
                                    type="number"
                                    step="0.1"
                                    className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                                    value={commissionPercent}
                                    onChange={(e) => setCommissionPercent(e.target.value)}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Primeiro Pagamento</label>
                            <input
                                required
                                type="date"
                                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-slate-600 dark:text-slate-300"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Sua Parte ({commPercent}%)</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {ourShare.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-10 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        Salvar Mensalista
                    </button>
                </form>
            </div>
        </div>
    );
}
