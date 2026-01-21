import React from 'react';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export default function EmptyState({ title, description, icon = 'inbox', action, className = '' }: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center animate-fade-in-up group ${className}`}>

            {/* Icon Container with Premium Glow */}
            <div className="relative mb-6">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-[#d4af37] opacity-20 blur-[30px] rounded-full scale-150 group-hover:scale-175 transition-transform duration-700"></div>

                {/* Glass Container */}
                <div className="relative size-20 rounded-2xl bg-gradient-to-br from-[#d4af37]/20 to-black/40 border border-[#d4af37]/40 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.15)] group-hover:shadow-[0_0_50px_rgba(212,175,55,0.3)] transition-all duration-500 backdrop-blur-md">
                    <span className="material-symbols-outlined text-4xl text-[#d4af37] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                        {icon}
                    </span>

                    {/* Shinier Border Overlay */}
                    <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none"></div>
                </div>
            </div>

            <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#fae8b0] to-[#d4af37] mb-2 tracking-wide">
                {title}
            </h3>

            <p className="text-sm text-gray-400 dark:text-gray-400/80 max-w-[280px] leading-relaxed mb-6 font-medium">
                {description}
            </p>

            {action && (
                <button
                    onClick={action.onClick}
                    className="glass-button px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 group/btn relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-[#d4af37]/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                    <span className="material-symbols-outlined text-[20px] text-[#d4af37] group-hover/btn:text-black transition-colors">{icon === 'add' ? 'add_circle' : 'bolt'}</span>
                    <span className="relative z-10">{action.label}</span>
                </button>
            )}
        </div>
    );
}
