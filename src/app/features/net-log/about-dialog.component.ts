import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-about-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>About Ham Net Logger</h2>

    <mat-dialog-content>
      <div class="about-content">
        <p><strong>Ham Radio Net Logging PWA</strong></p>
        <p>Version 1.0.0</p>

        <p class="description">
          A Progressive Web App for logging amateur radio nets. Designed for
          emergency communications and training sessions with full offline
          support.
        </p>

        <h4>Features</h4>
        <ul>
          <li>Real-time check-in logging with AG Grid</li>
          <li>Offline-first with Firestore sync</li>
          <li>Roster management with CSV import/export</li>
          <li>Configurable attribute columns</li>
          <li>PDF and CSV export</li>
        </ul>

        <h4>License</h4>
        <p>MIT License - Open Source</p>

        <p class="credits">
          Built with Angular, Firebase, and AG Grid Community
        </p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: `
    .about-content {
      max-width: 400px;

      p {
        margin: 0.5rem 0;
      }

      .description {
        color: rgba(0, 0, 0, 0.7);
        margin: 1rem 0;
      }

      h4 {
        margin: 1rem 0 0.5rem 0;
        font-weight: 500;
      }

      ul {
        margin: 0;
        padding-left: 1.5rem;

        li {
          margin-bottom: 0.25rem;
        }
      }

      .credits {
        margin-top: 1rem;
        font-size: 0.875rem;
        color: rgba(0, 0, 0, 0.5);
      }
    }
  `,
})
export class AboutDialogComponent {}
