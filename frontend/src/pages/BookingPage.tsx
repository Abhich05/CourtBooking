import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ShoppingBag, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Trophy,
  Loader2,
  BadgeCheck,
  Mail,
  PartyPopper,
  RotateCcw,
  Zap
} from 'lucide-react';
import CalendarView from '../components/CalendarView';
import SlotGrid from '../components/SlotGrid';
import CourtSelector from '../components/CourtSelector';
import EquipmentSelector from '../components/EquipmentSelector';
import CoachSelector from '../components/CoachSelector';
import PriceBreakdown from '../components/PriceBreakdown';
import { useBookingStore } from '../store';
import { 
  getSlotsForDate, 
  getAvailability, 
  simulatePricing, 
  createBooking,
  Slot,
  Court,
  Coach 
} from '../api';

const stepConfig = [
  { id: 1, label: 'Date', icon: Calendar, description: 'Choose your day' },
  { id: 2, label: 'Time', icon: Clock, description: 'Pick a slot' },
  { id: 3, label: 'Court', icon: MapPin, description: 'Select venue' },
  { id: 4, label: 'Extras', icon: ShoppingBag, description: 'Add-ons' },
  { id: 5, label: 'Confirm', icon: CheckCircle2, description: 'Review & pay' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" as const }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.3 }
  })
};

const BookingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const {
    selectedDate,
    selectedSlot,
    selectedCourt,
    selectedEquipment,
    selectedCoach,
    userEmail,
    pricing,
    setSelectedDate,
    setSelectedSlot,
    setSelectedCourt,
    setSelectedCoach,
    setUserEmail,
    setPricing,
    addEquipment,
    removeEquipment,
    updateEquipmentQuantity,
    reset,
  } = useBookingStore();
  
  // Fetch slots for selected date
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', selectedDate?.toISOString()],
    queryFn: () => selectedDate ? getSlotsForDate(format(selectedDate, 'yyyy-MM-dd')) : null,
    enabled: !!selectedDate,
  });
  
  // Fetch availability for selected slot
  const { data: availabilityData } = useQuery({
    queryKey: ['availability', selectedSlot?.start, selectedSlot?.end],
    queryFn: () => selectedSlot ? getAvailability(selectedSlot.start, selectedSlot.end) : null,
    enabled: !!selectedSlot,
  });
  
  // Fetch pricing when court is selected
  const { data: pricingData } = useQuery({
    queryKey: ['pricing', selectedSlot?.start, selectedSlot?.end, selectedCourt?.id],
    queryFn: () => 
      selectedSlot && selectedCourt 
        ? simulatePricing(selectedSlot.start, selectedSlot.end, selectedCourt.id) 
        : null,
    enabled: !!selectedSlot && !!selectedCourt,
  });
  
  // Update pricing when data changes
  useEffect(() => {
    if (pricingData) {
      // Add equipment and coach fees to pricing
      const equipmentFees = selectedEquipment.reduce((sum: number, e: { price: number; quantity: number }) => sum + (e.price * e.quantity), 0);
      const coachFee = selectedCoach?.hourly_rate || 0;
      const total = pricingData.total + equipmentFees + coachFee;
      
      setPricing({
        ...pricingData,
        equipment_fees: equipmentFees,
        coach_fee: coachFee,
        total,
      });
    }
  }, [pricingData, selectedEquipment, selectedCoach, setPricing]);
  
  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (data: { status: string; booking_id?: number; waitlist_id?: number; total?: number; message?: string }) => {
      setBookingResult(data);
      setError(null);
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail || 'Booking failed. Please try again.');
    },
  });
  
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    goToStep(2);
  };
  
  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot);
    goToStep(3);
  };
  
  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court);
    goToStep(4);
  };
  
  const handleCoachSelect = (coach: Coach | null) => {
    setSelectedCoach(coach);
  };

  const goToStep = (newStep: number) => {
    const newDirection = newStep > step ? 1 : -1;
    setDirection(newDirection);
    setStep(newStep);
  };

  const canProceed = () => {
    switch(step) {
      case 1: return !!selectedDate;
      case 2: return !!selectedSlot;
      case 3: return !!selectedCourt;
      case 4: return true;
      case 5: return !!userEmail;
      default: return false;
    }
  };
  
  const handleConfirmBooking = () => {
    if (!selectedSlot || !selectedCourt || !userEmail) {
      setError('Please fill in all required fields');
      return;
    }
    
    bookingMutation.mutate({
      user_email: userEmail,
      start_ts: selectedSlot.start,
      end_ts: selectedSlot.end,
      court_id: selectedCourt.id,
      equipment: selectedEquipment.map((e: { sku: string; quantity: number }) => ({ sku: e.sku, quantity: e.quantity })),
      coach_id: selectedCoach?.id,
    });
  };
  
  const handleNewBooking = () => {
    reset();
    setStep(1);
    setDirection(0);
    setBookingResult(null);
    setError(null);
  };
  
  // Success view with animations
  if (bookingResult) {
    return (
      <motion.div 
        className="booking-success-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="booking-success-bg">
          <div className="success-particles">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="success-particle"
                initial={{ 
                  opacity: 0, 
                  scale: 0,
                  x: 0,
                  y: 0 
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  x: (Math.random() - 0.5) * 400,
                  y: (Math.random() - 0.5) * 400,
                }}
                transition={{ 
                  duration: 2,
                  delay: Math.random() * 0.5,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 2
                }}
              />
            ))}
          </div>
        </div>
        
        <motion.div 
          className="booking-success-card"
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          {bookingResult.status === 'confirmed' ? (
            <>
              <motion.div 
                className="success-icon-wrapper"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <PartyPopper className="success-icon" size={48} />
                </motion.div>
              </motion.div>
              
              <motion.h2 
                className="success-title"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Booking Confirmed!
              </motion.h2>
              
              <motion.p 
                className="success-subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Your court has been successfully reserved
              </motion.p>
              
              <motion.div 
                className="success-ref-box"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
              >
                <span className="ref-label">Booking Reference</span>
                <span className="ref-number">#{bookingResult.booking_id?.toString().padStart(6, '0')}</span>
              </motion.div>
              
              <motion.div 
                className="success-total"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                ${bookingResult.total?.toFixed(2)}
              </motion.div>
            </>
          ) : (
            <>
              <motion.div 
                className="waitlist-icon-wrapper"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
              >
                <Clock className="waitlist-icon" size={48} />
              </motion.div>
              
              <motion.h2 
                className="success-title"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Added to Waitlist
              </motion.h2>
              
              <motion.p 
                className="success-subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {bookingResult.message}
              </motion.p>
              
              <motion.div 
                className="waitlist-position-box"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
              >
                <span className="ref-label">Waitlist Position</span>
                <span className="waitlist-number">#{bookingResult.waitlist_id}</span>
              </motion.div>
            </>
          )}
          
          <motion.button 
            className="btn-new-booking"
            onClick={handleNewBooking}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RotateCcw size={18} />
            Book Another Slot
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }
  return (
    <motion.div 
      className="booking-page"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Animated Background */}
      <div className="booking-bg-pattern">
        <div className="booking-bg-gradient" />
        <div className="booking-bg-grid" />
      </div>

      {/* Header Section */}
      <motion.div className="booking-header" variants={itemVariants}>
        <motion.div 
          className="booking-header-badge"
          whileHover={{ scale: 1.05 }}
        >
          <Sparkles size={14} />
          <span>Quick & Easy Booking</span>
        </motion.div>
        <h1 className="booking-title">Book Your Court</h1>
        <p className="booking-subtitle">
          Reserve your badminton court, equipment, and coaching in minutes
        </p>
      </motion.div>

      {error && (
        <motion.div 
          className="booking-error"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Zap size={18} />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Premium Horizontal Stepper */}
      <motion.div className="booking-stepper" variants={itemVariants}>
        {stepConfig.map((s, index) => {
          const Icon = s.icon;
          const isCompleted = step > s.id;
          const isActive = step === s.id;
          
          return (
            <React.Fragment key={s.id}>
              <motion.div 
                className={`stepper-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                onClick={() => isCompleted && goToStep(s.id)}
                whileHover={isCompleted ? { scale: 1.05 } : {}}
                whileTap={isCompleted ? { scale: 0.95 } : {}}
              >
                <motion.div 
                  className="stepper-icon"
                  animate={isActive ? { 
                    boxShadow: ['0 0 0 0 rgba(99, 102, 241, 0.4)', '0 0 0 20px rgba(99, 102, 241, 0)']
                  } : {}}
                  transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckCircle2 size={20} />
                    </motion.div>
                  ) : (
                    <Icon size={20} />
                  )}
                </motion.div>
                <div className="stepper-text">
                  <span className="stepper-label">{s.label}</span>
                  <span className="stepper-desc">{s.description}</span>
                </div>
              </motion.div>
              {index < stepConfig.length - 1 && (
                <div className={`stepper-connector ${step > s.id ? 'completed' : ''}`}>
                  <motion.div 
                    className="stepper-connector-fill"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: step > s.id ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </motion.div>

      {/* Main Content Area */}
      <div className="booking-content">
        {/* Left Panel - Step Content */}
        <motion.div className="booking-main" variants={itemVariants}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="booking-step-content"
            >
              {/* Step 1: Date Selection */}
              {step === 1 && (
                <div className="step-container">
                  <div className="step-header">
                    <Calendar className="step-icon" size={24} />
                    <div>
                      <h2 className="step-title">Select a Date</h2>
                      <p className="step-desc">Choose when you'd like to play</p>
                    </div>
                  </div>
                  <CalendarView
                    selectedDate={selectedDate}
                    onSelectDate={handleDateSelect}
                  />
                </div>
              )}

              {/* Step 2: Time Slot Selection */}
              {step === 2 && (
                <div className="step-container">
                  <div className="step-header">
                    <Clock className="step-icon" size={24} />
                    <div>
                      <h2 className="step-title">Pick a Time Slot</h2>
                      <p className="step-desc">
                        {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  {slotsLoading ? (
                    <div className="booking-loading">
                      <Loader2 className="loading-spinner" size={32} />
                      <span>Loading available slots...</span>
                    </div>
                  ) : slotsData ? (
                    <SlotGrid
                      slots={slotsData.slots}
                      selectedSlot={selectedSlot}
                      onSelectSlot={handleSlotSelect}
                    />
                  ) : null}
                </div>
              )}

              {/* Step 3: Court Selection */}
              {step === 3 && (
                <div className="step-container">
                  <div className="step-header">
                    <MapPin className="step-icon" size={24} />
                    <div>
                      <h2 className="step-title">Choose Your Court</h2>
                      <p className="step-desc">Indoor & outdoor courts available</p>
                    </div>
                  </div>
                  {slotsData && (
                    <CourtSelector
                      courts={slotsData.courts}
                      selectedCourt={selectedCourt}
                      onSelectCourt={handleCourtSelect}
                      availableCourtIds={availabilityData?.available_courts.map((c: { court_id: number }) => c.court_id)}
                    />
                  )}
                </div>
              )}

              {/* Step 4: Extras */}
              {step === 4 && (
                <div className="step-container">
                  <div className="step-header">
                    <ShoppingBag className="step-icon" size={24} />
                    <div>
                      <h2 className="step-title">Add Extras</h2>
                      <p className="step-desc">Equipment & coaching (optional)</p>
                    </div>
                  </div>
                  
                  {availabilityData && (
                    <div className="extras-grid">
                      <motion.div 
                        className="extras-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <EquipmentSelector
                          equipment={availabilityData.equipment}
                          selectedEquipment={selectedEquipment}
                          onAdd={addEquipment}
                          onRemove={removeEquipment}
                          onUpdateQuantity={updateEquipmentQuantity}
                        />
                      </motion.div>
                      
                      <motion.div 
                        className="extras-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <CoachSelector
                          coaches={availabilityData.coaches}
                          selectedCoach={selectedCoach}
                          onSelectCoach={handleCoachSelect}
                        />
                      </motion.div>
                    </div>
                  )}
                  
                  <motion.div 
                    className="step-actions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <button 
                      className="btn-step-next"
                      onClick={() => goToStep(5)}
                    >
                      Continue to Review
                      <ArrowRight size={18} />
                    </button>
                  </motion.div>
                </div>
              )}

              {/* Step 5: Review & Confirm */}
              {step === 5 && (
                <div className="step-container">
                  <div className="step-header">
                    <BadgeCheck className="step-icon" size={24} />
                    <div>
                      <h2 className="step-title">Review & Confirm</h2>
                      <p className="step-desc">Double-check your booking details</p>
                    </div>
                  </div>
                  
                  <div className="confirm-grid">
                    {/* Booking Summary Cards */}
                    <motion.div 
                      className="summary-card"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="summary-card-icon">
                        <Calendar size={20} />
                      </div>
                      <div className="summary-card-content">
                        <span className="summary-label">Date</span>
                        <span className="summary-value">
                          {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : '-'}
                        </span>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="summary-card"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <div className="summary-card-icon">
                        <Clock size={20} />
                      </div>
                      <div className="summary-card-content">
                        <span className="summary-label">Time</span>
                        <span className="summary-value">
                          {selectedSlot ? format(new Date(selectedSlot.start), 'h:mm a') : '-'}
                        </span>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="summary-card"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="summary-card-icon">
                        <MapPin size={20} />
                      </div>
                      <div className="summary-card-content">
                        <span className="summary-label">Court</span>
                        <span className="summary-value">{selectedCourt?.name || '-'}</span>
                      </div>
                    </motion.div>

                    {selectedCoach && (
                      <motion.div 
                        className="summary-card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                      >
                        <div className="summary-card-icon coach">
                          <Trophy size={20} />
                        </div>
                        <div className="summary-card-content">
                          <span className="summary-label">Coach</span>
                          <span className="summary-value">{selectedCoach.name}</span>
                        </div>
                      </motion.div>
                    )}

                    {selectedEquipment.length > 0 && (
                      <motion.div 
                        className="summary-card wide"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="summary-card-icon">
                          <ShoppingBag size={20} />
                        </div>
                        <div className="summary-card-content">
                          <span className="summary-label">Equipment</span>
                          <span className="summary-value">
                            {selectedEquipment.map((e: { name: string; quantity: number }) => `${e.name} (×${e.quantity})`).join(', ')}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Email Input */}
                  <motion.div 
                    className="confirm-email"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <label className="email-label">
                      <Mail size={18} />
                      Confirmation Email
                    </label>
                    <input
                      type="email"
                      className="email-input"
                      placeholder="Enter your email address"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                    />
                  </motion.div>

                  {/* Confirm Button */}
                  <motion.button
                    className="btn-confirm-booking"
                    onClick={handleConfirmBooking}
                    disabled={!userEmail || !selectedCourt || bookingMutation.isPending}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {bookingMutation.isPending ? (
                      <>
                        <Loader2 className="btn-spinner" size={20} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        Confirm Booking • ${pricing?.total.toFixed(2) || '0.00'}
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Right Panel - Live Summary */}
        <motion.div className="booking-sidebar" variants={itemVariants}>
          <div className="sidebar-sticky">
            {/* Quick Navigation */}
            <div className="quick-nav">
              <h3 className="quick-nav-title">
                <Zap size={16} />
                Quick Jump
              </h3>
              <div className="quick-nav-items">
                {stepConfig.map((s) => {
                  const Icon = s.icon;
                  const isEnabled = step >= s.id || (s.id === 1);
                  return (
                    <motion.button
                      key={s.id}
                      className={`quick-nav-item ${step === s.id ? 'active' : ''} ${!isEnabled ? 'disabled' : ''}`}
                      onClick={() => isEnabled && goToStep(s.id)}
                      whileHover={isEnabled ? { x: 4 } : {}}
                      disabled={!isEnabled}
                    >
                      <Icon size={16} />
                      <span>{s.label}</span>
                      {step > s.id && <CheckCircle2 size={14} className="check-icon" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Live Price Summary */}
            {pricing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <PriceBreakdown
                  pricing={pricing}
                  equipmentItems={selectedEquipment}
                  coachName={selectedCoach?.name}
                />
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="sidebar-nav">
              {step > 1 && (
                <motion.button
                  className="btn-nav-back"
                  onClick={() => goToStep(step - 1)}
                  whileHover={{ x: -4 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft size={18} />
                  Back
                </motion.button>
              )}
              {step < 5 && canProceed() && step !== 4 && (
                <motion.button
                  className="btn-nav-next"
                  onClick={() => goToStep(step + 1)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Next
                  <ArrowRight size={18} />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BookingPage;
