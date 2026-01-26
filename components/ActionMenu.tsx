import React, { useState, useRef, useEffect } from 'react';

interface ActionMenuProps {
    onEdit?: () => void;
    onDelete: () => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5"
            >
                <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onEdit(); }}
                            className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[14px]">edit</span> Editar
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDelete(); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[14px]">delete</span> Excluir
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActionMenu;
