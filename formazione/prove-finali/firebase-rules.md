# Regole di sicurezza Firebase Firestore
# Copia questo contenuto nelle regole di sicurezza del tuo progetto Firebase

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permetti lettura a tutti per le domande quiz (per il quiz pubblico)
    match /quiz-questions/{document} {
      allow read: if true;
      // Permetti scrittura solo dopo autenticazione (per l'admin)
      // Per ora permettiamo anche scrittura (da migliorare con auth)
      allow write: if true;
    }
  }
}
```

## ISTRUZIONI PER CONFIGURARE LE REGOLE:

1. Vai nella Firebase Console
2. Menu laterale → "Firestore Database" 
3. Tab "Regole"
4. Sostituisci il contenuto con quello sopra
5. Clicca "Pubblica"

## SICUREZZA:
- Attualmente le regole permettono lettura/scrittura a tutti
- In produzione dovresti implementare autenticazione Firebase
- Le regole attuali sono OK per test/development

## NOTA IMPORTANTE:
- Queste regole sono permissive per semplificare il setup iniziale
- Per un ambiente di produzione, considera l'implementazione di Firebase Auth