import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { AgGridAngular } from 'ag-grid-angular';
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  CsvExportModule,
  ColDef,
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
  GetRowIdParams,
} from 'ag-grid-community';

import {
  NetService,
  UserService,
  SyncService,
  RosterService,
  CheckInService,
  ExportService,
} from '../../core';
import { CheckIn } from '../../shared/models/checkin.model';
import { NET_TYPES, NetType } from '../../shared/models/net.model';
import { Person } from '../../shared/models/person.model';
import { ClockComponent } from './clock.component';
import { ColumnChooserComponent } from './column-chooser.component';
import { AboutDialogComponent } from './about-dialog.component';
import { RemoveDataDialogComponent } from './remove-data-dialog.component';
import { MobileViewerComponent } from './mobile-viewer.component';
import { PresenceListComponent } from './presence-list.component';
import { NcsTakeoverDialogComponent } from './ncs-takeover-dialog.component';

// Register AG Grid modules
ModuleRegistry.registerModules([ClientSideRowModelModule, CsvExportModule]);

interface EntryRowData {
  id: string;
  callsign: string;
  firstName: string;
  assignment: string;
  location: string;
  notes: string;
  mileage: number | null;
  signInTime: Date | null;
  signOutTime: Date | null;
  isEntryRow: boolean;
}

