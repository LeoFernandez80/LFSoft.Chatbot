/**
* Stage 3: Intent Classifier
* Clasifica la intención del usuario y extrae entidades
*/

import { PipelineStage } from './PreprocessorStage';
import { ProcessedMessage, IntentClassification } from '../../../models/types';
import { engineClient } from '../../clients/EngineClient';
import { extractFilters, extractRequestedFields } from '../../utils/helpers/FieldQuery';
import { CRITERIO_FIELDS } from '../../utils/fields/criterioFields';
import { ACTIVIDAD_FIELDS } from '../../utils/fields/actividadFields';

export class IntentClassifierStage implements PipelineStage {
    name = 'intent_classifier';
    critical = true;

    async execute(context: ProcessedMessage): Promise<ProcessedMessage> {
        const message = context.currentMessage.content;
        const sessionContext = context.session.context;

        // Estrategia multi-layer de clasificación

        // 1. Rule-based (rápido, para casos obvios)
        const ruleBasedIntent = this.classifyWithRules(message);
        if (ruleBasedIntent.confidence >= 0.9) {
            context.intent = ruleBasedIntent;
            context.metadata.classificationMethod = 'rule_based';

            // Extraer entidades
            context.entities = await this.extractEntities(message, context.intent);

            // Actualizar contexto de sesión
            this.updateSessionContext(context);

            return context;
        }

        // 2. LLM (para casos ambiguos)
        const llmIntent = await this.classifyWithLLM(
            message,
            sessionContext,
            context.tenantConfig
        );
        context.intent = llmIntent;
        context.metadata.classificationMethod = 'llm';

        // 3. Extraer entidades
        context.entities = await this.extractEntities(message, context.intent);

        // 4. Actualizar contexto de sesión
        this.updateSessionContext(context);

        return context;
    }

    private classifyWithRules(message: string): IntentClassification {
        const rules = [
            {
                intent: 'saludo',
                patterns: /^(hola|buenos días|buenas tardes|hey|hi)/i,
                confidence: 0.95
            },
            {
                intent: 'despedida',
                patterns: /^(adiós|hasta luego|chao|bye|gracias y adiós)/i,
                confidence: 0.95
            },
            {
                intent: 'consulta_precio',
                patterns: /(cuánto cuesta|precio de|valor de|cuánto vale)/i,
                confidence: 0.9
            },
            {
                intent: 'consulta_stock',
                patterns: /(hay stock|tienen disponible|hay disponibilidad|tienen en stock|tienen)/i,
                confidence: 0.9
            },
            {
                intent: 'realizar_compra',
                patterns: /(quiero comprar|comprar|agregar al carrito|añadir al carrito)/i,
                confidence: 0.85
            },
            {
                intent: 'rastrear_pedido',
                patterns: /(dónde está mi pedido|rastrear pedido|tracking|seguimiento)/i,
                confidence: 0.9
            },
            {
                intent: 'search_employees',
                patterns: /(busca|búscame|buscame|buscar|necesito|quiero|quisiera|traeme|tráeme|dame|muéstrame|muestrame|mostrame|muestra|ver|listar|lista|consultar|consulta|obtener|encontrar|encuentra|filtrar|filtra)\b.*\b(colaboradores?|empleados?)/i,
                confidence: 0.9
            },
            {
                intent: 'search_activities',
                patterns: /(busca|búscame|buscame|buscar|necesito|quiero|quisiera|traeme|tráeme|dame|muéstrame|muestrame|mostrame|muestra|ver|listar|lista|consultar|consulta|obtener|encontrar|encuentra|filtrar|filtra)\b.*\b(actividad?|actividades?)/i,
                confidence: 0.9
            },
            {
                intent: 'search_texts',
                patterns: /(busca|búscame|buscame|buscar|necesito|quiero|quisiera|traeme|tráeme|dame|muéstrame|muestrame|mostrame|muestra|ver|listar|lista|consultar|consulta|obtener|encontrar|encuentra|filtrar|filtra)\b.*\b(textos?)/i,
                confidence: 0.9
            },
            {
                intent: 'search_criteria',
                patterns: /(busca|búscame|buscame|buscar|necesito|quiero|quisiera|traeme|tráeme|dame|muéstrame|muestrame|mostrame|muestra|ver|listar|lista|consultar|consulta|obtener|encontrar|encuentra|filtrar|filtra)\b.*\b(criterios?)/i,
                confidence: 0.9
            },
            {
                intent: 'search_parity',
                patterns: /(paridad|cotización|dólar|euro|tipo de cambio|cuánto está el dólar|cuánto está el euro)/i,
                confidence: 0.9
            }
        ];

        for (const rule of rules) {
            if (rule.patterns.test(message)) {
                return {
                    name: rule.intent,
                    confidence: rule.confidence,
                    method: 'rule'
                };
            }
        }

        return { name: 'unknown', confidence: 0.0 };
    }

