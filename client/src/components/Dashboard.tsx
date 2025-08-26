import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EquipmentList } from '@/components/EquipmentList';
import { AddEquipmentForm } from '@/components/AddEquipmentForm';
import { TransactionsList } from '@/components/TransactionsList';
import { AdminManagement } from '@/components/AdminManagement';
import { EquipmentActions } from '@/components/EquipmentActions';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { 
  Headphones, 
  LogOut, 
  Users, 
  Package, 
  Clock, 
  Search,
  Filter,
  Plus,
  Activity
} from 'lucide-react';
import type { Admin, Equipment, GetEquipmentQuery } from '../../../server/src/schema';

interface DashboardProps {
  admin: Admin;
  onLogout: () => void;
}

export function Dashboard({ admin, onLogout }: DashboardProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Load equipment data
  const loadEquipment = useCallback(async () => {
    try {
      setIsLoading(true);
      const query: GetEquipmentQuery = {};
      
      if (statusFilter !== 'all') {
        query.status = statusFilter as any;
      }
      if (categoryFilter !== 'all') {
        query.category = categoryFilter;
      }
      if (searchTerm.trim()) {
        query.search = searchTerm.trim();
      }

      const equipmentData = await trpc.getEquipment.query(query);
      setEquipment(equipmentData);
    } catch (error) {
      console.error('Failed to load equipment:', error);
      toast.error('Failed to load equipment');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, categoryFilter]);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await trpc.getEquipmentCategories.query();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleEquipmentAdded = useCallback(() => {
    loadEquipment();
    loadCategories();
    toast.success('Equipment added successfully!');
  }, [loadEquipment, loadCategories]);

  const handleEquipmentUpdated = useCallback(() => {
    loadEquipment();
    toast.success('Equipment updated successfully!');
  }, [loadEquipment]);

  // Count equipment by status
  const statusCounts = equipment.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600';
      case 'checked_out': return 'bg-red-500 hover:bg-red-600';
      case 'booked': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'maintenance': return 'bg-orange-500 hover:bg-orange-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Headphones className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-bold text-slate-800">
                  Sound Equipment Warehouse
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                Welcome, <span className="font-medium">{admin.username}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="text-slate-600 hover:text-slate-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{equipment.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <div className="h-4 w-4 rounded-full bg-green-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statusCounts.available || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Checked Out</CardTitle>
              <div className="h-4 w-4 rounded-full bg-red-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statusCounts.checked_out || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Booked</CardTitle>
              <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {statusCounts.booked || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="equipment" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="equipment" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Equipment</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Quick Actions</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Admin</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Search & Filter Equipment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Input
                      placeholder="Search by name, serial number..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="checked_out">Checked Out</SelectItem>
                        <SelectItem value="booked">Booked</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <Badge 
                      key={status} 
                      variant="secondary" 
                      className={`${getStatusColor(status)} text-white`}
                    >
                      {status.replace('_', ' ')}: {count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Add Equipment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Add New Equipment</span>
                </CardTitle>
                <CardDescription>
                  Add new sound equipment to the warehouse inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AddEquipmentForm 
                  adminId={admin.id} 
                  onEquipmentAdded={handleEquipmentAdded}
                />
              </CardContent>
            </Card>

            {/* Equipment List */}
            <Card>
              <CardHeader>
                <CardTitle>Equipment Inventory</CardTitle>
                <CardDescription>
                  Manage your sound equipment inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EquipmentList 
                  equipment={equipment}
                  isLoading={isLoading}
                  onEquipmentUpdated={handleEquipmentUpdated}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  View all equipment check-ins, check-outs, and bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Check out, check in, or book equipment by serial number
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EquipmentActions 
                  adminId={admin.id} 
                  onActionComplete={handleEquipmentUpdated}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Admin Management</CardTitle>
                <CardDescription>
                  Manage administrator accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminManagement currentAdmin={admin} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}