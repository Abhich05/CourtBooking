import React from 'react';
import { Equipment } from '../api';

interface EquipmentSelectorProps {
  equipment: Equipment[];
  selectedEquipment: Array<{ sku: string; quantity: number }>;
  onAdd: (item: { sku: string; name: string; price: number }) => void;
  onRemove: (sku: string) => void;
  onUpdateQuantity: (sku: string, quantity: number) => void;
}

const equipmentIcons: Record<string, string> = {
  'racket': '🏸',
  'shoes': '👟',
  'shuttlecock': '🪶',
  'bag': '🎒',
  'default': '🎾'
};

const getEquipmentIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  for (const [key, icon] of Object.entries(equipmentIcons)) {
    if (lowerName.includes(key)) return icon;
  }
  return equipmentIcons.default;
};

const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({
  equipment,
  selectedEquipment,
  onAdd,
  onRemove,
  onUpdateQuantity,
}) => {
  const getSelectedQuantity = (sku: string) => {
    const item = selectedEquipment.find(e => e.sku === sku);
    return item?.quantity || 0;
  };
  
  return (
    <div className="card">
      <h3 className="card-title">Add Equipment (Optional)</h3>
      {equipment.map((item) => {
        const selectedQty = getSelectedQuantity(item.sku);
        const maxQty = item.available_qty ?? item.total_quantity;
        const isSelected = selectedQty > 0;
        
        return (
          <div key={item.sku} className={`equipment-item ${isSelected ? 'selected' : ''}`}>
            <div className="equipment-info">
              <div className="equipment-icon">{getEquipmentIcon(item.name)}</div>
              <div>
                <div className="equipment-name">{item.name}</div>
                <div className="equipment-price">
                  ${item.rental_price}/hr • <span style={{ color: maxQty > 0 ? 'var(--success-600)' : 'var(--danger)' }}>
                    {maxQty} available
                  </span>
                </div>
              </div>
            </div>
            <div className="quantity-control">
              <button
                className="quantity-btn"
                onClick={() => onUpdateQuantity(item.sku, selectedQty - 1)}
                disabled={selectedQty === 0}
              >
                −
              </button>
              <span className="quantity-value">{selectedQty}</span>
              <button
                className="quantity-btn"
                onClick={() => {
                  if (selectedQty === 0) {
                    onAdd({ sku: item.sku, name: item.name, price: item.rental_price });
                  } else {
                    onUpdateQuantity(item.sku, selectedQty + 1);
                  }
                }}
                disabled={selectedQty >= maxQty}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EquipmentSelector;
