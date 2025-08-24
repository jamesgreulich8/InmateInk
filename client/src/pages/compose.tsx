import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Navigation } from "@/components/Navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { Link, useLocation } from "wouter";
import { z } from "zod";

// Utility function to capitalize first letter of each word
const capitalizeNames = (name: string): string => {
  return name.trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const letterSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(10, "Letter content must be at least 10 characters"),
  recipientFirstName: z.string().min(1, "First name is required"),
  recipientLastName: z.string().min(1, "Last name is required"),
  recipientId: z.string().min(1, "Inmate ID is required"),
  facilityName: z.string().min(1, "Facility name is required"),
  facilityAddress: z.string().min(10, "Complete facility address is required"),
  paymentType: z.enum(["subscription", "one-time"]),
});

type LetterFormData = z.infer<typeof letterSchema>;

export default function Compose() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [wordCount, setWordCount] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");

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

  const form = useForm<LetterFormData>({
    resolver: zodResolver(letterSchema),
    defaultValues: {
      subject: "",
      content: "",
      recipientFirstName: "",
      recipientLastName: "",
      recipientId: "",
      facilityName: "",
      facilityAddress: "",
      paymentType: "subscription",
    },
  });

  const createLetterMutation = useMutation({
    mutationFn: async (data: LetterFormData) => {
      // Automatically capitalize names before sending
      const formattedData = {
        ...data,
        recipientFirstName: capitalizeNames(data.recipientFirstName),
        recipientLastName: capitalizeNames(data.recipientLastName),
      };
      const response = await apiRequest("POST", "/api/letters", formattedData);
      return response.json();
    },
    onSuccess: (letter) => {
      toast({
        title: "Letter Created",
        description: "Your letter has been created and is being processed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/letters"] });
      
      // Navigate back to dashboard for all letters (pay-per-letter is now free)
      navigate("/dashboard");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to create letter",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LetterFormData) => {
    createLetterMutation.mutate(data);
  };

  const previewLetter = async () => {
    const formData = form.getValues();
    
    // Validate required fields for preview
    if (!formData.content || !formData.recipientFirstName || !formData.recipientLastName || 
        !formData.recipientId || !formData.facilityName || !formData.facilityAddress) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to preview the letter.",
        variant: "destructive",
      });
      return;
    }

    // Automatically capitalize names for preview
    const formattedData = {
      ...formData,
      recipientFirstName: capitalizeNames(formData.recipientFirstName),
      recipientLastName: capitalizeNames(formData.recipientLastName),
    };

    try {
      const response = await fetch('/api/preview-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      if (response.ok) {
        const html = await response.text();
        setPreviewHtml(html);
        setPreviewOpen(true);
      } else {
        throw new Error('Failed to generate preview');
      }
    } catch (error) {
      toast({
        title: "Preview Error",
        description: "Failed to generate letter preview. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update word count when content changes
  const watchContent = form.watch("content");
  useEffect(() => {
    const words = watchContent.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [watchContent]);

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
          <div className="mb-8 flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Compose Letter</h1>
              <p className="mt-1 text-sm text-slate-600">
                Write your letter and add recipient information
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Letter Content */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Letter Content</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter letter subject" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Letter Content</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Write your letter here..."
                                className="min-h-[400px]"
                                {...field}
                              />
                            </FormControl>
                            <p className="text-sm text-slate-600">
                              {wordCount} words • Content will be automatically reviewed for compliance
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="paymentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="subscription">Use Subscription (if active)</SelectItem>
                                  <SelectItem value="one-time">Pay Per Letter (FREE)</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Recipient Information */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recipient Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="recipientFirstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="recipientLastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="recipientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Inmate ID</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="facilityName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Facility Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="facilityAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Facility Address</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Street address, city, state, ZIP"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Preview Card */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Letter Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
                        <div className="mb-4">
                          <p className="text-slate-600">From:</p>
                          <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">To:</p>
                          <p className="font-medium">
                            {form.watch("recipientFirstName")} {form.watch("recipientLastName")}
                          </p>
                          {form.watch("recipientId") && (
                            <p className="text-slate-600">#{form.watch("recipientId")}</p>
                          )}
                          {form.watch("facilityName") && (
                            <p className="text-slate-600">{form.watch("facilityName")}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={previewLetter}
                      className="px-8"
                      data-testid="button-preview"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Letter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Letter Preview</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-auto max-h-[80vh] border rounded-lg">
                      <iframe
                        srcDoc={previewHtml}
                        className="w-full h-[600px] border-0"
                        title="Letter Preview"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button 
                  type="submit" 
                  disabled={createLetterMutation.isPending}
                  className="px-8"
                  data-testid="button-submit"
                >
                  {createLetterMutation.isPending ? "Creating..." : "Create Letter"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
