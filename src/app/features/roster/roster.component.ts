import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RosterService, CsvService, UserService } from '../../core';
import { Person } from '../../shared/models';
import { PersonDialogComponent } from './person-dialog.component';
import { ImportDialogComponent } from './import-dialog.component';

@Component({
  selector: 'app-roster',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSnackBarModule,
    MatDialogModule,
    MatMenuModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './roster.component.html',
  styleUrl: './roster.component.scss',
})
export class RosterComponent {
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  rosterService = inject(RosterService);
  csvService = inject(CsvService);
  userService = inject(UserService);

  searchQuery = '';
  displayedColumns = ['callsign', 'name', 'licenseClass', 'actions'];

  get filteredRoster(): Person[] {
    const query = this.searchQuery.trim();
    if (!query) {
      return this.rosterService.rosterArray();
    }
    return this.rosterService.search(query, 100);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  openAddPerson(): void {
    const dialogRef = this.dialog.open(PersonDialogComponent, {
      width: '600px',
      data: { mode: 'add' },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(`${result.callsign} added to roster`, 'Dismiss', {
          duration: 3000,
        });
      }
    });
  }

  openEditPerson(person: Person): void {
    const dialogRef = this.dialog.open(PersonDialogComponent, {
      width: '600px',
      data: { mode: 'edit', person },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(`${result.callsign} updated`, 'Dismiss', {
          duration: 3000,
        });
      }
    });
  }

  async deletePerson(person: Person): Promise<void> {
    if (!confirm(`Delete ${person.callsign} from the roster?`)) {
      return;
    }

    try {
      await this.rosterService.deletePerson(person.callsign);
      this.snackBar.open(`${person.callsign} removed`, 'Dismiss', {
        duration: 3000,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }

  openImport(): void {
    const dialogRef = this.dialog.open(ImportDialogComponent, {
      width: '700px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(
          `Import complete: ${result.added} added, ${result.updated} updated`,
          'Dismiss',
          { duration: 5000 }
        );
      }
    });
  }

  async exportRoster(): Promise<void> {
    try {
      await this.csvService.exportRoster();
      this.snackBar.open('Roster exported', 'Dismiss', { duration: 3000 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Export failed';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    }
  }
}
