import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { resetPasswordRequestSchema, type ResetPasswordRequestData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ResetPasswordRequestData>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  const requestResetMutation = useMutation({
    mutationFn: async (data: ResetPasswordRequestData) => {
      const response = await apiRequest("POST", "/api/auth/request-password-reset", data);
      return response.json();
    },
    onSuccess: () => {
      setEmailSent(true);
      toast({
        title: "Reset Link Sent",
        description: "If an account exists, you'll receive a password reset email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordRequestData) => {
    requestResetMutation.mutate(data);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-blue-900">Check Your Email</CardTitle>
              <CardDescription>
                If an account with that email exists, we've sent you a password reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Didn't receive the email? Check your spam folder and make sure you entered the correct email address.
                  </AlertDescription>
                </Alert>
                
                <div className="text-center space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setEmailSent(false)}
                    data-testid="button-try-again"
                  >
                    Try Another Email
                  </Button>
                  
                  <Link href="/auth/login">
                    <Button variant="ghost" className="w-full" data-testid="button-back-to-login">
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Forgot Password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your email to receive a password reset link
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              We'll send you a secure link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email address"
                          data-testid="input-email"
                          disabled={requestResetMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={requestResetMutation.isPending}
                  data-testid="button-send-reset"
                >
                  {requestResetMutation.isPending ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Remember your password?{" "}
                <Link href="/auth/login">
                  <Button variant="link" className="px-0" data-testid="link-login">
                    Sign in here
                  </Button>
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/">
            <Button variant="ghost" data-testid="link-home">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}