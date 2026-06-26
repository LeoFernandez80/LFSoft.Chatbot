import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./containers/admin-page/admin-page.component').then(
        m => m.AdminPageComponent
      ),
  },
];
