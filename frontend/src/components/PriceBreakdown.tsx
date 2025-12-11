import React from 'react';
import { PricingResult } from '../api';

interface PriceBreakdownProps {
  pricing: PricingResult | null;
  equipmentItems?: Array<{ name: string; quantity: number; price: number }>;
  coachName?: string;
}

const PriceBreakdown: React.FC<PriceBreakdownProps> = ({ pricing, equipmentItems, coachName }) => {
  // Defensive check for pricing and required fields
  if (!pricing || typeof pricing.base_price !== 'number') {
    return (
      <div className="card">
        <h3 className="card-title">Price Summary</h3>
        <div className="price-breakdown">
          <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '1rem' }}>
            Select a court and time slot to see pricing
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card">
      <h3 className="card-title">Price Summary</h3>
      <div className="price-breakdown">
        <div className="price-row">
          <span className="price-label">Court Booking</span>
          <span className="price-value">${pricing.base_price.toFixed(2)}</span>
        </div>
        
        {Array.isArray(pricing.adjustments) && pricing.adjustments.map((adj, index) => (
          <div key={index} className="price-row">
            <span className="price-label">{adj.name}</span>
            <span className="price-value" style={{ color: adj.amount > 0 ? 'var(--danger)' : 'var(--success-600)' }}>
              {adj.amount > 0 ? '+' : ''}{adj.amount.toFixed(2)}
            </span>
          </div>
        ))}
        
        {equipmentItems && equipmentItems.length > 0 && equipmentItems.map((item, index) => (
          <div key={`eq-${index}`} className="price-row">
            <span className="price-label">{item.name} × {item.quantity}</span>
            <span className="price-value" style={{ color: 'var(--gray-600)' }}>+${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        
        {(pricing.equipment_fees ?? 0) > 0 && !equipmentItems?.length && (
          <div className="price-row">
            <span className="price-label">Equipment Rental</span>
            <span className="price-value" style={{ color: 'var(--gray-600)' }}>+${pricing.equipment_fees.toFixed(2)}</span>
          </div>
        )}
        
        {(pricing.coach_fee ?? 0) > 0 && (
          <div className="price-row">
            <span className="price-label">Coach Fee{coachName ? ` (${coachName})` : ''}</span>
            <span className="price-value" style={{ color: 'var(--gray-600)' }}>+${pricing.coach_fee.toFixed(2)}</span>
          </div>
        )}
        
        <div className="price-row total-row">
          <span className="price-label">Total</span>
          <span className="price-value">${(pricing.total ?? 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default PriceBreakdown;
