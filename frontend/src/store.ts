import { create } from 'zustand';
import { Court, Coach, Slot, PricingResult } from './api';

interface EquipmentSelection {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

interface BookingStore {
  // Selection state
  selectedDate: Date | null;
  selectedSlot: Slot | null;
  selectedCourt: Court | null;
  selectedEquipment: EquipmentSelection[];
  selectedCoach: Coach | null;
  userEmail: string;
  
  // Pricing
  pricing: PricingResult | null;
  
  // Actions
  setSelectedDate: (date: Date | null) => void;
  setSelectedSlot: (slot: Slot | null) => void;
  setSelectedCourt: (court: Court | null) => void;
  setSelectedCoach: (coach: Coach | null) => void;
  setUserEmail: (email: string) => void;
  setPricing: (pricing: PricingResult | null) => void;
  
  addEquipment: (item: { sku: string; name: string; price: number }) => void;
  removeEquipment: (sku: string) => void;
  updateEquipmentQuantity: (sku: string, quantity: number) => void;
  
  reset: () => void;
}

const initialState = {
  selectedDate: null as Date | null,
  selectedSlot: null as Slot | null,
  selectedCourt: null as Court | null,
  selectedEquipment: [] as EquipmentSelection[],
  selectedCoach: null as Coach | null,
  userEmail: '',
  pricing: null as PricingResult | null,
};

export const useBookingStore = create<BookingStore>()((set) => ({
  ...initialState,
  
  setSelectedDate: (date: Date | null) => set({ selectedDate: date, selectedSlot: null }),
  setSelectedSlot: (slot: Slot | null) => set({ selectedSlot: slot }),
  setSelectedCourt: (court: Court | null) => set({ selectedCourt: court }),
  setSelectedCoach: (coach: Coach | null) => set({ selectedCoach: coach }),
  setUserEmail: (email: string) => set({ userEmail: email }),
  setPricing: (pricing: PricingResult | null) => set({ pricing }),
  
  addEquipment: (item: { sku: string; name: string; price: number }) => set((state: BookingStore) => {
    const existing = state.selectedEquipment.find((e: EquipmentSelection) => e.sku === item.sku);
    if (existing) {
      return {
        selectedEquipment: state.selectedEquipment.map((e: EquipmentSelection) =>
          e.sku === item.sku ? { ...e, quantity: e.quantity + 1 } : e
        ),
      };
    }
    return {
      selectedEquipment: [...state.selectedEquipment, { ...item, quantity: 1 }],
    };
  }),
  
  removeEquipment: (sku: string) => set((state: BookingStore) => ({
    selectedEquipment: state.selectedEquipment.filter((e: EquipmentSelection) => e.sku !== sku),
  })),
  
  updateEquipmentQuantity: (sku: string, quantity: number) => set((state: BookingStore) => {
    if (quantity <= 0) {
      return {
        selectedEquipment: state.selectedEquipment.filter((e: EquipmentSelection) => e.sku !== sku),
      };
    }
    return {
      selectedEquipment: state.selectedEquipment.map((e: EquipmentSelection) =>
        e.sku === sku ? { ...e, quantity } : e
      ),
    };
  }),
  
  reset: () => set(initialState),
}));
