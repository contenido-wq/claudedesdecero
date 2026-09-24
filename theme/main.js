// Maneja el formulario del hero.
// - modo 'checkout': redirige al Payment Link (Stripe/Hotmart/…) con el email prellenado.
// - modos 'leads' / 'leads_then_checkout': deja el submit normal (POST al servidor),
//   que responde con redirección al 'gracias' o al checkout.
const form = document.getElementById('inscripcion-form');
if (form) {
  const mode = form.dataset.mode || 'checkout';
  const checkoutUrl = form.dataset.checkoutUrl || '';

  form.addEventListener('submit', function (event) {
    if (mode === 'checkout' && form.hasAttribute('data-abrir-pago') && window.abrirPago) {
      event.preventDefault();
      window.abrirPago();
      return;
    }

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

// Checkout en modal (solo existe si la landing tiene metodos_pago válidos).
// Pantalla única: datos + método + resumen. Al enviar se guarda el lead (JSON) y
// luego: método 'link' → va al pago; método 'manual' → muestra los datos de pago.
(function () {
  const dialogo = document.getElementById('pago-dialogo');
  if (!dialogo || typeof dialogo.showModal !== 'function') return;

  const form = dialogo.querySelector('[data-pago-form]');
  const paneles = Array.from(dialogo.querySelectorAll('[data-panel]'));
  const error = dialogo.querySelector('[data-pago-error]');
  const total = dialogo.querySelector('[data-pago-total]');
  const nota = dialogo.querySelector('[data-pago-nota]');
  const enviar = dialogo.querySelector('[data-pago-enviar]');
  const slug = dialogo.dataset.slug;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function metodoActual() {
    return form.querySelector('input[name="metodo"]:checked');
  }

  function mostrarForm() {
    paneles.forEach(function (p) { p.hidden = true; });
    form.hidden = false;
  }

  // Agrega al mensaje de WhatsApp el nombre y correo que la persona ya escribió,
  // para poder cruzar su comprobante con la fila de la hoja.
  function personalizarWhatsapp(panel) {
    const a = panel.querySelector('.pago__wa');
    if (!a) return;
    if (!a.dataset.base) a.dataset.base = a.href;
    try {
      const url = new URL(a.dataset.base);
      if (url.hostname !== 'wa.me') return;
      const e = form.elements;
      const extra = ' Mi nombre es ' + e.nombre.value.trim() + ' y mi correo es ' + e.email.value.trim() + '.';
      url.searchParams.set('text', (url.searchParams.get('text') || '') + extra);
      // URLSearchParams codifica el espacio como '+'; se unifica a %20 (un '+' real ya va como %2B).
      a.href = url.toString().replace(/\+/g, '%20');
    } catch (_) {}
  }

  function mostrarPanel(id) {
    form.hidden = true;
    paneles.forEach(function (p) {
      p.hidden = p.dataset.panel !== id;
      if (!p.hidden) personalizarWhatsapp(p);
    });
    dialogo.scrollTop = 0;
  }

  function mostrarError(texto) {
    error.textContent = texto;
    error.hidden = !texto;
  }

  // Refleja el método elegido: total, nota y texto del botón.
  function actualizarMetodo() {
    const m = metodoActual();
    if (!m) return;
    total.textContent = m.dataset.monto || total.dataset.precio;
    nota.textContent = m.dataset.nota || '';
    nota.hidden = !m.dataset.nota;
    enviar.textContent = m.dataset.tipo === 'link' ? 'Pagar con ' + m.dataset.nombre : 'Ver datos de pago';
  }

  function urlDePago(m) {
    try {
      const url = new URL(m.dataset.url);
      const email = form.elements.email.value.trim();
      // Solo Stripe entiende prefilled_email; a los demás no se les agregan parámetros.
      if (email && /(^|\.)stripe\.com$/.test(url.hostname)) url.searchParams.set('prefilled_email', email);
      return url.toString();
    } catch (_) {
      return m.dataset.url;
    }
  }

  function validar() {
    const e = form.elements;
    if (!e.nombre.value.trim()) return 'Escribe tu nombre completo.';
    if (!EMAIL_RE.test(e.email.value.trim())) return 'Escribe un correo electrónico válido.';
    if (e.numero.value.replace(/\D/g, '').length < 6) return 'Escribe tu número de teléfono.';
    return '';
  }

  window.abrirPago = function () {
    mostrarError('');
    mostrarForm();
    if (!dialogo.open) dialogo.showModal();
  };

  document.querySelectorAll('a[data-abrir-pago]').forEach(function (el) {
    el.addEventListener('click', function (event) {
      event.preventDefault();
      window.abrirPago();
    });
  });

  form.querySelectorAll('input[name="metodo"]').forEach(function (r) {
    r.addEventListener('change', actualizarMetodo);
  });
  actualizarMetodo();

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const m = metodoActual();
    const problema = validar();
    if (problema || !m) return mostrarError(problema || 'Elige un método de pago.');
    mostrarError('');
    enviar.disabled = true;

    const e = form.elements;
    try {
      const res = await fetch('/api/leads/' + encodeURIComponent(slug), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          nombre: e.nombre.value.trim(),
          email: e.email.value.trim(),
          indicativo: e.indicativo.value,
          numero: e.numero.value.trim(),
          website: e.website.value,
          metodo: m.value,
        }),
      });
      if (res.status === 400) {
        mostrarError('Revisa tus datos e inténtalo de nuevo.');
        enviar.disabled = false;
        return;
      }
    } catch (_) {
      // Si falla la red o el servidor no perdemos la venta: se sigue al pago.
    }

    enviar.disabled = false;
    if (m.dataset.tipo === 'link') window.location.href = urlDePago(m);
    else mostrarPanel(m.value);
  });

  dialogo.querySelectorAll('[data-pago-volver]').forEach(function (btn) {
    btn.addEventListener('click', mostrarForm);
  });
  dialogo.querySelectorAll('[data-pago-cerrar]').forEach(function (btn) {
    btn.addEventListener('click', function () { dialogo.close(); });
  });
  // Clic en el fondo oscuro (fuera de la caja) cierra el modal.
  dialogo.addEventListener('click', function (event) {
    if (event.target === dialogo) dialogo.close();
  });

  dialogo.querySelectorAll('[data-copiar]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const original = btn.textContent;
      const ok = function () {
        btn.textContent = '¡Copiado!';
        setTimeout(function () { btn.textContent = original; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(btn.dataset.valor).then(ok, function () {});
      }
    });
  });
})();
