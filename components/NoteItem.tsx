import React, { useState } from 'react';
import ActionMenu from './ActionMenu';

interface Note {
    id: string;
    content: string;
    created_at: string | null;
}

interface NoteItemProps {
    note: Note;
    onUpdate: (id: string, content: string) => void;
    onDelete: (id: string) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ note, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(note.content);

    const handleSave = async () => {
        await onUpdate(note.id, editContent);
        setIsEditing(false);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (isEditing) {
        return (
            <div className="bg-white/5 px-3 py-2 rounded border border-primary/30 animate-in fade-in zoom-in-95 duration-200">
                <textarea
                    autoFocus
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 rounded p-2 text-xs text-white mb-2 resize-none focus:border-primary/50 outline-none"
                    rows={3}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="text-xs text-white/50 hover:text-white transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="text-xs bg-primary text-white px-3 py-1 rounded font-bold shadow-[0_0_10px_rgba(212,175,55,0.4)] hover:bg-primary-hover transition-colors">Salvar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/5 px-4 py-3 rounded-lg text-xs text-white/70 border border-transparent hover:border-white/10 flex justify-between group transition-all hover:bg-white/10">
            <div className="flex-1 mr-2">
                <p className="font-medium text-white mb-1 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                <p className="text-[10px] text-white/30 font-mono mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">schedule</span>
                    {formatDate(note.created_at)}
                </p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionMenu onEdit={() => setIsEditing(true)} onDelete={() => onDelete(note.id)} />
            </div>
        </div>
    );
};

export default NoteItem;
