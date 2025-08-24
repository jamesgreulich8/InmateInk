import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Check, Mail, Clock, Shield, Star } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Subscribe() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Please sign in",
        description: "You need to sign in to subscribe to our service.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handlePayPerLetter = async () => {
    if (!user) return;
    
    if (!acceptedTerms || !acceptedPrivacy) {
      toast({
        title: "Agreement Required",
        description: "Please accept the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "single_letter",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create payment session");
      }

      const { sessionId } = await response.json();

      if (!sessionId) {
        throw new Error("No session ID received from server");
      }

      // Use the official Stripe redirect method
      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw new Error(error.message || "Payment redirect failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    
    if (!acceptedTerms || !acceptedPrivacy) {
      toast({
        title: "Agreement Required",
        description: "Please accept the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "subscription",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create checkout session");
      }

      const { sessionId } = await response.json();

      if (!sessionId) {
        throw new Error("No session ID received from server");
      }

      // Use the official Stripe redirect method
      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw new Error(error.message || "Subscription redirect failed");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast({
        title: "Subscription Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Choose Your Plan</h1>
            <p className="text-gray-600 mt-2">Select the best option for staying connected with your loved ones</p>
          </div>
        </div>

        {/* Terms and Privacy Agreement */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms and Privacy Agreement</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  data-testid="checkbox-terms"
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                >
                  I have read and agree to the{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    Terms of Service
                  </a>
                </label>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacy"
                  checked={acceptedPrivacy}
                  onCheckedChange={setAcceptedPrivacy}
                  data-testid="checkbox-privacy"
                />
                <label
                  htmlFor="privacy"
                  className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                >
                  I have read and agree to the{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Pay-per-letter option */}
          <Card className="relative border-2 hover:border-blue-200 transition-colors">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Pay Per Letter</CardTitle>
                  <p className="text-gray-600 mt-2">Perfect for occasional messages</p>
                </div>
                <Badge variant="outline">Flexible</Badge>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold text-green-600">FREE</span>
                <span className="text-gray-600 ml-2">for testing</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Send one letter immediately</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>No monthly commitment</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Same-day processing</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Content moderation included</span>
                </li>
              </ul>
              <Button 
                onClick={handlePayPerLetter} 
                variant="outline" 
                className="w-full"
                disabled={isProcessing || !acceptedTerms || !acceptedPrivacy}
                data-testid="button-pay-per-letter"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Single Letter
              </Button>
            </CardContent>
          </Card>

          {/* Monthly subscription option */}
          <Card className="relative border-2 border-blue-500 shadow-lg">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Badge className="bg-blue-600 text-white px-4 py-1">
                <Star className="h-4 w-4 mr-1" />
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Monthly Plan</CardTitle>
                  <p className="text-gray-600 mt-2">Best value for regular communication</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Save 50%</Badge>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold text-blue-600">$9.99</span>
                <span className="text-gray-600 ml-2">per month</span>
              </div>
              <p className="text-sm text-gray-500">Just $2.50 per letter</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Send up to 4 letters per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Priority processing</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Automatic monthly renewal</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Cancel anytime</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Email status updates</span>
                </li>
              </ul>
              <Button 
                onClick={handleSubscribe} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isProcessing || !acceptedTerms || !acceptedPrivacy}
                data-testid="button-subscribe"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Start Monthly Plan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How does the service work?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Write your letter online, and we'll print and mail it to your recipient. All letters are screened for compliance with correctional facility guidelines.
              </p>

              <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600 text-sm mb-4">
                We accept all major credit and debit cards through our secure Stripe payment system.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I cancel my subscription?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Yes, you can cancel your monthly subscription at any time from your dashboard. You'll continue to have access until the end of your billing period.
              </p>

              <h3 className="font-semibold text-gray-900 mb-2">How long does delivery take?</h3>
              <p className="text-gray-600 text-sm">
                Letters are typically processed within 1-2 business days and delivered within 3-5 business days, depending on the facility's location and mail processing times.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}