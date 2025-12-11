import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone,
  Lock, 
  Eye, 
  EyeOff, 
  PlayCircle, 
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Award
} from 'lucide-react';
import { useAuthStore } from '../authStore';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(formData.password)) errors.password = 'Password needs an uppercase letter';
    if (!/[a-z]/.test(formData.password)) errors.password = 'Password needs a lowercase letter';
    if (!/[0-9]/.test(formData.password)) errors.password = 'Password needs a number';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!validateStep2()) return;
    
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password
      });
      navigate('/booking');
    } catch {
      // Error is handled by the store
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (validationErrors[e.target.name]) {
      setValidationErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength();
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(formData.password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(formData.password) },
    { label: 'One number', met: /[0-9]/.test(formData.password) },
  ];

  return (
    <div className="auth-page-modern">
      {/* Left Panel - Visual */}
      <motion.div 
        className="auth-visual-panel register-visual"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="visual-content">
          <motion.div 
            className="visual-brand"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <PlayCircle size={48} />
            <span>CourtBook</span>
          </motion.div>

          <motion.div 
            className="visual-text"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1>Join Our Community</h1>
            <p>Create an account and get access to premium badminton courts, expert coaches, and exclusive member benefits.</p>
          </motion.div>

          <motion.div 
            className="visual-benefits"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="benefit-card">
              <Award size={24} />
              <div>
                <h4>First Booking Free</h4>
                <p>New members get their first hour free</p>
              </div>
            </div>
            <div className="benefit-card">
              <Shield size={24} />
              <div>
                <h4>Secure & Private</h4>
                <p>Your data is encrypted and protected</p>
              </div>
            </div>
          </motion.div>

          <div className="visual-decoration">
            <div className="decoration-circle circle-1" />
            <div className="decoration-circle circle-2" />
            <div className="decoration-circle circle-3" />
          </div>
        </div>
      </motion.div>

      {/* Right Panel - Form */}
      <motion.div 
        className="auth-form-panel"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="form-container">
          <Link to="/" className="back-to-home">
            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
            <span>Back to home</span>
          </Link>

          <motion.div 
            className="form-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2>Create Account</h2>
            <p>Fill in your details to get started</p>
          </motion.div>

          {/* Progress Steps */}
          <div className="progress-steps">
            <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="step-circle">
                {step > 1 ? <CheckCircle2 size={18} /> : '1'}
              </div>
              <span>Profile</span>
            </div>
            <div className="step-line" />
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-circle">2</div>
              <span>Security</span>
            </div>
          </div>

          <motion.form 
            onSubmit={handleSubmit} 
            className="auth-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {error && (
              <motion.div 
                className="auth-error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="form-step"
                >
                  <div className="input-group">
                    <label htmlFor="name">Full Name</label>
                    <div className="input-wrapper">
                      <User size={18} className="input-icon" />
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        required
                        autoComplete="name"
                      />
                    </div>
                    {validationErrors.name && (
                      <span className="field-error">{validationErrors.name}</span>
                    )}
                  </div>

                  <div className="input-group">
                    <label htmlFor="email">Email Address</label>
                    <div className="input-wrapper">
                      <Mail size={18} className="input-icon" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                      />
                    </div>
                    {validationErrors.email && (
                      <span className="field-error">{validationErrors.email}</span>
                    )}
                  </div>

                  <div className="input-group">
                    <label htmlFor="phone">Phone Number <span className="optional">(Optional)</span></label>
                    <div className="input-wrapper">
                      <Phone size={18} className="input-icon" />
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="submit-btn"
                    onClick={handleNextStep}
                  >
                    <span>Continue</span>
                    <ArrowRight size={20} />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="form-step"
                >
                  <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    
                    {formData.password && (
                      <>
                        <div className="password-strength">
                          <div className="strength-bars">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div 
                                key={i}
                                className={`strength-bar ${i <= passwordStrength ? 'active' : ''}`}
                                style={{ backgroundColor: i <= passwordStrength ? strengthColors[passwordStrength] : undefined }}
                              />
                            ))}
                          </div>
                          <span style={{ color: strengthColors[passwordStrength] }}>
                            {strengthLabels[passwordStrength]}
                          </span>
                        </div>
                        
                        <div className="password-requirements">
                          {passwordRequirements.map((req, index) => (
                            <div key={index} className={`requirement ${req.met ? 'met' : ''}`}>
                              <CheckCircle2 size={14} />
                              <span>{req.label}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="input-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                      />
                      {formData.confirmPassword && formData.password === formData.confirmPassword && (
                        <CheckCircle2 size={18} className="input-check" />
                      )}
                    </div>
                    {validationErrors.confirmPassword && (
                      <span className="field-error">{validationErrors.confirmPassword}</span>
                    )}
                  </div>

                  <label className="checkbox-wrapper terms">
                    <input 
                      type="checkbox" 
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <span className="checkmark" />
                    <span className="checkbox-label">
                      I agree to the <span className="terms-link">Terms of Service</span> and <span className="terms-link">Privacy Policy</span>
                    </span>
                  </label>

                  <div className="form-buttons">
                    <button 
                      type="button" 
                      className="back-btn"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft size={18} />
                      <span>Back</span>
                    </button>
                    
                    <button 
                      type="submit" 
                      className="submit-btn"
                      disabled={isLoading || !agreeTerms}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={20} className="spinner" />
                          <span>Creating account...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>

          <motion.p 
            className="form-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Already have an account?{' '}
            <Link to="/login" className="link-primary">
              Sign in
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
