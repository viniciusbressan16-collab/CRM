import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AddProjectDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projectId: string;
}

export default function AddProjectDocumentModal({ isOpen, onClose, onSuccess, projectId }: AddProjectDocumentModalProps) {
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const sanitizeFileName = (name: string) => {
        return name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9._-]/g, "_");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        try {
            const fileName = `${projectId}/${Date.now()}_${sanitizeFileName(file.name)}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(fileName);

            // Insert into project_documents
            const { error: dbError } = await supabase.from('project_documents').insert({
                project_id: projectId,
                name: file.name,
                url: publicUrl,
                size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                type: file.type
            });

            if (dbError) throw dbError;

            // Log history
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('project_history').insert({
                    project_id: projectId,
                    user_id: user.id,
                    action_type: 'UPLOAD',
                    description: `enviou o documento "${file.name}".`
                });
            }

            onSuccess();
            onClose();
            setFile(null);
        } catch (error: any) {
            console.error('Error uploading document:', error);
            alert(`Erro ao fazer upload: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Anexar Documento</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                        />
                        <div className="flex flex-col items-center gap-2 pointer-events-none">
                            <span className="material-symbols-outlined text-4xl text-gray-400">cloud_upload</span>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {file ? file.name : "Clique ou arraste para fazer upload"}
                            </p>
                            <p className="text-xs text-gray-500">PDF, DOC, XLS, Imagens (max 10MB)</p>
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        disabled={loading || !file}
                    >
                        {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
}
