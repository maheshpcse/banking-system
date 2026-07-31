import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-animated-card',
  templateUrl: './animated-card.component.html',
  styleUrls: ['./animated-card.component.scss']
})
export class AnimatedCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() accent: 'mint' | 'sky' | 'sand' | 'rose' = 'mint';
  @Input() tilt = true;
}
