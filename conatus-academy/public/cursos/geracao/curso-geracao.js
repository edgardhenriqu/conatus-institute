// Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Prevent body scroll when sidebar is open on mobile
    document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
}

// Module Toggle
function toggleModule(header) {
    const module = header.parentElement;
    const wasExpanded = module.classList.contains('expanded');
    
    // Close all modules
    document.querySelectorAll('.module').forEach(m => {
        m.classList.remove('expanded');
    });
    
    // Toggle clicked module
    if (!wasExpanded) {
        module.classList.add('expanded');
    }
}

// Lesson Selection
function selectLesson(lessonElement, lessonNumber) {
    // Remove active class from all lessons
    document.querySelectorAll('.lesson').forEach(lesson => {
        lesson.classList.remove('active');
    });
    
    // Add active class to clicked lesson
    lessonElement.classList.add('active');
    
    // Update breadcrumb
    const moduleNumber = lessonElement.closest('.module').querySelector('.module-number').textContent;
    document.querySelector('.breadcrumb').textContent = `Módulo ${moduleNumber} / Aula ${String(lessonNumber).padStart(2, '0')}`;
    
    // Scroll to content area
    const lessonContent = document.getElementById('lessonContent');
    const contentTop = lessonContent.offsetTop - 80; // Account for sticky top bar
    window.scrollTo({ top: contentTop, behavior: 'smooth' });
    
    // Animate content to show update
    const contentElement = document.querySelector('.lesson-content');
    contentElement.style.opacity = '0.5';
    contentElement.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        contentElement.style.transition = 'all 0.3s ease';
        contentElement.style.opacity = '1';
        contentElement.style.transform = 'translateY(0)';
    }, 100);
    
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            toggleSidebar();
        }, 300);
    }
    
    // Update progress
    updateProgress();
}

// Update Progress
function updateProgress() {
    const totalLessons = 15;
    const completedLessons = document.querySelectorAll('.lesson.completed').length;
    const progress = Math.round((completedLessons / totalLessons) * 100);
    
    document.querySelector('.progress-value').textContent = `${progress}%`;
    document.querySelector('.progress-fill').style.width = `${progress}%`;
}

