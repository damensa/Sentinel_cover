import { PDFDocument, PDFName, rgb, degrees, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import * as zlib from 'zlib';
import { fieldMapper } from './field-mapper';

// ELEC-1 Interface
export interface Elec1FormData {
    titular: { nomCognoms: string; nif: string; tel?: string; correu?: string; };
    adreca: { tipusVia?: string; nomVia: string; numero: string; bloc?: string; escala?: string; pis?: string; porta?: string; codiPostal: string; poblacio: string; tel?: string; correu?: string; };
    installacio: { tipusVia?: string; nomVia: string; numero: string; bloc?: string; escala?: string; pis?: string; porta?: string; codiPostal: string; poblacio: string; tel?: string; correu?: string; };
    caracteristiques: {
        potenciaMax: string; tensio: string; circuits: string; iga: string;
        resistenciaAillament: string; resistenciaTerra: string; aillamentTerra?: string; calibreCGP: string; igm: string; lga: string; observacions: string;
        cups: string; tipusActuacio: string; requisits: string; us: string;
        materialConductor?: string;
        ubicacioComptadors?: string;
        tipusConnexio?: string;
        subministramentComplementari?: string;
    };
}

// DR Interface
export interface DRFormData {
    titular: { nom: string; nif: string; };
    installacio: { tipus: string; campReglamentari: string; cups: string; };
    adreca: {
        tipusVia?: string;
        nomVia: string;
        numero: string;
        bloc?: string;
        escala?: string;
        pis?: string;
        porta?: string;
        poblacio: string;
        codiPostal: string;
        municipi: string;
        comarca: string;
    };
    declarant: { nom: string; nif: string; tipusPersona: string; };
}

// Contract Interface
export interface ContractFormData {
    titular: { nom: string; nif: string; correu: string; adreca: string; poblacio: string; codiPostal: string; tel: string; };
    representant: { nom: string; dni: string; };
    installacio: {
        adreca: string;
        poblacio: string;
        us: string;
        potenciaMax: string;
        superficie: string;
        potenciaInstallada: string;
        tensio: string;
        potenciaContractada: string;
        numExpedientBT: string;
        empresaComercialitzadora: string;
        aportaDoc: string;
        altresDades: string;
    };
    data: { dia: string; mes: string; any: string; ciutat: string; };
}

// ELEC-2 Interface
export interface Elec2Circuit {
    receptor: string;
    potencia: string;
    seccio: string;
    pia: string;
    diferencial: string;
}

export interface Elec2FormData {
    general: {
        empresa: string;
        tensio: string;
        seccioConexio: string;
        iga: string;
        potenciaContractada: string;
        emplaçament: string;
        titular: string;
    };
    circuits: Elec2Circuit[];
}

// ELEC-3 Interface
export interface Elec3Circuit {
    id: string; // e.g., "C—D", "E—F"
    carrega: string;
    potencia: string;
    cosFi: string;
    intensitat: string;
    seccioFase: string;
    longitud: string;
    momentElec: string;
    caigudaParcial: string;
    caigudaTotal: string;
    tipusAillament: string;
    diametreTub: string; // sota tub Ø en mm.
    tubSistema: string; // sense tub protector (sistema)
    encastat: string; // X if encastat
    noEncastat: string; // X if sense encas.
    profunditat: string; // conduct. enterrat prof. m.
    aillamentInstal: string; // Aïllam. instal. kΩ
    seccioNeutre: string;
    seccioProteccion: string;
}

export interface Elec3Diferencial {
    circuit: string;
    nombre: string;
    in: string;
    sensibilitat: string;
}

export interface Elec3FormData {
    general: {
        titular: string;
        us: string;
        emplaçament: string;
        carrer: string;
        num: string;
        pis: string;
        porta: string;
        localitat: string;
        cp: string;
        tipusActuacio: string; // NOVA, AMPLIACIO, REFORMA
        empresaDistribuidora: string;
        seccioDerivacioIndiv: string;
        iga: string;
        caractEdifici: string;
        superficie: string;
        tensio: string;
        potenciaMax: string;
        potenciaInstalar: string;
        resistTierra: string;
        data: string;
    };
    circuits: Elec3Circuit[];
    diferencials: Elec3Diferencial[];
}

// DICTAMEN DE RECONEIXEMENT Interface
export interface DictamenFormData {
    general: {
        titular: string;
        emplaçament: string;
        localitat: string;
        cp: string;
        dataRevisio: string;
        activitat: string;
        expedient: string;
        empresaDistribuidora: string;
        potenciaMax: string;
        potenciaContractada: string;
        potenciaMaxComp: string;
        potenciaContractadaComp: string;
        tensio: string;
    };
    anomalies: {
        id: number; // 1 to 43
        observacio: string;
    }[];
}

// Tipus i helpers per a la injecció XFA amb consciència de ruta.

export interface XfaInjection {
    /**
     * Ruta al bloc pare relatiu a `<DATA>`, com a array de noms de tag.
     * Buit = els fills directes de `<DATA>`. Exemple: `['sDeclaracio']` per
     * al bloc del declarant, `['ADRECA', 'ADRECA_POSTAL']` per als camps
     * d'adreça.
     */
    parentPath: string[];
    /** Tag → valor. Els tags ja existents al bloc s'actualitzen. */
    fields: Record<string, string | undefined>;
    /**
     * Si true, els tags que no existeixin al bloc s'insereixen just abans
     * del tancament del pare. Útil per omplir camps que el datasets
     * original no té declarats (per exemple, camps d'adreça que el
     * template va deixar `bind="none"` i que ara volem lligar).
     */
    createMissing?: boolean;
    /**
     * Si true, crea els blocs pare si no existeixen. Per defecte, no.
     */
    createParents?: boolean;
}

export interface XfaTemplatePatch {
    fieldName: string;
    bindRef: string;
}

export class FormFillerService {
    private profilePath: string;
    private projectRoot: string;
    private botRoot: string;

    constructor() {
        this.projectRoot = path.resolve(__dirname, '..', '..', '..');
        this.botRoot = path.join(this.projectRoot, 'whatsapp-bot');
        this.profilePath = path.join(this.botRoot, 'installer_profile_example.json');
    }

    private getTemplatePath(region: string, filename: string): string {
        const regionDirs: Record<string, string> = {
            catalunya: 'Catalunya',
            arago: 'Arago',
            valencia: 'Comunitat Valenciana',
            madrid: 'Comunidad de Madrid',
        };
        return path.join(this.projectRoot, 'Templates', regionDirs[region] || regionDirs.catalunya, filename);
    }

    private getOutputPath(filename: string): string {
        return path.join(this.botRoot, filename);
    }

    private loadInstallerProfile(): any {
        if (fs.existsSync(this.profilePath)) {
            return JSON.parse(fs.readFileSync(this.profilePath, 'utf8'));
        }
        return null;
    }

    /**
     * Injecta valors al packet `datasets` d'un PDF XFA respectant la ruta
     * jeràrquica. Cada `XfaInjection` opera dins d'un bloc concret del
     * datasets (per exemple, els fills directes de `<DATA>` per al titular,
     * els fills de `<sDeclaracio>` per al declarant); així no es barregen
     * tags amb el mateix nom que apareixen a llocs diferents.
     *
     * Opcionalment també parcheja el packet `template` per canviar
     * `<bind match="none"/>` per bindings explícits, útil quan el
     * dissenyador del PDF va deixar camps visuals desvinculats a
     * propòsit i vols habilitar-los per omplir-los per codi.
     */
    private async fillXfaByPath(
        sourcePath: string,
        outputPath: string,
        injections: XfaInjection[],
        templatePatches: XfaTemplatePatch[] = [],
    ): Promise<string> {
        const pdfDoc = await PDFDocument.load(fs.readFileSync(sourcePath), { ignoreEncryption: true });
        const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
        if (!acroFormRef) throw new Error(`AcroForm missing in ${sourcePath}`);
        const acroForm = pdfDoc.context.lookup(acroFormRef) as any;
        const xfaRef = acroForm.get(PDFName.of('XFA'));
        if (!xfaRef) throw new Error(`XFA missing in ${sourcePath}`);
        const xfa = pdfDoc.context.lookup(xfaRef) as any;

        const readPacket = (needle: string): { xml: string; refIndex: number } | null => {
            for (let i = 0; i < xfa.size(); i += 2) {
                const packetName = String(pdfDoc.context.lookup(xfa.get(i)));
                if (packetName.includes(needle)) {
                    const stream = pdfDoc.context.lookup(xfa.get(i + 1)) as any;
                    let contents = stream.contents as Buffer;
                    if (!contents) return null;
                    const filter = stream.dict.get(PDFName.of('Filter'));
                    if (filter && String(filter).includes('FlateDecode')) contents = zlib.inflateSync(contents);
                    return { xml: Buffer.from(contents).toString('utf8'), refIndex: i + 1 };
                }
            }
            return null;
        };

        const writePacket = (refIndex: number, xml: string) => {
            // Passem un Buffer UTF-8 explícit; si es passa string, pdf-lib
            // el tracta com Latin-1 i els caràcters multibyte (accents
            // catalans, ç, etc.) es corrompen — ho vam veure amb "Barcelonès".
            const newStream = pdfDoc.context.flateStream(Buffer.from(xml, 'utf8'));
            xfa.set(refIndex, pdfDoc.context.register(newStream));
        };

        if (templatePatches.length > 0) {
            const tp = readPacket('template');
            if (tp) writePacket(tp.refIndex, patchXfaTemplate(tp.xml, templatePatches));
        }

        const dp = readPacket('datasets');
        if (!dp) throw new Error(`XFA datasets missing in ${sourcePath}`);
        let datasetsXml = dp.xml;
        for (const inj of injections) datasetsXml = applyXfaInjection(datasetsXml, inj);
        writePacket(dp.refIndex, datasetsXml);

        fs.writeFileSync(outputPath, await pdfDoc.save());
        return outputPath;
    }

    async fillELEC1PDF(data: Elec1FormData, region: string = 'catalunya'): Promise<string> {
        const filenames: Record<string, string> = {
            catalunya: 'ELEC1_AcroForm.pdf',
            arago: 'C0004_v3_fillable.pdf',
            valencia: '23294_BI.pdf',
            madrid: 'DHHBWA_fillable.pdf',
        };
        const filename = filenames[region] || filenames.catalunya;
        const templatePath = this.getTemplatePath(region, filename);

        if (!fs.existsSync(templatePath)) throw new Error(`Template not found at ${templatePath}`);
        const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
        const form = pdfDoc.getForm();
        const safetyFill = (f: string | null, v: string) => {
            if (!f) return;
            try {
                const field = form.getField(f);
                if (field && 'setText' in field) (field as any).setText(String(v || ''));
            } catch (e) { }
        };

        const safetySelect = (f: string, v: string) => {
            try {
                const field = form.getField(f);
                if (field && 'select' in field) (field as any).select(v);
            } catch (e) { }
        };

        const profile = this.loadInstallerProfile();

        if (region === 'catalunya') {
            const tBase = 'DATA[0].principal[0].sTitular[0]';
            safetyFill(`${tBase}.NomCognoms[0]`, data.titular.nomCognoms);
            safetyFill(`${tBase}.NIF[0]`, data.titular.nif);
            safetyFill(`${tBase}.TXT_Tel[0]`, data.titular.tel || data.adreca.tel || '');
            safetyFill(`${tBase}.TXT_Correu[0]`, data.titular.correu || data.adreca.correu || '');
            safetyFill(`${tBase}.CBO_TipusVia[0]`, data.adreca.tipusVia || '');
            safetyFill(`${tBase}.TXT_NomVia[0]`, data.adreca.nomVia);
            safetyFill(`${tBase}.TXT_Num[0]`, data.adreca.numero);
            safetyFill(`${tBase}.TXT_Bloc[0]`, data.adreca.bloc || '');
            safetyFill(`${tBase}.TXT_Escala[0]`, data.adreca.escala || '');
            safetyFill(`${tBase}.TXT_Pis[0]`, data.adreca.pis || '');
            safetyFill(`${tBase}.TXT_Porta[0]`, data.adreca.porta || '');
            safetyFill(`${tBase}.TXT_CodiPostal[0]`, data.adreca.codiPostal);
            safetyFill(`${tBase}.TXT_Poblacio[0]`, data.adreca.poblacio);

            const iBase = 'DATA[0].principal[0].sInstallacio[0].sAdreca[0]';
            safetyFill(`${iBase}.CBO_TipusVia[0]`, data.installacio.tipusVia || '');
            safetyFill(`${iBase}.TXT_NomVia[0]`, data.installacio.nomVia);
            safetyFill(`${iBase}.TXT_Num[0]`, data.installacio.numero);
            safetyFill(`${iBase}.TXT_Bloc[0]`, data.installacio.bloc || '');
            safetyFill(`${iBase}.TXT_Escala[0]`, data.installacio.escala || '');
            safetyFill(`${iBase}.TXT_Pis[0]`, data.installacio.pis || '');
            safetyFill(`${iBase}.TXT_Porta[0]`, data.installacio.porta || '');
            safetyFill(`${iBase}.TXT_CodiPostal[0]`, data.installacio.codiPostal);
            safetyFill(`${iBase}.TXT_Poblacio[0]`, data.installacio.poblacio);
            safetyFill(`${iBase}.TXT_Tel[0]`, data.installacio.tel || '');
            safetyFill(`${iBase}.TXT_Correu[0]`, data.installacio.correu || '');

            const cBase = 'DATA[0].principal[0].sInstallacio[0].sCaracteristiques[0].sRequisits[0].sTotes[0]';
            safetyFill(`${cBase}.TXT_PotenciaMax[0]`, data.caracteristiques.potenciaMax);
            safetyFill(`${cBase}.TXT_Potencia[0]`, data.caracteristiques.potenciaMax); // Match it
            safetyFill(`${cBase}.TXT_Tensio[0]`, data.caracteristiques.tensio);
            safetyFill(`${cBase}.TXT_Interruptor[0]`, data.caracteristiques.iga);
            safetyFill(`${cBase}.TXT_Circuits[0]`, data.caracteristiques.circuits);
            safetyFill(`${cBase}.TXT_IGM[0]`, data.caracteristiques.igm);
            safetyFill(`${cBase}.TXT_SeccioLGA[0]`, data.caracteristiques.lga);
            safetyFill(`${cBase}.TXT_ResistenciaConductors[0]`, data.caracteristiques.resistenciaAillament);
            safetyFill(`${cBase}.TXT_ResistenciaTerra[0]`, data.caracteristiques.resistenciaTerra);
            safetyFill(`${cBase}.TXT_AillamentTerra[0]`, data.caracteristiques.aillamentTerra || '');
            safetyFill(`${cBase}.TXT_MaterialConductor[0]`, data.caracteristiques.materialConductor || '');
            safetyFill(`${cBase}.TXT_UbicacioComptadors[0]`, data.caracteristiques.ubicacioComptadors || '');
            safetyFill(`${cBase}.TXT_TipusConnexio[0]`, data.caracteristiques.tipusConnexio || '');
            safetyFill(`${cBase}.TXT_Calibre[0]`, data.caracteristiques.calibreCGP);
            safetyFill(`DATA[0].principal[0].sInstallacio[0].sCaracteristiques[0].sTipus[0].TXT_CUPS[0]`, data.caracteristiques.cups);
            safetyFill(`DATA[0].principal[0].sInstallacio[0].sCaracteristiques[0].sRequisits[0].TXT_Us[0]`, data.caracteristiques.us);
            safetyFill(`DATA[0].principal[0].s9[0].TXT_Observacions[0]`, data.caracteristiques.observacions);

            // Tipus Actuació (Radios)
            const act = data.caracteristiques.tipusActuacio?.toLowerCase() || '';
            const actField = 'DATA[0].principal[0].sInstallacio[0].sCaracteristiques[0].sTipus[0].RB_TipusActuacio[0]';
            if (act.includes('nova')) safetySelect(actField, '1');
            else if (act.includes('ampliacio')) safetySelect(actField, '2');
            else if (act.includes('reforma')) safetySelect(actField, '3');

            // Requisits (Radios)
            const req = data.caracteristiques.requisits?.toLowerCase() || '';
            const reqField = 'DATA[0].principal[0].sInstallacio[0].sCaracteristiques[0].sRequisits[0].RB_Requisits[0]';
            if (req.includes('p1')) safetySelect(reqField, '1');
            else if (req.includes('p2')) safetySelect(reqField, '2');
            else if (req.includes('mtd')) safetySelect(reqField, '3');

            // Subministrament (Radios) - Monofàsic potser?
            const subField = 'DATA[0].principal[0].sInstallacio[0].sCaracteristiques[0].sRequisits[0].sTotes[0].RB_Subministrament[0]';
            if (data.caracteristiques.subministramentComplementari?.toLowerCase().includes('sí')) safetySelect(subField, '1');
            else safetySelect(subField, '2');

            // Installer Data Mapping
            if (profile) {
                const eBase = 'DATA[0].principal[0].sEmpresaIns[0]';
                safetyFill(`${eBase}.NomCognoms[0]`, profile.empresa);
                safetyFill(`${eBase}.TXT_Rasic[0]`, profile.rasic);
                safetyFill(`${eBase}.NIF[0]`, profile.nif);
                safetyFill(`${eBase}.NomCognomsInstalador[0]`, profile['nom_instal·lador']);
                safetyFill(`${eBase}.TXT_Categoria[0]`, profile.categoria);
                safetyFill(`${eBase}.DNIInstallador[0]`, profile['dni_instal·lador']);

                const eaBase = `${eBase}.sAdreca[0]`;
                safetyFill(`${eaBase}.TXT_NomVia[0]`, profile.adreca.nom_via);
                safetyFill(`${eaBase}.TXT_Num[0]`, profile.adreca.numero);
                safetyFill(`${eaBase}.TXT_CodiPostal[0]`, profile.adreca.codi_postal);
                safetyFill(`${eaBase}.TXT_Poblacio[0]`, profile.adreca.poblacio);
                safetyFill(`${eaBase}.TXT_Tel[0]`, profile.adreca.telefon);
                safetyFill(`${eaBase}.TXT_Correu[0]`, profile.adreca.correu);
            }
        } else if (region === 'arago') {
            // Mapping for Aragón C0004 (equivalent to ELEC-1 for the bot logic)
            safetyFill(fieldMapper.getField('arago', 'C0004', 'titular', 'nombre'), data.titular.nomCognoms);
            safetyFill(fieldMapper.getField('arago', 'C0004', 'titular', 'nif'), data.titular.nif);
            safetyFill(fieldMapper.getField('arago', 'C0004', 'emplazamiento', 'via'), data.adreca.nomVia);
            safetyFill(fieldMapper.getField('arago', 'C0004', 'emplazamiento', 'numero'), data.adreca.numero);
            safetyFill(fieldMapper.getField('arago', 'C0004', 'emplazamiento', 'cp'), data.adreca.codiPostal);
            safetyFill(fieldMapper.getField('arago', 'C0004', 'emplazamiento', 'poblacio'), data.adreca.poblacio);

            safetyFill(fieldMapper.getField('arago', 'C0004', 'tecnico', 'potencia_max'), data.caracteristiques.potenciaMax);
            safetyFill(fieldMapper.getField('arago', 'C0004', 'tecnico', 'iga'), data.caracteristiques.iga);
            safetyFill(fieldMapper.getField('arago', 'C0004', 'tecnico', 'uso'), data.caracteristiques.us);
        } else if (region === 'valencia') {
            // Mapping for Valencia 23294_BI (Certificado Instalación Eléctrica)
            safetyFill(fieldMapper.getField('valencia', '23294_BI', 'titular', 'nombre'), data.titular.nomCognoms);
            safetyFill(fieldMapper.getField('valencia', '23294_BI', 'titular', 'nif'), data.titular.nif);
            safetyFill(fieldMapper.getField('valencia', '23294_BI', 'titular', 'cp'), data.adreca.codiPostal);
            safetyFill(fieldMapper.getField('valencia', '23294_BI', 'titular', 'poblacion'), data.adreca.poblacio);

            safetyFill(fieldMapper.getField('valencia', '23294_BI', 'emplazamiento', 'direccion'), `${data.installacio.nomVia} ${data.installacio.numero}`);
            safetyFill(fieldMapper.getField('valencia', '23294_BI', 'emplazamiento', 'poblacion'), data.installacio.poblacio);
            safetyFill(fieldMapper.getField('valencia', '23294_BI', 'emplazamiento', 'cp'), data.installacio.codiPostal);

            safetyFill(fieldMapper.getField('valencia', '23294_BI', 'tecnico', 'potencia'), data.caracteristiques.potenciaMax);
            safetyFill(fieldMapper.getField('valencia', '23294_BI', 'tecnico', 'cups'), data.caracteristiques.cups);
        } else if (region === 'madrid') {
            // Mapping for Madrid DHHBWA_fillable
            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'titular', 'nombre'), data.titular.nomCognoms);
            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'titular', 'nif'), data.titular.nif);
            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'titular', 'via'), data.adreca.nomVia);
            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'titular', 'num'), data.adreca.numero);
            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'titular', 'cp'), data.adreca.codiPostal);
            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'titular', 'poblacion'), data.adreca.poblacio);

            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'emplazamiento', 'via'), data.installacio.nomVia);
            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'emplazamiento', 'num'), data.installacio.numero);
            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'emplazamiento', 'cp'), data.installacio.codiPostal);
            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'emplazamiento', 'poblacion'), data.installacio.poblacio);

            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'tecnico', 'ptmax'), data.caracteristiques.potenciaMax);
            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'tecnico', 'tension'), data.caracteristiques.tensio);
            safetyFill(fieldMapper.getField('madrid', 'DHHBWA_fillable', 'tecnico', 'cups'), data.caracteristiques.cups);
        }

        const outputPath = this.getOutputPath(`${region.toUpperCase()}_ELEC1_filled_${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, await pdfDoc.save());
        return outputPath;
    }

    async fillDRPDF(data: DRFormData, region: string = 'catalunya'): Promise<string> {
        let filename = 'DeclaracioResponsableInstallacio.pdf';
        if (region === 'arago') filename = 'E0001_v5_fillable.pdf';
        if (region === 'valencia') filename = '23019_BI.pdf';

        const templatePath = this.getTemplatePath(region, filename);

        if (!fs.existsSync(templatePath)) throw new Error(`Template not found at ${templatePath}`);
        if (region === 'catalunya') {
            // La DR de Catalunya és XFA dinàmic amb dues subtileses del template:
            //   1. Els camps del titular i del declarant tenen el mateix nom
            //      (`TXT_Nom`, `TXT_NumID`), un a l'arrel de <DATA> i l'altre
            //      dins <sDeclaracio>. Cal injectar per ruta perquè no
            //      s'esborrin mútuament.
            //   2. Els camps d'adreça (nom_via, num_via, bloc, escala, pis,
            //      porta, codi_postal, població, municipi, comarca, província)
            //      tenen `bind match="none"` al template, no els lligava a
            //      cap dada. Els patchejem al vol per lligar-los al datasets.
            const outputPath = this.getOutputPath(`${region.toUpperCase()}_DR_filled_${Date.now()}.pdf`);
            const sameAsTitular =
                data.declarant?.nif && data.titular?.nif && data.declarant.nif === data.titular.nif;
            return this.fillXfaByPath(
                templatePath,
                outputPath,
                [
                    {
                        parentPath: [],
                        fields: {
                            TXT_Nom: data.titular.nom,
                            TXT_NumID: data.titular.nif,
                            RB_TipusInstalacio: data.installacio.tipus,
                            TXT_CampReglamentari: data.installacio.campReglamentari,
                            TXT_NumCUPS: data.installacio.cups,
                        },
                    },
                    {
                        parentPath: ['sDeclaracio'],
                        fields: {
                            TXT_Nom: data.declarant.nom,
                            TXT_NumID: data.declarant.nif,
                            // '1' = declarant és el mateix titular; '2' = és representant.
                            RB_TipusPersona: sameAsTitular ? '1' : '2',
                        },
                    },
                    {
                        parentPath: ['ADRECA', 'ADRECA_POSTAL'],
                        createParents: true,
                        createMissing: true,
                        fields: {
                            TIPUS_VIA: data.adreca.tipusVia,
                            NOM_VIA: data.adreca.nomVia,
                            NUM_VIA: data.adreca.numero,
                            BLOC: data.adreca.bloc,
                            ESCALA: data.adreca.escala,
                            PIS: data.adreca.pis,
                            PORTA: data.adreca.porta,
                            CODI_POSTAL: data.adreca.codiPostal,
                            POBLACIO: data.adreca.poblacio,
                            MUNICIPI: data.adreca.municipi,
                            COMARCA: data.adreca.comarca,
                        },
                    },
                ],
                [
                    { fieldName: 'TXT_NomVia', bindRef: '$.ADRECA.ADRECA_POSTAL.NOM_VIA' },
                    { fieldName: 'TXT_NumVia', bindRef: '$.ADRECA.ADRECA_POSTAL.NUM_VIA' },
                    { fieldName: 'TXT_Bloc', bindRef: '$.ADRECA.ADRECA_POSTAL.BLOC' },
                    { fieldName: 'TXT_Escala', bindRef: '$.ADRECA.ADRECA_POSTAL.ESCALA' },
                    { fieldName: 'TXT_Pis', bindRef: '$.ADRECA.ADRECA_POSTAL.PIS' },
                    { fieldName: 'TXT_Porta', bindRef: '$.ADRECA.ADRECA_POSTAL.PORTA' },
                    { fieldName: 'TXT_CodiPostal', bindRef: '$.ADRECA.ADRECA_POSTAL.CODI_POSTAL' },
                    { fieldName: 'TXT_Poblacio', bindRef: '$.ADRECA.ADRECA_POSTAL.POBLACIO' },
                    { fieldName: 'TXT_Municipi', bindRef: '$.ADRECA.ADRECA_POSTAL.MUNICIPI' },
                    { fieldName: 'TXT_Comarca', bindRef: '$.ADRECA.ADRECA_POSTAL.COMARCA' },
                    { fieldName: 'TXT_Provincia', bindRef: '$.ADRECA.ADRECA_POSTAL.PROVINCIA' },
                ],
            );
        }

        const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
        const form = pdfDoc.getForm();
        const safetyFill = (f: string | null, v: any) => {
            if (!f) return;
            try {
                const field = form.getField(f);
                if (field && 'setText' in field) (field as any).setText(String(v || ''));
            } catch (e) { }
        };

        if (region === 'catalunya') {
            safetyFill('DATA[0].TXT_Nom[0]', data.titular.nom);
            safetyFill('DATA[0].TXT_NumID[0]', data.titular.nif);
            safetyFill('DATA[0].ADRECA[0].ADRECA_POSTAL[0].TIPUS_VIA[0]', data.adreca.tipusVia);
            safetyFill('DATA[0].ADRECA[0].ADRECA_POSTAL[0].NOM_VIA[0]', data.adreca.nomVia);
            safetyFill('DATA[0].ADRECA[0].ADRECA_POSTAL[0].NUM_VIA[0]', data.adreca.numero);
            safetyFill('DATA[0].ADRECA[0].ADRECA_POSTAL[0].POBLACIO[0]', data.adreca.poblacio);
            safetyFill('DATA[0].ADRECA[0].ADRECA_POSTAL[0].CODI_POSTAL[0]', data.adreca.codiPostal);
            
            safetyFill('DATA[0].RB_TipusInstalacio[0]', data.installacio.tipus);
            safetyFill('DATA[0].TXT_CampReglamentari[0]', data.installacio.campReglamentari);
            safetyFill('DATA[0].TXT_NumCUPS[0]', data.installacio.cups);
            safetyFill('DATA[0].RB_TipusPersona[0]', data.declarant.tipusPersona === 'TIT' ? '1' : '2'); // '1' per Titular, '2' per Representant

        } else if (region === 'arago') {
            // E0001 mapping
            safetyFill(fieldMapper.getField('arago', 'E0001', 'interesado', 'nombre'), data.titular.nom);
            safetyFill(fieldMapper.getField('arago', 'E0001', 'interesado', 'nif'), data.titular.nif);
            safetyFill(fieldMapper.getField('arago', 'E0001', 'emplazamiento', 'via'), data.adreca.nomVia);
            safetyFill(fieldMapper.getField('arago', 'E0001', 'emplazamiento', 'numero'), data.adreca.numero);
            safetyFill(fieldMapper.getField('arago', 'E0001', 'emplazamiento', 'localidad'), data.adreca.poblacio);
            safetyFill(fieldMapper.getField('arago', 'E0001', 'emplazamiento', 'cp'), data.adreca.codiPostal);
        } else if (region === 'valencia') {
            safetyFill(fieldMapper.getField('valencia', '23019_BI', 'titular', 'nombre'), data.titular.nom);
            safetyFill(fieldMapper.getField('valencia', '23019_BI', 'titular', 'nif'), data.titular.nif);
            // Repeat for second occurrence if relevant
            safetyFill('form1[0].Pagina1[0].seccion\\.c[0].A_TIT_NOM2[0]', data.titular.nom);
            safetyFill('form1[0].Pagina1[0].seccion\\.c[0].A_TIT_DNI2[0]', data.titular.nif);

            const now = new Date();
            safetyFill(fieldMapper.getField('valencia', '23019_BI', 'firma', 'dia'), String(now.getDate()));
            safetyFill(fieldMapper.getField('valencia', '23019_BI', 'firma', 'mes'), String(now.getMonth() + 1));
            safetyFill(fieldMapper.getField('valencia', '23019_BI', 'firma', 'any'), String(now.getFullYear()));
            safetyFill(fieldMapper.getField('valencia', '23019_BI', 'firma', 'lloc'), 'Valencia');
        }

        const outputPath = this.getOutputPath(`${region.toUpperCase()}_DR_filled_${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, await pdfDoc.save());
        return outputPath;
    }

    async fillContractPDF(data: ContractFormData, region: string = 'catalunya'): Promise<string> {
        const filename = 'Contracte Manteniment BT - Editable.pdf'; // Updated filename
        const templatePath = this.getTemplatePath(region, filename);

        if (!fs.existsSync(templatePath)) {
            // Fallback to local if not in regional folder
            const localPath = path.join(process.cwd(), filename);
            if (!fs.existsSync(localPath)) throw new Error(`Template not found at ${templatePath} or ${localPath}`);
        }

        const pdfDoc = await PDFDocument.load(fs.readFileSync(fs.existsSync(templatePath) ? templatePath : path.join(process.cwd(), filename)));
        const form = pdfDoc.getForm();
        const safetyFill = (f: string | null, v: string) => {
            if (!f) return;
            try {
                const field = form.getField(f);
                if (field && 'setText' in field) (field as any).setText(String(v || ''));
            } catch (e) { }
        };

        const profile = this.loadInstallerProfile();

        // 1. Titular
        safetyFill('Nom i Cognoms', data.titular.nom);
        safetyFill('NIF', data.titular.nif);
        safetyFill('Domicili social', data.titular.adreca);
        safetyFill('Població', data.titular.poblacio);
        safetyFill('NÚM', data.titular.codiPostal); // Could be CP, trying to guess from available fields
        safetyFill('CP', data.titular.codiPostal);
        safetyFill('Telèfon', data.titular.tel);
        safetyFill('correu electrònic', data.titular.correu);

        // 2. Representant
        if (data.representant?.nom && data.representant.nom.toLowerCase() !== 'no' && data.representant.nom !== '') {
            safetyFill('I en el seu nom i representació', data.representant.nom);
            safetyFill('DNI', data.representant.dni);
        }

        // 3. Installació
        // Using "Carrer_2", "Població_2", "NIF_2" (Assuming NIF_2 is related to the installation's titular if different, but falling back to main)
        safetyFill('Carrer_2', data.installacio.adreca || data.titular.adreca);
        safetyFill('Població_2', data.installacio.poblacio || data.titular.poblacio);
        // We will assume NÚM2 and CP2 are for the installation address
        if (data.titular.codiPostal) safetyFill('CP2', data.titular.codiPostal);
        
        safetyFill('Ús de la installació article 43 de la ITA 12 del Decret 1922023', data.installacio.us);
        safetyFill('Potència màxima admissible kW', data.installacio.potenciaMax);
        safetyFill('Superficie m2', data.installacio.superficie);
        safetyFill('Potència installada kW', data.installacio.potenciaInstallada);
        safetyFill('Tensió alimentació V', data.installacio.tensio);
        safetyFill('Potència contractada kW', data.installacio.potenciaContractada);
        safetyFill('Número dexpedient de Baixa Tensió si es disposa', data.installacio.numExpedientBT);
        safetyFill('Empresa  comercialitzadora  denergia  elèctrica', data.installacio.empresaComercialitzadora);
        safetyFill('El Titular aporta documentació tècnica de la installació', data.installacio.aportaDoc);
        safetyFill('Altres dades addicionals', data.installacio.altresDades);

        // 4. Empresa Instal·ladora (from Profile)
        if (profile) {
            safetyFill('Nom i Cognoms2', profile.empresa);
            safetyFill('Carrer_3', profile.adreca?.nom_via);
            safetyFill('Població_3', profile.adreca?.poblacio);
            safetyFill('CP3', profile.adreca?.codi_postal);
            safetyFill('correu electrònic_2', profile.adreca?.correu);
            safetyFill('RASIC', profile.rasic);
            safetyFill('Categoria', profile.categoria);
            safetyFill('I en el seu nom i representació_2', profile['nom_instal·lador']);
            safetyFill('NIF_2', profile.nif);        // Mapping NIF_2 to the installer's NIF
            safetyFill('DNI_2', profile['dni_instal·lador']);
            safetyFill('Catalunya i amb Certificat de Competència Professional amb núm DNI', profile['dni_instal·lador']);
            // Some specific fields don't have exact profile matches but we can try
            // "Modalitat", "amb Pòlissa de RC"
            safetyFill('amb Pòlissa de RC', "Sí");
        }

        // 5. Data i Lloc
        safetyFill('CIUTAT', data.data.ciutat);
        safetyFill('DIA', data.data.dia);
        safetyFill('MES', data.data.mes);
        safetyFill('de 20', data.data.any);

        const outputPath = this.getOutputPath(`${region.toUpperCase()}_ContracteBT_filled_${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, await pdfDoc.save());
        return outputPath;
    }

    async fillElec2PDF(data: Elec2FormData, region: string = 'catalunya'): Promise<string> {
        console.log('Filling ELEC-2 PDF with dynamic drawing...');
        const templatePath = this.getTemplatePath(region, 'EsquemaUnifilarELEC2.pdf');
        const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
        const page = pdfDoc.getPage(0);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const { height } = page.getSize();

        // Coordinates for Portrait page with rotated content
        // Drawing is rotated CCW, meaning X on drawing = Y on page (inverted), Y on drawing = X on page
        // Let's use simple drawing coordinates and rotate text 90deg
        const drawText = (text: string, x: number, y: number, size = 10) => {
            page.drawText(String(text || ''), {
                x, y, size, font, color: rgb(0, 0, 0), rotate: degrees(90)
            });
        };

        // 1. General Info (Bottom of drawing = Right of page)
        drawText(data.general.empresa, 20, 100);
        drawText(data.general.seccioConexio, 20, 230);
        drawText(data.general.tensio, 20, 390);
        drawText(data.general.emplaçament, 50, 100);
        drawText(data.general.titular, 100, 100);
        drawText(data.general.iga, 150, 390);

        // 2. Circuits (C through Z)
        // Horizontal columns in drawing = Vertical columns on Portrait page
        // Column C starts at some Y coordinate on portrait page
        const circuitStartY = 735; // Approx top of drawing grid (left side of page)
        const columnStepY = 18;  // Step between C, D, E...

        data.circuits.forEach((c, i) => {
            const currentY = circuitStartY - (i * columnStepY);
            if (currentY < 100) return; // Guard

            drawText(c.potencia, 545, currentY, 8);
            drawText(c.receptor, 520, currentY, 7);
            drawText(c.seccio, 460, currentY, 8);
            drawText(c.pia, 415, currentY, 8);
            drawText(c.diferencial, 360, currentY, 8);
        });

        const outputPath = this.getOutputPath(`ELEC2_filled_${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, await pdfDoc.save());
        return outputPath;
    }

    async fillElec3Docx(data: Elec3FormData, region: string = 'catalunya'): Promise<string> {
        const PizZip = require("pizzip");
        const Docxtemplater = require("docxtemplater");

        console.log('Filling ELEC-3 DOCX template...');
        const templatePath = this.getTemplatePath(region, 'MemoriaTecnicaELEC3.docx');
        
        if (!fs.existsSync(templatePath)) throw new Error(`Template not found at ${templatePath}`);
        
        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter() { return ""; }
        });

        const profile = this.loadInstallerProfile() || {};
        
        doc.render({
            Titular: data.general.titular,
            Us: data.general.us,
            Emplacament: data.general.emplaçament,
            Carrer: data.general.carrer,
            Num: data.general.num,
            Pis: data.general.pis,
            Porta: data.general.porta,
            Localitat: data.general.localitat,
            CP: data.general.cp,
            TipusActuacio: data.general.tipusActuacio,
            EmpresaDistribuidora: data.general.empresaDistribuidora,
            SeccioDerivacioIndiv: data.general.seccioDerivacioIndiv,
            IGA: data.general.iga,
            EmpresaInstaladora: profile.empresa || '',
            Data: data.general.data,
            chkNova: data.general.tipusActuacio?.toUpperCase().includes('NOV') ? 'X' : ' ',
            chkAmpliacio: data.general.tipusActuacio?.toUpperCase().includes('AMPLI') ? 'X' : ' ',
            chkReforma: data.general.tipusActuacio?.toUpperCase().includes('REFORM') ? 'X' : ' ',
            CaractEdifici: data.general.caractEdifici,
            Superficie: data.general.superficie,
            Tensio: data.general.tensio,
            PotenciaMax: data.general.potenciaMax,
            PotenciaInstalar: data.general.potenciaInstalar,
            ResistTierra: data.general.resistTierra,
            circuits: data.circuits,
            diferencials: data.diferencials || []
        });

        const buf = doc.getZip().generate({
            type: "nodebuffer",
            compression: "DEFLATE",
        });

        const outputPath = this.getOutputPath(`ELEC3_filled_${Date.now()}.docx`);
        fs.writeFileSync(outputPath, buf);
        return outputPath;
    }

    async fillDictamenDocx(data: DictamenFormData, region: string = 'catalunya'): Promise<string> {
        const PizZip = require("pizzip");
        const Docxtemplater = require("docxtemplater");

        console.log('Filling DICTAMEN DOCX template...');
        const templatePath = this.getTemplatePath(region, 'DICTAMEN DE RECONEIXEMENT COMPLERT EN BLANC.docx');
        
        if (!fs.existsSync(templatePath)) throw new Error(`Template not found at ${templatePath}`);
        
        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter() { return ""; }
        });

        const profile = this.loadInstallerProfile() || {};
        
        // Context base
        const ctx: any = {
            Titular: data.general.titular || '',
            Emplacament: data.general.emplaçament || '',
            Localitat: data.general.localitat || '',
            CP: data.general.cp || '',
            DataRevisio: data.general.dataRevisio || '',
            Activitat: data.general.activitat || '',
            Expedient: data.general.expedient || '',
            EmpresaDistribuidora: data.general.empresaDistribuidora || '',
            PotenciaMax: data.general.potenciaMax || '',
            PotenciaContractada: data.general.potenciaContractada || '',
            PotenciaMaxComp: data.general.potenciaMaxComp || '',
            PotenciaContractadaComp: data.general.potenciaContractadaComp || '',
            Tensio: data.general.tensio || '',
            EmpresaInstaladora: profile.empresa || '',
            InsNum: profile.inscripcio || '',
            InsDom: profile.domicili || '',
            InsTel: profile.telefon || '',
            InsCat: profile.categoria || '',
            InsAut: profile.autoritzat || '',
            DataAvui: new Date().toLocaleDateString('es-ES')
        };

        // Generar els 42 items (Correcte per defecte)
        for (let i = 1; i <= 42; i++) {
            ctx[`cC${i}`] = 'X';
            ctx[`cI${i}`] = ' ';
            ctx[`Obs${i}`] = '';
        }

        // Aplicar les anomalies
        if (data.anomalies) {
            for (const anom of data.anomalies) {
                if (anom.id >= 1 && anom.id <= 42) {
                    ctx[`cC${anom.id}`] = ' ';
                    ctx[`cI${anom.id}`] = 'X';
                    ctx[`Obs${anom.id}`] = anom.observacio || '';
                }
            }
        }

        doc.render(ctx);

        const buf = doc.getZip().generate({
            type: "nodebuffer",
            compression: "DEFLATE",
        });

        const outputPath = this.getOutputPath(`DICTAMEN_filled_${Date.now()}.docx`);
        fs.writeFileSync(outputPath, buf);
        return outputPath;
    }
}