    private async classifyWithLLM(
        message: string,
        sessionContext: any,
        tenantConfig: any
    ): Promise<IntentClassification> {
        const intents = tenantConfig.intents || [
            'saludo', 'despedida', 'consulta_precio', 'consulta_stock',
            'realizar_compra', 'soporte_tecnico', 'queja', 'otro'
        ];

        // Usar el Engine para clasificar intención
        const result = await engineClient.classifyIntent({
            text: message,
            intents
        });

        return {
            name: result.intent,
            confidence: result.confidence,
            reasoning: result.reasoning,
            method: 'llm'
        };
    }

    private async extractEntities(
        message: string,
        intent: IntentClassification
    ): Promise<{ [key: string]: any }> {
        const entities: { [key: string]: any } = {};

        // NER (Named Entity Recognition) usando Engine
        const nerResponse = await engineClient.extractEntities(message);
        const ner = nerResponse.entities;

        // Entidades específicas por intención
        switch (intent.name) {
            case 'consulta_precio':
            case 'consulta_stock':
                entities.producto = this.extractProduct(message, ner);
                entities.categoria = this.extractCategory(message);
                break;

            case 'realizar_compra':
                entities.producto = this.extractProduct(message, ner);
                entities.cantidad = this.extractQuantity(message);
                break;

            case 'rastrear_pedido':
                entities.orderNumber = this.extractOrderNumber(message, ner);
                break;

            case 'search_parity':
                entities.moneda = this.extractCurrency(message);
                entities.fecha = this.extractDate(message);
                break;

            case 'search_employees':
                entities.documento = this.extractDocumento(message);
                entities.estado = this.extractEstadoColaborador(message);
                entities.termino = this.extractColaboradorTermino(message);
                break;

            case 'search_activities': {
                // Proyección (qué devolver) + filtros (campo + valor) desde el catálogo de campos.
                // extractFilters corre primero y consume el texto de los filtros; el resto se usa
                // para la proyección (vacío = subconjunto por defecto; "todos los campos" = todos).
                const { filters, rest } = extractFilters(message, ACTIVIDAD_FIELDS);
                const projected = extractRequestedFields(rest, ACTIVIDAD_FIELDS);
                entities.filters = filters;     // Filter[]    → WHERE
                entities.fields = projected;    // FieldSpec[] → SELECT
                // Fallback: término libre que matchea código o descripción (solo si no hubo filtros
                // por campo), para pedidos como "busca las actividades de soldadura". Se quitan del
                // mensaje los alias de los campos pedidos en la proyección para que no contaminen el término.
                if (filters.length === 0) {
                    let leftover = message;
                    for (const f of projected) {
                        for (const a of f.aliases) {
                            leftover = leftover.replace(new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ');
                        }
                    }
                    entities.termino = this.extractActividadTermino(leftover);
                } else {
                    entities.termino = null;
                }
                break;
            }

            case 'search_texts':
                // Único criterio: término libre que matchea código, descripción o detalle del texto
                entities.termino = this.extractTextoTermino(message);
                break;

            case 'search_criteria': {
                // Proyección (qué devolver) + filtros (campo + valor) desde el catálogo de campos.
                // extractFilters corre primero y consume el texto de los filtros; el resto se
                // usa para la proyección (vacío = devolver todos los campos del catálogo).
                const { filters, rest } = extractFilters(message, CRITERIO_FIELDS);
                entities.filters = filters;                                      // Filter[]    → WHERE
                entities.fields = extractRequestedFields(rest, CRITERIO_FIELDS); // FieldSpec[] → SELECT
                break;
            }
        }

        return entities;
    }

    private extractProduct(message: string, ner: any[]): string | null {
        // Buscar en entidades de NER
        const products = ner.filter(e => e.type === 'PRODUCT');
        if (products.length > 0) {
            return products[0].text;
        }

        // Patrones comunes
        const productPatterns = [
            /laptop\s+[\w\s]+/i,
            /celular\s+[\w\s]+/i,
            /iphone\s+\d+/i,
            /samsung\s+[\w\s]+/i,
            /dell\s+[\w\s]+/i,
            /lenovo\s+[\w\s]+/i,
            /hp\s+[\w\s]+/i,
            /monitor\s+[\w\s]+/i,
            /drone\s+[\w\s]+/i,
            /impresora\s+[\w\s]+/i,
            /teclado\s+[\w\s]+/i,
            /mouse\s+[\w\s]+/i,
            /auriculares\s+[\w\s]+/i,
            /smartwatch\s+[\w\s]+/i,
            /cámara\s+[\w\s]+/i,
            /proyector\s+[\w\s]+/i,
            /router\s+[\w\s]+/i,
            /servidor\s+[\w\s]+/i,
            /workstation\s+[\w\s]+/i,
            /all-in-one\s+[\w\s]+/i
        ];

        for (const pattern of productPatterns) {
            const match = message.match(pattern);
            if (match) {
                return match[0].trim();
            }
        }

        return null;
    }

    private extractCategory(message: string): string | null {
        const categories = ['tecnología', 'hogar', 'ropa', 'deportes', 'juguetes'];

        for (const cat of categories) {
            if (message.toLowerCase().includes(cat)) {
                return cat;
            }
        }

        return null;
    }

    private extractQuantity(message: string): number {
        const match = message.match(/\b(\d+)\b/);
        return match ? parseInt(match[1]) : 1;
    }

    private extractCurrency(message: string): 'DOLAR' | 'EURO' | 'AMBAS' {
        const lowerMessage = message.toLowerCase();

        const hasDolar = /dólar|dolar|usd/i.test(lowerMessage);
        const hasEuro = /euro|eur/i.test(lowerMessage);

        if (hasDolar && !hasEuro) return 'DOLAR';
        if (hasEuro && !hasDolar) return 'EURO';
        return 'AMBAS';
    }

    /**
     * Extrae una fecha del mensaje para consultas de paridad.
     * Soporta fechas relativas (hoy, ayer, anteayer), formato numérico
     * (dd/mm/yyyy, dd-mm-yy) y formato textual ("24 de junio [de 2026]").
     * Devuelve la fecha en formato ISO 'yyyy-mm-dd', o null si no encuentra fecha.
     */
    private extractDate(message: string): string | null {
        const lower = message.toLowerCase();
        const today = new Date();

        // Formato numérico: dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy
        const numeric = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
        if (numeric) {
            const day = parseInt(numeric[1], 10);
            const month = parseInt(numeric[2], 10);
            let year = parseInt(numeric[3], 10);
            if (year < 100) year += 2000;
            const d = new Date(year, month - 1, day);
            if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month - 1) {
                return this.toISODate(d);
            }
        }

        // Formato textual: "24 de junio" o "24 de junio de 2026"
        // const months: { [key: string]: number } = {
        //   enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
        //   julio: 6, agosto: 7, septiembre: 8, setiembre: 8,
        //   octubre: 9, noviembre: 10, diciembre: 11
        // };
        // const textual = lower.match(/\b(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+de\s+(\d{4}))?\b/);
        // if (textual) {
        //   const day = parseInt(textual[1], 10);
        //   const month = months[textual[2]];
        //   if (month !== undefined) {
        //     const year = textual[3] ? parseInt(textual[3], 10) : today.getFullYear();
        //     const d = new Date(year, month, day);
        //     if (!isNaN(d.getTime()) && d.getDate() === day) {
        //       return this.toISODate(d);
        //     }
        //   }
        // }

        return null;
    }

