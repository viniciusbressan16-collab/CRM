import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            removeToast(id);
        }, 4000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
    const error = useCallback((message: string) => addToast(message, 'error'), [addToast]);

    return (
        <ToastContext.Provider value={{ toast: addToast, success, error }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border transition-all duration-500 animate-fade-in-up
              ${toast.type === 'success'
                                ? 'bg-slate-900/90 border-[#d4af37]/50 text-white shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                                : toast.type === 'error'
                                    ? 'bg-red-950/90 border-red-500/30 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                                    : 'bg-slate-900/90 border-white/10 text-white'}
            `}
                    >
                        {toast.type === 'success' && <span className="material-symbols-outlined text-[#d4af37]">check_circle</span>}
                        {toast.type === 'error' && <span className="material-symbols-outlined text-red-500">error</span>}
                        {toast.type === 'info' && <span className="material-symbols-outlined text-blue-400">info</span>}

                        <p className="text-sm font-medium tracking-wide">{toast.message}</p>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-4 text-white/50 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
