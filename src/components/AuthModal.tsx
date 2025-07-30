
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, User, Mail, Eye, EyeOff, Cpu, Terminal, Shield, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    acceptTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      toast({
        title: "AUTHENTICATION ERROR",
        description: "All fields required for system access",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(loginData.email, loginData.password);
      
      if (error) {
        toast({
          title: "ACCESS DENIED",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      onClose();
      toast({
        title: "ACCESS GRANTED",
        description: "System login successful",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "SYSTEM ERROR",
        description: "Authentication service unavailable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerData.username || !registerData.email || !registerData.password || !registerData.confirmPassword) {
      toast({
        title: "REGISTRATION ERROR",
        description: "All fields required for account creation",
        variant: "destructive",
      });
      return;
    }

    if (!registerData.acceptTerms) {
      toast({
        title: "TERMS NOT ACCEPTED",
        description: "You must accept the Terms and Conditions to register",
        variant: "destructive",
      });
      return;
    }

    // Import validation functions
    const { validateUsername, validateEmail, validatePassword } = await import('@/lib/utils');
    
    // Validate username
    const usernameValidation = validateUsername(registerData.username);
    if (!usernameValidation.isValid) {
      toast({
        title: "INVALID USERNAME",
        description: usernameValidation.error,
        variant: "destructive",
      });
      return;
    }

    // Validate email
    const emailValidation = validateEmail(registerData.email);
    if (!emailValidation.isValid) {
      toast({
        title: "INVALID EMAIL",
        description: emailValidation.error,
        variant: "destructive",
      });
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(registerData.password);
    if (!passwordValidation.isValid) {
      toast({
        title: "INVALID PASSWORD",
        description: passwordValidation.error,
        variant: "destructive",
      });
      return;
    }

    // Check if passwords match
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "PASSWORD MISMATCH",
        description: "Access keys do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(emailValidation.sanitized, registerData.password, usernameValidation.sanitized);
      
      if (error) {
        toast({
          title: "REGISTRATION FAILED",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      onClose();
      toast({
        title: "ACCOUNT CREATED",
        description: `Welcome to the system, ${registerData.username}`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "SYSTEM ERROR",
        description: "Registration service unavailable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 border-0 bg-transparent overflow-hidden">
        {/* Main Cyberpunk Container */}
        <div className="relative">
          {/* Multi-layer Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl" />
          
          {/* Circuit Pattern Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.08)_25%,rgba(99,102,241,0.08)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.08)_75%,rgba(99,102,241,0.08)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.08)_25%,rgba(99,102,241,0.08)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.08)_75%,rgba(99,102,241,0.08)_76%,transparent_77%,transparent)] bg-[length:12px_12px] opacity-50" />
          
          {/* Angular Clipping */}
          <div className="relative clip-path-[polygon(0_0,calc(100%-16px)_0,100%_16px,100%_100%,16px_100%,0_calc(100%-16px))] border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
            
            {/* Scan Line Animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent translate-x-[-100%] animate-[cyber-scan_3s_ease-in-out_infinite] clip-path-[polygon(0_0,calc(100%-16px)_0,100%_16px,100%_100%,16px_100%,0_calc(100%-16px))]" />
            
            {/* Tech Corners */}
            <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-indigo-400/60" />
            <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-cyan-400/60" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-purple-400/60" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-indigo-400/60" />
            
            {/* Content */}
            <div className="relative z-10 p-8">
              {/* Header */}
              <DialogHeader className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <Shield className="w-12 h-12 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    <div className="absolute inset-0 border border-indigo-400/30 rounded-full animate-pulse" />
                  </div>
                </div>
                <DialogTitle className="text-2xl font-bold font-mono tracking-wider text-white drop-shadow-sm">
                  <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    SYSTEM ACCESS
                  </span>
                </DialogTitle>
                <p className="text-slate-400 text-sm font-mono tracking-wider mt-2">
                  // AUTHENTICATION_REQUIRED
                </p>
              </DialogHeader>
              
              {/* Cyberpunk Tabs */}
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="relative grid w-full grid-cols-2 mb-6 bg-transparent border border-slate-600/30 backdrop-blur-sm clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80" />
                  <TabsTrigger 
                    value="login" 
                    className="relative z-10 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600/80 data-[state=active]:to-purple-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-slate-300 font-mono tracking-wider border-0 clip-path-[polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))]"
                  >
                    <Terminal className="w-4 h-4 mr-2" />
                    LOGIN
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="relative z-10 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-cyan-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25 text-slate-300 font-mono tracking-wider border-0 clip-path-[polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))]"
                  >
                    <Cpu className="w-4 h-4 mr-2" />
                    REGISTER
                  </TabsTrigger>
                </TabsList>
                
                {/* Login Tab */}
                <TabsContent value="login" className="space-y-6">
                  {/* Email Field */}
                  <div className="space-y-3">
                    <Label htmlFor="login-email" className="text-sm font-mono tracking-wider text-slate-300 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-indigo-400" />
                      EMAIL_ADDRESS
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-email"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="relative bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80 border border-slate-600/40 text-white placeholder:text-slate-400 font-mono tracking-wide focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 clip-path-[polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))] backdrop-blur-sm"
                        placeholder="user@system.network"
                        disabled={loading}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-3">
                    <Label htmlFor="login-password" className="text-sm font-mono tracking-wider text-slate-300 flex items-center">
                      <Lock className="w-4 h-4 mr-2 text-indigo-400" />
                      ACCESS_KEY
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="relative bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80 border border-slate-600/40 text-white placeholder:text-slate-400 font-mono tracking-wide focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 clip-path-[polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))] backdrop-blur-sm pr-12"
                        placeholder="••••••••••••••••"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Login Button */}
                  <Button 
                    onClick={handleLogin} 
                    className="relative w-full bg-gradient-to-r from-indigo-600/80 via-purple-600/80 to-indigo-600/80 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 border border-indigo-500/30 text-white font-mono tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))] group disabled:opacity-50"
                    disabled={loading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative z-10 flex items-center justify-center">
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          AUTHENTICATING...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          INITIATE_LOGIN
                        </>
                      )}
                    </div>
                  </Button>
                </TabsContent>
                
                {/* Register Tab */}
                <TabsContent value="register" className="space-y-6">
                  {/* Username Field */}
                  <div className="space-y-3">
                    <Label htmlFor="register-username" className="text-sm font-mono tracking-wider text-slate-300 flex items-center">
                      <User className="w-4 h-4 mr-2 text-purple-400" />
                      USERNAME
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-username"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        className="relative bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80 border border-slate-600/40 text-white placeholder:text-slate-400 font-mono tracking-wide focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 clip-path-[polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))] backdrop-blur-sm"
                        placeholder="cyber_user_001"
                        disabled={loading}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-3">
                    <Label htmlFor="register-email" className="text-sm font-mono tracking-wider text-slate-300 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-purple-400" />
                      EMAIL_ADDRESS
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="relative bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80 border border-slate-600/40 text-white placeholder:text-slate-400 font-mono tracking-wide focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 clip-path-[polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))] backdrop-blur-sm"
                        placeholder="user@system.network"
                        disabled={loading}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-3">
                    <Label htmlFor="register-password" className="text-sm font-mono tracking-wider text-slate-300 flex items-center">
                      <Lock className="w-4 h-4 mr-2 text-purple-400" />
                      ACCESS_KEY
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? "text" : "password"}
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="relative bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80 border border-slate-600/40 text-white placeholder:text-slate-400 font-mono tracking-wide focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 clip-path-[polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))] backdrop-blur-sm pr-12"
                        placeholder="min 8 chars, uppercase, lowercase, number"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-3">
                    <Label htmlFor="confirm-password" className="text-sm font-mono tracking-wider text-slate-300 flex items-center">
                      <Lock className="w-4 h-4 mr-2 text-purple-400" />
                      CONFIRM_KEY
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        className="relative bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80 border border-slate-600/40 text-white placeholder:text-slate-400 font-mono tracking-wide focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 clip-path-[polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))] backdrop-blur-sm pr-12"
                        placeholder="re-enter access key"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Terms Acceptance Checkbox */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="accept-terms"
                      checked={registerData.acceptTerms}
                      onCheckedChange={(checked) => setRegisterData({ ...registerData, acceptTerms: checked as boolean })}
                      className="h-4 w-4 text-purple-400 focus:ring-purple-500/40"
                    />
                    <Label htmlFor="accept-terms" className="text-sm text-slate-300 font-mono tracking-wider flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-purple-400" />
                      I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-400 ml-1">Terms and Conditions</a>
                    </Label>
                  </div>

                  {/* Register Button */}
                  <Button 
                    onClick={handleRegister} 
                    className="relative w-full bg-gradient-to-r from-purple-600/80 via-cyan-600/80 to-purple-600/80 hover:from-purple-500 hover:via-cyan-500 hover:to-purple-500 border border-purple-500/30 text-white font-mono tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))] group disabled:opacity-50"
                    disabled={loading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative z-10 flex items-center justify-center">
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          CREATING_ACCOUNT...
                        </>
                      ) : (
                        <>
                          <Cpu className="w-4 h-4 mr-2" />
                          CREATE_ACCOUNT
                        </>
                      )}
                    </div>
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
