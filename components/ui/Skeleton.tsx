import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'rect' | 'circle' | 'text';
    width?: string | number;
    height?: string | number;
}

export default function Skeleton({ className = '', variant = 'rect', width, height }: SkeletonProps) {
    const baseClasses = "animate-pulse bg-gradient-to-r from-gray-200/20 via-gray-200/40 to-gray-200/20 dark:from-white/5 dark:via-white/10 dark:to-white/5 backdrop-blur-sm relative overflow-hidden";

    // Optional: Add a subtle shimmer overlay
    const shimmerOverlay = "after:absolute after:inset-0 after:translate-x-[-100%] after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent";

    const variantClasses = {
        rect: "rounded-xl",
        circle: "rounded-full",
        text: "rounded h-4"
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${shimmerOverlay} ${className}`}
            style={{ width, height }}
        />
    );
}
