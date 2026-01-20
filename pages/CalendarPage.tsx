import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { View } from '../App';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import AddAppointmentModal from '../components/AddAppointmentModal';
import AddProjectTaskModal from '../components/AddProjectTaskModal';

import Header from '../components/Header';

interface CalendarPageProps {
    onNavigate: (view: View, id?: string) => void;
    activePage: View;
}

type CalendarView = 'month' | 'week';

export default function CalendarPage({ onNavigate, activePage }: CalendarPageProps) {
    const { user, profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState<CalendarView>('week');
    // State with Persistence
    const [taskViewMode, setTaskViewMode] = useState<'grid' | 'list'>(() =>
        (localStorage.getItem('calendar_taskViewMode') as 'grid' | 'list') || 'grid'
    );

    // Filters with Persistence
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done'>(() =>
        (localStorage.getItem('calendar_filterStatus') as any) || 'pending'
    );
    const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>(() =>
        (localStorage.getItem('calendar_filterPriority') as any) || 'all'
    );
    const [filterDate, setFilterDate] = useState<'all' | 'today' | 'overdue' | 'week'>(() =>
        (localStorage.getItem('calendar_filterDate') as any) || 'all'
    );
    const [filterAssignee, setFilterAssignee] = useState<string>(() =>
        localStorage.getItem('calendar_filterAssignee') || 'all'
    );

    const [appointments, setAppointments] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Persistence Effects
    useEffect(() => { localStorage.setItem('calendar_taskViewMode', taskViewMode); }, [taskViewMode]);
    useEffect(() => { localStorage.setItem('calendar_filterStatus', filterStatus); }, [filterStatus]);
    useEffect(() => { localStorage.setItem('calendar_filterPriority', filterPriority); }, [filterPriority]);
    useEffect(() => { localStorage.setItem('calendar_filterDate', filterDate); }, [filterDate]);
    useEffect(() => { localStorage.setItem('calendar_filterAssignee', filterAssignee); }, [filterAssignee]);

    // Appointment Modal State
    const [isApptModalOpen, setIsApptModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    const handleOpenTaskModal = (task?: any) => {
        setSelectedTask(task || null);
        setIsTaskModalOpen(true);
    };

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, currentDate, currentView]); // Refresh on view change is fine, but we might want to decouple calendar data from validation of task data if it gets heavy

    // Filter Tasks Logic
    const getFilteredTasks = () => {
        return tasks.filter(task => {
            // Status Filter
            if (filterStatus === 'pending' && task.status === 'done') return false;
            if (filterStatus === 'done' && task.status !== 'done') return false;

            // Priority Filter
            if (filterPriority !== 'all' && task.priority !== filterPriority) return false;

            // Date Filter
            const taskDate = task.due_date ? new Date(task.due_date) : null;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (filterDate === 'today') {
                if (!taskDate) return false;
                const d = new Date(taskDate);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            }
            if (filterDate === 'overdue') {
                if (!taskDate) return false;
                return taskDate < today && task.status !== 'done';
            }
            if (filterDate === 'week') {
                if (!taskDate) return false;
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                return taskDate >= today && taskDate <= nextWeek;
            }

            if (filterAssignee !== 'all') {
                if (!task.assignee_ids || !task.assignee_ids.includes(filterAssignee)) return false;
            }

            return true;
        });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Determine range based on view
            let startDate = new Date(currentDate);
            let endDate = new Date(currentDate);

            if (currentView === 'month') {
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            } else if (currentView === 'week') {
                const day = currentDate.getDay(); // 0 (Sun)
                const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
                startDate = new Date(currentDate.setDate(diff));
                endDate = new Date(currentDate.setDate(diff + 6));
                // Set times
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            }

            // Fetch Appointments
            const { data: profilesData } = await supabase.from('profiles').select('*');
            if (profilesData) setProfiles(profilesData);

            const { data: appts, error: apptError } = await supabase
                .from('appointments')
                .select('*')
                .eq('user_id', user!.id)
                .gte('start_time', startDate.toISOString())
                .lte('start_time', endDate.toISOString());

            if (apptError) throw apptError;
            setAppointments(appts || []);

            // Fetch Project Tasks
            let projectTasksQuery = supabase
                .from('project_tasks')
                .select('*, project:internal_projects(title, category)')
                .or(`status.eq.todo,status.eq.in_progress,status.eq.done`);

            // Only filter by assignee if NOT a manager
            if (profile?.role !== 'manager') {
                projectTasksQuery = projectTasksQuery.contains('assignee_ids', [user!.id]);
            }

            const { data: projectTasks, error: taskError } = await projectTasksQuery;

            if (taskError) throw taskError;

            // Fetch Deal Tasks
            let dealTasksQuery = supabase
                .from('deal_tasks')
                .select('*, deal:deals(client_name)');

            if (profile?.role !== 'manager') {
                dealTasksQuery = dealTasksQuery.contains('assignee_ids', [user!.id]);
            }

            const { data: dealTasks, error: dealTaskError } = await dealTasksQuery;

            if (dealTaskError) throw dealTaskError;

            // Normalize and Merge
            const normalizedProjectTasks = (projectTasks || []).map(t => ({
                ...t,
                source: 'project',
                source_title: t.project?.title,
                category: t.project?.category
            }));

            const normalizedDealTasks = (dealTasks || []).map(t => ({
                id: t.id,
                title: t.title,
                description: `Tarefa da oportunidade: ${t.deal?.client_name}`,
                due_date: t.due_date,
                status: t.is_completed ? 'done' : 'todo',
                priority: t.is_urgent ? 'high' : 'medium',
                project_id: null,
                assignee_ids: t.assignee_ids,
                source: 'deal',
                source_title: t.deal?.client_name,
                category: 'Vendas'
            }));

            const allTasks = [...normalizedProjectTasks, ...normalizedDealTasks];
            // Sort by due date or status? Let's keep input order or simple sort
            allTasks.sort((a, b) => {
                if (a.status === 'done' && b.status !== 'done') return 1;
                if (a.status !== 'done' && b.status === 'done') return -1;
                return new Date(a.due_date || '9999-12-31').getTime() - new Date(b.due_date || '9999-12-31').getTime();
            });

            setTasks(allTasks);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (currentView === 'month') {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else {
            // week
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => setCurrentDate(new Date());

    const handleOpenApptModal = (appt?: any) => {
        setSelectedAppointment(appt || null);
        setIsApptModalOpen(true);
    };

    // Helper for Week View
    const getWeekDays = () => {
        const curr = new Date(currentDate);
        const week = [];
        // align to Monday
        const day = curr.getDay();
        const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(curr.setDate(diff));

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            week.push(d);
        }
        return week;
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    // Task Logic
    const filteredTasksBase = getFilteredTasks();
    const sortedTasks = [...filteredTasksBase].sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        return new Date(a.due_date || '9999-12-31').getTime() - new Date(b.due_date || '9999-12-31').getTime();
    });

    // Pagination or limit could apply here, but for now we list all for list view, limit 8 for grid
    const displayedTasks = taskViewMode === 'grid' ? sortedTasks.slice(0, 8) : sortedTasks;

    // Stats based on ALL tasks (unfiltered) or filtered? Usually stats reflect total pending.
    // Let's keep stats based on what's fetched (user's total tasks)
    const pendingTasksCount = tasks.filter(t => t.status !== 'done').length;
    const completedCount = tasks.filter(t => t.status === 'done').length;
    const totalCount = tasks.length;
    const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const toggleTask = async (task: any) => {
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t); // Optimistic

        try {
            if (task.source === 'deal') {
                await supabase.from('deal_tasks').update({ is_completed: newStatus === 'done' }).eq('id', task.id);
            } else {
                await supabase.from('project_tasks').update({ status: newStatus }).eq('id', task.id);
            }
            // Refresh logic handled by state update below
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        } catch (e) {
            console.error(e);
            alert('Erro ao atualizar tarefa');
        }
    };

    // Live Time Tracking
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // ... existing helpers ...

    return (
        <Layout activePage={activePage} onNavigate={onNavigate}>
            <div className="flex flex-col h-full bg-transparent overflow-hidden">
                <Header
                    title="Calendário e Tarefas"
                    description="Gerencie seus compromissos e pendências."
                    onNavigate={onNavigate}
                >
                    <div className="flex items-center gap-3">
                        {/* Navigation & Date Label */}
                        <div className="bg-black/20 border border-white/10 rounded-lg p-1 flex items-center gap-1">
                            <button onClick={() => handleNavigate('prev')} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <span className="text-xs font-bold text-white/70 uppercase px-2 min-w-[100px] text-center bg-transparent">
                                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => handleNavigate('next')} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                        </div>

                        <button onClick={goToToday} className="px-3 py-2 text-xs font-bold text-gray-400 hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 rounded-lg transition-all">
                            Hoje
                        </button>

                        <div className="w-px h-8 bg-white/10 mx-1"></div>

                        {/* View Toggle */}
                        <div className="bg-black/20 border border-white/10 rounded-lg p-1 flex items-center mr-2">
                            <button
                                onClick={() => setCurrentView('week')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${currentView === 'week' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                Semana
                            </button>
                            <button
                                onClick={() => setCurrentView('month')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${currentView === 'month' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                Mês
                            </button>
                        </div>

                        <button
                            onClick={() => handleOpenApptModal()}
                            className="glass-button px-4 py-2 text-primary font-bold rounded-lg flex items-center gap-2 hover:text-black hover:bg-primary transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            Novo Agendamento
                        </button>
                    </div>
                </Header>

                {/* Main Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
                    <div className="max-w-[1600px] mx-auto space-y-8">

                        {/* Calendar View Container */}
                        <div className="glass-panel rounded-2xl overflow-hidden min-h-[600px]">
                            {currentView === 'week' && (
                                <div className="flex h-full flex-col overflow-x-auto custom-scrollbar">
                                    <div className="min-w-[1000px] flex flex-col h-full">
                                        {/* Week Header */}
                                        <div className="flex border-b border-glass-border">
                                            <div className="w-16 border-r border-glass-border shrink-0 bg-transparent"></div>
                                            {getWeekDays().map(date => (
                                                <div key={date.toISOString()} className={`flex-1 py-3 text-center border-r border-glass-border last:border-r-0 ${isSameDay(date, new Date()) ? 'bg-primary/10' : ''}`}>
                                                    <div className="text-xs font-bold text-gray-500 uppercase">{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</div>
                                                    <div className={`text-xl font-bold mt-1 ${isSameDay(date, new Date()) ? 'text-primary' : 'text-gray-300'}`}>
                                                        {date.getDate().toString().padStart(2, '0')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Week Grid */}
                                        <div className="flex-1 overflow-y-auto relative custom-scrollbar h-[500px]">
                                            <div className="flex min-h-[1080px]">
                                                {/* Time Column (06:00 - 23:00) */}
                                                <div className="w-16 shrink-0 border-r border-glass-border bg-black/20 z-10 sticky left-0 backdrop-blur-sm">
                                                    {Array.from({ length: 18 }).map((_, i) => {
                                                        const hour = i + 6; // Start at 06:00
                                                        return (
                                                            <div key={hour} className="h-[60px] text-xs text-gray-500 text-center pt-2 border-b border-white/5 relative">
                                                                <span className="relative -top-2.5">{hour.toString().padStart(2, '0')}:00</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Days Columns */}
                                                {getWeekDays().map(date => {
                                                    const isToday = isSameDay(date, now);
                                                    const currentHour = now.getHours();
                                                    const currentMin = now.getMinutes();
                                                    const startHourGrid = 6;
                                                    const endHourGrid = 23;
                                                    // Grid displays 06:00 to 23:59 (18 slots of 60px)

                                                    const shouldShowLine = isToday && currentHour >= startHourGrid && currentHour <= endHourGrid;
                                                    const lineTop = ((currentHour - startHourGrid) * 60) + currentMin;

                                                    return (
                                                        <div key={date.toISOString()} className="flex-1 border-r border-glass-border last:border-r-0 relative group">
                                                            {/* Guidelines */}
                                                            {Array.from({ length: 18 }).map((_, i) => (
                                                                <div key={i} className="h-[60px] border-b border-white/5"></div>
                                                            ))}

                                                            {/* Current Time Line */}
                                                            {shouldShowLine && (
                                                                <div
                                                                    className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                                                                    style={{ top: `${lineTop}px` }}
                                                                >
                                                                    <div className="h-3 w-3 rounded-full bg-red-500 -ml-1.5 shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-black/20"></div>
                                                                    <div className="h-[2px] flex-1 bg-gradient-to-r from-red-500 via-red-500/50 to-transparent shadow-[0_0_4px_rgba(239,68,68,0.3)]"></div>
                                                                </div>
                                                            )}

                                                            {/* Events */}
                                                            {appointments
                                                                .filter(a => isSameDay(new Date(a.start_time), date))
                                                                .map(appt => {
                                                                    const start = new Date(appt.start_time);
                                                                    const end = new Date(appt.end_time);
                                                                    const startHour = start.getHours();
                                                                    const startMin = start.getMinutes();
                                                                    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

                                                                    const topOffset = ((startHour - startHourGrid) * 60) + startMin;
                                                                    const height = Math.max(durationHours * 60, 30);

                                                                    if (startHour < startHourGrid) return null;

                                                                    // Styles
                                                                    const styles = [
                                                                        { bg: 'bg-primary/20', border: 'border-primary', text: 'text-primary' },
                                                                        { bg: 'bg-white/10', border: 'border-white/30', text: 'text-gray-200' },
                                                                        { bg: 'bg-amber-900/40', border: 'border-amber-600', text: 'text-amber-500' },
                                                                    ];
                                                                    const style = styles[appt.title.length % 3];

                                                                    return (
                                                                        <div
                                                                            key={appt.id}
                                                                            onClick={(e) => { e.stopPropagation(); handleOpenApptModal(appt); }}
                                                                            className={`absolute left-1 right-1 rounded-lg border-l-2 p-2 text-xs backdrop-blur-sm cursor-pointer hover:brightness-110 transition-all ${style.bg} ${style.border}`}
                                                                            style={{ top: `${topOffset}px`, height: `${height}px` }}
                                                                            title={`${appt.title}\n${appt.description || ''}`}
                                                                        >
                                                                            <div className={`font-bold opacity-80 mb-0.5 ${style.text}`}>
                                                                                {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                            </div>
                                                                            <div className={`font-medium ${style.text} truncate`}>{appt.title}</div>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentView === 'month' && (
                                <div className="p-6">
                                    <div className="grid grid-cols-7 mb-4">
                                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                            <div key={day} className="text-center text-sm font-bold text-gray-500 uppercase tracking-wider py-2">
                                                {day}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-2 lg:gap-4 auto-rows-fr">
                                        {(() => {
                                            const year = currentDate.getFullYear();
                                            const month = currentDate.getMonth();
                                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                                            const firstDayOfWeek = new Date(year, month, 1).getDay();

                                            const days = [];
                                            for (let i = 0; i < firstDayOfWeek; i++) {
                                                days.push(null);
                                            }
                                            for (let i = 1; i <= daysInMonth; i++) {
                                                days.push(new Date(year, month, i));
                                            }

                                            return days.map((date, index) => {
                                                if (!date) return <div key={`empty-${index}`} className="min-h-[100px] bg-white/5 rounded-xl border border-transparent"></div>;

                                                const dayAppts = appointments.filter(a => isSameDay(new Date(a.start_time), date));
                                                const isToday = isSameDay(date, new Date());

                                                return (
                                                    <div key={date.toISOString()} className={`min-h-[100px] p-2 rounded-xl border transition-all relative group flex flex-col ${isToday ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5 hover:border-primary/20'}`}>
                                                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-primary text-black' : 'text-gray-400 group-hover:bg-white/10'}`}>
                                                            {date.getDate()}
                                                        </span>
                                                        <div className="flex-1 space-y-1">
                                                            {dayAppts.map(appt => (
                                                                <div
                                                                    key={appt.id}
                                                                    onClick={(e) => { e.stopPropagation(); handleOpenApptModal(appt); }}
                                                                    className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded truncate cursor-pointer hover:bg-primary/30 transition-colors"
                                                                    title={`${new Date(appt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${appt.title}`}
                                                                >
                                                                    {new Date(appt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {appt.title}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tasks Of The Day Section - Unchanged */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary text-3xl">assignment</span>
                                    <h2 className="text-2xl font-bold text-white">Tarefas</h2>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-gray-500">{completedCount} de {totalCount} concluídas</span>
                                    <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Toolbar: View Mode & Filters */}
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-glass-panel p-3 rounded-xl border border-glass-border">
                                <div className="flex items-center gap-2">
                                    <div className="bg-black/20 p-1 rounded-lg flex items-center border border-white/5">
                                        <button
                                            onClick={() => setTaskViewMode('grid')}
                                            className={`p-1.5 rounded-md transition-all ${taskViewMode === 'grid' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                            title="Visualização em Grade"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">grid_view</span>
                                        </button>
                                        <button
                                            onClick={() => setTaskViewMode('list')}
                                            className={`p-1.5 rounded-md transition-all ${taskViewMode === 'list' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                            title="Visualização em Lista"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">view_list</span>
                                        </button>
                                    </div>

                                    <div className="h-6 w-px bg-white/10 mx-2"></div>

                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                                        {profile?.role === 'manager' && (
                                            <select
                                                value={filterAssignee}
                                                onChange={(e) => setFilterAssignee(e.target.value)}
                                                className="bg-black/20 border border-white/10 text-xs rounded-lg px-2 py-1.5 text-white focus:border-primary outline-none"
                                            >
                                                <option value="all">Todos os Responsáveis</option>
                                                {profiles.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        )}
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value as any)}
                                            className="bg-black/20 border border-white/10 text-xs rounded-lg px-2 py-1.5 text-white focus:border-primary outline-none"
                                        >
                                            <option value="all">Todos os Status</option>
                                            <option value="pending">Pendentes</option>
                                            <option value="done">Concluídos</option>
                                        </select>

                                        <select
                                            value={filterDate}
                                            onChange={(e) => setFilterDate(e.target.value as any)}
                                            className="bg-black/20 border border-white/10 text-xs rounded-lg px-2 py-1.5 text-white focus:border-primary outline-none"
                                        >
                                            <option value="all">Todas as Datas</option>
                                            <option value="today">Hoje</option>
                                            <option value="week">Esta Semana</option>
                                            <option value="overdue">Atrasadas</option>
                                        </select>

                                        <select
                                            value={filterPriority}
                                            onChange={(e) => setFilterPriority(e.target.value as any)}
                                            className="bg-black/20 border border-white/10 text-xs rounded-lg px-2 py-1.5 text-white focus:border-primary outline-none"
                                        >
                                            <option value="all">Todas as Prioridades</option>
                                            <option value="high">Alta Prioridade</option>
                                            <option value="medium">Média</option>
                                            <option value="low">Baixa</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                    Exibindo {displayedTasks.length} tarefa(s)
                                </div>
                            </div>

                            {taskViewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {displayedTasks.map(task => {
                                        const isHigh = task.priority === 'high';
                                        const tagColor = isHigh ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-primary/10 text-primary border-primary/20';

                                        return (
                                            <div key={task.id} className="glass-card p-5 border-l-4 border-l-primary flex flex-col justify-between hover:-translate-y-1">
                                                <div>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className={`px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${tagColor}`}>
                                                            {task.priority === 'high' ? 'Prioridade Alta' : task.project?.category || 'Geral'}
                                                        </span>
                                                        <div className={`size-6 rounded border cursor-pointer flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-primary border-primary' : 'border-gray-600 hover:border-primary'}`} onClick={() => toggleTask(task)}>
                                                            {task.status === 'done' && <span className="material-symbols-outlined text-black text-sm">check</span>}
                                                        </div>
                                                    </div>
                                                    <h3 className="font-bold text-white text-lg mb-2 line-clamp-2">{task.title}</h3>
                                                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{task.description || `Tarefa do projeto: ${task.project?.title}`}</p>
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                                                        {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem data'}
                                                    </div>
                                                    <button
                                                        onClick={() => handleOpenTaskModal(task)}
                                                        className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-primary transition-colors"
                                                        title="Editar tarefa"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                </div>
                                                <div className="flex -space-x-2 px-1 pb-1 mt-2">
                                                    {task.assignee_ids && task.assignee_ids.map((uid: string) => {
                                                        const user = profiles.find(p => p.id === uid);
                                                        if (!user) return null;
                                                        return (
                                                            <div key={uid} className="size-6 rounded-full border border-black bg-gray-800 flex items-center justify-center text-[8px] overflow-hidden hover:scale-110 transition-transform z-0 hover:z-10" title={user.name}>
                                                                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Add Task Button Card - Only in Grid View */}
                                    <button
                                        onClick={() => handleOpenTaskModal()}
                                        className="border-2 border-dashed border-gray-700/50 rounded-xl flex flex-col items-center justify-center p-8 hover:bg-white/5 hover:border-primary/30 transition-all gap-3 group min-h-[200px]"
                                    >
                                        <div className="size-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                            <span className="material-symbols-outlined text-gray-500 group-hover:text-primary text-2xl">add</span>
                                        </div>
                                        <span className="font-bold text-gray-500 group-hover:text-primary transition-colors">Nova Tarefa</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="glass-panel rounded-xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-glass-border bg-white/5">
                                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Tarefa</th>
                                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Origem</th>
                                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Origem</th>
                                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Responsáveis</th>
                                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Prioridade</th>
                                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-glass-border">
                                            {displayedTasks.length > 0 ? displayedTasks.map(task => (
                                                <tr key={task.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="p-4 w-12 text-center">
                                                        <div
                                                            onClick={() => toggleTask(task)}
                                                            className={`size-5 rounded border cursor-pointer flex items-center justify-center transition-all mx-auto ${task.status === 'done' ? 'bg-primary border-primary' : 'border-gray-600 hover:border-primary'}`}
                                                        >
                                                            {task.status === 'done' && <span className="material-symbols-outlined text-black text-xs">check</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className={`font-medium transition-all ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
                                                            {task.title}
                                                        </div>
                                                        {task.description && <div className="text-xs text-gray-500 truncate max-w-[300px]">{task.description}</div>}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/10">
                                                            {task.project?.category || 'Vendas'}
                                                        </span>
                                                        <div className="text-[10px] text-gray-500 mt-1 truncate max-w-[150px]">
                                                            {task.source === 'deal' ? task.source_title : task.project?.title}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex -space-x-1">
                                                            {task.assignee_ids && task.assignee_ids.map((uid: string) => {
                                                                const user = profiles.find(p => p.id === uid);
                                                                if (!user) return null;
                                                                return (
                                                                    <div key={uid} className="size-6 rounded-full border border-black bg-gray-800 flex items-center justify-center text-[8px] overflow-hidden" title={user.name}>
                                                                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.name?.charAt(0).toUpperCase()}
                                                                    </div>
                                                                );
                                                            })}
                                                            {(!task.assignee_ids || task.assignee_ids.length === 0) && <span className="text-gray-600 text-[10px]">-</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${task.priority === 'high'
                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            : task.priority === 'low'
                                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                            }`}>
                                                            {task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baixa' : 'Média'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className={`text-xs font-medium flex items-center gap-1 ${task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                                                            ? 'text-red-400'
                                                            : 'text-gray-400'
                                                            }`}>
                                                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                            {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '-'}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => handleOpenTaskModal(task)}
                                                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Editar"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                                        Nenhuma tarefa encontrada com os filtros atuais.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                <AddAppointmentModal
                    isOpen={isApptModalOpen}
                    onClose={() => setIsApptModalOpen(false)}
                    onSuccess={fetchData}
                    appointmentToEdit={selectedAppointment}
                />

                <AddProjectTaskModal
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onSuccess={fetchData}
                    projectId={tasks[0]?.project_id || ''}
                    taskToEdit={selectedTask}
                />
            </div>
        </Layout>
    );
}
