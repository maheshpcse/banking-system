import { Component, OnInit } from '@angular/core';
import { ShellBootService } from '../../core/services/shell-boot.service';

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss']
})
export class AdminShellComponent implements OnInit {
  constructor(private readonly shellBoot: ShellBootService) {}

  ngOnInit(): void {
    this.shellBoot.complete();
  }
}
