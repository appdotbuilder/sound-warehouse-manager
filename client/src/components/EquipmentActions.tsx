import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Search, ArrowRight, ArrowLeft, Calendar } from 'lucide-react';
import type { Equipment, CheckOutEquipmentInput, CheckInEquipmentInput, BookEquipmentInput } from '../../../server/src/schema';

interface EquipmentActionsProps {
  adminId: number;
  onActionComplete: () => void;
}

export function EquipmentActions({ adminId, onActionComplete }: EquipmentActionsProps) {
  const [serialNumber, setSerialNumber] = useState('');
  const [foundEquipment, setFoundEquipment] = useState<Equipment | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check-out form data
  const [checkOutData, setCheckOutData] = useState({
    user_name: '',
    user_contact: '',
    expected_return_date: '',
    notes: '',
  });

  // Check-in form data
  const [checkInData, setCheckInData] = useState({
    notes: '',
  });

  // Booking form data
  const [bookingData, setBookingData] = useState({
    user_name: '',
    user_contact: '',
    expected_return_date: '',
    notes: '',
  });

  const searchEquipment = async () => {
    if (!serialNumber.trim()) {
      toast.error('Please enter a serial number');
      return;
    }

    setIsSearching(true);
    try {
      const equipment = await trpc.getEquipmentBySerial.query({ 
        serialNumber: serialNumber.trim() 
      });
      setFoundEquipment(equipment);
      toast.success('Equipment found!');
    } catch (error) {
      console.error('Equipment not found:', error);
      setFoundEquipment(null);
      toast.error('Equipment not found with that serial number');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCheckOut = async () => {
    if (!foundEquipment || !checkOutData.user_name.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    try {
      const input: CheckOutEquipmentInput = {
        equipment_id: foundEquipment.id,
        admin_id: adminId,
        user_name: checkOutData.user_name,
        user_contact: checkOutData.user_contact || null,
        expected_return_date: checkOutData.expected_return_date ? 
          new Date(checkOutData.expected_return_date) : null,
        notes: checkOutData.notes || null,
      };

      await trpc.checkOutEquipment.mutate(input);
      toast.success(`Equipment checked out to ${checkOutData.user_name}`);
      resetForm();
      onActionComplete();
    } catch (error) {
      console.error('Failed to check out equipment:', error);
      toast.error('Failed to check out equipment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckIn = async () => {
    if (!foundEquipment) return;

    setIsProcessing(true);
    try {
      const input: CheckInEquipmentInput = {
        equipment_id: foundEquipment.id,
        admin_id: adminId,
        notes: checkInData.notes || null,
      };

      await trpc.checkInEquipment.mutate(input);
      toast.success('Equipment checked in successfully');
      resetForm();
      onActionComplete();
    } catch (error) {
      console.error('Failed to check in equipment:', error);
      toast.error('Failed to check in equipment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBooking = async () => {
    if (!foundEquipment || !bookingData.user_name.trim() || !bookingData.expected_return_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    try {
      const input: BookEquipmentInput = {
        equipment_id: foundEquipment.id,
        admin_id: adminId,
        user_name: bookingData.user_name,
        user_contact: bookingData.user_contact || null,
        expected_return_date: new Date(bookingData.expected_return_date),
        notes: bookingData.notes || null,
      };

      await trpc.bookEquipment.mutate(input);
      toast.success(`Equipment booked for ${bookingData.user_name}`);
      resetForm();
      onActionComplete();
    } catch (error) {
      console.error('Failed to book equipment:', error);
      toast.error('Failed to book equipment');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSerialNumber('');
    setFoundEquipment(null);
    setCheckOutData({ user_name: '', user_contact: '', expected_return_date: '', notes: '' });
    setCheckInData({ notes: '' });
    setBookingData({ user_name: '', user_contact: '', expected_return_date: '', notes: '' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-300';
      case 'checked_out': return 'bg-red-100 text-red-800 border-red-300';
      case 'booked': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const canCheckOut = foundEquipment?.status === 'available';
  const canCheckIn = foundEquipment?.status === 'checked_out';
  const canBook = foundEquipment?.status === 'available';

  return (
    <div className="space-y-6">
      {/* Serial Number Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Find Equipment by Serial Number</span>
          </CardTitle>
          <CardDescription>
            Enter the serial number to find equipment (supports barcode scanning)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Enter serial number or scan barcode"
                value={serialNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSerialNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchEquipment()}
              />
            </div>
            <Button 
              onClick={searchEquipment}
              disabled={isSearching || !serialNumber.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Found */}
      {foundEquipment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Equipment Found</span>
              <Badge className={getStatusColor(foundEquipment.status)}>
                {foundEquipment.status.replace('_', ' ')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="font-semibold text-lg">{foundEquipment.name}</p>
                <p className="text-sm text-gray-600">Serial: {foundEquipment.serial_number}</p>
                <p className="text-sm text-gray-600">Category: {foundEquipment.category}</p>
                {foundEquipment.brand && (
                  <p className="text-sm text-gray-600">
                    Brand: {foundEquipment.brand}
                    {foundEquipment.model && ` - ${foundEquipment.model}`}
                  </p>
                )}
              </div>
              <div>
                {foundEquipment.description && (
                  <p className="text-sm text-gray-600">{foundEquipment.description}</p>
                )}
              </div>
            </div>

            {/* Action Tabs */}
            <Tabs defaultValue="checkout" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger 
                  value="checkout" 
                  disabled={!canCheckOut}
                  className="flex items-center space-x-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>Check Out</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="checkin" 
                  disabled={!canCheckIn}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Check In</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="book" 
                  disabled={!canBook}
                  className="flex items-center space-x-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Book</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="checkout" className="space-y-4 mt-4">
                {canCheckOut ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkout-user">User Name *</Label>
                        <Input
                          id="checkout-user"
                          value={checkOutData.user_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCheckOutData(prev => ({ ...prev, user_name: e.target.value }))
                          }
                          placeholder="Who is taking this equipment?"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="checkout-contact">Contact Info</Label>
                        <Input
                          id="checkout-contact"
                          value={checkOutData.user_contact}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCheckOutData(prev => ({ ...prev, user_contact: e.target.value }))
                          }
                          placeholder="Phone or email (optional)"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="checkout-return">Expected Return Date</Label>
                        <Input
                          id="checkout-return"
                          type="datetime-local"
                          value={checkOutData.expected_return_date}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCheckOutData(prev => ({ ...prev, expected_return_date: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="checkout-notes">Notes</Label>
                      <Textarea
                        id="checkout-notes"
                        value={checkOutData.notes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setCheckOutData(prev => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Additional notes (optional)"
                        rows={3}
                      />
                    </div>
                    
                    <Button
                      onClick={handleCheckOut}
                      disabled={isProcessing || !checkOutData.user_name.trim()}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      {isProcessing ? 'Processing...' : 'Check Out Equipment'}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    Equipment must be available to check out
                  </div>
                )}
              </TabsContent>

              <TabsContent value="checkin" className="space-y-4 mt-4">
                {canCheckIn ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="checkin-notes">Notes</Label>
                      <Textarea
                        id="checkin-notes"
                        value={checkInData.notes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setCheckInData(prev => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Condition notes or additional information (optional)"
                        rows={3}
                      />
                    </div>
                    
                    <Button
                      onClick={handleCheckIn}
                      disabled={isProcessing}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? 'Processing...' : 'Check In Equipment'}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    Equipment must be checked out to check in
                  </div>
                )}
              </TabsContent>

              <TabsContent value="book" className="space-y-4 mt-4">
                {canBook ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="book-user">User Name *</Label>
                        <Input
                          id="book-user"
                          value={bookingData.user_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setBookingData(prev => ({ ...prev, user_name: e.target.value }))
                          }
                          placeholder="Who is booking this equipment?"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="book-contact">Contact Info</Label>
                        <Input
                          id="book-contact"
                          value={bookingData.user_contact}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setBookingData(prev => ({ ...prev, user_contact: e.target.value }))
                          }
                          placeholder="Phone or email (optional)"
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="book-return">Expected Use Date *</Label>
                        <Input
                          id="book-return"
                          type="datetime-local"
                          value={bookingData.expected_return_date}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setBookingData(prev => ({ ...prev, expected_return_date: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="book-notes">Notes</Label>
                      <Textarea
                        id="book-notes"
                        value={bookingData.notes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setBookingData(prev => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Purpose or additional notes (optional)"
                        rows={3}
                      />
                    </div>
                    
                    <Button
                      onClick={handleBooking}
                      disabled={isProcessing || !bookingData.user_name.trim() || !bookingData.expected_return_date}
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                    >
                      {isProcessing ? 'Processing...' : 'Book Equipment'}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    Equipment must be available to book
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}