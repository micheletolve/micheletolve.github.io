// Quiz Loader - Sistema generalizzato per tutti i corsi
document.addEventListener("DOMContentLoaded", () => {
    // Verifica che tutti gli elementi DOM esistano
    const form = document.getElementById("quizForm");
    const container = document.getElementById("quizContainer");
    const resultDiv = document.getElementById("result");
    const exportBtn = document.getElementById("exportBtn");
    const submitBtn = document.getElementById("submitBtn");
    const printBtn = document.getElementById("printBtn");
    const categoriaSelect = document.getElementById("categoriaSelect");
    const questionCountSelect = document.getElementById("questionCount");
    const questionCountField = document.getElementById("questionCountField");

    // Controllo elementi essenziali
    if (!form || !container || !categoriaSelect || !submitBtn) {
        console.error('Elementi DOM essenziali non trovati');
        return;
    }

    let domandeCasuali = [];
    let currentQuestions = [];

    // Inizializza il sistema
    initializeSystem();

    async function initializeSystem() {
        console.log('🚀 Inizializzazione sistema quiz...');
        
        // Verifica che CONFIG sia disponibile
        if (typeof CONFIG === 'undefined') {
            console.error('❌ CONFIG non trovato - verificare il caricamento di config.js');
            setTimeout(initializeSystem, 100); // Riprova dopo 100ms
            return;
        }
        
        // Aspetta che Firebase sia disponibile se richiesto
        let retryCount = 0;
        while (!window.firebaseQuizService && retryCount < 50) { // Max 5 secondi
            await new Promise(resolve => setTimeout(resolve, 100));
            retryCount++;
        }
        
        // Verifica che quizData sia disponibile (controlla entrambe le variabili)
        if (typeof window.quizData === 'undefined' && typeof quizData === 'undefined') {
            console.log('⚠️ quizData non trovato localmente - proverò con Firebase');
        }
        
        // Assicurati che quizData sia disponibile come window.quizData
        if (typeof window.quizData === 'undefined' && typeof quizData !== 'undefined') {
            window.quizData = quizData;
            console.log('📋 quizData copiato in window.quizData');
        }
        
        console.log('✅ Sistemi di base verificati');
        
        // Carica domande da Firebase/localStorage
        await loadQuestions();
        
        // Popola le categorie disponibili
        loadCategories();
        
        // Imposta la data corrente
        const today = new Date().toISOString().split('T')[0];
        document.getElementById("data").value = today;
        console.log('📅 Data impostata:', today);
        
        // Mostra informazioni sistema
        updateSystemInfo();
        
        // Bind eventi
        bindEvents();
        
        console.log('🎉 Sistema quiz inizializzato correttamente');
    }    async function loadQuestions() {
        console.log('🔍 Caricamento domande...');
        
        let dataSource = null;
        
        // Prima prova a caricare da Firebase se disponibile
        if (window.firebaseQuizService) {
            try {
                console.log('🔥 Tentativo di caricamento da Firebase...');
                const firebaseQuestions = await window.firebaseQuizService.loadQuestions();
                
                if (firebaseQuestions && firebaseQuestions.length > 0) {
                    // Rimuovi i campi Firebase specifici
                    dataSource = firebaseQuestions.map(q => ({
                        categoria: q.categoria,
                        question: q.question,
                        options: q.options,
                        correct: q.correct,
                        type: q.type
                    }));
                    window.currentQuestions = dataSource;
                    console.log('✅ Domande caricate da Firebase:', dataSource.length);
                    return;
                }
            } catch (firebaseError) {
                console.log('⚠️ Firebase non disponibile, uso fallback:', firebaseError.message);
            }
        }
        
        // Fallback ai dati locali
        console.log('window.quizData disponibile:', typeof window.quizData !== 'undefined');
        console.log('quizData disponibile:', typeof quizData !== 'undefined');
        
        // Determina quale versione di quizData usare
        if (typeof window.quizData !== 'undefined' && window.quizData && window.quizData.length > 0) {
            dataSource = window.quizData;
            console.log('📋 Usando window.quizData:', dataSource.length, 'domande');
        } else if (typeof quizData !== 'undefined' && quizData && quizData.length > 0) {
            dataSource = quizData;
            window.quizData = quizData; // Sincronizza
            console.log('📋 Usando quizData globale:', dataSource.length, 'domande');
        }
        
        // Controlla se quizData è disponibile
        if (!dataSource || dataSource.length === 0) {
            console.error('❌ Nessuna fonte di dati disponibile');
            window.currentQuestions = [];
            return;
        }
        
        // Controlla localStorage come fallback secondario
        const savedQuestions = localStorage.getItem('quizQuestions');
        if (savedQuestions) {
            try {
                const parsed = JSON.parse(savedQuestions);
                if (parsed && parsed.length > 0) {
                    window.currentQuestions = parsed;
                    console.log('✅ Domande caricate da localStorage:', window.currentQuestions.length);
                } else {
                    window.currentQuestions = dataSource;
                    console.log('✅ Domande caricate dalla fonte dati (localStorage vuoto):', window.currentQuestions.length);
                }
            } catch (e) {
                console.error('❌ Errore nel caricamento delle domande salvate:', e);
                window.currentQuestions = dataSource;
                console.log('✅ Fallback alla fonte dati:', window.currentQuestions.length);
            }
        } else {
            window.currentQuestions = dataSource;
            console.log('✅ Domande caricate dalla fonte dati:', window.currentQuestions.length);
        }
        
        // Debug finale
        if (window.currentQuestions && window.currentQuestions.length > 0) {
            const sampleQuestion = window.currentQuestions[0];
            console.log('📋 Esempio domanda:', {
                categoria: sampleQuestion.categoria,
                question: sampleQuestion.question.substring(0, 50) + '...'
            });
        }
    }

    function loadCategories() {
        console.log('🏷️ Caricamento categorie...');
        
        // Pulisce le opzioni esistenti
        categoriaSelect.innerHTML = '<option value="none">-- Seleziona una categoria del quiz --</option>';
        
        // Debug CONFIG
        console.log('CONFIG disponibile:', typeof CONFIG !== 'undefined');
        console.log('CONFIG.quiz disponibile:', CONFIG && CONFIG.quiz);
        console.log('CONFIG.quiz.categories disponibile:', CONFIG && CONFIG.quiz && CONFIG.quiz.categories);
        
        // Verifica che ci siano domande disponibili
        if (!window.currentQuestions || window.currentQuestions.length === 0) {
            console.warn('❌ Nessuna domanda disponibile per caricare le categorie');
            const option = document.createElement('option');
            option.value = 'none';
            option.textContent = 'Nessuna categoria disponibile';
            option.disabled = true;
            categoriaSelect.appendChild(option);
            return;
        }
        
        // Ottiene categorie uniche dalle domande disponibili
        const availableCategories = [...new Set(window.currentQuestions.map(q => q.categoria))];
        console.log('📂 Categorie trovate nelle domande:', availableCategories);
        
        let addedCategories = 0;
        
        // Verifica CONFIG e categorie
        if (CONFIG && CONFIG.quiz && CONFIG.quiz.categories && Array.isArray(CONFIG.quiz.categories)) {
            console.log('📋 Categorie definite in CONFIG:', CONFIG.quiz.categories.map(c => c.id));
            
            // Aggiunge categorie disponibili dal config se definite
            CONFIG.quiz.categories.forEach(category => {
                if (availableCategories.includes(category.id)) {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = `${category.name} (${getQuestionCount(category.id)} domande)`;
                    categoriaSelect.appendChild(option);
                    addedCategories++;
                    console.log(`✅ Aggiunta categoria: ${category.name}`);
                }
            });
        } else {
            console.warn('❌ CONFIG.quiz.categories non valido');
        }
        
        // Aggiunge categorie non definite nel config ma presenti nelle domande
        availableCategories.forEach(categoria => {
            const existsInConfig = CONFIG && CONFIG.quiz && CONFIG.quiz.categories && 
                                 CONFIG.quiz.categories.find(cat => cat.id === categoria);
            
            if (!existsInConfig) {
                const option = document.createElement('option');
                option.value = categoria;
                option.textContent = `${categoria.charAt(0).toUpperCase() + categoria.slice(1)} (${getQuestionCount(categoria)} domande)`;
                categoriaSelect.appendChild(option);
                addedCategories++;
                console.log(`✅ Aggiunta categoria non configurata: ${categoria}`);
            }
        });
        
        console.log(`📊 Totale categorie caricate: ${addedCategories}`);
        console.log(`📝 Opzioni totali nel select: ${categoriaSelect.options.length}`);
        
        // Se nessuna categoria è stata aggiunta, mostra messaggio di errore
        if (addedCategories === 0) {
            const option = document.createElement('option');
            option.value = 'none';
            option.textContent = 'Errore nel caricamento categorie';
            option.disabled = true;
            categoriaSelect.appendChild(option);
            console.error('❌ Nessuna categoria è stata caricata nel select');
        }
    }    function getQuestionCount(categoria) {
        return window.currentQuestions.filter(q => q.categoria === categoria).length;
    }

    function updateSystemInfo() {
        const totalQuestions = window.currentQuestions.length;
        const categories = [...new Set(window.currentQuestions.map(q => q.categoria))].length;

        document.getElementById('systemInfo').innerHTML =
            `Domande disponibili: <strong>${totalQuestions}</strong> | Categorie: <strong>${categories}</strong>`;
    }

    function bindEvents() {
        categoriaSelect.addEventListener("change", handleCategoryChange);
        questionCountSelect.addEventListener("change", generateQuestions);
        submitBtn.addEventListener("click", handleSubmit);
        printBtn.addEventListener("click", handlePrint);
        exportBtn.addEventListener("click", handleExport);
    }

    function handleCategoryChange() {
        const categoria = categoriaSelect.value;

        if (categoria === 'none') {
            questionCountField.style.display = 'none';
            submitBtn.disabled = true;
            container.innerHTML = "";
            return;
        }

        const available = getQuestionCount(categoria);

        if (available === 0) {
            showMessage('Nessuna domanda disponibile per questa categoria', 'warning');
            questionCountField.style.display = 'none';
            submitBtn.disabled = true;
            container.innerHTML = "";
            return;
        }

        // Aggiorna le opzioni per il numero di domande
        questionCountSelect.innerHTML = '';
        [5, 10, 15, 20, available].forEach(num => {
            if (num <= available) {
                const option = document.createElement('option');
                option.value = num;
                option.textContent = `${num} domande`;
                if (num === Math.min(5, available)) option.selected = true;
                questionCountSelect.appendChild(option);
            }
        });

        questionCountField.style.display = 'block';
        generateQuestions();
    }

    function generateQuestions() {
        const categoria = categoriaSelect.value;
        const numDomande = parseInt(questionCountSelect.value) || 5;

        container.innerHTML = "";
        domandeCasuali = [];
        submitBtn.disabled = true;

        if (categoria === 'none') return;

        const domandeFiltrate = window.currentQuestions.filter(q => q.categoria === categoria);
        domandeCasuali = domandeFiltrate
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(numDomande, domandeFiltrate.length));

        if (domandeCasuali.length === 0) {
            showMessage('Nessuna domanda trovata per questa categoria', 'error');
            return;
        }

        domandeCasuali.forEach((q, i) => {
            const box = document.createElement("div");
            box.className = "question-box fade-in";

            const title = document.createElement("h3");
            title.className = "question-title title is-5";
            title.textContent = `${i + 1}. ${q.question}`;
            box.appendChild(title);

            const typeIndicator = document.createElement("div");
            typeIndicator.className = "question-type-indicator";
            const isMultiple = (q.type === 'multiple' || q.correct.length > 1);
            typeIndicator.innerHTML = isMultiple ?
                "⚠️ <strong>Attenzione:</strong> Sono previste più risposte corrette" :
                "ℹ️ <strong>Nota:</strong> È prevista una sola risposta corretta";
            box.appendChild(typeIndicator);

            q.options.forEach((opt, j) => {
                const field = document.createElement("div");
                field.className = "field";

                const control = document.createElement("div");
                control.className = "control";

                const label = document.createElement("label");
                label.className = isMultiple ? "checkbox" : "radio";

                const input = document.createElement("input");
                input.type = isMultiple ? 'checkbox' : 'radio';
                input.name = 'q' + i;
                input.value = j;
                input.addEventListener('change', window.checkFormCompletion);

                label.appendChild(input);
                label.appendChild(document.createTextNode(' ' + opt));

                control.appendChild(label);
                field.appendChild(control);
                box.appendChild(field);
            });

            container.appendChild(box);
        });

        exportBtn.style.display = 'inline-block';

        // Scroll smooth alle domande
        setTimeout(() => {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    // Funzione globale per verificare il completamento del form
    window.checkFormCompletion = function() {
        var allAnswered = domandeCasuali.every(function(q, i) {
            var inputs = form.querySelectorAll('input[name=q' + i + ']:checked');
            return inputs.length > 0;
        });

        submitBtn.disabled = !allAnswered;
    };

    function handleSubmit(e) {
        e.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const cognome = document.getElementById("cognome").value.trim();
        const corso = document.getElementById("corso").value.trim();
        const data = moment(document.getElementById("data").value, "YYYY-MM-DD").format("DD/MM/YYYY");
        const categoria = categoriaSelect.value;

        if (!nome || !cognome || !corso || !data || domandeCasuali.length === 0) {
            showMessage("Compila tutti i campi e completa il quiz prima di correggere.", "error");
            return;
        }

        const userAnswers = domandeCasuali.map((q, i) => {
            const inputs = form.querySelectorAll(`input[name=q${i}]:checked`);
            return Array.from(inputs).map(input => parseInt(input.value));
        });

        let score = 0;
        const categoryName = getCategoryName(categoria);

        let output = `
            <div class="has-text-centered mb-5">
                <h2 class="title is-2">📋 Risultati del Quiz</h2>
                <div class="box">
                    <p class="is-size-5"><strong>Partecipante:</strong> ${nome} ${cognome}</p>
                    <p class="is-size-6"><strong>Corso:</strong> ${corso}</p>
                    <p class="is-size-6"><strong>Categoria:</strong> ${categoryName}</p>
                    <p class="is-size-6"><strong>Data:</strong> ${data}</p>
                </div>
            </div>
            <ol class="ml-5">`;

        domandeCasuali.forEach((q, i) => {
            const correct = q.correct.slice().sort().join(',');
            const given = userAnswers[i].slice().sort().join(',');
            const isCorrect = correct === given;
            if (isCorrect) score++;

            const correctAnswersText = q.correct.map(idx => q.options[idx]).join(', ');
            const userAnswersText = userAnswers[i].map(idx => q.options[idx]).join(', ') || 'Nessuna risposta';

            output += `
                <li class="mb-4">
                    <div class="box">
                        <p class="has-text-weight-bold mb-3">${q.question}</p>
                        <div class="columns">
                            <div class="column">
                                <p><strong>Risposta corretta:</strong><br>
                                <span class="has-text-success">${correctAnswersText}</span></p>
                            </div>
                            <div class="column">
                                <p><strong>Tua risposta:</strong><br>
                                <span class="${isCorrect ? 'has-text-success' : 'has-text-danger'}">${userAnswersText}</span></p>
                            </div>
                            <div class="column is-narrow">
                                <span class="tag ${isCorrect ? 'is-success' : 'is-danger'} is-large">
                                    ${isCorrect ? '✔️ Corretta' : '❌ Sbagliata'}
                                </span>
                            </div>
                        </div>
                    </div>
                </li>`;
        });

        const percentage = Math.round((score / domandeCasuali.length) * 100);
        let resultClass = 'is-danger';
        let resultIcon = '❌';
        if (percentage >= 60) {
            resultClass = 'is-success';
            resultIcon = '✅';
        } else if (percentage >= 50) {
            resultClass = 'is-warning';
            resultIcon = '⚠️';
        }

        output += `</ol>
            <div class="box has-text-centered">
                <h3 class="title is-3 ${resultClass === 'is-success' ? 'has-text-success' :
                    resultClass === 'is-warning' ? 'has-text-warning' : 'has-text-danger'}">
                    ${resultIcon} Punteggio Finale: ${score}/${domandeCasuali.length} (${percentage}%)
                </h3>
                <p class="subtitle is-5">
                    ${percentage >= 60 ? 'Congratulazioni! Quiz superato!' :
                      percentage >= 50 ? 'Risultato sufficiente, ma puoi migliorare.' :
                      'Quiz non superato. Studia di più e riprova!'}
                </p>
            </div>`;

        resultDiv.innerHTML = output;
        resultDiv.style.display = "block";
        printBtn.style.display = "inline-block";

        // Scroll smooth ai risultati
        setTimeout(() => {
            resultDiv.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }

    function handlePrint() {
        window.print();
    }

    function handleExport() {
        const categoria = categoriaSelect.value;
        const categoryName = getCategoryName(categoria);

        if (categoria === 'none' || domandeCasuali.length === 0) {
            showMessage('Nessun quiz da esportare', 'warning');
            return;
        }

        let content = `QUIZ - ${categoryName.toUpperCase()}\n`;
        content += `${'='.repeat(50)}\n\n`;

        domandeCasuali.forEach((q, i) => {
            const isMultiple = (q.type === 'multiple' || q.correct.length > 1);
            content += `${i + 1}. ${q.question}\n`;
            content += `   [${isMultiple ? 'Risposte multiple' : 'Risposta singola'}]\n\n`;

            q.options.forEach((opt, j) => {
                const letter = String.fromCharCode(97 + j);
                const isCorrect = q.correct.includes(j);
                content += `   ${letter}) ${opt}`;
                if (isCorrect) content += ` ← CORRETTA`;
                content += `\n`;
            });
            content += `\n${'─'.repeat(30)}\n\n`;
        });

        content += `\nRISPOSTE CORRETTE:\n`;
        content += `${'='.repeat(20)}\n`;
        domandeCasuali.forEach((q, i) => {
            const correctLetters = q.correct.map(idx => String.fromCharCode(97 + idx)).join(', ');
            content += `${i + 1}. ${correctLetters}\n`;
        });

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Quiz_${categoria}_${moment().format("YYYYMMDD_HHmmss")}.txt`;
        link.click();

        showMessage('Quiz esportato con successo!', 'success');
    }

    function getCategoryName(categoryId) {
        const category = CONFIG.quiz.categories.find(cat => cat.id === categoryId);
        return category ? category.name : categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
    }

    function showMessage(text, type) {
        // Rimuovi messaggi esistenti
        document.querySelectorAll('.temp-message').forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type} temp-message fade-in`;
        messageDiv.innerHTML = `
            <div class="message-body">
                ${text}
                <button class="delete is-small" style="float: right;"></button>
            </div>
        `;

        document.querySelector('.main-container').insertBefore(
            messageDiv,
            document.querySelector('.form-section')
        );

        // Auto-remove dopo 5 secondi
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);

        // Rimozione manuale
        messageDiv.querySelector('.delete').addEventListener('click', () => {
            messageDiv.remove();
        });
    }
});
