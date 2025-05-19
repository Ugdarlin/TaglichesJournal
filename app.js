// File: app.js

// --- Database Setup ---
const DB_NAME = 'DailyFormsDB';
const STORE_NAME = 'entries';
let db;

/**
 * Initializes the IndexedDB database.
 */
function initDB() {
    console.log('Initializing database...');
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('date', 'date', { unique: false });
                console.log('Object store "entries" created.');
            } else {
                console.log('Object store "entries" already exists.');
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully.');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            showMessage('Fehler beim Öffnen der Datenbank: ' + event.target.error, 'error');
            reject(event.target.error);
        };
    });
}

// --- Form Data & Symptoms ---
const dailyForm = document.getElementById('dailyForm');
const entryDateField = document.getElementById('entryDate');

// Define symptoms for panic attacks
const PANIC_SYMPTOMS = [
    {id: "symBrustschmerzen", label: "Schmerzen oder Beschwerden in der Brust"},
    {id: "symSchwindel", label: "Schwindel, Unsicherheit, Benommenheit oder der Ohnmacht nahe"},
    {id: "symErstickung", label: "Erstickungs- oder Würgegefühle"},
    {id: "symHitzewallungen", label: "Hitzewallungen oder Kälteschauer"},
    {id: "symUebelkeit", label: "Übelkeit oder Magen-Darmbeschwerden"},
    {id: "symTaubheit", label: "Taubheitsgefühle oder Kribbeln"},
    {id: "symHerzklopfen", label: "Herzklopfen oder beschleunigter Herzschlag"},
    {id: "symKurzatmigkeit", label: "Empfindung von Kurzatmigkeit oder Ersticken"},
    {id: "symSchwitzen", label: "Schwitzen"},
    {id: "symZittern", label: "Zittern oder Schwanken"},
    {id: "symAngstSterben", label: "Angst, zu sterben"},
    {id: "symAngstKontrollverlust", label: "Angst, verrückt zu werden oder die Kontrolle zu verlieren"},
    {id: "symUnwirklichkeit", label: "Gefühle von Unwirklichkeit oder sich losgelöst fühlen"}
];

/**
 * Helper function to escape HTML content.
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (match) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
    });
}

/**
 * Generates and injects symptom checkboxes into the DOM.
 */
function generateSymptomCheckboxes() {
    console.log('Attempting to generate symptom checkboxes...');
    const container = document.getElementById('panikSymptomeCheckboxesContainer');
    if (!container) {
        console.error('Symptom checkbox container (panikSymptomeCheckboxesContainer) not found in HTML!');
        return;
    }
    console.log('Symptom checkbox container found:', container);

    let checkboxesHTML = '';
    PANIC_SYMPTOMS.forEach(symptom => {
        checkboxesHTML += `
            <label class="inline-flex items-center">
                <input type="checkbox" name="panikSymptome" value="${symptom.id}" class="form-checkbox text-blue-600 rounded">
                <span class="ml-2 text-sm">${escapeHTML(symptom.label)}</span>
            </label>
        `;
    });
    // console.log('Generated checkboxes HTML:', checkboxesHTML); // Optional: can be very verbose
    container.innerHTML = checkboxesHTML;
    console.log('Symptom checkboxes generated and injected.');
}


/**
 * Sets the default date for the form to today.
 */
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    if (entryDateField) {
        entryDateField.value = today;
    }
}

/**
 * Handles the form submission.
 */
