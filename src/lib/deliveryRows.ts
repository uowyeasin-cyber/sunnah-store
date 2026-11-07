import { shippingFor } from './shipping';
import type { Settings } from './settings';

// One delivery line per warehouse region plus worldwide, from the same rules checkout uses.
export const deliveryRows = (s: Settings) =>
  ([['United States', 'USA'], ['Malaysia', 'Malaysia'], ['Bangladesh', 'Bangladesh'], ['United Kingdom', 'Worldwide']] as const)
    .map(([c, label]) => { const sh = shippingFor(c, 0, s.regions); return { label, country: c, days: sh.days, courier: sh.courier, warehouse: sh.warehouse }; });
