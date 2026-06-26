import { ConnectorFactory } from '../../../connectors';
import { ProcessedMessage, ActionResult, Product } from '../../../models/types';
import { ActionHandler } from './ActionHandlers';
import { storeCsv, toCsvString, buildCsvFilename } from '../../utils/tools/CsvStorage';

/**
* Handler: Consulta de Precio
*/

export class PriceQueryHandler implements ActionHandler {
    async handle(context: ProcessedMessage): Promise<ActionResult> {
        // Simulated delay of 10 seconds
        //await new Promise(resolve => setTimeout(resolve, 10000));
        const { entities } = context;
        // Validar que tenemos el producto
        if (!entities?.producto) {
            return {
                success: false,
                needsMoreInfo: true,
                question: '¿Qué producto te interesa?',
                nextState: 'awaiting_product'
            };
        }

        // Buscar productos en base de datos
        const matches = await this.findProducts(entities.producto);

        if (matches.length === 0) {
            const suggestions = await this.getSuggestions(entities.producto);

            return {
                success: false,
                productNotFound: true,
                message: `No encontré "${entities.producto}". ¿Podrías ser más específico?`,
                suggestions
            };
        }

        // Múltiples resultados → generar CSV para descarga
        if (matches.length > 1) {
            const csvRows = matches.map(p => ({
                nombre: p.name,
                precio: p.price,
                moneda: p.currency,
                stock: p.stock,
                categoria: p.category ?? '',
                disponible: p.available ? 'Sí' : 'No'
            }));
            const csvId = storeCsv(toCsvString(csvRows), buildCsvFilename('productos', { producto: entities.producto }));

            return {
                success: true,
                multipleResults: true,
                csvDownloadId: csvId,
                data: {
                    count: matches.length,
                    searchTerm: entities.producto
                },
                message: `Encontré ${matches.length} productos para "${entities.producto}". Podés descargar la lista completa.`
            };
        }

        const product = matches[0];

        // Aplicar reglas de negocio (descuentos)
        const finalPrice = await this.applyBusinessRules(product, context);

        return {
            success: true,
            data: {
                product: product.name,
                ...finalPrice, // expande: original, final, discount, currency
                stock: product.stock,
                available: product.available
            }
        };
    }

    private async findProducts(query: string): Promise<Product[]> {
        const db = await ConnectorFactory.getDatabase();
        const queryResult = await db.collection<Product>('products').find({});
        const products = await queryResult.toArray();
        const lowerQuery = query.toLowerCase();
        return products.filter((p: Product) => p.name.toLowerCase().includes(lowerQuery));
    }

    private async getSuggestions(query: string): Promise<Product[]> {
        const db = await ConnectorFactory.getDatabase();
        const queryResult = await db.collection<Product>('products').find({});
        return (await queryResult.limit(3).toArray());
    }

    private async applyBusinessRules(
        product: Product,
        context: ProcessedMessage
    ): Promise<any> {
        let price = product.price;
        let discount = 0;

        // Descuento para clientes VIP
        if (context.userProfile?.tier === 'VIP') {
            discount = price * 0.15;
            price -= discount;
        }

        return {
            original: product.price,
            final: price,
            discount,
            currency: product.currency
        };
    }
}
