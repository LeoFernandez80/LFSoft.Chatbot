import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '@core/services/toast.service';

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const message =
        err.error?.error ?? err.error?.message ?? err.message ?? 'Error desconocido';
      toast.show(message, 'error');
      return throwError(() => new Error(message));
    })
  );
};