// ============================================================================
// Helpers per a la injecció XFA amb consciència de ruta (usats per fillXfaByPath).
// Fora de la classe perquè són funcions pures que es puguin testejar sol.
// ============================================================================

const XML_NAME_CHARS = /[A-Za-z0-9_:.-]/;

/**
 * Cerca la propera aparició d'un tag de tancament (`</NAME>`) admetent
 * whitespace/newline entre el nom i el `>` — cosa comú als XFA (`</TAG\n>`).
 * Retorna la posició d'inici del `</` o -1.
 */
function findCloseTag(xml: string, name: string, fromIdx: number, scopeEnd: number): number {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`</${escaped}\\s*>`, 'g');
    re.lastIndex = fromIdx;
    const m = re.exec(xml);
    if (!m) return -1;
    if (m.index >= scopeEnd) return -1;
    return m.index;
}

/**
 * Longitud completa d'un tag de tancament trobat amb findCloseTag: cobreix
 * el whitespace intern (`</TAG\n>` fa 8 caràcters, no 6).
 */
function closeTagLength(xml: string, closeIdx: number): number {
    const gt = xml.indexOf('>', closeIdx);
    return gt === -1 ? 0 : gt - closeIdx + 1;
}

function escapeXmlText(value: string | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeXmlAttr(value: string): string {
    return escapeXmlText(value).replace(/"/g, '&quot;');
}

/**
 * Escaneja `xml` entre `scopeStart` i `scopeEnd` mantenint la profunditat
 * d'anidament. Retorna la primera ocurrència del tag `tag` a **profunditat
 * 0** dins l'scope — així no es confonen `<TXT_Nom>` de l'arrel amb
 * `<TXT_Nom>` de dins `<sDeclaracio>`.
 *
 * Suporta tres formes: `<TAG/>`, `<TAG></TAG>`, `<TAG>valor</TAG>`, i
 * atributs opcionals amb qualsevol whitespace/newlines (el XFA sovint
 * els escriu així).
 */
function findTagAtTopLevel(
    xml: string,
    tag: string,
    scopeStart: number,
    scopeEnd: number,
): { start: number; end: number; isSelfClosing: boolean } | null {
    let depth = 0;
    let i = scopeStart;
    while (i < scopeEnd) {
        if (xml.charAt(i) !== '<') { i++; continue; }
        const next = xml.charAt(i + 1);
        if (next === '/') {
            const gt = xml.indexOf('>', i + 2);
            if (gt === -1 || gt >= scopeEnd) return null;
            depth--;
            if (depth < 0) return null;
            i = gt + 1;
            continue;
        }
        if (next === '?' || next === '!') {
            const gt = xml.indexOf('>', i + 2);
            if (gt === -1) return null;
            i = gt + 1;
            continue;
        }
        let k = i + 1;
        while (k < scopeEnd && XML_NAME_CHARS.test(xml.charAt(k))) k++;
        const name = xml.slice(i + 1, k);
        const gt = xml.indexOf('>', k);
        if (gt === -1 || gt >= scopeEnd) return null;
        const isSelfClosing = xml.charAt(gt - 1) === '/';

        if (name === tag && depth === 0) {
            if (isSelfClosing) return { start: i, end: gt + 1, isSelfClosing: true };
            const closeIdx = findCloseTag(xml, tag, gt + 1, scopeEnd);
            if (closeIdx === -1) return null;
            return { start: i, end: closeIdx + closeTagLength(xml, closeIdx), isSelfClosing: false };
        }
        if (!isSelfClosing) depth++;
        i = gt + 1;
    }
    return null;
}

/**
 * Escaneja `xml` entre `scopeStart` i `scopeEnd` i retorna el primer
 * element XML directament dins l'scope (ignorant instruccions com
 * `<?xml?>`, comentaris i tancaments). Es fa servir per baixar
 * l'arbre nivell a nivell sense que el depth-tracking global s'espatlli
 * quan s'entra a un subnivell.
 */
function findFirstChildElement(
    xml: string,
    scopeStart: number,
    scopeEnd: number,
): { name: string; contentStart: number; contentEnd: number; isSelfClosing: boolean } | null {
    let i = scopeStart;
    while (i < scopeEnd) {
        if (xml.charAt(i) !== '<') { i++; continue; }
        const next = xml.charAt(i + 1);
        if (next === '?' || next === '!' || next === '/') {
            const gt = xml.indexOf('>', i);
            if (gt === -1 || gt >= scopeEnd) return null;
            i = gt + 1;
            continue;
        }
        let k = i + 1;
        while (k < scopeEnd && XML_NAME_CHARS.test(xml.charAt(k))) k++;
        const name = xml.slice(i + 1, k);
        const gt = xml.indexOf('>', k);
        if (gt === -1 || gt >= scopeEnd) return null;
        const isSelfClosing = xml.charAt(gt - 1) === '/';
        if (isSelfClosing) return { name, contentStart: -1, contentEnd: -1, isSelfClosing: true };
        const closeIdx = findCloseTag(xml, name, gt + 1, scopeEnd);
        if (closeIdx === -1) return null;
        return { name, contentStart: gt + 1, contentEnd: closeIdx, isSelfClosing: false };
    }
    return null;
}

/**
 * Aplica una injecció a l'XML del datasets. L'estructura XFA sempre és
 * `<xfa:datasets><xfa:data><ROOT>…camps…</ROOT></xfa:data></xfa:datasets>`;
 * ROOT és el bloc arrel dels camps (típicament `<DATA>` en els PDFs de
 * Catalunya, però podria ser un altre nom). Naveguem-hi automàticament
 * i llavors baixem per `parentPath` dins seu.
 */
export function applyXfaInjection(xml: string, inj: XfaInjection): string {
    const dsLoc = findFirstChildElement(xml, 0, xml.length);
    if (!dsLoc || dsLoc.isSelfClosing || !dsLoc.name.endsWith('datasets')) return xml;
    const dataLoc = findFirstChildElement(xml, dsLoc.contentStart, dsLoc.contentEnd);
    if (!dataLoc || dataLoc.isSelfClosing || !dataLoc.name.endsWith('data')) return xml;
    const rootLoc = findFirstChildElement(xml, dataLoc.contentStart, dataLoc.contentEnd);
    if (!rootLoc || rootLoc.isSelfClosing) return xml;
    let scopeStart = rootLoc.contentStart;
    let scopeEnd = rootLoc.contentEnd;

    for (const tag of inj.parentPath) {
        let found = findTagAtTopLevel(xml, tag, scopeStart, scopeEnd);
        if (!found) {
            if (!inj.createParents) return xml;
            const insertion = `<${tag}></${tag}>`;
            xml = xml.slice(0, scopeEnd) + insertion + xml.slice(scopeEnd);
            scopeEnd += insertion.length;
            found = findTagAtTopLevel(xml, tag, scopeStart, scopeEnd);
            if (!found) return xml;
        }
        if (found.isSelfClosing) {
            // Convertim `<TAG/>` en `<TAG></TAG>` per poder-hi entrar
            const openEnd = xml.indexOf('/>', found.start) + 2;
            const replacement = `<${tag}></${tag}>`;
            xml = xml.slice(0, found.start) + replacement + xml.slice(openEnd);
            scopeEnd += replacement.length - (openEnd - found.start);
            found = findTagAtTopLevel(xml, tag, scopeStart, scopeEnd);
            if (!found || found.isSelfClosing) return xml;
        }
        const openTagEnd = xml.indexOf('>', found.start) + 1;
        // No podem usar lastIndexOf(`</${tag}>`) — al XFA el tancament pot
        // portar whitespace intern (`</TAG\n>`). Fem servir findCloseTag.
        const closeTagStart = findCloseTag(xml, tag, openTagEnd, found.end);
        scopeStart = openTagEnd;
        scopeEnd = closeTagStart === -1 ? found.end : closeTagStart;
    }

    for (const [tag, rawVal] of Object.entries(inj.fields)) {
        if (rawVal === undefined || rawVal === null || rawVal === '') continue;
        const value = escapeXmlText(rawVal);
        const existing = findTagAtTopLevel(xml, tag, scopeStart, scopeEnd);
        const replacement = `<${tag}>${value}</${tag}>`;
        if (existing) {
            const delta = replacement.length - (existing.end - existing.start);
            xml = xml.slice(0, existing.start) + replacement + xml.slice(existing.end);
            scopeEnd += delta;
        } else if (inj.createMissing) {
            xml = xml.slice(0, scopeEnd) + replacement + xml.slice(scopeEnd);
            scopeEnd += replacement.length;
        }
    }
    return xml;
}

/**
 * Modifica el packet `template` per canviar `<bind match="none"/>` per
 * `<bind match="dataRef" ref="…"/>` en els camps indicats. Serveix per
 * habilitar camps visuals que el dissenyador del PDF va deixar sense
 * lligar a datasets a propòsit.
 *
 * Toca només el `<bind ...>` del camp identificat per name, res més.
 */
export function patchXfaTemplate(xml: string, patches: XfaTemplatePatch[]): string {
    for (const patch of patches) {
        const fieldMarker = `<field name="${patch.fieldName}"`;
        let searchFrom = 0;
        while (true) {
            const fieldStart = xml.indexOf(fieldMarker, searchFrom);
            if (fieldStart === -1) break;
            const fieldEnd = xml.indexOf('</field', fieldStart);
            if (fieldEnd === -1) break;
            const fieldBody = xml.slice(fieldStart, fieldEnd);
            // Busquem <bind match="none" ... /> (self-closing) dins el body
            const bindRegex = /<bind\s+match="none"[^/>]*\/>/;
            const bindMatch = fieldBody.match(bindRegex);
            if (bindMatch) {
                const newBind = `<bind match="dataRef" ref="${escapeXmlAttr(patch.bindRef)}"/>`;
                const idx = fieldStart + (bindMatch.index ?? 0);
                xml = xml.slice(0, idx) + newBind + xml.slice(idx + bindMatch[0].length);
                searchFrom = idx + newBind.length;
            } else {
                searchFrom = fieldEnd;
            }
        }
    }
    return xml;
}
