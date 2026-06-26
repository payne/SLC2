/**
 * Attribute column configuration stored at config/attributeColumns
 * Defines the grid's attribute columns and their mapping to person attributes
 */
export interface AttributeConfig {
  attributeColumns: AttributeColumnDef[];
}

export interface AttributeColumnDef {
  column: AttributeColumnId; // a1-a8
  key: string; // Attribute key in person.attributes
  header: string; // Column header display text
  type?: AttributeColumnType;
}

export type AttributeColumnId = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8';
export type AttributeColumnType = 'boolean' | 'text' | 'number';

/**
 * Default attribute configuration (can be overridden via upload)
 */
export const DEFAULT_ATTRIBUTE_CONFIG: AttributeConfig = {
  attributeColumns: [
    { column: 'a1', key: 'ics100', header: 'ICS-100', type: 'boolean' },
    { column: 'a2', key: 'ics200', header: 'ICS-200', type: 'boolean' },
    { column: 'a3', key: 'ics700', header: 'ICS-700', type: 'boolean' },
    { column: 'a4', key: 'ics800', header: 'ICS-800', type: 'boolean' },
    { column: 'a5', key: 'ares', header: 'ARES', type: 'boolean' },
    { column: 'a6', key: 'races', header: 'RACES', type: 'boolean' },
  ],
};
