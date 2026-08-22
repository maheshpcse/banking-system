import { Component, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
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

  readonly dockItems: Array<{ path: string; label: string; icon: string }> = [
    { path: '/billing', label: 'Dashboard', icon: 'dashboard' },
    { path: '/billing/products', label: 'Products', icon: 'products' },
    { path: '/billing/customers', label: 'Customers', icon: 'customers' },
    { path: '/billing/pos', label: 'POS', icon: 'pos' },
    { path: '/billing/history', label: 'History', icon: 'history' },
    { path: '/billing/settings', label: 'Settings', icon: 'settings' }
  ];

  constructor(
    private readonly auth: AuthService,
    private readonly shellBoot: ShellBootService,
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
    const role = this.auth.currentUser?.role;
    return role === 'admin' ? 'Return to Banking' : 'Return to Banking';
  }

  signOut(): void {
    this.auth.logout();
  }

  private injectBootstrapCss(): void {
    if (document.getElementById(BOOTSTRAP_CSS_ID)) {
      this.bootstrapLink = document.getElementById(BOOTSTRAP_CSS_ID) as HTMLLinkElement;
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
    if ((window as unknown as { THREE?: unknown }).THREE) {
      return;
    }
    if (document.getElementById(THREE_SCRIPT_ID)) {
      return;
    }
    const script = this.renderer.createElement('script') as HTMLScriptElement;
    script.id = THREE_SCRIPT_ID;
    script.src = THREE_JS_SRC;
    script.async = true;
    this.renderer.appendChild(document.head, script);
  }
}
