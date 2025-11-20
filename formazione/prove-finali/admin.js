// Pannello di amministrazione per la gestione delle domande quiz
class QuizAdmin {
    constructor() {
        this.currentEditIndex = -1;
        this.hasUnsyncedChanges = false;
        this.originalQuizDataLength = 0;
        this.init();
    }

    async init() {
        // Verifica che l'autenticazione sia stata validata dal guard
        if (!window.adminAuthVerified) {
            console.error('Accesso non autorizzato - Guard di autenticazione non superato');
            window.location.replace('login.html');
            return;
        }

        // Aspetta che Firebase sia pronto
        while (!window.firebaseQuizService) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Rendi visibile la pagina dopo l'inizializzazione
        document.body.classList.remove('admin-protected');
        document.body.classList.add('admin-authenticated');

        // Inizializza categorie
        this.loadCategories();

        // Carica domande esistenti
        await this.loadQuestions();

        // Inizializza form
        this.initForm();

        // Event listeners
        this.bindEvents();

        // Aggiorna statistiche
        this.updateStats();
    }

    loadCategories() {
        const categorySelect = document.getElementById('questionCategory');
        const categoryFilter = document.getElementById('categoryFilter');

        // Carica categorie dal config
        CONFIG.quiz.categories.forEach(category => {
            const option1 = document.createElement('option');
            option1.value = category.id;
            option1.textContent = category.name;
            categorySelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = category.id;
            option2.textContent = category.name;
            categoryFilter.appendChild(option2);
        });
    }

    async loadQuestions() {
        try {
            this.showMessage('Caricamento domande da Firebase...', 'info');
            
            // Prova a caricare da Firebase
            const firebaseQuestions = await window.firebaseQuizService.loadQuestions();
            
            if (firebaseQuestions && firebaseQuestions.length > 0) {
                // Rimuovi i campi Firebase specifici (id, createdAt, etc.)
                window.quizData = firebaseQuestions.map(q => ({
                    categoria: q.categoria,
                    question: q.question,
                    options: q.options,
                    correct: q.correct,
                    type: q.type
                }));
                this.hasUnsyncedChanges = false; // Dati sincronizzati
                this.showMessage(`Caricate ${window.quizData.length} domande da Firebase`, 'success');
            } else {
                // Usa dati di default se Firebase è vuoto
                window.quizData = [...quizData];
                this.hasUnsyncedChanges = true; // Dati locali non sincronizzati
                this.showMessage('Usando domande di default. Salva per sincronizzare con Firebase.', 'warning');
            }
        } catch (error) {
            console.error('Errore Firebase, uso backup locale:', error);
            // Fallback a localStorage
            const localBackup = window.firebaseQuizService.loadFromLocalStorage();
            if (localBackup) {
                window.quizData = localBackup;
                this.hasUnsyncedChanges = true;
                this.showMessage('Firebase non disponibile. Usando backup locale.', 'warning');
            } else {
                window.quizData = [...quizData];
                this.hasUnsyncedChanges = true;
                this.showMessage('Errore Firebase. Usando domande di default.', 'error');
            }
        }

        this.originalQuizDataLength = window.quizData.length;
        this.displayQuestions();
    }

    async saveQuestions() {
        try {
            this.showMessage('Salvataggio su Firebase in corso...', 'info');
            
            // Salva su Firebase
            await window.firebaseQuizService.saveQuestions(window.quizData);
            
            // Backup locale per sicurezza
            await window.firebaseQuizService.saveToLocalStorage(window.quizData);
            
            this.hasUnsyncedChanges = false; // Ora è sincronizzato
            this.showMessage('Domande salvate su Firebase con successo! 🔥', 'success');
        } catch (error) {
            console.error('Errore nel salvataggio Firebase:', error);
            
            // Fallback a localStorage
            try {
                localStorage.setItem('quizQuestions', JSON.stringify(window.quizData));
                this.hasUnsyncedChanges = true;
                this.showMessage('Errore Firebase. Salvato solo in locale. Riprova più tardi.', 'warning');
            } catch (e) {
                this.showMessage('Errore nel salvataggio: ' + error.message, 'error');
            }
        }
    }

