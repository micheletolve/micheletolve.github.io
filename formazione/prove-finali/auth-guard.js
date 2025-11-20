// Guard di autenticazione per il pannello amministratore
// Questo script deve essere caricato PRIMA di qualsiasi altro contenuto

(function() {
    'use strict';

    // Funzione per creare e mostrare la schermata di accesso negato
    function showAccessDenied() {
        var errorPage = '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #f14668; color: white; z-index: 99999; display: flex; align-items: center; justify-content: center; flex-direction: column; font-family: Arial, sans-serif;">';
        errorPage += '<h1 style="font-size: 2rem; margin-bottom: 1rem;">🔒 Accesso Negato</h1>';
        errorPage += '<p style="margin-bottom: 1rem; text-align: center;">Sessione non valida o scaduta.<br>Reindirizzamento al login...</p>';
        errorPage += '<div style="width: 50px; height: 50px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>';
        errorPage += '</div>';
        errorPage += '<style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } body { overflow: hidden !important; }</style>';

        document.write(errorPage);
        document.close();

        // Reindirizzamento dopo 2 secondi
        setTimeout(function() {
            window.location.replace('login.html');
        }, 2000);

        return false;
    }

    // Funzione principale di verifica autenticazione
    function verifyAuthentication() {
        try {
            var isAuthenticated = sessionStorage.getItem('isAdminAuthenticated');
            var loginTime = parseInt(sessionStorage.getItem('adminLoginTime') || '0');
            var currentTime = Date.now();
            var sessionDuration = 2 * 60 * 60 * 1000; // 2 ore

            // Controlli di sicurezza rigorosi
            var isValidAuth = isAuthenticated === 'true';
            var isValidTime = !isNaN(loginTime) && loginTime > 0;
            var isSessionValid = isValidTime && (currentTime - loginTime) < sessionDuration;

            // Se qualsiasi controllo fallisce, blocca l'accesso
            if (!isValidAuth || !isValidTime || !isSessionValid) {
                // Pulisci completamente la sessione
                try {
                    sessionStorage.removeItem('isAdminAuthenticated');
                    sessionStorage.removeItem('adminLoginTime');
                    localStorage.removeItem('tempAdminData'); // Rimuovi eventuali dati temporanei
                } catch (e) {
                    // Ignora errori di storage
                }

                // Mostra schermata di accesso negato e reindirizza
                return showAccessDenied();
            }

            // Se arriviamo qui, l'autenticazione è valida
            console.log('✓ Autenticazione verificata - Accesso consentito');
            return true;

        } catch (error) {
            // In caso di errori, nega l'accesso per sicurezza
            console.error('Errore durante la verifica autenticazione:', error);
            return showAccessDenied();
        }
    }

    // Esegui immediatamente la verifica
    var authResult = verifyAuthentication();

    // Se l'autenticazione è valida, imposta il flag per il caricamento della pagina
    if (authResult === true) {
        window.adminAuthVerified = true;
    }

})();