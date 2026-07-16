// Manejo del formulario de inscripción.
// Al enviar, guarda los datos en Google Sheets y redirige al Payment Link de Stripe.
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/dRm00j5X0aVKfY77iL4gg0v';
const SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzOcA5iAIXkVqMap06o0kbxa1z5WXFlBfY7RJ6D1zBQYL27qJv8BQwJy2evk0cQeVrA/exec';

const form = document.getElementById('inscripcion-form');
const feedback = document.getElementById('form-feedback');

// Limpia el estado de error de un campo apenas el usuario lo corrige.
form.querySelectorAll('input, select').forEach(function (campo) {
  campo.addEventListener('input', function () {
    campo.classList.remove('input-error');
  });
});

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const nombreInput = this.elements.nombre;
  const numeroInput = this.elements.numero;
  const emailInput = this.elements.email;
  const indicativo = this.elements.indicativo.value.trim();

  const nombre = nombreInput.value.trim();
  const numero = numeroInput.value.trim();
  const email = emailInput.value.trim();

  // No dependemos de la validación nativa del navegador (required/checkValidity):
  // en navegadores embebidos (Instagram, WhatsApp, TikTok) no siempre se muestra
  // el aviso nativo, y el usuario se queda sin saber por qué no avanza.
  const emailInvalido = email !== '' && !emailInput.checkValidity();
  const camposInvalidos = [];
  if (!nombre) camposInvalidos.push(nombreInput);
  if (!numero) camposInvalidos.push(numeroInput);
  if (!email || emailInvalido) camposInvalidos.push(emailInput);

  if (camposInvalidos.length > 0) {
    camposInvalidos.forEach(function (campo) {
      campo.classList.add('input-error');
    });
    camposInvalidos[0].focus();
    feedback.textContent = emailInvalido && nombre && numero
      ? 'Revisa tu correo, parece que tiene un error.'
      : 'Por favor completa nombre, teléfono y correo para continuar.';
    return;
  }

  feedback.textContent = 'Guardando tus datos...';

  // Sin el "+" al inicio: Google Sheets interpreta un valor que empieza con "+" como fórmula (#ERROR!).
  const telefono = indicativo.replace('+', '') + ' ' + numero;

  const datos = new FormData();
  datos.append('nombre', nombre);
  datos.append('telefono', telefono);
  datos.append('email', email);

  const irAlPago = function () {
    const url = new URL(STRIPE_PAYMENT_LINK);
    url.searchParams.set('prefilled_email', email);
    window.location.href = url.toString();
  };

  // Si el guardado en Sheets se cuelga (red lenta, bloqueadores), no dejamos
  // al usuario esperando para siempre: after 4s seguimos al pago igual.
  const controller = new AbortController();
  const timeoutId = setTimeout(function () {
    controller.abort();
  }, 4000);

  fetch(SHEET_WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: datos,
    signal: controller.signal,
  })
    .catch(function () {
      // Si falla o se cancela el guardado, igual dejamos pasar al pago para no bloquear la conversión.
    })
    .finally(function () {
      clearTimeout(timeoutId);
      irAlPago();
    });
});
