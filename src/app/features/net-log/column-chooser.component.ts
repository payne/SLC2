import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AttributeColumnDef } from '../../shared/models/config.model';

interface ColumnDefinition {
  key: string;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-column-chooser',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatCheckboxModule],
  template: `
    <button mat-icon-button [matMenuTriggerFor]="columnMenu" matTooltip="Show/Hide Columns">
      <mat-icon>view_column</mat-icon>
    </button>

    <mat-menu #columnMenu="matMenu" class="column-chooser-menu">
      <div class="menu-header">
        <strong>Show Columns</strong>
      </div>

      @for (col of allColumns; track col.key) {
        <button mat-menu-item (click)="toggleColumn(col.key); $event.stopPropagation()">
          <mat-checkbox
            [checked]="columnVisibility[col.key]"
            (click)="$event.stopPropagation()"
            (change)="toggleColumn(col.key)"
          >
            {{ col.label }}
          </mat-checkbox>
        </button>
      }
    </mat-menu>
  `,
  styles: `
    .menu-header {
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 0.5rem;
    }

    mat-checkbox {
      width: 100%;
    }
  `,
})
export class ColumnChooserComponent {
  @Input() columnVisibility: Record<string, boolean> = {};
  @Input() attributeColumns: AttributeColumnDef[] = [];
  @Output() visibilityChange = new EventEmitter<{ column: string; visible: boolean }>();

  get allColumns(): ColumnDefinition[] {
    const baseColumns: ColumnDefinition[] = [
      { key: 'callsign', label: 'Call Sign', visible: true },
      { key: 'firstName', label: 'First Name', visible: true },
      { key: 'assignment', label: 'Assignment', visible: true },
      { key: 'location', label: 'Location', visible: true },
      { key: 'notes', label: 'Notes', visible: true },
    ];

    // Add attribute columns
    for (const col of this.attributeColumns) {
      baseColumns.push({
        key: col.column,
        label: col.header,
        visible: this.columnVisibility[col.column] ?? true,
      });
    }

    // Add remaining standard columns
    baseColumns.push(
      { key: 'mileage', label: 'Mileage', visible: true },
      { key: 'signOutTime', label: 'Sign Out', visible: true },
      { key: 'signInTime', label: 'Sign In (hidden)', visible: false }
    );

    return baseColumns.map((col) => ({
      ...col,
      visible: this.columnVisibility[col.key] ?? col.visible,
    }));
  }

  toggleColumn(key: string): void {
    const currentVisible = this.columnVisibility[key] ?? true;
    this.visibilityChange.emit({ column: key, visible: !currentVisible });
  }
}
