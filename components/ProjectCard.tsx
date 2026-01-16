import React from 'react';

interface ProjectCardProps {
    id: string;
    category: string;
    categoryColor?: string;
    title: string;
    desc: string;
    progress: number;
    status: string;
    dueDate?: string;
    members: any[];
    onEdit?: () => void;
    onDelete?: () => void;
}

export default function ProjectCard({
    id, category, categoryColor = 'blue', title, desc, progress, status, dueDate, members = [], onEdit, onDelete
}: ProjectCardProps) {

    // Status color mapping
    const getStatusColor = (s: string) => {
        switch (s) {
            case 'planning': return 'text-white/50 bg-white/5 border border-white/5';
            case 'in_progress': return 'text-primary bg-primary/10 border border-primary/20 shadow-[0_0_10px_rgba(212,175,55,0.1)]';
            case 'completed': return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
            case 'on_hold': return 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
            case 'delayed': return 'text-red-400 bg-red-500/10 border border-red-500/20';
            default: return 'text-white/30 bg-white/5';
        }
    };

    const getStatusLabel = (s: string) => {
        switch (s) {
            case 'planning': return 'Planejamento';
            case 'in_progress': return 'Em Andamento';
            case 'completed': return 'Concluído';
            case 'on_hold': return 'Em Pausa';
            case 'delayed': return 'Atrasado';
            case 'not_started': return 'Não Iniciado';
            default: return s;
        }
    };

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'Marketing': return 'purple';
            case 'Tecnologia': return 'cyan';
            case 'Comercial': return 'blue';
            case 'RH': return 'rose';
            case 'Financeiro': return 'emerald';
            default: return 'slate';
        }
    };

    const computedColor = categoryColor === 'blue' ? getCategoryColor(category) : categoryColor;

    return (
        <div className="group relative flex flex-col gap-4 glass-card rounded-xl border border-white/5 p-5 shadow-xl transition-all hover:border-primary/30 hover:shadow-2xl hover:-translate-y-1">

            {/* Specular Highlight */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />

            <div className="flex items-start justify-between relative z-10">
                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-white/10 bg-black/40 text-white/70 shadow-inner`}>
                    {category}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <button onClick={onEdit} className="p-2 text-white/30 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-[20px]">edit_square</span>
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="relative z-10">
                <h3 className="mb-2 text-lg font-bold text-white group-hover:text-primary transition-colors tracking-tight">{title}</h3>
                <p className="line-clamp-2 text-sm text-white/50 min-h-[40px] leading-relaxed">{desc}</p>
            </div>

            <div className="flex flex-col gap-2 relative z-10">
                <div className="flex justify-between text-xs font-medium">
                    <span className="text-white/40 uppercase tracking-wider text-[10px]">Progresso</span>
                    <span className="text-primary font-bold">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/5">
                    <div className={`h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700 ease-out shadow-[0_0_10px_rgba(212,175,55,0.3)]`} style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4 relative z-10">
                <div className="flex -space-x-3 overflow-hidden pl-1">
                    {members.length > 0 ? members.map((m: any, i: number) => (
                        <div
                            key={i}
                            className="h-8 w-8 rounded-full border-2 border-[#121212] bg-neutral-800 bg-cover bg-center shrink-0 shadow-lg"
                            title={m.profile?.name}
                            style={{ backgroundImage: `url('${m.profile?.avatar_url || ''}')` }}
                        ></div>
                    )) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#121212] bg-white/5 text-xs font-medium text-white/30">?</div>
                    )}
                    {members.length > 4 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#121212] bg-[#1a1a1a] text-[10px] font-bold text-white/70">
                            +{members.length - 4}
                        </div>
                    )}
                </div>
                <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(status)}`}>
                    <span className="material-symbols-outlined text-[14px]">
                        {status === 'delayed' ? 'priority_high' : status === 'in_progress' ? 'schedule' : status === 'completed' ? 'check_circle' : 'architecture'}
                    </span>
                    <span>{getStatusLabel(status)}</span>
                </div>
            </div>
        </div>
    )
}