    /**
     * Formatea una fecha como 'yyyy-mm-dd' (compatible con literales de Access #...#).
     */
    private toISODate(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    /**
     * Extrae un número de documento del mensaje (DNI/cédula/CI o número suelto de 6+ dígitos).
     */
    private extractDocumento(message: string): string | null {
        const labelled = message.match(/\b(?:documento|doc|dni|cédula|cedula|ci)\s*(?:n[°º]?\s*)?[:#]?\s*(\d{5,})/i);
        if (labelled) return labelled[1];
        const bare = message.match(/\b(\d{6,12})\b/);
        return bare ? bare[1] : null;
    }

    /**
     * Detecta el estado de un colaborador (activo / inactivo / suspendido).
     */
    private extractEstadoColaborador(message: string): string | null {
        const lower = message.toLowerCase();
        if (/\bactivos?\b/.test(lower)) return 'activo';
        if (/\binactivos?\b/.test(lower)) return 'inactivo';
        return null;
    }

    /**
     * Obtiene el término libre (nombres/apellidos) quitando del mensaje los verbos
     * de acción, la entidad, los estados, las referencias a documento y conectores.
     */
    private extractColaboradorTermino(message: string): string | null {
        let t = message.toLowerCase();
        // Verbos de acción de búsqueda
        t = t.replace(/\b(busca|búscame|buscame|buscar|necesito|quiero|quisiera|traeme|tráeme|dame|muéstrame|muestrame|mostrame|muestra|ver|listar|lista|consultar|consulta|obtener|encontrar|encuentra|filtrar|filtra)\b/g, ' ');
        // Entidad
        t = t.replace(/\b(colaboradores?|empleados?|personal|trabajadores?|funcionarios?)\b/g, ' ');
        // Estados
        t = t.replace(/\b(activos?|inactivos?||estado)\b/g, ' ');
        // Referencias a documento y números
        t = t.replace(/\b(documento|doc|dni|cédula|cedula|ci|n[°º])\b/g, ' ');
        t = t.replace(/\d+/g, ' ');
        // Conectores y palabras de relleno
        t = t.replace(/\b(de|del|la|el|los|las|un|una|con|por|para|que|se|cuyo|cuyos|cuya|cuyas|llamen?|apellidos?|nombres?|esten?|están|estan|sean?|todos?|todas?)\b/g, ' ');
        // Normalizar
        t = t.replace(/[^0-9a-záéíóúñ\s]/gi, ' ').replace(/\s+/g, ' ').trim();
        return t.length > 0 ? t : null;
    }

    /**
     * Obtiene el término de búsqueda de una actividad (código o descripción),
     * quitando del mensaje los verbos de acción, la entidad y los conectores.
     */
    private extractActividadTermino(message: string): string | null {
        let t = message.toLowerCase();
        // Verbos de acción de búsqueda
        t = t.replace(/\b(busca|búscame|buscame|buscar|necesito|quiero|quisiera|traeme|tráeme|dame|muéstrame|muestrame|mostrame|muestra|ver|listar|lista|consultar|consulta|obtener|encontrar|encuentra|filtrar|filtra)\b/g, ' ');
        // Entidad (singular y plural: "actividad"/"actividades"/"tarea"/"tareas")
        t = t.replace(/\bactividad(es)?\b/g, ' ').replace(/\btareas?\b/g, ' ');
        // Referencias a código/descripción
        t = t.replace(/\b(código|codigo|cod|descripción|descripcion|desc)\b/g, ' ');
        // Palabras que designan "los campos" (proyección), no son parte del término
        t = t.replace(/\b(campos?|datos?|atributos?|columnas?|información|informacion|detalles?|completos?|completas?)\b/g, ' ');
        // Conectores y palabras de relleno
        t = t.replace(/\b(y|e|o|u|de|del|la|el|los|las|un|una|con|para|por|que|se|su|sus|cuyo|cuyos|cuya|cuyas|todos?|todas?)\b/g, ' ');
        // Normalizar (se conservan números por si el término es un código alfanumérico)
        t = t.replace(/[^0-9a-záéíóúñ\s]/gi, ' ').replace(/\s+/g, ' ').trim();
        return t.length > 0 ? t : null;
    }

    /**
     * Obtiene el término de búsqueda de un texto (código, descripción general o detalle),
     * quitando del mensaje los verbos de acción, la entidad y los conectores.
     */
    private extractTextoTermino(message: string): string | null {
        let t = message.toLowerCase();
        // Verbos de acción de búsqueda
        t = t.replace(/\b(busca|búscame|buscame|buscar|necesito|quiero|quisiera|traeme|tráeme|dame|muéstrame|muestrame|mostrame|muestra|ver|listar|lista|consultar|consulta|obtener|encontrar|encuentra|filtrar|filtra)\b/g, ' ');
        // Entidad
        t = t.replace(/\b(textos?)\b/g, ' ');
        // Referencias a código/descripción
        t = t.replace(/\b(código|codigo|cod|descripción|descripcion|desc|detalle|tipo|clasificación|clasificacion)\b/g, ' ');
        // Conectores y palabras de relleno
        t = t.replace(/\b(de|del|la|el|los|las|un|una|con|por|para|que|se|cuyo|cuyos|cuya|cuyas|todos?|todas?)\b/g, ' ');
        // Normalizar (se conservan números por si el término es un código)
        t = t.replace(/[^0-9a-záéíóúñ\s]/gi, ' ').replace(/\s+/g, ' ').trim();
        return t.length > 0 ? t : null;
    }

    private extractOrderNumber(message: string, ner: any[]): string | null {
        const orderNums = ner.filter(e => e.type === 'ORDER_NUMBER');
        if (orderNums.length > 0) {
            return orderNums[0].text;
        }

        const match = message.match(/\b([A-Z0-9]{8,})\b/);
        return match ? match[1] : null;
    }

    private updateSessionContext(context: ProcessedMessage): void {
        context.session.context.lastIntent = context.session.context.currentIntent;
        context.session.context.currentIntent = context.intent!.name;
        context.session.context.entities = {
            ...context.session.context.entities,
            ...context.entities
        };
    }
}