/**
 * InvoiceIQ Marketing Website JavaScript
 * Handles smooth scrolling, scrollspy, mobile menu, and contact form
 */

// Configuration
const CONFIG = {
    // Set your Formspree endpoint here, or leave empty for mailto fallback
    FORMSPREE_ENDPOINT: '', // e.g., 'https://formspree.io/f/YOUR_FORM_ID'
    
    // Animation settings
    SCROLL_OFFSET: 80,
    SCROLL_DURATION: 800,
    
    // Toast settings
    TOAST_DURATION: 5000,
};

// DOM Elements
const elements = {
    navToggle: document.getElementById('nav-toggle'),
    navMenu: document.getElementById('nav-menu'),
    navLinks: document.querySelectorAll('.nav-link'),
    tocLinks: document.querySelectorAll('.toc-link'),
    contactForm: document.getElementById('contact-form'),
    toastContainer: document.getElementById('toast-container'),
    currentYear: document.getElementById('current-year'),
};

// State
let isMenuOpen = false;
let scrollTimeout = null;

/**
 * Initialize the application
 */
function init() {
    setupEventListeners();
    setupScrollSpy();
    setupCurrentYear();
    setupFormValidation();
    setupAccessibility();
    
    // Handle initial scroll position
    handleScroll();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Mobile menu toggle
    if (elements.navToggle) {
        elements.navToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Smooth scrolling for navigation links
    elements.tocLinks.forEach(link => {
        link.addEventListener('click', handleSmoothScroll);
    });
    
    // Contact form submission
    if (elements.contactForm) {
        elements.contactForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Scroll events
    window.addEventListener('scroll', throttle(handleScroll, 16));
    
    // Resize events
    window.addEventListener('resize', handleResize);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeydown);
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', handleOutsideClick);
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
    isMenuOpen = !isMenuOpen;
    
    if (elements.navToggle) {
        elements.navToggle.setAttribute('aria-expanded', isMenuOpen);
    }
    
    if (elements.navMenu) {
        elements.navMenu.classList.toggle('active', isMenuOpen);
    }
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
}

/**
 * Handle smooth scrolling for navigation links
 */
function handleSmoothScroll(e) {
    e.preventDefault();
    
    const targetId = this.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    
    if (targetElement) {
        const targetPosition = targetElement.offsetTop - CONFIG.SCROLL_OFFSET;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
        
        // Close mobile menu if open
        if (isMenuOpen) {
            toggleMobileMenu();
        }
    }
}

/**
 * Handle scroll events for scrollspy
 */
function handleScroll() {
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }
    
    scrollTimeout = setTimeout(() => {
        updateActiveNavLink();
    }, 10);
}

/**
 * Update active navigation link based on scroll position
 */
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY + CONFIG.SCROLL_OFFSET + 100;
    
    let activeSection = null;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            activeSection = section.id;
        }
    });
    
    // Update navigation links
    elements.tocLinks.forEach(link => {
        const sectionId = link.getAttribute('data-section');
        const isActive = sectionId === activeSection;
        
        link.classList.toggle('active', isActive);
    });
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(elements.contactForm);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message')
    };
    
    // Validate form data
    if (!validateFormData(data)) {
        return;
    }
    
    try {
        if (CONFIG.FORMSPREE_ENDPOINT) {
            await submitToFormspree(data);
        } else {
            submitViaMailto(data);
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showToast('Error submitting form. Please try again.', 'error');
    }
}

/**
 * Validate form data
 */
function validateFormData(data) {
    const errors = [];
    
    if (!data.name.trim()) {
        errors.push('Name is required');
    }
    
    if (!data.email.trim()) {
        errors.push('Email is required');
    } else if (!isValidEmail(data.email)) {
        errors.push('Please enter a valid email address');
    }
    
    if (!data.message.trim()) {
        errors.push('Message is required');
    }
    
    if (errors.length > 0) {
        showToast(errors.join(', '), 'error');
        return false;
    }
    
    return true;
}

/**
 * Submit form to Formspree
 */
