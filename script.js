'use strict';

// Demo catalogue. Order data stays in this page; no payment or order API is called.
const districts = [
  'Дзержинский район',
  'Железнодорожный район',
  'Заельцовский район',
  'Калининский район',
  'Кировский район',
  'Ленинский район',
  'Октябрьский район',
  'Первомайский район',
  'Советский район',
  'Центральный район',
];
const products = [
  {
    id: 'gentle',
    name: 'Нежные чувства',
    detail: 'Розы и эвкалипт',
    price: 4290,
    category: 'roses',
    image: 'bouquet-1.webp',
  },
  {
    id: 'peony',
    name: 'Розовый пион',
    detail: 'Пионы в нежных оттенках',
    price: 5490,
    category: 'peonies',
    image: 'bouquet-2.webp',
  },
  {
    id: 'spring',
    name: 'Весеннее настроение',
    detail: 'Авторский сборный букет',
    price: 3990,
    category: 'author',
    image: 'bouquet-3.webp',
  },
  {
    id: 'warmth',
    name: 'Тёплые объятия',
    detail: 'Кремовые розы и эустома',
    price: 4590,
    category: 'author',
    image: 'bouquet-4.webp',
  },
];
const cart = new Map();
const $ = (selector) => document.querySelector(selector);
const dialog = $('#cart-dialog');
const dateInput = $('#date');
const phoneInput = $('[name="phone"]');
const currency = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});
const money = (value) => currency.format(value);
let toastTimer;

// Dynamic catalogue/customer values are always text nodes or checked attributes.
function element(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function button(text, className, handler, label) {
  const node = element('button', className, text);
  node.type = 'button';
  if (label) node.setAttribute('aria-label', label);
  node.addEventListener('click', handler);
  return node;
}

function symbol(kind) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', '0 0 20 20');
  node.setAttribute('fill', 'none');
  node.setAttribute('stroke', 'currentColor');
  node.setAttribute('stroke-width', '1.5');
  node.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', kind === 'minus' ? 'M4 10h12' : 'M4 10h12M10 4v12');
  path.setAttribute('stroke-linecap', 'round');
  node.append(path);
  return node;
}

function productImage(product, thumbnail = false) {
  const image = element('img');
  const path = String(product.image);
  // External/CMS URLs require an explicit allowlist before they can be enabled.
  image.src = /^[a-z0-9-]+\.webp$/.test(path) ? path : 'logo.webp';
  image.alt = thumbnail ? '' : `Букет «${product.name}»`;
  if (!thumbnail) {
    image.loading = 'lazy';
    image.width = 340;
    image.height = 420;
  }
  return image;
}

function toast(text) {
  $('#toast').textContent = text;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2200);
}

function updateCount() {
  $('#cart-count').textContent = [...cart.values()].reduce((sum, count) => sum + count, 0);
}

function total() {
  return products.reduce((sum, product) => sum + product.price * (cart.get(product.id) || 0), 0);
}

function renderProducts(filter = 'all') {
  const cards = products
    .filter((product) => filter === 'all' || product.category === filter)
    .map((product) => {
      const card = element('article', 'product');
      const content = element('div', 'product-content');
      const bottom = element('div', 'product-bottom');
      const add = button(
        'В корзину ',
        'add-button',
        () => {
          cart.set(product.id, Math.min(99, (cart.get(product.id) || 0) + 1));
          updateCount();
          toast('Букет добавлен в корзину');
        },
        `Добавить ${product.name} в корзину`,
      );
      add.append(symbol('plus'));
      bottom.append(element('div', 'price', money(product.price)), add);
      content.append(element('h3', '', product.name), element('small', '', product.detail), bottom);
      card.append(productImage(product), content);
      return card;
    });
  $('#products').replaceChildren(...cards);
}

