import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { BillingShellComponent } from './billing-shell.component';
import { BillingDashboardComponent } from './pages/billing-dashboard.component';
import { BillingProductsComponent } from './pages/billing-products.component';
import { BillingCustomersComponent } from './pages/billing-customers.component';
import { BillingPosComponent } from './pages/billing-pos.component';
import { BillingHistoryComponent } from './pages/billing-history.component';
import { BillingPurchasesComponent } from './pages/billing-purchases.component';
import { BillingSettingsComponent } from './pages/billing-settings.component';
import { BillingSceneComponent } from './shared/billing-scene.component';
import { BillingPanelShimmerComponent } from './shared/billing-panel-shimmer.component';
import { BillingPaymentGatewayComponent } from './shared/billing-payment-gateway.component';
import { BillingNotFoundRedirectComponent } from './pages/billing-not-found-redirect.component';

const routes: Routes = [
  {
    path: '',
    component: BillingShellComponent,
    children: [
      { path: '', component: BillingDashboardComponent },
      { path: 'products', component: BillingProductsComponent },
      { path: 'customers', component: BillingCustomersComponent },
      { path: 'pos', component: BillingPosComponent },
      { path: 'history', component: BillingHistoryComponent },
      { path: 'purchases', component: BillingPurchasesComponent },
      { path: 'settings', component: BillingSettingsComponent },
      { path: '**', component: BillingNotFoundRedirectComponent }
    ]
  }
];

@NgModule({
  declarations: [
    BillingShellComponent,
    BillingDashboardComponent,
    BillingProductsComponent,
    BillingCustomersComponent,
    BillingPosComponent,
    BillingHistoryComponent,
    BillingPurchasesComponent,
    BillingSettingsComponent,
    BillingSceneComponent,
    BillingPanelShimmerComponent,
    BillingPaymentGatewayComponent,
    BillingNotFoundRedirectComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class BillingAppModule {}
