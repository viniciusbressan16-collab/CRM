import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rectangular' | 'circular';
    width?: string | number;
    height?: string | number;
}

export default function Skeleton({
    className = '',
    variant = 'text',
    width,
    height
}: SkeletonProps) {

    const baseClasses = "relative overflow-hidden bg-black/5 dark:bg-white/5 rounded";
    const shimmerClasses = "after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-primary/20 after:to-transparent after:-translate-x-full after:animate-[shimmer_1.5s_infinite]";

    const variantClasses = {
        text: "h-4 w-full rounded",
        rectangular: "h-full w-full rounded-lg",
        circular: "rounded-full"
    };

    const style = {
        width,
        height
    };

    return (
        <div
            className={`${baseClasses} ${shimmerClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
}
