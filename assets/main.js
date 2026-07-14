// Manejo del formulario de inscripción.
// Al enviar, guarda los datos en Google Sheets y redirige al Payment Link de Stripe.
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/dRm00j5X0aVKfY77iL4gg0v';
const SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzOcA5iAIXkVqMap06o0kbxa1z5WXFlBfY7RJ6D1zBQYL27qJv8BQwJy2evk0cQeVrA/exec';

document.getElementById('inscripcion-form').addEventListener('submit', function (event) {
  event.preventDefault();

  const nombre = this.elements.nombre.value.trim();
  const telefono = this.elements.telefono.value.trim();
  const email = this.elements.email.value.trim();
  const feedback = document.getElementById('form-feedback');

  if (!nombre || !telefono || !email) {
    feedback.textContent = 'Por favor completa nombre, teléfono (con indicativo) y correo.';
    return;
  }

  feedback.textContent = 'Guardando tus datos...';

  const datos = new FormData();
  datos.append('nombre', nombre);
  datos.append('telefono', telefono);
  datos.append('email', email);

  const irAlPago = function () {
    const url = new URL(STRIPE_PAYMENT_LINK);
    url.searchParams.set('prefilled_email', email);
    window.location.href = url.toString();
  };

  fetch(SHEET_WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: datos,
  })
    .catch(function () {
      // Si falla el guardado, igual dejamos pasar al pago para no bloquear la conversión.
    })
    .finally(irAlPago);
});