// Navigation Functions
function nextLesson() {
    const currentLesson = document.querySelector('.lesson.active');
    const allLessons = Array.from(document.querySelectorAll('.lesson'));
    const currentIndex = allLessons.indexOf(currentLesson);
    
    if (currentIndex < allLessons.length - 1) {
        const nextLesson = allLessons[currentIndex + 1];
        
        // Mark current as completed
        if (!currentLesson.classList.contains('completed')) {
            currentLesson.classList.remove('active');
            currentLesson.classList.add('completed');
            currentLesson.querySelector('.lesson-number')?.replaceWith(createCheckIcon());
        }
        
        // Activate next lesson
        selectLesson(nextLesson, currentIndex + 2);
        
        // Expand parent module if needed
        const parentModule = nextLesson.closest('.module');
        if (!parentModule.classList.contains('expanded')) {
            toggleModule(parentModule.querySelector('.module-header'));
        }
        
        // Scroll to top of content
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function prevLesson() {
    const currentLesson = document.querySelector('.lesson.active');
    const allLessons = Array.from(document.querySelectorAll('.lesson'));
    const currentIndex = allLessons.indexOf(currentLesson);
    
    if (currentIndex > 0) {
        const prevLesson = allLessons[currentIndex - 1];
        selectLesson(prevLesson, currentIndex);
        
        // Expand parent module if needed
        const parentModule = prevLesson.closest('.module');
        if (!parentModule.classList.contains('expanded')) {
            toggleModule(parentModule.querySelector('.module-header'));
        }
        
        // Scroll to top of content
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Create Check Icon
function createCheckIcon() {
    const checkDiv = document.createElement('div');
    checkDiv.className = 'lesson-check';
    checkDiv.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
        </svg>
    `;
    return checkDiv;
}

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
        nextLesson();
    } else if (e.key === 'ArrowLeft') {
        prevLesson();
    } else if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    }
});

// Handle Window Resize
window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set initial state
    updateProgress();
    
    // Add smooth scroll behavior for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add hover effect for topic cards
    document.querySelectorAll('.topic-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});

// Save progress to localStorage (simulated)
function saveProgress() {
    const completedLessons = [];
    document.querySelectorAll('.lesson.completed').forEach(lesson => {
        const title = lesson.querySelector('.lesson-title').textContent;
        completedLessons.push(title);
    });
    
    localStorage.setItem('curso-geracao-progress', JSON.stringify({
        completed: completedLessons,
        lastAccess: new Date().toISOString()
    }));
}

// Load progress from localStorage (simulated)
function loadProgress() {
    const saved = localStorage.getItem('curso-geracao-progress');
    if (saved) {
        const data = JSON.parse(saved);
        console.log('Progresso carregado:', data);
        // In a real app, this would restore the lesson states
    }
}

// Auto-save progress every 30 seconds
setInterval(saveProgress, 30000);

// Save on page unload
window.addEventListener('beforeunload', saveProgress);

// ==================== QUIZ FUNCTIONALITY ====================

// Quiz Data - 10 Questions
const quizQuestions = [
    {
        id: 1,
        question: "Qual é a função principal de um grupo gerador em um data center?",
        options: [
            "Armazenar energia para uso futuro",
            "Fornecer energia elétrica de forma contínua durante falhas da rede pública",
            "Regular a temperatura dos servidores",
            "Controlar o fluxo de dados da rede"
        ],
        correct: 1
    },
    {
        id: 2,
        question: "O que significa a sigla ATS no contexto de sistemas de geração?",
        options: [
            "Automatic Transfer Switch (Chave de Transferência Automática)",
            "Automatic Temperature System",
            "Auxiliary Power Supply",
            "Advanced Technology Server"
        ],
        correct: 0
    },
    {
        id: 3,
        question: "Qual é o tempo de resposta ideal de um sistema de geração para data centers?",
        options:
        [
            "Entre 5 e 10 minutos",
            "Entre 1 e 2 minutos",
            "Entre 10 e 30 segundos",
            "Instantâneo (menos de 1 segundo)"
        ],
        correct: 2
    },
    {
        id: 4,
        question: "Qual margem de segurança é recomendada ao dimensionar um sistema de geração?",
        options: [
            "5% acima da carga máxima",
            "10% acima da carga máxima",
            "20% acima da carga máxima",
            "50% acima da carga máxima"
        ],
        correct: 2
    },
    {
        id: 5,
        question: "Qual componente é responsável por converter energia mecânica em energia elétrica?",
        options: [
            "O motor a combustão",
            "O alternador",
            "O tanque de combustível",
            "O silenciador"
        ],
        correct: 1
    },
    {
        id: 6,
        question: "Qual é o principal combustível utilizado em grupos geradores para data centers no Brasil?",
        options: [
            "Gasolina",
            "Gás natural",
            "Óleo diesel",
            "Energia solar"
        ],
        correct: 2
    },
    {
        id: 7,
        question: "O que ocorre se um data center perder a energia elétrica sem sistema de geração?",
        options: [
            "Apenas as luzes se apagam",
            "Os servidores continuam funcionando por 24 horas",
            "Pode haver perda de dados e indisponibilidade de serviços",
            "O sistema de ar condicionado continua funcionando"
        ],
        correct: 2
    },
    {
        id: 8,
        question: "Qual norma técnica brasileira é referência para sistemas de energia de emergência?",
        options: [
            "ABNT NBR 7190",
            "ABNT NBR 15845",
            "ABNT NBR 5410",
            "ABNT NBR 14639"
        ],
        correct: 1
    },
    {
        id: 9,
        question: "Qual a finalidade do sistema de resfriamento em um grupo gerador?",
        options: [
            "Aumentar a potência do motor",
            "Resfriar os servidores do data center",
            "Dissipar o calor gerado pela combustão e manter temperatura ideal",
            "Controlar a umidade do ambiente"
        ],
        correct: 2
    },
    {
        id: 10,
        question: "Em caso de falha da rede pública, qual設備 entra em operação automaticamente?",
        options: [
            "O sistema de climatização",
            "O sistema de geração (grupo gerador)",
            "O sistema de vigilância",
            "O sistema de iluminação de emergência"
        ],
        correct: 1
    }
];

// Quiz State
let attempts = 0;
const maxAttempts = 3;
let quizCompleted = false;
let lastScore = 0;

// Load saved attempts from localStorage
function loadQuizState() {
    const saved = localStorage.getItem('curso-geracao-quiz');
    if (saved) {
        const data = JSON.parse(saved);
        attempts = data.attempts || 0;
        lastScore = data.lastScore || 0;
        quizCompleted = data.quizCompleted || false;
    }
}

// Update sidebar status
function updateSidebarStatus() {
    const statusEl = document.getElementById('sidebarQuizStatus');
    const statusText = document.getElementById('sidebarQuizStatusText');
    const btnStart = document.getElementById('btnSidebarStartQuiz');
    
    if (quizCompleted && lastScore >= 70) {
        statusEl.style.display = 'block';
        statusText.textContent = `Aprovado! Nota: ${lastScore}%`;
        statusText.style.color = '#10b981';
        btnStart.textContent = 'Ver Avaliação';
    } else if (attempts > 0) {
        statusEl.style.display = 'block';
        statusText.textContent = `Tentativa ${attempts}/${maxAttempts} | Última nota: ${lastScore}%`;
        statusText.style.color = lastScore >= 70 ? '#10b981' : 'var(--gray-600)';
    }
}

// ==================== MAIN QUIZ FUNCTIONALITY ====================

let mainCurrentQuestionIndex = 0;
let mainUserAnswers = new Array(quizQuestions.length).fill(null);

// Open Quiz from Sidebar
function openMainQuiz() {
    document.getElementById('lessonContent').style.display = 'none';
    document.getElementById('quizMainContent').style.display = 'block';
    
    if (quizCompleted && lastScore >= 70) {
        showMainResultsFinal();
    } else {
        document.getElementById('quizMainStart').style.display = 'block';
        document.getElementById('quizMainActive').style.display = 'none';
        document.getElementById('quizMainResults').style.display = 'none';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Back to Lesson
function backToLesson() {
    document.getElementById('quizMainContent').style.display = 'none';
    document.getElementById('lessonContent').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Start Main Quiz
function startMainQuiz() {
    if (attempts >= maxAttempts) {
        alert('Você já utilizou todas as 3 tentativas disponíveis.');
        return;
    }
    
    mainCurrentQuestionIndex = 0;
    mainUserAnswers = new Array(quizQuestions.length).fill(null);
    
    document.getElementById('quizMainStart').style.display = 'none';
    document.getElementById('quizMainActive').style.display = 'block';
    document.getElementById('quizMainResults').style.display = 'none';
    
    loadMainQuestion();
}

// Load Main Question
function loadMainQuestion() {
    const question = quizQuestions[mainCurrentQuestionIndex];
    const totalQuestions = quizQuestions.length;
    
    document.getElementById('quizMainCounter').textContent = `Pergunta ${mainCurrentQuestionIndex + 1} de ${totalQuestions}`;
    
    const progress = ((mainCurrentQuestionIndex + 1) / totalQuestions) * 100;
    document.getElementById('quizMainBarFill').style.width = `${progress}%`;
    
    document.getElementById('quizMainQuestion').textContent = question.question;
    
    const optionsContainer = document.getElementById('quizMainOptions');
    const letters = ['A', 'B', 'C', 'D'];
    
    optionsContainer.innerHTML = question.options.map((option, index) => `
        <button class="quiz-main-option ${mainUserAnswers[mainCurrentQuestionIndex] === index ? 'selected' : ''}" 
                onclick="selectMainOption(${index})">
            <span class="quiz-main-option-letter">${letters[index]}</span>
            <span>${option}</span>
        </button>
    `).join('');
    
    document.getElementById('btnQuizMainPrev').disabled = mainCurrentQuestionIndex === 0;
    
    if (mainCurrentQuestionIndex === totalQuestions - 1) {
        document.getElementById('btnQuizMainNext').style.display = 'none';
        document.getElementById('btnQuizMainSubmit').style.display = 'inline-flex';
    } else {
        document.getElementById('btnQuizMainNext').style.display = 'inline-flex';
        document.getElementById('btnQuizMainSubmit').style.display = 'none';
    }
}

// Select Main Option
function selectMainOption(optionIndex) {
    mainUserAnswers[mainCurrentQuestionIndex] = optionIndex;
    
    const options = document.querySelectorAll('.quiz-main-option');
    options.forEach((btn, index) => {
        btn.classList.remove('selected');
        if (index === optionIndex) {
            btn.classList.add('selected');
        }
    });
}

// Main Next Question
function mainNextQuestion() {
    if (mainCurrentQuestionIndex < quizQuestions.length - 1) {
        mainCurrentQuestionIndex++;
        loadMainQuestion();
    }
}

// Main Previous Question
function mainPrevQuestion() {
    if (mainCurrentQuestionIndex > 0) {
        mainCurrentQuestionIndex--;
        loadMainQuestion();
    }
}

// Main Submit Quiz
function mainSubmitQuiz() {
    const unanswered = mainUserAnswers.filter(a => a === null).length;
    if (unanswered > 0) {
        if (!confirm(`Você tem ${unanswered} pergunta(s) sem responder. Deseja finalizar mesmo assim?`)) {
            return;
        }
    }
    
    attempts++;
    
    let correctCount = 0;
    quizQuestions.forEach((question, index) => {
        if (mainUserAnswers[index] === question.correct) {
            correctCount++;
        }
    });
    
    const score = Math.round((correctCount / quizQuestions.length) * 100);
    lastScore = score;
    
    const passed = score >= 70;
    
    if (passed) {
        quizCompleted = true;
    }
    
    localStorage.setItem('curso-geracao-quiz', JSON.stringify({
        attempts: attempts,
        lastScore: lastScore,
        quizCompleted: quizCompleted,
        answers: mainUserAnswers
    }));
    
    showMainResults(score, correctCount, passed);
}

// Show Main Results
function showMainResults(score, correctCount, passed) {
    document.getElementById('quizMainActive').style.display = 'none';
    document.getElementById('quizMainResults').style.display = 'block';
    
    const scoreEl = document.getElementById('quizMainResultsScore');
    scoreEl.className = `quiz-main-results-score ${passed ? 'passed' : 'failed'}`;
    document.getElementById('quizMainScoreValue').textContent = `${score}%`;
    
    document.getElementById('quizMainResultsText').textContent = passed ? 
        'Parabéns! Você foi aprovado!' : 'Não foi desta vez...';
    
    document.getElementById('quizMainCorrectCount').textContent = `${correctCount} corretas`;
    document.getElementById('quizMainIncorrectCount').textContent = `${quizQuestions.length - correctCount} incorretas`;
    document.getElementById('quizMainCurrentAttempt').textContent = attempts;
    
    const retryBtn = document.getElementById('btnQuizMainRetry');
    if (attempts >= maxAttempts || passed) {
        retryBtn.style.display = 'none';
    } else {
        retryBtn.style.display = 'inline-flex';
    }
    
    updateSidebarStatus();
}

// Show Main Results Final (when quiz already completed)
function showMainResultsFinal() {
    document.getElementById('quizMainStart').style.display = 'none';
    document.getElementById('quizMainActive').style.display = 'none';
    document.getElementById('quizMainResults').style.display = 'block';
    
    const scoreEl = document.getElementById('quizMainResultsScore');
    scoreEl.className = 'quiz-main-results-score passed';
    document.getElementById('quizMainScoreValue').textContent = `${lastScore}%`;
    
    document.getElementById('quizMainResultsText').textContent = 'Avaliação Concluída com Sucesso!';
    
    document.getElementById('quizMainCorrectCount').textContent = '';
    document.getElementById('quizMainIncorrectCount').textContent = '';
    document.getElementById('quizMainCurrentAttempt').textContent = attempts;
    document.getElementById('btnQuizMainRetry').style.display = 'none';
}

// Main Retry Quiz
function mainRetryQuiz() {
    if (attempts >= maxAttempts) {
        alert('Você já utilizou todas as 3 tentativas disponíveis.');
        return;
    }
    
    document.getElementById('quizMainResults').style.display = 'none';
    document.getElementById('quizMainStart').style.display = 'block';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadQuizState();
    updateSidebarStatus();
});

