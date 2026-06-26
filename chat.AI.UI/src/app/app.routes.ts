import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  {
    path: 'chat',
    loadChildren: () =>
      import('./features/chat/chat.module').then(m => m.ChatModule),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.module').then(m => m.AdminModule),
  },
  { path: '',   redirectTo: 'chat', pathMatch: 'full' },
  { path: '**', redirectTo: 'chat' },
];
