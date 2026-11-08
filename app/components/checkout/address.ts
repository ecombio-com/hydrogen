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
  {name: 'state', label: 'State (2 letters, e.g. CA)', required: true, autoComplete: 'address-level1'},
  {name: 'zip', label: 'ZIP code', required: true, autoComplete: 'postal-code'},
  {name: 'phone', label: 'Phone', required: true, type: 'tel', autoComplete: 'tel'},
];

