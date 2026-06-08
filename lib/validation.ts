import { validatePhone } from './clientValidation'

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function isValidPhone(phone: string): boolean {
  return validatePhone(phone) === null
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8
}
