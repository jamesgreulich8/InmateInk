import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Separator } from "@/components/ui/separator";
import { Mail, FileText, Settings, CreditCard, CheckCircle, Clock, Truck } from "lucide-react";
import { Link } from "wouter";
import type { Letter } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { user } = useAuth();

  const { data: letters = [] } = useQuery<Letter[]>({
    queryKey: ["/api/letters"],
    retry: false,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'mailed':
        return <Truck className="h-4 w-4 text-blue-500" />;
      case 'printed':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation authenticated />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {user?.firstName || 'User'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage your letters and subscription
            </p>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-600 truncate">Subscription Status</dt>
                      <dd className="text-lg font-medium text-slate-900">
                        {user?.subscriptionStatus === 'active' ? 'Active Monthly' : 'No Subscription'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-600 truncate">Letters This Month</dt>
                      <dd className="text-lg font-medium text-slate-900">
                        {user?.lettersThisMonth || 0} of 4
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-600 truncate">Total Letters Sent</dt>
                      <dd className="text-lg font-medium text-slate-900">
                        {letters.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/compose">
                  <Button className="w-full h-auto p-6 flex items-center justify-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Compose New Letter</span>
                  </Button>
                </Link>
                <Link href="/subscribe">
                  <Button variant="outline" className="w-full h-auto p-6 flex items-center justify-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Manage Subscription</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Letters */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Letters</CardTitle>
            </CardHeader>
            <CardContent>
              {letters.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No letters yet</h3>
                  <p className="text-slate-600 mb-4">Start by composing your first letter</p>
                  <Link href="/compose">
                    <Button>
                      <FileText className="w-4 h-4 mr-2" />
                      Compose Letter
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Recipient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Facility
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Date Sent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {letters.slice(0, 5).map((letter: any) => (
                        <tr key={letter.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {letter.recipientFirstName} {letter.recipientLastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {letter.facilityName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {new Date(letter.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(letter.status)}
                              <Badge className={getStatusColor(letter.status)}>
                                {letter.status.charAt(0).toUpperCase() + letter.status.slice(1)}
                              </Badge>
                            </div>
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
