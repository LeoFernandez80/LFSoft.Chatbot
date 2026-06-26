import { IGraphQLConnector, GraphQLRequest, GraphQLResponse, GraphQLError } from '../../connectors/base/IGraphQLConnector';

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_PRODUCTS = [
  { id: 'p-001', name: 'Laptop Dell XPS 15', price: 1499.99, currency: 'USD', stock: 12, category: 'laptops', available: true },
  { id: 'p-002', name: 'Monitor LG 27"', price: 349.99, currency: 'USD', stock: 30, category: 'monitors', available: true },
  { id: 'p-003', name: 'Teclado Mecánico Logitech', price: 129.99, currency: 'USD', stock: 0, category: 'keyboards', available: false },
  { id: 'p-004', name: 'Mouse Inalámbrico MX Master', price: 99.99, currency: 'USD', stock: 45, category: 'mice', available: true },
  { id: 'p-005', name: 'Auriculares Sony WH-1000XM5', price: 349.99, currency: 'USD', stock: 8, category: 'headphones', available: true }
];

const MOCK_USERS = [
  { id: 'u-001', name: 'Ana García', email: 'ana@empresa.com', tier: 'VIP', tenantId: 'empresa-a' },
  { id: 'u-002', name: 'Carlos López', email: 'carlos@empresa.com', tier: 'regular', tenantId: 'empresa-b' },
  { id: 'u-003', name: 'María Rodríguez', email: 'maria@empresa.com', tier: 'premium', tenantId: 'empresa-c' }
];

const MOCK_ORDERS = [
  { id: 'ord-001', userId: 'u-001', status: 'En camino', estimatedDelivery: '2026-06-22', total: 1499.99 },
  { id: 'ord-002', userId: 'u-002', status: 'Entregado', estimatedDelivery: '2026-06-18', total: 199.98 },
  { id: 'ord-003', userId: 'u-001', status: 'Procesando', estimatedDelivery: '2026-06-25', total: 349.99 }
];

const MOCK_COLABORADORES = [
  { id: 'c-001', nombres: 'Ana María', apellidos: 'García Pérez', documento: '12345678', estado: 'activo' },
  { id: 'c-002', nombres: 'Carlos Alberto', apellidos: 'López Díaz', documento: '23456789', estado: 'inactivo' },
  { id: 'c-003', nombres: 'María José', apellidos: 'Rodríguez Sosa', documento: '34567890', estado: 'activo' },
  { id: 'c-004', nombres: 'Juan Pablo', apellidos: 'Martínez Gómez', documento: '45678901', estado: 'suspendido' },
  { id: 'c-005', nombres: 'Lucía Fernanda', apellidos: 'Benítez García', documento: '56789012', estado: 'activo' }
];

// ─── Query Parser ─────────────────────────────────────────────────────────────

interface ParsedOperation {
  type: 'query' | 'mutation';
  operationName?: string;
  rootField: string;
  args: Record<string, any>;
  fields: string[];
}