async function addEntry(event) {
    event.preventDefault();
    if (!db) {
        showMessage('Datenbank nicht initialisiert. Bitte warten oder aktualisieren.', 'error');
        return;
    }

    const entryDate = dailyForm.entryDate.value;
    if (!entryDate) {
        showMessage('Bitte geben Sie ein Datum an.', 'error');
        return;
    }

    const newEntry = {
        date: new Date(entryDate + "T00:00:00").toISOString(),
        stimmung: dailyForm.stimmung.value,
        energieniveau: dailyForm.energieniveau.value,
        koerperlichesWohlbefinden: dailyForm.koerperlichesWohlbefinden.value,
        nervositaet: dailyForm.nervositaet.value,
        unruhe: dailyForm.unruhe.value,
        traurigkeit: dailyForm.traurigkeit.value,
        einsamkeit: dailyForm.einsamkeit.value,
        situationenVermieden: dailyForm.situationenVermieden.value,
        vermiedenWelche: dailyForm.situationenVermieden.value === 'ja' ? dailyForm.vermiedenWelche.value : '',
        panikanfallErlebt: dailyForm.panikanfallErlebt.value,
        submittedAt: new Date().toISOString()
    };

    if (newEntry.panikanfallErlebt === 'ja') {
        newEntry.panikBeginn = dailyForm.panikBeginn.value;
        newEntry.panikEnde = dailyForm.panikEnde.value;
        newEntry.panikIntensitaet = dailyForm.panikIntensitaet.value;
        newEntry.panikSymptome = Array.from(dailyForm.querySelectorAll('input[name="panikSymptome"]:checked')).map(cb => cb.value);
        newEntry.panikSituation = dailyForm.panikSituation.value;
        newEntry.panikAusloeser = dailyForm.panikAusloeser.value;
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(newEntry);

    request.onsuccess = () => {
        console.log('Entry added successfully.');
        showMessage('Eintrag erfolgreich gespeichert!', 'success');
        dailyForm.reset();
        setDefaultDate();
        document.getElementById('vermiedenDetails').style.display = 'none';
        document.getElementById('panikDetails').style.display = 'none';
        document.querySelectorAll('.slider-container output').forEach(output => {
            const slider = document.getElementById(output.htmlFor);
            if (slider) {
                 if (['panikIntensitaet', 'nervositaet', 'unruhe', 'traurigkeit', 'einsamkeit'].includes(slider.id)) {
                    slider.value = slider.defaultValue || '0';
                    output.value = slider.defaultValue || '0';
                } else {
                    slider.value = slider.defaultValue || '50';
                    output.value = slider.defaultValue || '50';
                }
            }
        });
        document.querySelectorAll('input[name="panikSymptome"]').forEach(checkbox => checkbox.checked = false);
        displayEntries();
    };

    request.onerror = (event) => {
        console.error('Error adding entry:', event.target.error);
        showMessage('Fehler beim Speichern des Eintrags: ' + event.target.error, 'error');
    };
}

// --- Displaying Entries ---
const entriesListDiv = document.getElementById('entriesList');

async function displayEntries() {
    if (!db) {
        entriesListDiv.innerHTML = '<p class="text-gray-500">Datenbank nicht bereit. Bitte warten oder aktualisieren.</p>';
        return;
    }

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
        entriesListDiv.innerHTML = '';
        const entries = getAllRequest.result;

        if (entries.length === 0) {
            entriesListDiv.innerHTML = '<p class="text-gray-500">Noch keine Einträge vorhanden. Füllen Sie das Formular aus, um zu beginnen!</p>';
            return;
        }

        entries.sort((a, b) => new Date(b.date) - new Date(a.date));

        entries.forEach(entry => {
            const entryCard = document.createElement('div');
            entryCard.className = 'entry-card';
            const entryDate = new Date(entry.date);
            const displayDate = entryDate.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

            let panikDetailsHTML = '';
            if (entry.panikanfallErlebt === 'ja') {
                const symptomeLabels = entry.panikSymptome && entry.panikSymptome.length > 0
                    ? entry.panikSymptome.map(symptomId => {
                        const symptomObj = PANIC_SYMPTOMS.find(s => s.id === symptomId);
                        return symptomObj ? escapeHTML(symptomObj.label) : escapeHTML(symptomId);
                    })
                    : [];
                const symptomeList = symptomeLabels.length > 0
                    ? `<ul>${symptomeLabels.map(label => `<li>${label}</li>`).join('')}</ul>`
                    : '<p>Keine Symptome angegeben.</p>';
                panikDetailsHTML = `
                    <h4>Panikanfall Details:</h4>
                    <p><strong>Beginn:</strong> ${escapeHTML(entry.panikBeginn) || 'N/A'}</p>
                    <p><strong>Ende:</strong> ${escapeHTML(entry.panikEnde) || 'N/A'}</p>
                    <p><strong>Intensität:</strong> ${escapeHTML(entry.panikIntensitaet) || '0'}/100</p>
                    <p><strong>Symptome:</strong></p>
                    ${symptomeList}
                    <p><strong>Situation:</strong> ${escapeHTML(entry.panikSituation) || 'N/A'}</p>
                    <p><strong>Auslöser:</strong> ${escapeHTML(entry.panikAusloeser) || 'N/A'}</p>
                `;
            }

            entryCard.innerHTML = `
                <h3>${displayDate}</h3>
                <p class="text-xs text-gray-400 mb-2">Eingereicht am: ${new Date(entry.submittedAt).toLocaleString('de-DE')}</p>
                <p><strong>Stimmung:</strong> ${escapeHTML(entry.stimmung)}/100</p>
                <p><strong>Energieniveau:</strong> ${escapeHTML(entry.energieniveau)}/100</p>
                <p><strong>Körperl. Wohlbefinden:</strong> ${escapeHTML(entry.koerperlichesWohlbefinden)}/100</p>
                <p><strong>Nervosität:</strong> ${escapeHTML(entry.nervositaet)}/100</p>
                <p><strong>Unruhe:</strong> ${escapeHTML(entry.unruhe)}/100</p>
                <p><strong>Traurigkeit:</strong> ${escapeHTML(entry.traurigkeit)}/100</p>
                <p><strong>Einsamkeit:</strong> ${escapeHTML(entry.einsamkeit)}/100</p>
                <h4>Vermiedene Situationen:</h4>
                <p><strong>Vermieden:</strong> ${entry.situationenVermieden === 'ja' ? 'Ja' : 'Nein'}</p>
                ${entry.situationenVermieden === 'ja' ? `<p><strong>Welche:</strong> ${escapeHTML(entry.vermiedenWelche) || 'N/A'}</p>` : ''}
                <h4>Panikanfall:</h4>
                <p><strong>Erlebt:</strong> ${entry.panikanfallErlebt === 'ja' ? 'Ja' : 'Nein'}</p>
                ${panikDetailsHTML}
            `;
            entriesListDiv.appendChild(entryCard);
        });
    };
    getAllRequest.onerror = (event) => {
        console.error('Error fetching entries:', event.target.error);
        entriesListDiv.innerHTML = '<p class="text-red-500">Fehler beim Laden der Einträge.</p>';
        showMessage('Fehler beim Laden der Einträge: ' + event.target.error, 'error');
    };
}