    exportQuizJS() {
        // Genera il contenuto del file quiz.js per download manuale
        const quizContent = `// File generato automaticamente - Quiz Database
// Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}

window.quizData = ${JSON.stringify(window.quizData, null, 4)};`;

        const blob = new Blob([quizContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quiz.js';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Resetta il flag delle modifiche non sincronizzate
        this.hasUnsyncedChanges = false;
        this.showMessage('File quiz.js scaricato! Sostituisci il file sul server per sincronizzare le modifiche.', 'success');
    }

    initForm() {
        this.createOptionInputs(4); // Inizia con 4 opzioni
    }

    createOptionInputs(count) {
        const container = document.getElementById('optionsContainer');
        container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            this.addOptionInput(i);
        }
    }

    addOptionInput(index = null) {
        const container = document.getElementById('optionsContainer');
        const currentCount = container.children.length;
        const optionIndex = index !== null ? index : currentCount;

        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-input';
        optionDiv.innerHTML = `
            <input type="text" class="input option-text" placeholder="Opzione ${optionIndex + 1}" required>
            <label class="checkbox">
                <input type="checkbox" class="option-correct"> Corretta
            </label>
            <button type="button" class="button is-small is-danger remove-option" ${currentCount <= 2 ? 'disabled' : ''}>
                🗑️
            </button>
        `;

        container.appendChild(optionDiv);

        // Event listener per rimozione opzione
        const removeBtn = optionDiv.querySelector('.remove-option');
        removeBtn.addEventListener('click', () => {
            if (container.children.length > 2) {
                optionDiv.remove();
                this.updateOptionLabels();
            }
        });
    }

    updateOptionLabels() {
        const container = document.getElementById('optionsContainer');
        Array.from(container.children).forEach((optionDiv, index) => {
            const input = optionDiv.querySelector('.option-text');
            input.placeholder = `Opzione ${index + 1}`;
        });
    }

    displayQuestions(filter = 'all', searchTerm = '') {
        const container = document.getElementById('questionsList');
        container.innerHTML = '';

        let filteredQuestions = window.quizData;

        // Filtra per categoria
        if (filter !== 'all') {
            filteredQuestions = filteredQuestions.filter(q => q.categoria === filter);
        }

        // Filtra per termine di ricerca
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredQuestions = filteredQuestions.filter(q =>
                q.question.toLowerCase().includes(term) ||
                q.options.some(opt => opt.toLowerCase().includes(term))
            );
        }

        if (filteredQuestions.length === 0) {
            container.innerHTML = '<p class="has-text-grey has-text-centered">Nessuna domanda trovata.</p>';
            return;
        }

        filteredQuestions.forEach((question, globalIndex) => {
            const originalIndex = window.quizData.indexOf(question);
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item fade-in';

            const correctAnswers = question.correct.map(idx => question.options[idx]).join(', ');
            const questionType = question.type === 'multiple' || question.correct.length > 1 ? 'Multipla' : 'Singola';

            questionDiv.innerHTML = `
                <div class="content">
                    <p class="has-text-weight-bold">${question.question}</p>
                    <div class="tags">
                        <span class="tag is-primary">${this.getCategoryName(question.categoria)}</span>
                        <span class="tag ${questionType === 'Multipla' ? 'is-warning' : 'is-info'}">${questionType}</span>
                    </div>
                    <ul>
                        ${question.options.map((opt, idx) => `
                            <li class="${question.correct.includes(idx) ? 'has-text-success has-text-weight-bold' : ''}">
                                ${opt} ${question.correct.includes(idx) ? '✓' : ''}
                            </li>
                        `).join('')}
                    </ul>
                    <p class="is-size-7 has-text-grey">
                        Risposte corrette: <strong>${correctAnswers}</strong>
                    </p>
                </div>
                <div class="question-actions">
                    <button class="button is-small is-info edit-question" data-index="${originalIndex}">
                        ✏️ Modifica
                    </button>
                    <button class="button is-small is-danger delete-question" data-index="${originalIndex}">
                        🗑️ Elimina
                    </button>
                    <button class="button is-small is-light duplicate-question" data-index="${originalIndex}">
                        📄 Duplica
                    </button>
                </div>
            `;

            container.appendChild(questionDiv);
        });

        // Bind eventi per le azioni
        this.bindQuestionActions();
        this.updateStats();
    }

    getCategoryName(categoryId) {
        const category = CONFIG.quiz.categories.find(cat => cat.id === categoryId);
        return category ? category.name : categoryId;
    }

    bindEvents() {
        // Form submission
        document.getElementById('questionForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveQuestion();
        });

        // Aggiungi opzione
        document.getElementById('addOptionBtn').addEventListener('click', () => {
            this.addOptionInput();
        });

