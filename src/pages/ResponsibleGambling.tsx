import React from 'react';
import { ArrowLeft, Shield, AlertTriangle, Clock, Users, Heart, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ResponsibleGambling() {
  const navigate = useNavigate();

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
          <h1 className="text-4xl font-bold text-white mb-2">Responsible Gambling</h1>
          <p className="text-slate-400">Your well-being matters more than the game</p>
        </div>

        {/* Content */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 space-y-6">
          
          {/* Introduction */}
          <section>
            <p className="text-slate-300 leading-relaxed">
              At Aura Wave Casino, we are committed to promoting responsible play. While our platform uses virtual coins and simulated games with no real-world monetary value, we recognize that gambling-like activities can still affect behavior and well-being.
            </p>
          </section>

          {/* Our Commitment */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Shield className="h-6 w-6 mr-3" />
              Our Commitment
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Aura Wave Casino is designed strictly for entertainment purposes. We do not offer real-money gambling or any form of financial reward. However, we encourage all players to use our site in a healthy, balanced, and recreational manner.
            </p>
          </section>

          {/* Stay in Control */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Clock className="h-6 w-6 mr-3" />
              Stay in Control
            </h2>
            <p className="text-slate-300 mb-4">
              To ensure you are enjoying the experience responsibly:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Set personal limits on time and frequency of play.</li>
              <li>Treat your coins as entertainment credits, not a way to "win" anything.</li>
              <li>Avoid playing when feeling stressed, upset, or under the influence of substances.</li>
              <li>Take breaks regularly and don't let gameplay interfere with real-life responsibilities or relationships.</li>
            </ul>
          </section>

          {/* Signs of Problematic Behavior */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-3" />
              Signs of Problematic Behavior
            </h2>
            <p className="text-slate-300 mb-4">
              Even in a simulated environment, users may experience behaviors similar to those found in gambling addiction. Watch for these warning signs:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Feeling the need to play continuously to "win back" coins</li>
              <li>Playing longer than intended or lying about your activity</li>
              <li>Losing interest in other hobbies or obligations</li>
              <li>Playing despite negative consequences (social, emotional, or otherwise)</li>
            </ul>
          </section>

          {/* What You Can Do */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Heart className="h-6 w-6 mr-3" />
              What You Can Do
            </h2>
            <p className="text-slate-300 mb-4">
              If you feel that your gameplay is becoming unhealthy:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Take a break from the platform</li>
              <li>Contact us to self-exclude or request a cooldown</li>
              <li>Talk to someone — friends, family, or a professional</li>
            </ul>
          </section>

          {/* Resources */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Users className="h-6 w-6 mr-3" />
              Resources (Free & Confidential Help)
            </h2>
            <p className="text-slate-300 mb-4">
              If you or someone you know is struggling, there are international resources that can help:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-accent mb-2">BeGambleAware (UK)</h3>
                <p className="text-slate-300 text-sm mb-2">Free support and advice for problem gambling</p>
                <a 
                  href="https://www.begambleaware.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary hover:text-accent transition-colors text-sm"
                >
                  Visit Website <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-accent mb-2">Gamblers Anonymous (Worldwide)</h3>
                <p className="text-slate-300 text-sm mb-2">12-step program for gambling addiction</p>
                <a 
                  href="https://www.gamblersanonymous.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary hover:text-accent transition-colors text-sm"
                >
                  Visit Website <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-accent mb-2">National Council on Problem Gambling (US)</h3>
                <p className="text-slate-300 text-sm mb-2">US-based support and resources</p>
                <a 
                  href="https://www.ncpgambling.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary hover:text-accent transition-colors text-sm"
                >
                  Visit Website <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-accent mb-2">Gambling Therapy (Global)</h3>
                <p className="text-slate-300 text-sm mb-2">Online support and counseling services</p>
                <a 
                  href="https://www.gamblingtherapy.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary hover:text-accent transition-colors text-sm"
                >
                  Visit Website <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            </div>
          </section>

          {/* Final Note */}
          <section className="bg-slate-800/30 border border-slate-600/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Final Note</h2>
            <p className="text-slate-300 leading-relaxed">
              Your well-being matters more than the game. Aura Wave Casino is here to provide a fun and safe simulated experience. If it ever becomes something more than that, take action. We support your decision to play responsibly — or not at all.
            </p>
          </section>

        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 transform hover:scale-105 border border-primary/30"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Main Page</span>
          </button>
        </div>
      </div>
    </div>
  );
}