function renderCart() {
  const root = $('#cart-content');
  const hadCartFocus = dialog.open && root.contains(document.activeElement);
  const focusedLabel = dialog.open ? document.activeElement.getAttribute('aria-label') : null;
  $('#confirmation').hidden = true;
  root.hidden = false;
  $('#checkout').hidden = !cart.size;
  root.replaceChildren();
  if (!cart.size) {
    const message = element('p', 'empty');
    message.append(
      document.createTextNode('В корзине пока нет цветов.'),
      element('br'),
      document.createTextNode('Выберите букет, который скажет всё за вас.'),
    );
    const select = button('Выбрать букет', 'button wide', () => {
      dialog.close();
      location.hash = 'catalog';
    });
    root.append(message, select);
    if (dialog.open) select.focus({ preventScroll: true });
    return;
  }

  for (const product of products.filter((item) => cart.has(item.id))) {
    const row = element('div', 'cart-row');
    const info = element('div', 'row-info');
    const remove = button(
      'Удалить',
      'remove',
      () => {
        cart.delete(product.id);
        updateCount();
        renderCart();
      },
      `Удалить ${product.name}`,
    );
    info.append(
      element('strong', '', product.name),
      element('span', '', money(product.price)),
      remove,
    );
    const quantity = element('div', 'quantity');
    const change = (difference) => {
      const next = (cart.get(product.id) || 0) + difference;
      if (next <= 0) cart.delete(product.id);
      else cart.set(product.id, Math.min(99, next));
      updateCount();
      renderCart();
    };
    const minus = button('', '', () => change(-1), `Уменьшить количество ${product.name}`);
    const plus = button('', '', () => change(1), `Увеличить количество ${product.name}`);
    minus.append(symbol('minus'));
    plus.append(symbol('plus'));
    quantity.append(minus, element('span', '', cart.get(product.id)), plus);
    row.append(productImage(product, true), info, quantity);
    root.append(row);
  }
  const sum = element('div', 'total');
  sum.append(element('span', '', 'Букеты'), element('strong', '', money(total())));
  root.append(sum);
  if (dialog.open && (focusedLabel || hadCartFocus)) {
    const next = [...root.querySelectorAll('button')].find(
      (control) => control.getAttribute('aria-label') === focusedLabel,
    );
    (next || $('[data-close]')).focus({ preventScroll: true });
  }
}

function cityToday() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Novosibirsk',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function validCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

// Configure delivery closures here later: 0 = Sunday, 1 = Monday, ... 6 = Saturday.
const deliverySchedule = { closedWeekdays: [], closedDates: [] };
let calendarMonth = '';

