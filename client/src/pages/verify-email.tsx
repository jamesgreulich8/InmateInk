import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Loader2, Send } from "lucide-react";

// Resend Verification Component
function ResendVerificationButton() {
  const { toast } = useToast();
  const [email, setEmail] = useState<string>("");
  const [showEmailInput, setShowEmailInput] = useState(false);

  const resendMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("/api/auth/resend-verification", "POST", { email });
    },
    onSuccess: () => {
      toast({
        title: "Verification Email Sent",
        description: "Please check your email inbox and spam folder for the new verification link.",
      });
      setShowEmailInput(false);
      setEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Resend",
        description: error.message || "Failed to resend verification email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleResend = () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to resend verification.",
        variant: "destructive",
      });
      return;
    }

    resendMutation.mutate(email.trim().toLowerCase());
  };

  if (!showEmailInput) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowEmailInput(true)}
        data-testid="button-show-resend-form"
      >
        <Send className="w-4 h-4 mr-2" />
        Resend Verification Email
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Enter your email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your-email@example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="input-resend-email"
        />
      </div>
      <div className="flex space-x-2">
        <Button
          onClick={handleResend}
          disabled={resendMutation.isPending}
          className="flex-1"
          data-testid="button-resend-verification"
        >
          {resendMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Resend Email
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setShowEmailInput(false);
            setEmail("");
          }}
          disabled={resendMutation.isPending}
          data-testid="button-cancel-resend"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  const { toast } = useToast();
  const [token, setToken] = useState<string>("");
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Extract token from URL query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setVerificationStatus('error');
      setErrorMessage('No verification token provided');
    }
  }, []);

  const verifyEmailMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed');
      }
      return response.json();
    },
    onSuccess: () => {
      setVerificationStatus('success');
      toast({
        title: "Email Verified",
        description: "Your email has been successfully verified. You can now log in.",
      });
    },
    onError: (error: any) => {
      setVerificationStatus('error');
      setErrorMessage(error.message || 'Email verification failed');
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify email",
        variant: "destructive",
      });
    },
  });

  // Automatically verify when token is available
  useEffect(() => {
    if (token && verificationStatus === 'loading') {
      verifyEmailMutation.mutate(token);
    }
  }, [token, verificationStatus]);

  if (verificationStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <CardTitle className="text-blue-900">Verifying Email</CardTitle>
              <CardDescription>
                Please wait while we verify your email address...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-green-900">Email Successfully Verified!</CardTitle>
              <CardDescription>
                Congratulations! You have successfully verified your email address. Your account is now active and you can sign in to start using Jail Mail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <Link href="/auth/login">
                  <Button className="w-full" data-testid="button-go-to-login">
                    Return to Sign In
                  </Button>
                </Link>
                
                <Link href="/">
                  <Button variant="ghost" className="w-full" data-testid="button-go-home">
                    Go to Home
                  </Button>
                </Link>
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
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Verification Failed</CardTitle>
            <CardDescription>
              {errorMessage || "This verification link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <ResendVerificationButton />
              
              <Link href="/auth/login">
                <Button variant="ghost" className="w-full" data-testid="button-back-to-login">
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}