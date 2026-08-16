import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountStatus, User } from '../../../core/models/banking.models';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-admin-customers',
  templateUrl: './admin-customers.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminCustomersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  private sub?: Subscription;

  constructor(private readonly admin: AdminService, private readonly alerts: AlertService) {}

  ngOnInit(): void {
    this.sub = this.admin.users$.subscribe((users) => (this.users = users));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async setStatus(user: User, status: AccountStatus): Promise<void> {
    const ok = await this.alerts.confirm({
      text: `Set ${user.fullName} to ${status}?`,
      confirmText: 'Update'
    });
    if (!ok) return;
    this.admin.setStatus(user.id, status);
    await this.alerts.success(`Status updated to ${status}.`);
  }

  async remove(user: User): Promise<void> {
    const ok = await this.alerts.confirm({
      text: `Delete ${user.fullName} from the operations directory?`,
      confirmText: 'Delete'
    });
    if (!ok) return;
    this.admin.removeUser(user.id);
    await this.alerts.success('Customer removed from directory.');
  }
}
