
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface ImportDealsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (deals: any[]) => Promise<void>;
}

export default function ImportDealsModal({ isOpen, onClose, onImport }: ImportDealsModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            parseExcel(selectedFile);
        }
    };

    const parseExcel = async (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const parsedData = XLSX.utils.sheet_to_json(sheet);
            setData(parsedData);
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        if (data.length === 0) return;
        setLoading(true);
        try {
            await onImport(data);
            onClose();
            setFile(null);
            setData([]);
        } catch (error) {
            console.error(error);
            alert('Erro ao importar dados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-lg p-6 border border-border-light dark:border-border-dark m-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-text-main-light dark:text-white">Importar Oportunidades</h3>
                    <button onClick={onClose} className="text-text-secondary-light hover:text-text-main-light">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">upload_file</span>
                        <p className="text-sm text-text-secondary-light">
                            {file ? file.name : 'Clique para selecionar um arquivo Excel/CSV'}
                        </p>
                    </div>

                    {data.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                {data.length} contatos encontrados
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                Os contatos serão importados para a primeira fase do pipeline.
                            </p>
                        </div>
                    )}

                    <div className="mt-2 text-xs text-gray-500">
                        <p className="font-bold mb-1">Formato esperado (cabeçalhos):</p>
                        <p>Nome, Valor, Telefone, Email, Tag (Parceria)</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={loading || data.length === 0}
                            className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
                            Importar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
