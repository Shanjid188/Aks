import { CurrencyMode } from '../types';

export const BDT_TO_USD_RATE = 0.0083; // approx 1 USD = 120 BDT

export function formatPrice(amount: number, currency: CurrencyMode = 'BDT'): string {
  if (currency === 'USD') {
    const usd = amount * BDT_TO_USD_RATE;
    return `$${usd.toFixed(2)}`;
  }
  return `৳${amount.toLocaleString('en-IN')}`;
}

export interface SizeMatchResult {
  eu: number;
  uk: number;
  usMen: number;
  usWomen: number;
  cm: number;
  inches: number;
}

export function calculateShoeSizeFromFootLength(lengthCm: number): SizeMatchResult {
  // Approximate standard sizing table
  if (lengthCm < 17) {
    return { eu: 26, uk: 8.5, usMen: 9.5, usWomen: 9.5, cm: 16.5, inches: 6.5 };
  } else if (lengthCm < 18) {
    return { eu: 28, uk: 10, usMen: 11, usWomen: 11, cm: 17.5, inches: 6.9 };
  } else if (lengthCm < 19.5) {
    return { eu: 30, uk: 12, usMen: 13, usWomen: 13, cm: 19.0, inches: 7.5 };
  } else if (lengthCm < 21) {
    return { eu: 32, uk: 1, usMen: 2, usWomen: 2.5, cm: 20.5, inches: 8.1 };
  } else if (lengthCm < 22.5) {
    return { eu: 35, uk: 3, usMen: 4, usWomen: 5, cm: 22.0, inches: 8.7 };
  } else if (lengthCm < 23.3) {
    return { eu: 36, uk: 3.5, usMen: 4.5, usWomen: 5.5, cm: 23.0, inches: 9.0 };
  } else if (lengthCm < 24.0) {
    return { eu: 37, uk: 4.5, usMen: 5.5, usWomen: 6.5, cm: 23.8, inches: 9.3 };
  } else if (lengthCm < 24.8) {
    return { eu: 38, uk: 5.5, usMen: 6.5, usWomen: 7.5, cm: 24.5, inches: 9.6 };
  } else if (lengthCm < 25.5) {
    return { eu: 39, uk: 6, usMen: 7, usWomen: 8.5, cm: 25.2, inches: 9.9 };
  } else if (lengthCm < 26.3) {
    return { eu: 40, uk: 6.5, usMen: 7.5, usWomen: 9, cm: 26.0, inches: 10.2 };
  } else if (lengthCm < 27.0) {
    return { eu: 41, uk: 7.5, usMen: 8.5, usWomen: 10, cm: 26.7, inches: 10.5 };
  } else if (lengthCm < 27.8) {
    return { eu: 42, uk: 8.5, usMen: 9.5, usWomen: 11, cm: 27.5, inches: 10.8 };
  } else if (lengthCm < 28.5) {
    return { eu: 43, uk: 9.5, usMen: 10.5, usWomen: 12, cm: 28.2, inches: 11.1 };
  } else if (lengthCm < 29.3) {
    return { eu: 44, uk: 10.5, usMen: 11.5, usWomen: 13, cm: 29.0, inches: 11.4 };
  } else {
    return { eu: 45, uk: 11.5, usMen: 12.5, usWomen: 14, cm: 29.8, inches: 11.7 };
  }
}
