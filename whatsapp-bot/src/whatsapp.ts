process.on('SIGINT', async () => {
    console.log('[DEBUG] SIGINT received. Closing client...');
    if (client) {
        try {
            await client.destroy();
            console.log('[DEBUG] Client destroyed successfully.');
        } catch (e) {
            console.error('[ERROR] Error destroying client:', e);
        }
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('[DEBUG] SIGTERM received. Closing client...');
    if (client) {
        try {
            await client.destroy();
            console.log('[DEBUG] Client destroyed successfully.');
        } catch (e) {
            console.error('[ERROR] Error destroying client:', e);
        }
    }
    process.exit(0);
});
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
const qrcode = require('qrcode-terminal');
import { OpenAI } from 'openai';
import { detectBrand, BRAND_ROUTER } from './router';
import { listFolderFiles, getDocText, searchFiles, downloadFile } from './services/google';
import { readSentinelFile } from './services/local';
import { generateRITEReport, ReportData, validateReportData } from './pdf-generator';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { extractBrandAndModel, findManualFile, getManualText, validateErrorCode, validateBrandModelWithCatalog, getCanonicalBrand, getCanonicalModel, getSmartContext, getKeywordContext } from './manual-retriever';
import { FormFillerService, Elec1FormData, ContractFormData } from './services/form-filler';
import { dataExtractor } from './services/data-extractor';
import { classifierService } from './services/classifier';

import { dbService, UserSession } from './services/db';
// import { queueService } from './services/queue-service';
import { t } from './services/i18n';
// import './worker'; // Import worker to start it in the same process

const formFiller = new FormFillerService();
let readyTimestamp: number | null = null;

async function handleFormFlow(msg: any, state: UserSession, whatsappId: string, region: string = 'catalunya') {
    const text = msg.body.trim();
    const lang = state.language || 'ca';

    if (text.toLowerCase() === 'cancel·lar' || text.toLowerCase() === 'cancelar') {
        dbService.clearSession(whatsappId);
        await msg.reply(t(lang, 'cancel_success'));
        return;
    }

    switch (state.step) {
        case 0: // Waiting for Personal Data Block
            await msg.reply(t(lang, 'bloc1_prompt'));
            state.step = 1;
            dbService.saveSession(whatsappId, state);
            break;

        case 1: // Processing Personal Data Block
            try {
                const extracted = await dataExtractor.extractElec1Data(text, state.data);
                state.data = { ...state.data, ...extracted };

                // Minimal validation for block 1
                if (!state.data.titular?.nomCognoms || !state.data.adreca?.codiPostal) {
                    await msg.reply(t(lang, 'bloc1_missing'));
                    return;
                }

                await msg.reply(t(lang, 'bloc1_captured'));
                await msg.reply(t(lang, 'bloc2_1_prompt'));
                state.step = 2;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply(t(lang, 'bloc1_missing'));
            }
            break;

        case 2: // Processing Bloc 2.1 (Adreça Instal·lació)
            try {
                const extracted = await dataExtractor.extractElec1Data(text, state.data);
                state.data = { ...state.data, ...extracted };
                await msg.reply(t(lang, 'bloc2_1_captured'));
                await msg.reply(t(lang, 'bloc2_2_prompt'));
                state.step = 3;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply(t(lang, 'pdf_error'));
            }
            break;

        case 3: // Processing Bloc 2.2 (Característiques)
            try {
                const extracted = await dataExtractor.extractElec1Data(text, state.data);
                state.data = { ...state.data, ...extracted };
                await msg.reply(t(lang, 'bloc2_2_captured'));
                await msg.reply(t(lang, 'bloc2_3_prompt'));
                state.step = 4;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply(t(lang, 'pdf_error'));
            }
            break;

        case 4: // Processing Bloc 2.3 (Classificació)
            try {
                const extracted = await dataExtractor.extractElec1Data(text, state.data);
                state.data = { ...state.data, ...extracted };
                await msg.reply(t(lang, 'bloc2_3_captured'));
                await msg.reply(t(lang, 'bloc2_4_prompt'));
                state.step = 5;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply(t(lang, 'pdf_error'));
            }
            break;

        case 5: // Processing Bloc 2.4 (Dades Tècniques)
            try {
                const extracted = await dataExtractor.extractElec1Data(text, state.data);
                state.data = { ...state.data, ...extracted };

                if (!state.data.caracteristiques?.potenciaMax) {
                    await msg.reply('⚠️ Em falten dades tècniques importants (Potència Màxima). Me les pots completar?');
                    return;
                }

                await msg.reply(t(lang, 'bloc2_4_captured'));
                await msg.reply(t(lang, 'bloc3_prompt'));
                state.step = 6;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply(t(lang, 'pdf_error'));
            }
            break;

        case 6: // Processing Observations & Generating PDF
            try {
                if (text.toLowerCase() !== 'no') {
                    const extracted = await dataExtractor.extractElec1Data(text, state.data);
                    state.data = { ...state.data, ...extracted };
                }

                await msg.reply(t(lang, 'generating_pdf'));

                const formData: Elec1FormData = {
                    titular: {
                        nomCognoms: state.data.titular?.nomCognoms || '',
                        nif: state.data.titular?.nif || '',
                        tel: state.data.titular?.tel || '',
                        correu: state.data.titular?.correu || ''
                    },
                    adreca: {
                        tipusVia: state.data.adreca?.tipusVia || '',
                        nomVia: state.data.adreca?.nomVia || '',
                        numero: state.data.adreca?.numero || '',
                        bloc: state.data.adreca?.bloc || '',
                        escala: state.data.adreca?.escala || '',
                        codiPostal: state.data.adreca?.codiPostal || '',
                        poblacio: state.data.adreca?.poblacio || 'Sabadell',
                        pis: state.data.adreca?.pis || '',
                        porta: state.data.adreca?.porta || '',
                        tel: state.data.adreca?.tel || '',
                        correu: state.data.adreca?.correu || ''
                    },
                    installacio: {
                        tipusVia: state.data.installacio?.tipusVia || state.data.adreca?.tipusVia || '',
                        nomVia: state.data.installacio?.nomVia || state.data.adreca?.nomVia || '',
                        numero: state.data.installacio?.numero || state.data.adreca?.numero || '',
                        bloc: state.data.installacio?.bloc || state.data.adreca?.bloc || '',
                        escala: state.data.installacio?.escala || state.data.adreca?.escala || '',
                        pis: state.data.installacio?.pis || state.data.adreca?.pis || '',
                        porta: state.data.installacio?.porta || state.data.adreca?.porta || '',
                        codiPostal: state.data.installacio?.codiPostal || state.data.adreca?.codiPostal || '',
                        poblacio: state.data.installacio?.poblacio || state.data.adreca?.poblacio || 'Sabadell',
                        tel: state.data.installacio?.tel || state.data.adreca?.tel || '',
                        correu: state.data.installacio?.correu || state.data.adreca?.correu || ''
                    },
                    caracteristiques: {
                        potenciaMax: state.data.caracteristiques?.potenciaMax || '5.75',
                        tensio: state.data.caracteristiques?.tensio || '230',
                        circuits: state.data.caracteristiques?.circuits || '2',
                        iga: state.data.caracteristiques?.iga || '25A',
                        resistenciaAillament: state.data.caracteristiques?.resistenciaAillament || '100',
                        resistenciaTerra: state.data.caracteristiques?.resistenciaTerra || '15',
                        aillamentTerra: state.data.caracteristiques?.aillamentTerra || '100',
                        calibreCGP: state.data.caracteristiques?.calibreCGP || '',
                        igm: state.data.caracteristiques?.igm || '',
                        lga: state.data.caracteristiques?.lga || '',
                        observacions: state.data.caracteristiques?.observacions || '',
                        cups: state.data.caracteristiques?.cups || '',
                        tipusActuacio: state.data.caracteristiques?.tipusActuacio || 'Nova',
                        requisits: state.data.caracteristiques?.requisits || 'P1',
                        us: state.data.caracteristiques?.us || 'Habitatge',
                        materialConductor: state.data.caracteristiques?.materialConductor || 'Coure',
                        ubicacioComptadors: state.data.caracteristiques?.ubicacioComptadors || 'Sala',
                        tipusConnexio: state.data.caracteristiques?.tipusConnexio || 'Interconnectada',
                        subministramentComplementari: state.data.caracteristiques?.subministramentComplementari || 'No'
                    }
                };

                const pdfPath = await formFiller.fillELEC1PDF(formData, region);

                if (fs.existsSync(pdfPath)) {
                    const media = MessageMedia.fromFilePath(pdfPath);
                    await client.sendMessage(msg.from, media, { caption: "✅ Aquí tens el teu certificat ELEC1 generat." });
                }

                dbService.clearSession(whatsappId);
            } catch (e: any) {
                console.error(e);
                await msg.reply(`❌ Error generant el PDF: ${e.message}`);
                dbService.clearSession(whatsappId);
            }
            break;
    }
}

async function handleElec2FormFlow(msg: any, state: UserSession, whatsappId: string, region: string = 'catalunya') {
    const text = msg.body.trim();
    const lang = state.language || 'ca';

    if (text.toLowerCase() === 'cancel·lar' || text.toLowerCase() === 'cancelar') {
        dbService.clearSession(whatsappId);
        await msg.reply(t(lang, 'cancel_elec2'));
        return;
    }

    switch (state.step) {
        case 0:
            await msg.reply(t(lang, 'elec2_prompt_gen'));
            state.step = 1;
            dbService.saveSession(whatsappId, state);
            break;

        case 1:
            try {
                const extracted = await dataExtractor.extractElec2Data(text, state.data);
                state.data.general = { ...state.data.general, ...extracted.general };
                await msg.reply(t(lang, 'elec2_gen_captured'));
                await msg.reply(t(lang, 'elec2_prompt_owner'));
                state.step = 2;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply('❌ Error processant dades generals.');
            }
            break;

        case 2:
            try {
                const extracted = await dataExtractor.extractElec2Data(text, state.data);
                state.data.general = { ...state.data.general, ...extracted.general };
                state.data.circuits = [];
                await msg.reply(t(lang, 'elec2_owner_captured'));
                await msg.reply(t(lang, 'elec2_prompt_circuits'));
                state.step = 3;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply('❌ Error.');
            }
            break;

        case 3:
            try {
                const extracted = await dataExtractor.extractElec2Data(text, state.data);
                if (extracted.circuit) {
                    state.data.circuits.push(extracted.circuit);
                }

                const count = state.data.circuits.length;
                const nextLabel = String.fromCharCode(67 + count); // C is 67

                dbService.saveSession(whatsappId, state);
                await msg.reply(`${t(lang, 'elec2_circuit_saved')} (Circuits: ${count})`);
                await msg.reply(t(lang, 'elec2_prompt_next'));
            } catch (e) {
                await msg.reply('❌ Error en el circuit.');
            }
            break;
    }

    // Special check for finalization inside step 3
    if (text.toLowerCase() === 'finalitzar' || text.toLowerCase() === 'finalizar') {
        try {
            await msg.reply(t(lang, 'generating_elec2'));

            const pdfPath = await formFiller.fillElec2PDF(state.data);
            if (fs.existsSync(pdfPath)) {
                const media = MessageMedia.fromFilePath(pdfPath);
                await client.sendMessage(msg.from, media, { caption: "✅ Aquí tens el teu esquema unifilar ELEC2 generat." });
            }
            dbService.clearSession(whatsappId);
        } catch (err: any) {
            await msg.reply(`❌ Error: ${err.message}`);
            dbService.clearSession(whatsappId);
        }
    }
}
async function handleContractFormFlow(msg: any, state: UserSession, whatsappId: string, region: string = 'catalunya') {
    const text = msg.body.trim();
    const lang = state.language || 'ca';

    if (text.toLowerCase() === 'cancel·lar' || text.toLowerCase() === 'cancelar') {
        dbService.clearSession(whatsappId);
        await msg.reply(t(lang, 'cancel_contract'));
        return;
    }

    switch (state.step) {
        case 0:
            await msg.reply(t(lang, 'contract_prompt1'));
            state.step = 1;
            dbService.saveSession(whatsappId, state);
            break;

        case 1:
            try {
                const extracted = await dataExtractor.extractContractData(text, state.data);
                state.data = { ...state.data, ...extracted };

                if (!state.data.titular?.nom || !state.data.titular?.nif) {
                    await msg.reply('⚠️ Falten dades del Titular (Nom o NIF). Me les pots completar?');
                    return;
                }

                await msg.reply(t(lang, 'bloc1_captured'));
                await msg.reply(t(lang, 'contract_prompt2'));
                state.step = 2;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply('❌ Error processant dades.');
            }
            break;

        case 2:
            try {
                if (text.toLowerCase() !== 'no') {
                    const extracted = await dataExtractor.extractContractData(text, state.data);
                    state.data = { ...state.data, ...extracted };
                }

                await msg.reply(t(lang, 'contract_prompt3'));
                state.step = 3;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply('❌ Error.');
            }
            break;

        case 3:
            try {
                const extracted = await dataExtractor.extractContractData(text, state.data);
                state.data = { ...state.data, ...extracted };

                if (!state.data.installacio?.us && !state.data.installacio?.potenciaMax) {
                    await msg.reply('⚠️ Falten dades de la instal·lació (Ús o Potència). Me les pots completar?');
                    return;
                }

                await msg.reply(t(lang, 'contract_prompt4'));
                state.step = 4;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply('❌ Error.');
            }
            break;

        case 4:
            try {
                if (text.toLowerCase() !== 'no') {
                    const extracted = await dataExtractor.extractContractData(text, state.data);
                    state.data = { ...state.data, ...extracted };
                }

                // Default date logic
                const now = new Date();
                if (!state.data.data) state.data.data = {};
                state.data.data.dia = state.data.data.dia || String(now.getDate());
                state.data.data.mes = state.data.data.mes || now.toLocaleString('ca-ES', { month: 'long' });
                state.data.data.any = state.data.data.any || String(now.getFullYear()).substring(2);
                state.data.data.ciutat = state.data.data.ciutat || 'Sabadell';

                await msg.reply(t(lang, 'generating_contract'));

                const formData: ContractFormData = {
                    titular: {
                        nom: state.data.titular?.nom || '',
                        nif: state.data.titular?.nif || '',
                        correu: state.data.titular?.correu || '',
                        adreca: state.data.titular?.adreca || '',
                        poblacio: state.data.titular?.poblacio || '',
                        codiPostal: state.data.titular?.codiPostal || '',
                        tel: state.data.titular?.tel || '',
                    },
                    representant: {
                        nom: state.data.representant?.nom || '',
                        dni: state.data.representant?.dni || '',
                    },
                    installacio: {
                        adreca: state.data.installacio?.adreca || state.data.titular?.adreca || '',
                        poblacio: state.data.installacio?.poblacio || state.data.titular?.poblacio || '',
                        us: state.data.installacio?.us || '',
                        potenciaMax: state.data.installacio?.potenciaMax || '',
                        superficie: state.data.installacio?.superficie || '',
                        potenciaInstallada: state.data.installacio?.potenciaInstallada || '',
                        tensio: state.data.installacio?.tensio || '',
                        potenciaContractada: state.data.installacio?.potenciaContractada || '',
                        numExpedientBT: state.data.installacio?.numExpedientBT || '',
                        empresaComercialitzadora: state.data.installacio?.empresaComercialitzadora || '',
                        aportaDoc: state.data.installacio?.aportaDoc || 'Sí',
                        altresDades: state.data.installacio?.altresDades || '',
                    },
                    data: {
                        dia: state.data.data.dia,
                        mes: state.data.data.mes,
                        any: state.data.data.any,
                        ciutat: state.data.data.ciutat,
                    }
                };

                const pdfPath = await formFiller.fillContractPDF(formData, region);
                if (fs.existsSync(pdfPath)) {
                    const media = MessageMedia.fromFilePath(pdfPath);
                    await client.sendMessage(msg.from, media, { caption: "✅ Aquí tens el teu Contracte de Manteniment generat." });
                }
                dbService.clearSession(whatsappId);
            } catch (err: any) {
                await msg.reply(`❌ Error: ${err.message}`);
                dbService.clearSession(whatsappId);
            }
            break;
    }
}
async function handleDRFormFlow(msg: any, state: UserSession, whatsappId: string, region: string = 'catalunya') {
    const text = msg.body.trim();
    const lang = state.language || 'ca';

    if (text.toLowerCase() === 'cancel·lar' || text.toLowerCase() === 'cancelar') {
        dbService.clearSession(whatsappId);
        await msg.reply(t(lang, 'cancel_dr'));
        return;
    }

    switch (state.step) {
        case 0:
            await msg.reply(t(lang, 'dr_prompt1'));
            state.step = 1;
            dbService.saveSession(whatsappId, state);
            break;

        case 1:
            try {
                const extracted = await dataExtractor.extractDRData(text, state.data);
                state.data = { ...state.data, ...extracted };

                if (!state.data.titular?.nom || !state.data.adreca?.nomVia) {
                    await msg.reply('⚠️ Falten dades (Nom Titular o Carrer). Me les pots completar?');
                    return;
                }

                await msg.reply(t(lang, 'bloc1_captured'));
                await msg.reply(t(lang, 'dr_prompt2'));
                state.step = 2;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply('❌ Error processant dades.');
            }
            break;

        case 2:
            try {
                const extracted = await dataExtractor.extractDRData(text, state.data);
                state.data = { ...state.data, ...extracted };

                await msg.reply(t(lang, 'dr_prompt3'));
                state.step = 3;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply('❌ Error.');
            }
            break;

        case 3:
            try {
                const extracted = await dataExtractor.extractDRData(text, state.data);
                state.data = { ...state.data, ...extracted };

                await msg.reply(t(lang, 'generating_dr'));

                const pdfPath = await formFiller.fillDRPDF(state.data, region);
                if (fs.existsSync(pdfPath)) {
                    const media = MessageMedia.fromFilePath(pdfPath);
                    await client.sendMessage(msg.from, media, { caption: "✅ Aquí tens la teva Declaració Responsable generada." });
                }
                dbService.clearSession(whatsappId);
            } catch (err: any) {
                await msg.reply(`❌ Error: ${err.message}`);
                dbService.clearSession(whatsappId);
            }
            break;
    }
}

async function handleElec3FormFlow(msg: any, state: UserSession, whatsappId: string, region: string = 'catalunya') {
    const text = msg.body.trim();
    const lang = state.language || 'ca';

    if (text.toLowerCase() === 'cancel·lar' || text.toLowerCase() === 'cancelar') {
        dbService.clearSession(whatsappId);
        await msg.reply(t(lang, 'cancel_elec3'));
        return;
    }

    switch (state.step) {
        case 0:
            await msg.reply(t(lang, 'elec3_prompt_gen'));
            state.step = 1;
            dbService.saveSession(whatsappId, state);
            break;

        case 1:
            try {
                const extracted = await dataExtractor.extractElec3Data(text, state.data);
                state.data = { ...state.data, ...extracted };

                if (!state.data.general?.titular || !state.data.general?.us) {
                    await msg.reply('⚠️ Falten dades generals (Titular o Ús). Me les pots completar?');
                    return;
                }

                await msg.reply(t(lang, 'elec3_gen_captured'));
                await msg.reply(t(lang, 'elec3_prompt_escomesa'));
                state.step = 2;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply('❌ Error processant dades.');
            }
            break;

        case 2:
            try {
                const extracted = await dataExtractor.extractElec3Data(text, state.data);
                state.data = { ...state.data, ...extracted };

                await msg.reply(t(lang, 'elec3_escomesa_captured'));
                await msg.reply(t(lang, 'elec3_prompt_circuits'));
                state.step = 3;
                if (!state.data.circuits) state.data.circuits = [];
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply('❌ Error.');
            }
            break;

        case 3:
            if (text.toLowerCase() === 'fi' || text.toLowerCase() === 'fin') {
                try {
                    await msg.reply(t(lang, 'generating_elec3'));

                    // Formatejar la data actual automàticament
                    if (!state.data.general) state.data.general = {};
                    const now = new Date();
                    state.data.general.data = `${now.getDate()} de ${now.toLocaleString('ca-ES', { month: 'long' })} de ${now.getFullYear()}`;

                    const docxPath = await formFiller.fillElec3Docx(state.data as any, region);
                    if (fs.existsSync(docxPath)) {
                        const media = MessageMedia.fromFilePath(docxPath);
                        await client.sendMessage(msg.from, media, { caption: "✅ Aquí tens la teva Memòria Tècnica ELEC-3 generada." });
                    }
                    dbService.clearSession(whatsappId);
                } catch (err: any) {
                    await msg.reply(`❌ Error: ${err.message}`);
                    dbService.clearSession(whatsappId);
                }
            } else {
                try {
                    const extracted = await dataExtractor.extractElec3Data(text, state.data);
                    let recognized = false;

                    if (extracted.circuit && Object.keys(extracted.circuit).length > 0) {
                        state.data.circuits.push(extracted.circuit);
                        await msg.reply('✅ Circuit desat.');
                        recognized = true;
                    }
                    if (extracted.diferencial && Object.keys(extracted.diferencial).length > 0) {
                        if (!state.data.diferencials) state.data.diferencials = [];
                        state.data.diferencials.push(extracted.diferencial);
                        await msg.reply('✅ Diferencial desat.');
                        recognized = true;
                    }

                    if (recognized) {
                        await msg.reply(t(lang, 'elec3_prompt_next'));
                        dbService.saveSession(whatsappId, state);
                    } else {
                        await msg.reply('⚠️ No he entès bé les dades. Torna-ho a intentar o escriu FI per acabar.');
                    }
                } catch (e) {
                    await msg.reply('❌ Error processant les dades.');
                }
            }
            break;
    }
}

async function handleDictamenFormFlow(msg: any, state: UserSession, whatsappId: string, region: string = 'catalunya') {
    const text = msg.body.trim();
    const lang = state.language || 'ca';

    if (text.toLowerCase() === 'cancel·lar' || text.toLowerCase() === 'cancelar') {
        dbService.clearSession(whatsappId);
        await msg.reply(t(lang, 'cancel_dictamen'));
        return;
    }

    switch (state.step) {
        case 0:
            await msg.reply(t(lang, 'dictamen_prompt1'));
            state.step = 1;
            dbService.saveSession(whatsappId, state);
            break;

        case 1:
            try {
                const extracted = await dataExtractor.extractDictamenData(text, state.data);
                state.data = { ...state.data, ...extracted };

                if (!state.data.general?.titular || !state.data.general?.emplaçament) {
                    await msg.reply('⚠️ Falten dades generals (Titular o Adreça). Me les pots completar?');
                    return;
                }

                await msg.reply(t(lang, 'dictamen_prompt1_captured'));
                await msg.reply(t(lang, 'dictamen_prompt2'));
                state.step = 2;
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply('❌ Error processant dades.');
            }
            break;

        case 2:
            try {
                const extracted = await dataExtractor.extractDictamenData(text, state.data);
                state.data = { ...state.data, ...extracted };

                await msg.reply(t(lang, 'dictamen_prompt2_captured'));
                await msg.reply(t(lang, 'dictamen_prompt3'));
                state.step = 3;
                if (!state.data.anomalies) state.data.anomalies = [];
                dbService.saveSession(whatsappId, state);
            } catch (e) {
                await msg.reply('❌ Error.');
            }
            break;

        case 3:
            try {
                // Si l'usuari diu "tot bé" o la IA no veu anomalies, simplement la funció extractora retornarà un array buit
                // Si l'usuari posa anomalies de debò, s'extrauran.
                const extracted = await dataExtractor.extractDictamenData(text, state.data);
                
                if (extracted.anomalies && extracted.anomalies.length > 0) {
                    if (!state.data.anomalies) state.data.anomalies = [];
                    // Fusionem les anomalies d'aquesta petició o les substituïm directament
                    state.data.anomalies = [...state.data.anomalies, ...extracted.anomalies];
                }

                await msg.reply(t(lang, 'generating_dictamen'));

                // Formatejar la data actual automàticament (Data Revisió si no està escrita i també Data de firma per defecte)
                if (!state.data.general) state.data.general = {};
                const now = new Date();
                const todayStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
                if (!state.data.general.dataRevisio) state.data.general.dataRevisio = todayStr;

                const docxPath = await formFiller.fillDictamenDocx(state.data as any, region);
                if (fs.existsSync(docxPath)) {
                    const media = MessageMedia.fromFilePath(docxPath);
                    await client.sendMessage(msg.from, media, { caption: "✅ Aquí tens el teu Dictamen de Reconeixement amb els camps avaluats." });
                }
                dbService.clearSession(whatsappId);
            } catch (err: any) {
                await msg.reply(`❌ Error: ${err.message}`);
                dbService.clearSession(whatsappId);
            }
            break;
    }
}


const BRAND_HEADER = `🛡️ SENTINEL COVER | Assistent Tècnic
Un servei de Effiguard Tech SL
━━━━━━━━━━━━━━━━━━`;

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // Tornem a headless: true
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
        ],
    },
    /*
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
    */
    authTimeoutMs: 120000,
    qrMaxRetries: 10,
    restartOnAuthFail: true,
});

