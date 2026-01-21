import React, { useState, useRef, useEffect } from 'react';

export default function KanbanCard({ tag, tagColor, title, value, avatar, avatarColor, time, highlight, progress, status, alert, onClick, onEdit, onDelete }: any) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onEdit) onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      if (onDelete) onDelete();
    }
  };

  return (
    <div onClick={onClick} className={`relative glass-card p-5 rounded-xl transition-all cursor-pointer group hover:-translate-y-1 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-[0_20px_40px_-10px_rgba(212,175,55,0.1)] ${highlight ? 'border-l-2 border-l-amber-500' : ''}`}>
      {/* Inner Border (Crystal Edge) */}
      <div className="absolute inset-[1px] rounded-[10px] border border-white/10 pointer-events-none z-10"></div>

      {/* Hover Material Bloom - Golden Tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl pointer-events-none mix-blend-overlay"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          {/* Ghost Tag Style - Refined */}
          <span className={`bg-${tagColor}-500/10 border border-${tagColor}-500/20 text-${tagColor}-600 dark:text-${tagColor}-400 text-[9px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest backdrop-blur-sm shadow-sm`}>
            {tag}
          </span>
          <div className="relative" ref={menuRef}>
            <button onClick={handleMenuClick} className="text-text-secondary-light dark:text-gray-500 hover:text-primary dark:hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary/10 opacity-0 group-hover:opacity-100">
              <span className="material-symbols-outlined text-[20px]">more_horiz</span>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-xl shadow-xl z-10 py-1.5 overflow-hidden">
                <button onClick={handleEdit} className="w-full text-left px-4 py-2.5 text-xs font-medium text-text-main-light dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2.5 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">edit</span> Editar
                </button>
                <button onClick={handleDelete} className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2.5 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">delete</span> Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        <h4 className="font-outfit font-semibold text-[15px] text-text-main-light dark:text-white mb-1.5 leading-snug tracking-tight group-hover:text-primary transition-colors">{title}</h4>

        {/* Next Task Display with Completion Action */}
        <div className="mb-4">
          {(value && typeof value === 'object' && value.title) ? (
            <div className="flex items-start gap-2 group/task">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (value.onComplete) value.onComplete(value.id);
                }}
                className="size-5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-primary hover:border-primary transition-all text-transparent hover:text-white group-hover/task:border-primary/50"
                title="Concluir tarefa"
              >
                <span className="material-symbols-outlined text-[14px]">check</span>
              </button>
              <p className="text-sm font-medium text-text-secondary-light dark:text-gray-400 flex-1 leading-snug break-words">
                Próx: <span className="text-text-main-light dark:text-gray-200">{value.title}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium text-text-secondary-light dark:text-gray-400">{value}</p>
          )}
        </div>

        {status && (
          <div className="bg-transparent border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-bold px-2 py-0.5 rounded mb-3 inline-block">
            {status}
          </div>
        )}

        {progress !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-medium text-text-secondary-light dark:text-gray-400 mb-1.5">
              <span>Progresso</span>
              <span>{progress}%</span>
            </div>
            {/* Sleek Progress Bar - With Glow Tip */}
            <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
              <div className="bg-gradient-to-r from-primary/80 to-primary h-full rounded-full shadow-[0_0_12px_1px_rgba(212,175,55,0.4)] relative" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 blur-[2px]"></div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-white/5">
          <div className="flex -space-x-2.5 hover:space-x-1 transition-all">
            {avatar ? (
              (avatar.startsWith('http') || avatar.startsWith('/')) ? (
                <div className="size-7 rounded-full bg-cover border-2 border-white dark:border-zinc-800 shadow-sm transition-transform hover:z-10 hover:scale-110 ring-2 ring-transparent group-hover:ring-primary/20" style={{ backgroundImage: `url('${avatar}')` }}></div>
              ) : (
                <div className={`size-7 rounded-full ${avatarColor || 'bg-zinc-700'} text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-zinc-800 shadow-sm transition-transform hover:z-10 hover:scale-110 ring-2 ring-transparent group-hover:ring-primary/20`}>{avatar}</div>
              )
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-text-secondary-light dark:text-gray-500">
            {alert ? (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-100 dark:border-red-900/20">
                <span className="material-symbols-outlined text-[14px] text-red-500">warning</span>
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400">{alert}</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="hover:text-primary hover:bg-primary/10 p-1 rounded transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                  title="Edição Rápida"
                >
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                </button>
                <span className={`text-[11px] font-medium flex items-center gap-1.5 ${highlight ? 'text-amber-600 dark:text-amber-500' : ''}`}>
                  <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                  {time}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
