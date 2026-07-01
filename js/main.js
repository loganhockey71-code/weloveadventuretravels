// Scroll reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.querySelector('.nav-links');
const siteNav   = document.querySelector('.site-nav');

navToggle?.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinks?.classList.toggle('open');
});

document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', () => {
  navToggle?.classList.remove('open');
  navLinks?.classList.remove('open');
}));

// Active nav link
const page = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === page || (page === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

// Nav scroll shadow
window.addEventListener('scroll', () => {
  siteNav?.classList.toggle('scrolled', scrollY > 10);
}, { passive: true });

// FAQ accordion
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.faq-q').forEach(b => b.setAttribute('aria-expanded', 'false'));
    btn.setAttribute('aria-expanded', String(!open));
  });
});