function deliveryDateLabel(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function isDeliveryAvailable(value, today = cityToday()) {
  if (!validCalendarDate(value) || value < today) return false;
  const [year, month, day] = value.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (
    !deliverySchedule.closedDates.includes(value) &&
    !deliverySchedule.closedWeekdays.includes(weekday)
  );
}

function refreshDate() {
  dateInput.min = cityToday();
  if (dateInput.value && !isDeliveryAvailable(dateInput.value, dateInput.min)) {
    dateInput.value = '';
    $('#date-error').hidden = false;
    $('#date-trigger').setAttribute('aria-invalid', 'true');
  }
  $('#date-trigger-text').textContent = dateInput.value
    ? deliveryDateLabel(dateInput.value)
    : 'Выберите дату';
  if (!$('#delivery-calendar').hidden) renderDeliveryCalendar();
}

function renderDeliveryCalendar() {
  const today = cityToday();
  if (!calendarMonth || calendarMonth < today.slice(0, 7)) calendarMonth = today.slice(0, 7);
  const [year, month] = calendarMonth.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const focusedDate = $('#calendar-days').contains(document.activeElement)
    ? document.activeElement.dataset.date
    : null;
  $('#calendar-month').textContent = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(first);
  $('#calendar-prev').disabled = calendarMonth <= today.slice(0, 7);
  $('#calendar-next').disabled = year >= 9999 && month === 12;
  const weeks = [];
  for (let cell = 0; cell < Math.ceil((offset + count) / 7) * 7; cell++) {
    if (cell % 7 === 0) {
      const week = element('div', 'calendar-week');
      week.setAttribute('role', 'row');
      weeks.push(week);
    }
    const cellNode = element('div');
    cellNode.setAttribute('role', 'gridcell');
    const day = cell - offset + 1;
    if (day >= 1 && day <= count) {
      const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayButton = button(
        String(day),
        'calendar-day',
        () => selectDeliveryDate(value),
        deliveryDateLabel(value),
      );
      dayButton.dataset.date = value;
      dayButton.disabled = !isDeliveryAvailable(value, today);
      dayButton.classList.toggle('is-today', value === today);
      dayButton.classList.toggle('is-selected', value === dateInput.value);
      dayButton.setAttribute('aria-pressed', String(value === dateInput.value));
      if (value === today) dayButton.setAttribute('aria-current', 'date');
      if (dayButton.disabled && value >= today) dayButton.title = 'Доставка в этот день недоступна';
      cellNode.append(dayButton);
    } else cellNode.setAttribute('aria-hidden', 'true');
    weeks[weeks.length - 1].append(cellNode);
  }
  $('#calendar-days').replaceChildren(...weeks);
  if (focusedDate) focusCalendarDate(focusedDate);
}

function focusCalendarDate(value) {
  const target = [...document.querySelectorAll('.calendar-day:not(:disabled)')].find(
    (day) => day.dataset.date === value,
  );
  if (target) target.focus({ preventScroll: true });
  return Boolean(target);
}

function openDeliveryCalendar() {
  calendarMonth = (dateInput.value || cityToday()).slice(0, 7);
  $('#delivery-calendar').hidden = false;
  $('#date-trigger').setAttribute('aria-expanded', 'true');
  renderDeliveryCalendar();
  if (!focusCalendarDate(dateInput.value || cityToday()))
    $('#calendar-days button:not(:disabled)')?.focus({ preventScroll: true });
}

function closeDeliveryCalendar(restoreFocus = false) {
  $('#delivery-calendar').hidden = true;
  $('#date-trigger').setAttribute('aria-expanded', 'false');
  if (restoreFocus) $('#date-trigger').focus({ preventScroll: true });
}

function selectDeliveryDate(value) {
  if (!isDeliveryAvailable(value)) return;
  dateInput.value = value;
  $('#date-error').hidden = true;
  $('#date-trigger').removeAttribute('aria-invalid');
  refreshDate();
  closeDeliveryCalendar(true);
}

function moveCalendarMonth(delta) {
  const [year, month] = calendarMonth.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  const value = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
  if (value < cityToday().slice(0, 7) || shifted.getUTCFullYear() > 9999) return;
  calendarMonth = value;
  renderDeliveryCalendar();
}

function setupDeliveryCalendar() {
  $('#date-trigger').addEventListener('click', () => {
    if ($('#delivery-calendar').hidden) openDeliveryCalendar();
    else closeDeliveryCalendar();
  });
  $('#calendar-prev').addEventListener('click', () => moveCalendarMonth(-1));
  $('#calendar-next').addEventListener('click', () => moveCalendarMonth(1));
  document.addEventListener('pointerdown', (event) => {
    if (!$('#delivery-calendar').hidden && !$('#delivery-date-field').contains(event.target))
      closeDeliveryCalendar();
  });
  $('#delivery-calendar').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeDeliveryCalendar(true);
      return;
    }
    const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const delta = deltas[event.key];
    const current = event.target.dataset.date;
    if (!delta || !current) return;
    event.preventDefault();
    const [year, month, day] = current.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + delta));
    for (let attempts = 0; attempts < 370; attempts++) {
      const value = next.toISOString().slice(0, 10);
      if (value < cityToday()) return;
      if (isDeliveryAvailable(value)) {
        calendarMonth = value.slice(0, 7);
        renderDeliveryCalendar();
        focusCalendarDate(value);
        return;
      }
      next.setUTCDate(next.getUTCDate() + Math.sign(delta));
    }
  });
  dialog.addEventListener('close', () => closeDeliveryCalendar());
}

