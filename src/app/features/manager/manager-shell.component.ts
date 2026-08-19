import { Component, OnInit } from '@angular/core';
import { ShellBootService } from '../../core/services/shell-boot.service';

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
export class ManagerShellComponent implements OnInit {
  constructor(private readonly shellBoot: ShellBootService) {}

  ngOnInit(): void {
    // Mirror admin shell — login begins boot; without complete() the global shimmer never clears.
    this.shellBoot.complete();
  }
}
