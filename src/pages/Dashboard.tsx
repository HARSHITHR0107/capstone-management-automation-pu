import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { FacultyDashboard } from '@/components/dashboard/FacultyDashboard';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function Dashboard() {
  const { user, logout, isLoading } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      // The auth state change will automatically redirect via the ProtectedRoute
      // But we can also force redirect to be safe
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if logout fails
      window.location.href = '/login';
    }
  };

  const renderDashboard = () => {
    console.log('Dashboard rendering for user:', user);
    console.log('User role:', user.role);

    switch (user.role) {
      case 'admin':
        console.log('Rendering AdminDashboard');
        return <AdminDashboard />;
      case 'student':
        console.log('Rendering StudentDashboard');
        return <StudentDashboard />;
      case 'faculty':
      case 'reviewer':
        console.log('Rendering FacultyDashboard');
        return <FacultyDashboard />;
      default:
        console.log('Unknown role, showing error');
        return (
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4">Unknown Role</h2>
            <p className="text-muted-foreground">Your account role is not recognized: {user.role}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile Responsive */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
        <div className="flex justify-between items-center gap-2">
          {/* Logo and Title */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-blue-600 truncate">
              Capstone Portal
            </h1>
            <div className="hidden sm:block text-sm text-muted-foreground whitespace-nowrap">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Portal
            </div>
          </div>

          {/* User Info and Logout - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-sm text-right">
              <div className="font-medium">{user.name}</div>
              <div className="text-muted-foreground text-xs">{user.email}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoading}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoading ? 'Logging out...' : 'Logout'}
            </Button>
          </div>

          {/* Logout Button - Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <div className="text-xs text-right max-w-[120px]">
              <div className="font-medium truncate">{user.name}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoading}
              className="shrink-0"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </div>

        {/* Mobile Role Badge */}
        <div className="sm:hidden mt-2 text-xs text-muted-foreground">
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Portal
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {renderDashboard()}
      </main>
    </div>
  );
}