async function submitToFormspree(data) {
    const response = await fetch(CONFIG.FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    if (response.ok) {
        showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
        elements.contactForm.reset();
    } else {
        throw new Error('Form submission failed');
    }
}

/**
 * Submit form via mailto
 */
function submitViaMailto(data) {
    const subject = encodeURIComponent('InvoiceIQ Contact Form');
    const body = encodeURIComponent(
        `Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`
    );
    
    const mailtoUrl = `mailto:contact@invoiceiq.com?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
    
    showToast('Opening your email client...', 'success');
    elements.contactForm.reset();
}

/**
 * Validate email address
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    elements.toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove toast after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, CONFIG.TOAST_DURATION);
}

/**
 * Handle window resize
 */
function handleResize() {
    // Close mobile menu on resize to desktop
    if (window.innerWidth > 768 && isMenuOpen) {
        toggleMobileMenu();
    }
}

/**
 * Handle keyboard navigation
 */
function handleKeydown(e) {
    // Close mobile menu on Escape
    if (e.key === 'Escape' && isMenuOpen) {
        toggleMobileMenu();
    }
    
    // Handle tab navigation in mobile menu
    if (isMenuOpen && e.key === 'Tab') {
        const focusableElements = elements.navMenu.querySelectorAll(
            'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
}

/**
 * Handle clicks outside mobile menu
 */
function handleOutsideClick(e) {
    if (isMenuOpen && 
        !elements.navMenu.contains(e.target) && 
        !elements.navToggle.contains(e.target)) {
        toggleMobileMenu();
    }
}

/**
 * Set up scroll spy with Intersection Observer
 */
function setupScrollSpy() {
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    updateActiveNavLink(sectionId);
                }
            });
        }, {
            rootMargin: `-${CONFIG.SCROLL_OFFSET}px 0px -50% 0px`
        });
        
        // Observe all sections
        document.querySelectorAll('section[id]').forEach(section => {
            observer.observe(section);
        });
    }
}

/**
 * Set up current year in footer
 */
function setupCurrentYear() {
    if (elements.currentYear) {
        elements.currentYear.textContent = new Date().getFullYear();
    }
}

/**
 * Set up form validation
 */
function setupFormValidation() {
    const inputs = elements.contactForm?.querySelectorAll('input, textarea');
    
    inputs?.forEach(input => {
        input.addEventListener('blur', () => {
            validateField(input);
        });
        
        input.addEventListener('input', () => {
            clearFieldError(input);
        });
    });
}

/**
 * Validate individual form field
 */
function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = `${field.previousElementSibling.textContent} is required`;
    } else if (field.type === 'email' && value && !isValidEmail(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    } else {
        clearFieldError(field);
    }
    
    return isValid;
}

/**
 * Show field error
 */
function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.color = '#ef4444';
    errorElement.style.fontSize = '0.875rem';
    errorElement.style.marginTop = '0.25rem';
    
    field.parentNode.appendChild(errorElement);
    field.style.borderColor = '#ef4444';
}

/**
 * Clear field error
 */
function clearFieldError(field) {
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
    field.style.borderColor = '';
}

/**
 * Set up accessibility features
 */
function setupAccessibility() {
    // Add skip link functionality
    const skipLink = document.querySelector('.skip-link');
    if (skipLink) {
        skipLink.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(skipLink.getAttribute('href'));
            if (target) {
                target.focus();
                target.scrollIntoView();
            }
        });
    }
    
    // Add focus management for mobile menu
    if (elements.navToggle) {
        elements.navToggle.addEventListener('click', () => {
            if (isMenuOpen) {
                // Focus first menu item when opening
                const firstLink = elements.navMenu?.querySelector('a');
                if (firstLink) {
                    setTimeout(() => firstLink.focus(), 100);
                }
            }
        });
    }
}

/**
 * Utility function to throttle function calls
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Utility function to debounce function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility function to check if element is in viewport
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Utility function to animate elements on scroll
 */
function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll('.problem-item, .solution-card, .timeline-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(element);
    });
}

// Initialize the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Initialize scroll animations
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupScrollAnimations);
} else {
    setupScrollAnimations();
}
