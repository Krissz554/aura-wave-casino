import { Link } from 'react-router-dom';
import { Shield, Users, FileText, Mail, Clock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Provably Fair Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Provably Fair
            </h3>
            <div className="space-y-2">
              <Link 
                to="/provably-fair" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </Link>
              <Link 
                to="/provably-fair" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Verify Results
              </Link>
              <Link 
                to="/provably-fair" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cryptographic Proof
              </Link>
            </div>
          </div>

          {/* Community Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Community
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-md font-mono">COMING SOON</span>
            </h3>
            <div className="space-y-2">
              <a 
                href="#" 
                className="block text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-not-allowed"
                onClick={(e) => e.preventDefault()}
              >
                Discord <Clock className="inline w-3 h-3 text-orange-400 ml-1" />
              </a>
              <a 
                href="#" 
                className="block text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-not-allowed"
                onClick={(e) => e.preventDefault()}
              >
                Telegram <Clock className="inline w-3 h-3 text-orange-400 ml-1" />
              </a>
              <a 
                href="#" 
                className="block text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-not-allowed"
                onClick={(e) => e.preventDefault()}
              >
                Twitter <Clock className="inline w-3 h-3 text-orange-400 ml-1" />
              </a>
            </div>
          </div>

          {/* Legal Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-400" />
              Legal
            </h3>
            <div className="space-y-2">
              <Link 
                to="/terms" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link 
                to="/terms#privacy" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/responsible-gambling" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Responsible Gaming
              </Link>
            </div>
          </div>

          {/* Support Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-400" />
              Support
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-md font-mono">COMING SOON</span>
            </h3>
            <div className="space-y-2">
              <a 
                href="#" 
                className="block text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-not-allowed"
                onClick={(e) => e.preventDefault()}
              >
                Help Center <Clock className="inline w-3 h-3 text-orange-400 ml-1" />
              </a>
              <a 
                href="#" 
                className="block text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-not-allowed"
                onClick={(e) => e.preventDefault()}
              >
                Contact Us <Clock className="inline w-3 h-3 text-orange-400 ml-1" />
              </a>
              <a 
                href="#" 
                className="block text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-not-allowed"
                onClick={(e) => e.preventDefault()}
              >
                Bug Reports <Clock className="inline w-3 h-3 text-orange-400 ml-1" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            © 2024 Aura Wave Casino. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 md:mt-0">
                          <span className="text-xs bg-muted px-2 py-1 rounded-md font-mono">v1.0.9</span>
            <span>🛡️ Cryptographically Secure & Provably Fair</span>
          </div>
        </div>
      </div>
    </footer>
  );
}