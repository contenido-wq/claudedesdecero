// Maneja el formulario del hero.
// - modo 'checkout': redirige al Payment Link (Stripe/Hotmart/…) con el email prellenado.
// - modos 'leads' / 'leads_then_checkout': deja el submit normal (POST al servidor),
//   que responde con redirección al 'gracias' o al checkout.
const form = document.getElementById('inscripcion-form');
if (form) {
  const mode = form.dataset.mode || 'checkout';
  const checkoutUrl = form.dataset.checkoutUrl || '';

  form.addEventListener('submit', function (event) {
    if (mode === 'checkout') {
      event.preventDefault();
      if (!checkoutUrl) return;
      const email = this.elements.email ? this.elements.email.value.trim() : '';
      try {
        const url = new URL(checkoutUrl);
        if (email) url.searchParams.set('prefilled_email', email);
        window.location.href = url.toString();
      } catch (_) {
        window.location.href = checkoutUrl;
      }
    }
  });
}

// Carrusel "coverflow" (sección de problema): ANTES pasado como imágenes.
document.querySelectorAll('[data-carrusel]').forEach(function (carrusel) {
  const slides = Array.from(carrusel.querySelectorAll('[data-carrusel-slide]'));
  const dots = Array.from(carrusel.querySelectorAll('[data-carrusel-dot]'));
  const total = slides.length;
  if (!total) return;

  const mitad = Math.floor(total / 2);
  let activo = 0;

  function render() {
    slides.forEach(function (slide, i) {
      let offset = i - activo;
      if (offset > mitad) offset -= total;
      if (offset < -mitad) offset += total;
      slide.dataset.offset = offset;
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle('carrusel__dot--activo', i === activo);
    });
  }

  function ir(index) {
    activo = ((index % total) + total) % total;
    render();
  }

  const prev = carrusel.querySelector('[data-carrusel-prev]');
  const next = carrusel.querySelector('[data-carrusel-next]');
  if (prev) prev.addEventListener('click', function () { ir(activo - 1); });
  if (next) next.addEventListener('click', function () { ir(activo + 1); });
  slides.forEach(function (slide, i) { slide.addEventListener('click', function () { ir(i); }); });
  dots.forEach(function (dot, i) { dot.addEventListener('click', function () { ir(i); }); });

  render();
});
