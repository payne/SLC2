import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';

interface ClockSettings {
  fontSize: number;
  color: string;
  is24Hour: boolean;
}

const DEFAULT_SETTINGS: ClockSettings = {
  fontSize: 2,
  color: '#ffffff',
  is24Hour: false,
};

@Component({
  selector: 'app-clock',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSliderModule,
    FormsModule,
  ],
  template: `
    <button
      class="clock-container"
      [matMenuTriggerFor]="clockMenu"
      type="button"
      aria-label="Adjust clock settings"
    >
      <span
        class="clock-time"
        [style.fontSize.rem]="settings().fontSize"
        [style.color]="settings().color"
      >
        {{ timeDisplay() }}
      </span>
    </button>

    <mat-menu #clockMenu="matMenu" class="clock-settings-menu">
      <div class="menu-content">
        <h4>Clock Settings</h4>

        <div class="setting-row">
          <label for="clock-font-size">Font Size</label>
          <input
            id="clock-font-size"
            type="range"
            min="1"
            max="4"
            step="0.5"
            [value]="settings().fontSize"
            (input)="updateFontSize($any($event.target).value); $event.stopPropagation()"
          />
        </div>

        <div class="setting-row">
          <label for="clock-color">Color</label>
          <input
            id="clock-color"
            type="color"
            [value]="settings().color"
            (input)="updateColor($any($event.target).value)"
          />
        </div>

        <div class="setting-row">
          <label>
            <input
              type="checkbox"
              [checked]="settings().is24Hour"
              (change)="toggle24Hour()"
            />
            24-hour format
          </label>
        </div>
      </div>
    </mat-menu>
  `,
  styles: `
    .clock-container {
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: transparent;
      border: none;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      &:focus {
        outline: 2px solid white;
        outline-offset: 2px;
      }
    }

    .clock-time {
      font-family: monospace;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .menu-content {
      padding: 1rem;
      min-width: 200px;

      h4 {
        margin: 0 0 1rem 0;
        font-weight: 500;
      }

      .setting-row {
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        label {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        input[type="range"] {
          flex: 1;
        }

        input[type="color"] {
          width: 40px;
          height: 30px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
      }
    }
  `,
})
export class ClockComponent implements OnInit, OnDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private storageKey = 'net-log-clock-settings';

  currentTime = signal(new Date());
  settings = signal<ClockSettings>(this.loadSettings());

  timeDisplay = () => {
    const time = this.currentTime();
    const is24Hour = this.settings().is24Hour;

    if (is24Hour) {
      return time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } else {
      return time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    }
  };

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  updateFontSize(value: string): void {
    const fontSize = parseFloat(value);
    this.settings.update((s) => ({ ...s, fontSize }));
    this.saveSettings();
  }

  updateColor(value: string): void {
    this.settings.update((s) => ({ ...s, color: value }));
    this.saveSettings();
  }

  toggle24Hour(): void {
    this.settings.update((s) => ({ ...s, is24Hour: !s.is24Hour }));
    this.saveSettings();
  }

  private loadSettings(): ClockSettings {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_SETTINGS;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings()));
    } catch {
      // Ignore storage errors
    }
  }
}
