import { Component, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { PortalLaunchService } from '../../core/services/portal-launch.service';
import { ShellBootService } from '../../core/services/shell-boot.service';

const BOOTSTRAP_CSS_ID = 'nb-billing-bootstrap-css';
const THREE_SCRIPT_ID = 'nb-billing-three-js';
const BOOTSTRAP_CSS_HREF =
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
const THREE_JS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

@Component({
  selector: 'app-billing-shell',
  templateUrl: './billing-shell.component.html',
  styleUrls: ['./billing-shell.component.scss']
})
export class BillingShellComponent implements OnInit, OnDestroy {
  private bootstrapLink: HTMLLinkElement | null = null;
  readonly year = new Date().getFullYear();

  readonly dockItems: Array<{
    path: string;
    label: string;
    icon: string;
    handoff?: 'shop';
  }> = [
    { path: '/billing', label: 'Dashboard', icon: 'dashboard' },
    { path: '/billing/products', label: 'Products', icon: 'products' },
    { path: '/billing/customers', label: 'Customers', icon: 'customers' },
    { path: '/billing/pos', label: 'POS', icon: 'pos' },
    { path: '/billing/shop', label: 'Shop', icon: 'shop', handoff: 'shop' },
    { path: '/billing/history', label: 'History', icon: 'history' },
    { path: '/billing/purchases', label: 'Purchases', icon: 'purchases' },
    { path: '/billing/settings', label: 'Settings', icon: 'settings' }
  ];

  constructor(
    private readonly auth: AuthService,
    private readonly shellBoot: ShellBootService,
    private readonly portalLaunch: PortalLaunchService,
    private readonly renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.injectBootstrapCss();
    this.ensureThreeJs();
    document.documentElement.dataset['nbBilling'] = '1';
    document.body.classList.add('billing-mode');
    this.shellBoot.complete();
  }

  ngOnDestroy(): void {
    if (this.bootstrapLink?.parentNode) {
      this.bootstrapLink.parentNode.removeChild(this.bootstrapLink);
    }
    this.bootstrapLink = null;
    delete document.documentElement.dataset['nbBilling'];
    document.body.classList.remove('billing-mode');
  }

  get bankingReturnUrl(): string {
    const role = this.auth.currentUser?.role;
    if (role === 'admin') {
      return '/admin';
    }
    return '/manager';
  }

  get bankingReturnLabel(): string {
    return 'Return to Banking';
  }

  get avatarStyle(): string {
    return this.auth.currentUser?.avatar?.style || 'mint';
  }

  get avatarInitials(): string {
    return (this.auth.currentUser?.avatar?.initials || 'NB').trim().toUpperCase() || 'NB';
  }

  get avatarSrc(): string | null {
    const avatar = this.auth.currentUser?.avatar;
    if (avatar?.image) {
      return avatar.image;
    }
    const presetId = String(avatar?.presetId || '').trim();
    if (!/^(customer|manager|admin)\/preset-\d{2}$/.test(presetId)) {
      return null;
    }
    return `assets/avatars/${presetId}.webp`;
  }

  get operatorName(): string {
    return this.auth.currentUser?.fullName || this.auth.currentUser?.username || 'Operator';
  }

  returnToBanking(): void {
    this.portalLaunch.launch('banking', this.bankingReturnUrl);
  }

  openShopFloor(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.portalLaunch.launch('shop', '/billing/shop');
  }

  onDockClick(event: Event, item: { path: string; handoff?: 'shop' }): void {
    if (item.handoff === 'shop') {
      this.openShopFloor(event);
    }
  }

  signOut(): void {
    this.auth.logout();
  }

  private injectBootstrapCss(): void {
    if (typeof document === 'undefined') {
      return;
    }
    if (document.getElementById(BOOTSTRAP_CSS_ID)) {
      return;
    }
    const link = this.renderer.createElement('link') as HTMLLinkElement;
    link.id = BOOTSTRAP_CSS_ID;
    link.rel = 'stylesheet';
    link.href = BOOTSTRAP_CSS_HREF;
    this.renderer.appendChild(document.head, link);
    this.bootstrapLink = link;
  }

  private ensureThreeJs(): void {
    if (typeof document === 'undefined') {
      return;
    }
    if (document.getElementById(THREE_SCRIPT_ID) || (window as unknown as { THREE?: unknown }).THREE) {
      return;
    }
    const script = this.renderer.createElement('script') as HTMLScriptElement;
    script.id = THREE_SCRIPT_ID;
    script.src = THREE_JS_SRC;
    script.async = true;
    this.renderer.appendChild(document.head, script);
  }
}
