import React, { useState, useEffect, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Skeleton from './components/ui/Skeleton';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';

// Lazy Load Pages for Code Splitting
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const PipelinePage = React.lazy(() => import('./pages/PipelinePage'));
const FinancialPage = React.lazy(() => import('./pages/FinancialPage'));
const GoalsPage = React.lazy(() => import('./pages/GoalsPage'));
const InternalProjectsPage = React.lazy(() => import('./pages/InternalProjectsPage'));
const ProjectDetailsPage = React.lazy(() => import('./pages/ProjectDetailsPage'));
const ClientDetailsPage = React.lazy(() => import('./pages/ClientDetailsPage'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

// Define the views available in the app
export type View = 'login' | 'pipeline' | 'financial' | 'goals' | 'projects' | 'project_details' | 'client' | 'settings' | 'calendar' | 'profile';

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      setCurrentView('login');
    } else if (!loading && user && currentView === 'login') {
      setCurrentView('pipeline');
    }
  }, [user, loading, currentView]);

  const navigate = (view: View, id?: string) => {
    if (view === 'client' && id) setSelectedDealId(id);
    if (view === 'project_details' && id) setSelectedProjectId(id);
    setCurrentView(view);
  };

  // ... inside AppContent ...
  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[var(--bg-color)] gap-4 transition-colors duration-300">
      <div className="flex gap-4 items-center">
        <Skeleton variant="circle" width={60} height={60} className="border-2 border-[#d4af37]/30" />
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" width={200} height={24} />
          <Skeleton variant="text" width={140} height={16} />
        </div>
      </div>
    </div>
  );

  // Render the specific page based on current state
  const renderView = () => {
    if (!user) return <LoginPage onLogin={() => { }} />;

    switch (currentView) {
      case 'login':
        return <LoginPage onLogin={() => navigate('pipeline')} />;
      case 'pipeline':
        return <PipelinePage onNavigate={navigate} activePage="pipeline" />;
      case 'financial':
        return <FinancialPage onNavigate={navigate} activePage="financial" />;
      case 'goals':
        return <GoalsPage onNavigate={navigate} activePage="goals" />;
      case 'projects':
        return <InternalProjectsPage onNavigate={navigate} activePage="projects" />;
      case 'project_details':
        return selectedProjectId ? <ProjectDetailsPage onNavigate={navigate} activePage="projects" projectId={selectedProjectId} /> : <InternalProjectsPage onNavigate={navigate} activePage="projects" />;
      case 'client':
        return <ClientDetailsPage onNavigate={navigate} dealId={selectedDealId} activePage="pipeline" />;
      case 'settings':
        return <SettingsPage onNavigate={navigate} activePage="settings" />;
      case 'calendar':
        return <CalendarPage onNavigate={navigate} activePage="calendar" />;
      case 'profile':
        return <ProfilePage onNavigate={navigate} activePage="profile" />;
      default:
        return <PipelinePage onNavigate={navigate} activePage="pipeline" />;
    }
  };

  return (
    <Suspense fallback={
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[var(--bg-color)] gap-4 transition-colors duration-300">
        <Skeleton variant="circle" width={60} height={60} className="border-2 border-[#d4af37]/30" />
      </div>
    }>
      {renderView()}
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}