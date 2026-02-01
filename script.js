// Screen Navigation
function navigateTo(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Dark Mode Toggle
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', currentTheme);
updateThemeIcon(currentTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('.theme-icon');
    icon.textContent = theme === 'light' ? '🌙' : '☀️';
}

// Simulate Connect Actions
function simulateConnect(platform) {
    const platformNames = {
        github: 'GitHub',
        gitlab: 'GitLab',
        behance: 'Behance',
        url: 'Custom URL'
    };

    // Add loading state
    event.target.closest('.connect-option').style.opacity = '0.6';
    event.target.closest('.connect-option').style.pointerEvents = 'none';

    setTimeout(() => {
        event.target.closest('.connect-option').style.opacity = '1';
        event.target.closest('.connect-option').style.pointerEvents = 'auto';

        // Add checkmark
        const arrow = event.target.closest('.connect-option').querySelector('.connect-arrow');
        arrow.textContent = '✓';
        arrow.style.color = 'var(--github-green)';
    }, 1000);
}

// AI Rewrite Simulation
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('ai-rewrite')) {
        const button = e.target;
        const originalIcon = button.textContent;

        button.textContent = '⏳';
        button.style.pointerEvents = 'none';

        setTimeout(() => {
            button.textContent = '✓';
            button.style.background = 'var(--github-green)';
            button.style.color = 'white';

            setTimeout(() => {
                button.textContent = originalIcon;
                button.style.background = '';
                button.style.color = '';
                button.style.pointerEvents = 'auto';
            }, 1500);
        }, 2000);
    }
});

// Drag and Drop for Curation (Simple visual feedback)
let draggedItem = null;

document.addEventListener('DOMContentLoaded', () => {
    const curationItems = document.querySelectorAll('.curation-item');

    curationItems.forEach(item => {
        const dragHandle = item.querySelector('.drag-handle');

        if (dragHandle) {
            dragHandle.addEventListener('mousedown', () => {
                item.style.cursor = 'grabbing';
                draggedItem = item;
            });

            dragHandle.addEventListener('mouseup', () => {
                item.style.cursor = 'grab';
                draggedItem = null;
            });
        }

        // Checkbox toggle
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        }
    });
});

// Animate score bars on scroll
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const scoreFills = entry.target.querySelectorAll('.score-fill');
            scoreFills.forEach(fill => {
                const width = fill.style.width;
                fill.style.width = '0%';
                setTimeout(() => {
                    fill.style.width = width;
                }, 100);
            });
        }
    });
}, observerOptions);

// Observe project cards
document.addEventListener('DOMContentLoaded', () => {
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => observer.observe(card));
});

// Download PDF Simulation
document.addEventListener('click', (e) => {
    if (e.target.textContent.includes('Download PDF')) {
        const button = e.target;
        const originalText = button.innerHTML;

        button.innerHTML = '<span>⏳</span> Generating...';
        button.style.pointerEvents = 'none';

        setTimeout(() => {
            button.innerHTML = '<span>✓</span> Downloaded!';
            button.style.background = 'var(--github-green)';

            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.background = '';
                button.style.pointerEvents = 'auto';
            }, 2000);
        }, 2000);
    }
});

// Copy Link Simulation
document.addEventListener('click', (e) => {
    if (e.target.textContent.includes('Copy Shareable Link')) {
        const button = e.target;
        const originalText = button.innerHTML;

        button.innerHTML = '<span>✓</span> Copied to Clipboard!';
        button.style.background = 'var(--github-green)';
        button.style.color = 'white';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
            button.style.color = '';
        }, 2000);
    }
});

// Post to X Simulation
document.addEventListener('click', (e) => {
    if (e.target.textContent.includes('Post to X')) {
        const tweetText = encodeURIComponent('Just built my resume with GitHire! 🚀 From scattered repos to ATS-winning PDF in 60 seconds. Check it out!');
        const url = encodeURIComponent('https://githire.app');
        window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${url}`, '_blank');
    }
});

// Smooth hover effects for project cards
document.addEventListener('DOMContentLoaded', () => {
    const projectCards = document.querySelectorAll('.project-card');

    projectCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    });
});

// Initialize app
console.log('🚀 GitHire initialized');
console.log('💡 Use navigateTo("screenId") to switch between screens');
console.log('🎨 Toggle dark mode with the moon/sun button');
