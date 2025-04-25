import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Table, Badge, Form, Button, Spinner } from 'react-bootstrap';
import ExportOrders from '../components/ExportOrders';

const AdminOrderDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    network: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Fetch orders based on current filters and pagination
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.network) queryParams.append('network', filters.network);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      queryParams.append('page', pagination.page);
      queryParams.append('limit', pagination.limit);
      
      const response = await axios.get(`/api/orders?${queryParams.toString()}`);
      setOrders(response.data.orders);
      setPagination({
        ...pagination,
        total: response.data.pagination.total,
        pages: response.data.pagination.pages
      });
      
      // Also fetch dashboard stats
      const statsResponse = await axios.get('/api/orders/dashboard-stats');
      setStats(statsResponse.data);
      
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load orders on component mount and when filters/pagination change
  useEffect(() => {
    fetchOrders();
  }, [filters, pagination.page, pagination.limit]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
    // Reset to first page when filters change
    setPagination({
      ...pagination,
      page: 1
    });
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to update all WAITING orders to ${newStatus}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.put('/api/orders/status/waiting-to-processing');
      alert(`Successfully updated ${response.data.count} orders to processing status.`);
      // Refresh orders list
      fetchOrders();
    } catch (err) {
      console.error('Error updating orders:', err);
      setError('Failed to update orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Order Management Dashboard</h2>
      
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="display-4">{stats.byStatus?.waiting || 0}</h3>
              <Card.Title>Waiting Orders</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="display-4">{stats.byStatus?.processing || 0}</h3>
              <Card.Title>Processing Orders</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="display-4">{stats.byStatus?.completed || 0}</h3>
              <Card.Title>Completed Orders</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="display-4">{stats.recentOrders || 0}</h3>
              <Card.Title>Last 24 Hours</Card.Title>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col>
          <ExportOrders onExportComplete={fetchOrders} />
        </Col>
        <Col>
          <Card className="shadow-sm">
            <Card.Header as="h5">Bulk Actions</Card.Header>
            <Card.Body>
              <Button 
                variant="warning" 
                onClick={() => handleBulkStatusUpdate('processing')}
                disabled={loading || (stats.byStatus?.waiting || 0) === 0}
              >
                Update All Waiting Orders to Processing
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card className="shadow-sm mb-4">
        <Card.Header>
          <h5>Filter Orders</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select 
                  name="status" 
                  value={filters.status} 
                  onChange={handleFilterChange}
                >
                  <option value="">All Statuses</option>
                  <option value="waiting">Waiting</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Network</Form.Label>
                <Form.Select 
                  name="network" 
                  value={filters.network} 
                  onChange={handleFilterChange}
                >
                  <option value="">All Networks</option>
                  <option value="YELLO">YELLO</option>
                  <option value="TELECEL">TELECEL</option>
                  <option value="AT_PREMIUM">AT PREMIUM</option>
                  <option value="airteltigo">Airtel Tigo</option>
                  <option value="at">AT</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <Card className="shadow-sm">
        <Card.Header>
          <h5>Orders List</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center p-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            <>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Phone Number</th>
                    <th>Network</th>
                    <th>Capacity</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center">No orders found matching your criteria</td>
                    </tr>
                  ) : (
                    orders.map(order => (
                      <tr key={order._id}>
                        <td>{order.geonetReference}</td>
                        <td>{order.phoneNumber}</td>
                        <td>{order.network}</td>
                        <td>{order.capacity}</td>
                        <td>${order.price.toFixed(2)}</td>
                        <td>
                          <Badge bg={
                            order.status === 'completed' ? 'success' :
                            order.status === 'processing' ? 'warning' :
                            order.status === 'waiting' ? 'info' :
                            order.status === 'failed' ? 'danger' : 'secondary'
                          }>
                            {order.status}
                          </Badge>
                        </td>
                        <td>{new Date(order.createdAt).toLocaleString()}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button size="sm" variant="outline-primary">View</Button>
                            <Button size="sm" variant="outline-success">Update</Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
              
              {/* Pagination controls */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  Showing {orders.length} of {pagination.total} orders
                </div>
                <div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                  >
                    Previous
                  </Button>{' '}
                  <span>Page {pagination.page} of {pagination.pages}</span>{' '}
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={pagination.page === pagination.pages}
                    onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AdminOrderDashboard;