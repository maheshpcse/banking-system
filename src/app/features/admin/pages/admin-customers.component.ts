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
    this.admin.refreshCustomers().subscribe();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async setStatus(user: User, status: AccountStatus): Promise<void> {
    await this.alerts.confirmAction({
      text: `Set ${user.fullName} to ${status}?`,
      confirmText: 'Update',
      loadingText: 'Updating status…',
      action: async () => {
        this.admin.setStatus(user.id, status);
        return status;
      },
      successMessage: (s) => `Status updated to ${s}.`
    });
  }

  async remove(user: User): Promise<void> {
    await this.alerts.confirmAction({
      text: `Delete ${user.fullName} from the operations directory?`,
      confirmText: 'Delete',
      loadingText: 'Removing customer…',
      action: async () => {
        this.admin.removeUser(user.id);
        return true;
      },
      successMessage: 'Customer removed from directory.'
    });
  }
}
