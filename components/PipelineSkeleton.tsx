import React from 'react';
import Skeleton from './ui/Skeleton';

export default function PipelineSkeleton() {
    return (
        <div className="flex h-full gap-6 min-w-max p-4 md:px-6">
            {[1, 2, 3, 4].map((colIndex) => (
                <div key={colIndex} className="flex-shrink-0 flex flex-col w-80 min-w-[320px] h-full bg-gray-50/50 dark:bg-black/20 rounded-xl border border-transparent p-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-3">
                            <Skeleton variant="circle" width={8} height={8} />
                            <Skeleton variant="text" width={120} />
                            <Skeleton variant="rect" width={24} height={20} className="rounded" />
                        </div>
                        <Skeleton variant="circle" width={24} height={24} />
                    </div>

                    {/* Stats Card */}
                    <Skeleton variant="rect" height={48} className="w-full mb-3" />

                    {/* Cards */}
                    <div className="flex-1 flex flex-col gap-3">
                        {[1, 2, 3].map((cardIndex) => (
                            <div key={cardIndex} className="h-40 glass-card p-5 rounded-xl border-white/5 relative bg-white/40 dark:bg-white/5">
                                <div className="flex justify-between mb-3">
                                    <Skeleton variant="rect" width={60} height={20} />
                                    <Skeleton variant="circle" width={28} height={28} />
                                </div>
                                <Skeleton variant="text" width="80%" className="mb-2" />
                                <Skeleton variant="text" width="50%" className="mb-4" />

                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                    <Skeleton variant="circle" width={28} height={28} />
                                    <Skeleton variant="text" width={40} />
                                </div>
                            </div>
                        ))}
                        <Skeleton variant="rect" height={40} className="w-full mt-2" />
                    </div>
                </div>
            ))}
        </div>
    );
}
