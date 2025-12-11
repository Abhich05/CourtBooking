import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlayCircle,
  Calendar,
  Users,
  Trophy,
  Star,
  ChevronRight,
  Zap,
  Shield,
  Clock,
  MapPin,
  ArrowRight,
  Check,
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Calendar className="feature-icon" />,
      title: 'Easy Booking',
      description: 'Book your preferred court in seconds with our intuitive scheduling system',
    },
    {
      icon: <Users className="feature-icon" />,
      title: 'Expert Coaches',
      description: 'Train with certified professionals to elevate your game',
    },
    {
      icon: <Trophy className="feature-icon" />,
      title: 'Premium Courts',
      description: '4 world-class courts - 2 indoor climate-controlled, 2 outdoor scenic',
    },
    {
      icon: <Zap className="feature-icon" />,
      title: 'Instant Confirmation',
      description: 'Get real-time availability and instant booking confirmations',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Happy Players' },
    { value: '50K+', label: 'Matches Played' },
    { value: '4.9', label: 'User Rating' },
    { value: '24/7', label: 'Support' },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Club Member',
      avatar: 'SC',
      content: 'The booking system is incredibly smooth. I can reserve my favorite court in seconds!',
      rating: 5,
    },
    {
      name: 'Michael Park',
      role: 'Professional Player',
      avatar: 'MP',
      content: 'Best facilities in the city. The coaches here have significantly improved my game.',
      rating: 5,
    },
    {
      name: 'Emily Watson',
      role: 'Weekend Player',
      avatar: 'EW',
      content: 'Love the equipment rental option. Perfect for beginners like me!',
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: 'Casual',
      price: 25,
      period: 'per hour',
      features: ['Access to outdoor courts', 'Basic equipment rental', 'Online booking', 'Email support'],
      highlighted: false,
    },
    {
      name: 'Premium',
      price: 40,
      period: 'per hour',
      features: ['All courts access', 'Premium equipment', 'Priority booking', 'Coach sessions', '24/7 support'],
      highlighted: true,
    },
    {
      name: 'Pro',
      price: 99,
      period: 'per month',
      features: ['Unlimited court access', 'Free equipment', 'Personal coach', 'Tournament access', 'VIP lounge'],
      highlighted: false,
    },
  ];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <motion.div 
          className="nav-brand"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="brand-icon">
            <PlayCircle size={32} />
          </div>
          <span className="brand-text">CourtBook</span>
        </motion.div>

        <motion.div 
          className="nav-links"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#testimonials">Reviews</a>
          <a href="#contact">Contact</a>
        </motion.div>

        <motion.div 
          className="nav-actions"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button className="btn-ghost" onClick={() => navigate('/login')}>
            Sign In
          </button>
          <button className="btn-primary" onClick={() => navigate('/register')}>
            Get Started
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-gradient" />
          <div className="hero-pattern" />
        </div>

        <div className="hero-content">
          <motion.div 
            className="hero-badge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Star size={14} fill="currentColor" />
            <span>Rated #1 Badminton Facility in the City</span>
          </motion.div>

          <motion.h1 
            className="hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Book Your Perfect
            <span className="gradient-text"> Badminton </span>
            Court in Seconds
          </motion.h1>

          <motion.p 
            className="hero-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Experience world-class facilities, professional coaching, and seamless booking. 
            Join thousands of players who trust CourtBook for their game.
          </motion.p>

          <motion.div 
            className="hero-actions"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <button className="btn-hero-primary" onClick={() => navigate('/register')}>
              Start Booking Now
              <ChevronRight size={20} />
            </button>
            <button className="btn-hero-secondary">
              <PlayCircle size={20} />
              Watch Demo
            </button>
          </motion.div>

          <motion.div 
            className="hero-stats"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div 
          className="hero-image"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="hero-card">
            <div className="hero-card-header">
              <div className="card-dot red" />
              <div className="card-dot yellow" />
              <div className="card-dot green" />
            </div>
            <div className="hero-card-content">
              <div className="booking-preview">
                <div className="preview-header">
                  <Calendar size={20} />
                  <span>Quick Booking</span>
                </div>
                <div className="preview-courts">
                  <div className="court-card active">
                    <div className="court-badge indoor">Indoor</div>
                    <span className="court-name">Court A1</span>
                    <span className="court-status available">Available</span>
                  </div>
                  <div className="court-card">
                    <div className="court-badge indoor">Indoor</div>
                    <span className="court-name">Court A2</span>
                    <span className="court-status booked">Booked</span>
                  </div>
                  <div className="court-card">
                    <div className="court-badge outdoor">Outdoor</div>
                    <span className="court-name">Court B1</span>
                    <span className="court-status available">Available</span>
                  </div>
                  <div className="court-card">
                    <div className="court-badge outdoor">Outdoor</div>
                    <span className="court-name">Court B2</span>
                    <span className="court-status available">Available</span>
                  </div>
                </div>
                <div className="preview-time">
                  <Clock size={16} />
                  <span>Today, 3:00 PM - 4:00 PM</span>
                </div>
                <button className="preview-btn">Book Now</button>
              </div>
            </div>
          </div>
          
          {/* Floating Elements */}
          <motion.div 
            className="floating-card card-1"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Shield size={20} />
            <span>Secure Payments</span>
          </motion.div>
          
          <motion.div 
            className="floating-card card-2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity }}
          >
            <MapPin size={20} />
            <span>4 Premium Courts</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <motion.span 
            className="section-badge"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Why Choose Us
          </motion.span>
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Everything You Need for the Perfect Game
          </motion.h2>
          <motion.p 
            className="section-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            From booking to playing, we've got you covered with premium facilities and services
          </motion.p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <div className="feature-icon-wrapper">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="section-header">
          <motion.span 
            className="section-badge"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Pricing Plans
          </motion.span>
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p 
            className="section-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Choose the plan that fits your playing style
          </motion.p>
        </div>

        <div className="pricing-grid">
          {pricingPlans.map((plan, index) => (
            <motion.div 
              key={index}
              className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
            >
              {plan.highlighted && <div className="popular-badge">Most Popular</div>}
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">
                <span className="currency">$</span>
                <span className="amount">{plan.price}</span>
                <span className="period">/{plan.period}</span>
              </div>
              <ul className="plan-features">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex}>
                    <Check size={16} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button className={`plan-btn ${plan.highlighted ? 'primary' : 'secondary'}`}>
                Get Started
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials-section">
        <div className="section-header">
          <motion.span 
            className="section-badge"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Testimonials
          </motion.span>
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            What Our Players Say
          </motion.h2>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <motion.div 
              key={index}
              className="testimonial-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="testimonial-rating">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={16} fill="#fbbf24" color="#fbbf24" />
                ))}
              </div>
              <p className="testimonial-content">"{testimonial.content}"</p>
              <div className="testimonial-author">
                <div className="author-avatar">{testimonial.avatar}</div>
                <div className="author-info">
                  <span className="author-name">{testimonial.name}</span>
                  <span className="author-role">{testimonial.role}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <motion.div 
          className="cta-content"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="cta-title">Ready to Play?</h2>
          <p className="cta-subtitle">
            Join thousands of players and book your court today. First booking is on us!
          </p>
          <div className="cta-actions">
            <button className="btn-cta-primary" onClick={() => navigate('/register')}>
              Create Free Account
              <ArrowRight size={20} />
            </button>
            <button className="btn-cta-secondary" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer id="contact" className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="brand-icon">
              <PlayCircle size={28} />
            </div>
            <span className="brand-text">CourtBook</span>
            <p className="footer-tagline">Book. Play. Win.</p>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#testimonials">Reviews</a>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Policy</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2025 CourtBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
