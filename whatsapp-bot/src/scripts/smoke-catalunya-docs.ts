import fs from 'fs';
import { FormFillerService } from '../services/form-filler';

async function main() {
    const filler = new FormFillerService();
    const generated: string[] = [];

    generated.push(await filler.fillELEC1PDF({
        titular: {
            nomCognoms: 'Joan Garcia Puig',
            nif: '12345678Z',
            tel: '600123123',
            correu: 'joan@example.com',
        },
        adreca: {
            tipusVia: 'Carrer',
            nomVia: 'Major',
            numero: '12',
            pis: '2',
            porta: '1',
            codiPostal: '08201',
            poblacio: 'Sabadell',
            tel: '600123123',
            correu: 'joan@example.com',
        },
        installacio: {
            tipusVia: 'Carrer',
            nomVia: 'Major',
            numero: '12',
            pis: '2',
            porta: '1',
            codiPostal: '08201',
            poblacio: 'Sabadell',
        },
        caracteristiques: {
            potenciaMax: '5,75',
            tensio: '230 V',
            circuits: '5',
            iga: '25',
            resistenciaAillament: '0,5',
            resistenciaTerra: '18',
            calibreCGP: '63',
            igm: '25',
            lga: '10',
            observacions: 'Prova automatitzada Catalunya',
            cups: 'ES0031401234567890AB',
            tipusActuacio: 'Nova',
            requisits: 'MTD',
            us: 'Habitatge',
            materialConductor: 'Coure',
            ubicacioComptadors: 'Armari',
            tipusConnexio: 'Assistida',
            subministramentComplementari: 'No',
        },
    }, 'catalunya'));

    generated.push(await filler.fillDRPDF({
        titular: { nom: 'Joan Garcia Puig', nif: '12345678Z' },
        installacio: {
            tipus: 'Baixa Tensio',
            campReglamentari: 'Baixa Tensio',
            cups: 'ES0031401234567890AB',
        },
        adreca: {
            tipusVia: 'Carrer',
            nomVia: 'Major',
            numero: '12',
            poblacio: 'Sabadell',
            codiPostal: '08201',
            municipi: 'Sabadell',
            comarca: 'Valles Occidental',
        },
        declarant: { nom: 'Joan Garcia Puig', nif: '12345678Z', tipusPersona: 'TIT' },
    }, 'catalunya'));

    generated.push(await filler.fillContractPDF({
        titular: {
            nom: 'Joan Garcia Puig',
            nif: '12345678Z',
            correu: 'joan@example.com',
            adreca: 'Carrer Major 12',
            poblacio: 'Sabadell',
            codiPostal: '08201',
            tel: '600123123',
        },
        representant: { nom: 'no', dni: '' },
        installacio: {
            adreca: 'Carrer Major 12',
            poblacio: 'Sabadell',
            us: 'Habitatge',
            potenciaMax: '5,75',
            superficie: '80',
            potenciaInstallada: '5,75',
            tensio: '230',
            potenciaContractada: '4,6',
            numExpedientBT: 'EXP-TEST',
            empresaComercialitzadora: 'Comercialitzadora Test',
            aportaDoc: 'Si',
            altresDades: 'Prova automatitzada Catalunya',
        },
        data: { dia: '9', mes: '6', any: '2026', ciutat: 'Sabadell' },
    }, 'catalunya'));

    generated.push(await filler.fillElec2PDF({
        general: {
            empresa: 'E-Distribucion',
            tensio: '230',
            seccioConexio: '10',
            iga: '25',
            potenciaContractada: '4,6',
            emplaçament: 'Carrer Major 12, Sabadell',
            titular: 'Joan Garcia Puig',
        },
        circuits: [
            { receptor: 'Enllumenat', potencia: '1', seccio: '1,5', pia: '10', diferencial: '40/30' },
            { receptor: 'Endolls', potencia: '2,5', seccio: '2,5', pia: '16', diferencial: '40/30' },
        ],
    }, 'catalunya'));

    generated.push(await filler.fillElec3Docx({
        general: {
            titular: 'Joan Garcia Puig',
            us: 'Habitatge',
            emplaçament: 'Carrer Major 12',
            carrer: 'Major',
            num: '12',
            pis: '2',
            porta: '1',
            localitat: 'Sabadell',
            cp: '08201',
            tipusActuacio: 'NOVA',
            empresaDistribuidora: 'E-Distribucion',
            seccioDerivacioIndiv: '10',
            iga: '25',
            caractEdifici: 'Plurifamiliar',
            superficie: '80',
            tensio: '230',
            potenciaMax: '5,75',
            potenciaInstalar: '5,75',
            resistTierra: '18',
            data: '09/06/2026',
        },
        circuits: [
            {
                id: 'C',
                carrega: 'Enllumenat',
                potencia: '1',
                cosFi: '1',
                intensitat: '4,35',
                seccioFase: '1,5',
                longitud: '10',
                momentElec: '10',
                caigudaParcial: '1',
                caigudaTotal: '1',
                tipusAillament: 'PVC',
                diametreTub: '16',
                tubSistema: 'Tub',
                encastat: 'X',
                noEncastat: ' ',
                profunditat: '',
                aillamentInstal: '0,5',
                seccioNeutre: '1,5',
                seccioProteccion: '1,5',
            },
        ],
        diferencials: [{ circuit: 'C', nombre: 'DIF-1', in: '40', sensibilitat: '30' }],
    }, 'catalunya'));

    generated.push(await filler.fillDictamenDocx({
        general: {
            titular: 'Joan Garcia Puig',
            emplaçament: 'Carrer Major 12',
            localitat: 'Sabadell',
            cp: '08201',
            dataRevisio: '09/06/2026',
            activitat: 'Habitatge',
            expedient: 'EXP-TEST',
            empresaDistribuidora: 'E-Distribucion',
            potenciaMax: '5,75',
            potenciaContractada: '4,6',
            potenciaMaxComp: '5,75',
            potenciaContractadaComp: '4,6',
            tensio: '230',
        },
        anomalies: [{ id: 12, observacio: 'Prova diferencial' }],
    }, 'catalunya'));

    for (const filePath of generated) {
        const size = fs.statSync(filePath).size;
        console.log(`${filePath} (${size} bytes)`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
