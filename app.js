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
        // No version change needed if schema itself isn't changing, only display logic
        const request = indexedDB.open(DB_NAME, 4); 

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            let store;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('date', 'date', { unique: false });
                console.log('Object store "entries" created.');
            } else {
                store = event.target.transaction.objectStore(STORE_NAME);
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

// --- Form Data & Elements ---
const dailyForm = document.getElementById('dailyForm');
const entryDateField = document.getElementById('entryDate');
const anzahlPanikattackenSelect = document.getElementById('anzahlPanikattacken');
const panikattackenBerichteContainer = document.getElementById('panikattackenBerichteContainer');

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
        schlafStart: dailyForm.schlafStart.value,
        schlafEnde: dailyForm.schlafEnde.value,
        schlafQualitaet: dailyForm.schlafQualitaet.value,
        schlafAufgewacht: dailyForm.schlafAufgewacht.value,
        situationenVermieden: dailyForm.situationenVermieden.value,
        vermiedenWelche: dailyForm.situationenVermieden.value === 'ja' ? dailyForm.vermiedenWelche.value : '',
        anzahlPanikattacken: dailyForm.anzahlPanikattacken.value,
        panikattackenDetails: [],
        submittedAt: new Date().toISOString()
    };

    const numPanicAttacks = parseInt(dailyForm.anzahlPanikattacken.value, 10);
    const effectiveNumPanicAttacks = numPanicAttacks >= 4 ? 4 : numPanicAttacks;

    if (effectiveNumPanicAttacks > 0) {
        for (let i = 1; i <= effectiveNumPanicAttacks; i++) {
            const detail = {
                beginn: document.getElementById(`panikBeginn_${i}`)?.value || '',
                ende: document.getElementById(`panikEnde_${i}`)?.value || '',
                intensitaet: document.getElementById(`panikIntensitaet_${i}`)?.value || '0',
                symptome: [],
                situation: document.getElementById(`panikSituation_${i}`)?.value || '',
                ausloeser: document.getElementById(`panikAusloeser_${i}`)?.value || ''
            };
            const symptomCheckboxes = document.querySelectorAll(`input[name="panikSymptome_${i}"]:checked`);
            symptomCheckboxes.forEach(cb => detail.symptome.push(cb.value));
            newEntry.panikattackenDetails.push(detail);
        }
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
        anzahlPanikattackenSelect.value = "0";
        panikattackenBerichteContainer.innerHTML = '';
        panikattackenBerichteContainer.style.display = 'none';

        document.querySelectorAll('.slider-container output').forEach(output => {
            const slider = document.getElementById(output.htmlFor);
            if (slider) {
                 if (['nervositaet', 'unruhe', 'traurigkeit', 'einsamkeit'].includes(slider.id) || slider.id.startsWith('panikIntensitaet_')) {
                    slider.value = slider.defaultValue || '0';
                    output.value = slider.defaultValue || '0';
                } else if (slider.id === 'schlafQualitaet') {
                    slider.value = '75';
                    output.value = '75';
                } else {
                    slider.value = slider.defaultValue || '50';
                    output.value = slider.defaultValue || '50';
                }
            }
        });
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
        entriesListDiv.innerHTML = ''; // Clear existing entries
        const entries = getAllRequest.result;

        if (entries.length === 0) {
            entriesListDiv.innerHTML = '<p class="text-gray-500">Noch keine Einträge vorhanden. Füllen Sie das Formular aus, um zu beginnen!</p>';
            return;
        }

        entries.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending

        entries.forEach(entry => {
            const entryCard = document.createElement('div');
            entryCard.className = 'entry-card';

            const entryDate = new Date(entry.date);
            const displayDate = entryDate.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
            const submissionTime = new Date(entry.submittedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

            // Create Summary Div (always visible and clickable)
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'entry-summary';
            summaryDiv.innerHTML = `
                <h3>${displayDate}</h3>
                <p class="submission-time">Eingereicht um ${submissionTime} Uhr</p>
                <span class="toggle-indicator">Details anzeigen</span>
            `;

            // Create Details Div (initially hidden)
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'entry-details';
            // Populate detailsDiv.innerHTML 
            let detailsHTML = `
                <p><strong>Stimmung:</strong> ${escapeHTML(entry.stimmung)}/100</p>
                <p><strong>Energieniveau:</strong> ${escapeHTML(entry.energieniveau)}/100</p>
                <p><strong>Körperl. Wohlbefinden:</strong> ${escapeHTML(entry.koerperlichesWohlbefinden)}/100</p>
                <p><strong>Nervosität:</strong> ${escapeHTML(entry.nervositaet)}/100</p>
                <p><strong>Unruhe:</strong> ${escapeHTML(entry.unruhe)}/100</p>
                <p><strong>Traurigkeit:</strong> ${escapeHTML(entry.traurigkeit)}/100</p>
                <p><strong>Einsamkeit:</strong> ${escapeHTML(entry.einsamkeit)}/100</p>
                <h4>Schlaf:</h4>
                <p><strong>Schlafen gegangen:</strong> ${escapeHTML(entry.schlafStart) || 'N/A'}</p>
                <p><strong>Aufgewacht:</strong> ${escapeHTML(entry.schlafEnde) || 'N/A'}</p>
                <p><strong>Schlafqualität:</strong> ${escapeHTML(entry.schlafQualitaet) || 'N/A'}/100</p>
                <p><strong>Wie oft aufgewacht:</strong> ${escapeHTML(entry.schlafAufgewacht) || 'N/A'}</p>
                <h4>Vermiedene Situationen:</h4>
                <p><strong>Vermieden:</strong> ${entry.situationenVermieden === 'ja' ? 'Ja' : 'Nein'}</p>
                ${entry.situationenVermieden === 'ja' ? `<p><strong>Welche:</strong> ${escapeHTML(entry.vermiedenWelche) || 'N/A'}</p>` : ''}
            `;

            let panikDetailsGesamtHTML = `<h4>Panikattacken:</h4>`;
            const anzahlPanik = parseInt(entry.anzahlPanikattacken, 10);
            if (anzahlPanik > 0 && entry.panikattackenDetails && entry.panikattackenDetails.length > 0) {
                panikDetailsGesamtHTML += `<p><strong>Anzahl berichtet:</strong> ${anzahlPanik === 4 ? '4 oder mehr' : anzahlPanik}</p>`;
                entry.panikattackenDetails.forEach((attack, index) => {
                    const symptomeLabels = attack.symptome && attack.symptome.length > 0
                        ? attack.symptome.map(symptomId => {
                            const symptomObj = PANIC_SYMPTOMS.find(s => s.id === symptomId);
                            return symptomObj ? escapeHTML(symptomObj.label) : escapeHTML(symptomId);
                        })
                        : [];
                    const symptomeList = symptomeLabels.length > 0
                        ? `<ul>${symptomeLabels.map(label => `<li>${label}</li>`).join('')}</ul>`
                        : '<p>Keine spezifischen Symptome angegeben.</p>';

                    panikDetailsGesamtHTML += `
                        <div class="panic-attack-report mt-2">
                            <h5>Panikanfall ${index + 1}:</h5>
                            <p><strong>Beginn:</strong> ${escapeHTML(attack.beginn) || 'N/A'}</p>
                            <p><strong>Ende:</strong> ${escapeHTML(attack.ende) || 'N/A'}</p>
                            <p><strong>Intensität:</strong> ${escapeHTML(attack.intensitaet) || '0'}/100</p>
                            <p><strong>Symptome:</strong></p>
                            ${symptomeList}
                            <p><strong>Situation:</strong> ${escapeHTML(attack.situation) || 'N/A'}</p>
                            <p><strong>Auslöser:</strong> ${escapeHTML(attack.ausloeser) || 'N/A'}</p>
                        </div>
                    `;
                });
            } else {
                panikDetailsGesamtHTML += `<p>Keine Panikattacken berichtet.</p>`;
            }
            detailsHTML += panikDetailsGesamtHTML;
            detailsDiv.innerHTML = detailsHTML;

            // Append summary and details to the card
            entryCard.appendChild(summaryDiv);
            entryCard.appendChild(detailsDiv);
            entriesListDiv.appendChild(entryCard);

            // Add click listener to toggle details
            summaryDiv.addEventListener('click', () => {
                const isHidden = detailsDiv.style.display === 'none';
                detailsDiv.style.display = isHidden ? 'block' : 'none';
                summaryDiv.querySelector('.toggle-indicator').textContent = isHidden ? 'Details verbergen' : 'Details anzeigen';
            });
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
                });
        });
    } else {
         console.warn('Service Worker werden von diesem Browser nicht unterstützt.');
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

    if (anzahlPanikattackenSelect && panikattackenBerichteContainer) {
        anzahlPanikattackenSelect.addEventListener('change', (event) => {
            let count = parseInt(event.target.value, 10);
            if (count >= 4) count = 4; 

            panikattackenBerichteContainer.innerHTML = ''; 
            if (count > 0) {
                panikattackenBerichteContainer.style.display = 'block';
                for (let i = 1; i <= count; i++) {
                    const reportDiv = document.createElement('div');
                    reportDiv.className = 'panic-attack-report space-y-4';

                    let symptomCheckboxesHTML = '<div class="symptom-grid">';
                    PANIC_SYMPTOMS.forEach(symptom => {
                        symptomCheckboxesHTML += `
                            <label class="inline-flex items-center">
                                <input type="checkbox" name="panikSymptome_${i}" value="${symptom.id}" class="form-checkbox text-blue-600 h-4 w-4 rounded">
                                <span class="ml-2 text-sm text-gray-700">${escapeHTML(symptom.label)}</span>
                            </label>
                        `;
                    });
                    symptomCheckboxesHTML += '</div>';

                    reportDiv.innerHTML = `
                        <h5 class="text-md font-semibold text-blue-600">Details zu Panikanfall ${i}</h5>
                        <div>
                            <label for="panikBeginn_${i}" class="block text-sm font-medium text-gray-700">a. Zu welcher Zeit fing er ungefähr an?</label>
                            <input type="time" id="panikBeginn_${i}" name="panikBeginn_${i}"
                                   class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        </div>
                        <div>
                            <label for="panikEnde_${i}" class="block text-sm font-medium text-gray-700">b. Wann hörte er ungefähr auf?</label>
                            <input type="time" id="panikEnde_${i}" name="panikEnde_${i}"
                                   class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        </div>
                        <div>
                            <label for="panikIntensitaet_${i}" class="block text-sm font-medium text-gray-700">c. Wie hoch würden Sie die Intensität des Panikanfalls einschätzen? (0-100)</label>
                            <div class="slider-container">
                                <input type="range" id="panikIntensitaet_${i}" name="panikIntensitaet_${i}" min="0" max="100" value="0" class="w-full">
                                 <output for="panikIntensitaet_${i}">0</output>
                            </div>
                        </div>
                         <div>
                            <label class="block text-sm font-medium text-gray-700">d. Bitte kreuzen Sie die Symptome an, die Sie während des Panikanfalls erlebt haben:</label>
                            ${symptomCheckboxesHTML}
                        </div>
                        <div>
                            <label for="panikSituation_${i}" class="block text-sm font-medium text-gray-700">e. Bitte beschreiben Sie die Situation, in der der Panikanfall auftrat, genauer:</label>
                            <textarea id="panikSituation_${i}" name="panikSituation_${i}" rows="3" placeholder="z.B. alleine oder mit anderen, privater oder öffentlicher Raum..."
                                      class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                        </div>
                        <div>
                            <label for="panikAusloeser_${i}" class="block text-sm font-medium text-gray-700">f. Was glauben Sie hat Ihren Panikanfall ausgelöst?</label>
                            <textarea id="panikAusloeser_${i}" name="panikAusloeser_${i}" rows="3" placeholder="Mögliche Auslöser..."
                                      class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                        </div>
                    `;
                    panikattackenBerichteContainer.appendChild(reportDiv);
                }
                setupSliderOutputs(); 
            } else {
                panikattackenBerichteContainer.style.display = 'none';
            }
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
                notificationStatusP.textContent = 'Status: Tägliche Erinnerungen sind aktiviert (12:00 & 20:00 Uhr).';
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
        default: 
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
            showMessage('Tägliche Erinnerungen (12 & 20 Uhr) werden wieder angezeigt.', 'success');
            checkAndTriggerScheduledNotifications(); 
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
        showMessage('Tägliche Erinnerungen (12 & 20 Uhr) erfolgreich aktiviert!', 'success');
        localStorage.setItem('notificationPermissionGranted', 'true'); 
        localStorage.removeItem('notificationsEffectivelyDisabled');
        checkAndTriggerScheduledNotifications(); 
    } else if (permission === 'denied') {
        showMessage('Erinnerungen wurden nicht aktiviert, da die Berechtigung verweigert wurde.', 'info');
        localStorage.setItem('notificationPermissionGranted', 'false');
    } else {
        showMessage('Entscheidung für Erinnerungen wurde nicht getroffen.', 'info');
    }
    updateNotificationStatusUI();
}

function sendNotificationToSW(title, body) {
    if (localStorage.getItem('notificationsEffectivelyDisabled') === 'true') {
        console.log('Notifications are effectively disabled by user. Skipping SW message.');
        return;
    }
    if (!navigator.serviceWorker.controller) {
        console.warn('Service Worker not active, cannot send message for notification.');
        return;
    }
    navigator.serviceWorker.controller.postMessage({
        action: 'showDailyNotification',
        title: title,
        body: body,
        icon: '/image/logo.png' 
    });
}

function checkAndTriggerScheduledNotifications() {
    if (Notification.permission !== 'granted' || localStorage.getItem('notificationsEffectivelyDisabled') === 'true') {
        console.log('Notification permission not granted or effectively disabled. Skipping scheduled check.');
        return;
    }
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const noonHour = 12;
    const eveningHour = 20;

    const lastNoonNotificationDate = localStorage.getItem('lastNoonNotificationShownDate');
    if (currentHour >= noonHour && lastNoonNotificationDate !== todayStr) {
        console.log('Triggering Noon notification for', todayStr);
        sendNotificationToSW('Tägliches Journal - Mittag', 'Zeit für deinen Mittags-Journaleintrag! ✏️');
        localStorage.setItem('lastNoonNotificationShownDate', todayStr);
    } else if (lastNoonNotificationDate === todayStr) {
        console.log('Noon notification already shown for', todayStr);
    }

    const lastEveningNotificationDate = localStorage.getItem('lastEveningNotificationShownDate');
    if (currentHour >= eveningHour && lastEveningNotificationDate !== todayStr) {
        console.log('Triggering Evening notification for', todayStr);
        sendNotificationToSW('Tägliches Journal - Abend', 'Zeit für deinen Abend-Journaleintrag! ✏️');
        localStorage.setItem('lastEveningNotificationShownDate', todayStr);
    } else if (lastEveningNotificationDate === todayStr) {
        console.log('Evening notification already shown for', todayStr);
    }
}

function initialNotificationCheck() {
    updateNotificationStatusUI(); 
    if (Notification.permission === 'granted') {
        checkAndTriggerScheduledNotifications(); 
        setInterval(checkAndTriggerScheduledNotifications, 15 * 60 * 1000); 
    }
}

// --- Event Listeners and Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired. Initializing application...');
    try {
        await initDB(); 
        setDefaultDate();
        displayEntries(); 
        registerServiceWorker();
        setCurrentYear();
        setupConditionalFields(); 
        setupSliderOutputs(); 
        initialNotificationCheck(); 

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
