import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ImportDealsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (deals: any[]) => Promise<void>;
}

const SYSTEM_FIELDS = [
    { key: 'client_name', label: 'Nome da Empresa/Cliente', required: true },
    { key: 'contact_name', label: 'Nome do Contato', required: false },
    { key: 'value', label: 'Valor da Oportunidade', required: false },
    { key: 'phone', label: 'Telefone Primário', required: false },
    { key: 'phone_secondary', label: 'Telefone Secundário', required: false },
    { key: 'email', label: 'E-mail', required: false },
    { key: 'cnpj', label: 'CNPJ', required: false },
    { key: 'tag', label: 'Parceria / Tag', required: false },
    { key: 'assignee', label: 'Responsável (Nome ou Email)', required: false },
];

export default function ImportDealsModal({ isOpen, onClose, onImport }: ImportDealsModalProps) {
    const [step, setStep] = useState<'UPLOAD' | 'MAPPING' | 'PREVIEW'>('UPLOAD');
    const [file, setFile] = useState<File | null>(null);
    const [rawData, setRawData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setStep('UPLOAD');
            setFile(null);
            setRawData([]);
            setHeaders([]);
            setMapping({});
            fetchProfiles();
        }
    }, [isOpen]);

    const fetchProfiles = async () => {
        const { data } = await supabase.from('profiles').select('*');
        if (data) setProfiles(data);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            parseExcel(selectedFile);
        }
    };

    const parseExcel = async (file: File) => {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Read as array of arrays first to get headers

            if (parsedData.length > 0) {
                const fileHeaders = parsedData[0] as string[];
                const rows = XLSX.utils.sheet_to_json(sheet); // Parse again for easy object access
                setHeaders(fileHeaders);
                setRawData(rows);

                // Smart Mapping
                const initialMapping: Record<string, string> = {};
                SYSTEM_FIELDS.forEach(field => {
                    // Try exact match then fuzzy match
                    const match = fileHeaders.find(h =>
                        h.toLowerCase().trim() === field.label.toLowerCase().trim() ||
                        h.toLowerCase().includes(field.key.toLowerCase()) ||
                        h.toLowerCase().includes(field.label.toLowerCase().split(' ')[0].toLowerCase())
                    );
                    if (match) {
                        initialMapping[field.key] = match;
                    }
                });
                setMapping(initialMapping);
                setStep('MAPPING');
            }
            setLoading(false);
        };
        reader.readAsBinaryString(file);
    };

    const handleMappingChange = (systemKey: string, fileHeader: string) => {
        setMapping(prev => ({ ...prev, [systemKey]: fileHeader }));
    };

    const getAssigneeId = (value: any): string | null => {
        if (!value) return null;
        const stringValue = String(value).toLowerCase().trim();

        // Try by email
        const emailMatch = profiles.find(p => p.email?.toLowerCase() === stringValue);
        if (emailMatch) return emailMatch.id;

        // Try by name
        const nameMatch = profiles.find(p => p.name?.toLowerCase().includes(stringValue));
        if (nameMatch) return nameMatch.id;

        return null;
    };

    const handleImport = async () => {
        setLoading(true);
        const dealsToImport = rawData.map(row => {
            const deal: any = {};

            // Map basic fields
            if (mapping.client_name) deal.client_name = row[mapping.client_name] || 'Sem Nome';
            if (mapping.contact_name) deal.contact_name = row[mapping.contact_name];
            if (mapping.value) {
                // Remove currency symbols and dots if european format, adapt as needed
                let val = row[mapping.value];
                if (typeof val === 'string') {
                    val = parseFloat(val.replace(/[^\d.,-]/g, '').replace(',', '.'));
                }
                deal.value = val || 0;
            }
            if (mapping.phone) deal.phone = row[mapping.phone];
            if (mapping.phone_secondary) deal.phone_secondary = row[mapping.phone_secondary];
            if (mapping.email) deal.email = row[mapping.email];
            if (mapping.cnpj) deal.cnpj = row[mapping.cnpj];
            if (mapping.tag) deal.tag = row[mapping.tag]; // Use as Partnership directly

            // Handle Assignee
            if (mapping.assignee) {
                deal.assignee_id = getAssigneeId(row[mapping.assignee]);
            }

            return deal;
        }).filter(d => d.client_name); // Filter out empty rows

        try {
            await onImport(dealsToImport);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao importar dados.');
        } finally {
            setLoading(false);
        }
    };

    // --- Renders ---

    const renderUploadStep = () => (
        <div className="space-y-4">
            <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-10 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl text-blue-500">upload_file</span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Clique para enviar arquivo</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Suporta Excel (.xlsx) ou CSV</p>
            </div>
            {loading && <p className="text-center text-sm text-gray-500">Lendo arquivo...</p>}
        </div>
    );

    const renderMappingStep = () => (
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                    O sistema encontrou <strong>{rawData.length}</strong> linhas. Relacione as colunas do seu arquivo com os campos do sistema.
                </p>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-medium sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3">Campo do Sistema</th>
                            <th className="px-4 py-3">Coluna no Arquivo</th>
                            <th className="px-4 py-3">Exemplo (Linha 1)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                        {SYSTEM_FIELDS.map(field => {
                            const selectedHeader = mapping[field.key];
                            const exampleValue = selectedHeader && rawData.length > 0 ? rawData[0][selectedHeader] : '-';

                            return (
                                <tr key={field.key} className="bg-white dark:bg-surface-dark">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                        {field.label}
                                        {field.required && <span className="text-red-500">*</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={selectedHeader || ''}
                                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                            className="w-full h-9 px-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-black/20 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                        >
                                            <option value="">Ignorar coluna</option>
                                            {headers.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                        {String(exampleValue)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-white/20 dark:border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">upload_file</span>
                        Importar Oportunidades
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-6 flex flex-col">
                    {step === 'UPLOAD' && renderUploadStep()}
                    {step === 'MAPPING' && renderMappingStep()}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3 bg-gray-50/50 dark:bg-black/20 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    {step === 'MAPPING' && (
                        <button
                            onClick={handleImport}
                            disabled={loading || !mapping.client_name}
                            className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">check</span>
                                    Concluir Importação
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