function parseOperation(gql: string, variables: Record<string, any> = {}): ParsedOperation | null {
  const trimmed = gql.trim();
  const typeMatch = trimmed.match(/^(query|mutation)\s*(\w+)?\s*\{/);
  const opType = typeMatch ? (typeMatch[1] as 'query' | 'mutation') : 'query';
  const opName = typeMatch?.[2];

  const bodyStart = trimmed.indexOf('{');
  if (bodyStart === -1) return null;
  const body = trimmed.slice(bodyStart + 1, trimmed.lastIndexOf('}')).trim();

  const rootMatch = body.match(/^(\w+)\s*(\(([^)]*)\))?\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s);
  if (!rootMatch) return null;

  const rootField = rootMatch[1];
  const rawArgs = rootMatch[3] ?? '';
  const rawFields = rootMatch[4] ?? '';
  
  const args: Record<string, any> = {};
  const argMatches = rawArgs.matchAll(/(\w+)\s*:\s*("([^"]*)"|\$(\w+)|(\d+(?:\.\d+)?)|true|false)/g);
  for (const m of argMatches) {
    const key = m[1];
    if (m[3] !== undefined) args[key] = m[3];
    else if (m[4] !== undefined) args[key] = variables[m[4]];
    else if (m[5] !== undefined) args[key] = Number(m[5]);
    else args[key] = m[2] === 'true';
  }

  const fields = [...rawFields.matchAll(/\b(\w+)\b(?!\s*\{)/g)].map(m => m[1]).filter(Boolean);
  return { type: opType, operationName: opName, rootField, args, fields };
}

function pick(obj: any, fields: string[]): any {
  if (!fields.length) return obj;
  const result: any = {};
  fields.forEach(f => { if (f in obj) result[f] = obj[f]; });
  return result;
}

// ─── Resolvers ────────────────────────────────────────────────────────────────

type Resolver = (args: Record<string, any>, fields: string[]) => any;

const RESOLVERS: Record<string, Resolver> = {
  products: (args, fields) => {
    let list = [...MOCK_PRODUCTS];
    if (args.category) list = list.filter(p => p.category === args.category);
    if (args.available !== undefined) list = list.filter(p => p.available === args.available);
    if (args.q) list = list.filter(p => p.name.toLowerCase().includes(String(args.q).toLowerCase()));
    if (args.limit) list = list.slice(0, Number(args.limit));
    return list.map(p => pick(p, fields));
  },
  
  product: (args, fields) => {
    const p = MOCK_PRODUCTS.find(p => p.id === args.id || p.name.toLowerCase().includes(String(args.name || '').toLowerCase()));
    return p ? pick(p, fields) : null;
  },
  
  users: (args, fields) => {
    let list = [...MOCK_USERS];
    if (args.tenantId) list = list.filter(u => u.tenantId === args.tenantId);
    return list.map(u => pick(u, fields));
  },
  
  user: (args, fields) => {
    const u = MOCK_USERS.find(u => u.id === args.id || u.email === args.email);
    return u ? pick(u, fields) : null;
  },
  
  orders: (args, fields) => {
    let list = [...MOCK_ORDERS];
    if (args.userId) list = list.filter(o => o.userId === args.userId);
    return list.map(o => pick(o, fields));
  },

  colaboradores: (args, fields) => {
    let list = [...MOCK_COLABORADORES];
    // Normaliza a minúsculas y sin acentos para comparar (búsqueda en español)
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    // Búsqueda libre por nombres, apellidos o documento
    if (args.q) {
      const q = norm(String(args.q));
      list = list.filter(c =>
        norm(c.nombres).includes(q) ||
        norm(c.apellidos).includes(q) ||
        norm(c.documento).includes(q)
      );
    }
    if (args.estado) {
      const e = String(args.estado).toLowerCase();
      list = list.filter(c => c.estado.toLowerCase() === e);
    }
    if (args.documento) {
      const d = String(args.documento).toLowerCase();
      list = list.filter(c => c.documento.toLowerCase().includes(d));
    }
    if (args.limit) list = list.slice(0, Number(args.limit));
    return list.map(c => pick(c, fields));
  },
  
  order: (args, fields) => {
    const o = MOCK_ORDERS.find(o => o.id === args.id);
    return o ? pick(o, fields) : null;
  },
  
  createOrder: (args, fields) => {
    const order = { id: `ord-${Date.now()}`, status: 'Procesando', ...args };
    return pick(order, fields);
  },
  
  updateOrderStatus: (args, fields) => {
    const order = MOCK_ORDERS.find(o => o.id === args.id);
    if (!order) return null;
    const updated = { ...order, status: args.status };
    return pick(updated, fields);
  }
};

// ─── Connector ────────────────────────────────────────────────────────────────

export class GraphQLSimulator implements IGraphQLConnector {
  readonly endpoint: string;
  private connected = false;

  constructor(endpoint = 'https://graphql.simulada.local/graphql') {
    this.endpoint = endpoint;
  }

  async connect(): Promise<void> {
    this.connected = true;
    console.log(`[GraphQLSimulator] Connected → ${this.endpoint}`);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('[GraphQLSimulator] Disconnected');
  }

  isConnected(): boolean { return this.connected; }

  async query<T = any>(req: GraphQLRequest): Promise<GraphQLResponse<T>> {
    return this.execute<T>(req);
  }

  async mutate<T = any>(req: GraphQLRequest): Promise<GraphQLResponse<T>> {
    return this.execute<T>(req);
  }

  private execute<T>(req: GraphQLRequest): GraphQLResponse<T> {
    const op = parseOperation(req.query, req.variables ?? {});

    if (!op) {
      return { data: null, errors: [{ message: 'Failed to parse GraphQL operation' }] };
    }

    const resolver = RESOLVERS[op.rootField];
    if (!resolver) {
      const error: GraphQLError = { message: `Unknown field: ${op.rootField}`, path: [op.rootField] };
      return { data: null, errors: [error] };
    }

    try {
      const result = resolver(op.args, op.fields);
      console.log(`[GraphQLSimulator] ${op.type} ${op.rootField}(${JSON.stringify(op.args)}) → ok`);
      return { data: { [op.rootField]: result } as T };
    } catch (err: any) {
      return { data: null, errors: [{ message: err.message ?? 'Resolver error', path: [op.rootField] }] };
    }
  }
}