// --- Downloading Data ---
const downloadButton = document.getElementById('downloadData');

async function downloadEntries() {
    if (!db) {
        showMessage('Datenbank nicht initialisiert. Daten können nicht heruntergeladen werden.', 'error');
        return;
    }
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
        const entries = getAllRequest.result;
        if (entries.length === 0) {
            showMessage('Keine Einträge zum Herunterladen vorhanden.', 'info');
            return;
        }
        const jsonData = JSON.stringify(entries, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taegliches_journal_eintraege_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage('Daten-Download gestartet.', 'success');
    };
    getAllRequest.onerror = (event) => {
        console.error('Error fetching data for download:', event.target.error);
        showMessage('Fehler beim Vorbereiten der Daten für den Download: ' + event.target.error, 'error');
    };
}

// --- Message Display ---
const messageBox = document.getElementById('message-box');
let messageTimeout;

function showMessage(text, type = 'info') {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.className = 'fixed top-5 right-5 px-4 py-3 rounded-md shadow-lg z-50';
    if (type === 'success') {
        messageBox.classList.add('bg-green-100', 'border', 'border-green-400', 'text-green-700');
    } else if (type === 'error') {
        messageBox.classList.add('bg-red-100', 'border', 'border-red-400', 'text-red-700');
    } else {
        messageBox.classList.add('bg-blue-100', 'border', 'border-blue-400', 'text-blue-700');
    }
    messageBox.style.display = 'block';
    if (messageTimeout) clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => { messageBox.style.display = 'none'; }, 3000);
}

