import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CsvService, ImportPreview } from '../../core';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatSnackBarModule,
  ],
  templateUrl: './import-dialog.component.html',
  styleUrl: './import-dialog.component.scss',
})
export class ImportDialogComponent {
  private dialogRef = inject(MatDialogRef<ImportDialogComponent>);
  private csvService = inject(CsvService);
  private snackBar = inject(MatSnackBar);

  step = signal<'upload' | 'preview' | 'importing'>('upload');
  preview = signal<ImportPreview | null>(null);
  selectedFile = signal<File | null>(null);
  isImporting = signal(false);

  displayedColumns = ['callsign', 'name', 'licenseClass', 'status'];

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      this.snackBar.open('Please select a ZIP file', 'Dismiss', { duration: 3000 });
      return;
    }

    try {
      const result = await this.csvService.parseImportZip(file);
      this.preview.set(result);
      this.selectedFile.set(file);
      this.step.set('preview');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to parse ZIP file';
      this.snackBar.open(message, 'Dismiss', { duration: 5000 });
    }
  }

  async confirmImport(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.isImporting.set(true);
    this.step.set('importing');

    try {
      const result = await this.csvService.commitImport(file);
      this.dialogRef.close(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Import failed';
      this.snackBar.open(message, 'Dismiss', { duration: 5000 });
      this.step.set('preview');
    } finally {
      this.isImporting.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  reset(): void {
    this.preview.set(null);
    this.selectedFile.set(null);
    this.step.set('upload');
  }
}
