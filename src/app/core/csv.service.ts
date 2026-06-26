import { Injectable, inject } from '@angular/core';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { RosterService } from './roster.service';
import { Person, Training, Certification, LicenseClass, normalizeCallsign } from '../shared/models/person.model';

export interface ImportPreview {
  people: PersonImportPreview[];
  attributes: AttributeImportPreview[];
  trainings: TrainingImportPreview[];
  certifications: CertificationImportPreview[];
  abilities: AbilityImportPreview[];
  errors: ImportError[];
}

export interface PersonImportPreview {
  callsign: string;
  name: string;
  licenseClass?: string;
  isNew: boolean;
  hasChanges: boolean;
}

export interface AttributeImportPreview {
  callsign: string;
  key: string;
  value: string | boolean | number;
  isNew: boolean;
}

export interface TrainingImportPreview {
  callsign: string;
  name: string;
  org: string;
  isNew: boolean;
}

export interface CertificationImportPreview {
  callsign: string;
  name: string;
  org: string;
  isNew: boolean;
}

export interface AbilityImportPreview {
  callsign: string;
  ability: string;
  isNew: boolean;
}

export interface ImportError {
  file: string;
  row: number;
  message: string;
}

export interface ParsedRosterData {
  people: Map<string, Partial<Person>>;
  errors: ImportError[];
}

@Injectable({ providedIn: 'root' })
export class CsvService {
  private rosterService = inject(RosterService);

  /**
   * Parse a ZIP file containing roster CSVs and return preview data
   */
  async parseImportZip(file: File): Promise<ImportPreview> {
    const zip = await JSZip.loadAsync(file);
    const errors: ImportError[] = [];

    // Parse all CSV files
    const peopleData = await this.parseCsvFromZip(zip, 'people.csv', errors);
    const attributesData = await this.parseCsvFromZip(zip, 'attributes.csv', errors);
    const trainingsData = await this.parseCsvFromZip(zip, 'trainings.csv', errors);
    const certificationsData = await this.parseCsvFromZip(zip, 'certifications.csv', errors);
    const abilitiesData = await this.parseCsvFromZip(zip, 'abilities.csv', errors);

    // Build preview
    const preview: ImportPreview = {
      people: [],
      attributes: [],
      trainings: [],
      certifications: [],
      abilities: [],
      errors,
    };

    // Process people
    for (const row of peopleData) {
      const callsign = normalizeCallsign(row['callsign'] || '');
      if (!callsign) {
        errors.push({ file: 'people.csv', row: peopleData.indexOf(row) + 2, message: 'Missing callsign' });
        continue;
      }

      const existing = this.rosterService.getPerson(callsign);
      const name = row['name'] || '';
      const licenseClass = row['license_class'] || row['licenseClass'] || '';

      preview.people.push({
        callsign,
        name,
        licenseClass,
        isNew: !existing,
        hasChanges: existing ? (existing.name !== name || existing.licenseClass !== licenseClass) : false,
      });
    }

    // Process attributes
    for (const row of attributesData) {
      const callsign = normalizeCallsign(row['callsign'] || '');
      if (!callsign) continue;

      const key = row['key'] || '';
      let value: string | boolean | number = row['value'] || '';

      // Try to parse as boolean or number
      if (value === 'true' || value === 'TRUE') value = true;
      else if (value === 'false' || value === 'FALSE') value = false;
      else if (!isNaN(Number(value)) && value !== '') value = Number(value);

      const existing = this.rosterService.getPerson(callsign);
      const existingValue = existing?.attributes[key];

      preview.attributes.push({
        callsign,
        key,
        value,
        isNew: existingValue === undefined || existingValue !== value,
      });
    }

    // Process trainings
    for (const row of trainingsData) {
      const callsign = normalizeCallsign(row['callsign'] || '');
      if (!callsign) continue;

      const name = row['name'] || '';
      const org = row['org'] || '';

      const existing = this.rosterService.getPerson(callsign);
      const existingTraining = existing?.trainings.find(
        (t) => t.name === name && t.org === org
      );

      preview.trainings.push({
        callsign,
        name,
        org,
        isNew: !existingTraining,
      });
    }

    // Process certifications
    for (const row of certificationsData) {
      const callsign = normalizeCallsign(row['callsign'] || '');
      if (!callsign) continue;

      const name = row['name'] || '';
      const org = row['org'] || '';

      const existing = this.rosterService.getPerson(callsign);
      const existingCert = existing?.certifications.find(
        (c) => c.name === name && c.org === org
      );

      preview.certifications.push({
        callsign,
        name,
        org,
        isNew: !existingCert,
      });
    }

    // Process abilities
    for (const row of abilitiesData) {
      const callsign = normalizeCallsign(row['callsign'] || '');
      if (!callsign) continue;

      const ability = row['ability'] || '';

      const existing = this.rosterService.getPerson(callsign);
      const hasAbility = existing?.abilities.includes(ability);

      preview.abilities.push({
        callsign,
        ability,
        isNew: !hasAbility,
      });
    }

    return preview;
  }

