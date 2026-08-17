import { Component } from '@angular/core';

@Component({
  selector: 'app-manager-shell',
  template: `
    <section class="manager">
      <div class="manager__body">
        <router-outlet></router-outlet>
      </div>
    </section>
  `,
  styles: [
    `
      .manager,
      .manager__body {
        min-width: 0;
      }
    `
  ]
})
export class ManagerShellComponent {}
