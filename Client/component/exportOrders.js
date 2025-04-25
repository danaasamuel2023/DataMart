'use client'
import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Button, Alert, Spinner, Card, Badge } from 'react-bootstrap'; // Or your preferred UI library

const ExportOrders = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportStats, setExportStats] = useState(null);

  // Function to export waiting orders to Excel and update them to processing
  const exportWaitingOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Fetch all waiting orders that need to be exported
      const response = await axios.get('/api/orders/export/waiting');
      
      // If no orders to export, show message and return
      if (response.data.orders.length === 0) {
        setExportStats({ count: 0, message: 'No waiting orders available to export' });
        setLoading(false);
        return;
      }
      
      const orders = response.data.orders;
      const orderIds = orders.map(order => order._id);
      
      // Step 2: Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Format order data for Excel
      const formattedData = orders.map(order => ({
        'Order ID': order._id,
        'Reference': order.geonetReference,
        'Phone Number': order.phoneNumber,
        'Network': order.network,
        'Capacity': order.capacity,
        'Price': order.price,
        'Gateway': order.gateway,
        'Method': order.method,
        'Created At': new Date(order.createdAt).toLocaleString(),
        'Status': 'waiting → processing'
      }));
      
      // Create worksheet and add to workbook
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Waiting Orders');
      
      // Step 3: Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const excelData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Step 4: Trigger download
      const fileName = `waiting-orders-${new Date().toISOString().split('T')[0]}.xlsx`;
      const url = URL.createObjectURL(excelData);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      
      // Step 5: Update all these orders to processing status
      const updateResponse = await axios.put('/api/orders/bulk-update', {
        orderIds,
        status: 'processing',
        notes: 'Updated via Excel export'
      });
      
      // Update UI with export statistics
      setExportStats({
        count: orders.length,
        message: `Successfully exported ${orders.length} orders and updated them to processing`
      });
      
    } catch (err) {
      console.error('Error exporting orders:', err);
      setError(err.response?.data?.msg || 'Failed to export orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header as="h5">Export Waiting Orders</Card.Header>
      <Card.Body>
        <Card.Text>
          Export all waiting orders to Excel and automatically update their status to "processing".
        </Card.Text>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {exportStats && (
          <Alert variant={exportStats.count > 0 ? 'success' : 'info'}>
            {exportStats.message}
            {exportStats.count > 0 && (
              <Badge bg="primary" className="ms-2">
                {exportStats.count} orders
              </Badge>
            )}
          </Alert>
        )}
        
        <Button 
          variant="primary" 
          onClick={exportWaitingOrders} 
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Exporting...
            </>
          ) : (
            'Export Waiting Orders to Excel'
          )}
        </Button>
      </Card.Body>
    </Card>
  );
};

export default ExportOrders;