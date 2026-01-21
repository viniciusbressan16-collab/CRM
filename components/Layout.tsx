import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { View } from '../App';

interface LayoutProps {
    children: React.ReactNode;
    activePage: View;
    onNavigate: (view: View, id?: string) => void;
}

export default function Layout({ children, activePage, onNavigate }: LayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen w-full overflow-hidden font-display relative bg-background">

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar with Mobile State */}
            <div className={`
                fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:relative lg:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <Sidebar
                    activePage={activePage}
                    onNavigate={(view, id) => {
                        onNavigate(view, id);
                        setIsMobileMenuOpen(false); // Close on navigate
                    }}
                />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative lg:m-4 lg:ml-0 m-0 rounded-none lg:rounded-2xl glass-panel border-x-0 border-y-0 lg:border border-glass-border h-full lg:h-[calc(100vh-2rem)] transition-all relative shadow-2xl shadow-black/5">

                {/* Harmony Gradient - Top Blend */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 pointer-events-none z-0"></div>

                {/* Ambient Blobs - Living Background */}
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-20 animate-float pointer-events-none mix-blend-screen"></div>
                <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] opacity-20 animate-float pointer-events-none mix-blend-screen" style={{ animationDelay: '-5s' }}></div>

                {/* Mobile Header Trigger - Glass Premium */}
                <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-glass-border/30 glass-panel-clear sticky top-0 z-30 transition-all duration-300">
                    <div className="flex items-center gap-3">
                        <div className="size-9 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20 backdrop-blur-sm shadow-inner">
                            <span className="material-symbols-outlined text-primary text-base">account_balance</span>
                        </div>
                        <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">CRM K&O</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -mr-2 text-gray-500 hover:text-primary active:scale-95 transition-all glass-button rounded-xl"
                    >
                        <span className="material-symbols-outlined text-2xl">menu</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar p-2 lg:p-0 relative z-10 animate-fade-in-up">
                    {children}
                </div>
            </main>
        </div>
    );
}
