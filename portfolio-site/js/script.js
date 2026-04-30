import projects from './projects.js';

document.addEventListener('DOMContentLoaded', () => {
    renderProjects();
    setupIntersectionObserver();
});

function renderProjects() {
    const grid = document.getElementById('projectGrid');
    
    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        card.innerHTML = `
            <span class="project-icon">${project.icon}</span>
            <span class="project-tagline" style="color: ${project.color}">${project.tagline}</span>
            <h3>${project.name}</h3>
            <p>${project.description}</p>
            <div class="feature-list">
                ${project.features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
            </div>
            <a href="${project.githubLink}" target="_blank" class="view-btn" style="background: ${project.color}22; border-color: ${project.color}">View Code</a>
        `;
        
        grid.appendChild(card);
    });
}

function setupIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.transition = 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.project-card').forEach(card => {
        observer.observe(card);
    });
}
