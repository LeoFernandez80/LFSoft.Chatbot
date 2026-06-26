export interface RestRequest {
params?: Record<string, any>;
body?: any;
headers?: Record<string, string>;
}

export interface RestResponse<T = any> {
status: number;
data: T;
headers?: Record<string, string>;
}

export interface IRestApiConnector {
connect(): Promise<void>;
disconnect(): Promise<void>;
isConnected(): boolean;
baseUrl: string;

get<T = any>(path: string, request?: RestRequest): Promise<RestResponse<T>>;
post<T = any>(path: string, request?: RestRequest): Promise<RestResponse<T>>;
put<T = any>(path: string, request?: RestRequest): Promise<RestResponse<T>>;
patch<T = any>(path: string, request?: RestRequest): Promise<RestResponse<T>>;
delete<T = any>(path: string, request?: RestRequest): Promise<RestResponse<T>>;
}