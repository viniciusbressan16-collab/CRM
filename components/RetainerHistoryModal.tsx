import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Payment {
    id: string;
    due_date: string;
    payment_date: string | null;
    amount: number;
    status: string;
}

interface RetainerHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    retainerId: string | null;
    clientName: string;
    onUpdate: () => void;
}

export default function RetainerHistoryModal({ isOpen, onClose, retainerId, clientName, onUpdate }: RetainerHistoryModalProps) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editStatus, setEditStatus] = useState('paid');

    useEffect(() => {
        if (isOpen && retainerId) {
            fetchHistory();
        }
    }, [isOpen, retainerId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('financial_retainer_payments')
                .select('*')
                .eq('retainer_id', retainerId)
                .order('due_date', { ascending: false });

            if (error) throw error;
            setPayments(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (payment: Payment) => {
        setEditingId(payment.id);
        const dateStr = payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : '';
        setEditDate(dateStr);
        setEditAmount(payment.amount?.toString() || '');
        setEditStatus(payment.status);
    };

    const handleSave = async (id: string) => {
        try {
            const { error } = await supabase
                .from('financial_retainer_payments')
                // @ts-ignore
                .update({
                    payment_date: editDate || null,
                    amount: parseFloat(editAmount),
                    status: editStatus
                } as any)
                .eq('id', id);

            if (error) throw error;
            setEditingId(null);
            fetchHistory();
            onUpdate();
        } catch (error) {
            console.error('Error updating payment:', error);
            alert('Erro ao atualizar pagamento.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este pagamento?')) return;
        try {
            const { error } = await supabase
                .from('financial_retainer_payments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchHistory();
            onUpdate();
        } catch (error) {
            console.error('Error deleting payment:', error);
            alert('Erro ao excluir pagamento.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-surface-dark w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">history</span>
                            Histórico de Pagamentos
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{clientName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto max-h-[60vh] p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                        </div>
                    ) : payments.length > 0 ? (
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-semibold rounded-l-lg">Vencimento</th>
                                    <th className="px-4 py-3 font-semibold">Data Pagamento</th>
                                    <th className="px-4 py-3 font-semibold">Valor</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold rounded-r-lg text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                            {new Date(payment.due_date).toLocaleDateString('pt-BR')}
                                        </td>

                                        {/* Editable Fields */}
                                        {editingId === payment.id ? (
                                            <>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="date"
                                                        value={editDate}
                                                        onChange={(e) => setEditDate(e.target.value)}
                                                        className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={editAmount}
                                                        onChange={(e) => setEditAmount(e.target.value)}
                                                        className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={editStatus}
                                                        onChange={(e) => setEditStatus(e.target.value)}
                                                        className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800"
                                                    >
                                                        <option value="paid">Pago</option>
                                                        <option value="pending">Pendente</option>
                                                        <option value="overdue">Atrasado</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => handleSave(payment.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                            <span className="material-symbols-outlined text-lg">check</span>
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                                            <span className="material-symbols-outlined text-lg">close</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-4 py-3">
                                                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('pt-BR') : '-'}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-emerald-600 dark:text-emerald-400">
                                                    {payment.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium uppercase ${payment.status === 'paid'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : payment.status === 'overdue'
                                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                        }`}>
                                                        {payment.status === 'paid' ? 'Pago' : payment.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => handleEdit(payment)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                                            <span className="material-symbols-outlined text-lg">edit</span>
                                                        </button>
                                                        <button onClick={() => handleDelete(payment.id)} className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Excluir">
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
                            <p>Nenhum pagamento registrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
