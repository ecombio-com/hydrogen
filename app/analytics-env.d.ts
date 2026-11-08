export {};

declare global {
  interface Env {
    GA_MEASUREMENT_ID: string;
    PUBLIC_CHECKOUT_DOMAIN: string;
  }
}
