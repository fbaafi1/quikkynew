import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions | QuiKart',
  description: 'Terms and Conditions for QuiKart - Ghana\'s premier e-commerce platform connecting customers and vendors.',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="prose prose-lg max-w-none">
        <h1 className="text-3xl font-bold text-primary mb-8">QuiKart Terms & Conditions</h1>

        <p className="text-muted-foreground mb-6">
          <strong>Last Updated:</strong> October 2025
        </p>

        <p className="mb-6">
          Welcome to QuiKart — a Ghana-based e-commerce platform connecting customers and vendors for product discovery and local shopping convenience.
          By using QuiKart, you agree to these Terms & Conditions. Please read them carefully before using the platform.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">1. General Terms of Use</h2>
        <p className="mb-4">
          By accessing or using QuiKart, you agree to:
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Use the platform only for lawful purposes.</li>
          <li>Provide accurate information during account registration and transactions.</li>
          <li>Refrain from misusing the website, uploading harmful content, or attempting to defraud vendors or customers.</li>
          <li>Understand that QuiKart serves only as an intermediary connecting vendors and customers — not as a direct seller.</li>
        </ul>
        <p className="mb-6">
          QuiKart reserves the right to update these terms at any time. Continued use of the platform means you accept any modifications.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">2. Vendor Terms</h2>
        <p className="mb-4">
          As a vendor on QuiKart:
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>You are responsible for the accuracy of your product listings, descriptions, and prices.</li>
          <li>You must ensure timely communication and fair dealing with customers.</li>
          <li>You must comply with Ghana's business and consumer protection laws.</li>
          <li>You acknowledge that QuiKart does not collect payments or handle logistics on your behalf.</li>
          <li>Any disputes with customers must be resolved directly between you and the buyer.</li>
        </ul>
        <p className="mb-6">
          QuiKart may suspend or remove vendors who violate platform rules, engage in fraudulent activity, or receive repeated customer complaints.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">3. Customer Terms</h2>
        <p className="mb-4">
          As a customer:
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>You are responsible for verifying the credibility of vendors before making purchases.</li>
          <li>You agree to make payments only after receiving your order or based on an agreed arrangement with the vendor.</li>
          <li>You acknowledge that QuiKart is not responsible for any product, payment, or delivery disputes between you and the vendor.</li>
          <li>You must use genuine contact information for smooth communication with sellers.</li>
        </ul>
        <p className="mb-6">
          QuiKart encourages customers to leave honest reviews and report any fraudulent vendors to help maintain a safe marketplace.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">4. Payment Policy</h2>
        <p className="mb-4">
          <strong>No Online Payment on QuiKart</strong>
        </p>
        <p className="mb-4">
          QuiKart does not support online payment at the moment.
        </p>
        <p className="mb-4">
          All payments occur directly between customers and vendors, based on mutual agreement.
        </p>
        <p className="mb-4">
          This means:
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Customers pay after delivery or under an agreed arrangement with the vendor.</li>
          <li>QuiKart does not act as an escrow or payment intermediary.</li>
          <li>QuiKart does not store or process payment information (e.g., card details, mobile money, or bank details).</li>
          <li>QuiKart is not liable for any loss, fraud, or failed transaction that occurs outside the platform.</li>
        </ul>
        <p className="mb-6">
          By using QuiKart, you agree to make any payments at your own risk, and to verify vendor authenticity before sending money.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">5. Privacy Policy</h2>
        <p className="mb-4">
          QuiKart values your privacy and ensures that your data is protected.
        </p>
        <p className="mb-4">
          We collect limited information such as your name, email, contact number, and browsing activity to improve your experience.
        </p>
        <p className="mb-4">
          We do not sell, rent, or share your data with third parties, except:
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>When required by law.</li>
          <li>When necessary to operate the platform (e.g., sending confirmation emails).</li>
        </ul>
        <p className="mb-4">
          You have the right to:
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Request access or deletion of your personal data.</li>
          <li>Opt out of promotional messages.</li>
        </ul>
        <p className="mb-6">
          For more details or data requests, contact us at:<br />
          📧 <a href="mailto:support@quikart.com" className="text-primary hover:underline">support@quikart.com</a>
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">6. Disclaimer</h2>
        <p className="mb-6">
          QuiKart is a marketplace platform, not the owner of products listed by vendors.
        </p>
        <p className="mb-6">
          We do not guarantee the quality, legality, or safety of any product or service offered by vendors.
        </p>
        <p className="mb-6">
          Use the platform at your own discretion and responsibility.
        </p>

        <h2 className="text-2xl font-semibold text-primary mb-4">7. Contact Information</h2>
        <p className="mb-6">
          If you have questions or complaints about these Terms or our policies, contact:
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
