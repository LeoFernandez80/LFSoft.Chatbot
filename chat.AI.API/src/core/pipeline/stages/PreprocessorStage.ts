/**
* Pipeline Stages - Etapas de procesamiento de mensajes
*/

import { ProcessedMessage } from '../../../models/types';
import { engineClient } from '../../clients/EngineClient';

/**
* Stage Base Interface
*/
export interface PipelineStage {
name: string;
critical: boolean;
execute(context: ProcessedMessage): Promise<ProcessedMessage>;
}

/**
* Stage 1: Preprocessor
* Normalización, corrección ortográfica, detección de idioma
*/
export class PreprocessorStage implements PipelineStage {
name = 'preprocessor';
critical = false;

async execute(context: ProcessedMessage): Promise<ProcessedMessage> {
let content = context.currentMessage.content;

// 1. Normalización de texto
content = this.normalize(content);

// 2. Corrección ortográfica (usando Engine)
const correctionResponse = await engineClient.correctSpelling(content);
content = correctionResponse.correctedText;

// 3. Expansión de abreviaturas
content = this.expandAbbreviations(content);

// 4. Detección de idioma (usando Engine)
const languageResponse = await engineClient.detectLanguage(content);
context.metadata.language = languageResponse.language;

context.currentMessage.content = content;
context.currentMessage.preprocessed = true;

return context;
}

private normalize(text: string): string {
// Minúsculas
text = text.toLowerCase();

// Normalizar puntuación
text = text.replace(/[¿?]+/g, '?');
text = text.replace(/[¡!]+/g, '!');

// Normalizar espacios
text = text.replace(/\s+/g, ' ').trim();

return text;
}

private expandAbbreviations(text: string): string {
const abbreviations: { [key: string]: string } = {
'info': 'información',
'doc': 'documento',
'docs': 'documentos',
'tel': 'teléfono',
'cel': 'celular'
};

let expanded = text;
for (const [abbr, full] of Object.entries(abbreviations)) {
const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
expanded = expanded.replace(regex, full);
}

return expanded;
}
}