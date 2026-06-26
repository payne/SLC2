import { Component, inject } from '@angular/core';
import { FormBuilder, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RosterService } from '../../core';
import { Person, LicenseClass } from '../../shared/models';

interface DialogData {
  mode: 'add' | 'edit';
  person?: Person;
}

@Component({
  selector: 'app-person-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './person-dialog.component.html',
  styleUrl: './person-dialog.component.scss',
})
export class PersonDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<PersonDialogComponent>);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);
  private rosterService = inject(RosterService);
  private snackBar = inject(MatSnackBar);

  mode = this.data.mode;
  isSubmitting = false;

  licenseClasses: LicenseClass[] = ['Technician', 'General', 'Amateur Extra'];

  form = this.fb.group({
    callsign: [
      this.data.person?.callsign || '',
      [Validators.required, Validators.minLength(3)],
    ],
    name: [this.data.person?.name || '', Validators.required],
    licenseClass: [this.data.person?.licenseClass || ''],
    abilities: this.fb.array(this.data.person?.abilities || []),
  });

  // For trainings, certifications - simplified for now
  // Full implementation would have nested form arrays

  get abilities(): FormArray {
    return this.form.get('abilities') as FormArray;
  }

  addAbility(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value && !this.abilities.value.includes(value)) {
      this.abilities.push(this.fb.control(value));
      input.value = '';
    }
  }

  removeAbility(index: number): void {
    this.abilities.removeAt(index);
  }

  async submit(): Promise<void> {
    if (!this.form.valid) return;

    this.isSubmitting = true;
    const formValue = this.form.value;

    try {
      const personData = {
        callsign: formValue.callsign!,
        name: formValue.name!,
        licenseClass: (formValue.licenseClass as LicenseClass) || undefined,
        attributes: this.data.person?.attributes || {},
        trainings: this.data.person?.trainings || [],
        certifications: this.data.person?.certifications || [],
        abilities: (formValue.abilities || []).filter((a): a is string => a !== null),
      };

      if (this.mode === 'add') {
        await this.rosterService.addPerson(personData);
      } else {
        await this.rosterService.updatePerson(this.data.person!.callsign, personData);
      }

      this.dialogRef.close(personData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    } finally {
      this.isSubmitting = false;
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
