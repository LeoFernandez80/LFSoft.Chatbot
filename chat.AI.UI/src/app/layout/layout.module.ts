/**
 * LayoutModule – organizes shell/chrome components (header, etc.)
 */
import { NgModule } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';

@NgModule({
  imports: [HeaderComponent],
  exports: [HeaderComponent],
})
export class LayoutModule {}
