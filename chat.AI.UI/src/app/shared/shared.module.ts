/**
 * SharedModule
 * Re-exports all reusable standalone components so feature modules
 * only need to import SharedModule once.
 */
import { NgModule } from '@angular/core';
import { BadgeComponent }           from './components/badge/badge.component';
import { EmptyStateComponent }      from './components/empty-state/empty-state.component';
import { HealthDotComponent }       from './components/health-dot/health-dot.component';
import { JsonOutputComponent }      from './components/json-output/json-output.component';
import { MethodBadgeComponent }     from './components/method-badge/method-badge.component';
import { ToastComponent }           from './components/toast/toast.component';
import { TypingIndicatorComponent } from './components/typing-indicator/typing-indicator.component';

const SHARED_COMPONENTS = [
  BadgeComponent,
  EmptyStateComponent,
  HealthDotComponent,
  JsonOutputComponent,
  MethodBadgeComponent,
  ToastComponent,
  TypingIndicatorComponent,
];

@NgModule({
  imports: SHARED_COMPONENTS,
  exports: SHARED_COMPONENTS,
})
export class SharedModule {}
