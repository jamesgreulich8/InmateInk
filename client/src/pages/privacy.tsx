import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Privacy() {
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
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="text-gray-600 mt-2">Effective Date: August 24, 2025</p>
          </div>
        </div>

        <Card>
          <CardContent className="prose max-w-none p-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Sender information (name, email, billing details).</li>
              <li>Recipient information (inmate name, ID, facility address).</li>
              <li>Letter content submitted by you.</li>
              <li>Transaction details.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>To process and mail your letters.</li>
              <li>To provide customer support.</li>
              <li>To comply with legal or correctional facility requirements.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Data Sharing</h2>
            <p className="text-gray-700 mb-4">
              We do not sell or rent your data. We may share information only with:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Mail carriers and vendors who help us fulfill services.</li>
              <li>Law enforcement or authorities if required by law.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Data Security</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>We use reasonable safeguards to protect your information.</li>
              <li>No system is 100% secure. We cannot guarantee absolute security.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Data Retention</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>We may retain your data for compliance and business purposes.</li>
              <li>You may request deletion of your personal data, but legal or facility-related requirements may require us to keep certain records.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Policy Updates</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy at any time. Continued use of our service means you accept any updates.
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