// --- Service Worker Registration ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('ServiceWorker: Registrierung erfolgreich, Scope:', registration.scope))
                .catch(error => {
                    console.log('ServiceWorker: Registrierung fehlgeschlagen:', error);
                    // showMessage('Service Worker konnte nicht für Offline-Nutzung registriert werden.', 'error'); // Can be noisy
                });
        });
    } else {
         console.warn('Service Worker werden von diesem Browser nicht unterstützt.');
         // showMessage('Service Worker werden von diesem Browser nicht unterstützt.', 'info');
    }
}

// --- Footer Year ---
function setCurrentYear() {
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

// --- Conditional Form Logic & Slider Updates ---
function setupConditionalFields() {
    const vermiedenRadios = document.querySelectorAll('input[name="situationenVermieden"]');
    const vermiedenDetailsDiv = document.getElementById('vermiedenDetails');
    if (vermiedenRadios.length && vermiedenDetailsDiv) {
        vermiedenRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                vermiedenDetailsDiv.style.display = event.target.value === 'ja' ? 'block' : 'none';
            });
        });
    }

    const panikRadios = document.querySelectorAll('input[name="panikanfallErlebt"]');
    const panikDetailsDiv = document.getElementById('panikDetails');
     if (panikRadios.length && panikDetailsDiv) {
        panikRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                panikDetailsDiv.style.display = event.target.value === 'ja' ? 'block' : 'none';
            });
        });
    }
}

function setupSliderOutputs() {
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        const output = document.querySelector(`output[for="${slider.id}"]`);
        if (output) {
            output.value = slider.value;
            slider.addEventListener('input', (event) => {
                output.value = event.target.value;
            });
        }
    });
}

// --- Notification Logic ---
const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
const notificationStatusP = document.getElementById('notificationStatus');

function updateNotificationStatusUI() {
    if (!('Notification' in window) || !notificationStatusP || !enableNotificationsBtn) {
       if (notificationStatusP) notificationStatusP.textContent = 'Status: Benachrichtigungen werden von diesem Browser nicht unterstützt.';
       if (enableNotificationsBtn) {
            enableNotificationsBtn.disabled = true;
            enableNotificationsBtn.textContent = 'Nicht unterstützt';
       }
        return;
    }

    const effectivelyDisabled = localStorage.getItem('notificationsEffectivelyDisabled') === 'true';

    switch (Notification.permission) {
        case 'granted':
            if (effectivelyDisabled) {
                notificationStatusP.textContent = 'Status: Tägliche Erinnerungen sind pausiert.';
                enableNotificationsBtn.textContent = 'Erinnerungen Fortsetzen';
                enableNotificationsBtn.classList.remove('btn-secondary');
                enableNotificationsBtn.classList.add('btn-neutral');
            } else {
                notificationStatusP.textContent = 'Status: Tägliche Erinnerungen sind aktiviert.';
                enableNotificationsBtn.textContent = 'Erinnerungen Pausieren';
                enableNotificationsBtn.classList.remove('btn-neutral');
                enableNotificationsBtn.classList.add('btn-secondary');
            }
            enableNotificationsBtn.disabled = false;
            break;
        case 'denied':
            notificationStatusP.textContent = 'Status: Benachrichtigungen blockiert. Bitte in den Browsereinstellungen ändern.';
            enableNotificationsBtn.disabled = true;
            enableNotificationsBtn.textContent = 'Blockiert';
            break;
        default: // 'default'
            notificationStatusP.textContent = 'Status: Tägliche Erinnerungen sind nicht aktiviert.';
            enableNotificationsBtn.textContent = 'Tägliche Erinnerungen Aktivieren';
            enableNotificationsBtn.disabled = false;
            enableNotificationsBtn.classList.remove('btn-secondary');
            enableNotificationsBtn.classList.add('btn-neutral');
    }
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showMessage('Dieser Browser unterstützt keine Desktop-Benachrichtigungen.', 'error');
        updateNotificationStatusUI();
        return;
    }

    if (Notification.permission === 'granted') {
        const effectivelyDisabled = localStorage.getItem('notificationsEffectivelyDisabled') === 'true';
        if (effectivelyDisabled) {
            localStorage.removeItem('notificationsEffectivelyDisabled');
            showMessage('Tägliche Erinnerungen werden wieder angezeigt.', 'success');
            checkAndTriggerDailyNotification(); 
        } else {
            localStorage.setItem('notificationsEffectivelyDisabled', 'true');
            showMessage('Tägliche Erinnerungen pausiert.', 'info');
        }
        updateNotificationStatusUI();
        return;
    }
    
    if (Notification.permission === 'denied') {
         showMessage('Benachrichtigungen wurden blockiert. Sie müssen die Berechtigung in Ihren Browsereinstellungen manuell erteilen.', 'error');
         updateNotificationStatusUI();
         return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        showMessage('Tägliche Erinnerungen erfolgreich aktiviert!', 'success');
        localStorage.setItem('notificationPermissionGranted', 'true'); 
        localStorage.removeItem('notificationsEffectivelyDisabled');
        checkAndTriggerDailyNotification(); 
    } else if (permission === 'denied') {
        showMessage('Erinnerungen wurden nicht aktiviert, da die Berechtigung verweigert wurde.', 'info');
        localStorage.setItem('notificationPermissionGranted', 'false');
    } else {
        showMessage('Entscheidung für Erinnerungen wurde nicht getroffen.', 'info');
    }
    updateNotificationStatusUI();
}

