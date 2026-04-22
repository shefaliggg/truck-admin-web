import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import BookingDetails from './pages/BookingDetails';
import NewBooking from './pages/NewBooking';
import Trips from './pages/Trips';
import TripDetails from './pages/TripDetails';
import Users from './pages/Users';
import ShipperDetails from './pages/ShipperDetails';
import NewShipper from './pages/NewShipper';
import Drivers from './pages/Drivers';
import NewDriver from './pages/NewDriver';
import DriverDetails from './pages/DriverDetails';
import Trucks from './pages/Trucks';
import NewTruck from './pages/NewTruck';
import TruckDetails from './pages/TruckDetails';
import PODs from './pages/PODs';
import Invoices from './pages/Invoices';
import Settlements from './pages/Settlements';
import Ratings from './pages/Ratings';
import Support from './pages/Support';
import AdminProfileSettings from './pages/AdminProfileSettings';
import Layout from './components/Layout';
import * as authService from './services/auth';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [selectedShipper, setSelectedShipper] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedTruckId, setSelectedTruckId] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('adminUser');
      if (storedUser) {
        try {
          const verified = await authService.getMe();
          if (verified.role === 'admin') {
            setUser(verified);
          } else {
            authService.logout();
          }
        } catch (err) {
          authService.logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const handleOpenBookingDetails = (bookingId) => {
    setSelectedBookingId(bookingId);
    setCurrentPage('booking-details');
  };

  const handleBackToBookings = () => {
    setCurrentPage('bookings');
  };

  const handleOpenTripDetails = (tripId) => {
    setSelectedTripId(tripId);
    setCurrentPage('trip-details');
  };

  const handleBackToTrips = () => {
    setCurrentPage('trips');
  };

  const handleOpenShipperDetails = (user) => {
    setSelectedShipper(user);
    setCurrentPage('shipper-details');
  };

  const handleOpenNewShipper = () => {
    setCurrentPage('new-shipper');
  };

  const handleBackToShippers = () => {
    setCurrentPage('users');
  };

  const handleOpenNewBooking = () => {
    setCurrentPage('new-booking');
  };

  const handleOpenNewDriver = () => {
    setCurrentPage('new-driver');
  };

  const handleOpenNewTruck = () => {
    setCurrentPage('new-truck');
  };

  const handleOpenTruckDetails = (truckId) => {
    setSelectedTruckId(truckId);
    setCurrentPage('truck-details');
  };

  const handleBackToTrucks = () => {
    setCurrentPage('trucks');
  };

  const handleOpenDriverDetails = (driver) => {
    setSelectedDriver(driver);
    setCurrentPage('driver-details');
  };

  const handleBackToDrivers = () => {
    setCurrentPage('drivers');
  };

  const handleBookingCreated = () => {
    setCurrentPage('bookings');
  };

  const handleDriverCreated = () => {
    setCurrentPage('drivers');
  };

  const handleShipperCreated = () => {
    setCurrentPage('users');
  };

  const handleTruckCreated = () => {
    setCurrentPage('trucks');
  };

  const pageTitle = currentPage === 'booking-details'
    ? 'Booking Details'
    : currentPage === 'new-booking'
      ? 'Add Booking'
      : currentPage === 'new-shipper'
        ? 'Add Shipper'
      : currentPage === 'new-driver'
        ? 'Add Driver'
      : currentPage === 'new-truck'
        ? 'Add Truck'
      : currentPage === 'driver-details'
        ? 'Driver Details'
      : currentPage === 'truck-details'
        ? 'Truck Details'
      : currentPage === 'trip-details'
        ? 'Trip Details'
      : undefined;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'bookings':
        return <Bookings onViewBooking={handleOpenBookingDetails} />;
      case 'booking-details':
        return (
          <BookingDetails
            bookingId={selectedBookingId}
            onBack={handleBackToBookings}
          />
        );
      case 'new-booking':
        return (
          <NewBooking
            onSuccess={handleBookingCreated}
            onCancel={handleBackToBookings}
          />
        );
      case 'trips':
        return <Trips onViewTrip={handleOpenTripDetails} />;
      case 'trip-details':
        return (
          <TripDetails
            tripId={selectedTripId}
            onBack={handleBackToTrips}
          />
        );
      case 'users':
        return <Users onViewUser={handleOpenShipperDetails} />;
      case 'shipper-details':
        return (
          <ShipperDetails
            user={selectedShipper}
            onBack={handleBackToShippers}
            onViewBooking={handleOpenBookingDetails}
          />
        );
      case 'new-shipper':
        return (
          <NewShipper
            onSuccess={handleShipperCreated}
            onCancel={handleShipperCreated}
          />
        );
      case 'drivers':
        return <Drivers onViewDriver={handleOpenDriverDetails} />;
      case 'new-driver':
        return (
          <NewDriver
            onSuccess={handleDriverCreated}
            onCancel={handleDriverCreated}
          />
        );
      case 'driver-details':
        return (
          <DriverDetails
            driverId={selectedDriver?._id}
            onBack={handleBackToDrivers}
          />
        );
      case 'trucks':
        return <Trucks onViewTruck={handleOpenTruckDetails} />;
      case 'new-truck':
        return (
          <NewTruck
            onSuccess={handleTruckCreated}
            onCancel={handleTruckCreated}
          />
        );
      case 'truck-details':
        return (
          <TruckDetails
            truckId={selectedTruckId}
            onBack={handleBackToTrucks}
          />
        );
      case 'pods':
        console.log('current',currentPage);
        
        return <PODs />;
      case 'invoices':
        return <Invoices />;
      case 'settlements':
        return <Settlements />;
      case 'ratings':
        return <Ratings />;
      case 'support':
        return <Support />;
      case 'settings':
        return <AdminProfileSettings />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }

  return (
    <div className="App">
      {!user ? (
        <Login onLoginSuccess={setUser} />
      ) : (
        <Layout 
          user={user} 
          onLogout={handleLogout}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          pageTitle={pageTitle}
          onAddBooking={handleOpenNewBooking}
          onAddShipper={handleOpenNewShipper}
          onAddDriver={handleOpenNewDriver}
          onAddTruck={handleOpenNewTruck}
          showAddBookingButton={currentPage === 'bookings' || currentPage === 'booking-details'}
          showAddShipperButton={currentPage === 'users' || currentPage === 'shipper-details' || currentPage === 'new-shipper'}
          showAddDriverButton={currentPage === 'drivers' || currentPage === 'new-driver' || currentPage === 'driver-details'}
          showAddTruckButton={currentPage === 'trucks' || currentPage === 'new-truck' || currentPage === 'truck-details'}
        >
          {renderPage()}
        </Layout>
      )}
    </div>
  );
}

export default App;
