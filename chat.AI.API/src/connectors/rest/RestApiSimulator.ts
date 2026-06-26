import { v4 as uuidv4 } from 'uuid';
import { IRestApiConnector, RestRequest, RestResponse } from '../base/IRestApiConnector';

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

// ─── Router ────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Route {
  method: HttpMethod;
  pattern: RegExp;
  paramNames: string[];
  handler: (pathParams: Record<string, string>, req: RestRequest) => RestResponse;
}

function route(
  method: HttpMethod,
  path: string,
  handler: (pathParams: Record<string, string>, req: RestRequest) => RestResponse
): Route {
  const paramNames: string[] = [];
  const pattern = new RegExp(
    '^' + path.replace(/:([^/]+)/g, (_, name) => { paramNames.push(name); return '([^/]+)'; }) + '$'
  );
  return { method, pattern, paramNames, handler };
}

function ok<T>(data: T, status = 200): RestResponse<T> {
  return { status, data };
}

function notFound(message: string): RestResponse {
  return { status: 404, data: { error: message } };
}

function created<T>(data: T): RestResponse<T> {
  return { status: 201, data };
}

// ─── Connector ───────────────────────────────────────────────────────────────

export class RestApiSimulator implements IRestApiConnector {
  readonly baseUrl: string;
  private connected = false;
  private routes: Route[];

  constructor(baseUrl = 'https://api.simulada.local') {
    this.baseUrl = baseUrl;
    this.routes = this.buildRoutes();
  }

  async connect(): Promise<void> {
    this.connected = true;
    console.log(`[RestApiSimulator] Connected → ${this.baseUrl}`);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('[RestApiSimulator] Disconnected');
  }

  isConnected(): boolean { return this.connected; }

  async get<T = any>(path: string, req: RestRequest = {}): Promise<RestResponse<T>> {
    return this.dispatch('GET', path, req) as RestResponse<T>;
  }

  async post<T = any>(path: string, req: RestRequest = {}): Promise<RestResponse<T>> {
    return this.dispatch('POST', path, req) as RestResponse<T>;
  }

  async put<T = any>(path: string, req: RestRequest = {}): Promise<RestResponse<T>> {
    return this.dispatch('PUT', path, req) as RestResponse<T>;
  }

  async patch<T = any>(path: string, req: RestRequest = {}): Promise<RestResponse<T>> {
    return this.dispatch('PATCH', path, req) as RestResponse<T>;
  }

  async delete<T = any>(path: string, req: RestRequest = {}): Promise<RestResponse<T>> {
    return this.dispatch('DELETE', path, req) as RestResponse<T>;
  }

  private dispatch(method: HttpMethod, path: string, req: RestRequest): RestResponse {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const match = path.match(r.pattern);
      if (!match) continue;

      const pathParams: Record<string, string> = {};
      r.paramNames.forEach((name, i) => { pathParams[name] = match[i + 1]; });

      const response = r.handler(pathParams, req);
      console.log(`[RestApiSimulator] ${method} ${path} → ${response.status}`);
      return response;
    }
    return { status: 404, data: { error: `Route not found: ${method} ${path}` } };
  }

  private buildRoutes(): Route[] {
    return [
      route('GET', '/products', (_, req) => {
        let products = [...MOCK_PRODUCTS];
        if (req.params?.category) {
          products = products.filter(p => p.category === req.params!.category);
        }
        if (req.params?.available !== undefined) {
          products = products.filter(p => p.available === (req.params!.available === 'true'));
        }
        const q = req.params?.q?.toLowerCase();
        if (q) products = products.filter(p => p.name.toLowerCase().includes(q));
        return ok({ items: products, total: products.length });
      }),

      route('GET', '/products/:id', ({ id }) => {
        const product = MOCK_PRODUCTS.find(p => p.id === id);
        return product ? ok(product) : notFound(`Product ${id} not found`);
      }),

      route('POST', '/products', (_, req) => {
        const product = { 
          id: `p-${uuidv4().slice(0, 6)}`, 
          available: true, 
          stock: 0, 
          currency: 'USD',
          ...req.body 
        };
        return created(product);
      }),

      route('PUT', '/products/:id', ({ id }, req) => {
        const product = MOCK_PRODUCTS.find(p => p.id === id);
        if (!product) return notFound(`Product ${id} not found`);
        return ok({ ...product, ...req.body });
      }),

      route('DELETE', '/products/:id', ({ id }) => {
        const exists = MOCK_PRODUCTS.some(p => p.id === id);
        return exists ? ok({ deleted: true, id }) : notFound(`Product ${id} not found`);
      }),

      route('GET', '/users/:id', ({ id }) => {
        const user = MOCK_USERS.find(u => u.id === id);
        return user ? ok(user) : notFound(`User ${id} not found`);
      }),

      route('GET', '/users', (_, req) => {
        let users = [...MOCK_USERS];
        if (req.params?.tenantId) users = users.filter(u => u.tenantId === req.params!.tenantId);
        return ok({ items: users, total: users.length });
      }),

      route('GET', '/orders', (_, req) => {
        let orders = [...MOCK_ORDERS];
        if (req.params?.userId) orders = orders.filter(o => o.userId === req.params!.userId);
        return ok({ items: orders, total: orders.length });
      }),

      route('GET', '/orders/:id', ({ id }) => {
        const order = MOCK_ORDERS.find(o => o.id === id);
        return order ? ok(order) : notFound(`Order ${id} not found`);
      }),

      route('POST', '/orders', (_, req) => {
        const order = { 
          id: `ord-${uuidv4().slice(0, 6)}`, 
          status: 'Procesando', 
          ...req.body 
        };
        return created(order);
      }),

      route('GET', '/health', () => ok({ status: 'ok', timestamp: new Date().toISOString() })),
    ];
  }
}