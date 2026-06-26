import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from '@angular/fire/firestore';
import { UserService } from './user.service';
import {
  Person,
  Training,
  Certification,
  normalizeCallsign,
} from '../shared/models/person.model';
import { AttributeConfig, DEFAULT_ATTRIBUTE_CONFIG } from '../shared/models/config.model';

@Injectable({ providedIn: 'root' })
export class RosterService implements OnDestroy {
  private firestore = inject(Firestore);
  private userService = inject(UserService);

  /** In-memory roster store (loaded once at startup) */
  private _roster = signal<Map<string, Person>>(new Map());
  readonly roster = this._roster.asReadonly();

  /** Roster as array for iteration */
  readonly rosterArray = computed(() => Array.from(this._roster().values()));

  /** Total count of people */
  readonly count = computed(() => this._roster().size);

  /** Loading state */
  readonly isLoading = signal(true);

  /** Attribute configuration */
  private _attributeConfig = signal<AttributeConfig>(DEFAULT_ATTRIBUTE_CONFIG);
  readonly attributeConfig = this._attributeConfig.asReadonly();

  /** Unsubscribe function for roster listener */
  private unsubscribeRoster: (() => void) | null = null;
  private unsubscribeConfig: (() => void) | null = null;

  constructor() {
    // Load roster when service is created
    this.loadRoster();
    this.loadAttributeConfig();
  }

