let currentScenario = 1;

const scenarios = {
    1: {
        clientIssue: "La caldera fa olor quan arrenca i em preocupa.",
        techObs: "S'ha verificat la combustió i s'ha detectat un excés de CO ambiental puntual per tiratge obstruït.",
        techAction: "Neteja de la campana extractora de fums i ajust de la combustió. Comprovació de seguretats.",
        materials: "Kit de neteja, Sensor de fums",
        cost: "mitjana",
        explanation: "Per resoldre la incidència, s’ha realitzat una neteja de la campana extractora de fums utilitzant un kit específic de neteja, eliminant restes que dificultaven l’evacuació correcta dels gasos de combustió.\n\nDurant l’arrencada de la caldera, s’ha utilitzat un sensor de fums per comprovar els nivells de monòxid de carboni a l’ambient, confirmant que després de la intervenció els valors són correctes.\n\nFinalment, s’ha ajustat la combustió i revisat les seguretats per garantir un funcionament segur i sense olors."
    },
    2: {
        clientIssue: "La caldera s'atura sola i cal rearmar-la sovint.",
        techObs: "Problema de detecció de flama. L'elèctrode presenta desgast i falta de continuïtat.",
        techAction: "Substitució de l'elèctrode d'ionització. Comprovació de corrent de ionització.",
        materials: "Elèctrode d'ionització, Multímetre",
        cost: "mitjana",
        explanation: "La caldera s’aturava perquè no detectava correctament la presència de flama.\n\nS’ha substituït l’elèctrode d’ionització, que és el component encarregat de confirmar que la flama està encesa i permetre que la caldera continuï funcionant amb normalitat.\n\nA més, s’han realitzat comprovacions elèctriques amb un equip de mesura per assegurar que el sistema funciona correctament després de la substitució."
    },
    3: {
        clientIssue: "La caldera escalfa poc i noto que el consum de gas ha pujat molt.",
        techObs: "Mala combustió per acumulació de residus als cremadors i pèrdua d'estanquitat.",
        techAction: "Ajust de paràmetres de combustió. Substitució de juntes crítiques.",
        materials: "Analitzador de combustió, Juntes de cremadors",
        cost: "complexa",
        explanation: "S’ha detectat que la caldera no feia una combustió òptima, fet que provocava un rendiment baix i un consum més elevat.\n\nMitjançant un analitzador de combustió, s’han mesurat els valors dels gasos per ajustar correctament el funcionament de la caldera.\n\nTambé s’han substituït les juntes dels cremadors, assegurant un tancament correcte i una combustió més eficient i estable."
    }
};

function loadScenario(id) {
    currentScenario = id;
    const s = scenarios[id];

    // Update chips UI
    document.querySelectorAll('.chip').forEach((chip, index) => {
        chip.classList.toggle('active', (index + 1) === id);
    });

    // Populate fields
    document.getElementById('client-issue').value = s.clientIssue;
    document.getElementById('tech-obs').value = s.techObs;
    document.getElementById('tech-action').value = s.techAction;

    // Find materials input (it doesn't have an ID, let's fix that or use selector)
    const materialsInput = document.querySelector('input[value*="Kit"], input[value*="Elèctrode"], input[value*="Analitzador"]');
    if (materialsInput) materialsInput.value = s.materials;

    // Update cost
    const radio = document.querySelector(`input[name="cost-level"][value="${s.cost}"]`);
    if (radio) {
        radio.checked = true;
        updateCostDescription();
    }
}

function navigateTo(screenNumber) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });

    // Show target screen
    const targetId = typeof screenNumber === 'string' ? `screen-${screenNumber}` : `screen-${screenNumber}`;
    document.getElementById(targetId).classList.remove('hidden');

    // Update context for screen 3 if navigating from screen 2
    if (screenNumber === 3) {
        document.getElementById('context-client-issue').textContent = document.getElementById('client-issue').value;
    }

    // Prepare report for screen 5
    if (screenNumber === 5) {
        updateReport();
    }

    // Scroll to top
    window.scrollTo(0, 0);
}

function toggleAccordion(id) {
    const content = document.getElementById(id);
    const header = content.previousElementSibling;

    content.classList.toggle('active');
    header.classList.toggle('active');
}

function updateCostDescription() {
    const selectedLevel = document.querySelector('input[name="cost-level"]:checked').value;
    const costTextarea = document.getElementById('cost-expectation-text');

    const descriptions = {
        'lleu': "Aquest tipus d'actuació acostuma a tenir un cost baix, ja que es tracta d'una intervenció ràpida amb una necessitat mínima de materials. El preu final dependrà del temps invertit.",
        'mitjana': "Aquest tipus d'actuació acostuma a tenir un cost intermig dins del mercat, ja que requereix temps de revisió i ajustos tècnics. El preu final dependrà del temps invertit i dels materials utilitzats.",
        'complexa': "Aquest tipus d'actuació acostuma a tenir un cost més elevat de l'habitual, ja que requereix un treball tècnic prolongat o la substitució de components rellevants. El preu final dependrà del temps invertit i dels materials utilitzats."
    };

    costTextarea.value = descriptions[selectedLevel];
}

function processExplanation() {
    const s = scenarios[currentScenario];

    // Use the model explanation provided for the scenario
    document.getElementById('ai-explanation').value = s.explanation;
    navigateTo(4);
}

function updateReport() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    document.getElementById('report-date').textContent = dateStr;
    document.getElementById('report-company').textContent = document.getElementById('company-name').value;
    document.getElementById('report-tech').textContent = document.getElementById('tech-name').value;
    document.getElementById('report-reg').textContent = document.getElementById('reg-number').value;

    document.getElementById('report-client').textContent = document.getElementById('client-name').value;
    document.getElementById('report-address').textContent = document.getElementById('client-address').value;
    document.getElementById('report-issue').textContent = document.getElementById('client-issue').value;
    document.getElementById('report-action').textContent = document.getElementById('tech-action').value;

    let explanationText = document.getElementById('ai-explanation').value;
    if (document.getElementById('include-normative').checked) {
        explanationText += " (Actuació realitzada segons normativa vigent).";
    }
    document.getElementById('report-explanation').textContent = explanationText;

    document.getElementById('report-cost-expectation').textContent = document.getElementById('cost-expectation-text').value;
}

// Ensure first screen is visible on load
window.onload = () => {
    navigateTo(1);
};
