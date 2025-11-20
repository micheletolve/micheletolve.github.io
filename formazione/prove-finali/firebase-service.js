// Servizio per gestire le operazioni Firebase per i quiz
class FirebaseQuizService {
    constructor() {
        this.db = window.firebaseDb;
        this.collectionName = 'quiz-questions';
    }

    async loadQuestions() {
        try {
            const { collection, getDocs, orderBy, query } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            const q = query(collection(this.db, this.collectionName), orderBy('createdAt', 'asc'));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.log('Nessuna domanda trovata in Firebase, uso dati di default');
                return null; // Usa i dati di default
            }
            
            const questions = [];
            querySnapshot.forEach((doc) => {
                questions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`Caricate ${questions.length} domande da Firebase`);
            return questions;
        } catch (error) {
            console.error('Errore nel caricamento da Firebase:', error);
            throw error;
        }
    }

    async saveQuestions(questions) {
        try {
            const { collection, writeBatch, doc, deleteDoc, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            const batch = writeBatch(this.db);
            const collectionRef = collection(this.db, this.collectionName);
            
            // Prima elimina tutti i documenti esistenti
            const existingDocs = await getDocs(collectionRef);
            existingDocs.forEach((docSnapshot) => {
                batch.delete(docSnapshot.ref);
            });
            
            // Poi aggiunge le nuove domande
            questions.forEach((question, index) => {
                const docRef = doc(collectionRef);
                batch.set(docRef, {
                    ...question,
                    createdAt: new Date(),
                    order: index
                });
            });
            
            await batch.commit();
            console.log(`Salvate ${questions.length} domande su Firebase`);
            return true;
        } catch (error) {
            console.error('Errore nel salvataggio su Firebase:', error);
            throw error;
        }
    }

    async addQuestion(question) {
        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            const docRef = await addDoc(collection(this.db, this.collectionName), {
                ...question,
                createdAt: new Date()
            });
            
            console.log('Domanda aggiunta con ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Errore nell\'aggiunta della domanda:', error);
            throw error;
        }
    }

    async updateQuestion(questionId, questionData) {
        try {
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            const docRef = doc(this.db, this.collectionName, questionId);
            await updateDoc(docRef, {
                ...questionData,
                updatedAt: new Date()
            });
            
            console.log('Domanda aggiornata:', questionId);
            return true;
        } catch (error) {
            console.error('Errore nell\'aggiornamento della domanda:', error);
            throw error;
        }
    }

    async deleteQuestion(questionId) {
        try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            await deleteDoc(doc(this.db, this.collectionName, questionId));
            console.log('Domanda eliminata:', questionId);
            return true;
        } catch (error) {
            console.error('Errore nell\'eliminazione della domanda:', error);
            throw error;
        }
    }

    // Metodo per backup locale (fallback)
    async saveToLocalStorage(questions) {
        try {
            localStorage.setItem('quizQuestions', JSON.stringify(questions));
            localStorage.setItem('quizQuestionsBackupDate', new Date().toISOString());
        } catch (error) {
            console.error('Errore nel backup locale:', error);
        }
    }

    // Metodo per caricare da backup locale
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('quizQuestions');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Errore nel caricamento del backup locale:', error);
            return null;
        }
    }
}

// Rendi disponibile globalmente
window.firebaseQuizService = new FirebaseQuizService();