import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';

type Recovery = Database['public']['Tables']['financial_recoveries']['Insert'];

interface AddRecoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddRecoveryModal({ isOpen, onClose, onSuccess }: AddRecoveryModalProps) {
    const [loading, setLoading] = useState(false);

    // Form State
    const [clientName, setClientName] = useState('');
    const [status, setStatus] = useState('analysis'); // analysis, restitution, paid
    const [totalRecovered, setTotalRecovered] = useState('');
    const [feePercent, setFeePercent] = useState('30'); // Default 30% fees
    const [partnerPercent, setPartnerPercent] = useState('50');
    const [myCompanyPercent, setMyCompanyPercent] = useState('40'); // Default 40% of remainder
    const [paymentDate, setPaymentDate] = useState('');

    // Calculations
    const total = parseFloat(totalRecovered) || 0;
    const fPercent = parseFloat(feePercent) || 0;
    const feeAmount = total * (fPercent / 100);

    // Partner split is now on top of Fee Amount
    const pPercent = parseFloat(partnerPercent) || 0;
    const partnerAmount = feeAmount * (pPercent / 100);

    // Remainder is Fees - Partner Share
    const remainder = feeAmount - partnerAmount;

    // "Other Office" gets the rest of the remainder after My Company takes their share?
    // User logic: "60% of remainder to Other, 40% to Me".
    const mPercent = parseFloat(myCompanyPercent) || 0;

    // "Other Office" gets the rest of the remainder after My Company takes their share?
    // User logic: "60% of remainder to Other, 40% to Me".
    // If user inputs My Company %, Other Office % = 100 - My Company %.
    const otherOfficePercent = 100 - mPercent;
    const myCompanyAmount = remainder * (mPercent / 100);
    const otherOfficeAmount = remainder * (otherOfficePercent / 100);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('financial_recoveries').insert({
                client_name: clientName,
                status,
                total_recovered: total,
                partner_percent: pPercent,
                partner_amount: partnerAmount,
                my_company_percent: mPercent,
                my_company_amount: myCompanyAmount,
                other_office_amount: otherOfficeAmount,
                payment_date: paymentDate || null,
            });

            if (error) throw error;
            onSuccess();
            onClose();
            resetForm();
        } catch (error) {
            console.error('Error saving recovery:', error);
            alert('Erro ao salvar recuperação.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setClientName('');
        setStatus('analysis');
        setTotalRecovered('');
        setPartnerPercent('50');
        setMyCompanyPercent('40');
        setPaymentDate('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-surface-dark w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">attach_money</span>
                            Nova Recuperação Tributária
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Registre os valores e divisões de honorários</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1 h-4 bg-primary rounded-full"></span>
                            Dados Gerais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Status</label>
                                <div className="relative">
                                    <select
                                        className="w-full h-10 px-3 appearance-none rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                    >
                                        <option value="analysis">Em Análise</option>
                                        <option value="restitution">Em Restituição</option>
                                        <option value="paid">Pago / Finalizado</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">expand_more</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Valor Total Recuperado</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        className="w-full h-10 pl-12 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400 font-medium"
                                        placeholder="0,00"
                                        value={totalRecovered}
                                        onChange={(e) => setTotalRecovered(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Data de Pagamento (Previsão)</label>
                                <input
                                    type="date"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-slate-600 dark:text-slate-300"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

                    {/* Split Logic */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                            Divisão de Honorários
                        </h3>

                        {/* Total Fees Input */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Honorários Totais (Base)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        className="w-16 h-8 text-right px-2 rounded border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-700"
                                        value={feePercent}
                                        onChange={(e) => setFeePercent(e.target.value)}
                                    />
                                    <span className="text-sm text-slate-500">%</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-xs text-slate-500">Valor dos Honorários (Receita Bruta)</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-white">
                                    {feeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        </div>

                        {/* Partner Split */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Comissão do Parceiro (Execução)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        className="w-16 h-8 text-right px-2 rounded border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-700"
                                        value={partnerPercent}
                                        onChange={(e) => setPartnerPercent(e.target.value)}
                                    />
                                    <span className="text-sm text-slate-500">%</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-xs text-slate-500">Valor destinado ao parceiro</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-white">
                                    {partnerAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        </div>

                        {/* Remainder Visual */}
                        <div className="flex items-center gap-4 px-2">
                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 border-t border-dashed"></div>
                            <div className="text-xs font-medium text-slate-500">
                                Restante: {remainder.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Base para divisão interna)
                            </div>
                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 border-t border-dashed"></div>
                        </div>

                        {/* Internal Split */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* My Company */}
                            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-blue-900 dark:text-blue-100">Minha Empresa</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            className="w-16 h-8 text-right px-2 rounded border border-blue-200 dark:border-blue-700 text-sm bg-white dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-bold"
                                            value={myCompanyPercent}
                                            onChange={(e) => setMyCompanyPercent(e.target.value)}
                                        />
                                        <span className="text-sm text-blue-400">%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-blue-100 dark:border-blue-800">
                                    <span className="text-xs text-blue-400">Lucro Líquido</span>
                                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                        {myCompanyAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                            </div>

                            {/* Other Office */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 opacity-75">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Outro Escritório</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{otherOfficePercent.toFixed(0)}</span>
                                        <span className="text-sm text-slate-500">%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-xs text-slate-500">Repasse</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {otherOfficeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                            </div>
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
                        className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        Salvar Recuperação
                    </button>
                </div>
            </div>
        </div>
    );
}
