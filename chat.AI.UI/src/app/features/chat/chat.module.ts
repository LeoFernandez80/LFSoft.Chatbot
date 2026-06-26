/**
 * ChatModule
 * Lazy-loaded feature module for the Chat section.
 * Uses RouterModule.forChild with CHAT_ROUTES.
 */
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CHAT_ROUTES } from './chat.routes';

@NgModule({
  imports: [RouterModule.forChild(CHAT_ROUTES)],
})
export class ChatModule {}
