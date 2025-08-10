import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Check, Mail, Clock, Shield, Star } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Subscribe() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleSubscribe = async () => {
    if (!user) return;
    
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
          priceId: "price_monthly_subscription", // We'll create this price ID in Stripe
        }),
      });

      const { sessionId } = await response.json();

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const result = await stripe.redirectToCheckout({
        sessionId,
      });

      if (result.error) {
        throw new Error(result.error.message);
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

  // If user already has active subscription
  if (user?.subscriptionStatus === 'active') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">You're Already Subscribed!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Your subscription is active and you have access to all premium features.
              </p>
              <div className="flex justify-center space-x-4">
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
                <Link href="/compose">
                  <Button variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Compose Letter
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
            <p className="text-lg text-gray-600">Stay connected with your loved ones</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Pay-per-letter option */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-xl">Pay Per Letter</CardTitle>
              <div className="text-3xl font-bold">$3.99 <span className="text-base font-normal text-gray-600">per letter</span></div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Send individual letters</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>No monthly commitment</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Professional printing & delivery</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Content moderation included</span>
                </li>
              </ul>
              <Link href="/compose">
                <Button variant="outline" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Single Letter
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Monthly subscription option */}
          <Card className="relative border-blue-200 shadow-lg">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Badge className="bg-blue-600 text-white px-4 py-1">
                <Star className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            <CardHeader className="pt-8">
              <CardTitle className="text-xl">Monthly Subscription</CardTitle>
              <div className="text-3xl font-bold text-blue-600">
                $9.99 <span className="text-base font-normal text-gray-600">per month</span>
              </div>
              <p className="text-sm text-gray-600">Save 37% compared to individual letters</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span className="font-medium">4 letters per month included</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Professional printing & delivery</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Priority customer support</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Advanced content moderation</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Cancel anytime</span>
                </li>
              </ul>
              <Button 
                onClick={handleSubscribe} 
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
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

        <Separator className="my-8" />

        {/* Features section */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-center mb-6">Why Choose Our Service?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Secure & Compliant</h3>
              <p className="text-gray-600 text-sm">Advanced content filtering ensures your letters meet all correctional facility requirements.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Professional Delivery</h3>
              <p className="text-gray-600 text-sm">Your letters are professionally printed on quality paper and delivered directly to the facility.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Fast Processing</h3>
              <p className="text-gray-600 text-sm">Most letters are processed and sent within 1-2 business days of submission.</p>
            </div>
          </div>
        </div>

        {/* FAQ section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">How does the monthly subscription work?</h3>
              <p className="text-gray-600 text-sm">Your subscription includes 4 letters per month. Unused letters don't roll over to the next month.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Can I cancel my subscription anytime?</h3>
              <p className="text-gray-600 text-sm">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">What if my letter is rejected?</h3>
              <p className="text-gray-600 text-sm">If a letter doesn't meet facility requirements, we'll notify you with specific feedback so you can revise and resubmit.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">How long does delivery take?</h3>
              <p className="text-gray-600 text-sm">Letters are typically processed within 1-2 business days and delivered within 3-5 business days depending on the facility.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}