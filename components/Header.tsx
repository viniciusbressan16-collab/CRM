import React from 'react';
import { View } from '../App';

interface HeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    startContent?: React.ReactNode;
    className?: string;
    onNavigate?: (view: View, id?: string) => void;
}

export default function Header({ title, description, children, startContent, className = '', onNavigate }: HeaderProps) {
    return (
        <header className={`flex flex-col gap-6 md:flex-row md:items-center justify-between px-8 py-8 shrink-0 ${className}`}>
            <div className="flex items-center gap-4">
                {startContent}
                <div>
                    <h1 className="text-3xl lg:text-4xl font-light tracking-tight text-slate-900 dark:text-white">{title}</h1>
                    {description && (
                        <p className="text-base text-gray-500 dark:text-gray-400 mt-1 font-medium">{description}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {children}

            </div>
        </header>
    );
}