  /**
   * Load the full roster into memory with real-time updates
   */
  private loadRoster(): void {
    const peopleRef = collection(this.firestore, 'people');

    this.unsubscribeRoster = onSnapshot(
      peopleRef,
      (snapshot) => {
        const newRoster = new Map<string, Person>();

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const person: Person = {
            id: doc.id,
            callsign: data['callsign'],
            name: data['name'],
            licenseClass: data['licenseClass'],
            contact: data['contact'],
            attributes: data['attributes'] || {},
            trainings: (data['trainings'] || []).map((t: Record<string, unknown>) => ({
              name: t['name'] as string,
              org: t['org'] as string,
              dateEarned: (t['dateEarned'] as Timestamp)?.toDate(),
              expires: (t['expires'] as Timestamp)?.toDate(),
              status: t['status'] as Training['status'],
            })),
            certifications: (data['certifications'] || []).map((c: Record<string, unknown>) => ({
              name: c['name'] as string,
              org: c['org'] as string,
              dateEarned: (c['dateEarned'] as Timestamp)?.toDate(),
              expires: (c['expires'] as Timestamp)?.toDate(),
              status: c['status'] as Certification['status'],
            })),
            abilities: data['abilities'] || [],
          };
          newRoster.set(doc.id, person);
        });

        this._roster.set(newRoster);
        this.isLoading.set(false);
      },
      (error) => {
        console.error('Error loading roster:', error);
        this.isLoading.set(false);
      }
    );
  }

  /**
   * Load attribute configuration with real-time updates
   */
  private loadAttributeConfig(): void {
    const configRef = doc(this.firestore, 'config', 'attributeColumns');

    this.unsubscribeConfig = onSnapshot(
      configRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          this._attributeConfig.set({
            attributeColumns: data['attributeColumns'] || [],
          });
        } else {
          this._attributeConfig.set(DEFAULT_ATTRIBUTE_CONFIG);
        }
      },
      (error) => {
        console.error('Error loading attribute config:', error);
        this._attributeConfig.set(DEFAULT_ATTRIBUTE_CONFIG);
      }
    );
  }

  /**
   * Get a person by callsign
   */
  getPerson(callsign: string): Person | undefined {
    return this._roster().get(normalizeCallsign(callsign));
  }

  /**
   * Search roster by partial callsign or name
   * Returns matches for autocomplete
   */
  search(query: string, limit = 10): Person[] {
    if (!query || query.length < 1) return [];

    const normalizedQuery = query.toUpperCase();
    const results: Person[] = [];

    for (const person of this._roster().values()) {
      if (results.length >= limit) break;

      const matchesCallsign = person.callsign.includes(normalizedQuery);
      const matchesName = person.name.toUpperCase().includes(normalizedQuery);

      if (matchesCallsign || matchesName) {
        results.push(person);
      }
    }

    // Sort by relevance (callsign matches first, then by callsign alphabetically)
    return results.sort((a, b) => {
      const aStartsWithQuery = a.callsign.startsWith(normalizedQuery);
      const bStartsWithQuery = b.callsign.startsWith(normalizedQuery);

      if (aStartsWithQuery && !bStartsWithQuery) return -1;
      if (!aStartsWithQuery && bStartsWithQuery) return 1;

      return a.callsign.localeCompare(b.callsign);
    });
  }

  /**
   * Add a new person to the roster
   */
  async addPerson(person: Omit<Person, 'id'>): Promise<void> {
    if (!this.userService.isInviter()) {
      throw new Error('Only inviters can modify the roster');
    }

    const callsign = normalizeCallsign(person.callsign);
    const personRef = doc(this.firestore, 'people', callsign);

    // Check if already exists
    const existing = await getDoc(personRef);
    if (existing.exists()) {
      throw new Error(`Person with callsign ${callsign} already exists`);
    }

    await setDoc(personRef, {
      callsign,
      name: person.name,
      licenseClass: person.licenseClass || null,
      contact: person.contact || null,
      attributes: person.attributes || {},
      trainings: person.trainings || [],
      certifications: person.certifications || [],
      abilities: person.abilities || [],
    });
  }

  /**
   * Update an existing person
   */
  async updatePerson(callsign: string, updates: Partial<Person>): Promise<void> {
    if (!this.userService.isInviter()) {
      throw new Error('Only inviters can modify the roster');
    }

    const normalizedCallsign = normalizeCallsign(callsign);
    const personRef = doc(this.firestore, 'people', normalizedCallsign);

    // Remove id from updates as it's not stored in Firestore
    const updateData = { ...updates };
    delete updateData.id;

    await updateDoc(personRef, updateData);
  }

  /**
   * Delete a person from the roster
   */
  async deletePerson(callsign: string): Promise<void> {
    if (!this.userService.isInviter()) {
      throw new Error('Only inviters can modify the roster');
    }

    const normalizedCallsign = normalizeCallsign(callsign);
    const personRef = doc(this.firestore, 'people', normalizedCallsign);

    await deleteDoc(personRef);
  }

  /**
   * Bulk upsert people (for CSV import)
   */
  async bulkUpsert(people: Omit<Person, 'id'>[]): Promise<{ added: number; updated: number }> {
    if (!this.userService.isInviter()) {
      throw new Error('Only inviters can modify the roster');
    }

    let added = 0;
    let updated = 0;

    for (const person of people) {
      const callsign = normalizeCallsign(person.callsign);
      const personRef = doc(this.firestore, 'people', callsign);

      const existing = this._roster().has(callsign);

      await setDoc(personRef, {
        callsign,
        name: person.name,
        licenseClass: person.licenseClass || null,
        contact: person.contact || null,
        attributes: person.attributes || {},
        trainings: person.trainings || [],
        certifications: person.certifications || [],
        abilities: person.abilities || [],
      });

      if (existing) {
        updated++;
      } else {
        added++;
      }
    }

    return { added, updated };
  }

  /**
   * Update attribute configuration
   */
  async updateAttributeConfig(config: AttributeConfig): Promise<void> {
    if (!this.userService.isInviter()) {
      throw new Error('Only inviters can modify attribute configuration');
    }

    // Validate config
    if (config.attributeColumns.length > 8) {
      throw new Error('Maximum 8 attribute columns allowed');
    }

    const columns = new Set<string>();
    const keys = new Set<string>();

    for (const col of config.attributeColumns) {
      if (columns.has(col.column)) {
        throw new Error(`Duplicate column: ${col.column}`);
      }
      if (keys.has(col.key)) {
        throw new Error(`Duplicate key: ${col.key}`);
      }
      columns.add(col.column);
      keys.add(col.key);
    }

    const configRef = doc(this.firestore, 'config', 'attributeColumns');
    await setDoc(configRef, config);
  }

  /**
   * Get attribute snapshot for a person based on current config
   */
  getAttributeSnapshot(callsign: string): Record<string, unknown> {
    const person = this.getPerson(callsign);
    if (!person) return {};

    const snapshot: Record<string, unknown> = {};
    const config = this._attributeConfig();

    for (const col of config.attributeColumns) {
      snapshot[col.column] = person.attributes[col.key];
    }

    return snapshot;
  }

  /**
   * Clean up listeners on destroy
   */
  ngOnDestroy(): void {
    if (this.unsubscribeRoster) {
      this.unsubscribeRoster();
    }
    if (this.unsubscribeConfig) {
      this.unsubscribeConfig();
    }
  }
}
