export type CheckoutAddress = {
  email: string; firstName: string; lastName: string; address1: string;
  address2: string; city: string; state: string; zip: string; phone: string;
};

export const ADDRESS_FIELDS: {name: keyof CheckoutAddress; label: string; required: boolean; type?: string; autoComplete: string}[] = [
  {name: 'email', label: 'Email', required: true, type: 'email', autoComplete: 'email'},
  {name: 'firstName', label: 'First name', required: true, autoComplete: 'given-name'},
  {name: 'lastName', label: 'Last name', required: true, autoComplete: 'family-name'},
  {name: 'address1', label: 'Address', required: true, autoComplete: 'address-line1'},
  {name: 'address2', label: 'Apartment, suite (optional)', required: false, autoComplete: 'address-line2'},
  {name: 'city', label: 'City', required: true, autoComplete: 'address-level2'},
  {name: 'state', label: 'State', required: true, autoComplete: 'address-level1'},
  {name: 'zip', label: 'ZIP code', required: true, autoComplete: 'postal-code'},
  {name: 'phone', label: 'Phone', required: true, type: 'tel', autoComplete: 'tel'},
];


export const US_STATES: [code: string, name: string][] = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],
  ['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],
  ['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],
  ['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],
  ['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],
  ['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],
  ['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],
  ['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],
  ['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],
  ['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
];

/** "California" / "california" / "ca" -> "CA". Returns '' if unrecognized. */
export function normalizeState(input: string): string {
  const v = input.trim().toLowerCase().replace(/\./g, '');
  if (!v) return '';
  const hit = US_STATES.find(([code, name]) => code.toLowerCase() === v || name.toLowerCase() === v);
  return hit ? hit[0] : '';
}

/** Strips formatting and a leading US country code: "+1 (657) 364-9088" -> "6573649088". */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}
