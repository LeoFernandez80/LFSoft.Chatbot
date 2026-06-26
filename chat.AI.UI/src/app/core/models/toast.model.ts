export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id:   string;
  text: string;
  type: ToastType;
}
