export const PROVINCE_NAMES: Record<string, string> = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  YT: 'Yukon',
}

export function resolveProvinceName(code: string | null | undefined): string {
  if (!code) return 'Alberta'
  return PROVINCE_NAMES[code.toUpperCase()] ?? 'Alberta'
}

export function substituteProvince(content: string, provinceCode: string | null | undefined): string {
  return content.replace(/\{\{PROVINCE\}\}/g, resolveProvinceName(provinceCode))
}