  /**
   * Commit import data after preview
   */
  async commitImport(file: File): Promise<{ added: number; updated: number }> {
    const zip = await JSZip.loadAsync(file);
    const errors: ImportError[] = [];

    // Parse all CSV files
    const peopleData = await this.parseCsvFromZip(zip, 'people.csv', errors);
    const attributesData = await this.parseCsvFromZip(zip, 'attributes.csv', errors);
    const trainingsData = await this.parseCsvFromZip(zip, 'trainings.csv', errors);
    const certificationsData = await this.parseCsvFromZip(zip, 'certifications.csv', errors);
    const abilitiesData = await this.parseCsvFromZip(zip, 'abilities.csv', errors);

    // Build person map
    const peopleMap = new Map<string, Omit<Person, 'id'>>();

    // First pass: people basic info
    for (const row of peopleData) {
      const callsign = normalizeCallsign(row['callsign'] || '');
      if (!callsign) continue;

      const licenseValue = row['license_class'] || row['licenseClass'] || '';
      const validLicenseClasses: LicenseClass[] = ['Technician', 'General', 'Amateur Extra'];
      const licenseClass = validLicenseClasses.includes(licenseValue as LicenseClass)
        ? (licenseValue as LicenseClass)
        : undefined;

      peopleMap.set(callsign, {
        callsign,
        name: row['name'] || '',
        licenseClass,
        contact: undefined,
        attributes: {},
        trainings: [],
        certifications: [],
        abilities: [],
      });
    }

    // Second pass: merge attributes
    for (const row of attributesData) {
      const callsign = normalizeCallsign(row['callsign'] || '');
      if (!callsign) continue;

      const person = peopleMap.get(callsign);
      if (!person) continue;

      const key = row['key'] || '';
      let value: string | boolean | number = row['value'] || '';

      if (value === 'true' || value === 'TRUE') value = true;
      else if (value === 'false' || value === 'FALSE') value = false;
      else if (!isNaN(Number(value)) && value !== '') value = Number(value);

      person.attributes[key] = value;
    }

    // Third pass: merge trainings
    for (const row of trainingsData) {
      const callsign = normalizeCallsign(row['callsign'] || '');
      if (!callsign) continue;

      const person = peopleMap.get(callsign);
      if (!person) continue;

      person.trainings.push({
        name: row['name'] || '',
        org: row['org'] || '',
        dateEarned: row['date_earned'] ? new Date(row['date_earned']) : new Date(),
        expires: row['expires'] ? new Date(row['expires']) : undefined,
        status: (row['status'] as Training['status']) || 'active',
      });
    }

    // Fourth pass: merge certifications
    for (const row of certificationsData) {
      const callsign = normalizeCallsign(row['callsign'] || '');
      if (!callsign) continue;

      const person = peopleMap.get(callsign);
      if (!person) continue;

      person.certifications.push({
        name: row['name'] || '',
        org: row['org'] || '',
        dateEarned: row['date_earned'] ? new Date(row['date_earned']) : new Date(),
        expires: row['expires'] ? new Date(row['expires']) : undefined,
        status: (row['status'] as Certification['status']) || 'active',
      });
    }

    // Fifth pass: merge abilities
    for (const row of abilitiesData) {
      const callsign = normalizeCallsign(row['callsign'] || '');
      if (!callsign) continue;

      const person = peopleMap.get(callsign);
      if (!person) continue;

      const ability = row['ability'] || '';
      if (ability && !person.abilities.includes(ability)) {
        person.abilities.push(ability);
      }
    }

    // Commit to Firestore
    const people = Array.from(peopleMap.values());
    return this.rosterService.bulkUpsert(people);
  }

  /**
   * Export roster to ZIP file
   */
  async exportRoster(): Promise<void> {
    const roster = this.rosterService.rosterArray();
    const zip = new JSZip();

    // People CSV
    const peopleRows = roster.map((p) => ({
      callsign: p.callsign,
      name: p.name,
      license_class: p.licenseClass || '',
    }));
    zip.file('people.csv', Papa.unparse(peopleRows));

    // Attributes CSV
    const attributeRows: { callsign: string; key: string; value: string }[] = [];
    for (const person of roster) {
      for (const [key, value] of Object.entries(person.attributes)) {
        attributeRows.push({
          callsign: person.callsign,
          key,
          value: String(value),
        });
      }
    }
    zip.file('attributes.csv', Papa.unparse(attributeRows));

    // Trainings CSV
    const trainingRows: { callsign: string; name: string; org: string; date_earned: string; expires: string; status: string }[] = [];
    for (const person of roster) {
      for (const t of person.trainings) {
        trainingRows.push({
          callsign: person.callsign,
          name: t.name,
          org: t.org,
          date_earned: t.dateEarned?.toISOString().split('T')[0] || '',
          expires: t.expires?.toISOString().split('T')[0] || '',
          status: t.status,
        });
      }
    }
    zip.file('trainings.csv', Papa.unparse(trainingRows));

    // Certifications CSV
    const certRows: { callsign: string; name: string; org: string; date_earned: string; expires: string; status: string }[] = [];
    for (const person of roster) {
      for (const c of person.certifications) {
        certRows.push({
          callsign: person.callsign,
          name: c.name,
          org: c.org,
          date_earned: c.dateEarned?.toISOString().split('T')[0] || '',
          expires: c.expires?.toISOString().split('T')[0] || '',
          status: c.status,
        });
      }
    }
    zip.file('certifications.csv', Papa.unparse(certRows));

    // Abilities CSV
    const abilityRows: { callsign: string; ability: string }[] = [];
    for (const person of roster) {
      for (const ability of person.abilities) {
        abilityRows.push({
          callsign: person.callsign,
          ability,
        });
      }
    }
    zip.file('abilities.csv', Papa.unparse(abilityRows));

    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `roster-${new Date().toISOString().split('T')[0]}.zip`);
  }

  /**
   * Parse a CSV file from a ZIP archive
   */
  private async parseCsvFromZip(
    zip: JSZip,
    filename: string,
    errors: ImportError[]
  ): Promise<Record<string, string>[]> {
    const file = zip.file(filename);
    if (!file) {
      // File is optional, return empty array
      return [];
    }

    const content = await file.async('text');
    const result = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
    });

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        errors.push({
          file: filename,
          row: error.row ?? 0,
          message: error.message,
        });
      }
    }

    return result.data;
  }
}
