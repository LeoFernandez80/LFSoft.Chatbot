import { ConnectorFactory } from '../../../../connectors';
import { ProcessedMessage, ActionResult, Product } from '../../../../models/types';
import { ActionHandler } from '../ActionHandlers';
import { storeCsv, toCsvString, buildCsvFilename } from '../../../utils/tools/CsvStorage';

/**
* Handler: Consulta de Stock
*/

export class SearchArticuleStockHandler implements ActionHandler {
    async handle(context: ProcessedMessage): Promise<ActionResult> {
        const { entities } = context;

        if (!entities?.producto) {
            return {
                success: false,
                needsMoreInfo: true,
                question: '¿De qué producto quieres saber el stock?'
            };
        }

        const db = await ConnectorFactory.getDatabase();
        const queryResult = await db.collection<Product>('products').find({});
        const products = await queryResult.toArray();

        const lowerQuery = entities.producto.toLowerCase();
        const matches = products.filter((p: Product) => p.name.toLowerCase().includes(lowerQuery)
        );

        if (matches.length === 0) {
            return {
                success: false,
                productNotFound: true,
                message: `No encontré "${entities.producto}".`
            };
        }

        if (matches.length > 1) {
            const csvRows = matches.map(p => ({
                nombre: p.name,
                stock: p.stock,
                disponible: p.available ? 'Sí' : 'No',
                categoria: p.category ?? ''
            }));
            const csvId = storeCsv(toCsvString(csvRows), buildCsvFilename('stock', { producto: entities.producto }));

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

        return {
            success: true,
            data: {
                product: product.name,
                stock: product.stock,
                available: product.available
            }
        };
    }
}
