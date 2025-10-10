
'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Order, User, Vendor } from './types';
import { format } from 'date-fns';
import { supabase } from './supabaseClient';


// To satisfy TypeScript, since jspdf-autotable extends the jsPDF instance.
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateInvoicePdf = async (order: Order, currentUser: User) => {
  const doc = new jsPDF();

  // Fetch vendor details if the currentUser is a vendor
  let vendor: (Vendor & {id: string}) | null = null;
  if (currentUser.role === 'vendor') {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, store_name, contact_number')
      .eq('user_id', currentUser.id)
      .single();
    if (error) {
      console.error("Could not fetch vendor details for invoice:", error);
    } else {
      vendor = data;
    }
  }


  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('QuiKart', 14, 22); // Main brand name
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  // Show "Sold by: [Vendor Name]" if it's a vendor invoice
  if (vendor?.store_name) {
    doc.text(`Sold by: ${vendor.store_name}`, 14, 30);
  } else {
    doc.text('Your one-stop shop in Ghana!', 14, 30);
  }


  // Invoice Title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 190, 22, { align: 'right' });

  // Order Details Separator
  doc.setLineWidth(0.5);
  doc.line(14, 40, 196, 40);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Order ID:', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(order.id, 40, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Order Date:', 14, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(order.orderDate), 'PPP'), 40, 54);

  // Customer Details
  const customerName = order.user_profiles?.name || 'Guest Customer';
  const address = order.shippingAddress;

  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 190, 48, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(customerName, 190, 54, { align: 'right' });
  if (address) {
    doc.text(`${address.street}, ${address.city}`, 190, 60, { align: 'right' });
    doc.text(`${address.region}, ${address.country}`, 190, 66, { align: 'right' });
  }

  // Items Table
  const tableColumn = ["Item Description", "Qty", "Unit Price", "Total"];
  const tableRows: (string | number)[][] = [];

  let vendorSubtotal = 0;

  // Correctly filter items to only show those belonging to the current vendor
  if (order.order_items && vendor) {
    const vendorItems = order.order_items.filter(item => item.products?.vendor_id === vendor.id);
    
    vendorItems.forEach(item => {
      const totalItemPrice = item.price_at_purchase * item.quantity;
      vendorSubtotal += totalItemPrice;
      
      const itemData = [
        item.product_name || 'Unnamed Product', // Use the denormalized name
        item.quantity,
        `GH₵ ${item.price_at_purchase.toFixed(2)}`,
        `GH₵ ${totalItemPrice.toFixed(2)}`
      ];
      tableRows.push(itemData);
    });
  }


  doc.autoTable({
    startY: 80,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [25, 121, 99] }, // Primary Teal Green color
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 80 }, // Give more space for item name
    },
    didDrawPage: (data) => {
        // Footer for each page
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        doc.text('Thank you for your purchase!', doc.internal.pageSize.width - data.settings.margin.right, doc.internal.pageSize.height - 10, { align: 'right' });
    },
  });

  const finalY = (doc as any).autoTable.previous.finalY;

  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal for Your Items:', 150, finalY + 15, { align: 'right' });
  doc.text(`GH₵ ${vendorSubtotal.toFixed(2)}`, 190, finalY + 15, { align: 'right' });
  
  // Download the PDF
  doc.save(`Invoice-${order.id.substring(0, 8)}-${vendor?.store_name || 'QuiKart'}.pdf`);
};
