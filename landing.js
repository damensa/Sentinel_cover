document.addEventListener('DOMContentLoaded', () => {
    // Language Logic
    const html = document.documentElement;
    const langBtns = document.querySelectorAll('.lang-btn');

    const setLanguage = (lang) => {
        html.setAttribute('lang', lang);
        langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
        localStorage.setItem('instadoc_lang', lang);
    };

    // Auto-detect or Load
    const savedLang = localStorage.getItem('instadoc_lang');
    const browserLang = navigator.language.startsWith('es') ? 'es' : 'ca';
    setLanguage(savedLang || browserLang);

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.getAttribute('data-lang'));
        });
    });

    // Fade-in animations on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('appear');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.feature-card, .problem-content, .problem-img, .gremi, .cta-final h2');
    fadeElements.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