        // Annulla modifica
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.cancelEdit();
        });

        // Filtro categoria
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            const searchTerm = document.getElementById('searchInput').value;
            this.displayQuestions(e.target.value, searchTerm);
        });

        // Ricerca
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const filter = document.getElementById('categoryFilter').value;
            this.displayQuestions(filter, e.target.value);
        });

        // Refresh
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadQuestions();
        });

        // Export/Import
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportQuestions();
        });

        document.getElementById('exportQuizJSBtn').addEventListener('click', () => {
            this.exportQuizJS();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            this.importQuestions();
        });

        // Reset
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.confirmAction('Sei sicuro di voler eliminare TUTTE le domande? Questa azione è irreversibile!', async () => {
                window.quizData = [];
                await this.saveQuestions();
                this.displayQuestions();
                this.showMessage('Tutte le domande sono state eliminate', 'warning');
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Modal
        const modal = document.getElementById('confirmModal');
        modal.querySelector('.delete').addEventListener('click', () => {
            modal.classList.remove('is-active');
        });
        document.getElementById('confirmNo').addEventListener('click', () => {
            modal.classList.remove('is-active');
        });
    }

    bindQuestionActions() {
        // Modifica
        document.querySelectorAll('.edit-question').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.editQuestion(index);
            });
        });

        // Elimina
        document.querySelectorAll('.delete-question').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.confirmAction('Sei sicuro di voler eliminare questa domanda?', async () => {
                    await this.deleteQuestion(index);
                });
            });
        });

        // Duplica
        document.querySelectorAll('.duplicate-question').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(e.target.dataset.index);
                await this.duplicateQuestion(index);
            });
        });
    }

    async saveQuestion() {
        const form = document.getElementById('questionForm');
        const formData = new FormData(form);

        const categoria = document.getElementById('questionCategory').value;
        const question = document.getElementById('questionText').value.trim();
        const questionType = formData.get('questionType');

        if (!categoria || !question) {
            this.showMessage('Compila tutti i campi obbligatori', 'error');
            return;
        }

        const options = [];
        const correct = [];

        document.querySelectorAll('.option-input').forEach((optionDiv, index) => {
            const text = optionDiv.querySelector('.option-text').value.trim();
            const isCorrect = optionDiv.querySelector('.option-correct').checked;

            if (text) {
                options.push(text);
                if (isCorrect) {
                    correct.push(index);
                }
            }
        });

        if (options.length < 2) {
            this.showMessage('Inserisci almeno 2 opzioni', 'error');
            return;
        }

        if (correct.length === 0) {
            this.showMessage('Seleziona almeno una risposta corretta', 'error');
            return;
        }

        if (questionType === 'single' && correct.length > 1) {
            this.showMessage('Per domande a risposta singola, seleziona solo una risposta corretta', 'error');
            return;
        }

        const newQuestion = {
            categoria,
            question,
            options,
            correct,
            type: questionType
        };

        const editIndex = document.getElementById('editingIndex').value;

        if (editIndex !== '') {
            // Modifica domanda esistente
            window.quizData[parseInt(editIndex)] = newQuestion;
            this.showMessage('Domanda aggiornata con successo!', 'success');
        } else {
            // Aggiungi nuova domanda
            window.quizData.push(newQuestion);
            this.showMessage('Domanda aggiunta con successo!', 'success');
        }

        await this.saveQuestions();
        this.displayQuestions();
        this.resetForm();
    }

    editQuestion(index) {
        const question = window.quizData[index];

        document.getElementById('editingIndex').value = index;
        document.getElementById('questionCategory').value = question.categoria;
        document.getElementById('questionText').value = question.question;

        // Tipo di domanda
        const typeRadio = document.querySelector(`input[name="questionType"][value="${question.type}"]`);
        if (typeRadio) typeRadio.checked = true;

        // Crea opzioni
        this.createOptionInputs(question.options.length);

        question.options.forEach((option, idx) => {
            const optionDiv = document.querySelectorAll('.option-input')[idx];
            optionDiv.querySelector('.option-text').value = option;
            optionDiv.querySelector('.option-correct').checked = question.correct.includes(idx);
        });

        document.getElementById('formTitle').innerHTML = '✏️ Modifica Domanda';
        document.getElementById('saveBtn').innerHTML = '💾 Aggiorna Domanda';

        // Scroll al form
        document.getElementById('questionForm').scrollIntoView({ behavior: 'smooth' });
    }

    async deleteQuestion(index) {
        window.quizData.splice(index, 1);
        await this.saveQuestions();
        this.displayQuestions();
        this.showMessage('Domanda eliminata', 'success');
    }

    async duplicateQuestion(index) {
        const originalQuestion = window.quizData[index];
        const duplicatedQuestion = {
            ...originalQuestion,
            question: originalQuestion.question + ' (Copia)'
        };

        window.quizData.push(duplicatedQuestion);
        await this.saveQuestions();
        this.displayQuestions();
        this.showMessage('Domanda duplicata con successo!', 'success');
    }

    resetForm() {
        document.getElementById('questionForm').reset();
        document.getElementById('editingIndex').value = '';
        document.getElementById('formTitle').innerHTML = '➕ Aggiungi Nuova Domanda';
        document.getElementById('saveBtn').innerHTML = '💾 Salva Domanda';
        this.createOptionInputs(4);
    }

    cancelEdit() {
        this.resetForm();
        this.showMessage('Modifica annullata', 'warning');
    }

    exportQuestions() {
        const dataStr = JSON.stringify(window.quizData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showMessage('Backup esportato con successo!', 'success');
    }

    importQuestions() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showMessage('Seleziona un file JSON da importare', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (!Array.isArray(importedData)) {
                    throw new Error('Il file deve contenere un array di domande');
                }

                // Valida la struttura delle domande
                const isValid = importedData.every(q =>
                    q.categoria && q.question && q.options && q.correct && q.type
                );

                if (!isValid) {
                    throw new Error('Formato del file non valido');
                }

                this.confirmAction(
                    `Importare ${importedData.length} domande? Questo aggiungerà le domande a quelle esistenti.`,
                    () => {
                        window.quizData = [...window.quizData, ...importedData];
                        this.saveQuestions();
                        this.displayQuestions();
                        this.showMessage(`${importedData.length} domande importate con successo!`, 'success');
                        fileInput.value = '';
                    }
                );

            } catch (error) {
                this.showMessage(`Errore nell'importazione: ${error.message}`, 'error');
            }
        };

        reader.readAsText(file);
    }

    updateStats() {
        const totalCount = window.quizData.length;
        const filter = document.getElementById('categoryFilter').value;
        const searchTerm = document.getElementById('searchInput').value;

        let filteredQuestions = window.quizData;

        if (filter !== 'all') {
            filteredQuestions = filteredQuestions.filter(q => q.categoria === filter);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredQuestions = filteredQuestions.filter(q =>
                q.question.toLowerCase().includes(term) ||
                q.options.some(opt => opt.toLowerCase().includes(term))
            );
        }

        document.getElementById('totalCount').textContent = totalCount;
        document.getElementById('filteredCount').textContent = filteredQuestions.length;

        // Aggiorna indicatore di sincronizzazione
        this.updateSyncStatus();
    }

    updateSyncStatus() {
        // Rimuovi indicatori esistenti
        document.querySelectorAll('.sync-status').forEach(el => el.remove());

        if (this.hasUnsyncedChanges) {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'sync-status notification is-warning is-light mt-2';
            statusDiv.innerHTML = `
                <button class="delete"></button>
                <strong>⚠️ Modifiche non sincronizzate</strong><br>
                <small>Le modifiche sono solo in localStorage. Clicca "💾 Genera quiz.js" per sincronizzare.</small>
            `;
            
            const container = document.querySelector('.stats-section');
            container.appendChild(statusDiv);

            // Aggiungi evento per chiudere la notifica
            statusDiv.querySelector('.delete').addEventListener('click', () => {
                statusDiv.remove();
            });
        }
    }

    showMessage(text, type) {
        // Rimuovi messaggi esistenti
        document.querySelectorAll('.admin-message').forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type} admin-message fade-in`;
        messageDiv.innerHTML = `
            <div class="message-body">
                ${text}
                <button class="delete is-small" style="float: right;"></button>
            </div>
        `;

        document.querySelector('.main-container').insertBefore(
            messageDiv,
            document.querySelector('.admin-panel')
        );

        // Auto-remove dopo 5 secondi
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);

        // Rimozione manuale
        messageDiv.querySelector('.delete').addEventListener('click', () => {
            messageDiv.remove();
        });
    }

    confirmAction(message, callback) {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmMessage').textContent = message;

        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');

        // Rimuovi listener precedenti
        const newYesBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);

        newYesBtn.addEventListener('click', () => {
            modal.classList.remove('is-active');
            callback();
        });

        modal.classList.add('is-active');
    }

    logout() {
        // Controlla se ci sono modifiche non sincronizzate
        if (this.hasUnsyncedChanges) {
            this.confirmAction(
                '⚠️ ATTENZIONE: Modifiche non sincronizzate!\n\n' +
                'Le tue modifiche sono salvate solo in localStorage.\n' +
                'Per rendere le modifiche disponibili a tutti gli utenti:\n\n' +
                '1️⃣ Clicca "💾 Genera quiz.js" per scaricare il file aggiornato\n' +
                '2️⃣ Sostituisci manualmente il file quiz.js sul server\n\n' +
                '❗ Senza questi passaggi, le modifiche saranno visibili solo su questo browser.\n\n' +
                'Vuoi continuare con il logout?',
                () => {
                    sessionStorage.removeItem('isAdminAuthenticated');
                    sessionStorage.removeItem('adminLoginTime');
                    window.location.href = 'login.html';
                }
            );
        } else {
            // Logout diretto se non ci sono modifiche non sincronizzate
            this.confirmAction(
                '🔐 Confermi il logout dall\'area amministrativa?',
                () => {
                    sessionStorage.removeItem('isAdminAuthenticated');
                    sessionStorage.removeItem('adminLoginTime');
                    window.location.href = 'login.html';
                }
            );
        }
    }
}

// Inizializza l'applicazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    new QuizAdmin();
});