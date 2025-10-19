
'use client';

import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { Order, User, Vendor } from './types';
import { format } from 'date-fns';
import { supabase } from './supabaseClient';

// Extend jsPDF interface for additional methods
declare module 'jspdf' {
  interface jsPDF {
    getNumberOfPages(): number;
    lastAutoTable?: { finalY: number };
  }
}

export const generateInvoicePdf = async (order: Order, currentUser: User) => {
  console.log('Starting invoice generation for order:', order.id);

  try {
    const doc = new jsPDF();
    console.log('jsPDF instance created');

    // Fetch vendor details - this is compulsory for vendors
    let vendor: Vendor | null = null;
    if (currentUser.role === 'vendor') {
      console.log('Fetching vendor details for user:', currentUser.id);

      try {
        // Direct query without timeout - should be fast for existing records
        const { data, error } = await supabase
          .from('vendors')
          .select('id, store_name, contact_number')
          .eq('user_id', currentUser.id)
          .single();

        if (error) {
          console.error("CRITICAL: Vendor details fetch failed:", error);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          console.error("This means the vendor record is missing or corrupted");
          console.error("User ID:", currentUser.id);
          throw new Error(`Vendor profile not found. Please contact support. Error: ${error.message}`);
        }

        vendor = data as Vendor;
        console.log('Vendor details fetched successfully:', vendor.store_name);

        if (!vendor.store_name) {
          console.warn('Vendor record exists but store_name is empty');
          throw new Error('Store name is required but not set. Please complete your vendor profile.');
        }

        console.log('Store name verified:', vendor.store_name);
      } catch (error: any) {
        console.error('Vendor fetch critical error:', error);
        throw error; // Re-throw to stop invoice generation
      }
    }

    // Helper function to generate invoice content
    const generateInvoiceContent = (startY: number) => {
      let currentY = startY;

      // Header - Make store name required for vendors
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('QuiKart', 14, currentY + 8);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      if (currentUser.role === 'vendor') {
        // For vendors, store name is compulsory and already verified above
        doc.text(`Sold by: ${vendor!.store_name}`, 14, currentY + 16);

        // No warning needed since store name is verified to exist
      } else {
        // For non-vendors, use generic branding
        doc.text('Your one-stop shop in Ghana!', 14, currentY + 16);
      }

      // Invoice Title
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', 190, currentY + 8, { align: 'right' });

      // Order Details Separator
      doc.setLineWidth(0.5);
      doc.line(14, currentY + 26, 196, currentY + 26);

      // Order details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Order ID:', 14, currentY + 34);
      doc.setFont('helvetica', 'normal');
      doc.text(order.id, 40, currentY + 34);

      doc.setFont('helvetica', 'bold');
      doc.text('Order Date:', 14, currentY + 40);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(order.orderDate), 'PPP'), 40, currentY + 40);

      // Customer Details with phone number
      const customerName = order.user_profiles?.name || 'Guest Customer';
      const customerPhone = order.user_profiles?.phone || 'N/A';

      doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', 190, currentY + 34, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(customerName, 190, currentY + 40, { align: 'right' });
      doc.text(`Phone: ${customerPhone}`, 190, currentY + 46, { align: 'right' });

      if (order.shippingAddress) {
        doc.text(`${order.shippingAddress.street}, ${order.shippingAddress.city}`, 190, currentY + 52, { align: 'right' });
        doc.text(`${order.shippingAddress.region}, ${order.shippingAddress.country}`, 190, currentY + 58, { align: 'right' });
      }

      // Items Table
      const tableColumn = ["Item Description", "Qty", "Unit Price", "Total"];
      const tableRows: (string | number)[][] = [];

      let itemsSubtotal = 0;
      let isVendorSpecificInvoice = false;

      // Limit items for performance (show max 15 items per invoice section)
      const maxItems = 15;
      const itemsToShow = order.order_items?.slice(0, maxItems) || [];

      // Process items - determine if this is vendor-specific or general invoice
      if (itemsToShow.length > 0) {
        let itemsToProcess: any[] = [];

        if (vendor && currentUser.role === 'vendor') {
          // Vendor-specific invoice: only show vendor's products
          itemsToProcess = itemsToShow.filter(item => item.products?.vendor_id === vendor.id);
          isVendorSpecificInvoice = true;
        } else {
          // General invoice: show all items
          itemsToProcess = itemsToShow;
          isVendorSpecificInvoice = false;
        }

        itemsToProcess.forEach(item => {
          const totalItemPrice = item.price_at_purchase * item.quantity;
          itemsSubtotal += totalItemPrice;

          // Try Unicode cedis symbol, fallback to text if needed
          const itemData = [
            (item.product_name || 'Unnamed Product').substring(0, 35), // Limit text length
            item.quantity,
            `Ghana Cedis ${item.price_at_purchase.toFixed(2)}`,
            `Ghana Cedis ${totalItemPrice.toFixed(2)}`
          ];
          tableRows.push(itemData);
        });
      }

      if (tableRows.length > 0) {
        const tableStartY = currentY + 70;

        try {
          // Use autoTable directly
          autoTable(doc, {
            startY: tableStartY,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [25, 121, 99] },
            styles: { font: 'helvetica', fontSize: 8, cellPadding: 2 },
            columnStyles: {
              0: { cellWidth: 65 },
            },
            didDrawPage: (data: any) => {
              const pageCount = doc.getNumberOfPages();
              doc.setFontSize(7);
              doc.setFont('helvetica', 'italic');
              doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 8);
            },
          });

          const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 50;
          return finalY + 25;
        } catch (autoTableError) {
          console.warn('autoTable failed, using fallback table generation:', autoTableError);

          // Fallback: Generate simple text-based table
          let currentTableY = tableStartY;

          // Table header
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Item Description', 14, currentTableY);
          doc.text('Qty', 90, currentTableY);
          doc.text('Unit Price', 110, currentTableY);
          doc.text('Total', 150, currentTableY);

          // Header separator line
          doc.setLineWidth(0.3);
          doc.line(14, currentTableY + 2, 190, currentTableY + 2);

          currentTableY += 8;

          // Table rows
          doc.setFont('helvetica', 'normal');
          tableRows.forEach((row, index) => {
            if (currentTableY > 250) { // Start new page if needed
              doc.addPage();
              currentTableY = 20;
            }

            doc.text(String(row[0]), 14, currentTableY);
            doc.text(String(row[1]), 90, currentTableY);
            doc.text(String(row[2]), 110, currentTableY);
            doc.text(String(row[3]), 150, currentTableY);
            currentTableY += 6;
          });

          // Calculate final Y position for fallback table
          const finalY = currentTableY;

          // Total Section - Make it prominent and clear
          const totalLabel = isVendorSpecificInvoice ? 'Subtotal for Your Items:' : 'Order Total:';
          const totalAmount = isVendorSpecificInvoice ? itemsSubtotal : order.totalAmount;

          // Draw a line above the total
          doc.setLineWidth(0.5);
          doc.line(140, finalY + 5, 196, finalY + 5);

          // Total
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(totalLabel, 150, finalY + 12, { align: 'right' });
          doc.setFontSize(12);

          // Use Ghana Cedis text format
          const totalCurrency = `Ghana Cedis ${totalAmount.toFixed(2)}`;
          doc.text(totalCurrency, 190, finalY + 12, { align: 'right' });

          console.log(`Invoice total: ${totalLabel} Ghana Cedis ${totalAmount.toFixed(2)}`);

          return finalY + 25;
        }
      }

      return currentY + 100; // Return estimated Y position if no table
    };

    // Generate first invoice (top half)
    console.log('Generating first invoice section');
    const firstInvoiceEndY = generateInvoiceContent(10);

    // Generate second invoice (bottom half) - start after first invoice
    console.log('Generating second invoice section');
    generateInvoiceContent(firstInvoiceEndY + 10);

    console.log('PDF generation completed, saving file...');

    // Download the PDF
    const storeName = vendor?.store_name || 'QuiKart';
    doc.save(`Invoice-${order.id.substring(0, 8)}-${storeName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    console.log('PDF saved successfully as:', `Invoice-${order.id.substring(0, 8)}-${storeName}.pdf`);

  } catch (error) {
    console.error('Invoice generation failed:', error);
    throw error;
  }
};
