const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const header = $('#site-header');
const menuToggle = $('#menu-toggle');
const mainNav = $('#main-nav');
const toast = $('#toast');
let toastTimer;

function showToast(message) {
  $('span', toast).textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function closeMenu() {
  mainNav.classList.remove('is-open');
  header.classList.remove('is-menu-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Открыть меню');
}

menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  mainNav.classList.toggle('is-open', open);
  header.classList.toggle('is-menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
});

$$('a', mainNav).forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('click', event => {
  if (!header.contains(event.target)) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
});

function updateHeader() {
  header.classList.toggle('is-scrolled', window.scrollY > 18);
}
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealItems = $$('.reveal');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px' });
  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('copy_failed');
}

$$('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      await copyText(button.dataset.copy);
      showToast('IP-адрес скопирован. Добавь его в избранное SA-MP.');
    } catch {
      showToast(`Скопируй адрес вручную: ${button.dataset.copy}`);
    }
  });
});

$$('[data-unavailable]').forEach(button => {
  button.addEventListener('click', () => {
    showToast(`Официальная ссылка ${button.dataset.unavailable} пока не добавлена. Загляни в наш Discord.`);
  });
});

function openDialog(dialog) {
  if (!dialog || dialog.open) return;
  dialog.showModal();
  document.body.classList.add('modal-open');
}

$$('[data-open-start]').forEach(button => {
  button.addEventListener('click', () => openDialog($('#start-dialog')));
});

$$('[data-dialog-target]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    openDialog(document.getElementById(link.dataset.dialogTarget));
  });
});

$$('dialog').forEach(dialog => {
  $('[data-close-dialog]', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
});

const trailer = $('#trailer');
const videoShell = $('#video-shell');
const chapters = $$('.chapter');

function playTrailerAt(time) {
  const seek = () => { trailer.currentTime = time; };
  if (trailer.readyState >= 1) seek();
  else trailer.addEventListener('loadedmetadata', seek, { once: true });
  trailer.play().catch(() => {});
  videoShell.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
}

$('#watch-trailer').addEventListener('click', () => playTrailerAt(0));
$('#trailer-play').addEventListener('click', () => trailer.play().catch(() => {}));
trailer.addEventListener('play', () => videoShell.classList.add('is-playing'));
trailer.addEventListener('pause', () => videoShell.classList.remove('is-playing'));
trailer.addEventListener('ended', () => videoShell.classList.remove('is-playing'));
trailer.addEventListener('timeupdate', () => {
  const current = trailer.currentTime;
  chapters.forEach((chapter, index) => {
    const nextTime = chapters[index + 1]?.dataset.time ?? Infinity;
    chapter.classList.toggle('is-active', current >= Number(chapter.dataset.time) && current < Number(nextTime));
  });
});
chapters.forEach(chapter => {
  chapter.addEventListener('click', () => playTrailerAt(Number(chapter.dataset.time)));
});

const galleryDialog = $('#gallery-dialog');
const galleryImage = $('#gallery-dialog-image');
const galleryTitle = $('#gallery-dialog-title');
const galleryKicker = $('#gallery-dialog-kicker');
const galleryCount = $('#gallery-dialog-count');
const galleryItems = $$('.gallery-item');
let galleryIndex = 0;

function showGallerySlide(index) {
  if (!galleryItems.length) return;
  galleryIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[galleryIndex];
  const image = $('img', item);
  galleryImage.src = item.dataset.src;
  galleryImage.alt = image.alt;
  galleryTitle.textContent = item.dataset.title;
  galleryKicker.textContent = item.dataset.kicker;
  galleryCount.textContent = `${galleryIndex + 1} / ${galleryItems.length}`;
}

function openGallery(index) {
  showGallerySlide(index);
  openDialog(galleryDialog);
}

galleryItems.forEach((item, index) => {
  item.addEventListener('click', () => openGallery(index));
});

$('#gallery-open-first').addEventListener('click', () => openGallery(0));
$('#gallery-prev').addEventListener('click', () => showGallerySlide(galleryIndex - 1));
$('#gallery-next').addEventListener('click', () => showGallerySlide(galleryIndex + 1));
galleryDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') showGallerySlide(galleryIndex - 1);
  if (event.key === 'ArrowRight') showGallerySlide(galleryIndex + 1);
});

const statusElement = $('#server-status');
const onlineCount = $('#online-count');
const onlineTrack = $('#online-track');
const onlineFill = $('#online-fill');
const monitorNote = $('#monitor-note');

function renderStatus(data) {
  const max = Number.isInteger(data.max) && data.max > 0 ? data.max : 50;
  const players = Number.isInteger(data.players) && data.players >= 0 ? Math.min(data.players, max) : 0;
  statusElement.classList.remove('is-checking', 'is-offline');
  onlineTrack.setAttribute('aria-valuemax', String(max));

  if (data.online) {
    $('span', statusElement).textContent = 'Онлайн';
    onlineCount.innerHTML = `${players} <small>/ ${max}</small>`;
    onlineFill.style.width = `${(players / max) * 100}%`;
    onlineTrack.setAttribute('aria-valuenow', String(players));
    monitorNote.textContent = `Обновлено в ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    statusElement.classList.add('is-offline');
    $('span', statusElement).textContent = 'Недоступен';
    onlineCount.innerHTML = `0 <small>/ ${max}</small>`;
    onlineFill.style.width = '0%';
    onlineTrack.setAttribute('aria-valuenow', '0');
    monitorNote.textContent = 'Сервер не отвечает · проверь новости';
  }
}

function renderStatusError() {
  statusElement.classList.remove('is-checking');
  statusElement.classList.add('is-offline');
  $('span', statusElement).textContent = 'Нет данных';
  onlineCount.innerHTML = '— <small>/ 50</small>';
  onlineFill.style.width = '0%';
  monitorNote.textContent = 'Статус уточняется · новости в Discord';
}

async function loadServerStatus() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const response = await fetch('/api/server-status', { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('status_unavailable');
    renderStatus(await response.json());
  } catch {
    renderStatusError();
  } finally {
    clearTimeout(timeout);
  }
}

loadServerStatus();
setInterval(loadServerStatus, 30000);
$('#current-year').textContent = new Date().getFullYear();