function normalizePhone(value) {
  const raw = value.trim();
  if (!/^\+?[0-9()\s-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+') && !/^7[3489]\d{9}$/.test(digits)) return null;
  const national = /^[78]\d{10}$/.test(digits) ? digits.slice(1) : digits;
  return /^[3489]\d{9}$/.test(national) ? '+7' + national : null;
}

function validatePhone() {
  const normalized = normalizePhone(phoneInput.value);
  phoneInput.setCustomValidity(
    phoneInput.value && !normalized
      ? 'Укажите российский номер: +7 и 10 цифр, например +7 (999) 123-45-67'
      : '',
  );
  return normalized;
}

document.querySelectorAll('[data-filter]').forEach((control) =>
  control.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((item) => {
      item.classList.toggle('selected', item === control);
      item.setAttribute('aria-pressed', String(item === control));
    });
    renderProducts(control.dataset.filter);
  }),
);
districts.forEach((name) => {
  $('#district-list').append(element('li', '', name));
  $('#district').add(new Option(name, name));
});

dateInput.addEventListener('focus', refreshDate);
dateInput.addEventListener('input', refreshDate);
dateInput.addEventListener('change', refreshDate);
window.addEventListener('focus', refreshDate);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshDate();
});
phoneInput.addEventListener('input', validatePhone);
phoneInput.addEventListener('blur', () => {
  const normalized = validatePhone();
  if (normalized) phoneInput.value = normalized;
});

$('#open-cart').addEventListener('click', () => {
  refreshDate();
  renderCart();
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('modal-open');
});
$('[data-close]').addEventListener('click', () => dialog.close());
let backdropPress = false;
// The dialog-shell covers all inner padding: only an actual outside press targets dialog.
dialog.addEventListener('pointerdown', (event) => {
  backdropPress = event.isPrimary && event.button === 0 && event.target === dialog;
});
dialog.addEventListener('pointermove', () => {
  backdropPress = false;
});
dialog.addEventListener('pointercancel', () => {
  backdropPress = false;
});
dialog.addEventListener('click', (event) => {
  if (backdropPress && event.target === dialog) dialog.close();
  backdropPress = false;
});
dialog.addEventListener('close', () => {
  backdropPress = false;
  document.body.classList.remove('modal-open');
});

$('#checkout').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!cart.size) return;
  refreshDate();
  const normalized = validatePhone();
  const form = event.currentTarget;
  if (!isDeliveryAvailable(dateInput.value)) {
    $('#date-error').hidden = false;
    $('#date-trigger').setAttribute('aria-invalid', 'true');
    openDeliveryCalendar();
    return;
  }
  if (!form.reportValidity() || !normalized) return;
  const data = new FormData(form);
  const customer = String(data.get('customer')).trim();
  const address = String(data.get('address')).trim();
  if (!customer || address.length < 5 || !districts.includes(data.get('district'))) {
    toast('Проверьте имя, адрес и район доставки');
    return;
  }
  const title = element('h3', 'success-title', 'Вот как будет выглядеть заказ');
  title.tabIndex = -1;
  const note = element('p', '', 'Это проверка шаблона. Заказ не отправлен, оплата не проводилась.');
  const summary = element('div', 'summary');
  const lines = [
    ...products
      .filter((product) => cart.has(product.id))
      .map(
        (product) =>
          `${product.name} × ${cart.get(product.id)} — ${money(product.price * cart.get(product.id))}`,
      ),
    `Букеты: ${money(total())} · доставка уточняется`,
    `Покупатель: ${customer}`,
    `Телефон: ${normalized}`,
    `Район: ${data.get('district')}`,
    `Адрес: ${address}`,
    `Дата: ${dateInput.value}`,
    data.get('recipient') ? `Получатель: ${data.get('recipient')}` : '',
    data.get('message') ? `Открытка и пожелания: ${data.get('message')}` : '',
  ];
  summary.append(...lines.filter(Boolean).map((text) => element('p', '', text)));
  const back = button('Вернуться к оформлению', 'button wide confirmation-back', () => {
    renderCart();
    $('[name="customer"]').focus({ preventScroll: true });
  });
  $('#confirmation').replaceChildren(title, note, summary, back);
  $('#checkout').hidden = true;
  $('#cart-content').hidden = true;
  $('#confirmation').hidden = false;
  dialog.scrollTop = 0;
  title.focus({ preventScroll: true });
});

