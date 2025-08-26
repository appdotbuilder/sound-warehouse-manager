import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { Dashboard } from '@/components/Dashboard';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import type { Admin } from '../../server/src/schema';

function App() {
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if admin is logged in on app startup
  useEffect(() => {
    const storedAdmin = localStorage.getItem('currentAdmin');
    if (storedAdmin) {
      try {
        setCurrentAdmin(JSON.parse(storedAdmin));
      } catch (error) {
        console.error('Failed to parse stored admin:', error);
        localStorage.removeItem('currentAdmin');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    try {
      const admin = await trpc.loginAdmin.mutate({ username, password });
      setCurrentAdmin(admin);
      localStorage.setItem('currentAdmin', JSON.stringify(admin));
      toast.success('Login successful!');
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please check your credentials.');
      return false;
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentAdmin(null);
    localStorage.removeItem('currentAdmin');
    toast.success('Logged out successfully');
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentAdmin) {
    return (
      <>
        <LoginForm onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Dashboard admin={currentAdmin} onLogout={handleLogout} />
      <Toaster />
    </>
  );
}

export default App;