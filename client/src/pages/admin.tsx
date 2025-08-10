import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/Navigation";
import { Mail, Users, AlertCircle, DollarSign, Eye, CheckCircle, XCircle } from "lucide-react";
import type { Letter } from "@shared/schema";

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect to home if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.isAdmin)) {
      toast({
        title: "Unauthorized",
        description: "Admin access required.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: stats } = useQuery<{
    totalLetters: number;
    pendingReview: number;
    totalUsers: number;
    revenue: number;
  }>({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  const { data: letters = [] } = useQuery<Letter[]>({
    queryKey: ["/api/admin/letters"],
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string, status: string, rejectionReason?: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/letters/${id}/status`, { status, rejectionReason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Letter status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/letters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800';
      case 'mailed':
        return 'bg-blue-100 text-blue-800';
      case 'printed':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-emerald-100 text-emerald-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const handleStatusUpdate = (id: string, status: string) => {
    let rejectionReason;
    if (status === 'rejected') {
      rejectionReason = prompt('Please provide a reason for rejection:');
      if (!rejectionReason) return;
    }
    updateStatusMutation.mutate({ id, status, rejectionReason });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation authenticated admin />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage orders, review content, and monitor system activity
            </p>
          </div>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-600 truncate">Total Letters</dt>
                      <dd className="text-lg font-medium text-slate-900">{stats?.totalLetters || 0}</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-600 truncate">Pending Review</dt>
                      <dd className="text-lg font-medium text-slate-900">{stats?.pendingReview || 0}</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-600 truncate">Total Users</dt>
                      <dd className="text-lg font-medium text-slate-900">{stats?.totalUsers || 0}</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-600 truncate">Revenue</dt>
                      <dd className="text-lg font-medium text-slate-900">${stats?.revenue?.toFixed(2) || '0.00'}</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Letters Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Letter Management</CardTitle>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="printed">Printed</SelectItem>
                  <SelectItem value="mailed">Mailed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {letters.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No letters found</h3>
                  <p className="text-slate-600">Letters will appear here as they are submitted</p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Recipient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Facility
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {letters.map((letter: any) => (
                        <tr key={letter.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            #{letter.id.slice(-8)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {letter.recipientFirstName} {letter.recipientLastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {letter.facilityName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(letter.status)}>
                              {letter.status.charAt(0).toUpperCase() + letter.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {new Date(letter.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => alert(`Letter Content:\n\n${letter.content}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {letter.status === 'pending' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleStatusUpdate(letter.id, 'approved')}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleStatusUpdate(letter.id, 'rejected')}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </Button>
                              </>
                            )}
                            {letter.status === 'approved' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleStatusUpdate(letter.id, 'printed')}
                                disabled={updateStatusMutation.isPending}
                              >
                                Mark Printed
                              </Button>
                            )}
                            {letter.status === 'printed' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleStatusUpdate(letter.id, 'mailed')}
                                disabled={updateStatusMutation.isPending}
                              >
                                Mark Mailed
                              </Button>
                            )}
                            {letter.status === 'mailed' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleStatusUpdate(letter.id, 'delivered')}
                                disabled={updateStatusMutation.isPending}
                              >
                                Mark Delivered
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
