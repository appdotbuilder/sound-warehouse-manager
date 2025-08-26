import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import type { CreateEquipmentInput } from '../../../server/src/schema';

interface AddEquipmentFormProps {
  adminId: number;
  onEquipmentAdded: () => void;
}

export function AddEquipmentForm({ adminId, onEquipmentAdded }: AddEquipmentFormProps) {
  const [formData, setFormData] = useState<CreateEquipmentInput>({
    name: '',
    serial_number: '',
    description: null,
    category: '',
    brand: null,
    model: null,
    status: 'available',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.serial_number.trim() || !formData.category.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await trpc.createEquipment.mutate(formData);
      
      // Reset form
      setFormData({
        name: '',
        serial_number: '',
        description: null,
        category: '',
        brand: null,
        model: null,
        status: 'available',
      });
      
      onEquipmentAdded();
    } catch (error) {
      console.error('Failed to create equipment:', error);
      toast.error('Failed to add equipment. Please check if the serial number is unique.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Equipment Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateEquipmentInput) => ({ ...prev, name: e.target.value }))
          }
          placeholder="e.g., Shure SM58 Microphone"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="serial_number">Serial Number *</Label>
        <Input
          id="serial_number"
          value={formData.serial_number}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateEquipmentInput) => ({ ...prev, serial_number: e.target.value }))
          }
          placeholder="Unique identifier or barcode"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Input
          id="category"
          value={formData.category}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateEquipmentInput) => ({ ...prev, category: e.target.value }))
          }
          placeholder="e.g., Microphones, Speakers, Mixers"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value: any) =>
            setFormData((prev: CreateEquipmentInput) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand">Brand</Label>
        <Input
          id="brand"
          value={formData.brand || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateEquipmentInput) => ({ 
              ...prev, 
              brand: e.target.value || null 
            }))
          }
          placeholder="e.g., Shure, JBL, Yamaha"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          value={formData.model || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateEquipmentInput) => ({ 
              ...prev, 
              model: e.target.value || null 
            }))
          }
          placeholder="e.g., SM58, JBL-EON615"
        />
      </div>

      <div className="md:col-span-2 space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateEquipmentInput) => ({ 
              ...prev, 
              description: e.target.value || null 
            }))
          }
          placeholder="Additional details about the equipment..."
          rows={3}
        />
      </div>

      <div className="md:col-span-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Adding Equipment...' : 'Add Equipment 🎵'}
        </Button>
      </div>
    </form>
  );
}