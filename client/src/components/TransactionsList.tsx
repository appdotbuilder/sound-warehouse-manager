import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Filter, Clock, User, Package } from 'lucide-react';
import type { EquipmentTransaction, GetTransactionsQuery } from '../../../server/src/schema';

export function TransactionsList() {
  const [transactions, setTransactions] = useState<EquipmentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<GetTransactionsQuery>({});

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const transactionsData = await trpc.getTransactions.query(filters);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'check_out': return 'bg-red-100 text-red-800 border-red-300';
      case 'check_in': return 'bg-green-100 text-green-800 border-green-300';
      case 'booking': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'check_out': return '📤';
      case 'check_in': return '📥';
      case 'booking': return '📅';
      default: return '📋';
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
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="font-medium">Filter Transactions</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select
                value={filters.transaction_type || 'all'}
                onValueChange={(value) => 
                  setFilters(prev => ({ 
                    ...prev, 
                    transaction_type: value === 'all' ? undefined : value as any 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="check_out">Check Out</SelectItem>
                  <SelectItem value="check_in">Check In</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Equipment ID</Label>
              <Input
                type="number"
                placeholder="Equipment ID"
                value={filters.equipment_id || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters(prev => ({ 
                    ...prev, 
                    equipment_id: e.target.value ? parseInt(e.target.value) : undefined 
                  }))
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.start_date ? filters.start_date.toISOString().split('T')[0] : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters(prev => ({ 
                    ...prev, 
                    start_date: e.target.value ? new Date(e.target.value) : undefined 
                  }))
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.end_date ? filters.end_date.toISOString().split('T')[0] : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters(prev => ({ 
                    ...prev, 
                    end_date: e.target.value ? new Date(e.target.value) : undefined 
                  }))
                }
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setFilters({})}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
          <p className="text-gray-500">Try adjusting your filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getTransactionIcon(transaction.transaction_type)}</span>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {transaction.transaction_type.replace('_', ' ').toUpperCase()}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <Package className="h-4 w-4" />
                            <span>Equipment ID: {transaction.equipment_id}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{transaction.user_name}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                    {transaction.transaction_type.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Contact Info</p>
                    <p className="text-gray-600">
                      {transaction.user_contact || 'Not provided'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Transaction Date</p>
                    <p className="text-gray-600">
                      {formatDate(transaction.transaction_date)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Expected Return</p>
                    <p className="text-gray-600">
                      {transaction.expected_return_date 
                        ? formatDate(transaction.expected_return_date)
                        : 'Not specified'
                      }
                    </p>
                  </div>
                </div>

                {transaction.actual_return_date && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm font-medium text-green-800">
                      Returned: {formatDate(transaction.actual_return_date)}
                    </p>
                  </div>
                )}

                {transaction.notes && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
                    <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                    <p className="text-sm text-gray-600">{transaction.notes}</p>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-400">
                  Transaction #{transaction.id} • Admin ID: {transaction.admin_id} • 
                  Created: {formatDate(transaction.created_at)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}