function sendNotificationToSW() {
    if (localStorage.getItem('notificationsEffectivelyDisabled') === 'true') {
        console.log('Notifications are conceptually disabled by user. Skipping SW message.');
        return;
    }
    if (!navigator.serviceWorker.controller) {
        console.warn('Service Worker not active, cannot send message for notification.');
        return;
    }
    navigator.serviceWorker.controller.postMessage({
        action: 'showDailyNotification',
        title: 'Tägliches Journal',
        body: 'Zeit für deinen heutigen Journaleintrag! ✏️',
        icon: 'icons/icon-192x192.png' 
    });
}

function checkAndTriggerDailyNotification() {
    if (Notification.permission !== 'granted' || localStorage.getItem('notificationsEffectivelyDisabled') === 'true') {
        console.log('Notification permission not granted or conceptually disabled. Skipping daily check.');
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const lastNotificationDate = localStorage.getItem('lastNotificationShownDate');
    const now = new Date();
    const notificationHour = 10; // Example: 10 AM

    if (lastNotificationDate !== todayStr && now.getHours() >= notificationHour) {
        console.log('Triggering daily notification for', todayStr);
        sendNotificationToSW();
        localStorage.setItem('lastNotificationShownDate', todayStr);
    } else if (lastNotificationDate === todayStr) {
        console.log('Daily notification already shown for', todayStr);
    } else {
        console.log('Not yet time for daily notification (or already shown). Current hour:', now.getHours());
    }
}

function initialNotificationCheck() {
    updateNotificationStatusUI(); 
    if (Notification.permission === 'granted') {
        checkAndTriggerDailyNotification();
        setInterval(checkAndTriggerDailyNotification, 30 * 60 * 1000); // Check every 30 minutes
    }
}

// --- Event Listeners and Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired. Initializing application...');
    try {
        await initDB(); // Wait for DB to be ready
        setDefaultDate();
        generateSymptomCheckboxes(); // Generate checkboxes
        displayEntries(); // Display any existing entries
        registerServiceWorker();
        setCurrentYear();
        setupConditionalFields(); // Setup hide/show logic for form sections
        setupSliderOutputs(); // Setup slider value displays
        initialNotificationCheck(); // Setup and check notifications

        if (dailyForm) {
            dailyForm.addEventListener('submit', addEntry);
        } else {
            console.error('Daily form not found!');
        }
        if (downloadButton) {
            downloadButton.addEventListener('click', downloadEntries);
        } else {
            console.error('Download button not found!');
        }
        if (enableNotificationsBtn) {
            enableNotificationsBtn.addEventListener('click', requestNotificationPermission);
        } else {
            console.error('Enable notifications button not found!');
        }
        console.log('Application initialization complete.');
    } catch (error) {
        console.error("Initialisierung fehlgeschlagen (Initialization failed):", error);
        showMessage("Anwendung konnte nicht korrekt initialisiert werden. Bitte versuchen Sie, die Seite neu zu laden.", "error");
    }
});
