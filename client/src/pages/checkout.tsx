import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Navigation } from "@/components/Navigation";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

// Load Stripe outside render
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptedTerms || !acceptedPrivacy) {
      toast({
        title: "Agreement Required",
        description: "Please accept the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    if (!stripe || !elements) {
      toast({
        title: "Stripe not loaded",
        description: "Please wait for the payment form to load.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
        <p className="text-sm text-slate-600">
          Secure payment processing powered by Stripe
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PaymentElement />
          
          {/* Terms and Privacy Agreement */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Agreement Required</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="checkout-terms"
                  checked={acceptedTerms}
                  onCheckedChange={setAcceptedTerms}
                  data-testid="checkbox-checkout-terms"
                />
                <label
                  htmlFor="checkout-terms"
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
                  id="checkout-privacy"
                  checked={acceptedPrivacy}
                  onCheckedChange={setAcceptedPrivacy}
                  data-testid="checkbox-checkout-privacy"
                />
                <label
                  htmlFor="checkout-privacy"
                  className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                >
                  I have read and agree to the{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                </label>
              </div>
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={!stripe || isLoading || !acceptedTerms || !acceptedPrivacy}
            className="w-full"
            data-testid="button-checkout-submit"
          >
            {isLoading ? "Processing..." : "Pay $2.99"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Amount must be in cents for Stripe
    apiRequest("POST", "/api/create-payment-intent", { amount: 299 })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to create PaymentIntent");
        const data = await res.json();
        if (!data.clientSecret) throw new Error("No client secret returned");
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to initialize payment",
          variant: "destructive",
        });
      });
  }, [toast]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation authenticated />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation authenticated />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8 flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
              <p className="mt-1 text-sm text-slate-600">
                Complete your payment to send your letter
              </p>
            </div>
          </div>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
        </div>
      </div>
    </div>
  );
}
