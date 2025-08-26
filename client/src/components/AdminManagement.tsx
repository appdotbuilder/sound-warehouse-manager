import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Users, UserPlus, Shield } from 'lucide-react';
import type { Admin, CreateAdminInput } from '../../../server/src/schema';

interface AdminManagementProps {
  currentAdmin: Admin;
}

export function AdminManagement({ currentAdmin }: AdminManagementProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newAdminData, setNewAdminData] = useState<CreateAdminInput>({
    username: '',
    email: '',
    password: '',
  });

  const loadAdmins = useCallback(async () => {
    try {
      setIsLoading(true);
      const adminsData = await trpc.getAdmins.query();
      setAdmins(adminsData);
    } catch (error) {
      console.error('Failed to load admins:', error);
      toast.error('Failed to load admin accounts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminData.username.trim() || !newAdminData.email.trim() || !newAdminData.password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newAdminData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsCreating(true);
    try {
      await trpc.createAdmin.mutate(newAdminData);
      toast.success('Admin account created successfully!');
      
      // Reset form
      setNewAdminData({ username: '', email: '', password: '' });
      setIsDialogOpen(false);
      
      // Reload admin list
      loadAdmins();
    } catch (error) {
      console.error('Failed to create admin:', error);
      toast.error('Failed to create admin account. Username or email may already exist.');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Add New Administrator</span>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Admin Account</DialogTitle>
                  <DialogDescription>
                    Create a new administrator account for the sound equipment warehouse system.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-username">Username *</Label>
                    <Input
                      id="new-username"
                      value={newAdminData.username}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewAdminData(prev => ({ ...prev, username: e.target.value }))
                      }
                      placeholder="Enter username (min 3 characters)"
                      required
                      minLength={3}
                      maxLength={50}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-email">Email *</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newAdminData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewAdminData(prev => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Password *</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newAdminData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewAdminData(prev => ({ ...prev, password: e.target.value }))
                      }
                      placeholder="Enter password (min 6 characters)"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isCreating}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isCreating ? 'Creating...' : 'Create Admin'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Manage administrator accounts for the sound equipment warehouse system
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Current Admins List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Administrator Accounts</span>
            <Badge variant="secondary">{admins.length}</Badge>
          </CardTitle>
          <CardDescription>
            List of all administrator accounts with access to the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {admins.map((admin) => (
              <Card key={admin.id} className={`${admin.id === currentAdmin.id ? 'border-blue-500 bg-blue-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-lg">{admin.username}</h3>
                          {admin.id === currentAdmin.id && (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              You
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Email:</span> {admin.email}
                        </p>
                        <p>
                          <span className="font-medium">Account ID:</span> {admin.id}
                        </p>
                        <p>
                          <span className="font-medium">Created:</span> {formatDate(admin.created_at)}
                        </p>
                        <p>
                          <span className="font-medium">Last Updated:</span> {formatDate(admin.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {admins.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No administrators found</h3>
              <p className="text-gray-500">Create the first administrator account.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}