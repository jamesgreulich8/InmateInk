import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
            <p className="text-gray-600 mt-2">Effective Date: August 24, 2025</p>
          </div>
        </div>

        <Card>
          <CardContent className="prose max-w-none p-8">
            <p className="text-lg text-gray-700 mb-6">
              Welcome to Inmate Mail Service, operated by Cosmic LLC ("we," "our," "us"). 
              By using our service, you ("you," "user," "customer") agree to the following terms:
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. What We Do</h2>
            <p className="text-gray-700 mb-4">
              We format, print, and mail letters to correctional facilities on your behalf. 
              We are not responsible for what happens once the mail is handed to the postal service or reviewed by a facility.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Your Responsibilities</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>You are responsible for the accuracy of inmate information (name, ID, facility, etc.).</li>
              <li>You are fully responsible for the content of your letters.</li>
              <li>You agree not to send material that is illegal, threatening, obscene, harassing, or otherwise prohibited by correctional facility rules.</li>
              <li>We may refuse to process letters that appear to violate these rules.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Facility Compliance</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Every correctional facility has its own mail rules.</li>
              <li>Facilities may inspect, delay, or reject mail at their discretion.</li>
              <li>We cannot guarantee delivery or acceptance.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Payments & Refunds</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Payments are required upfront.</li>
              <li>If we fail to process or mail your letter due to our error, we will re-send or refund your payment.</li>
              <li>If a facility rejects a letter, no refund will be issued.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Liability Limits</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Our maximum liability is the amount you paid for the service.</li>
              <li>We are not liable for rejected, delayed, lost, or censored mail.</li>
              <li>We are not responsible for any consequences that result from your letter content.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Indemnification</h2>
            <p className="text-gray-700 mb-4">
              You agree to indemnify and hold Cosmic LLC (Inmate Mail Service) harmless from any claims, 
              damages, or legal issues arising from your use of our service or your submitted content.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Governing Law</h2>
            <p className="text-gray-700 mb-4">
              These terms are governed by the laws of the State of Rhode Island.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Agreement</h2>
            <p className="text-gray-700 mb-4">
              By using our service, you confirm that you have read, understood, and agreed to these Terms of Service.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
              <p className="text-sm text-gray-700">
                <strong>Contact:</strong> Cosmic LLC<br />
                Email: <a href="mailto:cosmic.company.llc@gmail.com" className="text-blue-600 hover:underline">cosmic.company.llc@gmail.com</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}