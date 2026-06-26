export interface GraphQLRequest {
query: string;
variables?: Record<string, any>;
operationName?: string;
}

export interface GraphQLError {
message: string;
locations?: Array<{ line: number; column: number }>;
path?: string[];
}

export interface GraphQLResponse<T = any> {
data: T | null;
errors?: GraphQLError[];
}

export interface IGraphQLConnector {
connect(): Promise<void>;
disconnect(): Promise<void>;
isConnected(): boolean;
endpoint: string;

query<T = any>(request: GraphQLRequest): Promise<GraphQLResponse<T>>;
mutate<T = any>(request: GraphQLRequest): Promise<GraphQLResponse<T>>;
}