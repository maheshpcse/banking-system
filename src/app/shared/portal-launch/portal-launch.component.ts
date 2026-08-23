import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PortalLaunchService, PortalLaunchTarget } from '../../core/services/portal-launch.service';

@Component({
  selector: 'app-portal-launch',
  templateUrl: './portal-launch.component.html',
  styleUrls: ['./portal-launch.component.scss']
})
export class PortalLaunchComponent implements OnInit, OnDestroy {
  visible = false;
  target: PortalLaunchTarget = 'billing';
  progress = 1;
  private sub?: Subscription;

  constructor(private readonly launch: PortalLaunchService) {}

  ngOnInit(): void {
    this.sub = this.launch.launchState$.subscribe((state) => {
      this.visible = !!state;
      if (state) {
        this.target = state.target;
        this.progress = state.progress;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get label(): string {
    return 'Launching…';
  }
}
