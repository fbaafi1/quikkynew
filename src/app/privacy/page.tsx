import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | QuiKart',
  description: 'Privacy Policy for QuiKart - How we collect, use, and protect your personal information.',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="prose prose-lg max-w-none">
        <h1 className="text-3xl font-bold text-primary mb-8">QuiKart Privacy Policy</h1>

        <p className="text-muted-foreground mb-6">
          <strong>Last Updated:</strong> October 2025
        </p>

        <p className="mb-6">
          QuiKart values your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our platform.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">1. Information We Collect</h2>
        <p className="mb-4">
          We collect the following types of information:
        </p>

        <h3 className="text-xl font-semibold mb-3">Personal Information</h3>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Name and contact information (email, phone number)</li>
          <li>Account credentials (username, password)</li>
          <li>Profile information you choose to provide</li>
          <li>Communication preferences</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">Usage Information</h3>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Pages visited and features used</li>
          <li>Time spent on the platform</li>
          <li>Search queries and product interactions</li>
          <li>Device and browser information</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">Transaction Information</h3>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Products viewed or added to cart</li>
          <li>Vendor interactions and communications</li>
          <li>Review and rating submissions</li>
        </ul>

        <h2 className="text-2xl font-semibold text-primary mb-4">2. How We Use Your Information</h2>
        <p className="mb-4">
          We use your information to:
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Provide and maintain our services</li>
          <li>Process and facilitate transactions between customers and vendors</li>
          <li>Improve user experience and platform functionality</li>
          <li>Communicate with you about your account and our services</li>
          <li>Ensure platform security and prevent fraud</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 className="text-2xl font-semibold text-primary mb-4">3. Information Sharing</h2>
        <p className="mb-4">
          We do not sell, rent, or share your personal information with third parties, except:
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li><strong>With Vendors:</strong> Necessary contact information to facilitate transactions</li>
          <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
          <li><strong>Service Providers:</strong> Third-party services that help us operate (with strict confidentiality agreements)</li>
          <li><strong>Business Transfers:</strong> In case of merger, acquisition, or asset sale</li>
        </ul>

        <h2 className="text-2xl font-semibold text-primary mb-4">4. Data Security</h2>
        <p className="mb-6">
          We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">5. Your Rights</h2>
        <p className="mb-4">
          You have the following rights regarding your personal information:
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li><strong>Access:</strong> Request information about what data we hold about you</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal requirements)</li>
          <li><strong>Restriction:</strong> Request limitation of processing in certain circumstances</li>
          <li><strong>Portability:</strong> Request a copy of your data in a structured format</li>
          <li><strong>Objection:</strong> Object to processing for direct marketing purposes</li>
        </ul>

        <h2 className="text-2xl font-semibold text-primary mb-4">6. Cookies and Tracking</h2>
        <p className="mb-4">
          We use cookies and similar technologies to:
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Remember your preferences and settings</li>
          <li>Analyze website traffic and usage patterns</li>
          <li>Improve our services and user experience</li>
          <li>Provide personalized content and recommendations</li>
        </ul>
        <p className="mb-6">
          You can control cookie settings through your browser preferences. Note that disabling certain cookies may affect platform functionality.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">7. Data Retention</h2>
        <p className="mb-6">
          We retain your personal information only as long as necessary for the purposes outlined in this policy or as required by law. When data is no longer needed, we securely delete or anonymize it.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">8. International Data Transfers</h2>
        <p className="mb-6">
          As a Ghana-based platform, your data is primarily stored and processed in Ghana. If data transfer to other countries becomes necessary, we ensure appropriate safeguards are in place to protect your information.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">9. Changes to This Policy</h2>
        <p className="mb-6">
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the "Last Updated" date.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">10. Contact Us</h2>
        <p className="mb-6">
          If you have any questions about this Privacy Policy or how we handle your personal information, please contact us:
        </p>
        <ul className="list-none mb-6 space-y-2">
          <li>📞 Phone: <a href="tel:+233506566191" className="text-primary hover:underline">+233 50 656 6191</a></li>
          <li>📧 Email: <a href="mailto:support@quikart.com" className="text-primary hover:underline">support@quikart.com</a></li>
          <li>📍 Address: Accra, Ghana</li>
        </ul>

        <p className="text-sm text-muted-foreground mt-8 pt-8 border-t">
          &copy; {new Date().getFullYear()} QuiKart. All rights reserved.
        </p>
      </div>
    </div>
  );
}
