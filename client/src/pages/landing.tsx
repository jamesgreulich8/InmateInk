import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { CheckCircle, Mail, CreditCard, FileText, Shield } from "lucide-react";

export default function Landing() {
  const handleGetStarted = () => {
    window.location.href = "/auth/register";
  };

  const handleLogin = () => {
    window.location.href = "/auth/login";
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <div className="pt-10 mx-auto max-w-7xl px-4 sm:pt-12 sm:px-6 md:pt-16 lg:pt-20 lg:px-8 xl:pt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-bold text-slate-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Send letters to</span>
                  <span className="block text-primary xl:inline"> incarcerated loved ones</span>
                </h1>
                <p className="mt-3 text-base text-slate-600 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Professional, reliable mail service that ensures your letters reach incarcerated individuals quickly and securely. Write online, we print and mail.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Button 
                      onClick={handleGetStarted}
                      className="w-full flex items-center justify-center px-8 py-3 text-base font-medium md:py-4 md:text-lg md:px-10"
                    >
                      Start Sending Letters
                    </Button>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Button 
                      variant="outline"
                      onClick={handleLogin}
                      className="w-full flex items-center justify-center px-8 py-3 text-base font-medium md:py-4 md:text-lg md:px-10"
                    >
                      Sign In
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <img 
            className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full" 
            src="https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=800" 
            alt="Person writing a letter at a desk with professional stationery"
          />
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-primary font-semibold tracking-wide uppercase">How it Works</h2>
            <p className="mt-2 text-3xl leading-8 font-bold tracking-tight text-slate-900 sm:text-4xl">
              Simple, Secure Letter Delivery
            </p>
            <p className="mt-4 max-w-2xl text-xl text-slate-600 lg:mx-auto">
              Our streamlined process ensures your letters are delivered professionally and on time.
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white mx-auto">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg leading-6 font-medium text-slate-900">Write Your Letter</h3>
                <p className="mt-2 text-base text-slate-600">
                  Compose your message using our easy-to-use letter editor or upload a document.
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white mx-auto">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg leading-6 font-medium text-slate-900">Add Recipient Details</h3>
                <p className="mt-2 text-base text-slate-600">
                  Enter the inmate's information including facility details and mailing address.
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white mx-auto">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg leading-6 font-medium text-slate-900">Make Payment</h3>
                <p className="mt-2 text-base text-slate-600">
                  Choose between pay-per-letter or subscribe for weekly letter allowances.
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white mx-auto">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg leading-6 font-medium text-slate-900">We Print & Mail</h3>
                <p className="mt-2 text-base text-slate-600">
                  Your letter is professionally printed on quality paper and mailed within 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sm:text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-xl text-slate-600">
              Choose the option that works best for your needs
            </p>
          </div>

          <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
            {/* Pay Per Letter */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Pay Per Letter</h3>
                <p className="mt-4 text-sm text-slate-600">Perfect for occasional correspondence</p>
                <p className="mt-8">
                  <span className="text-4xl font-bold text-slate-900">$2.99</span>
                  <span className="text-base font-medium text-slate-600">/letter</span>
                </p>
                <Button 
                  onClick={handleGetStarted}
                  className="mt-8 w-full"
                >
                  Send a Letter
                </Button>
                
                <div className="pt-6 mt-6 border-t border-slate-200">
                  <h4 className="text-xs font-medium text-slate-900 tracking-wide uppercase">What's included</h4>
                  <ul className="mt-6 space-y-4">
                    {[
                      "Professional printing on quality paper",
                      "First-class mail delivery", 
                      "Delivery tracking",
                      "Content compliance filtering"
                    ].map((feature) => (
                      <li key={feature} className="flex space-x-3">
                        <CheckCircle className="flex-shrink-0 h-5 w-5 text-emerald-500" />
                        <span className="text-sm text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Subscription */}
            <Card className="border-primary-200 shadow-sm relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-primary text-white">
                  Most Popular
                </span>
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Monthly Subscription</h3>
                <p className="mt-4 text-sm text-slate-600">For regular correspondence - 1 letter per week</p>
                <p className="mt-8">
                  <span className="text-4xl font-bold text-slate-900">$9.99</span>
                  <span className="text-base font-medium text-slate-600">/month</span>
                </p>
                <Button 
                  onClick={handleGetStarted}
                  className="mt-8 w-full"
                >
                  Subscribe Now
                </Button>
                
                <div className="pt-6 mt-6 border-t border-slate-200">
                  <h4 className="text-xs font-medium text-slate-900 tracking-wide uppercase">What's included</h4>
                  <ul className="mt-6 space-y-4">
                    {[
                      "Up to 4 letters per month (1 per week)",
                      "All pay-per-letter features included",
                      "Priority customer support",
                      "Cancel anytime"
                    ].map((feature) => (
                      <li key={feature} className="flex space-x-3">
                        <CheckCircle className="flex-shrink-0 h-5 w-5 text-emerald-500" />
                        <span className="text-sm text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">JM</span>
                </div>
                <span className="ml-3 text-xl font-semibold text-slate-900">Jail Mail</span>
              </div>
              <p className="mt-4 text-slate-600">
                Professional letter delivery service connecting families with their incarcerated loved ones through secure, reliable mail service.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-wider uppercase">Support</h3>
              <ul className="mt-4 space-y-4">
                {["FAQ", "Contact Support", "Facility Guidelines", "Compliance Policy"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-base text-slate-600 hover:text-slate-900">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-wider uppercase">Legal</h3>
              <ul className="mt-4 space-y-4">
                {["Terms of Service", "Privacy Policy", "Refund Policy", "Content Guidelines"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-base text-slate-600 hover:text-slate-900">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-8 border-t border-slate-200 pt-8">
            <p className="text-base text-slate-500 text-center">
              © 2023 Jail Mail. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
