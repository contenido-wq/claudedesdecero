// Manejo del formulario de inscripción.
// Al enviar, redirige al Payment Link de Stripe.
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/dRm00j5X0aVKfY77iL4gg0v';

const form = document.getElementById('inscripcion-form');

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const email = this.elements.email.value.trim();

  const url = new URL(STRIPE_PAYMENT_LINK);
  if (email) url.searchParams.set('prefilled_email', email);
  window.location.href = url.toString();
});