client.on('qr', (qr) => {
    console.log('--- NEW QR CODE GENERATED ---');
    console.log('If the terminal QR is unreadable, open this link:');
    console.log(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}`);
    qrcode.generate(qr, { small: true });
    console.log('Please scan the QR code above with your WhatsApp.');
});

client.on('authenticated', () => {
    console.log('WhatsApp authenticated successfully!');
});

client.on('auth_failure', (msg) => {
    console.error('WhatsApp authentication failure:', msg);
});

client.on('ready', () => {
    readyTimestamp = Math.floor(Date.now() / 1000);
    console.log(`--- WHATSAPP BOT IS READY AND LISTENING (Timestamp: ${readyTimestamp}) ---`);
});

client.on('message', async (msg) => {
    // Ignore messages older than the bot's startup time
    if (!readyTimestamp || msg.timestamp < readyTimestamp) {
        console.log(`[IGNORE] Missatge antic de ${msg.from} precedit a l'arrencada (${msg.timestamp} < ${readyTimestamp})`);
        return;
    }

    const contact = await msg.getContact();
    const number = contact.number; // e.g., "34600000000"
    const from = msg.from;

    // 1. Whitelist Check (SQLite)
    const subscriber = dbService.getSubscriber(number);
    if (!subscriber || subscriber.is_active === 0) {
        console.log(`[AUTH] Accés denegat per al número: ${number}`);
        return;
    }

    const userRegion = subscriber.region || 'catalunya';
    const userLanguage = subscriber.language || 'ca';

    // 2. Log Incoming Message
    dbService.logMessage(number, msg.body, 'user');

    console.log(`[MSG] De: ${number} | Regió: ${userRegion} | Body: "${msg.body}" | Type: ${msg.type}`);

    // Command to change region
    if (msg.body.toLowerCase().startsWith('!regio ') || msg.body.toLowerCase().startsWith('!region ')) {
        const newRegion = msg.body.split(' ')[1]?.toLowerCase();
        const validRegions = ['catalunya', 'arago', 'valencia', 'madrid'];
        if (validRegions.includes(newRegion)) {
            const newLang = (newRegion === 'arago' || newRegion === 'valencia' || newRegion === 'madrid') ? 'es' : 'ca';
            dbService.updateSubscriberRegion(number, newRegion);
            dbService.updateSubscriberLanguage(number, newLang);
            await msg.reply(`${t(newLang, 'region_updated')}*${newRegion}* (Idioma: ${newLang === 'es' ? 'Español' : 'Català'})`);
            return;
        } else {
            await msg.reply(`${t(userLanguage, 'invalid_region')}${validRegions.join(', ')}`);
            return;
        }
    }

    let userText = "";
    let isAudio = false;

    if (msg.hasMedia && (msg.type === 'audio' || msg.type === 'ptt')) {
        isAudio = true;
    } else {
        userText = msg.body;
    }

    // Trigger Welcome Message on "hola"
    const isGreeting = userText.toLowerCase().trim() === 'hola';
    if (isGreeting) {
        const profilePath = path.join(process.cwd(), 'installer_profile_example.json');
        let profileRegion = userRegion; // Fallback

        if (fs.existsSync(profilePath)) {
            const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
            const city = profile.adreca?.poblacio?.toLowerCase() || '';
            // Simple mapping for demo
            if (city.includes('sabadell') || city.includes('barcelona') || city.includes('terrassa')) profileRegion = 'catalunya';
            if (city.includes('madrid')) profileRegion = 'madrid';
            if (city.includes('valencia')) profileRegion = 'valencia';
            if (city.includes('zaragoza')) profileRegion = 'arago';
        }

        const welcomeKey = `welcome_${profileRegion}`;
        const welcome = t(userLanguage, welcomeKey);
        await msg.reply(welcome);
        dbService.logMessage(number, welcome, 'bot');
        return;
    }

    if (isAudio) {
        try {
            console.log('Received audio message...');
            const media = await msg.downloadMedia();
            const buffer = Buffer.from(media.data, 'base64');
            const tempPath = path.join(process.cwd(), `temp_${Date.now()}.ogg`);
            fs.writeFileSync(tempPath, buffer);

            // 1. Whisper Transcription
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempPath),
                model: 'whisper-1',
                language: 'ca', // Millora resultats per a usuaris catalans
                prompt: "Viessmann, Vitodens, Vaillant, Baxi, Roca, Ferroli, Saunier Duval, Junkers, Immergas, calderes, errors tècnics."
            });

            userText = transcription.text;
            console.log('Transcription:', userText);

            // Delete temp file after transcription
            fs.unlinkSync(tempPath);
        } catch (error: any) {
            console.error('Error processing audio:', error);
            await msg.reply(`Error transcrinvint àudio: ${error.message}`);
            return;
        }
    }

    if (!userText) return;

    // --- FORM FILLING LOGIC START ---
    const state = dbService.getSession(number);
    if (state) {
        if (state.mode === 'form_elec1') {
            await handleFormFlow(msg, state, number, userRegion);
            return;
        }
        if (state.mode === 'form_dr') {
            await handleDRFormFlow(msg, state, number, userRegion);
            return;
        }
        if (state.mode === 'form_contract') {
            await handleContractFormFlow(msg, state, number, userRegion);
            return;
        }
        if (state.mode === 'form_elec2') {
            await handleElec2FormFlow(msg, state, number, userRegion);
            return;
        }
        if (state.mode === 'form_elec3') {
            await handleElec3FormFlow(msg, state, number, userRegion);
            return;
        }
        if (state.mode === 'form_dictamen') {
            await handleDictamenFormFlow(msg, state, number, userRegion);
            return;
        }
    }

    // New intent classification
    const classification = await classifierService.classifyIntent(userText);
    console.log(`[DEBUG] Classification: intent=${classification.intent}, formId=${classification.formId}`);

    // Phase 2 Block: Check if gas (technical_query) is enabled
    const gasEnabled = process.env.GAS_ENABLED === 'true';
    if (classification.intent === 'technical_query' && !gasEnabled) {
        const lang = (dbService.getSession(number)?.language) || (dbService.getSubscriber(number)?.language) || 'ca';
        await msg.reply(t(lang, 'gas_coming_soon'));
        return;
    }

    if (classification.intent === 'form_filling') {
        if (classification.formId === 'elec1') {
            const newState: UserSession = { mode: 'form_elec1', step: 0, data: {}, region: userRegion };
            dbService.saveSession(number, newState);
            await handleFormFlow(msg, newState, number, userRegion);
            return;
        }
        if (classification.formId === 'dr_installacio') {
            const newState: UserSession = { mode: 'form_dr', step: 0, data: {}, region: userRegion };
            dbService.saveSession(number, newState);
            await handleDRFormFlow(msg, newState, number, userRegion);
            return;
        }
        if (classification.formId === 'contracte_bt') {
            const newState: UserSession = { mode: 'form_contract', step: 0, data: {}, region: userRegion };
            dbService.saveSession(number, newState);
            await handleContractFormFlow(msg, newState, number, userRegion);
            return;
        }
        if (classification.formId === 'elec2_unifilar') {
            const newState: UserSession = { mode: 'form_elec2', step: 0, data: {}, region: userRegion };
            dbService.saveSession(number, newState);
            await handleElec2FormFlow(msg, newState, number, userRegion);
            return;
        }
        if (classification.formId === 'elec3_memoria') {
            const newState: UserSession = { mode: 'form_elec3', step: 0, data: {}, region: userRegion };
            dbService.saveSession(number, newState);
            await handleElec3FormFlow(msg, newState, number, userRegion);
            return;
        }
        if (classification.formId === 'dictamen_reconeixement') {
            const newState: UserSession = { mode: 'form_dictamen', step: 0, data: {}, region: userRegion };
            dbService.saveSession(number, newState);
            await handleDictamenFormFlow(msg, newState, number, userRegion);
            return;
        }
    }

    if (classification.intent === 'general_chat') {
        const profilePath = path.join(process.cwd(), 'installer_profile_example.json');
        let profileRegion = userRegion;

        if (fs.existsSync(profilePath)) {
            const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
            const city = profile.adreca?.poblacio?.toLowerCase() || '';
            if (city.includes('sabadell') || city.includes('barcelona') || city.includes('terrassa')) profileRegion = 'catalunya';
            if (city.includes('madrid')) profileRegion = 'madrid';
            if (city.includes('valencia')) profileRegion = 'valencia';
            if (city.includes('zaragoza')) profileRegion = 'arago';
        }

        const welcomeKey = `welcome_${profileRegion}`;
        const welcome = t(userLanguage, welcomeKey);
        await msg.reply(welcome);
        dbService.logMessage(number, welcome, 'bot');
        return;
    }
    // --- FORM FILLING LOGIC END ---

    try {
        // 2. Extract Brand/Model and find Manual
        const modelMatch = await extractBrandAndModel(userText, openai);
        let manualContent = "";
        let manualFound = false;

        if (modelMatch.model) {
            // Determine the brand: Prioritize local phonetic detection
            const localBrand = detectBrand(userText);
            const userBrandRaw = (localBrand !== 'normativa') ? localBrand : (modelMatch.brand || 'normativa');
            const canonicalUserBrand = getCanonicalBrand(userBrandRaw);

            // Validation checks removed - go directly to NotebookLM when brand is detected
            console.log(`[DEBUG] userText: "${userText}"`);
            console.log(`[DEBUG] localBrand: "${localBrand}", modelMatch.brand: "${modelMatch.brand}"`);
            console.log(`[DEBUG] userBrandRaw: "${userBrandRaw}", Canonical: "${canonicalUserBrand}"`);
            console.log(`[DEBUG] Model: "${modelMatch.model}"`);


            const { filePath, actualBrandDir } = findManualFile(userBrandRaw, modelMatch.model);
            const canonicalActualBrand = getCanonicalBrand(actualBrandDir);

            console.log(`[DEBUG] actualBrandDir: "${actualBrandDir}", CanonicalActual: "${canonicalActualBrand}"`);
            console.log(`[DEBUG] filePath: "${filePath}"`);

            // Coherence check removed - trust brand detection

            const finalCanonicalModel = getCanonicalModel(canonicalUserBrand, modelMatch.model) || modelMatch.model;

            let finalFilePath = filePath;

            // Fallback: Search on Google Drive if not found locally
            if (!finalFilePath && modelMatch.model) { // Removed brand.notebookId !== 'N/A' check here, as it's done later for technical summaries
                const detectedBrandKey = detectBrand(userText);
                const extractedBrandCanonical = modelMatch.brand ? getCanonicalBrand(modelMatch.brand).toLowerCase() : 'normativa';
                const finalBrandKey = detectedBrandKey !== 'normativa' ? detectedBrandKey : (extractedBrandCanonical !== 'desconeguda' ? extractedBrandCanonical : 'normativa');
                const canonicalKey = finalBrandKey === 'normativa' ? 'normativa' : getCanonicalBrand(finalBrandKey).toLowerCase();
                const brand = BRAND_ROUTER[canonicalKey] || BRAND_ROUTER[finalBrandKey] || { name: modelMatch.brand || 'Desconeguda', notebookId: 'N/A' };

                if (brand.notebookId !== 'N/A') {
                    try {
                        console.log(`Searching for manual on Drive for ${brand.name} ${modelMatch.model}...`);
                        const driveFiles = await searchFiles(brand.notebookId, modelMatch.model);
                        const pdfFile = driveFiles?.find((f: any) => f.mimeType === 'application/pdf');

                        if (pdfFile) {
                            console.log(`✅ Found manual on Drive: ${pdfFile.name} (${pdfFile.id})`);
                            const tmpPath = path.join(process.cwd(), `temp_drive_${pdfFile.id}.pdf`);
                            await downloadFile(pdfFile.id, tmpPath);
                            finalFilePath = tmpPath;
                        }
                    } catch (driveErr) {
                        console.error('Error searching/downloading from Drive:', driveErr);
                    }
                }
            }

            if (finalFilePath) {
                try {
                    const fullManualText = await getManualText(finalFilePath);
                    manualContent = getSmartContext(fullManualText, modelMatch.errorCode);
                    manualFound = true;
                    modelMatch.model = finalCanonicalModel; // Update for AI
                    console.log(`Manual content extracted (${manualContent.length} chars).`);

                    // Cleanup if it was a temp file from Drive
                    if (finalFilePath.includes('temp_drive_')) {
                        fs.unlinkSync(finalFilePath);
                    }

                    // ERROR CODE CHECK
                    if (modelMatch.errorCode) {
                        const errorExists = validateErrorCode(fullManualText, modelMatch.errorCode);
                        if (!errorExists) {
                            await msg.reply(`He verificat el manual de ${modelMatch.model} i el codi ${modelMatch.errorCode} no consta en la llista oficial d'errors. Podries confirmar el codi o descriure el símptoma?`);
                            return;
                        }
                    }
                } catch (err) {
                    console.error('Error reading manual:', err);
                }
            }
        }

        const isNormativeQuery = userText.toLowerCase().includes('rite') ||
            userText.toLowerCase().includes('legal') ||
            userText.toLowerCase().includes('normativa') ||
            userText.toLowerCase().includes('procediment') ||
            userText.toLowerCase().includes('distància') ||
            userText.toLowerCase().includes('distancia') ||
            userText.toLowerCase().includes('fums') ||
            userText.toLowerCase().includes('xemeneia') ||
            userText.toLowerCase().includes('tub') ||
            userText.toLowerCase().includes('façana') ||
            userText.toLowerCase().includes('instal·lació') ||
            userText.toLowerCase().includes('pendiente') ||
            userText.toLowerCase().includes('pendent');

        // IMPORTANT: Use canonical brand key for routing
        const detectedBrandKey = detectBrand(userText);
        // Canonicalize the brand extracted by OpenAI if local detection fails
        const extractedBrandCanonical = modelMatch.brand ? getCanonicalBrand(modelMatch.brand).toLowerCase() : 'normativa';

        // Determine the primary brand for manual lookup and brand-specific summaries
        const finalBrandKey = (detectedBrandKey !== 'normativa' ? detectedBrandKey : (extractedBrandCanonical !== 'desconeguda' ? extractedBrandCanonical : 'normativa'));
        const canonicalKey = finalBrandKey === 'normativa' ? 'normativa' : getCanonicalBrand(finalBrandKey).toLowerCase();

        const brand = BRAND_ROUTER[canonicalKey] || { name: modelMatch.brand || 'Desconeguda', notebookId: 'N/A' };

        console.log(`[DEBUG] Final Routing: key="${canonicalKey}", brandName="${brand.name}"`);

        // 3. Technical Summaries (NotebookLM / Drive Folders)
        let technicalSummaries = "";

        // Determine folders to search: Always include brand folder + normativa folder if relevant
        const foldersToSearch = [];
        if (brand.notebookId !== 'N/A' && canonicalKey !== 'normativa') {
            foldersToSearch.push({ id: brand.notebookId, name: brand.name, type: 'brand' });
        }
        if (isNormativeQuery || canonicalKey === 'normativa') {
            const normativaConfig = BRAND_ROUTER['normativa'];
            foldersToSearch.push({ id: normativaConfig.notebookId, name: normativaConfig.name, type: 'normativa' });
        }

        // --- MCP INTEGRATION START ---
        // 3. Technical Summaries (via MCP / NotebookLM)
        let mcpResponse = "";
        const { mcpService } = require('./services/mcp-client');

        // Determine if we should use MCP
        const useMcp = brand.notebookId !== 'N/A' && canonicalKey !== 'normativa';

        if (useMcp) {
            try {
                // await msg.reply("🔍 Consultant la documentació tècnica oficial..."); // Feedback
                console.log(`[MCP] Querying NotebookLM for ${brand.name}...`);

                const queryForNotebook = modelMatch.model
                    ? `Busca informació sobre el model ${modelMatch.model}. ${userText}`
                    : userText;

                const rawResp = await mcpService.queryNotebook(brand.notebookId, queryForNotebook);

                if (rawResp && !rawResp.startsWith("Error")) {
                    mcpResponse = rawResp;
                    technicalSummaries += `--- RESPOSTA OFICIAL DE LA MARCA (${brand.name}) ---\n${mcpResponse}\n\n`;
                    console.log(`[MCP] Got response (${mcpResponse.length} chars)`);
                } else {
                    console.warn(`[MCP] Query failed for ${brand.name}: ${rawResp}`);
                }

            } catch (e) {
                console.error("Error asking MCP:", e);
                // technicalSummaries += "Error consultant NotebookLM. Es procedirà amb coneixement general.\n";
            }
        }

        // Fallback or Augmentation: Normativa
        if (isNormativeQuery) {
            if (!useMcp) {
                const normativaConfig = BRAND_ROUTER['normativa'];
                if (normativaConfig && normativaConfig.notebookId) {
                    try {
                        if (!mcpResponse) {
                            // await msg.reply("🔍 Consultant la normativa RITE...");
                        }
                        console.log(`[MCP] Querying Normativa...`);
                        const rawResp = await mcpService.queryNotebook(normativaConfig.notebookId, userText);

                        if (rawResp && !rawResp.startsWith("Error")) {
                            technicalSummaries += `--- NORMATIVA RITE ---\n${rawResp}\n\n`;
                            mcpResponse = rawResp;
                        } else {
                            console.warn(`[MCP] Normative query failed: ${rawResp}`);
                        }
                    } catch (e) {
                        console.error("Error MCP Normativa:", e);
                    }
                }
            }
        }
        // --- DIRECT NOTEBOOKLM RESPONSE ---
        // Improvement: If we got a valid response from MCP (Brand or Normativa), send it directly.
        // This avoids OpenAI reprocessing, saves tokens, and reduces latency.
        if (mcpResponse && mcpResponse.length > 50 && !mcpResponse.includes("Error consultant")) {
            console.log("[MCP] Direct Mode: Sending response directly to user.");
            await msg.reply(technicalSummaries);
            return;
        }

        // --- MCP INTEGRATION END ---

        // Legacy Loop (Optional - kept for safety or removed if fully replaced)
        // For now, let's skip the legacy loop if MCP worked, or run it as backup?
        // The user wants to REPLACE the old logic essentially. 
        // Let's just comment out or bypass the old loop if mcpResponse is good.

        if (!mcpResponse) {
            // ... Only run legacy loop if MCP failed ...
            for (const folder of foldersToSearch) {
                try {
                    console.log(`Fetching summaries from folder: ${folder.name} (${folder.id})`);
                    const files = await listFolderFiles(folder.id);

                    // Filter logic
                    const relevantFiles = files?.filter((f: any) => {
                        const isDoc = f.mimeType === 'application/vnd.google-apps.document';
                        const isPdf = f.mimeType === 'application/pdf';
                        const fileNameUpper = f.name.toUpperCase();

                        if (folder.type === 'normativa') {
                            // In normative folder, we take everything relevant (usually PDFs)
                            return isDoc || isPdf;
                        } else {
                            // In brand folders, we take Docs or PDFs
                            return isDoc || isPdf;
                        }
                    }) || [];

                    // --- NEW GLOBAL RETRIEVER LOGIC ---
                    if (folder.type === 'normativa') {
                        const { globalNormativeSearch } = require('./global-retriever');
                        const globalContext = await globalNormativeSearch(userText, folder.id);
                        technicalSummaries = globalContext + "\n\n" + technicalSummaries;
                        continue; // Skip the old file-by-file loop for Normativa
                    }

                    for (const file of relevantFiles) {
                        if (file.mimeType === 'application/vnd.google-apps.document') {
                            const text = await getDocText(file.id);
                            technicalSummaries += `--- RESUM TÈCNIC (${folder.name}): ${file.name} ---\n${text}\n\n`;
                        } else if (file.mimeType === 'application/pdf') {
                            // Brand PDF summaries (file-by-file is fine for these, usually small)
                            console.log(`Extracting text from Brand PDF summary: ${file.name}`);
                            const tmpPath = path.join(process.cwd(), `temp_sum_${file.id}.pdf`);
                            await downloadFile(file.id, tmpPath);
                            const text = await getManualText(tmpPath);

                            // Simple 2-chunk context for brand PDFs
                            let processedText = getKeywordContext(text, userText, 2);
                            technicalSummaries += `--- RESUM TÈCNIC (${file.name}) ---\n${processedText}\n\n`;
                            fs.unlinkSync(tmpPath);
                        }
                    }
                } catch (e) {
                    console.error(`Error fetching summaries from ${folder.name}:`, e);
                }
            }
        }

        // Final safety truncation for technicalSummaries (~20k tokens max)
        technicalSummaries = technicalSummaries.substring(0, 80000);

        // 4. Query Context

        const legalContext = `
            - El RITE (Reglament d'Instal·lacions Tècniques als Edificis) regula les condicions de seguretat, eficiència i manteniment.
            - Les intervencions han de ser realitzades per personal qualificat i documentades en un informe RITE.
        `;

        const systemPrompt = `
            Ets l'enginyer tècnic d'Effiguard Tech SL a càrrec de SENTINEL PRO.
            El teu objectiu és donar DADES TÈCNIQUES EXACTES i LEGALS.

            ORDRE DE PRIORITAT D'INFORMACIÓ (CRÍTICA):

            1. **PRIORITAT ABSOLUTA - RESUMS TÈCNICS (NotebookLM/Marca)**: 
               - Si reps informació a la secció "FONT 1: RESUMS TÈCNICS", aquesta és la font OFICIAL i MÉS FIABLE.
               - SEMPRE utilitza aquesta informació PRIMER i COMPLETAMENT.
               - Si la resposta està aquí, NO diguis mai que "no disposes de la informació" o que "cal consultar el manual".
               - Aquesta informació prové directament de la documentació oficial de la marca.

            2. **PRIORITAT #2 - DOCUMENTS NORMATIUS (RITE/UNE)**:
               - Per a preguntes d'instal·lació general, utilitza la informació normativa.

            3. **PRIORITAT #3 - MANUAL OFICIAL (PDF)**:
               - Només si no hi ha informació a les fonts anteriors.

            REGLES CRÍTIQUES:
            1. **USA LA INFORMACIÓ PROPORCIONADA**: Si reps dades als "RESUMS TÈCNICS", utilitza-les DIRECTAMENT. No diguis que no tens la informació.
            2. **SIGUES ESPECÍFIC**: Proporciona dades tècniques exactes (distàncies, codis d'error, procediments).
            3. **CITA LA FONT**: Digues d'on ve la informació ("Segons la documentació oficial de [marca]...").
            4. **NO INVENTIS**: Només si REALMENT no tens cap dada, digues que no la trobes.
            5. **EVITA RESPOSTES GENÈRIQUES**: Si tens informació específica, NO donis respostes vagues com "consulta el manual".

            Idioma: CATALÀ TÈCNIC.
            Estil: Professional, sec, basat en dades.
            Context Legal/Normatiu (Introducció):
            ${legalContext}
        `;

        console.log(`[DEBUG] Technical Summaries being sent to OpenAI (first 1000 chars):`);
        console.log(technicalSummaries.substring(0, 1000));

        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: `
                        --- FONT 1: RESUMS TÈCNICS (NotebookLM) ---
                        ${technicalSummaries || 'No hi ha resums disponibles per aquesta marca.'}

                        --- FONT 2: MANUAL OFICIAL (PDF) ---
                        Manual Trobat: ${manualFound ? 'SI' : 'NO'}
                        Contingut del Manual (Extracte rellevant): 
                        "${manualContent}" 
                        
                        --- DADES DE LA CONSULTA ---
                        Marca/Model Detectats: ${brand.name} ${modelMatch.model || ''}
                        Codi d'Error a buscar: ${modelMatch.errorCode || 'Cap'}
                        Consulta: ${userText}
                    `
                }
            ]
        });

        const aiResponse = completion.choices[0].message.content;

        // 4. Send Response with Branding
        let brandedResponse = `${BRAND_HEADER}\n\n${aiResponse}`;
        if (manualFound) {
            brandedResponse += `\n\n📖 Dada extreta del manual oficial indexat per Sentinel`;
        }

        try {
            if (brandedResponse) {
                await msg.reply(brandedResponse);
                dbService.logMessage(number, brandedResponse, 'bot');
            } else {
                const fallback = aiResponse || "Ho sento, no he pogut generar una resposta.";
                await msg.reply(fallback);
                dbService.logMessage(number, fallback, 'bot');
            }
        } catch (sendError: any) {
            console.error('❌ Error enviant resposta WhatsApp:', sendError);
            // Fallback: intentar enviar sense citar (reply pot fallar si el missatge original ha desaparegut)
            try {
                await client.sendMessage(msg.from, brandedResponse || aiResponse || "Error intern.");
            } catch (retryError) {
                console.error('❌ Error final en enviament:', retryError);
            }
        }

        // 5. Option for PDF Report
        if (userText.toLowerCase().includes('informe') || userText.toLowerCase().includes('pdf')) {
            const reportData: Partial<ReportData> = {
                brand: finalBrandKey !== 'normativa' ? brand.name : undefined,
                technician: "Tècnic Sentinel",
                client: "Client Final", // TODO: Detectar dades del client del text
                issue: userText,
                action: aiResponse || undefined,
                normative: "RITE / Seguretat Industrial",
                date: new Date().toLocaleDateString('ca-ES')
            };

            const missingFields = validateReportData(reportData);
            if (missingFields.length > 0) {
                await msg.reply(`⚠️ Per generar l'informe RITE em falten les següents dades: ${missingFields.join(', ')}. Si us plau, proporciona-les per àudio.`);
                return;
            }

            const reportPath = path.join(process.cwd(), `report_${Date.now()}.pdf`);
            await generateRITEReport(reportData as ReportData, reportPath);
            const pdfMedia = MessageMedia.fromFilePath(reportPath);
            await client.sendMessage(msg.from, pdfMedia, { caption: 'Aquí tens l\'informe RITE generat.' });
            fs.unlinkSync(reportPath);
        }

    } catch (error: any) {
        console.error('Error processing message:', error);
        await msg.reply(`Error: ${error.message}`);
    }
});

try {
    console.log('[DEBUG] Initializing WhatsApp client...');
    client.initialize().catch(e => {
        console.error('[CRITICAL] Async initialization error:', e);
        if (e && e.stack) console.error('[CRITICAL] Async Stack:', e.stack);
    });
} catch (startupError: any) {
    console.error('[CRITICAL] Failed to initialize WhatsApp client (Sync):', startupError);
    if (startupError && startupError.stack) console.error('[CRITICAL] Sync Stack:', startupError.stack);
}
