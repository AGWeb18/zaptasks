// app/legal/page.tsx
import React from 'react';
import Link from 'next/link';

const LegalPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Legal Information</h1>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-2xl font-semibold mb-4">Terms of Service</h2>
            <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
            <div className="prose max-w-none">
              <p>Welcome to ZapTasks. By using our service, you agree to these terms. Please read them carefully.</p>
              
              <h3>1. Acceptance of Terms</h3>
              <p>By accessing or using ZapTasks, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our service.</p>
              
              <h3>2. Description of Service</h3>
              <p>ZapTasks is a platform that connects users with service providers for various tasks. We do not provide the services ourselves but facilitate the connection between users and providers.</p>
              
              <h3>3. User Responsibilities</h3>
              <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>
              
              <h3>4. Service Provider Responsibilities</h3>
              <p>Service providers are independent contractors and not employees of ZapTasks. They are responsible for the quality of their work and compliance with all applicable laws and regulations.</p>
              
              <h3>5. Payments and Fees</h3>
              <p>ZapTasks charges a fee for facilitating connections between users and service providers. All fees are clearly displayed before a transaction is completed.</p>
              
              <h3>6. Limitation of Liability</h3>
              <p>ZapTasks is not liable for any direct, indirect, incidental, special, consequential or exemplary damages resulting from your use of the service.</p>
              
              <h3>7. Changes to Terms</h3>
              <p>We reserve the right to modify these terms at any time. We will provide notice of significant changes by posting an announcement on our website.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-2xl font-semibold mb-4">Privacy Policy</h2>
            <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
            <div className="prose max-w-none">
              <p>Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information.</p>
              
              <h3>1. Information We Collect</h3>
              <p>We collect information you provide directly to us, such as when you create an account, request a service, or contact customer support. This may include your name, email address, phone number, and location.</p>
              
              <h3>2. How We Use Your Information</h3>
              <p>We use your information to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and respond to your comments and questions.</p>
              
              <h3>3. Information Sharing</h3>
              <p>We share your information with service providers as necessary to provide our service. We may also share information to comply with legal obligations or to protect our rights.</p>
              
              <h3>4. Data Security</h3>
              <p>We implement reasonable security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.</p>
              
              <h3>5. Your Rights</h3>
              <p>You have the right to access, correct, or delete your personal information. You may also have the right to restrict or object to certain processing of your data.</p>
              
              <h3>6. Changes to This Policy</h3>
              <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
              
              <h3>7. Contact Us</h3>
              <p>If you have any questions about this Privacy Policy, please contact us at privacy@zaptasks.com.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;