import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  ArrowLeft, 
  Lock, 
  Hash, 
  Clock, 
  Calculator, 
  Eye, 
  CheckCircle,
  AlertTriangle,
  Terminal,
  Cpu,
  Database,
  Zap
} from 'lucide-react';

export function ProvablyFair() {
  const [isPageVisible, setIsPageVisible] = useState(false);

  // Smooth page entrance animation
  useEffect(() => {
    setIsPageVisible(true);
  }, []);
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Cyberpunk Background Effects */}
      <div className="fixed inset-0 z-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        
        {/* Circuit pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.03)_25%,rgba(99,102,241,0.03)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.03)_75%,rgba(99,102,241,0.03)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.03)_25%,rgba(99,102,241,0.03)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.03)_75%,rgba(99,102,241,0.03)_76%,transparent_77%,transparent)] bg-[length:20px_20px] opacity-50" />
        
        {/* Animated grid */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[length:100px_100px] animate-[grid-move-slow_30s_linear_infinite]" />
        
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-indigo-400/40 rounded-full animate-[float_6s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-cyan-400/60 rounded-full animate-[float_8s_ease-in-out_infinite_1s]" />
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-purple-400/50 rounded-full animate-[float_7s_ease-in-out_infinite_2s]" />
        <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-indigo-400/40 rounded-full animate-[float_9s_ease-in-out_infinite_3s]" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        
         {/* Cyberpunk Header */}
         <div className="mb-12">
           <Link to="/">
             <Button className="mb-6 bg-gradient-to-r from-slate-700/80 via-slate-600/80 to-slate-700/80 hover:from-indigo-600/80 hover:via-purple-600/80 hover:to-indigo-600/80 border border-slate-400/30 hover:border-indigo-400/50 text-slate-200 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 font-mono tracking-wider">
               <ArrowLeft className="w-4 h-4 mr-2" />
               RETURN_TO_PROTOCOL
             </Button>
           </Link>
           
           <div className="text-center space-y-6">
             {/* Main Title */}
             <div className="relative">
               <div className="flex items-center justify-center gap-4 mb-4">
                 <div className="relative">
                   <Shield className="w-16 h-16 text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
                   <div className="absolute inset-0 border border-indigo-400/30 rounded-full animate-pulse" />
                   <div className="absolute -inset-2 border border-indigo-400/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                 </div>
                 <h1 className="text-5xl font-bold font-mono tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
                   PROVABLY_FAIR_PROTOCOL
                 </h1>
               </div>
               
               {/* Subtitle */}
               <p className="text-xl text-slate-300 max-w-4xl mx-auto font-mono leading-relaxed">
                 <span className="text-indigo-400">//</span> CRYPTOGRAPHIC_VERIFICATION_SYSTEM<br />
                 <span className="text-slate-400 text-lg">
                   Complete transparency through mathematical proof. Every result predetermined, 
                   verifiable, and mathematically impossible to manipulate.
                 </span>
               </p>
               
               {/* Status Badge */}
               <div className="flex justify-center mt-6">
                 <div className="relative">
                   <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-emerald-500/20 rounded-lg" />
                   <div className="relative border border-emerald-500/40 rounded-lg px-6 py-3">
                     <div className="flex items-center gap-3">
                       <div className="relative">
                         <Terminal className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                         <div className="absolute inset-0 border border-emerald-400/20 rounded animate-pulse" />
                       </div>
                       <span className="text-emerald-300 font-mono font-bold tracking-wider">
                         CRYPTOGRAPHICALLY_SECURE
                       </span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Cyberpunk How It Works */}
           <div className="relative">
             {/* Background Effects */}
             <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-cyan-500/20 rounded-lg" />
             <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[length:12px_12px] opacity-40" />
             
             <div className="relative border border-indigo-500/30 rounded-lg p-6">
               {/* Scan Line Animation */}
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent translate-x-[-100%] animate-[cyber-scan_3s_ease-in-out_infinite] rounded-lg" />
               
               {/* Header */}
               <div className="relative z-10 mb-6">
                 <div className="flex items-center gap-3 mb-4">
                   <div className="relative">
                     <Calculator className="w-6 h-6 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                     <div className="absolute inset-0 border border-indigo-400/20 rounded animate-pulse" />
                   </div>
                   <h2 className="text-xl font-bold font-mono tracking-wider text-white">
                     SYSTEM_OPERATION_PROTOCOL
                   </h2>
                 </div>
               </div>
               
               <div className="relative z-10 space-y-6">
              
                <div className="space-y-5">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-md bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-emerald-300 font-bold font-mono">01</span>
                      </div>
                      <div className="absolute inset-0 border border-emerald-400/20 rounded-md animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-emerald-300 font-mono tracking-wider mb-2">DAILY_SEED_GENERATION</h4>
                      <p className="text-sm text-slate-400 font-mono leading-relaxed">
                        Every 24 hours, new server seed (64 chars) and lotto number (10 digits) 
                        are generated. Immediately hashed with SHA-256 and published to blockchain.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-blue-300 font-bold font-mono">02</span>
                      </div>
                      <div className="absolute inset-0 border border-blue-400/20 rounded-md animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-blue-300 font-mono tracking-wider mb-2">RESULT_PRE_CALCULATION</h4>
                      <p className="text-sm text-slate-400 font-mono leading-relaxed mb-2">
                        Before any bets are placed, each round's result is calculated using:
                      </p>
                      <code className="bg-slate-800/60 border border-slate-600/40 px-3 py-1 rounded text-xs text-cyan-300 font-mono block">
                        hash(server_seed + "-" + lotto + "-" + round_number)
                      </code>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-md bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-orange-300 font-bold font-mono">03</span>
                      </div>
                      <div className="absolute inset-0 border border-orange-400/20 rounded-md animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-orange-300 font-mono tracking-wider mb-2">CRYPTOGRAPHIC_PROOF</h4>
                      <p className="text-sm text-slate-400 font-mono leading-relaxed">
                        SHA-256 hash creates irreversible mathematical proof. First 8 characters 
                        converted to number, then modulo 15 gives final result (0-14).
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-md bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-purple-300 font-bold font-mono">04</span>
                      </div>
                      <div className="absolute inset-0 border border-purple-400/20 rounded-md animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-purple-300 font-mono tracking-wider mb-2">PUBLIC_VERIFICATION</h4>
                      <p className="text-sm text-slate-400 font-mono leading-relaxed">
                        After each round, server seed is revealed. Anyone can verify result 
                        using same mathematical formula. Zero trust required.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

           {/* Cyberpunk Why Trust It */}
           <div className="relative">
             {/* Background Effects */}
             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-emerald-500/20 rounded-lg" />
             <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(34,197,94,0.1)_25%,rgba(34,197,94,0.1)_26%,transparent_27%,transparent_74%,rgba(34,197,94,0.1)_75%,rgba(34,197,94,0.1)_76%,transparent_77%,transparent)] bg-[length:12px_12px] opacity-40" />
             
             <div className="relative border border-emerald-500/30 rounded-lg p-6">
               {/* Scan Line Animation */}
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent translate-x-[-100%] animate-[cyber-scan_3s_ease-in-out_infinite_1s] rounded-lg" />
               
               {/* Header */}
               <div className="relative z-10 mb-6">
                 <div className="flex items-center gap-3 mb-4">
                   <div className="relative">
                     <Lock className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                     <div className="absolute inset-0 border border-emerald-400/20 rounded animate-pulse" />
                   </div>
                   <h2 className="text-xl font-bold font-mono tracking-wider text-white">
                     TRUST_VERIFICATION_SYSTEM
                   </h2>
                 </div>
               </div>
               
               <div className="relative z-10 space-y-4">
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Predetermined Results</h4>
                  <p className="text-sm text-muted-foreground">
                    Results are calculated before any bets are placed, making manipulation impossible.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Open Source Math</h4>
                  <p className="text-sm text-muted-foreground">
                    The verification formula is public and can be tested by anyone with basic programming knowledge.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Cryptographic Security</h4>
                  <p className="text-sm text-muted-foreground">
                    SHA-256 is the same encryption used by Bitcoin and banks worldwide.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Daily Seed Rotation</h4>
                  <p className="text-sm text-muted-foreground">
                    Fresh seeds every 24 hours ensure maximum randomness and security.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-emerald-400 flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4" />
                  Instant Verification
                </h4>
                <p className="text-sm text-muted-foreground">
                  Click the shield icon (🛡️) on any game or the result history to see the mathematical 
                  proof for any round. No trust required - verify everything yourself!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How to Verify */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-orange-400" />
                How to Verify Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-3">
                <h4 className="font-semibold">Step 1: Access Verification</h4>
                <p className="text-sm text-muted-foreground">
                  Click the shield icon (🛡️) in any game or click on any result in the history.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Step 2: Check the Data</h4>
                <p className="text-sm text-muted-foreground">
                  You'll see the server seed, lotto number, round ID, and the SHA-256 hash.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Step 3: Verify Manually (Optional)</h4>
                <div className="bg-muted/50 rounded-lg p-3">
                  <code className="text-xs block text-muted-foreground">
                    // JavaScript verification example<br />
                    const input = `$&#123;serverSeed&#125;-$&#123;lotto&#125;-$&#123;roundId&#125;`;<br />
                    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));<br />
                    const result = parseInt(hashHex.substring(0, 8), 16) % 15;
                  </code>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Step 4: Compare Results</h4>
                <p className="text-sm text-muted-foreground">
                  The calculated result should match the actual game result. If they match, 
                  the round was provably fair!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Daily Seeds Info */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Daily Seed System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-3">
                <h4 className="font-semibold">24-Hour Cycles</h4>
                <p className="text-sm text-muted-foreground">
                  Every day at midnight UTC, new server seeds and lotto numbers are generated 
                  for maximum randomness and security.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Immediate Commitment</h4>
                <p className="text-sm text-muted-foreground">
                  The moment new seeds are generated, their SHA-256 hashes are published. 
                  This proves the seeds existed before any games were played.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Public Revelation</h4>
                <p className="text-sm text-muted-foreground">
                  After 24 hours, the actual seeds are revealed so players can verify 
                  all games from that day.
                </p>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-purple-400 text-sm">Immutable Security</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Once a seed is published (hashed), it cannot be changed without breaking 
                      the cryptographic proof. This guarantees fairness.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Experience Provably Fair Gaming?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Every spin, every bet, every result - completely transparent and verifiable. 
              Join thousands of players who trust our cryptographically secure platform.
            </p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out">
                Start Playing Now
                <Shield className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}