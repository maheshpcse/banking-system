import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import {
  BillingBill,
  BillingGatewaySettings,
  BillingPayment,
  BillingPaymentMethod
} from '../../../core/models/banking.models';
import { environment } from '../../../../environments/environment';

export type NovaPayStep = 'method' | 'auth' | 'processing' | 'result' | 'rate';
export type NovaPayChannel = 'modal' | 'tab';

interface ItemRating {
  productId: string;
  name: string;
  stars: number;
}

@Component({
  selector: 'app-billing-payment-gateway',
  templateUrl: './billing-payment-gateway.component.html',
  styleUrls: ['./billing-payment-gateway.component.scss']
})
export class BillingPaymentGatewayComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() bill: BillingBill | null = null;
  @Input() settings: BillingGatewaySettings | null = null;
  @Input() methods: BillingPaymentMethod[] = ['cash', 'card', 'upi', 'qr'];

  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<{ bill: BillingBill; payment: BillingPayment; ok: boolean }>();

  step: NovaPayStep = 'method';
  channel: NovaPayChannel = 'modal';
  method: BillingPaymentMethod = 'upi';
  simulateFail = false;
  simulateError = false;
  busy = false;
  leaving = false;
  progress = 0;
  sessionId = '';
  resultOk: boolean | null = null;
  resultMessage = '';
  transactionRef = '';

  cardName = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
  upiVpa = '';
  otp = '';
  otpSent = false;
  itemRatings: ItemRating[] = [];
  ratingBusy = false;
  private pendingCompletion: { bill: BillingBill; payment: BillingPayment; ok: boolean } | null = null;

  private leaveTimer: ReturnType<typeof setTimeout> | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private tabWatch: ReturnType<typeof setInterval> | null = null;
  private tabWin: Window | null = null;
  private storageHandler: ((ev: StorageEvent) => void) | null = null;

  get amount(): number {
    return Number(this.bill?.grandTotal || 0);
  }

  get merchantName(): string {
    return this.settings?.merchantName || 'NovaPay Merchant';
  }

  get cardLast4(): string {
    return String(this.cardNumber || '').replace(/\D/g, '').slice(-4);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resetSession();
    }
    if (changes['methods'] && this.methods?.length && !this.methods.includes(this.method)) {
      this.method = this.methods[0];
    }
  }

  ngOnDestroy(): void {
    this.cleanupTimers();
    this.detachStorage();
  }

  close(): void {
    if (this.busy && this.step === 'processing') {
      return;
    }
    if (this.pendingCompletion) {
      this.emitCompletion();
    }
    this.leaving = true;
    this.leaveTimer = setTimeout(() => {
      this.leaving = false;
      this.open = false;
      this.closed.emit();
      this.resetSession();
    }, 220);
  }

  goToRate(): void {
    if (!this.resultOk || !this.bill) {
      return;
    }
    this.buildItemRatings();
    this.step = 'rate';
  }

  setStars(row: ItemRating, stars: number): void {
    row.stars = stars;
  }

  async submitRatings(): Promise<void> {
    if (!this.bill || this.ratingBusy) {
      return;
    }
    const ratings = this.itemRatings
      .filter((r) => r.stars >= 1 && r.stars <= 5)
      .map((r) => ({ productId: r.productId, stars: r.stars }));
    if (!ratings.length) {
      void this.alerts.toastWarning('Pick a rating', 'Select 1–5 stars for at least one product.');
      return;
    }
    this.ratingBusy = true;
    try {
      await firstValueFrom(this.billing.rateBill(this.bill.id, ratings));
      void this.alerts.toastSuccess('Thanks', 'Product ratings saved.');
      this.finishAndClose();
    } catch (err) {
      void this.alerts.toastWarning(
        'Rating failed',
        (err as { error?: { message?: string } })?.error?.message || 'Unable to save ratings.'
      );
    } finally {
      this.ratingBusy = false;
    }
  }

  skipRatings(): void {
    this.finishAndClose();
  }

  done(): void {
    this.finishAndClose();
  }

  private finishAndClose(): void {
    this.emitCompletion();
    this.leaving = true;
    this.leaveTimer = setTimeout(() => {
      this.leaving = false;
      this.open = false;
      this.closed.emit();
      this.resetSession();
    }, 220);
  }

  private emitCompletion(): void {
    if (!this.pendingCompletion) {
      return;
    }
    const payload = this.pendingCompletion;
    this.pendingCompletion = null;
    this.completed.emit(payload);
  }

  private buildItemRatings(): void {
    const seen = new Set<string>();
    this.itemRatings = [];
    for (const item of this.bill?.items || []) {
      const productId = String(item.productId || '').trim();
      if (!productId || seen.has(productId)) {
        continue;
      }
      seen.add(productId);
      this.itemRatings.push({ productId, name: item.name || 'Product', stars: 0 });
    }
  }

  selectMethod(method: BillingPaymentMethod): void {
    this.method = method;
  }

  continueFromMethod(): void {
    if (!this.methods.includes(this.method)) {
      return;
    }
    if (this.method === 'cash') {
      void this.runPayment();
      return;
    }
    this.step = 'auth';
    if (this.method === 'upi' && !this.upiVpa) {
      this.upiVpa = this.settings?.upiVpa || '';
    }
  }

  backToMethod(): void {
    this.step = 'method';
    this.otpSent = false;
    this.otp = '';
  }

  sendOtp(): void {
    if (!this.cardReady()) {
      void this.alerts.toastWarning('Card details incomplete', 'Enter name, number, expiry, and CVV.');
      return;
    }
    this.otpSent = true;
    this.otp = '';
    void this.alerts.toastSuccess('OTP sent', 'Demo OTP is 123456');
  }

  async authorizeAndPay(): Promise<void> {
    if (this.method === 'card') {
      if (!this.cardReady()) {
        void this.alerts.toastWarning('Card details incomplete', 'Fill every card field to continue.');
        return;
      }
      if (!this.otpSent) {
        this.sendOtp();
        return;
      }
      if (String(this.otp).trim() !== '123456') {
        void this.alerts.toastWarning('Invalid OTP', 'Use demo OTP 123456.');
        return;
      }
    }
    if (this.method === 'upi') {
      const vpa = String(this.upiVpa || '').trim();
      if (!vpa.includes('@')) {
        void this.alerts.toastWarning('UPI ID required', 'Enter a VPA like name@bank.');
        return;
      }
    }
    await this.runPayment();
  }

  openInNewTab(): void {
    if (!this.bill) {
      return;
    }
    this.channel = 'tab';
    const payload = {
      sessionId: this.sessionId,
      billId: this.bill.id,
      billNumber: this.bill.billNumber,
      amount: this.amount,
      merchantName: this.merchantName,
      methods: this.methods,
      method: this.method,
      simulateFail: this.simulateFail,
      simulateError: this.simulateError,
      upiVpa: this.settings?.upiVpa || '',
      cardLabel: this.settings?.cardLabel || 'Card'
    };
    const html = this.buildTabHtml(payload);
    this.tabWin = window.open('', 'novapay_checkout', 'noopener,noreferrer,width=480,height=760');
    if (!this.tabWin) {
      void this.alerts.toastWarning('Pop-up blocked', 'Allow pop-ups or continue in the portal modal.');
      this.channel = 'modal';
      return;
    }
    this.tabWin.document.write(html);
    this.tabWin.document.close();
    this.attachStorage();
    this.step = 'processing';
    this.progress = 12;
    this.busy = true;
    this.tabWatch = setInterval(() => {
      if (this.tabWin && this.tabWin.closed) {
        this.cleanupTimers();
        if (this.resultOk == null) {
          this.busy = false;
          this.step = 'method';
          this.channel = 'modal';
          void this.alerts.toastWarning('Checkout closed', 'Payment was not completed.');
        }
      }
    }, 500);
  }

  retry(): void {
    this.resultOk = null;
    this.resultMessage = '';
    this.transactionRef = '';
    this.pendingCompletion = null;
    this.itemRatings = [];
    this.step = 'method';
    this.progress = 0;
    this.busy = false;
  }

  methodLabel(method: BillingPaymentMethod): string {
    if (method === 'card') return this.settings?.cardLabel || 'Card';
    if (method === 'upi') return this.settings?.upiVpa ? `UPI · ${this.settings.upiVpa}` : 'UPI';
    if (method === 'qr') return 'QR Scan';
    return 'Cash';
  }

  private cardReady(): boolean {
    const digits = String(this.cardNumber || '').replace(/\D/g, '');
    return (
      String(this.cardName || '').trim().length >= 2 &&
      digits.length >= 12 &&
      /^\d{2}\/\d{2}$/.test(String(this.cardExpiry || '').trim()) &&
      String(this.cardCvv || '').trim().length >= 3
    );
  }

  private async runPayment(): Promise<void> {
    if (!this.bill || this.busy) {
      return;
    }
    this.channel = 'modal';
    this.step = 'processing';
    this.busy = true;
    this.progress = 8;
    this.resultOk = null;
    this.startProgress();

    // Theater delay — method-specific pacing
    const waitMs = this.method === 'cash' ? 900 : this.method === 'qr' ? 1800 : 1400;
    await new Promise((r) => setTimeout(r, waitMs));

    try {
      const res = await firstValueFrom(
        this.billing.payBill({
          billId: this.bill.id,
          paymentMethod: this.method,
          simulateFail: this.simulateFail,
          simulateError: this.simulateError,
          provider: 'novapay',
          sessionId: this.sessionId,
          channel: this.channel,
          cardLast4: this.method === 'card' ? this.cardLast4 : undefined,
          upiVpa: this.method === 'upi' ? String(this.upiVpa || '').trim() : undefined
        })
      );
      this.finishProgress(100);
      this.resultOk = res.payment.status === 'success';
      this.resultMessage = res.message || (this.resultOk ? 'Payment successful' : 'Payment failed');
      this.transactionRef = res.payment.transactionRef;
      this.busy = false;
      this.pendingCompletion = { bill: res.bill, payment: res.payment, ok: !!this.resultOk };
      if (this.resultOk) {
        this.buildItemRatings();
        this.step = 'rate';
      } else {
        this.step = 'result';
        this.emitCompletion();
      }
    } catch (err) {
      this.finishProgress(100);
      this.resultOk = false;
      this.resultMessage =
        (err as { error?: { message?: string } })?.error?.message || 'Payment could not be completed.';
      this.step = 'result';
      this.busy = false;
      if (this.bill) {
        this.pendingCompletion = {
          bill: { ...this.bill, paymentStatus: 'failed', paymentMethod: this.method },
          payment: {
            id: '',
            billId: this.bill.id,
            billNumber: this.bill.billNumber,
            paymentMethod: this.method,
            status: 'failed',
            amount: this.amount,
            transactionRef: ''
          },
          ok: false
        };
        this.emitCompletion();
      }
    }
  }

  private resetSession(): void {
    this.cleanupTimers();
    this.detachStorage();
    this.step = 'method';
    this.channel = 'modal';
    this.leaving = false;
    this.busy = false;
    this.progress = 0;
    this.resultOk = null;
    this.resultMessage = '';
    this.transactionRef = '';
    this.sessionId = `np_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.cardName = '';
    this.cardNumber = '';
    this.cardExpiry = '';
    this.cardCvv = '';
    this.upiVpa = this.settings?.upiVpa || '';
    this.otp = '';
    this.otpSent = false;
    this.simulateFail = false;
    this.simulateError = false;
    this.itemRatings = [];
    this.ratingBusy = false;
    this.pendingCompletion = null;
    this.method = this.methods[0] || 'cash';
  }

  onSimulateFail(checked: boolean): void {
    this.simulateFail = checked;
    if (checked) {
      this.simulateError = false;
    }
  }

  onSimulateError(checked: boolean): void {
    this.simulateError = checked;
    if (checked) {
      this.simulateFail = false;
    }
  }

  private startProgress(): void {
    this.cleanupProgressOnly();
    this.progressTimer = setInterval(() => {
      if (this.progress < 88) {
        this.progress += Math.max(1, Math.round((92 - this.progress) * 0.08));
      }
    }, 90);
  }

  private finishProgress(value: number): void {
    this.cleanupProgressOnly();
    this.progress = value;
  }

  private cleanupProgressOnly(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private cleanupTimers(): void {
    this.cleanupProgressOnly();
    if (this.leaveTimer) {
      clearTimeout(this.leaveTimer);
      this.leaveTimer = null;
    }
    if (this.tabWatch) {
      clearInterval(this.tabWatch);
      this.tabWatch = null;
    }
  }

  private attachStorage(): void {
    this.detachStorage();
    this.storageHandler = (ev: StorageEvent) => {
      if (ev.key !== 'novapay_checkout_result' || !ev.newValue) {
        return;
      }
      try {
        const data = JSON.parse(ev.newValue) as {
          sessionId: string;
          ok: boolean;
          message: string;
          transactionRef?: string;
          bill?: BillingBill;
          payment?: BillingPayment;
        };
        if (data.sessionId !== this.sessionId) {
          return;
        }
        this.finishProgress(100);
        this.resultOk = !!data.ok;
        this.resultMessage = data.message || (data.ok ? 'Payment successful' : 'Payment failed');
        this.transactionRef = data.transactionRef || '';
        this.busy = false;
        this.channel = 'tab';
        if (data.bill && data.payment) {
          this.bill = data.bill;
          this.pendingCompletion = { bill: data.bill, payment: data.payment, ok: !!data.ok };
          if (data.ok) {
            this.buildItemRatings();
            this.step = 'rate';
          } else {
            this.step = 'result';
            this.emitCompletion();
          }
        } else {
          this.step = 'result';
        }
        try {
          localStorage.removeItem('novapay_checkout_result');
        } catch {
          /* ignore */
        }
        this.cleanupTimers();
        this.detachStorage();
      } catch {
        /* ignore malformed */
      }
    };
    window.addEventListener('storage', this.storageHandler);
  }

  private detachStorage(): void {
    if (this.storageHandler) {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
  }

  private buildTabHtml(payload: Record<string, unknown>): string {
    const token = localStorage.getItem('mb_token') || '';
    const safe = JSON.stringify({
      ...payload,
      token,
      apiBase: environment.apiUrl
    }).replace(/</g, '\\u003c');
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>NovaPay Checkout</title>
<style>
  :root{--ink:#16323a;--muted:#5b6b70;--saffron:#ff9932;--gold:#ffc801;--mint:#d9e8e2;--ok:#1f8a70;--bad:#c45b6c}
  *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Segoe UI,system-ui,sans-serif;color:var(--ink);
  background:radial-gradient(1200px 600px at 10% -10%,rgba(255,200,1,.45),transparent 55%),
  radial-gradient(900px 500px at 110% 10%,rgba(255,153,50,.35),transparent 50%),
  linear-gradient(165deg,#fff8e8 0%,#eef6f2 48%,#f7fafc 100%)}
  .shell{max-width:420px;margin:0 auto;padding:1.25rem 1rem 2rem}
  .brand{display:flex;align-items:center;gap:.65rem;margin-bottom:1rem}
  .mark{width:2.4rem;height:2.4rem;border-radius:.85rem;background:linear-gradient(135deg,var(--gold),var(--saffron));
  display:grid;place-items:center;font-weight:800;color:#16323a;box-shadow:0 10px 24px rgba(255,153,50,.35)}
  h1{margin:0;font-size:1.15rem;letter-spacing:-.02em}p{margin:.2rem 0 0;color:var(--muted);font-size:.86rem}
  .card{background:rgba(255,255,255,.86);border:1px solid rgba(255,255,255,.8);border-radius:1.15rem;padding:1rem;
  box-shadow:0 18px 40px rgba(22,50,58,.08);display:grid;gap:.75rem}
  .amt{font-size:1.85rem;font-weight:800;letter-spacing:-.03em}
  .methods{display:grid;grid-template-columns:1fr 1fr;gap:.45rem}
  button.m{border:1px solid rgba(22,50,58,.12);background:#fff;border-radius:.85rem;padding:.7rem .55rem;cursor:pointer;font-weight:650}
  button.m.on{border-color:rgba(255,153,50,.55);background:linear-gradient(135deg,rgba(255,200,1,.35),rgba(255,153,50,.18))}
  .btn{border:0;border-radius:.9rem;padding:.75rem 1rem;font-weight:750;cursor:pointer;background:linear-gradient(135deg,var(--gold),var(--saffron));color:#16323a}
  .btn:disabled{opacity:.55;cursor:wait}
  .bar{height:.45rem;border-radius:999px;background:rgba(22,50,58,.08);overflow:hidden}
  .bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--gold),var(--saffron));transition:width .2s}
  .ok{color:var(--ok)}.bad{color:var(--bad)}
  .spin{width:3rem;height:3rem;border-radius:50%;border:3px solid rgba(255,153,50,.2);border-top-color:var(--saffron);
  animation:spin 0.85s linear infinite;margin:.5rem auto}
  @keyframes spin{to{transform:rotate(360deg)}}
</style></head><body>
<div class="shell">
  <div class="brand"><div class="mark">N</div><div><h1>NovaPay</h1><p id="merchant"></p></div></div>
  <div class="card" id="view"></div>
</div>
<script>
(function(){
  var S=${safe};
  var view=document.getElementById('view');
  document.getElementById('merchant').textContent=S.merchantName||'Merchant';
  var method=S.method||(S.methods&&S.methods[0])||'upi';
  function money(n){return Number(n||0).toFixed(2)}
  function renderMethod(){
    var ms=(S.methods||[]).map(function(m){
      return '<button class="m'+(m===method?' on':'')+'" data-m="'+m+'">'+String(m).toUpperCase()+'</button>';
    }).join('');
    view.innerHTML='<div><small>Amount due</small><div class="amt">$'+money(S.amount)+'</div><p>'+S.billNumber+'</p></div>'+
      '<div class="methods">'+ms+'</div>'+
      '<label style="font-size:.8rem;color:#5b6b70;display:block;margin:.35rem 0"><input type="checkbox" id="fail"/> Simulate failure</label>'+
      '<label style="font-size:.8rem;color:#5b6b70;display:block;margin:.35rem 0"><input type="checkbox" id="err"/> Simulate error</label>'+
      '<button class="btn" id="pay">Pay securely</button>';
    view.querySelectorAll('button.m').forEach(function(b){b.onclick=function(){method=b.getAttribute('data-m');renderMethod();};});
    document.getElementById('pay').onclick=function(){
      S.simulateFail=!!document.getElementById('fail').checked;
      S.simulateError=!!document.getElementById('err').checked;
      pay();
    };
  }
  function renderProcessing(){
    view.innerHTML='<div class="spin"></div><p style="text-align:center">Contacting NovaPay rails…</p><div class="bar"><i id="bar"></i></div>';
    var p=8,bar=document.getElementById('bar');
    var t=setInterval(function(){p=Math.min(90,p+4);bar.style.width=p+'%';},120);
    window.__npClear=function(){clearInterval(t);bar.style.width='100%';};
  }
  function renderResult(ok,msg,ref){
    view.innerHTML='<h2 class="'+(ok?'ok':'bad')+'">'+(ok?'Payment successful':'Payment failed')+'</h2>'+
      '<p>'+msg+'</p>'+(ref?'<p><small>Ref · '+ref+'</small></p>':'')+
      '<button class="btn" id="close">Return to portal</button>';
    document.getElementById('close').onclick=function(){window.close();};
  }
  function apiUrl(){
    return String(S.apiBase||'').replace(/\\/$/,'')+'/billing/payments';
  }
  async function pay(){
    renderProcessing();
    try{
      var res=await fetch(apiUrl(),{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.token},
        body:JSON.stringify({billId:S.billId,paymentMethod:method,simulateFail:!!S.simulateFail,simulateError:!!S.simulateError,provider:'novapay',sessionId:S.sessionId,channel:'tab'})});
      var data=await res.json();
      if(window.__npClear) window.__npClear();
      var ok=res.ok && data.payment && data.payment.status==='success';
      localStorage.setItem('novapay_checkout_result', JSON.stringify({
        sessionId:S.sessionId, ok:ok, message:data.message|| (ok?'Payment successful':'Payment failed'),
        transactionRef:data.payment&&data.payment.transactionRef, bill:data.bill, payment:data.payment
      }));
      renderResult(ok, data.message|| (ok?'Payment successful':'Payment failed'), data.payment&&data.payment.transactionRef);
    }catch(e){
      if(window.__npClear) window.__npClear();
      localStorage.setItem('novapay_checkout_result', JSON.stringify({sessionId:S.sessionId, ok:false, message:'Network error during checkout'}));
      renderResult(false,'Network error during checkout','');
    }
  }
  renderMethod();
})();
</script></body></html>`;
  }

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService
  ) {}
}
