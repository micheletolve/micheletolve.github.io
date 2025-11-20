// Gestione del form di login
document.addEventListener('DOMContentLoaded', function() {
    var loginForm = document.getElementById('loginForm');
    var usernameInput = document.getElementById('username');
    var passwordInput = document.getElementById('password');
    var errorMessage = document.getElementById('errorMessage');

    // Funzione per mostrare errori
    function showError(message) {
        var messageBody = errorMessage.querySelector('.message-body');
        messageBody.textContent = message;
        errorMessage.style.display = 'block';

        // Nascondi il messaggio dopo 3 secondi
        setTimeout(function() {
            errorMessage.style.display = 'none';
        }, 3000);
    }

    // Gestione submit del form
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        var username = usernameInput.value.trim();
        var password = passwordInput.value.trim();

        if (!username || !password) {
            showError('Inserisci nome utente e password');
            return;
        }

        // Hash delle credenziali inserite
        var hashedUsername = md5(username);
        var hashedPassword = md5(password);

        // Verifica credenziali
        if (hashedUsername === CONFIG.auth.username &&
            hashedPassword === CONFIG.auth.password) {

            // Login riuscito - salva sessione
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            sessionStorage.setItem('adminLoginTime', Date.now().toString());

            // Reindirizza al pannello admin
            window.location.href = 'admin.html';
        } else {
            showError('Credenziali non valide');
        }
    });

    // Controlla se già autenticato
    function checkExistingAuth() {
        if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
            var loginTime = parseInt(sessionStorage.getItem('adminLoginTime') || '0');
            var currentTime = Date.now();
            var sessionDuration = 2 * 60 * 60 * 1000; // 2 ore

            if (currentTime - loginTime < sessionDuration) {
                window.location.href = 'admin.html';
            } else {
                // Sessione scaduta
                sessionStorage.removeItem('isAdminAuthenticated');
                sessionStorage.removeItem('adminLoginTime');
            }
        }
    }

    // Controlli iniziali
    checkExistingAuth();

    // Focus automatico sul campo username
    usernameInput.focus();

    // Enter per passare da username a password
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            passwordInput.focus();
        }
    });
});