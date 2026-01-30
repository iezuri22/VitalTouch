/* ============================================
   VITALTOUCH HOME CARE - MAIN JAVASCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    
    // Mobile Navigation
    const mobileToggle = document.getElementById('mobileToggle');
    const mobileNav = document.getElementById('mobileNav');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    if (mobileToggle && mobileNav) {
        mobileToggle.addEventListener('click', function() {
            mobileNav.classList.toggle('active');
            if (mobileOverlay) mobileOverlay.classList.toggle('active');
            document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
        });
        
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', function() {
                mobileNav.classList.remove('active');
                mobileOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
        
        // Close mobile nav when clicking a link
        mobileNav.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                mobileNav.classList.remove('active');
                if (mobileOverlay) mobileOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
    
    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(function(item) {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', function() {
                // Close other items
                faqItems.forEach(function(otherItem) {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                    }
                });
                // Toggle current item
                item.classList.toggle('active');
            });
        }
    });
    
    // Smooth Scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Contact Form Handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const name = formData.get('firstName') + ' ' + formData.get('lastName');
            
            // Show success message
            alert('Thank you, ' + name.trim() + '! We\'ve received your message and will contact you within 24 hours.');
            
            // Reset form
            contactForm.reset();
        });
    }
    
    // Header scroll effect
    const header = document.querySelector('.header');
    if (header) {
        let lastScroll = 0;
        
        window.addEventListener('scroll', function() {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 100) {
                header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            } else {
                header.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            }
            
            lastScroll = currentScroll;
        });
    }
    
    // Scroll reveal animation
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Add reveal animation to elements
    document.querySelectorAll('.card, .feature-card, .faq-item, .service-card').forEach(function(el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
    
    // Add revealed class styles
    const style = document.createElement('style');
    style.textContent = '.revealed { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(style);
    
    // Active navigation link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-menu a, .mobile-nav a').forEach(function(link) {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
    
});

// Utility function for form validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\d\s\-\(\)]+$/;
    return phone === '' || re.test(phone);
}