@Component({
  selector: 'app-net-log',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatDividerModule,
    AgGridAngular,
    ClockComponent,
    ColumnChooserComponent,
    MobileViewerComponent,
    PresenceListComponent,
  ],
  templateUrl: './net-log.component.html',
  styleUrl: './net-log.component.scss',
})
export class NetLogComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  netService = inject(NetService);
  userService = inject(UserService);
  syncService = inject(SyncService);
  rosterService = inject(RosterService);
  checkinService = inject(CheckInService);
  exportService = inject(ExportService);

  netTypes = NET_TYPES;

  // Mobile detection
  isMobile = signal(window.innerWidth < 768);

  // Entry row data
  entryCallsign = '';
  entryAssignment = '';
  entryLocation = '';
  entryNotes = '';
  entryMileage: number | null = null;

  // Autocomplete suggestions
  suggestions = signal<Person[]>([]);

  // Grid API
  private gridApi: GridApi | null = null;

  // Column visibility state
  columnVisibility = signal<Record<string, boolean>>({
    callsign: true,
    firstName: true,
    assignment: true,
    location: true,
    notes: true,
    a1: true,
    a2: true,
    a3: true,
    a4: true,
    a5: true,
    a6: true,
    a7: true,
    a8: true,
    mileage: true,
    signOutTime: true,
    signInTime: false, // Hidden by default
  });

  // Comments editing
  editingComments = false;
  commentsValue = '';

  // Presence heartbeat
  private presenceInterval: ReturnType<typeof setInterval> | null = null;
  private netSubscription: Subscription | null = null;

  // Grid configuration
  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
    sortable: true,
    editable: false,
  };

  // Column definitions based on attribute config
  colDefs = computed<ColDef[]>(() => {
    const config = this.rosterService.attributeConfig();
    const visibility = this.columnVisibility();
    const isWriter = this.netService.isWriter();

    const columns: ColDef[] = [
      {
        field: 'callsign',
        headerName: 'Call Sign',
        minWidth: 100,
        cellClass: 'callsign-cell',
        hide: !visibility['callsign'],
      },
      {
        field: 'firstName',
        headerName: 'First Name',
        minWidth: 100,
        hide: !visibility['firstName'],
      },
      {
        field: 'assignment',
        headerName: 'Assignment',
        minWidth: 120,
        editable: isWriter,
        hide: !visibility['assignment'],
      },
      {
        field: 'location',
        headerName: 'Location',
        minWidth: 120,
        editable: isWriter,
        hide: !visibility['location'],
      },
      {
        field: 'notes',
        headerName: 'Notes',
        minWidth: 150,
        flex: 2,
        editable: isWriter,
        hide: !visibility['notes'],
      },
    ];

    // Add attribute columns from config
    for (const col of config.attributeColumns) {
      columns.push({
        field: `attributeSnapshot.${col.column}`,
        headerName: col.header,
        minWidth: 80,
        hide: !visibility[col.column],
        cellRenderer: (params: { value: unknown }) => {
          if (col.type === 'boolean') {
            return params.value ? '✓' : '';
          }
          return params.value ?? '';
        },
      });
    }

    // Add remaining columns
    columns.push(
      {
        field: 'mileage',
        headerName: 'Mileage',
        minWidth: 80,
        editable: isWriter,
        hide: !visibility['mileage'],
      },
      {
        field: 'signOutTime',
        headerName: 'Sign Out',
        minWidth: 100,
        hide: !visibility['signOutTime'],
        cellRenderer: (params: { value: Date; data: CheckIn }) => {
          if (params.value) {
            return this.formatTime(params.value);
          }
          if (this.netService.isWriter() && params.data && !params.data.signOutTime) {
            return '<button class="sign-out-btn">Sign Out</button>';
          }
          return '';
        },
      },
      {
        field: 'signInTime',
        headerName: 'Sign In',
        minWidth: 100,
        hide: !visibility['signInTime'],
        valueFormatter: (params: { value: Date }) => {
          return params.value ? this.formatTime(params.value) : '';
        },
      }
    );

    return columns;
  });

  // Row data from check-ins
  rowData = computed(() => this.checkinService.checkins());

  // Entry row for pinned top
  pinnedTopRowData = computed<EntryRowData[]>(() => {
    if (!this.netService.isWriter()) return [];
    return [
      {
        id: 'entry-row',
        callsign: '',
        firstName: '',
        assignment: '',
        location: '',
        notes: '',
        mileage: null,
        signInTime: null,
        signOutTime: null,
        isEntryRow: true,
      },
    ];
  });

  private resizeHandler = () => {
    this.isMobile.set(window.innerWidth < 768);
  };

  constructor() {
    // Update grid when check-ins change
    effect(() => {
      const checkins = this.checkinService.checkins();
      if (this.gridApi && checkins.length > 0) {
        // Apply transaction to update grid without losing state
        this.gridApi.applyTransactionAsync({
          update: checkins,
        });
      }
    });

    // Listen for window resize
    window.addEventListener('resize', this.resizeHandler);
  }

  async ngOnInit(): Promise<void> {
    const netId = this.route.snapshot.paramMap.get('id');
    if (netId) {
      try {
        await this.netService.loadNet(netId);
        this.checkinService.subscribeToNet(netId);
        this.startPresenceHeartbeat(netId);
        this.subscribeToNetUpdates(netId);
      } catch (error) {
        console.error('Error loading net:', error);
        this.router.navigate(['/']);
      }
    }
  }

  ngOnDestroy(): void {
    this.stopPresenceHeartbeat();
    this.checkinService.unsubscribeFromNet();
    this.netSubscription?.unsubscribe();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private startPresenceHeartbeat(netId: string): void {
    this.netService.updatePresence(netId);
    this.presenceInterval = setInterval(() => {
      this.netService.updatePresence(netId);
    }, 20000);
  }

  private stopPresenceHeartbeat(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
  }

  private subscribeToNetUpdates(netId: string): void {
    this.netSubscription = this.netService
      .getNetObservable(netId)
      .subscribe((net) => {
        if (net) {
          // Update local net state
          this.netService.loadNet(netId);
        }
      });
  }

  // Grid callbacks
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  getRowId(params: GetRowIdParams): string {
    return params.data.id;
  }

  onCellValueChanged(event: CellValueChangedEvent): void {
    if (event.data.isEntryRow) return;

    const netId = this.netService.activeNet()?.id;
    if (!netId) return;

    const field = event.colDef.field;
    if (!field) return;

    const updateData: Partial<CheckIn> = {};
    if (field === 'assignment') updateData.assignment = event.newValue;
    if (field === 'location') updateData.location = event.newValue;
    if (field === 'notes') updateData.notes = event.newValue;
    if (field === 'mileage') updateData.mileage = event.newValue;

    this.checkinService.updateCheckIn(netId, event.data.id, updateData).catch((error) => {
      this.snackBar.open('Failed to update: ' + error.message, 'Dismiss', {
        duration: 3000,
      });
    });
  }

  onCellClicked(event: { colDef: ColDef; data: CheckIn }): void {
    if (event.colDef.field === 'signOutTime' && !event.data.signOutTime) {
      this.handleSignOut(event.data);
    }
  }

  async handleSignOut(checkin: CheckIn): Promise<void> {
    const netId = this.netService.activeNet()?.id;
    if (!netId || !this.netService.isWriter()) return;

    try {
      await this.checkinService.signOut(netId, checkin.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sign out';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  // Autocomplete
  onCallsignInput(value: string): void {
    if (value.length >= 1) {
      const results = this.rosterService.search(value, 10);
      this.suggestions.set(results);
    } else {
      this.suggestions.set([]);
    }
  }

  selectSuggestion(person: Person): void {
    this.entryCallsign = person.callsign;
    this.suggestions.set([]);
  }

  // Submit check-in
  async submitEntry(): Promise<void> {
    const netId = this.netService.activeNet()?.id;
    if (!netId || !this.entryCallsign.trim()) return;

    try {
      await this.checkinService.addCheckIn(netId, {
        callsign: this.entryCallsign.trim().toUpperCase(),
        assignment: this.entryAssignment.trim() || undefined,
        location: this.entryLocation.trim() || undefined,
        notes: this.entryNotes.trim() || undefined,
        mileage: this.entryMileage || undefined,
      });

      // Clear entry fields
      this.entryCallsign = '';
      this.entryAssignment = '';
      this.entryLocation = '';
      this.entryNotes = '';
      this.entryMileage = null;
      this.suggestions.set([]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add check-in';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  // Column visibility
  toggleColumn(column: string, visible: boolean): void {
    this.columnVisibility.update((v) => ({ ...v, [column]: visible }));
    if (this.gridApi) {
      this.gridApi.setColumnsVisible([column], visible);
    }
  }

  // Net actions
  async updateOrganization(value: string): Promise<void> {
    const netId = this.netService.activeNet()?.id;
    if (!netId) return;

    try {
      await this.netService.updateNet(netId, { organization: value });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  async updateNetType(value: NetType): Promise<void> {
    const netId = this.netService.activeNet()?.id;
    if (!netId) return;

    try {
      await this.netService.updateNet(netId, { netType: value });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  async regenerateCode(): Promise<void> {
    const netId = this.netService.activeNet()?.id;
    if (!netId) return;

    try {
      const newCode = await this.netService.regenerateJoinCode(netId);
      this.snackBar.open(`New share code: ${newCode}`, 'Dismiss', { duration: 5000 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to regenerate code';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  // Comments
  startEditingComments(): void {
    this.commentsValue = this.netService.activeNet()?.comments || '';
    this.editingComments = true;
  }

  async saveComments(): Promise<void> {
    const netId = this.netService.activeNet()?.id;
    if (!netId) return;

    try {
      await this.netService.updateNet(netId, { comments: this.commentsValue });
      this.editingComments = false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save comments';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  cancelEditingComments(): void {
    this.editingComments = false;
  }

  // End net
  async endNet(): Promise<void> {
    if (!confirm('Are you sure you want to end this net?')) return;

    const netId = this.netService.activeNet()?.id;
    if (!netId) return;

    try {
      await this.netService.closeNet(netId);
      this.router.navigate(['/']);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to close net';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  leaveNet(): void {
    this.stopPresenceHeartbeat();
    this.checkinService.unsubscribeFromNet();
    this.netService.leaveNet();
    this.router.navigate(['/']);
  }

  // Export and menu actions
  exportCsv(): void {
    try {
      this.exportService.exportCurrentNetCsv();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Export failed';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  async exportAllNets(): Promise<void> {
    try {
      await this.exportService.exportAllNetsZip();
      this.snackBar.open('Export complete', 'Dismiss', { duration: 3000 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Export failed';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  printPdf(): void {
    try {
      this.exportService.printCurrentNetPdf();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Print failed';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  async sendData(): Promise<void> {
    try {
      await this.exportService.sendCurrentNetData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Send failed';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  openAbout(): void {
    this.dialog.open(AboutDialogComponent, {
      width: '450px',
    });
  }

  openRemoveData(): void {
    if (!this.userService.isRoot()) {
      this.snackBar.open('Only root users can remove all data', 'Dismiss', {
        duration: 3000,
      });
      return;
    }

    const dialogRef = this.dialog.open(RemoveDataDialogComponent, {
      width: '450px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.deleted) {
        this.snackBar.open('All net data has been deleted', 'Dismiss', {
          duration: 5000,
        });
        this.router.navigate(['/']);
      } else if (result?.error) {
        this.snackBar.open('Failed to delete data', 'Dismiss', {
          duration: 3000,
        });
      }
    });
  }

  // NCS takeover
  async claimNcs(): Promise<void> {
    const netId = this.netService.activeNet()?.id;
    if (!netId) return;

    // Check if current NCS is stale
    const isStale = await this.netService.isNcsPresenceStale(netId);
    const currentNcsCallsign = this.userService.getCallsignForUid(
      this.netService.activeNet()?.ncs
    ) || 'Unknown';

    // Show takeover dialog
    const dialogRef = this.dialog.open(NcsTakeoverDialogComponent, {
      width: '400px',
      data: {
        currentNcsCallsign,
        isStale,
      },
    });

    const confirmed = await dialogRef.afterClosed().toPromise();
    if (confirmed) {
      try {
        await this.netService.claimNcs(netId);
        this.snackBar.open('You are now the Net Controller', 'Dismiss', {
          duration: 3000,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to claim NCS';
        this.snackBar.open(message, 'Dismiss', { duration: 3000 });
      }
    }
  }

  // Assign backup controller
  async assignBackupController(uid: string | null): Promise<void> {
    const netId = this.netService.activeNet()?.id;
    if (!netId) return;

    try {
      await this.netService.assignBackup(netId, uid);
      if (uid) {
        this.snackBar.open('Backup controller assigned', 'Dismiss', {
          duration: 3000,
        });
      } else {
        this.snackBar.open('Backup controller removed', 'Dismiss', {
          duration: 3000,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to assign backup';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  // Utilities
  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
