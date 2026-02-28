import { Component, ViewChild, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { HeaderComponent } from './header.component';
import { SidebarComponent } from './sidebar.component';
import { InactividadService } from '../core/services/inactividad.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatSidenavModule, HeaderComponent, SidebarComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  private readonly bp = inject(BreakpointObserver);
  private readonly inactividad = inject(InactividadService);

  readonly isMobile = toSignal(
    this.bp.observe([Breakpoints.Handset]).pipe(
      map((result: { matches: boolean }) => result.matches),
    ),
    { initialValue: false },
  );

  ngOnInit(): void {
    this.inactividad.iniciar();
  }

  ngOnDestroy(): void {
    this.inactividad.detener();
  }
}
