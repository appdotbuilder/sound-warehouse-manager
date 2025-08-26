import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Edit, Trash2, Eye } from 'lucide-react';
import type { Equipment, UpdateEquipmentInput } from '../../../server/src/schema';

interface EquipmentListProps {
  equipment: Equipment[];
  isLoading: boolean;
  onEquipmentUpdated: () => void;
}

export function EquipmentList({ equipment, isLoading, onEquipmentUpdated }: EquipmentListProps) {
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-300';
      case 'checked_out': return 'bg-red-100 text-red-800 border-red-300';
      case 'booked': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment) return;

    setIsUpdating(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const updateData: UpdateEquipmentInput = {
        id: editingEquipment.id,
        name: formData.get('name') as string || undefined,
        serial_number: formData.get('serial_number') as string || undefined,
        description: (formData.get('description') as string) || null,
        category: formData.get('category') as string || undefined,
        brand: (formData.get('brand') as string) || null,
        model: (formData.get('model') as string) || null,
        status: (formData.get('status') as any) || undefined,
      };

      await trpc.updateEquipment.mutate(updateData);
      toast.success('Equipment updated successfully!');
      setIsEditDialogOpen(false);
      setEditingEquipment(null);
      onEquipmentUpdated();
    } catch (error) {
      console.error('Failed to update equipment:', error);
      toast.error('Failed to update equipment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteEquipment.mutate({ id });
      toast.success('Equipment deleted successfully!');
      onEquipmentUpdated();
    } catch (error) {
      console.error('Failed to delete equipment:', error);
      toast.error('Failed to delete equipment');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Eye className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No equipment found</h3>
        <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {equipment.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Serial:</span> {item.serial_number}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Category:</span> {item.category}
                </p>
                {item.brand && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Brand:</span> {item.brand}
                    {item.model && ` - ${item.model}`}
                  </p>
                )}
                {item.description && (
                  <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                )}
              </div>
              
              <div className="flex space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{item.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            
            <div className="text-xs text-gray-400 border-t pt-2">
              Created: {item.created_at.toLocaleDateString()} • 
              Updated: {item.updated_at.toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Edit Equipment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Equipment</DialogTitle>
            <DialogDescription>
              Update equipment information
            </DialogDescription>
          </DialogHeader>
          
          {editingEquipment && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingEquipment.name}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-serial">Serial Number *</Label>
                <Input
                  id="edit-serial"
                  name="serial_number"
                  defaultValue={editingEquipment.serial_number}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Input
                  id="edit-category"
                  name="category"
                  defaultValue={editingEquipment.category}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-brand">Brand</Label>
                <Input
                  id="edit-brand"
                  name="brand"
                  defaultValue={editingEquipment.brand || ''}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-model">Model</Label>
                <Input
                  id="edit-model"
                  name="model"
                  defaultValue={editingEquipment.model || ''}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select name="status" defaultValue={editingEquipment.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={editingEquipment.description || ''}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isUpdating ? 'Updating...' : 'Update Equipment'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}