document.querySelectorAll('[data-message]').forEach((control) =>
  control.addEventListener('click', () => {
    document
      .querySelectorAll('[data-message]')
      .forEach((item) => item.setAttribute('aria-pressed', String(item === control)));
    $('#postcard-message').textContent = control.dataset.message;
  }),
);
$('#use-message').addEventListener('click', () => {
  $('[name="message"]').value = $('#postcard-message').textContent;
  toast('Текст открытки добавлен к заказу');
});

setupDeliveryCalendar();
refreshDate();
// Also update a picker left open across midnight; submission rechecks independently.
setInterval(refreshDate, 60_000);
renderProducts();

// Preserve the layout and anchor offset when the tablet header wraps to two rows.
(() => {
  const header = document.querySelector('.header');
  if (!header) return;
  const updateScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  const updateHeight = () => document.documentElement.style.setProperty('--navigation-height', `${Math.ceil(header.getBoundingClientRect().height) + 16}px`);
  window.addEventListener('scroll', updateScroll, { passive: true });
  new ResizeObserver(updateHeight).observe(header);
  updateScroll(); updateHeight();
})();

(() => {
  const select = document.querySelector('#district');
  const label = select.closest('label');
  const field = document.createElement('div');
  field.className = label.className;
  while (label.firstChild) field.append(label.firstChild);
  label.replaceWith(field);
  field.classList.add('district-field');
  select.classList.add('district-native'); select.tabIndex = -1;
  const trigger = document.createElement('button');
  trigger.type = 'button'; trigger.className = 'district-trigger';
  trigger.textContent = select.selectedOptions[0].textContent;
  trigger.setAttribute('aria-label', 'Район доставки');
  trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', 'district-options');
  const options = document.createElement('div'); options.id = 'district-options'; options.className = 'district-options'; options.hidden = true;
  const close = (focus = false) => { options.hidden = true; trigger.setAttribute('aria-expanded', 'false'); if (focus) trigger.focus({ preventScroll: true }); };
  [...select.options].filter(option => option.value).forEach(option => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = option.textContent;
    button.setAttribute('aria-pressed', String(select.value === option.value));
    button.addEventListener('click', () => { select.value = option.value; trigger.textContent = option.textContent; trigger.removeAttribute('aria-invalid'); options.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button))); select.dispatchEvent(new Event('change', { bubbles: true })); close(true); });
    options.append(button);
  });
  field.append(trigger, options);
  trigger.addEventListener('click', () => { if (!options.hidden) return close(); closeDeliveryCalendar(); options.hidden = false; trigger.setAttribute('aria-expanded', 'true'); (options.querySelector('[aria-pressed=true]') || options.querySelector('button')).focus({ preventScroll: true }); });
  select.addEventListener('invalid', event => { event.preventDefault(); trigger.setAttribute('aria-invalid', 'true'); trigger.focus(); });
  field.addEventListener('keydown', event => { if (event.key === 'Escape' && !options.hidden) { event.preventDefault(); event.stopPropagation(); close(true); } if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !options.hidden) { event.preventDefault(); const buttons = [...options.querySelectorAll('button')]; const index = buttons.indexOf(document.activeElement); const next = buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]; next.focus({ preventScroll: true }); next.scrollIntoView({ block: 'nearest' }); } });
  document.addEventListener('click', event => { if (!field.contains(event.target)) close(); });
  field.addEventListener('keydown', event => { if (event.key === 'Tab') setTimeout(() => { if (!field.contains(document.activeElement)) close(); }, 0); });
  document.querySelector('dialog').addEventListener('close', () => close());
  const calendar = document.querySelector('#delivery-calendar');
  const placeCalendar = () => { if (calendar.hidden) return; const dialogRect = calendar.closest('dialog').getBoundingClientRect(); const rect = document.querySelector('#date-trigger').getBoundingClientRect(); const height = calendar.offsetHeight; calendar.classList.toggle('opens-above', dialogRect.bottom - rect.bottom < height + 24 && rect.top - dialogRect.top > height + 24); };
  new MutationObserver(placeCalendar).observe(calendar, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('resize', placeCalendar);
})();
