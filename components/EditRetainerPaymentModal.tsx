import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface EditRetainerPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    payment: any;
    clientName: string;
}

export default function EditRetainerPaymentModal({ isOpen, onClose, onSuccess, payment, clientName }: EditRetainerPaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState('');

    useEffect(() => {
        if (payment && isOpen) {
            setAmount(payment.amount?.toString() || '');
            setPaymentDate(payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : '');
        }
    }, [payment, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('financial_retainer_payments')
                // @ts-ignore
                .update({
                    amount: parseFloat(amount),
                    payment_date: paymentDate ? new Date(paymentDate).toISOString() : null
                })
                .eq('id', payment.id);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating payment:', error);
            alert('Erro ao atualizar pagamento.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">edit</span>
                        Editar Pagamento
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Mensalista: <strong className="text-gray-900 dark:text-white">{clientName}</strong>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Data do Pagamento</label>
                        <input
                            required
                            type="date"
                            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Valor (R$)</label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white font-medium"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-bold text-black bg-primary hover:bg-yellow-500 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
