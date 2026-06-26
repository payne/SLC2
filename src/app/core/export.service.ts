import { Injectable, inject } from '@angular/core';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Firestore,
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from '@angular/fire/firestore';
import { NetService } from './net.service';
import { CheckInService } from './checkin.service';
import { RosterService } from './roster.service';
import { CheckIn } from '../shared/models/checkin.model';
import { Net } from '../shared/models/net.model';

interface NetExportData {
  net: Net;
  checkins: CheckIn[];
}

@Injectable({ providedIn: 'root' })
export class ExportService {
  private firestore = inject(Firestore);
  private netService = inject(NetService);
  private checkinService = inject(CheckInService);
  private rosterService = inject(RosterService);

  /**
   * Export current net's check-ins as CSV
   */
  exportCurrentNetCsv(): void {
    const net = this.netService.activeNet();
    const checkins = this.checkinService.checkins();

    if (!net || checkins.length === 0) {
      throw new Error('No check-ins to export');
    }

    const rows = this.formatCheckinsForCsv(checkins);
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `net-${net.id}-checkins.csv`);
  }

  /**
   * Export all nets and check-ins as a ZIP file
   */
  async exportAllNetsZip(): Promise<void> {
    const zip = new JSZip();

    // Fetch all nets
    const netsRef = collection(this.firestore, 'nets');
    const netsSnapshot = await getDocs(netsRef);

    const netsData: NetExportData[] = [];

    for (const netDoc of netsSnapshot.docs) {
      const netData = netDoc.data();
      const net: Net = {
        id: netDoc.id,
        organization: netData['organization'],
        netType: netData['netType'],
        createdBy: netData['createdBy'],
        ncs: netData['ncs'],
        backupNcs: netData['backupNcs'],
        startTime: (netData['startTime'] as Timestamp)?.toDate(),
        endTime: (netData['endTime'] as Timestamp)?.toDate(),
        band: netData['band'],
        freq: netData['freq'],
        notes: netData['notes'],
        status: netData['status'],
        joinCode: netData['joinCode'],
        comments: netData['comments'],
      };

      // Fetch check-ins for this net
      const checkinsRef = collection(this.firestore, 'nets', netDoc.id, 'checkins');
      const checkinsQuery = query(checkinsRef, orderBy('signInTime', 'desc'));
      const checkinsSnapshot = await getDocs(checkinsQuery);

      const checkins: CheckIn[] = checkinsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          callsign: data['callsign'],
          firstName: data['firstName'],
          assignment: data['assignment'],
          location: data['location'],
          notes: data['notes'],
          mileage: data['mileage'],
          attributeSnapshot: data['attributeSnapshot'] || {},
          signInTime: (data['signInTime'] as Timestamp)?.toDate() || new Date(),
          signOutTime: (data['signOutTime'] as Timestamp)?.toDate(),
          createdBy: data['createdBy'],
          lastEditedBy: data['lastEditedBy'],
          lastEditedAt: (data['lastEditedAt'] as Timestamp)?.toDate(),
        };
      });

      netsData.push({ net, checkins });
    }

    // Create nets.csv
    const netsRows = netsData.map((d) => ({
      id: d.net.id,
      organization: d.net.organization,
      netType: d.net.netType,
      startTime: d.net.startTime?.toISOString() || '',
      endTime: d.net.endTime?.toISOString() || '',
      status: d.net.status,
      checkinCount: d.checkins.length,
      comments: d.net.comments || '',
    }));
    zip.file('nets.csv', Papa.unparse(netsRows));

    // Create checkins.csv (all check-ins with netId)
    const allCheckins: Record<string, unknown>[] = [];
    for (const { net, checkins } of netsData) {
      for (const checkin of checkins) {
        allCheckins.push({
          netId: net.id,
          id: checkin.id,
          callsign: checkin.callsign,
          firstName: checkin.firstName,
          assignment: checkin.assignment || '',
          location: checkin.location || '',
          notes: checkin.notes || '',
          mileage: checkin.mileage || '',
          signInTime: checkin.signInTime?.toISOString() || '',
          signOutTime: checkin.signOutTime?.toISOString() || '',
          a1: checkin.attributeSnapshot.a1 ?? '',
          a2: checkin.attributeSnapshot.a2 ?? '',
          a3: checkin.attributeSnapshot.a3 ?? '',
          a4: checkin.attributeSnapshot.a4 ?? '',
          a5: checkin.attributeSnapshot.a5 ?? '',
          a6: checkin.attributeSnapshot.a6 ?? '',
          a7: checkin.attributeSnapshot.a7 ?? '',
          a8: checkin.attributeSnapshot.a8 ?? '',
        });
      }
    }
    zip.file('checkins.csv', Papa.unparse(allCheckins));

    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `net-export-${new Date().toISOString().split('T')[0]}.zip`);
  }

  /**
   * Generate PDF of current net's check-ins
   */
  printCurrentNetPdf(): void {
    const net = this.netService.activeNet();
    const checkins = this.checkinService.checkins();
    const config = this.rosterService.attributeConfig();

    if (!net) {
      throw new Error('No active net');
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter',
    });

    // Title
    doc.setFontSize(16);
    doc.text(`Net Log: ${net.organization}`, 14, 15);

    doc.setFontSize(10);
    doc.text(`Type: ${net.netType}`, 14, 22);
    doc.text(`Date: ${net.startTime?.toLocaleDateString() || 'N/A'}`, 14, 27);
    doc.text(`Start: ${net.startTime?.toLocaleTimeString() || 'N/A'}`, 100, 22);
    doc.text(`Status: ${net.status}`, 100, 27);
    doc.text(`Check-ins: ${checkins.length}`, 180, 22);

    // Build columns
    const columns = [
      { header: 'Call Sign', dataKey: 'callsign' },
      { header: 'Name', dataKey: 'firstName' },
      { header: 'Assignment', dataKey: 'assignment' },
      { header: 'Location', dataKey: 'location' },
    ];

    // Add attribute columns
    for (const col of config.attributeColumns) {
      columns.push({ header: col.header, dataKey: col.column });
    }

    columns.push(
      { header: 'Mileage', dataKey: 'mileage' },
      { header: 'Sign In', dataKey: 'signInTime' },
      { header: 'Sign Out', dataKey: 'signOutTime' }
    );

    // Build rows
    const rows = checkins.map((c) => {
      const row: Record<string, string> = {
        callsign: c.callsign,
        firstName: c.firstName,
        assignment: c.assignment || '',
        location: c.location || '',
        mileage: c.mileage?.toString() || '',
        signInTime: c.signInTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
        signOutTime: c.signOutTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
      };

      // Add attribute values
      for (const col of config.attributeColumns) {
        const val = c.attributeSnapshot[col.column as keyof typeof c.attributeSnapshot];
        row[col.column] = val !== undefined ? String(val) : '';
      }

      return row;
    });

    // Generate table
    autoTable(doc, {
      columns,
      body: rows,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 35, 126] },
    });

    // Comments
    if (net.comments) {
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      doc.setFontSize(10);
      doc.text('Comments:', 14, finalY + 10);
      doc.setFontSize(9);
      doc.text(net.comments, 14, finalY + 15);
    }

    // Open print dialog
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }

  /**
   * Share/send the current net's export
   */
  async sendCurrentNetData(): Promise<void> {
    const net = this.netService.activeNet();
    const checkins = this.checkinService.checkins();

    if (!net || checkins.length === 0) {
      throw new Error('No check-ins to send');
    }

    const rows = this.formatCheckinsForCsv(checkins);
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const file = new File([blob], `net-${net.id}-checkins.csv`, { type: 'text/csv' });

    // Try Web Share API first
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: `Net Log: ${net.organization}`,
          text: `Check-in log for ${net.organization} (${checkins.length} check-ins)`,
          files: [file],
        });
        return;
      } catch (error) {
        // User cancelled or share failed, fall back to download + mailto
        if ((error as Error).name === 'AbortError') {
          return; // User cancelled
        }
      }
    }

    // Fallback: download file and open mailto
    saveAs(blob, `net-${net.id}-checkins.csv`);

    const subject = encodeURIComponent(`Net Log: ${net.organization}`);
    const body = encodeURIComponent(
      `Please find attached the check-in log for ${net.organization}.\n\n` +
      `Date: ${net.startTime?.toLocaleDateString()}\n` +
      `Check-ins: ${checkins.length}\n\n` +
      `Note: Please attach the downloaded CSV file to this email.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  /**
   * Format check-ins for CSV export
   */
  private formatCheckinsForCsv(checkins: CheckIn[]): Record<string, unknown>[] {
    const config = this.rosterService.attributeConfig();

    return checkins.map((c) => {
      const row: Record<string, unknown> = {
        callsign: c.callsign,
        firstName: c.firstName,
        assignment: c.assignment || '',
        location: c.location || '',
        notes: c.notes || '',
        mileage: c.mileage || '',
        signInTime: c.signInTime?.toISOString() || '',
        signOutTime: c.signOutTime?.toISOString() || '',
      };

      // Add attribute columns
      for (const col of config.attributeColumns) {
        row[col.header] = c.attributeSnapshot[col.column as keyof typeof c.attributeSnapshot] ?? '';
      }

      return row;
    });
  }
}
