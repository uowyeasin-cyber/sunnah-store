// Order steps shown to the customer and admin. Courier updates (phase 4) move an order along these.
export const STEPS = ['Order placed', 'Request sent to courier', 'Courier accepted', 'Picked up from warehouse', 'In transit', 'Out for delivery', 'Delivered'];
export const DELIVERED = STEPS.length - 1;
