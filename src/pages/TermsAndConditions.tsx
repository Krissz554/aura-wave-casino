import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TermsAndConditions() {
  const navigate = useNavigate();
  const location = useLocation();
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Handle hash navigation to scroll to privacy section
  useEffect(() => {
    if (location.hash === '#privacy') {
      const privacySection = document.getElementById('privacy');
      if (privacySection) {
        privacySection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.1)_1px,transparent_0)] bg-[20px_20px]"></div>
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-primary hover:text-accent transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Terms and Conditions</h1>
          <p className="text-slate-400">Effective Date: {today}</p>
          <p className="text-slate-400">Website: https://aura-wave-casino.lovable.app</p>
        </div>

        {/* Content */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 space-y-6">
          
          {/* 1. Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">1. Introduction</h2>
            <p className="text-slate-300 leading-relaxed">
              Welcome to Aura Wave Casino, a simulated gambling platform designed purely for entertainment. 
              By accessing or using our website, you agree to be bound by these Terms and Conditions ("Terms"). 
              If you do not agree, please do not use the site.
            </p>
          </section>

          {/* 2. Eligibility */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">2. Eligibility</h2>
            <p className="text-slate-300 mb-4">To use this website, you must:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Be at least 18 years of age, or the legal age of majority in your jurisdiction (whichever is higher).</li>
              <li>Not be prohibited by any law or regulation from using simulated gambling services.</li>
            </ul>
            <p className="text-slate-300 mt-4">
              We reserve the right to verify your age and deny access to any user found to be underage.
            </p>
          </section>

          {/* 3. Simulated Gambling & No Real-World Value */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">3. Simulated Gambling & No Real-World Value</h2>
            <p className="text-slate-300 mb-4">
              Aura Wave Casino provides simulated games using virtual coins. These coins:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Have no real-world monetary value</li>
              <li>Cannot be redeemed for real money or cryptocurrency</li>
              <li>Are used exclusively for entertainment purposes</li>
            </ul>
            <p className="text-slate-300 mt-4">
              We do not provide opportunities to win real money or prizes of any kind.
            </p>
          </section>

          {/* 4. Account Registration */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">4. Account Registration</h2>
            <p className="text-slate-300 leading-relaxed">
              To play, users must create an account using a valid email, username, and password. 
              You are responsible for maintaining the confidentiality of your login information and for all activity under your account.
            </p>
          </section>

          {/* 5. Virtual Coins & Balances */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">5. Virtual Coins & Balances</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Users may earn virtual coins through activities on the website.</li>
              <li>Balances are persistent and do not reset, except if manually reset by management.</li>
              <li>Admins reserve the right to adjust user balances at any time for any reason, including technical errors or suspected abuse.</li>
              <li>Virtual coins are not currently purchasable, but this may change in the future.</li>
            </ul>
          </section>

          {/* 6. Game Mechanics & Fairness */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">6. Game Mechanics & Fairness</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>All games (e.g., Roulette, Coinflip, Tower, Crash) are simulated and for entertainment only.</li>
              <li>All game outcomes are final. We do not provide compensation for perceived losses, glitches, or unfair results.</li>
              <li>We reserve the right to modify game rules or payouts at any time.</li>
            </ul>
          </section>

          {/* 7. Acceptable Use & Prohibited Behavior */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">7. Acceptable Use & Prohibited Behavior</h2>
            <p className="text-slate-300 mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Use bots, scripts, or automation tools</li>
              <li>Exploit bugs or glitches</li>
              <li>Use multiple accounts</li>
              <li>Use VPNs to evade restrictions or impersonate others</li>
              <li>Harass other users or staff</li>
            </ul>
            <p className="text-slate-300 mt-4">
              Violations may result in warnings, balance resets, temporary suspension, or permanent bans — solely at our discretion.
            </p>
          </section>

          {/* 8. Privacy & Data */}
          <section id="privacy">
            <h2 className="text-2xl font-bold text-primary mb-4">8. Privacy & Data</h2>
            <p className="text-slate-300 leading-relaxed">
              Currently, we collect minimal user data. In the future, we may collect IP addresses, device info, cookies, and other analytics. 
              A separate Privacy Policy will be published once this is implemented.
            </p>
          </section>

          {/* 9. Support & Disputes */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">9. Support & Disputes</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>We will provide a support email for all inquiries. Until then, support may be limited.</li>
              <li>All disputes will be reviewed internally, and our decision is final and binding.</li>
            </ul>
          </section>

          {/* 10. Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">10. Limitation of Liability</h2>
            <p className="text-slate-300 mb-4">
              Aura Wave Casino and its operators shall not be liable for:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Any losses (virtual or otherwise) incurred from playing</li>
              <li>Technical interruptions or downtime</li>
              <li>Unauthorized access to user accounts</li>
              <li>User misuse or abuse of the platform</li>
            </ul>
            <p className="text-slate-300 mt-4">
              Use of the website is at your own risk.
            </p>
          </section>

          {/* 11. Modifications to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">11. Modifications to Terms</h2>
            <p className="text-slate-300 leading-relaxed">
              We reserve the right to update or modify these Terms at any time. Continued use of the platform after changes implies acceptance of the revised Terms.
            </p>
          </section>

          {/* 12. Contact */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">12. Contact</h2>
            <p className="text-slate-300 leading-relaxed">
              For questions or future support, please contact us at:
            </p>
            <p className="text-slate-300 mt-2">
              [Insert Email Once Available]
            </p>
          </section>

        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 text-slate-400 text-sm">
          <p>
            Would you like this exported as a downloadable .txt or .pdf file? 
            I can also generate a Privacy Policy when you're ready to implement tracking or analytics.
          </p>
        </div>
      </div>
    </div>
  );
}