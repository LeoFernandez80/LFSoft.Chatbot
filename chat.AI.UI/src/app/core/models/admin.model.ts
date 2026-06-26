export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface AdminCardField {
  id: string;
  label: string;
  type: 'text' | 'number';
  placeholder?: string;
  defaultValue?: string | number;
}

export interface AdminCardConfig {
  id: string;
  title: string;
  method: HttpMethod;
  endpoint: string;
  fields?: AdminCardField[];
  danger?: boolean;
}
