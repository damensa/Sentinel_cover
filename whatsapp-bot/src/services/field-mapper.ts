import fs from 'fs';
import path from 'path';

export class FieldMapper {
    private maps: Record<string, any> = {};

    constructor() {
        this.loadMap('arago', 'C:/Users/dave_/Sentinel cover/Templates/Arago/arago_field_map.json');
        this.loadMap('valencia', 'C:/Users/dave_/Sentinel cover/Templates/Comunitat Valenciana/valencia_field_map.json');
        this.loadMap('madrid', 'C:/Users/dave_/Sentinel cover/Templates/Comunidad de Madrid/madrid_field_map.json');
    }

    private loadMap(region: string, filePath: string) {
        if (fs.existsSync(filePath)) {
            this.maps[region] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    }

    getField(region: string, form: string, cluster: string, field: string): string | null {
        if (!this.maps[region] || !this.maps[region][form]) return null;
        const formMap = this.maps[region][form];
        if (formMap[cluster] && formMap[cluster][field]) {
            return formMap[cluster][field];
        }
        return null;
    }
}

export const fieldMapper = new FieldMapper();
